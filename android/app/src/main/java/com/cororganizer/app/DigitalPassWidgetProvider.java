package com.cororganizer.app;

import android.app.PendingIntent;
import android.appwidget.AppWidgetManager;
import android.appwidget.AppWidgetProvider;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.graphics.Bitmap;
import android.graphics.BitmapFactory;
import android.graphics.Canvas;
import android.graphics.Paint;
import android.graphics.PorterDuff;
import android.graphics.PorterDuffXfermode;
import android.graphics.Rect;
import android.graphics.RectF;
import android.net.Uri;
import android.util.Base64;
import android.widget.RemoteViews;

import org.json.JSONObject;

import java.io.File;
import java.io.InputStream;

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

        String school = "NEMSU";
        String name = "Vanessa Cacabelos";
        String program = "BS TOURISM MANAGEMENT";
        String yearLevel = "3RD YEAR";
        String section = "TM-3B";
        String academicYear = "2026–2027";
        String studentId = "2026-10492";
        String profilePhotoData = null;
        String themeId = "bluebook";

        if (profileJson != null) {
            try {
                JSONObject obj = new JSONObject(profileJson);
                school = obj.optString("schoolName", school);
                name = obj.optString("fullName", name);
                program = obj.optString("program", program);
                yearLevel = obj.optString("yearLevel", yearLevel);
                section = obj.optString("section", section);
                academicYear = obj.optString("academicYear", academicYear);
                studentId = obj.optString("studentId", studentId);
                profilePhotoData = obj.optString("profilePhoto", null);
                themeId = obj.optString("themeId", "bluebook");
            } catch (Exception e) {
                // Fallback
            }
        }

        // 1. Dynamic Theme Background
        int bgDrawableId = getThemeBackground(themeId);
        views.setInt(R.id.widget_pass_root, "setBackgroundResource", bgDrawableId);

        // 2. Text fields
        views.setTextViewText(R.id.widget_pass_school, school.toUpperCase());
        views.setTextViewText(R.id.widget_pass_name, name);
        views.setTextViewText(R.id.widget_pass_program, program.toUpperCase());
        views.setTextViewText(R.id.widget_pass_year_level, yearLevel.toUpperCase());
        views.setTextViewText(R.id.widget_pass_section, section.toUpperCase());
        views.setTextViewText(R.id.widget_pass_academic_year, academicYear);
        views.setTextViewText(R.id.widget_pass_id_number, studentId);

        // 3. Robust Photo Loader (Internal File -> Parsed Data -> Initials Avatar)
        Bitmap photoBitmap = loadProfileBitmap(context, profilePhotoData, name, themeId);
        if (photoBitmap != null) {
            Bitmap roundedPhoto = getRoundedCornerBitmap(photoBitmap, 28);
            views.setImageViewBitmap(R.id.widget_pass_avatar, roundedPhoto);
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

    private static int getThemeBackground(String themeId) {
        if (themeId == null) return R.drawable.widget_id_bg_bluebook;
        switch (themeId.toLowerCase()) {
            case "crimson":
                return R.drawable.widget_id_bg_crimson;
            case "bini":
                return R.drawable.widget_id_bg_bini;
            case "ube":
                return R.drawable.widget_id_bg_ube;
            case "coffee":
                return R.drawable.widget_id_bg_coffee;
            case "matcha":
                return R.drawable.widget_id_bg_matcha;
            case "duos":
            case "dual-tone":
                return R.drawable.widget_id_bg_duos;
            case "obsidian":
            case "monochrome":
                return R.drawable.widget_id_bg_obsidian;
            case "bluebook":
            case "blue-cascade":
            default:
                return R.drawable.widget_id_bg_bluebook;
        }
    }

    private static Bitmap loadProfileBitmap(Context context, String photoData, String name, String themeId) {
        // Step 1: Check internal cached avatar file from WidgetBridgePlugin
        try {
            File avatarFile = new File(context.getFilesDir(), "widget_avatar.png");
            if (avatarFile.exists() && avatarFile.length() > 0) {
                Bitmap bm = BitmapFactory.decodeFile(avatarFile.getAbsolutePath());
                if (bm != null) {
                    return bm;
                }
            }
        } catch (Exception ignored) {
        }

        // Step 2: Try direct photoData decoding
        if (photoData != null && !photoData.trim().isEmpty() && !photoData.startsWith("data:image/svg")) {
            try {
                // Case A: Base64 String
                if (photoData.startsWith("data:image") || (!photoData.startsWith("/") && !photoData.startsWith("file:") && !photoData.startsWith("content:") && photoData.length() > 100)) {
                    String cleanBase64 = photoData;
                    if (cleanBase64.contains(",")) {
                        cleanBase64 = cleanBase64.substring(cleanBase64.indexOf(",") + 1);
                    }
                    byte[] decodedBytes = Base64.decode(cleanBase64, Base64.DEFAULT);
                    Bitmap bm = BitmapFactory.decodeByteArray(decodedBytes, 0, decodedBytes.length);
                    if (bm != null) return bm;
                }

                // Case B: Content URI
                if (photoData.startsWith("content://")) {
                    Uri uri = Uri.parse(photoData);
                    try (InputStream inputStream = context.getContentResolver().openInputStream(uri)) {
                        Bitmap bm = BitmapFactory.decodeStream(inputStream);
                        if (bm != null) return bm;
                    }
                }

                // Case C: File Path
                String filePath = photoData;
                if (filePath.startsWith("file://")) {
                    filePath = filePath.substring(7);
                }
                if (filePath.startsWith("capacitor://localhost/_capacitor_file_")) {
                    filePath = filePath.replace("capacitor://localhost/_capacitor_file_", "");
                }

                File file = new File(filePath);
                if (file.exists()) {
                    Bitmap bm = BitmapFactory.decodeFile(file.getAbsolutePath());
                    if (bm != null) return bm;
                }
            } catch (Exception ignored) {
            }
        }

        // Step 3: High-DPI Initial Avatar Fallback
        return generateInitialsAvatar(name, themeId);
    }

    private static Bitmap generateInitialsAvatar(String name, String themeId) {
        try {
            int size = 180;
            Bitmap bitmap = Bitmap.createBitmap(size, size, Bitmap.Config.ARGB_8888);
            Canvas canvas = new Canvas(bitmap);

            int startColor = 0xFF2563EB;
            int endColor = 0xFF1D4ED8;
            if (themeId != null) {
                switch (themeId.toLowerCase()) {
                    case "crimson":
                        startColor = 0xFFE11D48; endColor = 0xFF9F1239; break;
                    case "bini":
                        startColor = 0xFFDB2777; endColor = 0xFFBE185D; break;
                    case "ube":
                        startColor = 0xFF9333EA; endColor = 0xFF6B21A8; break;
                    case "coffee":
                        startColor = 0xFFD97706; endColor = 0xFF92400E; break;
                    case "matcha":
                        startColor = 0xFF10B981; endColor = 0xFF047857; break;
                    case "duos":
                    case "dual-tone":
                        startColor = 0xFF6366F1; endColor = 0xFF4338CA; break;
                    case "obsidian":
                    case "monochrome":
                        startColor = 0xFF475569; endColor = 0xFF1E293B; break;
                    default:
                        startColor = 0xFF2563EB; endColor = 0xFF1D4ED8; break;
                }
            }

            Paint paint = new Paint(Paint.ANTI_ALIAS_FLAG);
            android.graphics.LinearGradient gradient = new android.graphics.LinearGradient(
                    0, 0, size, size, startColor, endColor, android.graphics.Shader.TileMode.CLAMP
            );
            paint.setShader(gradient);
            canvas.drawRoundRect(new RectF(0, 0, size, size), 28, 28, paint);

            // Compute student initials
            String initials = "ST";
            if (name != null && !name.trim().isEmpty()) {
                String clean = name.trim();
                if (clean.contains(",")) {
                    String[] parts = clean.split(",");
                    String last = parts[0].trim();
                    String first = parts.length > 1 ? parts[1].trim() : "";
                    initials = ("" + (first.isEmpty() ? "" : first.charAt(0)) + (last.isEmpty() ? "" : last.charAt(0))).toUpperCase();
                } else {
                    String[] parts = clean.split("\\s+");
                    if (parts.length >= 2) {
                        initials = ("" + parts[0].charAt(0) + parts[1].charAt(0)).toUpperCase();
                    } else if (parts.length == 1 && parts[0].length() > 0) {
                        initials = ("" + parts[0].charAt(0)).toUpperCase();
                    }
                }
            }

            Paint textPaint = new Paint(Paint.ANTI_ALIAS_FLAG);
            textPaint.setColor(0xFFFFFFFF);
            textPaint.setTextSize(62);
            textPaint.setTypeface(android.graphics.Typeface.create(android.graphics.Typeface.DEFAULT, android.graphics.Typeface.BOLD));
            textPaint.setTextAlign(Paint.Align.CENTER);

            Paint.FontMetrics fm = textPaint.getFontMetrics();
            float yPos = (size / 2f) - ((fm.ascent + fm.descent) / 2f);
            canvas.drawText(initials, size / 2f, yPos, textPaint);

            return bitmap;
        } catch (Exception e) {
            return null;
        }
    }

    private static Bitmap getRoundedCornerBitmap(Bitmap bitmap, int cornerRadiusPx) {
        try {
            int width = bitmap.getWidth();
            int height = bitmap.getHeight();
            Bitmap output = Bitmap.createBitmap(width, height, Bitmap.Config.ARGB_8888);
            Canvas canvas = new Canvas(output);

            final Paint paint = new Paint();
            paint.setAntiAlias(true);
            final Rect rect = new Rect(0, 0, width, height);
            final RectF rectF = new RectF(rect);

            canvas.drawRoundRect(rectF, cornerRadiusPx, cornerRadiusPx, paint);
            paint.setXfermode(new PorterDuffXfermode(PorterDuff.Mode.SRC_IN));
            canvas.drawBitmap(bitmap, rect, rect, paint);

            return output;
        } catch (Exception e) {
            return bitmap;
        }
    }
}
