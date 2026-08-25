import { supabase } from './supabaseClient';
import { Announcement } from '../types';
import { isNetworkOnline } from './syncService';

const DISMISSED_ANNOUNCEMENTS_KEY = 'schedly_dismissed_announcements';

/**
 * Get list of dismissed announcement IDs from localStorage
 */
export function getDismissedAnnouncementIds(): string[] {
  try {
    const raw = localStorage.getItem(DISMISSED_ANNOUNCEMENTS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

/**
 * Mark an announcement ID as dismissed so it doesn't show again
 */
export function dismissAnnouncement(announcementId: string): void {
  try {
    const dismissed = getDismissedAnnouncementIds();
    if (!dismissed.includes(announcementId)) {
      dismissed.push(announcementId);
      localStorage.setItem(DISMISSED_ANNOUNCEMENTS_KEY, JSON.stringify(dismissed));
    }
  } catch (err) {
    console.error('Failed to save dismissed announcement', err);
  }
}

/**
 * Fetch active announcements for the current user and general public
 */
export async function fetchActiveAnnouncements(userId?: string): Promise<Announcement[]> {
  if (!isNetworkOnline()) {
    return [];
  }

  try {
    let query = supabase
      .from('announcements')
      .select('*')
      .eq('is_active', true)
      .order('created_at', { ascending: false });

    // If userId provided, fetch general (target_user_id is null) OR targeted to this user
    if (userId) {
      query = query.or(`target_user_id.is.null,target_user_id.eq.${userId}`);
    } else {
      query = query.is('target_user_id', null);
    }

    const { data, error } = await query;

    if (error) {
      // Table might not be created yet in user's Supabase project; gracefully return empty
      console.warn('Announcements fetch notice (table may not exist yet):', error.message);
      return [];
    }

    if (!data || data.length === 0) return [];

    const dismissedIds = new Set(getDismissedAnnouncementIds());

    return data
      .map((row: any) => ({
        id: String(row.id),
        title: row.title || '',
        message: row.message || '',
        type: (row.type || 'banner') as Announcement['type'],
        variant: (row.variant || 'info') as Announcement['variant'],
        targetUserId: row.target_user_id || null,
        actionText: row.action_text || null,
        actionUrl: row.action_url || null,
        isActive: Boolean(row.is_active),
        dismissible: row.dismissible ?? true,
        createdAt: row.created_at
      }))
      // Filter out dismissed modal/toast announcements (permanent banners can stay if dismissible === false)
      .filter((a: Announcement) => !a.dismissible || !dismissedIds.has(a.id));
  } catch (err) {
    console.warn('Error fetching announcements:', err);
    return [];
  }
}
