package com.cororganizer.app;

import android.app.AlarmManager;
import android.app.PendingIntent;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.os.Build;
import android.util.Log;

import org.json.JSONArray;
import org.json.JSONObject;

import java.util.Calendar;

public class WidgetUpdateScheduler {

    private static final String TAG = "WidgetUpdateScheduler";
    public static final String ACTION_SCHEDULE_WIDGET_UPDATE = "com.cororganizer.app.ACTION_SCHEDULE_WIDGET_UPDATE";
    private static final int REQUEST_CODE = 9981;

    public static void scheduleNextUpdate(Context context) {
        if (context == null) return;

        try {
            AlarmManager alarmManager = (AlarmManager) context.getSystemService(Context.ALARM_SERVICE);
            if (alarmManager == null) return;

            long now = System.currentTimeMillis();
            Calendar cal = Calendar.getInstance();

            // 1. Calculate next midnight (00:00:05 AM tomorrow)
            Calendar midnightCal = (Calendar) cal.clone();
            midnightCal.add(Calendar.DAY_OF_YEAR, 1);
            midnightCal.set(Calendar.HOUR_OF_DAY, 0);
            midnightCal.set(Calendar.MINUTE, 0);
            midnightCal.set(Calendar.SECOND, 5);
            midnightCal.set(Calendar.MILLISECOND, 0);
            long nextTriggerTime = midnightCal.getTimeInMillis();

            // 2. Check all courses to find nearest start/end boundary today
            SharedPreferences prefs = context.getSharedPreferences("SchedlyWidgetPrefs", Context.MODE_PRIVATE);
            String allCoursesJson = prefs.getString("all_courses", null);

            if (allCoursesJson != null && !allCoursesJson.trim().isEmpty()) {
                String todayKey = getTodayDayAbbrev(cal.get(Calendar.DAY_OF_WEEK));
                int currentMins = cal.get(Calendar.HOUR_OF_DAY) * 60 + cal.get(Calendar.MINUTE);

                JSONArray coursesArr = new JSONArray(allCoursesJson);
                long earliestBoundaryToday = Long.MAX_VALUE;

                for (int i = 0; i < coursesArr.length(); i++) {
                    JSONObject c = coursesArr.optJSONObject(i);
                    if (c == null) continue;

                    JSONArray days = c.optJSONArray("days");
                    boolean matchesToday = false;
                    if (days != null) {
                        for (int d = 0; d < days.length(); d++) {
                            if (todayKey.equalsIgnoreCase(days.optString(d))) {
                                matchesToday = true;
                                break;
                            }
                        }
                    }

                    if (matchesToday) {
                        int startMins = parseTimeToMinutes(c.optString("startTime", ""));
                        int endMins = parseTimeToMinutes(c.optString("endTime", ""));

                        if (startMins > 0 && startMins > currentMins) {
                            // Upcoming class start boundary
                            Calendar startCal = (Calendar) cal.clone();
                            startCal.set(Calendar.HOUR_OF_DAY, startMins / 60);
                            startCal.set(Calendar.MINUTE, startMins % 60);
                            startCal.set(Calendar.SECOND, 2);
                            startCal.set(Calendar.MILLISECOND, 0);
                            long boundaryMillis = startCal.getTimeInMillis();
                            if (boundaryMillis > now && boundaryMillis < earliestBoundaryToday) {
                                earliestBoundaryToday = boundaryMillis;
                            }
                        }

                        if (endMins > 0 && endMins > currentMins) {
                            // Class end boundary (e.g. ongoing class finishes)
                            Calendar endCal = (Calendar) cal.clone();
                            endCal.set(Calendar.HOUR_OF_DAY, endMins / 60);
                            endCal.set(Calendar.MINUTE, endMins % 60);
                            endCal.set(Calendar.SECOND, 2);
                            endCal.set(Calendar.MILLISECOND, 0);
                            long boundaryMillis = endCal.getTimeInMillis();
                            if (boundaryMillis > now && boundaryMillis < earliestBoundaryToday) {
                                earliestBoundaryToday = boundaryMillis;
                            }
                        }
                    }
                }

                if (earliestBoundaryToday != Long.MAX_VALUE && earliestBoundaryToday < nextTriggerTime) {
                    nextTriggerTime = earliestBoundaryToday;
                }
            }

            // Ensure next trigger is strictly in the future
            if (nextTriggerTime <= now) {
                nextTriggerTime = now + 60000; // 1 minute fallback
            }

            Intent intent = new Intent(context, WidgetAlarmReceiver.class);
            intent.setAction(ACTION_SCHEDULE_WIDGET_UPDATE);
            PendingIntent pendingIntent = PendingIntent.getBroadcast(
                    context,
                    REQUEST_CODE,
                    intent,
                    PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
            );

            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
                    if (alarmManager.canScheduleExactAlarms()) {
                        alarmManager.setExactAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, nextTriggerTime, pendingIntent);
                    } else {
                        alarmManager.setAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, nextTriggerTime, pendingIntent);
                    }
                } else {
                    alarmManager.setExactAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, nextTriggerTime, pendingIntent);
                }
            } else {
                alarmManager.setExact(AlarmManager.RTC_WAKEUP, nextTriggerTime, pendingIntent);
            }

            Log.d(TAG, "Scheduled next widget update for: " + (nextTriggerTime - now) / 1000 + "s from now");
        } catch (Exception e) {
            Log.w(TAG, "Failed to schedule next widget update: " + e.getMessage());
        }
    }

    private static String getTodayDayAbbrev(int calendarDayOfWeek) {
        switch (calendarDayOfWeek) {
            case Calendar.SUNDAY: return "Sun";
            case Calendar.MONDAY: return "Mon";
            case Calendar.TUESDAY: return "Tue";
            case Calendar.WEDNESDAY: return "Wed";
            case Calendar.THURSDAY: return "Thu";
            case Calendar.FRIDAY: return "Fri";
            case Calendar.SATURDAY: return "Sat";
            default: return "Mon";
        }
    }

    private static int parseTimeToMinutes(String timeStr) {
        if (timeStr == null || !timeStr.contains(":")) return -1;
        try {
            String[] parts = timeStr.trim().split(":");
            int h = Integer.parseInt(parts[0]);
            int m = Integer.parseInt(parts[1]);
            return h * 60 + m;
        } catch (Exception e) {
            return -1;
        }
    }
}
