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
  icon?: string;     // Custom subject icon ID e.g. 'code', 'flask', 'calculator'
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

/* Schedly Personality Color Themes */
export type SchedlyColorTheme = 
  | 'bluebook' 
  | 'crimson' 
  | 'bini' 
  | 'ube' 
  | 'coffee' 
  | 'matcha' 
  | 'duos' 
  | 'highlighter'
  | 'obsidian'
  | 'monochrome'   // alias for obsidian
  | 'blue-cascade' // legacy alias for bluebook
  | 'dual-tone'    // legacy alias for duos
  | 'rainbow';     // legacy alias for highlighter

export type SubjectCardTheme = SchedlyColorTheme;

export interface NotificationSettings {
  remindersEnabled: boolean;
  reminderMinutes: number; // e.g. 30
  soundEnabled: boolean;
  appearanceMode: 'system' | 'light' | 'dark';
  colorTheme?: SchedlyColorTheme;
  subjectCardTheme?: SchedlyColorTheme;
}

export interface CORScanResult {
  rawText: string;
  courses: Course[];
  scannedAt: string;
  imageUri?: string;
}

/* Digital Student ID Data Models */
export type IDTheme = 
  | 'app-dynamic'
  | 'digital-blue' 
  | 'silver-specular' 
  | 'lime-tech' 
  | 'y2k-pink' 
  | 'lavender' 
  | 'minimal-white';

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
  useAppTheme?: boolean; // When true (default), ID automatically adapts to active Schedly color theme
  emergencyContactName?: string;
  emergencyContactPhone?: string;
  bloodType?: string;
}

/* In-App Developer Announcements & Remote Notices */
export type AnnouncementType = 'modal' | 'banner' | 'toast';
export type AnnouncementVariant = 'info' | 'update' | 'warning' | 'alert';

export interface Announcement {
  id: string;
  title: string;
  message: string;
  type: AnnouncementType;
  variant: AnnouncementVariant;
  targetUserId?: string | null;
  actionText?: string | null;
  actionUrl?: string | null;
  isActive: boolean;
  dismissible: boolean;
  createdAt?: string;
}

/* User Custom Academic & Campus Events */
export type EventCategory = 'exam' | 'assignment' | 'meeting' | 'activity' | 'personal';

export interface CustomEvent {
  id: string;
  title: string;
  category: EventCategory;
  date: string; // 'YYYY-MM-DD'
  startTime?: string; // 'HH:mm' (24H)
  endTime?: string; // 'HH:mm' (24H)
  isAllDay: boolean;
  location?: string;
  reminderMinutes: number; // e.g. -1 (none), 0 (at time), 15, 30, 60, 1440 (1 day before)
  notes?: string;
  color?: string;
  isCompleted?: boolean;
  createdAt: string;
}

