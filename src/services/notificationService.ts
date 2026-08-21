import { LocalNotifications } from '@capacitor/local-notifications';
import { Course, NotificationSettings } from '../types';
import { formatTime12H } from './scheduleEngine';

export async function requestNotificationPermissions(): Promise<boolean> {
  try {
    const perm = await LocalNotifications.requestPermissions();
    if (perm.display === 'granted') return true;
  } catch (err) {
    if ('Notification' in window) {
      const result = await Notification.requestPermission();
      return result === 'granted';
    }
  }
  return false;
}

export async function scheduleClassReminders(
  courses: Course[],
  settings: NotificationSettings
): Promise<void> {
  if (!settings.remindersEnabled) {
    try {
      await LocalNotifications.removeAllDeliveredNotifications();
    } catch (e) {
      // Ignore
    }
    return;
  }

  const hasPermission = await requestNotificationPermissions();
  if (!hasPermission) return;

  try {
    await LocalNotifications.removeAllDeliveredNotifications();

    const notifications: any[] = [];
    let id = 100;

    courses.forEach(course => {
      const reminderMins = settings.reminderMinutes || 30;

      course.days.forEach(() => {
        id++;
        notifications.push({
          id,
          title: `Next Class: ${course.courseCode}`,
          body: `${course.courseName} starts in ${reminderMins} minutes.\n${course.room || 'No Room'} · ${formatTime12H(course.startTime)}`,
          schedule: { at: new Date(Date.now() + 1000 * 60 * 2) },
          smallIcon: 'ic_notification',
          iconColor: '#007AFF'
        });
      });
    });

    if (notifications.length > 0) {
      await LocalNotifications.schedule({ notifications: notifications.slice(0, 10) });
    }
  } catch (err) {
    console.warn('Capacitor LocalNotification fallback to Web Notification', err);
  }
}

export function showSystemToast(title: string, body: string): void {
  if ('Notification' in window && Notification.permission === 'granted') {
    new Notification(title, { body, icon: '/favicon.ico' });
  }
}
