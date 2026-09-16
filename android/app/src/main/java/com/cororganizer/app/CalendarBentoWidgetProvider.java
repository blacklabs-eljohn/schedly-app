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

public class CalendarBentoWidgetProvider extends AppWidgetProvider {

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
        int dateCardBg = getThemeDateTileBackground(colorTheme);

        RemoteViews views = new RemoteViews(context.getPackageName(), R.layout.calendar_bento_widget_layout);

        String month = "SEPTEMBER";
        String dayNum = "14";
        String dayName = "Monday";
        String totalDue = "0 Due";
        boolean hasUpcoming = false;

        if (calendarJson != null) {
            try {
                JSONObject obj = new JSONObject(calendarJson);
                month = obj.optString("monthName", month).toUpperCase();
                dayNum = obj.optString("dayOfMonth", dayNum);
                dayName = obj.optString("dayOfWeek", dayName);
                int count = obj.optInt("totalDue", 0);
                totalDue = obj.optString("badgeText", count > 0 ? (count + " Upcoming") : "0 Due");

                JSONArray upcoming = obj.optJSONArray("upcomingList");
                int[] itemIds = {R.id.widget_bento_event_1, R.id.widget_bento_event_2, R.id.widget_bento_event_3};
                int[] titleIds = {R.id.widget_bento_title_1, R.id.widget_bento_title_2, R.id.widget_bento_title_3};
                int[] timeIds = {R.id.widget_bento_time_1, R.id.widget_bento_time_2, R.id.widget_bento_time_3};
                int[] barIds = {R.id.widget_bento_bar_1, R.id.widget_bento_bar_2, R.id.widget_bento_bar_3};

                if (upcoming != null && upcoming.length() > 0) {
                    hasUpcoming = true;
                    int len = upcoming.length();
                    for (int i = 0; i < 3; i++) {
                        if (i < len) {
                            JSONObject item = upcoming.getJSONObject(i);
                            views.setViewVisibility(itemIds[i], View.VISIBLE);
                            views.setTextViewText(titleIds[i], item.optString("title", "Event"));
                            views.setTextViewText(timeIds[i], item.optString("time", ""));

                            String barColorStr = item.optString("categoryColor", "#38BDF8");
                            try {
                                views.setInt(barIds[i], "setBackgroundColor", Color.parseColor(barColorStr));
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
            } catch (Exception ignored) {
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

    private static int getThemeDateTileBackground(String themeId) {
        if (themeId == null) return R.drawable.widget_up_next_bg_bluebook;
        switch (themeId.toLowerCase()) {
            case "bini":
                return R.drawable.widget_up_next_bg_bini;
            case "crimson":
                return R.drawable.widget_up_next_bg_crimson;
            case "ube":
                return R.drawable.widget_up_next_bg_ube;
            case "coffee":
                return R.drawable.widget_up_next_bg_coffee;
            case "matcha":
                return R.drawable.widget_up_next_bg_matcha;
            case "duos":
            case "dual-tone":
                return R.drawable.widget_up_next_bg_duos;
            case "obsidian":
            case "monochrome":
                return R.drawable.widget_up_next_bg_obsidian;
            case "bluebook":
            case "blue-cascade":
            default:
                return R.drawable.widget_up_next_bg_bluebook;
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
