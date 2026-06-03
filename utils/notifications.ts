// ============================================
// Notification Utility - Expo Local Notifications
// Handles all notification scheduling and permissions
// Note: Notifications work in development builds, not Expo Go
// ============================================

import { NotificationType, ReminderOption } from "@/types";
import { Platform } from "react-native";

let Notifications: any = null;

// Try to import notifications (may fail in Expo Go or Web)
try {
  if (Platform.OS !== "web") {
    // Dynamic require for conditional import
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    Notifications = require("expo-notifications");
    // Configure notification handler only if available
    if (Notifications) {
      Notifications.setNotificationHandler({
        handleNotification: async () => ({
          shouldShowAlert: true,
          shouldPlaySound: true,
          shouldSetBadge: true,
          shouldShowBanner: true,
          shouldShowList: true,
        }),
      });
    }
  }
} catch {
  console.warn(
    "expo-notifications not available in Expo Go. Use development build for notifications.",
  );
}

// ============================================
// REQUEST PERMISSIONS
// ============================================
export async function requestNotificationPermissions(): Promise<boolean> {
  // Return false if notifications not available (Expo Go) or Web
  if (!Notifications || Platform.OS === "web") {
    if (!Notifications && Platform.OS !== "web") {
      console.warn("Notifications not available");
    }
    return false;
  }

  try {
    const { status: existingStatus } =
      await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== "granted") {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== "granted") {
      console.warn("Failed to get notification permissions");
      return false;
    }

    // Android specific: Create notification channel
    if (Platform.OS === "android") {
      await Notifications.setNotificationChannelAsync("default", {
        name: "Default",
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: "#FF231F7C",
      });

      // Separate channel for birthdays / anniversaries
      await Notifications.setNotificationChannelAsync("birthdays", {
        name: "Birthdays & Anniversaries",
        importance: Notifications.AndroidImportance.HIGH,
        vibrationPattern: [0, 500, 250, 500],
        lightColor: "#F59E0B",
      });

      // Channel for upcoming events
      await Notifications.setNotificationChannelAsync("events", {
        name: "Upcoming Events",
        importance: Notifications.AndroidImportance.DEFAULT,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: "#6366F1",
      });
    }

    return true;
  } catch (error) {
    console.error("Error requesting notification permissions:", error);
    return false;
  }
}

// ============================================
// SCHEDULE NOTIFICATION (one-shot, at a specific Date)
// ============================================
export async function scheduleNotification(
  title: string,
  body: string,
  triggerDate: Date,
  type: NotificationType,
  data?: any,
): Promise<string | null> {
  if (!Notifications || Platform.OS === "web") {
    if (!Notifications && Platform.OS !== "web") {
      console.warn("Notifications not available");
    }
    return null;
  }

  try {
    const hasPermission = await requestNotificationPermissions();
    if (!hasPermission) {
      if (Platform.OS !== "web") {
        console.warn("No notification permission");
      }
      return null;
    }

    // Guard: don't schedule notifications in the past
    if (triggerDate <= new Date()) {
      if (Platform.OS !== "web") {
        console.warn(
          `[Notifications] Skipped past-date notification: "${title}" at ${triggerDate.toISOString()}`,
        );
      }
      return null;
    }

    const channelId =
      type === "birthday"
        ? "birthdays"
        : type === "event"
          ? "events"
          : "default";

    const notificationId = await Notifications.scheduleNotificationAsync({
      content: {
        title,
        body,
        data: { type, ...data },
        sound: true,
        ...(Platform.OS === "android" ? { channelId } : {}),
      },
      trigger: triggerDate as any,
    });

    if (Platform.OS !== "web") {
      console.log(
        `[Notifications] Scheduled "${title}" for ${triggerDate.toLocaleString()} → id: ${notificationId}`,
      );
    }

    return notificationId;
  } catch (error) {
    if (Platform.OS !== "web") {
      console.error("Error scheduling notification:", error);
    }
    return null;
  }
}

// ============================================
// SCHEDULE DAILY NOTIFICATION (repeating)
// ============================================
export async function scheduleDailyNotification(
  title: string,
  body: string,
  hour: number,
  minute: number,
  type: NotificationType,
  data?: any,
): Promise<string | null> {
  if (!Notifications || Platform.OS === "web") {
    if (!Notifications && Platform.OS !== "web") {
      console.warn("Notifications not available");
    }
    return null;
  }

  try {
    const hasPermission = await requestNotificationPermissions();
    if (!hasPermission) return null;

    const notificationId = await Notifications.scheduleNotificationAsync({
      content: {
        title,
        body,
        data: { type, ...data },
        sound: true,
      },
      trigger: {
        hour,
        minute,
        repeats: true,
      } as any,
    });

    return notificationId;
  } catch (error) {
    if (Platform.OS !== "web") {
      console.error("Error scheduling daily notification:", error);
    }
    return null;
  }
}

// ============================================
// CANCEL NOTIFICATION
// ============================================
export async function cancelNotification(
  notificationId: string,
): Promise<void> {
  if (!Notifications || Platform.OS === "web") {
    return;
  }
  try {
    await Notifications.cancelScheduledNotificationAsync(notificationId);
    if (Platform.OS !== "web") {
      console.log(`[Notifications] Cancelled notification: ${notificationId}`);
    }
  } catch (error) {
    if (Platform.OS !== "web") {
      console.error("Error canceling notification:", error);
    }
  }
}

// ============================================
// CANCEL MULTIPLE NOTIFICATIONS
// ============================================
export async function cancelNotifications(
  notificationIds: string[],
): Promise<void> {
  if (!Notifications || Platform.OS === "web" || notificationIds.length === 0) return;
  await Promise.allSettled(
    notificationIds.map((id) => cancelNotification(id)),
  );
}

// ============================================
// CANCEL ALL NOTIFICATIONS
// ============================================
export async function cancelAllNotifications(): Promise<void> {
  if (!Notifications || Platform.OS === "web") {
    return;
  }
  try {
    await Notifications.cancelAllScheduledNotificationsAsync();
  } catch (error) {
    if (Platform.OS !== "web") {
      console.error("Error canceling all notifications:", error);
    }
  }
}

// ============================================
// GET ALL SCHEDULED NOTIFICATIONS
// ============================================
export async function getAllScheduledNotifications() {
  if (!Notifications || Platform.OS === "web") {
    return [];
  }
  try {
    return await Notifications.getAllScheduledNotificationsAsync();
  } catch (error) {
    if (Platform.OS !== "web") {
      console.error("Error getting scheduled notifications:", error);
    }
    return [];
  }
}

// ============================================
// HELPER: Compute next occurrence of a month/day at a given hour
// Used for birthdays & anniversaries (yearly events)
// ============================================
function getNextOccurrence(
  month: number, // 0-indexed
  day: number,
  hour: number = 9,
  minuteOffset: number = 0, // days before the actual date
): Date {
  const now = new Date();
  const year = now.getFullYear();

  // Target date in this calendar year
  const candidate = new Date(year, month, day - minuteOffset, hour, 0, 0, 0);

  // If that date is already past, push to next year
  if (candidate <= now) {
    candidate.setFullYear(year + 1);
  }

  return candidate;
}

// ============================================
// HELPER: Schedule Birthday Reminder (one-shot, correct date)
// Schedules on the actual birthday at 9:00 AM.
// Returns array: [same_day_notifId, one_day_before_notifId?]
// ============================================
export async function scheduleBirthdayReminder(
  name: string,
  dateOfBirth: Date | string,
  memberId: string,
): Promise<string[]> {
  const birth = new Date(dateOfBirth);
  const month = birth.getMonth(); // 0-indexed
  const day = birth.getDate();

  const ids: string[] = [];

  // 1. Same-day notification at 9:00 AM
  const sameDayTrigger = getNextOccurrence(month, day, 9);
  const sameDayId = await scheduleNotification(
    `🎂 Happy Birthday, ${name}!`,
    `Today is ${name}'s birthday — don't forget to wish them! 🎉`,
    sameDayTrigger,
    "birthday",
    { memberId, name, reminderType: "same_day" },
  );
  if (sameDayId) ids.push(sameDayId);

  // 2. One-day-before notification at 9:00 AM
  const oneDayBeforeTrigger = getNextOccurrence(month, day, 9, 1);
  const oneDayId = await scheduleNotification(
    `🎂 Birthday Tomorrow — ${name}`,
    `${name}'s birthday is tomorrow! Plan something special 🎁`,
    oneDayBeforeTrigger,
    "birthday",
    { memberId, name, reminderType: "1_day_before" },
  );
  if (oneDayId) ids.push(oneDayId);

  console.log(
    `[Notifications] Birthday reminders for ${name}: same-day=${sameDayId}, 1-day-before=${oneDayId}`,
  );

  return ids;
}

// ============================================
// HELPER: Schedule Future Event Reminders
// Handles all ReminderOption values and returns scheduled IDs.
// For recurring yearly events (birthdays/anniversaries), uses next occurrence.
// ============================================
export async function scheduleEventReminders(
  eventTitle: string,
  eventType: string,
  eventDate: Date | string,
  eventId: string,
  reminderOptions: ReminderOption[],
  isRecurringYearly: boolean = false,
): Promise<string[]> {
  const date = new Date(eventDate);
  const ids: string[] = [];

  const emoji =
    eventType === "Birthday"
      ? "🎂"
      : eventType === "Anniversary"
        ? "💍"
        : eventType === "Wedding"
          ? "💒"
          : eventType === "Party"
            ? "🎉"
            : eventType === "Vacation"
              ? "✈️"
              : eventType === "Interview"
                ? "💼"
                : eventType === "Meeting"
                  ? "👥"
                  : "📅";

  for (const option of reminderOptions) {
    let triggerDate: Date;
    let notifTitle: string;
    let notifBody: string;

    if (option === "1_week_before") {
      triggerDate = new Date(date);
      triggerDate.setDate(triggerDate.getDate() - 7);
      triggerDate.setHours(9, 0, 0, 0);
      notifTitle = `${emoji} ${eventTitle} — 1 Week Away`;
      notifBody = `"${eventTitle}" is coming up in 7 days. Get ready!`;
    } else if (option === "1_day_before") {
      triggerDate = new Date(date);
      triggerDate.setDate(triggerDate.getDate() - 1);
      triggerDate.setHours(9, 0, 0, 0);
      notifTitle = `${emoji} ${eventTitle} — Tomorrow!`;
      notifBody = `"${eventTitle}" is tomorrow. Don't forget!`;
    } else if (option === "same_day") {
      triggerDate = new Date(date);
      triggerDate.setHours(9, 0, 0, 0);
      notifTitle = `${emoji} ${eventTitle} — Today!`;
      notifBody = `"${eventTitle}" is happening today!`;
    } else {
      continue;
    }

    // For recurring yearly events: if computed trigger is in the past,
    // advance to next year's occurrence
    if (isRecurringYearly && triggerDate <= new Date()) {
      triggerDate.setFullYear(triggerDate.getFullYear() + 1);
    }

    const id = await scheduleNotification(
      notifTitle,
      notifBody,
      triggerDate,
      "event",
      { eventId, eventTitle, eventType, reminderOption: option },
    );

    if (id) ids.push(id);
  }

  return ids;
}

// ============================================
// HELPER: Schedule Utility Bill Reminder
// ============================================
export async function scheduleUtilityBillReminder(
  utilityName: string,
  dueDate: Date,
  billId: string,
): Promise<string | null> {
  // Schedule 3 days before due date at 10:00 AM
  const reminderDate = new Date(dueDate);
  reminderDate.setDate(reminderDate.getDate() - 3);
  reminderDate.setHours(10, 0, 0, 0);

  if (reminderDate < new Date()) {
    console.warn("Bill reminder date is in the past");
    return null;
  }

  return await scheduleNotification(
    `💡 Utility Bill Reminder`,
    `${utilityName} bill is due in 3 days`,
    reminderDate,
    "event",
    { billId, utilityName },
  );
}

// ============================================
// HELPER: Schedule Health Appointment Reminder
// ============================================
export async function scheduleHealthAppointmentReminder(
  appointmentType: string,
  appointmentDate: Date,
  recordId: string,
): Promise<string | null> {
  // Schedule 1 day before at 6:00 PM
  const reminderDate = new Date(appointmentDate);
  reminderDate.setDate(reminderDate.getDate() - 1);
  reminderDate.setHours(18, 0, 0, 0);

  if (reminderDate < new Date()) {
    console.warn("Appointment reminder date is in the past");
    return null;
  }

  return await scheduleNotification(
    `🏥 Health Appointment Reminder`,
    `${appointmentType} appointment tomorrow`,
    reminderDate,
    "appointment",
    { recordId, appointmentType },
  );
}

// ============================================
// HELPER: Schedule Future Event Reminder (legacy compat)
// ============================================
export async function scheduleFutureEventReminder(
  eventName: string,
  eventDate: Date,
  eventId: string,
  reminderType: "1day" | "1week" | "1month" = "1day",
): Promise<string | null> {
  const reminderDate = new Date(eventDate);

  switch (reminderType) {
    case "1day":
      reminderDate.setDate(reminderDate.getDate() - 1);
      reminderDate.setHours(9, 0, 0, 0);
      break;
    case "1week":
      reminderDate.setDate(reminderDate.getDate() - 7);
      reminderDate.setHours(9, 0, 0, 0);
      break;
    case "1month":
      reminderDate.setMonth(reminderDate.getMonth() - 1);
      reminderDate.setHours(9, 0, 0, 0);
      break;
  }

  if (reminderDate < new Date()) {
    console.warn("Event reminder date is in the past");
    return null;
  }

  return await scheduleNotification(
    `📅 Event Reminder`,
    `${eventName} is coming up!`,
    reminderDate,
    "event",
    { eventId, eventName, reminderType },
  );
}
