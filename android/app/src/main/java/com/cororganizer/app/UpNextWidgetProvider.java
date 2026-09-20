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

import java.util.ArrayList;
import java.util.Calendar;
import java.util.Collections;
import java.util.Comparator;
import java.util.List;

public class UpNextWidgetProvider extends AppWidgetProvider {

    @Override
    public void onUpdate(Context context, AppWidgetManager appWidgetManager, int[] appWidgetIds) {
        for (int appWidgetId : appWidgetIds) {
            updateAppWidget(context, appWidgetManager, appWidgetId);
        }
    }

    public static void updateAppWidget(Context context, AppWidgetManager appWidgetManager, int appWidgetId) {
        SharedPreferences prefs = context.getSharedPreferences("SchedlyWidgetPrefs", Context.MODE_PRIVATE);
        String allCoursesJson = prefs.getString("all_courses", null);
        String upNextJson = prefs.getString("up_next_class", null);
        String themeMode = prefs.getString("theme_mode", "light");
        String colorTheme = prefs.getString("color_theme", "bluebook");

        boolean isLightMode = !"dark".equalsIgnoreCase(themeMode);
        int themeColor = getThemePrimaryColor(colorTheme, isLightMode);

        RemoteViews views = new RemoteViews(context.getPackageName(), R.layout.up_next_widget_layout);

        Calendar nowCal = Calendar.getInstance();
        int dayOfWeek = nowCal.get(Calendar.DAY_OF_WEEK);
        String currentDayAbbrev = getDayAbbrev(dayOfWeek);
        int currentMinutes = nowCal.get(Calendar.HOUR_OF_DAY) * 60 + nowCal.get(Calendar.MINUTE);

        String statusType = "NONE";
        String statusBadge = "REST DAY";
        String countdownBadge = "Free Day";
        String courseCode = "REST DAY 🌴";
        String courseTitle = "No classes scheduled today";
        String timeSpan = "Free Schedule";
        String room = "Time to Recharge ✨";
        String instructor = "Enjoy your free time";
        int progress = 100;

        String doneIcon = "🌴";
        String doneBadge = "🌴 REST DAY";
        String doneTitle = "Rest Day ✨";
        String doneSub = "No classes scheduled today. Relax and recharge!";
        String doneFooter = "✨ Enjoy your free time!";

        boolean calculatedFromRaw = false;

        if (allCoursesJson != null && !allCoursesJson.trim().isEmpty()) {
            try {
                JSONArray arr = new JSONArray(allCoursesJson);
                List<CourseModel> todayCourses = new ArrayList<>();

                for (int i = 0; i < arr.length(); i++) {
                    JSONObject c = arr.optJSONObject(i);
                    if (c == null) continue;

                    JSONArray days = c.optJSONArray("days");
                    boolean matchesToday = false;
                    if (days != null) {
                        for (int d = 0; d < days.length(); d++) {
                            if (currentDayAbbrev.equalsIgnoreCase(days.optString(d))) {
                                matchesToday = true;
                                break;
                            }
                        }
                    }

                    if (matchesToday) {
                        String code = c.optString("courseCode", "CLASS");
                        String name = c.optString("courseName", "Lecture Session");
                        String r = c.optString("room", "Room TBD");
                        if (!r.toLowerCase().startsWith("room")) {
                            r = "Room " + r;
                        }
                        String inst = c.optString("instructor", "Instructor TBD");
                        if (!inst.toLowerCase().startsWith("prof.") && !inst.toLowerCase().startsWith("instructor")) {
                            inst = "Prof. " + inst;
                        }
                        String sTime = c.optString("startTime", "00:00");
                        String eTime = c.optString("endTime", "00:00");
                        int sMins = parseTimeToMinutes(sTime);
                        int eMins = parseTimeToMinutes(eTime);

                        todayCourses.add(new CourseModel(code, name, r, inst, sTime, eTime, sMins, eMins));
                    }
                }

                Collections.sort(todayCourses, Comparator.comparingInt(a -> a.startMins));

                if (todayCourses.isEmpty()) {
                    // Rest Day
                    statusType = "NONE";
                    doneIcon = "🌴";
                    doneBadge = "🌴 REST DAY";
                    doneTitle = "Rest Day ✨";
                    doneSub = "No classes scheduled today. Relax and recharge!";
                    doneFooter = "✨ Enjoy your free time!";
                    calculatedFromRaw = true;
                } else {
                    CourseModel ongoingCourse = null;
                    CourseModel nextCourse = null;

                    for (CourseModel c : todayCourses) {
                        if (currentMinutes >= c.startMins && currentMinutes < c.endMins) {
                            ongoingCourse = c;
                            break;
                        } else if (currentMinutes < c.startMins) {
                            if (nextCourse == null || c.startMins < nextCourse.startMins) {
                                nextCourse = c;
                            }
                        }
                    }

                    if (ongoingCourse != null) {
                        statusType = "CURRENT";
                        statusBadge = "IN PROGRESS";
                        int duration = Math.max(1, ongoingCourse.endMins - ongoingCourse.startMins);
                        int elapsed = Math.max(0, currentMinutes - ongoingCourse.startMins);
                        progress = Math.min(100, Math.max(0, (elapsed * 100) / duration));
                        int remaining = Math.max(0, ongoingCourse.endMins - currentMinutes);
                        countdownBadge = "Ends in " + formatMinutesHuman(remaining);
                        courseCode = ongoingCourse.courseCode;
                        courseTitle = ongoingCourse.courseName;
                        timeSpan = formatTime12h(ongoingCourse.startTime) + " – " + formatTime12h(ongoingCourse.endTime);
                        room = ongoingCourse.room;
                        instructor = ongoingCourse.instructor;
                        calculatedFromRaw = true;
                    } else if (nextCourse != null) {
                        statusType = "NEXT";
                        statusBadge = "UP NEXT";
                        int until = Math.max(0, nextCourse.startMins - currentMinutes);
                        countdownBadge = until > 0 ? ("Starts in " + formatMinutesHuman(until)) : ("Starts " + formatTime12h(nextCourse.startTime));
                        courseCode = nextCourse.courseCode;
                        courseTitle = nextCourse.courseName;
                        timeSpan = formatTime12h(nextCourse.startTime) + " – " + formatTime12h(nextCourse.endTime);
                        room = nextCourse.room;
                        instructor = nextCourse.instructor;
                        progress = 15;
                        calculatedFromRaw = true;
                    } else {
                        // All classes today have ended
                        statusType = "NONE";
                        doneIcon = "🎉";
                        doneBadge = "🎉 ALL DONE";
                        doneTitle = "All Done for Today!";
                        doneSub = "All classes completed. Great job today!";
                        doneFooter = "✨ See you in class tomorrow!";
                        calculatedFromRaw = true;
                    }
                }
            } catch (Exception ignored) {
                calculatedFromRaw = false;
            }
        }

        // Fallback to pre-baked snapshot if raw calculation didn't succeed
        if (!calculatedFromRaw && upNextJson != null) {
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

    private static class CourseModel {
        String courseCode;
        String courseName;
        String room;
        String instructor;
        String startTime;
        String endTime;
        int startMins;
        int endMins;

        CourseModel(String courseCode, String courseName, String room, String instructor, String startTime, String endTime, int startMins, int endMins) {
            this.courseCode = courseCode;
            this.courseName = courseName;
            this.room = room;
            this.instructor = instructor;
            this.startTime = startTime;
            this.endTime = endTime;
            this.startMins = startMins;
            this.endMins = endMins;
        }
    }

    private static String getDayAbbrev(int calendarDayOfWeek) {
        switch (calendarDayOfWeek) {
            case Calendar.SUNDAY: return "Sun";
            case Calendar.MONDAY: return "Mon";
            case Calendar.TUESDAY: return "Tue";
            case Calendar.WEDNESDAY: return "Wed";
            case Calendar.THURSDAY: return "Thu";
            case Calendar.FRIDAY: return "Fri";
            case Calendar.SATURDAY: return "Sat";
            default: return "Mon";
        }
    }

    private static int parseTimeToMinutes(String timeStr) {
        if (timeStr == null || !timeStr.contains(":")) return 0;
        try {
            String[] parts = timeStr.trim().split(":");
            int h = Integer.parseInt(parts[0]);
            int m = Integer.parseInt(parts[1]);
            return h * 60 + m;
        } catch (Exception e) {
            return 0;
        }
    }

    private static String formatMinutesHuman(int mins) {
        if (mins <= 0) return "NOW";
        int hours = mins / 60;
        int rem = mins % 60;
        if (hours > 0 && rem > 0) {
            return hours + "h " + rem + "m";
        }
        if (hours > 0) {
            return hours + "h";
        }
        return rem + "m";
    }

    private static String formatTime12h(String timeStr) {
        if (timeStr == null || !timeStr.contains(":")) return "";
        try {
            String[] parts = timeStr.trim().split(":");
            int h = Integer.parseInt(parts[0]);
            int m = Integer.parseInt(parts[1]);
            String ampm = h >= 12 ? "PM" : "AM";
            int displayH = h % 12 == 0 ? 12 : h % 12;
            return displayH + ":" + (m < 10 ? "0" + m : m) + " " + ampm;
        } catch (Exception e) {
            return timeStr;
        }
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
