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

public class RemindersWidgetProvider extends AppWidgetProvider {

    @Override
    public void onUpdate(Context context, AppWidgetManager appWidgetManager, int[] appWidgetIds) {
        for (int appWidgetId : appWidgetIds) {
            updateAppWidget(context, appWidgetManager, appWidgetId);
        }
    }

    public static void updateAppWidget(Context context, AppWidgetManager appWidgetManager, int appWidgetId) {
        SharedPreferences prefs = context.getSharedPreferences("SchedlyWidgetPrefs", Context.MODE_PRIVATE);
        String remindersJson = prefs.getString("academic_reminders", null);
        String themeMode = prefs.getString("theme_mode", "light");
        String colorTheme = prefs.getString("color_theme", "bluebook");

        boolean isLightMode = !"dark".equalsIgnoreCase(themeMode);
        int themeColor = getThemePrimaryColor(colorTheme, isLightMode);

        RemoteViews views = new RemoteViews(context.getPackageName(), R.layout.reminders_widget_layout);

        int[] itemIds = {R.id.widget_reminder_item_1, R.id.widget_reminder_item_2, R.id.widget_reminder_item_3};
        int[] iconIds = {R.id.widget_reminder_icon_1, R.id.widget_reminder_icon_2, R.id.widget_reminder_icon_3};
        int[] titleIds = {R.id.widget_reminder_title_1, R.id.widget_reminder_title_2, R.id.widget_reminder_title_3};
        int[] subIds = {R.id.widget_reminder_sub_1, R.id.widget_reminder_sub_2, R.id.widget_reminder_sub_3};

        String progressText = "All Done";
        boolean hasTasks = false;

        if (remindersJson != null) {
            try {
                JSONObject obj = new JSONObject(remindersJson);
                progressText = obj.optString("progressText", "Tasks");

                JSONArray items = obj.optJSONArray("items");
                if (items != null && items.length() > 0) {
                    hasTasks = true;
                    int len = items.length();
                    for (int i = 0; i < 3; i++) {
                        if (i < len) {
                            JSONObject task = items.getJSONObject(i);
                            boolean isDone = task.optBoolean("isCompleted", false);
                            String title = task.optString("title", "Task");
                            String due = task.optString("dueTime", "");
                            String subject = task.optString("subjectCode", "");
                            String sub = subject.isEmpty() ? due : (due.isEmpty() ? subject : subject + " · " + due);

                            views.setViewVisibility(itemIds[i], View.VISIBLE);
                            views.setTextViewText(iconIds[i], isDone ? "✅" : "⭕");
                            views.setTextViewText(titleIds[i], title);
                            views.setTextViewText(subIds[i], sub.isEmpty() ? "Academic Task" : sub);

                            if (isLightMode) {
                                views.setInt(itemIds[i], "setBackgroundResource", R.drawable.widget_liquid_glass_light_card);
                                views.setTextColor(titleIds[i], 0xFF0F172A);
                                views.setTextColor(subIds[i], 0xFF64748B);
                            } else {
                                views.setInt(itemIds[i], "setBackgroundResource", R.drawable.widget_liquid_glass_card);
                                views.setTextColor(titleIds[i], 0xFFFFFFFF);
                                views.setTextColor(subIds[i], 0xFF94A3B8);
                            }
                        } else {
                            views.setViewVisibility(itemIds[i], View.GONE);
                        }
                    }
                }
            } catch (Exception ignored) {
            }
        }

        // Apply Light / Dark Mode & Theme colors with Liquid Glass
        if (isLightMode) {
            views.setInt(R.id.widget_reminders_root, "setBackgroundResource", R.drawable.widget_liquid_glass_light_bg);
            views.setInt(R.id.widget_reminders_progress_pill, "setBackgroundResource", R.drawable.widget_liquid_glass_pill_light);
            views.setTextColor(R.id.widget_reminders_header_title, themeColor);
            views.setTextColor(R.id.widget_reminders_progress_pill, themeColor);
            views.setTextColor(R.id.widget_reminders_empty_title, 0xFF0F172A);
            views.setTextColor(R.id.widget_reminders_empty_sub, 0xFF64748B);
        } else {
            views.setInt(R.id.widget_reminders_root, "setBackgroundResource", R.drawable.widget_liquid_glass_bg);
            views.setInt(R.id.widget_reminders_progress_pill, "setBackgroundResource", R.drawable.widget_liquid_glass_pill);
            views.setTextColor(R.id.widget_reminders_header_title, themeColor);
            views.setTextColor(R.id.widget_reminders_progress_pill, themeColor);
            views.setTextColor(R.id.widget_reminders_empty_title, 0xFFFFFFFF);
            views.setTextColor(R.id.widget_reminders_empty_sub, 0xFF94A3B8);
        }

        views.setTextViewText(R.id.widget_reminders_progress_pill, progressText);

        if (!hasTasks) {
            views.setViewVisibility(R.id.widget_reminders_list_container, View.GONE);
            views.setViewVisibility(R.id.widget_reminders_empty, View.VISIBLE);
        } else {
            views.setViewVisibility(R.id.widget_reminders_list_container, View.VISIBLE);
            views.setViewVisibility(R.id.widget_reminders_empty, View.GONE);
        }

        // Tap to open app
        Intent intent = new Intent(context, MainActivity.class);
        intent.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TASK);
        PendingIntent pendingIntent = PendingIntent.getActivity(
                context, 0, intent, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
        );
        views.setOnClickPendingIntent(R.id.widget_reminders_root, pendingIntent);

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
