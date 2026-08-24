import { LocalNotifications } from '@capacitor/local-notifications';
import { Course, NotificationSettings, DayOfWeek } from '../types';
import { formatTime12H, timeToMinutes } from './scheduleEngine';
import { triggerSuccessHaptic, triggerLightHaptic } from './hapticsService';

const DAY_NAME_TO_WEEKDAY: Record<DayOfWeek, number> = {
  Sun: 1,
  Mon: 2,
  Tue: 3,
  Wed: 4,
  Thu: 5,
  Fri: 6,
  Sat: 7
};

/**
 * Request system permissions for Push & Local Notifications
 */
export async function requestNotificationPermissions(): Promise<boolean> {
  try {
    const status = await LocalNotifications.checkPermissions();
    if (status.display === 'granted') return true;

    const req = await LocalNotifications.requestPermissions();
    return req.display === 'granted';
  } catch (err) {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      const result = await Notification.requestPermission();
      return result === 'granted';
    }
  }
  return false;
}

/**
 * Initialize high-priority notification channel for Android devices
 */
export async function setupNotificationChannel(): Promise<void> {
  try {
    await LocalNotifications.createChannel({
      id: 'class_reminders_channel',
      name: 'Class Timetable Reminders',
      description: 'Alerts and alarms for upcoming scheduled university classes',
      importance: 5, // High importance (heads-up notification)
      visibility: 1,
      sound: 'beep.wav',
      vibration: true,
      lights: true,
      lightColor: '#2563EB'
    });
  } catch (e) {
    // Channel creation is Android only
  }
}

let lastScheduledFingerprint = '';

/**
 * Schedule automated recurring weekly push notifications for all classes
 */
export async function scheduleClassReminders(
  courses: Course[],
  settings: NotificationSettings
): Promise<void> {
  if (!settings || !settings.remindersEnabled) {
    try {
      const pending = await LocalNotifications.getPending();
      if (pending.notifications && pending.notifications.length > 0) {
        await LocalNotifications.cancel({ notifications: pending.notifications });
      }
      lastScheduledFingerprint = '';
    } catch (e) {
      // Ignore
    }
    return;
  }

  // Prevent duplicate redundant reschedulings if data hasn't changed
  const currentFingerprint = `${courses.length}-${courses.map(c => `${c.id}:${c.startTime}:${c.days?.join(',')}`).join('|')}-${settings.reminderMinutes}-${settings.soundEnabled}`;
  if (currentFingerprint === lastScheduledFingerprint) {
    return;
  }

  const hasPermission = await requestNotificationPermissions();
  if (!hasPermission) return;

  try {
    await setupNotificationChannel();

    // 1. Cancel previous reminders
    const pending = await LocalNotifications.getPending();
    if (pending.notifications && pending.notifications.length > 0) {
      await LocalNotifications.cancel({ notifications: pending.notifications });
    }

    const reminderLeadMins = settings.reminderMinutes || 15;
    const notificationsToSchedule: any[] = [];
    let notificationId = 1000;

    courses.forEach(course => {
      if (!course.days || course.days.length === 0 || !course.startTime) return;

      const courseStartMins = timeToMinutes(course.startTime);
      let targetMins = courseStartMins - reminderLeadMins;

      // Calculate hour and minute for the alarm
      let targetHour = Math.floor(targetMins / 60);
      let targetMinute = targetMins % 60;

      if (targetMinute < 0) {
        targetMinute += 60;
        targetHour -= 1;
      }
      if (targetHour < 0) {
        targetHour += 24;
      }

      course.days.forEach(day => {
        notificationId++;
        const weekdayIndex = DAY_NAME_TO_WEEKDAY[day];
        if (!weekdayIndex) return;

        const roomInfo = course.room ? `Room ${course.room}` : 'Class';
        const formattedStart = formatTime12H(course.startTime);

        notificationsToSchedule.push({
          id: notificationId,
          title: `🔔 Upcoming Class: ${course.courseCode}`,
          body: `${course.courseName} starts in ${reminderLeadMins} mins · ${roomInfo} (${formattedStart})`,
          schedule: {
            on: {
              weekday: weekdayIndex,
              hour: targetHour,
              minute: targetMinute
            },
            repeats: true,
            allowWhileIdle: true
          },
          channelId: 'class_reminders_channel',
          sound: settings.soundEnabled ? 'beep.wav' : undefined,
          smallIcon: 'ic_launcher',
          iconColor: '#2563EB',
          extra: {
            courseId: course.id,
            courseCode: course.courseCode
          }
        });
      });
    });

    if (notificationsToSchedule.length > 0) {
      await LocalNotifications.schedule({
        notifications: notificationsToSchedule
      });
      lastScheduledFingerprint = currentFingerprint;
    }
  } catch (err) {
    console.warn('[NotificationService] Fallback on scheduling notifications:', err);
  }
}

/**
 * Trigger an immediate Test Push Notification on device
 */
export async function triggerTestClassNotification(leadMins: number = 15): Promise<void> {
  triggerLightHaptic();

  try {
    const hasPermission = await requestNotificationPermissions();
    if (!hasPermission) {
      alert('Please allow notifications in your device settings to receive class alerts.');
      return;
    }

    await setupNotificationChannel();

    await LocalNotifications.schedule({
      notifications: [
        {
          id: 99999,
          title: '🔔 Class Reminder: CS111',
          body: `Introduction to Computing starts in ${leadMins} mins · ComLab 101 · 8:30 AM`,
          schedule: { at: new Date(Date.now() + 800) },
          channelId: 'class_reminders_channel',
          smallIcon: 'ic_launcher',
          iconColor: '#2563EB'
        }
      ]
    });

    triggerSuccessHaptic();
  } catch (err) {
    console.warn('[NotificationService] Test notification fallback:', err);
  }
}

/**
 * In-app haptic alert (does NOT pop up system OS notifications for regular in-app actions)
 */
export function showSystemToast(_title: string, _body: string): void {
  triggerLightHaptic();
}
