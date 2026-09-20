package com.cororganizer.app;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.util.Log;

public class WidgetAlarmReceiver extends BroadcastReceiver {

    private static final String TAG = "WidgetAlarmReceiver";

    @Override
    public void onReceive(Context context, Intent intent) {
        if (context == null) return;

        String action = intent != null ? intent.getAction() : "UNKNOWN";
        Log.d(TAG, "Widget alarm received action: " + action);

        try {
            // 1. Force refresh all active home screen widgets with real-time data
            WidgetBridgePlugin.triggerAllWidgetsUpdate(context);

            // 2. Schedule the next upcoming transition / midnight trigger
            WidgetUpdateScheduler.scheduleNextUpdate(context);
        } catch (Exception e) {
            Log.w(TAG, "Error handling widget alarm update: " + e.getMessage());
        }
    }
}
