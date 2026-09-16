package com.cororganizer.app;

import android.appwidget.AppWidgetManager;
import android.content.ComponentName;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.graphics.Bitmap;
import android.graphics.BitmapFactory;
import android.net.Uri;
import android.util.Base64;

import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

import org.json.JSONObject;

import java.io.File;
import java.io.FileOutputStream;
import java.io.InputStream;
import java.net.HttpURLConnection;
import java.net.URL;

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
        String calendarEvents = call.getString("calendarEvents");
        String reminders = call.getString("reminders");
        String themeMode = call.getString("themeMode", "light");
        String colorTheme = call.getString("colorTheme", "bluebook");

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
        if (calendarEvents != null) {
            editor.putString("calendar_events", calendarEvents);
        }
        if (reminders != null) {
            editor.putString("academic_reminders", reminders);
        }
        editor.putString("theme_mode", themeMode);
        editor.putString("color_theme", colorTheme);
        editor.apply();

        // Process profile avatar asynchronously and trigger widget updates
        new Thread(() -> {
            try {
                if (profile != null) {
                    JSONObject obj = new JSONObject(profile);
                    String photoData = obj.optString("profilePhoto", null);
                    if (photoData != null && !photoData.trim().isEmpty()) {
                        saveAvatarToInternalStorage(context, photoData);
                    }
                }
            } catch (Exception ignored) {
            }

            // Broadcast to trigger instant widget refresh
            triggerAllWidgetsUpdate(context);
        }).start();

        call.resolve();
    }

    private void saveAvatarToInternalStorage(Context context, String photoData) {
        if (photoData == null || photoData.trim().isEmpty() || photoData.startsWith("data:image/svg")) {
            return;
        }

        try {
            File targetFile = new File(context.getFilesDir(), "widget_avatar.png");
            Bitmap bitmap = null;

            if (photoData.startsWith("http://") || photoData.startsWith("https://")) {
                URL url = new URL(photoData);
                HttpURLConnection connection = (HttpURLConnection) url.openConnection();
                connection.setDoInput(true);
                connection.setInstanceFollowRedirects(true);
                connection.setRequestProperty("User-Agent", "Mozilla/5.0 (Android; Mobile) Schedly/1.0");
                connection.setConnectTimeout(10000);
                connection.setReadTimeout(10000);
                connection.connect();
                try (InputStream input = connection.getInputStream()) {
                    bitmap = BitmapFactory.decodeStream(input);
                }
            } else if (photoData.startsWith("data:image") || (!photoData.startsWith("/") && !photoData.startsWith("file:") && !photoData.startsWith("content:") && photoData.length() > 100)) {
                String cleanBase64 = photoData;
                if (cleanBase64.contains(",")) {
                    cleanBase64 = cleanBase64.substring(cleanBase64.indexOf(",") + 1);
                }
                byte[] decodedBytes = Base64.decode(cleanBase64, Base64.DEFAULT);
                bitmap = BitmapFactory.decodeByteArray(decodedBytes, 0, decodedBytes.length);
            } else if (photoData.startsWith("content://")) {
                Uri uri = Uri.parse(photoData);
                try (InputStream input = context.getContentResolver().openInputStream(uri)) {
                    bitmap = BitmapFactory.decodeStream(input);
                }
            } else {
                String filePath = photoData;
                if (filePath.startsWith("file://")) {
                    filePath = filePath.substring(7);
                }
                if (filePath.startsWith("capacitor://localhost/_capacitor_file_")) {
                    filePath = filePath.replace("capacitor://localhost/_capacitor_file_", "");
                }
                File srcFile = new File(filePath);
                if (srcFile.exists()) {
                    bitmap = BitmapFactory.decodeFile(srcFile.getAbsolutePath());
                }
            }

            if (bitmap != null) {
                // Resize if needed to prevent memory pressure while keeping high DPI
                int maxDim = 512;
                if (bitmap.getWidth() > maxDim || bitmap.getHeight() > maxDim) {
                    float ratio = Math.min((float) maxDim / bitmap.getWidth(), (float) maxDim / bitmap.getHeight());
                    int targetW = Math.round(bitmap.getWidth() * ratio);
                    int targetH = Math.round(bitmap.getHeight() * ratio);
                    bitmap = Bitmap.createScaledBitmap(bitmap, targetW, targetH, true);
                }

                try (FileOutputStream out = new FileOutputStream(targetFile)) {
                    bitmap.compress(Bitmap.CompressFormat.PNG, 100, out);
                    out.flush();
                }
            }
        } catch (Exception ignored) {
        }
    }

    public static void triggerAllWidgetsUpdate(Context context) {
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

        // 4. Calendar Bento (4x2)
        int[] calBentoIds = appWidgetManager.getAppWidgetIds(new ComponentName(context, CalendarBentoWidgetProvider.class));
        if (calBentoIds != null && calBentoIds.length > 0) {
            Intent intent = new Intent(context, CalendarBentoWidgetProvider.class);
            intent.setAction(AppWidgetManager.ACTION_APPWIDGET_UPDATE);
            intent.putExtra(AppWidgetManager.EXTRA_APPWIDGET_IDS, calBentoIds);
            context.sendBroadcast(intent);
        }

        // 5. Calendar Square (2x2)
        int[] calSqIds = appWidgetManager.getAppWidgetIds(new ComponentName(context, CalendarSquareWidgetProvider.class));
        if (calSqIds != null && calSqIds.length > 0) {
            Intent intent = new Intent(context, CalendarSquareWidgetProvider.class);
            intent.setAction(AppWidgetManager.ACTION_APPWIDGET_UPDATE);
            intent.putExtra(AppWidgetManager.EXTRA_APPWIDGET_IDS, calSqIds);
            context.sendBroadcast(intent);
        }

        // 6. Academic Reminders (2x2)
        int[] reminderIds = appWidgetManager.getAppWidgetIds(new ComponentName(context, RemindersWidgetProvider.class));
        if (reminderIds != null && reminderIds.length > 0) {
            Intent intent = new Intent(context, RemindersWidgetProvider.class);
            intent.setAction(AppWidgetManager.ACTION_APPWIDGET_UPDATE);
            intent.putExtra(AppWidgetManager.EXTRA_APPWIDGET_IDS, reminderIds);
            context.sendBroadcast(intent);
        }
    }
}
