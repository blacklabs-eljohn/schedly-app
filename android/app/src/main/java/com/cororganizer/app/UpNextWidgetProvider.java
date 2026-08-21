package com.cororganizer.app;

import android.app.PendingIntent;
import android.appwidget.AppWidgetManager;
import android.appwidget.AppWidgetProvider;
import android.content.ComponentName;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
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

        RemoteViews views = new RemoteViews(context.getPackageName(), R.layout.up_next_widget_layout);

        if (upNextJson != null) {
            try {
                JSONObject obj = new JSONObject(upNextJson);
                String title = obj.optString("title", "No Upcoming Class");
                String details = obj.optString("details", "Enjoy your break!");
                String time = obj.optString("time", "");
                String countdown = obj.optString("countdown", "Up Next");

                views.setTextViewText(R.id.widget_up_next_title, title);
                views.setTextViewText(R.id.widget_up_next_details, details);
                views.setTextViewText(R.id.widget_up_next_time, time);
                views.setTextViewText(R.id.widget_up_next_countdown, countdown);
            } catch (Exception e) {
                views.setTextViewText(R.id.widget_up_next_title, "No Upcoming Class");
                views.setTextViewText(R.id.widget_up_next_details, "Enjoy your day!");
                views.setTextViewText(R.id.widget_up_next_time, "");
                views.setTextViewText(R.id.widget_up_next_countdown, "Free");
            }
        } else {
            views.setTextViewText(R.id.widget_up_next_title, "Schedly");
            views.setTextViewText(R.id.widget_up_next_details, "Open app to view schedule");
            views.setTextViewText(R.id.widget_up_next_time, "");
            views.setTextViewText(R.id.widget_up_next_countdown, "Open");
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
}
