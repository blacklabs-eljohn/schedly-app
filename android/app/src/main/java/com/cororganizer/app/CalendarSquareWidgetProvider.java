package com.cororganizer.app;

import android.app.PendingIntent;
import android.appwidget.AppWidgetManager;
import android.appwidget.AppWidgetProvider;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.graphics.Color;
import android.widget.RemoteViews;

import org.json.JSONArray;
import org.json.JSONObject;

import java.text.SimpleDateFormat;
import java.util.ArrayList;
import java.util.Calendar;
import java.util.Collections;
import java.util.Date;
import java.util.List;
import java.util.Locale;

public class CalendarSquareWidgetProvider extends AppWidgetProvider {

    @Override
    public void onUpdate(Context context, AppWidgetManager appWidgetManager, int[] appWidgetIds) {
        for (int appWidgetId : appWidgetIds) {
            updateAppWidget(context, appWidgetManager, appWidgetId);
        }
    }

    public static void updateAppWidget(Context context, AppWidgetManager appWidgetManager, int appWidgetId) {
        SharedPreferences prefs = context.getSharedPreferences("SchedlyWidgetPrefs", Context.MODE_PRIVATE);
        String allEventsJson = prefs.getString("all_events", null);
        String calendarJson = prefs.getString("calendar_events", null);
        String themeMode = prefs.getString("theme_mode", "light");
        String colorTheme = prefs.getString("color_theme", "bluebook");

        boolean isLightMode = !"dark".equalsIgnoreCase(themeMode);
        int themeColor = getThemePrimaryColor(colorTheme, isLightMode);

        RemoteViews views = new RemoteViews(context.getPackageName(), R.layout.calendar_square_widget_layout);

        Calendar nowCal = Calendar.getInstance();
        String[] monthShorts = {"JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"};
        String[] dayShorts = {"SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"};

        String monthShort = monthShorts[nowCal.get(Calendar.MONTH)];
        String dayNum = String.valueOf(nowCal.get(Calendar.DAY_OF_MONTH));
        String dayShort = dayShorts[nowCal.get(Calendar.DAY_OF_WEEK) - 1];
        String dateHeader = monthShort + " " + dayNum + " · " + dayShort;

        String dueBadge = "0 Due";
        String categoryTag = "✨ ALL CLEAR";
        String title = "No Upcoming Deadlines";
        String subject = "You are all caught up";
        String time = "Great work ✨";
        String footer = "Next tasks will appear here";
        String categoryColorStr = null;

        SimpleDateFormat isoFmt = new SimpleDateFormat("yyyy-MM-dd", Locale.US);
        String todayIso = isoFmt.format(nowCal.getTime());

        List<EventItem> upcomingList = new ArrayList<>();

        if (allEventsJson != null && !allEventsJson.trim().isEmpty()) {
            try {
                JSONArray arr = new JSONArray(allEventsJson);
                for (int i = 0; i < arr.length(); i++) {
                    JSONObject obj = arr.optJSONObject(i);
                    if (obj == null) continue;
                    boolean isCompleted = obj.optBoolean("isCompleted", false);
                    if (isCompleted) continue;

                    String dateStr = obj.optString("date", "9999-99-99");
                    if (dateStr.compareTo(todayIso) < 0) continue; // Past event

                    String t = obj.optString("title", "Assignment");
                    String subjCode = obj.optString("subjectCode", "");
                    String subjName = obj.optString("subjectName", subjCode.isEmpty() ? "Academic Task" : subjCode);
                    String cat = obj.optString("category", "Task");
                    String sTime = obj.optString("startTime", "");
                    String catColor = getCategoryColor(cat);
                    String timeDisplay = formatEventTimeDisplay(dateStr, sTime, todayIso, nowCal);

                    upcomingList.add(new EventItem(t, subjName, cat, timeDisplay, catColor, dateStr, sTime));
                }

                Collections.sort(upcomingList, (a, b) -> {
                    int c = a.date.compareTo(b.date);
                    if (c != 0) return c;
                    return a.startTime.compareTo(b.startTime);
                });

                int count = upcomingList.size();
                dueBadge = count > 0 ? (count + " Upcoming") : "0 Due";

                if (count > 0) {
                    EventItem first = upcomingList.get(0);
                    title = first.title;
                    subject = first.subject;
                    categoryTag = first.category.toUpperCase();
                    time = "⏰ " + first.timeDisplay;
                    categoryColorStr = first.categoryColor;

                    if (count > 1) {
                        EventItem second = upcomingList.get(1);
                        footer = "Next: " + second.title + " (" + second.timeDisplay + ")";
                    } else {
                        footer = "Tap to open Calendar";
                    }
                }
            } catch (Exception ignored) {
                upcomingList.clear();
            }
        }

        // Fallback to legacy calendarJson if allEventsJson wasn't processed
        if (upcomingList.isEmpty() && calendarJson != null) {
            try {
                JSONObject obj = new JSONObject(calendarJson);
                int count = obj.optInt("totalDue", 0);
                dueBadge = obj.optString("badgeText", count > 0 ? (count + " Upcoming") : "0 Due");

                JSONObject next = obj.optJSONObject("nextEvent");
                if (next != null) {
                    title = next.optString("title", "Assignment");
                    subject = next.optString("subjectName", next.optString("subjectCode", "Academic Task"));
                    categoryTag = next.optString("category", "DEADLINE").toUpperCase();
                    time = "⏰ " + next.optString("time", "Soon");
                    categoryColorStr = next.optString("categoryColor", null);
                }

                String sec = obj.optString("secondaryEventText", null);
                if (sec != null && !sec.isEmpty()) {
                    footer = sec;
                } else {
                    footer = count > 1 ? count + " total deadlines this week" : "Tap to open Calendar";
                }
            } catch (Exception ignored) {
            }
        }

        // Apply Liquid Glass & Theme Styling
        if (isLightMode) {
            views.setInt(R.id.widget_calendar_square_root, "setBackgroundResource", R.drawable.widget_liquid_glass_light_bg);
            views.setInt(R.id.widget_cal_sq_card, "setBackgroundResource", R.drawable.widget_liquid_glass_light_card);
            views.setInt(R.id.widget_cal_sq_due_badge, "setBackgroundResource", R.drawable.widget_liquid_glass_pill_light);
            views.setTextColor(R.id.widget_cal_sq_date_header, themeColor);
            views.setTextColor(R.id.widget_cal_sq_due_badge, themeColor);
            views.setTextColor(R.id.widget_cal_sq_title, 0xFF0F172A);
            views.setTextColor(R.id.widget_cal_sq_subject, 0xFF64748B);
            views.setTextColor(R.id.widget_cal_sq_time, themeColor);
            views.setTextColor(R.id.widget_cal_sq_footer, 0xFF0F172A);
        } else {
            views.setInt(R.id.widget_calendar_square_root, "setBackgroundResource", R.drawable.widget_liquid_glass_bg);
            views.setInt(R.id.widget_cal_sq_card, "setBackgroundResource", R.drawable.widget_liquid_glass_card);
            views.setInt(R.id.widget_cal_sq_due_badge, "setBackgroundResource", R.drawable.widget_liquid_glass_pill);
            views.setTextColor(R.id.widget_cal_sq_date_header, themeColor);
            views.setTextColor(R.id.widget_cal_sq_due_badge, themeColor);
            views.setTextColor(R.id.widget_cal_sq_title, 0xFFFFFFFF);
            views.setTextColor(R.id.widget_cal_sq_subject, 0xFF94A3B8);
            views.setTextColor(R.id.widget_cal_sq_time, themeColor);
            views.setTextColor(R.id.widget_cal_sq_footer, 0xFFE2E8F0);
        }

        if (categoryColorStr != null) {
            try {
                views.setTextColor(R.id.widget_cal_sq_category_tag, Color.parseColor(categoryColorStr));
            } catch (Exception ignored) {
                views.setTextColor(R.id.widget_cal_sq_category_tag, themeColor);
            }
        } else {
            views.setTextColor(R.id.widget_cal_sq_category_tag, themeColor);
        }

        views.setTextViewText(R.id.widget_cal_sq_date_header, dateHeader);
        views.setTextViewText(R.id.widget_cal_sq_due_badge, dueBadge);
        views.setTextViewText(R.id.widget_cal_sq_category_tag, categoryTag);
        views.setTextViewText(R.id.widget_cal_sq_title, title);
        views.setTextViewText(R.id.widget_cal_sq_subject, subject);
        views.setTextViewText(R.id.widget_cal_sq_time, time);
        views.setTextViewText(R.id.widget_cal_sq_footer, footer);

        // Tap to open app
        Intent intent = new Intent(context, MainActivity.class);
        intent.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TASK);
        PendingIntent pendingIntent = PendingIntent.getActivity(
                context, 0, intent, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
        );
        views.setOnClickPendingIntent(R.id.widget_calendar_square_root, pendingIntent);

        appWidgetManager.updateAppWidget(appWidgetId, views);
    }

    private static class EventItem {
        String title;
        String subject;
        String category;
        String timeDisplay;
        String categoryColor;
        String date;
        String startTime;

        EventItem(String title, String subject, String category, String timeDisplay, String categoryColor, String date, String startTime) {
            this.title = title;
            this.subject = subject;
            this.category = category;
            this.timeDisplay = timeDisplay;
            this.categoryColor = categoryColor;
            this.date = date;
            this.startTime = startTime;
        }
    }

    private static String formatEventTimeDisplay(String eventDateIso, String startTimeStr, String todayIso, Calendar nowCal) {
        String timePart = formatTime12h(startTimeStr);
        if (timePart.isEmpty()) timePart = "All Day";

        if (eventDateIso.equals(todayIso)) {
            return "Today · " + timePart;
        }

        try {
            SimpleDateFormat sdf = new SimpleDateFormat("yyyy-MM-dd", Locale.US);
            Date targetDate = sdf.parse(eventDateIso);
            if (targetDate != null) {
                Calendar targetCal = Calendar.getInstance();
                targetCal.setTime(targetDate);

                long diffDays = (targetCal.getTimeInMillis() - nowCal.getTimeInMillis()) / (1000 * 60 * 60 * 24);
                if (diffDays == 1 || (targetCal.get(Calendar.DAY_OF_YEAR) - nowCal.get(Calendar.DAY_OF_YEAR) == 1)) {
                    return "Tomorrow · " + timePart;
                }
                String[] dayNames = {"Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"};
                if (diffDays > 1 && diffDays < 7) {
                    return dayNames[targetCal.get(Calendar.DAY_OF_WEEK) - 1] + " · " + timePart;
                }
            }
        } catch (Exception ignored) {
        }
        return eventDateIso + " · " + timePart;
    }

    private static String formatTime12h(String timeStr) {
        if (timeStr == null || !timeStr.contains(":")) return "";
        try {
            String[] parts = timeStr.trim().split(":");
            int h = Integer.parseInt(parts[0]);
            int m = Integer.parseInt(parts[1]);
            String ampm = h >= 12 ? "PM" : "AM";
            int displayH = h % 12 == 0 ? 12 : h % 12;
            return displayH + ":" + (m < 10 ? "0" + m : m) + " " + ampm;
        } catch (Exception e) {
            return timeStr;
        }
    }

    private static String getCategoryColor(String category) {
        if (category == null) return "#6366F1";
        switch (category.toLowerCase()) {
            case "exam": return "#EF4444";
            case "long_quiz":
            case "short_quiz":
            case "quiz": return "#F59E0B";
            case "assignment": return "#3B82F6";
            case "reporting": return "#8B5CF6";
            case "project": return "#10B981";
            case "meeting": return "#06B6D4";
            case "task": return "#EC4899";
            default: return "#6366F1";
        }
    }

    private static int getThemePrimaryColor(String themeId, boolean isLightMode) {
        if (themeId == null) themeId = "bluebook";
        switch (themeId.toLowerCase()) {
            case "bini": return isLightMode ? 0xFFDB2777 : 0xFFF472B6;
            case "crimson": return isLightMode ? 0xFFDC2626 : 0xFFFB7185;
            case "ube": return isLightMode ? 0xFF7C3AED : 0xFFC084FC;
            case "coffee": return isLightMode ? 0xFFD97706 : 0xFFFBBF24;
            case "matcha": return isLightMode ? 0xFF16A34A : 0xFF34D399;
            case "duos":
            case "dual-tone": return isLightMode ? 0xFF6366F1 : 0xFFA855F7;
            case "highlighter":
            case "rainbow": return isLightMode ? 0xFFEC4899 : 0xFFFB7185;
            case "obsidian":
            case "monochrome": return isLightMode ? 0xFF334155 : 0xFFCBD5E1;
            case "bluebook":
            case "blue-cascade":
            default: return isLightMode ? 0xFF2563EB : 0xFF38BDF8;
        }
    }
}
