package com.cororganizer.app;

import android.app.PendingIntent;
import android.appwidget.AppWidgetManager;
import android.appwidget.AppWidgetProvider;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.graphics.Color;
import android.widget.RemoteViews;

import org.json.JSONObject;

public class CalendarSquareWidgetProvider extends AppWidgetProvider {

    @Override
    public void onUpdate(Context context, AppWidgetManager appWidgetManager, int[] appWidgetIds) {
        for (int appWidgetId : appWidgetIds) {
            updateAppWidget(context, appWidgetManager, appWidgetId);
        }
    }

    public static void updateAppWidget(Context context, AppWidgetManager appWidgetManager, int appWidgetId) {
        SharedPreferences prefs = context.getSharedPreferences("SchedlyWidgetPrefs", Context.MODE_PRIVATE);
        String calendarJson = prefs.getString("calendar_events", null);
        String themeMode = prefs.getString("theme_mode", "light");
        String colorTheme = prefs.getString("color_theme", "bluebook");

        boolean isLightMode = !"dark".equalsIgnoreCase(themeMode);
        int themeColor = getThemePrimaryColor(colorTheme, isLightMode);

        RemoteViews views = new RemoteViews(context.getPackageName(), R.layout.calendar_square_widget_layout);

        String dateHeader = "SEP 14 · MON";
        String dueBadge = "0 Due";
        String categoryTag = "✨ ALL CLEAR";
        String title = "No Upcoming Deadlines";
        String subject = "You are all caught up";
        String time = "Great work ✨";
        String footer = "Next tasks will appear here";
        String categoryColorStr = null;

        if (calendarJson != null) {
            try {
                JSONObject obj = new JSONObject(calendarJson);
                String monthShort = obj.optString("monthName", "SEP").substring(0, Math.min(3, obj.optString("monthName", "SEP").length())).toUpperCase();
                String dayNum = obj.optString("dayOfMonth", "14");
                String dayShort = obj.optString("dayOfWeek", "MON").substring(0, Math.min(3, obj.optString("dayOfWeek", "MON").length())).toUpperCase();
                dateHeader = monthShort + " " + dayNum + " · " + dayShort;

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
