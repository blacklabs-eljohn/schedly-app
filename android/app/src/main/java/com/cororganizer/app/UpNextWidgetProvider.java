package com.cororganizer.app;

import android.app.PendingIntent;
import android.appwidget.AppWidgetManager;
import android.appwidget.AppWidgetProvider;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.view.View;
import android.widget.RemoteViews;

import org.json.JSONObject;

public class UpNextWidgetProvider extends AppWidgetProvider {

    @Override
    public void onUpdate(Context context, AppWidgetManager appWidgetManager, int[] appWidgetIds) {
        for (int appWidgetId : appWidgetIds) {
            updateAppWidget(context, appWidgetManager, appWidgetId);
        }
    }

    public static void updateAppWidget(Context context, AppWidgetManager appWidgetManager, int appWidgetId) {
        SharedPreferences prefs = context.getSharedPreferences("SchedlyWidgetPrefs", Context.MODE_PRIVATE);
        String upNextJson = prefs.getString("up_next_class", null);
        String themeMode = prefs.getString("theme_mode", "light");
        String colorTheme = prefs.getString("color_theme", "bluebook");

        boolean isLightMode = !"dark".equalsIgnoreCase(themeMode);
        int themeColor = getThemePrimaryColor(colorTheme, isLightMode);

        RemoteViews views = new RemoteViews(context.getPackageName(), R.layout.up_next_widget_layout);

        String statusType = "NONE";
        String statusBadge = "IN PROGRESS";
        String countdownBadge = "Ends in 45m";
        String courseCode = "CS 112";
        String courseTitle = "Data Structures & Algorithms";
        String timeSpan = "8:30 AM – 10:00 AM";
        String room = "Room 304";
        String instructor = "Prof. M. Dela Cruz";
        int progress = 65;

        String doneIcon = "🎉";
        String doneBadge = "🎉 ALL DONE";
        String doneTitle = "All Done for Today!";
        String doneSub = "All classes completed. Enjoy your evening!";
        String doneFooter = "✨ See you in class tomorrow!";

        if (upNextJson != null) {
            try {
                JSONObject obj = new JSONObject(upNextJson);
                statusType = obj.optString("type", "NONE");

                if ("CURRENT".equals(statusType)) {
                    statusBadge = obj.optString("statusBadge", "IN PROGRESS");
                    countdownBadge = obj.optString("countdownBadge", "In Progress");
                    courseCode = obj.optString("courseCode", "CLASS");
                    courseTitle = obj.optString("courseName", obj.optString("title", "Lecture Session"));
                    timeSpan = obj.optString("timeSpan", "8:30 AM – 10:00 AM");
                    room = obj.optString("room", "Room TBD");
                    instructor = obj.optString("instructor", "Prof. TBD");
                    progress = obj.optInt("progress", 50);
                } else if ("NEXT".equals(statusType)) {
                    statusBadge = obj.optString("statusBadge", "UP NEXT");
                    countdownBadge = obj.optString("countdownBadge", "Up Next");
                    courseCode = obj.optString("courseCode", "CLASS");
                    courseTitle = obj.optString("courseName", obj.optString("title", "Upcoming Lecture"));
                    timeSpan = obj.optString("timeSpan", "8:30 AM – 10:00 AM");
                    room = obj.optString("room", "Room TBD");
                    instructor = obj.optString("instructor", "Prof. TBD");
                    progress = obj.optInt("progress", 15);
                } else {
                    // NONE: Rest Day or All Classes Completed
                    boolean isRestDay = "REST DAY".equalsIgnoreCase(obj.optString("statusBadge", ""))
                            || obj.optString("courseCode", "").contains("REST");
                    if (isRestDay) {
                        doneIcon = "🌴";
                        doneBadge = "🌴 REST DAY";
                        doneTitle = "Rest Day ✨";
                        doneSub = "No classes scheduled today. Relax and recharge!";
                        doneFooter = "✨ Enjoy your free time!";
                    } else {
                        doneIcon = "🎉";
                        doneBadge = "🎉 ALL DONE";
                        doneTitle = "All Done for Today!";
                        doneSub = "All classes completed. Great job today!";
                        doneFooter = "✨ See you in class tomorrow!";
                    }
                }
            } catch (Exception ignored) {
            }
        }

        // Apply Liquid Glass & Theme Styling
        if (isLightMode) {
            views.setInt(R.id.widget_up_next_root, "setBackgroundResource", R.drawable.widget_liquid_glass_light_bg);
            views.setInt(R.id.widget_up_next_details_card, "setBackgroundResource", R.drawable.widget_liquid_glass_light_card);
            views.setInt(R.id.widget_up_next_countdown_text, "setBackgroundResource", R.drawable.widget_liquid_glass_pill_light);
            views.setInt(R.id.widget_up_next_done_card, "setBackgroundResource", R.drawable.widget_liquid_glass_light_card);
            views.setInt(R.id.widget_up_next_done_badge, "setBackgroundResource", R.drawable.widget_liquid_glass_pill_light);
            views.setInt(R.id.widget_up_next_done_status_pill, "setBackgroundResource", R.drawable.widget_liquid_glass_pill_light);

            views.setTextColor(R.id.widget_up_next_status_text, themeColor);
            views.setTextColor(R.id.widget_up_next_countdown_text, 0xFF475569);
            views.setTextColor(R.id.widget_up_next_code, 0xFF0F172A);
            views.setTextColor(R.id.widget_up_next_title, 0xFF334155);
            views.setTextColor(R.id.widget_up_next_time, 0xFF0F172A);
            views.setTextColor(R.id.widget_up_next_room, 0xFF475569);
            views.setTextColor(R.id.widget_up_next_instructor, 0xFF64748B);
            views.setTextColor(R.id.widget_up_next_progress_label, themeColor);

            views.setTextColor(R.id.widget_up_next_done_badge, themeColor);
            views.setTextColor(R.id.widget_up_next_done_status_pill, 0xFF059669);
            views.setTextColor(R.id.widget_up_next_done_title, 0xFF0F172A);
            views.setTextColor(R.id.widget_up_next_done_sub, 0xFF475569);
            views.setTextColor(R.id.widget_up_next_done_footer, themeColor);
        } else {
            views.setInt(R.id.widget_up_next_root, "setBackgroundResource", R.drawable.widget_liquid_glass_bg);
            views.setInt(R.id.widget_up_next_details_card, "setBackgroundResource", R.drawable.widget_liquid_glass_card);
            views.setInt(R.id.widget_up_next_countdown_text, "setBackgroundResource", R.drawable.widget_liquid_glass_pill);
            views.setInt(R.id.widget_up_next_done_card, "setBackgroundResource", R.drawable.widget_liquid_glass_card);
            views.setInt(R.id.widget_up_next_done_badge, "setBackgroundResource", R.drawable.widget_liquid_glass_pill);
            views.setInt(R.id.widget_up_next_done_status_pill, "setBackgroundResource", R.drawable.widget_liquid_glass_pill);

            views.setTextColor(R.id.widget_up_next_status_text, themeColor);
            views.setTextColor(R.id.widget_up_next_countdown_text, 0xFFE2E8F0);
            views.setTextColor(R.id.widget_up_next_code, 0xFFFFFFFF);
            views.setTextColor(R.id.widget_up_next_title, 0xFFCBD5E1);
            views.setTextColor(R.id.widget_up_next_time, 0xFFFFFFFF);
            views.setTextColor(R.id.widget_up_next_room, 0xFFCBD5E1);
            views.setTextColor(R.id.widget_up_next_instructor, 0xFF94A3B8);
            views.setTextColor(R.id.widget_up_next_progress_label, themeColor);

            views.setTextColor(R.id.widget_up_next_done_badge, themeColor);
            views.setTextColor(R.id.widget_up_next_done_status_pill, 0xFF34D399);
            views.setTextColor(R.id.widget_up_next_done_title, 0xFFFFFFFF);
            views.setTextColor(R.id.widget_up_next_done_sub, 0xFFCBD5E1);
            views.setTextColor(R.id.widget_up_next_done_footer, themeColor);
        }

        if ("CURRENT".equals(statusType) || "NEXT".equals(statusType)) {
            // Show Active Class Bento Container
            views.setViewVisibility(R.id.widget_up_next_active_container, View.VISIBLE);
            views.setViewVisibility(R.id.widget_up_next_done_container, View.GONE);

            views.setTextViewText(R.id.widget_up_next_status_text, statusBadge);
            views.setTextViewText(R.id.widget_up_next_countdown_text, countdownBadge);
            views.setTextViewText(R.id.widget_up_next_code, courseCode);
            views.setTextViewText(R.id.widget_up_next_title, courseTitle);
            views.setTextViewText(R.id.widget_up_next_time, timeSpan);
            views.setTextViewText(R.id.widget_up_next_room, room);
            views.setTextViewText(R.id.widget_up_next_instructor, instructor);

            views.setProgressBar(R.id.widget_up_next_progress_bar, 100, Math.min(100, Math.max(0, progress)), false);
            views.setTextViewText(R.id.widget_up_next_progress_label, progress + "%");
        } else {
            // Show Celebration / Rest Day Container
            views.setViewVisibility(R.id.widget_up_next_active_container, View.GONE);
            views.setViewVisibility(R.id.widget_up_next_done_container, View.VISIBLE);

            views.setTextViewText(R.id.widget_up_next_done_icon, doneIcon);
            views.setTextViewText(R.id.widget_up_next_done_badge, doneBadge);
            views.setTextViewText(R.id.widget_up_next_done_title, doneTitle);
            views.setTextViewText(R.id.widget_up_next_done_sub, doneSub);
            views.setTextViewText(R.id.widget_up_next_done_footer, doneFooter);
        }

        // Tap to open app
        Intent intent = new Intent(context, MainActivity.class);
        intent.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TASK);
        PendingIntent pendingIntent = PendingIntent.getActivity(
                context, 0, intent, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
        );
        views.setOnClickPendingIntent(R.id.widget_up_next_root, pendingIntent);

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
