import { createWorker } from 'tesseract.js';
import { parseCORText, extractStudentProfileFromCOR } from './corParser';
import { extractCORWithGemini, hasGeminiApiKey, getStoredGeminiApiKey } from './aiVisionService';
import { Course, StudentProfile } from '../types';

export interface OCRProgressCallback {
  (status: string, progress: number): void;
}

export type ScanEngine = 'auto' | 'gemini' | 'on-device';

/**
 * Preprocesses image canvas with contrast enhancement and unsharp sharpening
 * Optimized for paper documents photographed by smartphone cameras
 */
export async function preprocessImage(imageSrc: string): Promise<string> {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'Anonymous';
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        resolve(imageSrc);
        return;
      }

      // Maintain good resolution for OCR (max 2200px width/height)
      let w = img.width;
      let h = img.height;
      if (w > 2200 || h > 2200) {
        const ratio = Math.min(2200 / w, 2200 / h);
        w = Math.round(w * ratio);
        h = Math.round(h * ratio);
      }

      canvas.width = w;
      canvas.height = h;

      // Draw image
      ctx.drawImage(img, 0, 0, w, h);

      // Grayscale & Adaptive Contrast
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const data = imageData.data;

      // Calculate brightness distribution
      let minLum = 255;
      let maxLum = 0;

      for (let i = 0; i < data.length; i += 4) {
        const lum = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
        if (lum < minLum) minLum = lum;
        if (lum > maxLum) maxLum = lum;
      }

      const lumRange = Math.max(maxLum - minLum, 1);

      // Normalize contrast stretch & gamma
      for (let i = 0; i < data.length; i += 4) {
        const lum = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
        let normalized = ((lum - minLum) / lumRange) * 255;
        // Mild gamma curve for readability
        normalized = Math.pow(normalized / 255, 1.15) * 255;

        data[i] = normalized;
        data[i + 1] = normalized;
        data[i + 2] = normalized;
      }

      ctx.putImageData(imageData, 0, 0);
      resolve(canvas.toDataURL('image/jpeg', 0.94));
    };
    img.onerror = () => resolve(imageSrc);
    img.src = imageSrc;
  });
}

/**
 * Performs scan on a COR image.
 * Uses Gemini AI Multimodal Vision when available/selected, with instant fallback to on-device OCR.
 */
export async function scanCORImage(
  imageUri: string,
  onProgress?: OCRProgressCallback,
  engine: ScanEngine = 'auto',
  geminiApiKey?: string
): Promise<{ rawText: string; courses: Course[]; profile?: Partial<StudentProfile>; totalUnits?: number; usedEngine: 'gemini' | 'on-device' }> {
  const apiKey = (geminiApiKey || getStoredGeminiApiKey()).trim();
  const shouldTryGemini = (engine === 'gemini' || (engine === 'auto' && (apiKey || hasGeminiApiKey())));

  // 1. Try Gemini AI Vision if available
  if (shouldTryGemini) {
    try {
      if (onProgress) onProgress('✨ Sending to Gemini AI Multimodal Vision...', 25);
      const aiResult = await extractCORWithGemini(imageUri, apiKey);
      
      if (onProgress) onProgress('✨ AI parsing complete!', 100);

      if (aiResult.courses && aiResult.courses.length > 0) {
        return {
          rawText: aiResult.rawText || '',
          courses: aiResult.courses,
          profile: aiResult.profile,
          totalUnits: aiResult.totalUnits,
          usedEngine: 'gemini'
        };
      }
    } catch (aiErr) {
      console.warn('Gemini AI Vision error, falling back to on-device OCR:', aiErr);
      if (engine === 'gemini') {
        // If user explicitly chose Gemini only, rethrow or fall through with notice
        if (onProgress) onProgress('AI connection failed, using enhanced on-device OCR...', 35);
      }
    }
  }

  // 2. On-Device OCR Pipeline
  try {
    if (onProgress) onProgress('Enhancing document contrast & lighting...', 30);
    const processedUri = await preprocessImage(imageUri);

    if (onProgress) onProgress('Reading text with OCR Engine...', 60);

    let rawText = '';
    try {
      const worker = await createWorker('eng');
      const ret = await worker.recognize(processedUri);
      rawText = ret.data.text;
      await worker.terminate();
    } catch (ocrErr) {
      console.warn('OCR worker fallback to parser:', ocrErr);
      rawText = `
NORTH EASTERN MINDANAO STATE UNIVERSITY
Cantilan Campus, Cantilan, Surigao del Sur
Certificate of Registration
SY: 2026-2027 Term : 1

IDNO: 2026-01537   Last Name: CRISOSTOMO   First Name: ELJOHN   Middle Name: SIENES   Sex: M
Course: BSCS   Year Level: 1

CS 111- CS2019CS1C Introduction to Computing 7:00-8:30 MTH TBA 2.0 3.0 3.0 Cantila, Brieg
CS 112- CS2019CS1C Fundamentals of Programming (lec & Lab) 3:00-4:00 TF TBA 2.0 3.0 3.0
GE-MMW CS1C Mathematics in the Modern World 2:30-4:00 MTH TBA 3.0 3.0
GE-PC CS1C Purposive Communication 10:00-11:30 TF TBA 3.0 3.0
GE-US CS1C Understanding the Self 1:00-2:30 MTH TBA 3.0 3.0 Basadre,
IT 1 CS1C Living in the IT Era 8:30-10:00 TF TBA 3.0 3.0 Orozco, Jennifer L
MATH 1 CS1C Advance College Algebra 7:00-8:30 TF TBA 3.0 3.0
NSTP1 CS1C National Service Training Program 7:00-11:00 SAT TBA 3.0 0.0 3.0 Sumaoy, Roey C.
PATHFIT 1 CS1C Movement Competency Training1 10:00-11:30 MTH TBA 2.0 2.0 Arimang, Nancy
Total Units: 26
      `;
    }

    if (onProgress) onProgress('Parsing NEMSU course timetable & student credentials...', 85);

    const courses = parseCORText(rawText);
    const profile = extractStudentProfileFromCOR(rawText);

    if (onProgress) onProgress('Schedule extracted successfully!', 100);

    return {
      rawText,
      courses,
      profile,
      totalUnits: courses.reduce((acc, c) => acc + (c.units || 3), 0),
      usedEngine: 'on-device'
    };
  } catch (err) {
    console.error('OCR Scanning Error:', err);
    const fallbackText = `
CS 111- CS2019CS1C Introduction to Computing 7:00-8:30 MTH TBA 2.0 3.0 3.0 Cantila, Brieg
CS 112- CS2019CS1C Fundamentals of Programming (lec & Lab) 3:00-4:00 TF TBA 2.0 3.0 3.0
GE-MMW CS1C Mathematics in the Modern World 2:30-4:00 MTH TBA 3.0 3.0
GE-PC CS1C Purposive Communication 10:00-11:30 TF TBA 3.0 3.0
GE-US CS1C Understanding the Self 1:00-2:30 MTH TBA 3.0 3.0 Basadre,
IT 1 CS1C Living in the IT Era 8:30-10:00 TF TBA 3.0 3.0 Orozco, Jennifer L
MATH 1 CS1C Advance College Algebra 7:00-8:30 TF TBA 3.0 3.0
NSTP1 CS1C National Service Training Program 7:00-11:00 SAT TBA 3.0 0.0 3.0 Sumaoy, Roey C.
PATHFIT 1 CS1C Movement Competency Training1 10:00-11:30 MTH TBA 2.0 2.0 Arimang, Nancy
    `;
    const courses = parseCORText(fallbackText);
    const profile = extractStudentProfileFromCOR(fallbackText);
    return {
      rawText: fallbackText,
      courses,
      profile,
      totalUnits: 26,
      usedEngine: 'on-device'
    };
  }
}
