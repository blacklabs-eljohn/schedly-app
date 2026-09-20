package com.cororganizer.app;

import android.app.PendingIntent;
import android.appwidget.AppWidgetManager;
import android.appwidget.AppWidgetProvider;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.view.View;
import android.widget.RemoteViews;

import org.json.JSONArray;
import org.json.JSONObject;

import java.util.ArrayList;
import java.util.Calendar;
import java.util.Collections;
import java.util.Comparator;
import java.util.List;

public class TodayScheduleWidgetProvider extends AppWidgetProvider {

    @Override
    public void onUpdate(Context context, AppWidgetManager appWidgetManager, int[] appWidgetIds) {
        for (int appWidgetId : appWidgetIds) {
            updateAppWidget(context, appWidgetManager, appWidgetId);
        }
    }

    public static void updateAppWidget(Context context, AppWidgetManager appWidgetManager, int appWidgetId) {
        SharedPreferences prefs = context.getSharedPreferences("SchedlyWidgetPrefs", Context.MODE_PRIVATE);
        String allCoursesJson = prefs.getString("all_courses", null);
        String todayJson = prefs.getString("today_schedule", null);
        String legacyDayName = prefs.getString("today_day_name", "TODAY");
        String themeMode = prefs.getString("theme_mode", "light");
        String colorTheme = prefs.getString("color_theme", "bluebook");

        boolean isLightMode = !"dark".equalsIgnoreCase(themeMode);
        int themeColor = getThemePrimaryColor(colorTheme, isLightMode);

        Calendar nowCal = Calendar.getInstance();
        int dayOfWeek = nowCal.get(Calendar.DAY_OF_WEEK);
        String currentDayAbbrev = getDayAbbrev(dayOfWeek);
        String currentDayFullName = getDayFullName(dayOfWeek);
        int currentMinutes = nowCal.get(Calendar.HOUR_OF_DAY) * 60 + nowCal.get(Calendar.MINUTE);

        RemoteViews views = new RemoteViews(context.getPackageName(), R.layout.today_schedule_widget_layout);
        views.setTextViewText(R.id.widget_today_day_header, currentDayFullName.toUpperCase() + "'S TIMETABLE");

        // Set Root Background & Header Colors with Liquid Glass
        if (isLightMode) {
            views.setInt(R.id.widget_today_root, "setBackgroundResource", R.drawable.widget_liquid_glass_light_bg);
            views.setInt(R.id.widget_today_count, "setBackgroundResource", R.drawable.widget_liquid_glass_pill_light);
            views.setTextColor(R.id.widget_today_day_header, themeColor);
            views.setTextColor(R.id.widget_today_count, themeColor);
            views.setTextColor(R.id.widget_today_empty_title, 0xFF0F172A);
            views.setTextColor(R.id.widget_today_empty_subtitle, 0xFF64748B);
            views.setTextColor(R.id.widget_today_overflow, 0xFF64748B);
        } else {
            views.setInt(R.id.widget_today_root, "setBackgroundResource", R.drawable.widget_liquid_glass_bg);
            views.setInt(R.id.widget_today_count, "setBackgroundResource", R.drawable.widget_liquid_glass_pill);
            views.setTextColor(R.id.widget_today_day_header, themeColor);
            views.setTextColor(R.id.widget_today_count, themeColor);
            views.setTextColor(R.id.widget_today_empty_title, 0xFFFFFFFF);
            views.setTextColor(R.id.widget_today_empty_subtitle, 0xFF94A3B8);
            views.setTextColor(R.id.widget_today_overflow, 0xFF94A3B8);
        }

        int[] itemIds = {R.id.widget_item_1, R.id.widget_item_2, R.id.widget_item_3, R.id.widget_item_4};
        int[] titleIds = {R.id.widget_item_1_title, R.id.widget_item_2_title, R.id.widget_item_3_title, R.id.widget_item_4_title};
        int[] roomIds = {R.id.widget_item_1_room, R.id.widget_item_2_room, R.id.widget_item_3_room, R.id.widget_item_4_room};
        int[] timeIds = {R.id.widget_item_1_time, R.id.widget_item_2_time, R.id.widget_item_3_time, R.id.widget_item_4_time};

        List<ScheduleItem> todayItems = new ArrayList<>();

        if (allCoursesJson != null && !allCoursesJson.trim().isEmpty()) {
            try {
                JSONArray arr = new JSONArray(allCoursesJson);
                for (int i = 0; i < arr.length(); i++) {
                    JSONObject c = arr.optJSONObject(i);
                    if (c == null) continue;

                    JSONArray days = c.optJSONArray("days");
                    boolean matchesToday = false;
                    if (days != null) {
                        for (int d = 0; d < days.length(); d++) {
                            if (currentDayAbbrev.equalsIgnoreCase(days.optString(d))) {
                                matchesToday = true;
                                break;
                            }
                        }
                    }

                    if (matchesToday) {
                        String code = c.optString("courseCode", "Course");
                        String name = c.optString("courseName", "");
                        String displayTitle = name.isEmpty() ? code : (code + " - " + name);
                        String room = c.optString("room", "Room TBD");
                        if (!room.toLowerCase().startsWith("room")) {
                            room = "Room " + room;
                        }
                        String sTime = c.optString("startTime", "00:00");
                        String eTime = c.optString("endTime", "00:00");
                        int sMins = parseTimeToMinutes(sTime);
                        int eMins = parseTimeToMinutes(eTime);
                        boolean isOngoing = currentMinutes >= sMins && currentMinutes < eMins;
                        String formattedTime = formatTime12h(sTime) + " - " + formatTime12h(eTime);

                        todayItems.add(new ScheduleItem(displayTitle, room, formattedTime, sMins, isOngoing));
                    }
                }

                Collections.sort(todayItems, Comparator.comparingInt(a -> a.startMinutes));
            } catch (Exception ignored) {
                todayItems.clear();
            }
        }

        // Fallback to legacy today_schedule snapshot if all_courses was not available or empty
        if (todayItems.isEmpty() && todayJson != null && !todayJson.trim().isEmpty()) {
            try {
                views.setTextViewText(R.id.widget_today_day_header, legacyDayName.toUpperCase() + "'S TIMETABLE");
                JSONArray arr = new JSONArray(todayJson);
                for (int i = 0; i < arr.length(); i++) {
                    JSONObject c = arr.optJSONObject(i);
                    if (c == null) continue;
                    String title = c.optString("title", "Course");
                    String room = c.optString("room", "Room TBD");
                    String time = c.optString("time", "");
                    boolean isOngoing = c.optBoolean("isOngoing", false);
                    todayItems.add(new ScheduleItem(title, room, time, 0, isOngoing));
                }
            } catch (Exception ignored) {
            }
        }

        int count = todayItems.size();
        boolean hasClasses = count > 0;

        if (hasClasses) {
            views.setTextViewText(R.id.widget_today_count, count + (count == 1 ? " Class" : " Classes"));

            for (int i = 0; i < 4; i++) {
                if (i < count) {
                    ScheduleItem item = todayItems.get(i);
                    views.setViewVisibility(itemIds[i], View.VISIBLE);
                    views.setTextViewText(titleIds[i], item.title);
                    views.setTextViewText(roomIds[i], item.room);
                    views.setTextViewText(timeIds[i], item.time);

                    if (isLightMode) {
                        views.setInt(itemIds[i], "setBackgroundResource", item.isOngoing ? R.drawable.widget_timetable_card_active_light : R.drawable.widget_liquid_glass_light_card);
                        views.setTextColor(titleIds[i], 0xFF0F172A);
                        views.setTextColor(roomIds[i], 0xFF64748B);
                        views.setTextColor(timeIds[i], 0xFF334155);
                    } else {
                        views.setInt(itemIds[i], "setBackgroundResource", item.isOngoing ? R.drawable.widget_apple_card_active_bg : R.drawable.widget_liquid_glass_card);
                        views.setTextColor(titleIds[i], 0xFFFFFFFF);
                        views.setTextColor(roomIds[i], 0xFF94A3B8);
                        views.setTextColor(timeIds[i], 0xFFE2E8F0);
                    }
                } else {
                    views.setViewVisibility(itemIds[i], View.GONE);
                }
            }

            if (count > 4) {
                int extra = count - 4;
                views.setTextViewText(R.id.widget_today_overflow, "+" + extra + (extra == 1 ? " more class · Tap to view schedule" : " more classes · Tap to view schedule"));
                views.setViewVisibility(R.id.widget_today_overflow, View.VISIBLE);
            } else {
                views.setViewVisibility(R.id.widget_today_overflow, View.GONE);
            }

            views.setViewVisibility(R.id.widget_today_list_container, View.VISIBLE);
            views.setViewVisibility(R.id.widget_today_empty, View.GONE);
        } else {
            views.setTextViewText(R.id.widget_today_count, "Free Day");
            views.setViewVisibility(R.id.widget_today_list_container, View.GONE);
            views.setViewVisibility(R.id.widget_today_overflow, View.GONE);
            views.setViewVisibility(R.id.widget_today_empty, View.VISIBLE);
        }

        // Tap to open app
        Intent intent = new Intent(context, MainActivity.class);
        intent.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TASK);
        PendingIntent pendingIntent = PendingIntent.getActivity(
                context, 0, intent, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
        );
        views.setOnClickPendingIntent(R.id.widget_today_root, pendingIntent);

        appWidgetManager.updateAppWidget(appWidgetId, views);
    }

    private static class ScheduleItem {
        String title;
        String room;
        String time;
        int startMinutes;
        boolean isOngoing;

        ScheduleItem(String title, String room, String time, int startMinutes, boolean isOngoing) {
            this.title = title;
            this.room = room;
            this.time = time;
            this.startMinutes = startMinutes;
            this.isOngoing = isOngoing;
        }
    }

    private static String getDayAbbrev(int calendarDayOfWeek) {
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

    private static String getDayFullName(int calendarDayOfWeek) {
        switch (calendarDayOfWeek) {
            case Calendar.SUNDAY: return "Sunday";
            case Calendar.MONDAY: return "Monday";
            case Calendar.TUESDAY: return "Tuesday";
            case Calendar.WEDNESDAY: return "Wednesday";
            case Calendar.THURSDAY: return "Thursday";
            case Calendar.FRIDAY: return "Friday";
            case Calendar.SATURDAY: return "Saturday";
            default: return "Today";
        }
    }

    private static int parseTimeToMinutes(String timeStr) {
        if (timeStr == null || !timeStr.contains(":")) return 0;
        try {
            String[] parts = timeStr.trim().split(":");
            int h = Integer.parseInt(parts[0]);
            int m = Integer.parseInt(parts[1]);
            return h * 60 + m;
        } catch (Exception e) {
            return 0;
        }
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

    private static int getThemePrimaryColor(String themeId, boolean isLightMode) {
        if (themeId == null) themeId = "bluebook";
        switch (themeId.toLowerCase()) {
            case "bini":
                return isLightMode ? 0xFFDB2777 : 0xFFF472B6;
            case "crimson":
                return isLightMode ? 0xFFDC2626 : 0xFFFB7185;
            case "ube":
                return isLightMode ? 0xFF7C3AED : 0xFFC084FC;
            case "coffee":
                return isLightMode ? 0xFFD97706 : 0xFFFBBF24;
            case "matcha":
                return isLightMode ? 0xFF16A34A : 0xFF34D399;
            case "duos":
            case "dual-tone":
                return isLightMode ? 0xFF6366F1 : 0xFFA855F7;
            case "highlighter":
            case "rainbow":
                return isLightMode ? 0xFFEC4899 : 0xFFFB7185;
            case "obsidian":
            case "monochrome":
                return isLightMode ? 0xFF334155 : 0xFFCBD5E1;
            case "bluebook":
            case "blue-cascade":
            default:
                return isLightMode ? 0xFF2563EB : 0xFF38BDF8;
        }
    }
}
