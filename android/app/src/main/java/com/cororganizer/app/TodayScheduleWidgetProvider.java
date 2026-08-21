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

        RemoteViews views = new RemoteViews(context.getPackageName(), R.layout.today_schedule_widget_layout);
        views.setTextViewText(R.id.widget_today_day_header, dayName.toUpperCase() + "'S SCHEDULE");

        int[] itemIds = {R.id.widget_item_1, R.id.widget_item_2, R.id.widget_item_3};
        int[] titleIds = {R.id.widget_item_1_title, R.id.widget_item_2_title, R.id.widget_item_3_title};
        int[] roomIds = {R.id.widget_item_1_room, R.id.widget_item_2_room, R.id.widget_item_3_room};
        int[] timeIds = {R.id.widget_item_1_time, R.id.widget_item_2_time, R.id.widget_item_3_time};

        boolean hasClasses = false;

        if (todayJson != null) {
            try {
                JSONArray arr = new JSONArray(todayJson);
                int count = arr.length();
                views.setTextViewText(R.id.widget_today_count, count + (count == 1 ? " Class" : " Classes"));

                for (int i = 0; i < 3; i++) {
                    if (i < count) {
                        JSONObject c = arr.getJSONObject(i);
                        views.setViewVisibility(itemIds[i], View.VISIBLE);
                        views.setTextViewText(titleIds[i], c.optString("title", "Course"));
                        views.setTextViewText(roomIds[i], c.optString("room", "Room TBD"));
                        views.setTextViewText(timeIds[i], c.optString("time", ""));
                        hasClasses = true;
                    } else {
                        views.setViewVisibility(itemIds[i], View.GONE);
                    }
                }
            } catch (Exception e) {
                hasClasses = false;
            }
        }

        if (!hasClasses) {
            views.setTextViewText(R.id.widget_today_count, "0 Classes");
            views.setViewVisibility(R.id.widget_item_1, View.GONE);
            views.setViewVisibility(R.id.widget_item_2, View.GONE);
            views.setViewVisibility(R.id.widget_item_3, View.GONE);
            views.setViewVisibility(R.id.widget_today_empty, View.VISIBLE);
        } else {
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
}
