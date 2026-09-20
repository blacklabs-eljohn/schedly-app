import { supabase } from './supabaseClient';
import { User } from '@supabase/supabase-js';
import { StudentProfile, Announcement } from '../types';

export const ADMIN_EMAIL = 'eljohnsienes@gmail.com';
const ADMIN_SESSION_KEY = 'schedly_admin_auth_session';

export interface AdminMetrics {
  totalUsers: number;
  activeNow15m: number;
  activeNow1h: number;
  dauToday: number;
  signupsToday: number;
  signups7d: number;
  signups30d: number;
  wau7d: number;
  mau30d: number;
  totalCourses: number;
  totalSchedules: number;
  totalEvents: number;
  totalSchools: number;
  stickinessRate: number; // (DAU / MAU) * 100
}

export interface AdminSession {
  id: string;
  email: string;
  fullName: string;
  role: string;
  token: string;
  loggedInAt: string;
}

/**
 * Authenticate admin with email and password strictly for the /admin portal
 */
export async function loginAdmin(email: string, password: string): Promise<{ success: boolean; error?: string; session?: AdminSession }> {
  try {
    const { data, error } = await supabase.rpc('admin_authenticate', {
      p_email: email.trim(),
      p_password: password
    });

    if (error) {
      return { success: false, error: error.message };
    }

    if (!data || !data.success) {
      return { success: false, error: data?.error || 'Invalid administrator credentials' };
    }

    const session: AdminSession = {
      id: data.admin.id,
      email: data.admin.email,
      fullName: data.admin.fullName,
      role: data.admin.role,
      token: data.admin.token,
      loggedInAt: new Date().toISOString()
    };

    localStorage.setItem(ADMIN_SESSION_KEY, JSON.stringify(session));
    return { success: true, session };
  } catch (err: any) {
    return { success: false, error: err.message || 'Authentication failed' };
  }
}

/**
 * Retrieve current active admin session
 */
export function getAdminSession(): AdminSession | null {
  try {
    const raw = localStorage.getItem(ADMIN_SESSION_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

/**
 * Clear admin session / Logout
 */
export function logoutAdmin(): void {
  localStorage.removeItem(ADMIN_SESSION_KEY);
}

export interface DailyActivityStat {
  date: string;
  activeUsers: number;
  newSignups: number;
}

export interface AdminUserItem {
  id: string;
  fullName: string;
  studentNumber: string;
  program: string;
  yearLevel: string;
  section: string;
  schoolName: string;
  academicYear: string;
  selectedTheme: string;
  accentColor: string;
  profilePhotoUrl?: string;
  lastActiveAt?: string;
  createdAt: string;
  totalCourses: number;
  totalEvents: number;
}

export interface SchoolBreakdown {
  schoolName: string;
  userCount: number;
  programsCount: number;
  percentage: number;
}

/**
 * Check if current user is an authorized administrator
 */
export function isAdminUser(user?: User | null, profile?: StudentProfile | null): boolean {
  if (!user) return false;
  if (user.email && user.email.toLowerCase() === ADMIN_EMAIL.toLowerCase()) {
    return true;
  }
  if ((user.user_metadata as any)?.is_admin === true) {
    return true;
  }
  if ((profile as any)?.is_admin === true) {
    return true;
  }
  return false;
}

/**
 * Fetch high-level admin metrics and KPI counters
 */
export async function fetchAdminMetrics(): Promise<AdminMetrics> {
  try {
    const { data, error } = await supabase.rpc('get_admin_dashboard_metrics');
    if (error) throw error;

    const totalUsers = Number(data?.total_users || 0);
    const activeNow15m = Number(data?.active_now_15m || 0);
    const activeNow1h = Number(data?.active_now_1h || 0);
    const dauToday = Number(data?.dau_today || 0);
    const signupsToday = Number(data?.signups_today || 0);
    const signups7d = Number(data?.signups_7d || 0);
    const signups30d = Number(data?.signups_30d || 0);
    const wau7d = Number(data?.wau_7d || 0);
    const mau30d = Number(data?.mau_30d || 0);
    const totalCourses = Number(data?.total_courses || 0);
    const totalSchedules = Number(data?.total_schedules || 0);
    const totalEvents = Number(data?.total_events || 0);
    const totalSchools = Number(data?.total_schools || 0);
    
    const stickinessRate = mau30d > 0 ? Math.round((dauToday / mau30d) * 1000) / 10 : 0;

    return {
      totalUsers,
      activeNow15m,
      activeNow1h,
      dauToday,
      signupsToday,
      signups7d,
      signups30d,
      wau7d,
      mau30d,
      totalCourses,
      totalSchedules,
      totalEvents,
      totalSchools,
      stickinessRate,
    };
  } catch (err) {
    console.error('Failed to fetch admin metrics:', err);
    throw err;
  }
}

/**
 * Fetch Daily Active Users over the past N days
 */
export async function fetchAdminActivityChart(daysLimit: number = 30): Promise<DailyActivityStat[]> {
  try {
    const { data, error } = await supabase.rpc('get_admin_daily_activity', {
      days_limit: daysLimit
    });
    if (error) throw error;

    return (data || []).map((row: any) => ({
      date: row.activity_date,
      activeUsers: Number(row.active_users_count || 0),
      newSignups: Number(row.new_signups_count || 0)
    }));
  } catch (err) {
    console.error('Failed to fetch activity chart:', err);
    return [];
  }
}

/**
 * Fetch searchable and paginated users list with stats
 */
export async function fetchAdminUsersList(options: {
  searchQuery?: string;
  schoolFilter?: string;
  limit?: number;
  offset?: number;
}): Promise<{ users: AdminUserItem[]; totalCount: number }> {
  try {
    const { data, error } = await supabase.rpc('get_admin_users_list', {
      p_search: options.searchQuery || '',
      p_school: options.schoolFilter === 'ALL' ? '' : (options.schoolFilter || ''),
      p_limit: options.limit || 50,
      p_offset: options.offset || 0
    });

    if (error) throw error;

    const rows = data || [];
    const totalCount = rows.length > 0 ? Number(rows[0].total_count || 0) : 0;

    const users: AdminUserItem[] = rows.map((r: any) => ({
      id: r.id,
      fullName: r.full_name || 'Unnamed Student',
      studentNumber: r.student_number || 'N/A',
      program: r.program || 'General Academic',
      yearLevel: r.year_level || '',
      section: r.section || '',
      schoolName: r.school_name || 'NEMSU',
      academicYear: r.academic_year || '2026–2027',
      selectedTheme: r.selected_theme || 'digital-blue',
      accentColor: r.accent_color || '#2563EB',
      profilePhotoUrl: r.profile_photo_url || undefined,
      lastActiveAt: r.last_active_at,
      createdAt: r.created_at,
      totalCourses: Number(r.total_courses || 0),
      totalEvents: Number(r.total_events || 0)
    }));

    return { users, totalCount };
  } catch (err) {
    console.error('Failed to fetch users list:', err);
    return { users: [], totalCount: 0 };
  }
}

/**
 * Fetch school & university breakdown statistics
 */
export async function fetchAdminSchoolsBreakdown(totalUsersCount?: number): Promise<SchoolBreakdown[]> {
  try {
    const { data, error } = await supabase.rpc('get_admin_schools_breakdown');
    if (error) throw error;

    const rows = data || [];
    const total = totalUsersCount || rows.reduce((acc: number, cur: any) => acc + Number(cur.user_count || 0), 0) || 1;

    return rows.map((r: any) => {
      const userCount = Number(r.user_count || 0);
      return {
        schoolName: r.school_name || 'NEMSU',
        userCount,
        programsCount: Number(r.programs_count || 0),
        percentage: Math.round((userCount / total) * 1000) / 10
      };
    });
  } catch (err) {
    console.error('Failed to fetch schools breakdown:', err);
    return [];
  }
}

/**
 * Fetch all announcements (including inactive) for admin manager
 */
export async function fetchAllAdminAnnouncements(): Promise<Announcement[]> {
  try {
    const { data, error } = await supabase
      .from('announcements')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;

    return (data || []).map((row: any) => ({
      id: String(row.id),
      title: row.title || '',
      message: row.message || '',
      type: row.type || 'banner',
      variant: row.variant || 'info',
      targetUserId: row.target_user_id || null,
      actionText: row.action_text || null,
      actionUrl: row.action_url || null,
      isActive: Boolean(row.is_active),
      dismissible: row.dismissible ?? true,
      createdAt: row.created_at
    }));
  } catch (err) {
    console.error('Failed to fetch all announcements for admin:', err);
    return [];
  }
}

/**
 * Create a new announcement broadcast
 */
export async function createAdminAnnouncement(announcement: Omit<Announcement, 'id'>): Promise<boolean> {
  try {
    const payload = {
      id: 'ann_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7),
      title: announcement.title.trim(),
      message: announcement.message.trim(),
      type: announcement.type,
      variant: announcement.variant,
      target_user_id: announcement.targetUserId || null,
      action_text: announcement.actionText?.trim() || null,
      action_url: announcement.actionUrl?.trim() || null,
      is_active: announcement.isActive ?? true,
      dismissible: announcement.dismissible ?? true,
      created_at: new Date().toISOString()
    };

    const { error } = await supabase.from('announcements').insert([payload]);
    if (error) throw error;
    return true;
  } catch (err) {
    console.error('Failed to create announcement:', err);
    throw err;
  }
}

/**
 * Toggle active state of an announcement
 */
export async function toggleAdminAnnouncementActive(id: string, isActive: boolean): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('announcements')
      .update({ is_active: isActive })
      .eq('id', id);

    if (error) throw error;
    return true;
  } catch (err) {
    console.error('Failed to toggle announcement active state:', err);
    throw err;
  }
}

/**
 * Delete an announcement permanently
 */
export async function deleteAdminAnnouncement(id: string): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('announcements')
      .delete()
      .eq('id', id);

    if (error) throw error;
    return true;
  } catch (err) {
    console.error('Failed to delete announcement:', err);
    throw err;
  }
}

/**
 * Export students dataset to a CSV file for download
 */
export function exportUsersToCSV(users: AdminUserItem[]): void {
  if (!users || users.length === 0) return;

  const headers = [
    'Student Name',
    'Student Number',
    'School / Campus',
    'Program',
    'Year Level',
    'Section',
    'Courses Count',
    'Events Count',
    'Last Active',
    'Joined Date'
  ];

  const escapeCsv = (val: any) => {
    const str = String(val ?? '').replace(/"/g, '""');
    return `"${str}"`;
  };

  const rows = users.map(u => [
    escapeCsv(u.fullName),
    escapeCsv(u.studentNumber),
    escapeCsv(u.schoolName),
    escapeCsv(u.program),
    escapeCsv(u.yearLevel),
    escapeCsv(u.section),
    u.totalCourses,
    u.totalEvents,
    escapeCsv(u.lastActiveAt ? new Date(u.lastActiveAt).toLocaleString() : 'N/A'),
    escapeCsv(new Date(u.createdAt).toLocaleDateString())
  ]);

  const csvContent = 'data:text/csv;charset=utf-8,' + [
    headers.join(','),
    ...rows.map(r => r.join(','))
  ].join('\n');

  const encodedUri = encodeURI(csvContent);
  const link = document.createElement('a');
  link.setAttribute('href', encodedUri);
  link.setAttribute('download', `schedly_users_export_${new Date().toISOString().split('T')[0]}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
