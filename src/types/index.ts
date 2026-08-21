export type DayOfWeek = 'Mon' | 'Tue' | 'Wed' | 'Thu' | 'Fri' | 'Sat' | 'Sun';

export interface FieldConfidence {
  courseCode: boolean;
  courseName: boolean;
  instructor: boolean;
  room: boolean;
  days: boolean;
  times: boolean;
}

export interface Course {
  id: string;
  courseCode: string;
  courseName: string;
  instructor: string;
  room: string;
  days: DayOfWeek[];
  startTime: string; // 24h format e.g. "08:00"
  endTime: string;   // 24h format e.g. "09:00"
  units?: number;
  color?: string;
  confidence?: FieldConfidence;
  rawTextSnippet?: string;
}

export interface Instructor {
  id: string;
  name: string;
  courses: Course[];
  totalWeeklyHours: number;
}

export interface ScheduleConflict {
  id: string;
  course1: Course;
  course2: Course;
  day: DayOfWeek;
  overlapMinutes: number;
  message: string;
}

export interface FreeTimeGap {
  id: string;
  day: DayOfWeek;
  startTime: string;
  endTime: string;
  durationMinutes: number;
  formattedDuration: string;
  prevCourseCode?: string;
  nextCourseCode?: string;
}

export interface DayScheduleInfo {
  day: DayOfWeek;
  courses: Course[];
  freeTimeGaps: FreeTimeGap[];
  totalFreeTimeMinutes: number;
  firstClassStart?: string;
  lastClassEnd?: string;
}

export interface ActiveClassState {
  type: 'CURRENT' | 'NEXT' | 'NONE';
  course: Course | null;
  minutesRemaining: number;
  formattedCountdown: string;
  statusText: string;
}

export type SubjectCardTheme = 'blue-cascade' | 'dual-tone' | 'rainbow';

export interface NotificationSettings {
  remindersEnabled: boolean;
  reminderMinutes: number; // e.g. 30
  soundEnabled: boolean;
  appearanceMode: 'system' | 'light' | 'dark';
  subjectCardTheme?: SubjectCardTheme;
}

export interface CORScanResult {
  rawText: string;
  courses: Course[];
  scannedAt: string;
  imageUri?: string;
}

/* Digital Student ID Data Models */
export type IDTheme = 'y2k-pink' | 'digital-blue' | 'lime-tech' | 'lavender' | 'silver-specular' | 'minimal-white';

export interface StudentProfile {
  id: string;
  fullName: string;
  studentNumber: string;
  program: string;
  yearLevel: string;
  section: string;
  schoolName: string;
  academicYear: string;
  profilePhoto?: string;
  schoolLogo?: string;
  selectedTheme: IDTheme;
  accentColor: string;
  emergencyContactName?: string;
  emergencyContactPhone?: string;
  bloodType?: string;
}
