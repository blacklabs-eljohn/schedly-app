package com.cororganizer.app;

import android.app.PendingIntent;
import android.appwidget.AppWidgetManager;
import android.appwidget.AppWidgetProvider;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.graphics.Color;
import android.view.View;
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

public class CalendarBentoWidgetProvider extends AppWidgetProvider {

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
        int dateCardBg = getThemeDateTileBackground(colorTheme);

        RemoteViews views = new RemoteViews(context.getPackageName(), R.layout.calendar_bento_widget_layout);

        // Real-time system calendar date
        Calendar nowCal = Calendar.getInstance();
        String[] monthNames = {"JANUARY", "FEBRUARY", "MARCH", "APRIL", "MAY", "JUNE", "JULY", "AUGUST", "SEPTEMBER", "OCTOBER", "NOVEMBER", "DECEMBER"};
        String[] dayNames = {"Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"};

        String month = monthNames[nowCal.get(Calendar.MONTH)];
        String dayNum = String.valueOf(nowCal.get(Calendar.DAY_OF_MONTH));
        String dayName = dayNames[nowCal.get(Calendar.DAY_OF_WEEK) - 1];
        String totalDue = "0 Due";
        boolean hasUpcoming = false;

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

                    String title = obj.optString("title", "Event");
                    String startTime = obj.optString("startTime", "");
                    String category = obj.optString("category", "task");
                    String categoryColor = getCategoryColor(category);
                    String timeDisplay = formatEventTimeDisplay(dateStr, startTime, todayIso, nowCal);

                    upcomingList.add(new EventItem(title, timeDisplay, categoryColor, dateStr, startTime));
                }

                Collections.sort(upcomingList, (a, b) -> {
                    int c = a.date.compareTo(b.date);
                    if (c != 0) return c;
                    return a.startTime.compareTo(b.startTime);
                });

                int count = upcomingList.size();
                totalDue = count > 0 ? (count + " Upcoming") : "0 Due";
            } catch (Exception ignored) {
                upcomingList.clear();
            }
        }

        // Fallback to legacy calendarJson if allEventsJson was not available
        if (upcomingList.isEmpty() && calendarJson != null) {
            try {
                JSONObject obj = new JSONObject(calendarJson);
                int count = obj.optInt("totalDue", 0);
                totalDue = obj.optString("badgeText", count > 0 ? (count + " Upcoming") : "0 Due");

                JSONArray up = obj.optJSONArray("upcomingList");
                if (up != null) {
                    for (int i = 0; i < up.length(); i++) {
                        JSONObject item = up.optJSONObject(i);
                        if (item == null) continue;
                        String t = item.optString("title", "Event");
                        String time = item.optString("time", "");
                        String catCol = item.optString("categoryColor", "#38BDF8");
                        upcomingList.add(new EventItem(t, time, catCol, "", ""));
                    }
                }
            } catch (Exception ignored) {
            }
        }

        int[] itemIds = {R.id.widget_bento_event_1, R.id.widget_bento_event_2, R.id.widget_bento_event_3};
        int[] titleIds = {R.id.widget_bento_title_1, R.id.widget_bento_title_2, R.id.widget_bento_title_3};
        int[] timeIds = {R.id.widget_bento_time_1, R.id.widget_bento_time_2, R.id.widget_bento_time_3};
        int[] barIds = {R.id.widget_bento_bar_1, R.id.widget_bento_bar_2, R.id.widget_bento_bar_3};

        int len = upcomingList.size();
        if (len > 0) {
            hasUpcoming = true;
            for (int i = 0; i < 3; i++) {
                if (i < len) {
                    EventItem item = upcomingList.get(i);
                    views.setViewVisibility(itemIds[i], View.VISIBLE);
                    views.setTextViewText(titleIds[i], item.title);
                    views.setTextViewText(timeIds[i], item.time);

                    try {
                        views.setInt(barIds[i], "setBackgroundColor", Color.parseColor(item.categoryColor));
                    } catch (Exception ignored) {
                        views.setInt(barIds[i], "setBackgroundColor", themeColor);
                    }

                    if (isLightMode) {
                        views.setInt(itemIds[i], "setBackgroundResource", R.drawable.widget_liquid_glass_light_card);
                        views.setTextColor(titleIds[i], 0xFF0F172A);
                        views.setTextColor(timeIds[i], 0xFF64748B);
                    } else {
                        views.setInt(itemIds[i], "setBackgroundResource", R.drawable.widget_liquid_glass_card);
                        views.setTextColor(titleIds[i], 0xFFFFFFFF);
                        views.setTextColor(timeIds[i], 0xFF94A3B8);
                    }
                } else {
                    views.setViewVisibility(itemIds[i], View.GONE);
                }
            }
        }

        // Apply Themed Left Date Tile & Liquid Glass Background
        views.setInt(R.id.widget_bento_date_card, "setBackgroundResource", dateCardBg);
        views.setTextColor(R.id.widget_bento_month, 0xFFFFFFFF);
        views.setTextColor(R.id.widget_bento_day_number, 0xFFFFFFFF);
        views.setTextColor(R.id.widget_bento_day_name, 0xFFF1F5F9);
        views.setTextColor(R.id.widget_bento_events_count, 0xFFFFFFFF);
        views.setInt(R.id.widget_bento_events_count, "setBackgroundResource", R.drawable.widget_liquid_glass_pill);

        if (isLightMode) {
            views.setInt(R.id.widget_calendar_bento_root, "setBackgroundResource", R.drawable.widget_liquid_glass_light_bg);
            views.setTextColor(R.id.widget_bento_upcoming_header, themeColor);
            views.setTextColor(R.id.widget_bento_empty_title, 0xFF0F172A);
            views.setTextColor(R.id.widget_bento_empty_sub, 0xFF64748B);
        } else {
            views.setInt(R.id.widget_calendar_bento_root, "setBackgroundResource", R.drawable.widget_liquid_glass_bg);
            views.setTextColor(R.id.widget_bento_upcoming_header, themeColor);
            views.setTextColor(R.id.widget_bento_empty_title, 0xFFFFFFFF);
            views.setTextColor(R.id.widget_bento_empty_sub, 0xFF94A3B8);
        }

        views.setTextViewText(R.id.widget_bento_month, month);
        views.setTextViewText(R.id.widget_bento_day_number, dayNum);
        views.setTextViewText(R.id.widget_bento_day_name, dayName);
        views.setTextViewText(R.id.widget_bento_events_count, totalDue);

        if (!hasUpcoming) {
            views.setViewVisibility(R.id.widget_bento_event_1, View.GONE);
            views.setViewVisibility(R.id.widget_bento_event_2, View.GONE);
            views.setViewVisibility(R.id.widget_bento_event_3, View.GONE);
            views.setViewVisibility(R.id.widget_bento_empty, View.VISIBLE);
        } else {
            views.setViewVisibility(R.id.widget_bento_empty, View.GONE);
        }

        // Tap to open app
        Intent intent = new Intent(context, MainActivity.class);
        intent.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TASK);
        PendingIntent pendingIntent = PendingIntent.getActivity(
                context, 0, intent, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
        );
        views.setOnClickPendingIntent(R.id.widget_calendar_bento_root, pendingIntent);

        appWidgetManager.updateAppWidget(appWidgetId, views);
    }

    private static class EventItem {
        String title;
        String time;
        String categoryColor;
        String date;
        String startTime;

        EventItem(String title, String time, String categoryColor, String date, String startTime) {
            this.title = title;
            this.time = time;
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

    private static int getThemeDateTileBackground(String themeId) {
        if (themeId == null) return R.drawable.widget_up_next_bg_bluebook;
        switch (themeId.toLowerCase()) {
            case "bini": return R.drawable.widget_up_next_bg_bini;
            case "crimson": return R.drawable.widget_up_next_bg_crimson;
            case "ube": return R.drawable.widget_up_next_bg_ube;
            case "coffee": return R.drawable.widget_up_next_bg_coffee;
            case "matcha": return R.drawable.widget_up_next_bg_matcha;
            case "duos":
            case "dual-tone": return R.drawable.widget_up_next_bg_duos;
            case "obsidian":
            case "monochrome": return R.drawable.widget_up_next_bg_obsidian;
            case "bluebook":
            case "blue-cascade":
            default: return R.drawable.widget_up_next_bg_bluebook;
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
