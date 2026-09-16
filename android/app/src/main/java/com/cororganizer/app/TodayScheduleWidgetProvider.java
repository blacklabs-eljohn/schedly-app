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

public class TodayScheduleWidgetProvider extends AppWidgetProvider {

    @Override
    public void onUpdate(Context context, AppWidgetManager appWidgetManager, int[] appWidgetIds) {
        for (int appWidgetId : appWidgetIds) {
            updateAppWidget(context, appWidgetManager, appWidgetId);
        }
    }

    public static void updateAppWidget(Context context, AppWidgetManager appWidgetManager, int appWidgetId) {
        SharedPreferences prefs = context.getSharedPreferences("SchedlyWidgetPrefs", Context.MODE_PRIVATE);
        String todayJson = prefs.getString("today_schedule", null);
        String dayName = prefs.getString("today_day_name", "TODAY");
        String themeMode = prefs.getString("theme_mode", "light");
        String colorTheme = prefs.getString("color_theme", "bluebook");

        boolean isLightMode = !"dark".equalsIgnoreCase(themeMode);
        int themeColor = getThemePrimaryColor(colorTheme, isLightMode);

        RemoteViews views = new RemoteViews(context.getPackageName(), R.layout.today_schedule_widget_layout);
        views.setTextViewText(R.id.widget_today_day_header, dayName.toUpperCase() + "'S TIMETABLE");

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

        boolean hasClasses = false;

        if (todayJson != null) {
            try {
                JSONArray arr = new JSONArray(todayJson);
                int count = arr.length();
                views.setTextViewText(R.id.widget_today_count, count + (count == 1 ? " Class" : " Classes"));

                for (int i = 0; i < 4; i++) {
                    if (i < count) {
                        JSONObject c = arr.getJSONObject(i);
                        boolean isOngoing = c.optBoolean("isOngoing", false);
                        views.setViewVisibility(itemIds[i], View.VISIBLE);
                        views.setTextViewText(titleIds[i], c.optString("title", "Course"));
                        views.setTextViewText(roomIds[i], c.optString("room", "Room TBD"));
                        views.setTextViewText(timeIds[i], c.optString("time", ""));

                        if (isLightMode) {
                            views.setInt(itemIds[i], "setBackgroundResource", isOngoing ? R.drawable.widget_timetable_card_active_light : R.drawable.widget_liquid_glass_light_card);
                            views.setTextColor(titleIds[i], 0xFF0F172A);
                            views.setTextColor(roomIds[i], 0xFF64748B);
                            views.setTextColor(timeIds[i], 0xFF334155);
                        } else {
                            views.setInt(itemIds[i], "setBackgroundResource", isOngoing ? R.drawable.widget_apple_card_active_bg : R.drawable.widget_liquid_glass_card);
                            views.setTextColor(titleIds[i], 0xFFFFFFFF);
                            views.setTextColor(roomIds[i], 0xFF94A3B8);
                            views.setTextColor(timeIds[i], 0xFFE2E8F0);
                        }
                        hasClasses = true;
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
            } catch (Exception e) {
                hasClasses = false;
            }
        }

        if (!hasClasses) {
            views.setTextViewText(R.id.widget_today_count, "Free Day");
            views.setViewVisibility(R.id.widget_today_list_container, View.GONE);
            views.setViewVisibility(R.id.widget_today_overflow, View.GONE);
            views.setViewVisibility(R.id.widget_today_empty, View.VISIBLE);
        } else {
            views.setViewVisibility(R.id.widget_today_list_container, View.VISIBLE);
            views.setViewVisibility(R.id.widget_today_empty, View.GONE);
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

    private static int getThemePrimaryColor(String themeId, boolean isLightMode) {
        if (themeId == null) themeId = "bluebook";
        switch (themeId.toLowerCase()) {
            case "bini":
                return isLightMode ? 0xFFDB2777 : 0xFFF472B6; // Pink / Bubblegum
            case "crimson":
                return isLightMode ? 0xFFDC2626 : 0xFFFB7185; // Bold Red / Ruby
            case "ube":
                return isLightMode ? 0xFF7C3AED : 0xFFC084FC; // Purple
            case "coffee":
                return isLightMode ? 0xFFD97706 : 0xFFFBBF24; // Amber Caramel
            case "matcha":
                return isLightMode ? 0xFF16A34A : 0xFF34D399; // Mint Emerald
            case "duos":
            case "dual-tone":
                return isLightMode ? 0xFF6366F1 : 0xFFA855F7; // Indigo Violet
            case "highlighter":
            case "rainbow":
                return isLightMode ? 0xFFEC4899 : 0xFFFB7185; // Vibrant Pink
            case "obsidian":
            case "monochrome":
                return isLightMode ? 0xFF334155 : 0xFFCBD5E1; // Sleek Titanium
            case "bluebook":
            case "blue-cascade":
            default:
                return isLightMode ? 0xFF2563EB : 0xFF38BDF8; // Sapphire Blue
        }
    }
}
