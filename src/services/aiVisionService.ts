import { Course, DayOfWeek, StudentProfile } from '../types';
import { parseDays, normalizeTime } from './corParser';

const GEMINI_API_KEY_STORAGE = 'schedly_gemini_api_key';

export function getStoredGeminiApiKey(): string {
  return localStorage.getItem(GEMINI_API_KEY_STORAGE) || import.meta.env.VITE_GEMINI_API_KEY || '';
}

export function saveStoredGeminiApiKey(key: string): void {
  if (key && key.trim()) {
    localStorage.setItem(GEMINI_API_KEY_STORAGE, key.trim());
  } else {
    localStorage.removeItem(GEMINI_API_KEY_STORAGE);
  }
}

export function hasGeminiApiKey(): boolean {
  return !!getStoredGeminiApiKey();
}

const COLOR_PALETTE = [
  '#2563EB', // Blue
  '#8B5CF6', // Purple
  '#10B981', // Green
  '#F59E0B', // Amber
  '#EF4444', // Red
  '#0D9488', // Teal
  '#EC4899', // Pink
  '#6366F1', // Indigo
  '#14B8A6', // Cyan
];

export interface GeminiCORResponse {
  rawText?: string;
  courses: Course[];
  profile?: Partial<StudentProfile>;
  totalUnits?: number;
}

/**
 * Calls Gemini Multimodal Vision API to extract structured course timetable and student information
 * from a Certificate of Registration (COR) image.
 */
export async function extractCORWithGemini(
  base64Image: string,
  customApiKey?: string
): Promise<GeminiCORResponse> {
  const apiKey = (customApiKey || getStoredGeminiApiKey()).trim();
  if (!apiKey) {
    throw new Error('No Gemini API key provided. Please enter a valid Gemini API key or use On-Device OCR.');
  }

  // Clean base64 string
  let mimeType = 'image/jpeg';
  let cleanBase64 = base64Image;

  if (base64Image.includes(';base64,')) {
    const parts = base64Image.split(';base64,');
    mimeType = parts[0].replace('data:', '');
    cleanBase64 = parts[1];
  }

  const prompt = `
You are an expert registrar OCR and schedule parsing AI specialized in Philippine State University Certificate of Registration (COR) documents, especially North Eastern Mindanao State University (NEMSU).

Carefully read this Certificate of Registration photo. The timetable table has these exact columns:
1. Course No. (e.g., "CS 111-", "CS 112-", "GE-MMW", "GE-PC", "GE-US", "IT 1", "MATH 1", "NSTP1", "PATHFIT 1")
2. Section (e.g., "CS2019CS1C", "CS1C")
3. Descriptive Title (e.g., "Introduction to Computing", "Fundamentals of Programming (lec & Lab)", "Mathematics in the Modern World", "Purposive Communication", "Understanding the Self", "Living in the IT Era", "Advance College Algebra", "National Service Training Program", "Movement Competency Training 1")
4. Time (e.g., "7:00-8:30", "3:00-4:00", "2:30-4:00", "10:00-11:30", "1:00-2:30", "8:30-10:00", "7:00-11:00")
5. Days (e.g., "MTH" for Mon/Thu, "TF" for Tue/Fri, "SAT" for Sat, "MWF" for Mon/Wed/Fri)
6. Room (e.g., "TBA", "Lab 1", "Room 101")
7. Bldg (Building, often blank or TBA)
8. Lec (Lecture hours/units)
9. Lab (Laboratory hours/units)
10. Units (Total course credit units e.g., 3.0, 2.0)
11. Instructor (e.g., "Cantila, Brieg", "Basadre", "Orozco, Jennifer L", "Sumaoy, Roey C.", "Arimang, Nancy")

CRITICAL RULES FOR EXTRACTION:
- "courseCode": Put ONLY the course number, and strip trailing hyphens (e.g., "CS 111", "CS 112", "GE-MMW", "IT 1", "NSTP 1", "PATHFIT 1"). DO NOT put the section here!
- "section": Put ONLY the section code (e.g., "CS2019CS1C", "CS1C").
- "courseName": Put ONLY the descriptive title (e.g., "Introduction to Computing", "Fundamentals of Programming (lec & Lab)"). DO NOT include the section code or course number in the courseName!
- "time": Capture exact start and end times (e.g., "7:00-8:30", "3:00-4:00", "2:30-4:00", "10:00-11:30", "1:00-2:30", "8:30-10:00", "7:00-11:00").
- "days": Capture the day token ("MTH", "TF", "SAT", "MWF", "TTH").
- "instructor": Capture the instructor full name or surname (e.g., "Cantila, Brieg", "Basadre", "Orozco, Jennifer L", "Sumaoy, Roey C.", "Arimang, Nancy"). Remove trailing commas. If blank, leave as "".
- "student": Extract student credentials from the header (studentNumber: "2026-01537", fullName: "ELJOHN SIENES CRISOSTOMO", program: "BS Computer Science", yearLevel: "1st Year", campus: "NEMSU CANTILAN", academicYear: "2026-2027").

Return ONLY a JSON object with this structure:
{
  "student": {
    "studentNumber": "2026-01537",
    "fullName": "ELJOHN SIENES CRISOSTOMO",
    "program": "BS Computer Science",
    "yearLevel": "1st Year",
    "campus": "NEMSU CANTILAN",
    "academicYear": "2026-2027",
    "term": "1"
  },
  "totalUnits": 26,
  "courses": [
    {
      "courseCode": "CS 111",
      "section": "CS2019CS1C",
      "courseName": "Introduction to Computing",
      "time": "7:00-8:30",
      "days": "MTH",
      "room": "TBA",
      "units": 3.0,
      "instructor": "Cantila, Brieg"
    }
  ]
}
`;

  // Try models in order: gemini-1.5-flash -> gemini-2.0-flash -> gemini-1.5-pro
  const models = ['gemini-1.5-flash', 'gemini-2.0-flash', 'gemini-1.5-pro'];
  let lastError: any = null;

  for (const model of models) {
    try {
      const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                { text: prompt },
                {
                  inline_data: {
                    mime_type: mimeType,
                    data: cleanBase64,
                  },
                },
              ],
            },
          ],
          generationConfig: {
            response_mime_type: 'application/json',
            temperature: 0.1,
          },
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const message = errorData?.error?.message || `HTTP ${response.status}: ${response.statusText}`;
        throw new Error(message);
      }

      const data = await response.json();
      const textContent = data.candidates?.[0]?.content?.parts?.[0]?.text;

      if (!textContent) {
        throw new Error('Gemini returned an empty response.');
      }

      // Parse JSON
      let cleanedJson = textContent.trim();
      if (cleanedJson.startsWith('```json')) {
        cleanedJson = cleanedJson.replace(/^```json/, '').replace(/```$/, '').trim();
      } else if (cleanedJson.startsWith('```')) {
        cleanedJson = cleanedJson.replace(/^```/, '').replace(/```$/, '').trim();
      }

      const parsed = JSON.parse(cleanedJson);

      // Map to application Course and StudentProfile types
      const courses: Course[] = (parsed.courses || []).map((c: any, idx: number) => {
        let startTime = '08:00';
        let endTime = '09:30';

        if (c.time) {
          const timeParts = c.time.split(/[-–to]/);
          if (timeParts.length >= 2) {
            startTime = normalizeTime(timeParts[0], false);
            endTime = normalizeTime(timeParts[1], true);
          }
        }

        const days: DayOfWeek[] = parseDays(c.days || 'MTH');
        const color = COLOR_PALETTE[idx % COLOR_PALETTE.length];

        return {
          id: `course_ai_${Date.now()}_${idx + 1}`,
          courseCode: (c.courseCode || `SUBJ ${idx + 1}`).trim().toUpperCase(),
          courseName: (c.courseName || 'Subject Name').trim(),
          instructor: (c.instructor || '').replace(/,$/, '').trim(),
          room: (c.room || 'TBA').trim(),
          days,
          startTime,
          endTime,
          units: typeof c.units === 'number' ? c.units : 3,
          color,
          confidence: {
            courseCode: true,
            courseName: true,
            instructor: !!c.instructor,
            room: c.room && c.room !== 'TBA',
            days: true,
            times: true,
          },
          rawTextSnippet: `${c.courseCode} ${c.courseName} ${c.time} ${c.days} ${c.instructor}`,
        };
      });

      const student = parsed.student || {};
      const profile: Partial<StudentProfile> = {};

      if (student.studentNumber) profile.studentNumber = student.studentNumber;
      if (student.fullName) {
        profile.fullName = student.fullName;
      } else if (student.firstName || student.lastName) {
        profile.fullName = `${student.firstName || ''} ${student.middleName || ''} ${student.lastName || ''}`.replace(/\s+/g, ' ').trim();
      }

      if (student.program) {
        profile.program = student.program;
      } else if (student.rawCourse) {
        if (student.rawCourse === 'BSCS') profile.program = 'BS Computer Science';
        else if (student.rawCourse === 'BSIT') profile.program = 'BS Information Technology';
        else profile.program = student.rawCourse;
      }

      if (student.yearLevel) {
        const yStr = String(student.yearLevel).replace(/[^0-9]/g, '');
        if (yStr === '1') profile.yearLevel = '1st Year';
        else if (yStr === '2') profile.yearLevel = '2nd Year';
        else if (yStr === '3') profile.yearLevel = '3rd Year';
        else if (yStr === '4') profile.yearLevel = '4th Year';
        else profile.yearLevel = student.yearLevel;
      }

      if (student.campus) {
        profile.schoolName = student.campus.toUpperCase();
      }

      if (student.academicYear) {
        profile.academicYear = student.academicYear;
      }

      return {
        rawText: textContent,
        courses,
        profile,
        totalUnits: parsed.totalUnits || courses.reduce((acc, cur) => acc + (cur.units || 3), 0),
      };
    } catch (err) {
      lastError = err;
      console.warn(`Gemini model ${model} failed, trying next fallback:`, err);
    }
  }

  throw lastError || new Error('Failed to process image with Gemini AI Vision.');
}
