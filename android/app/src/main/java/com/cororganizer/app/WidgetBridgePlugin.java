package com.cororganizer.app;

import android.appwidget.AppWidgetManager;
import android.content.ComponentName;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;

import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

@CapacitorPlugin(name = "WidgetBridge")
public class WidgetBridgePlugin extends Plugin {

    @PluginMethod
    public void updateWidgets(PluginCall call) {
        Context context = getContext();
        SharedPreferences prefs = context.getSharedPreferences("SchedlyWidgetPrefs", Context.MODE_PRIVATE);
        SharedPreferences.Editor editor = prefs.edit();

        String upNext = call.getString("upNext");
        String todaySchedule = call.getString("todaySchedule");
        String dayName = call.getString("dayName", "Today");
        String profile = call.getString("profile");

        if (upNext != null) {
            editor.putString("up_next_class", upNext);
        }
        if (todaySchedule != null) {
            editor.putString("today_schedule", todaySchedule);
            editor.putString("today_day_name", dayName);
        }
        if (profile != null) {
            editor.putString("student_profile", profile);
        }

        editor.apply();

        // Broadcast to trigger instant widget refresh
        AppWidgetManager appWidgetManager = AppWidgetManager.getInstance(context);

        // 1. Up Next
        int[] upNextIds = appWidgetManager.getAppWidgetIds(new ComponentName(context, UpNextWidgetProvider.class));
        if (upNextIds != null && upNextIds.length > 0) {
            Intent intent = new Intent(context, UpNextWidgetProvider.class);
            intent.setAction(AppWidgetManager.ACTION_APPWIDGET_UPDATE);
            intent.putExtra(AppWidgetManager.EXTRA_APPWIDGET_IDS, upNextIds);
            context.sendBroadcast(intent);
        }

        // 2. Today Schedule
        int[] todayIds = appWidgetManager.getAppWidgetIds(new ComponentName(context, TodayScheduleWidgetProvider.class));
        if (todayIds != null && todayIds.length > 0) {
            Intent intent = new Intent(context, TodayScheduleWidgetProvider.class);
            intent.setAction(AppWidgetManager.ACTION_APPWIDGET_UPDATE);
            intent.putExtra(AppWidgetManager.EXTRA_APPWIDGET_IDS, todayIds);
            context.sendBroadcast(intent);
        }

        // 3. Digital Pass
        int[] passIds = appWidgetManager.getAppWidgetIds(new ComponentName(context, DigitalPassWidgetProvider.class));
        if (passIds != null && passIds.length > 0) {
            Intent intent = new Intent(context, DigitalPassWidgetProvider.class);
            intent.setAction(AppWidgetManager.ACTION_APPWIDGET_UPDATE);
            intent.putExtra(AppWidgetManager.EXTRA_APPWIDGET_IDS, passIds);
            context.sendBroadcast(intent);
        }

        call.resolve();
    }
}
