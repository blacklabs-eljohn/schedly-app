package com.cororganizer.app;

import android.app.PendingIntent;
import android.appwidget.AppWidgetManager;
import android.appwidget.AppWidgetProvider;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.widget.RemoteViews;

import org.json.JSONObject;

public class DigitalPassWidgetProvider extends AppWidgetProvider {

    @Override
    public void onUpdate(Context context, AppWidgetManager appWidgetManager, int[] appWidgetIds) {
        for (int appWidgetId : appWidgetIds) {
            updateAppWidget(context, appWidgetManager, appWidgetId);
        }
    }

    public static void updateAppWidget(Context context, AppWidgetManager appWidgetManager, int appWidgetId) {
        SharedPreferences prefs = context.getSharedPreferences("SchedlyWidgetPrefs", Context.MODE_PRIVATE);
        String profileJson = prefs.getString("student_profile", null);

        RemoteViews views = new RemoteViews(context.getPackageName(), R.layout.digital_pass_widget_layout);

        if (profileJson != null) {
            try {
                JSONObject obj = new JSONObject(profileJson);
                String school = obj.optString("schoolName", "NEMSU");
                String name = obj.optString("fullName", "Student Name");
                String program = obj.optString("program", "Course / Major");
                String idNumber = obj.optString("studentId", "ID: ---");
                String year = obj.optString("academicYear", "2026-2027");

                views.setTextViewText(R.id.widget_pass_school, school.toUpperCase() + " · STUDENT PASS");
                views.setTextViewText(R.id.widget_pass_name, name);
                views.setTextViewText(R.id.widget_pass_program, program);
                views.setTextViewText(R.id.widget_pass_id_number, "ID: " + idNumber);
                views.setTextViewText(R.id.widget_pass_year, "A.Y. " + year);
            } catch (Exception e) {
                // Fallback default
            }
        }

        // Tap to open app
        Intent intent = new Intent(context, MainActivity.class);
        intent.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TASK);
        PendingIntent pendingIntent = PendingIntent.getActivity(
                context, 0, intent, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
        );
        views.setOnClickPendingIntent(R.id.widget_pass_root, pendingIntent);

        appWidgetManager.updateAppWidget(appWidgetId, views);
    }
}
