// ============================================
// Notification Utility - Expo Local Notifications
// Handles all notification scheduling and permissions
// Note: Notifications work in development builds, not Expo Go
// ============================================

import { NotificationType } from "@/types";
import { Platform } from "react-native";

let Notifications: any = null;

// Try to import notifications (may fail in Expo Go)
try {
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
} catch {
  console.warn(
    "expo-notifications not available in Expo Go. Use development build for notifications.",
  );
}

// ============================================
// REQUEST PERMISSIONS
// ============================================
export async function requestNotificationPermissions(): Promise<boolean> {
  // Return false if notifications not available (Expo Go)
  if (!Notifications) {
    console.warn("Notifications not available");
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
    }

    return true;
  } catch (error) {
    console.error("Error requesting notification permissions:", error);
    return false;
  }
}

// ============================================
// SCHEDULE NOTIFICATION
// ============================================
export async function scheduleNotification(
  title: string,
  body: string,
  triggerDate: Date,
  type: NotificationType,
  data?: any,
): Promise<string | null> {
  if (!Notifications) {
    console.warn("Notifications not available");
    return null;
  }

  try {
    const hasPermission = await requestNotificationPermissions();
    if (!hasPermission) {
      console.warn("No notification permission");
      return null;
    }

    const notificationId = await Notifications.scheduleNotificationAsync({
      content: {
        title,
        body,
        data: { type, ...data },
        sound: true,
      },
      trigger: triggerDate as any,
    });

    return notificationId;
  } catch (error) {
    console.error("Error scheduling notification:", error);
    return null;
  }
}

// ============================================
// SCHEDULE DAILY NOTIFICATION
// ============================================
export async function scheduleDailyNotification(
  title: string,
  body: string,
  hour: number,
  minute: number,
  type: NotificationType,
  data?: any,
): Promise<string | null> {
  if (!Notifications) {
    console.warn("Notifications not available");
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
    console.error("Error scheduling daily notification:", error);
    return null;
  }
}

// ============================================
// CANCEL NOTIFICATION
// ============================================
export async function cancelNotification(
  notificationId: string,
): Promise<void> {
  if (!Notifications) {
    return;
  }
  try {
    await Notifications.cancelScheduledNotificationAsync(notificationId);
  } catch (error) {
    console.error("Error canceling notification:", error);
  }
}

// ============================================
// CANCEL ALL NOTIFICATIONS
// ============================================
export async function cancelAllNotifications(): Promise<void> {
  if (!Notifications) {
    return;
  }
  try {
    await Notifications.cancelAllScheduledNotificationsAsync();
  } catch (error) {
    console.error("Error canceling all notifications:", error);
  }
}

// ============================================
// GET ALL SCHEDULED NOTIFICATIONS
// ============================================
export async function getAllScheduledNotifications() {
  if (!Notifications) {
    return [];
  }
  try {
    return await Notifications.getAllScheduledNotificationsAsync();
  } catch (error) {
    console.error("Error getting scheduled notifications:", error);
    return [];
  }
}

// ============================================
// HELPER: Schedule Birthday Reminder
// ============================================
export async function scheduleBirthdayReminder(
  name: string,
  dateOfBirth: Date,
  memberId: string,
): Promise<string | null> {
  const now = new Date();
  const birthDate = new Date(dateOfBirth);

  // Set birthday for this year
  const nextBirthday = new Date(
    now.getFullYear(),
    birthDate.getMonth(),
    birthDate.getDate(),
    9, // 9:00 AM
    0,
    0,
  );

  // If birthday has passed this year, schedule for next year
  if (nextBirthday < now) {
    nextBirthday.setFullYear(nextBirthday.getFullYear() + 1);
  }

  return await scheduleDailyNotification(
    `🎂 Birthday Reminder`,
    `Today is ${name}'s birthday! 🎉`,
    9,
    0,
    "birthday",
    { memberId, name },
  );
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
// HELPER: Schedule Future Event Reminder
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
