// ============================================
// Future Event Service - API Integration
// Handles future event data with backend API
// ============================================

import { FutureEvent, ReminderOption } from "@/types";
import api from "@/utils/api";
import {
  cancelNotifications,
  scheduleEventReminders,
} from "@/utils/notifications";

class FutureEventService {
  // ============================================
  // GET ALL FUTURE EVENTS
  // ============================================
  async getFutureEvents(): Promise<FutureEvent[]> {
    try {
      const response = await api.get("/events");
      console.log(
        "🔵 Raw API response:",
        JSON.stringify(response.data, null, 2),
      );

      // Map MongoDB _id to string id
      const mapped = response.data.map((event: any) => ({
        ...event,
        id: String(event._id || event.id),
        _id: undefined,
      }));

      console.log("🟢 Mapped events:", JSON.stringify(mapped, null, 2));
      return mapped;
    } catch (error: any) {
      console.error("Error getting future events:", error);
      return [];
    }
  }

  // ============================================
  // ADD EVENT (from class diagram)
  // ============================================
  async addEvent(
    eventData: Omit<FutureEvent, "id" | "createdAt" | "updatedAt">,
  ): Promise<FutureEvent> {
    try {
      console.log(
        "🔵 Adding event with data:",
        JSON.stringify(eventData, null, 2),
      );
      const response = await api.post("/events", eventData);
      console.log("🟢 Event added successfully:", response.data);
      const newEvent: FutureEvent = {
        ...response.data,
        id: String(response.data._id || response.data.id),
        _id: undefined,
      };

      // Schedule reminders and persist notification IDs
      const notificationIds = await this.scheduleReminders(newEvent);
      newEvent.notificationIds = notificationIds;

      return newEvent;
    } catch (error: any) {
      console.error("🔴 Error adding event:", error);
      console.error("🔴 Error response:", error.response?.data);
      console.error("🔴 Error message:", error.message);
      const message =
        error.response?.data?.error || error.message || "Failed to add event";
      throw new Error(message);
    }
  }

  // ============================================
  // EDIT EVENT (from class diagram)
  // ============================================
  async editEvent(
    eventId: string,
    updates: Partial<FutureEvent>,
  ): Promise<FutureEvent | null> {
    try {
      const response = await api.put(`/events/${eventId}`, updates);
      const updatedEvent: FutureEvent = {
        ...response.data,
        id: String(response.data._id || response.data.id),
        _id: undefined,
      };

      // Reschedule reminders when date or reminder options change
      if (updates.reminderOptions || updates.eventDate) {
        // Cancel previously-scheduled notifications for this event
        const oldIds: string[] = updatedEvent.notificationIds || [];
        if (oldIds.length > 0) {
          await cancelNotifications(oldIds);
          console.log(
            `[FutureEventService] Cancelled ${oldIds.length} old notification(s) for event ${eventId}`,
          );
        }

        const newIds = await this.scheduleReminders(updatedEvent);
        updatedEvent.notificationIds = newIds;
      }

      return updatedEvent;
    } catch (error: any) {
      console.error("Error editing event:", error);
      const message = error.response?.data?.message || "Failed to update event";
      throw new Error(message);
    }
  }

  // ============================================
  // DELETE EVENT (from class diagram)
  // ============================================
  async deleteEvent(eventId: string): Promise<boolean> {
    try {
      // Fetch current event to retrieve stored notification IDs before deletion
      const events = await this.getFutureEvents();
      const target = events.find((e) => e.id === eventId);
      if (target?.notificationIds && target.notificationIds.length > 0) {
        await cancelNotifications(target.notificationIds);
        console.log(
          `[FutureEventService] Cancelled ${target.notificationIds.length} notification(s) for deleted event ${eventId}`,
        );
      }

      await api.delete(`/events/${eventId}`);
      return true;
    } catch (error: any) {
      console.error("Error deleting event:", error);
      return false;
    }
  }

  // ============================================
  // SHARE EVENT WITH FAMILY (from class diagram)
  // ============================================
  async shareEventWithFamily(
    eventId: string,
    shareWithFamily: boolean,
  ): Promise<boolean> {
    try {
      await api.put(`/events/${eventId}`, {
        isShared: shareWithFamily,
      });
      return true;
    } catch (error) {
      console.error("Error sharing event:", error);
      return false;
    }
  }

  // ============================================
  // RECEIVE EVENT NOTIFICATION (from class diagram)
  // ============================================
  async receiveEventNotification(eventId: string): Promise<FutureEvent | null> {
    try {
      const response = await api.get(`/events/${eventId}`);
      const event = {
        ...response.data,
        id: String(response.data._id || response.data.id),
        _id: undefined,
      };

      // Mark notification as received/viewed
      // This could update a notification status or log
      return event;
    } catch (error) {
      console.error("Error receiving event notification:", error);
      return null;
    }
  }

  // ============================================
  // SCHEDULE REMINDERS (real implementation)
  // Returns array of scheduled notification IDs.
  // ============================================
  private async scheduleReminders(event: FutureEvent): Promise<string[]> {
    try {
      if (!event.reminderOptions || event.reminderOptions.length === 0) {
        return [];
      }

      const ids = await scheduleEventReminders(
        event.title,
        event.type,
        event.eventDate,
        event.id,
        event.reminderOptions as ReminderOption[],
        event.isRecurringYearly,
      );

      console.log(
        `[FutureEventService] Scheduled ${ids.length} notification(s) for "${event.title}": ${ids.join(", ")}`,
      );

      return ids;
    } catch (error) {
      console.error("Error scheduling reminders:", error);
      return [];
    }
  }

  // ============================================
  // GET UPCOMING EVENTS
  // ============================================
  async getUpcomingEvents(daysAhead: number = 30): Promise<FutureEvent[]> {
    try {
      const events = await this.getFutureEvents();
      const now = new Date();
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + daysAhead);

      return events
        .filter((event) => {
          const eventDate = new Date(event.eventDate);
          return (
            eventDate >= now && eventDate <= futureDate && !event.completedAt
          );
        })
        .sort(
          (a, b) =>
            new Date(a.eventDate).getTime() - new Date(b.eventDate).getTime(),
        );
    } catch (error) {
      console.error("Error getting upcoming events:", error);
      return [];
    }
  }

  // ============================================
  // GET EVENTS BY TYPE
  // ============================================
  async getEventsByType(type: string): Promise<FutureEvent[]> {
    try {
      const events = await this.getFutureEvents();
      return events.filter((event) => event.type === type);
    } catch (error) {
      console.error("Error getting events by type:", error);
      return [];
    }
  }

  // ============================================
  // MARK EVENT AS COMPLETED
  // ============================================
  async markEventCompleted(eventId: string): Promise<boolean> {
    try {
      await api.put(`/events/${eventId}`, {
        completedAt: new Date(),
      });
      return true;
    } catch (error) {
      console.error("Error marking event completed:", error);
      return false;
    }
  }

  // ============================================
  // GET EVENT STATISTICS
  // ============================================
  async getEventStatistics(): Promise<{
    upcoming: number;
    completed: number;
    past: number;
    total: number;
    incomplete: number;
  }> {
    try {
      const response = await api.get("/events/stats/summary");
      return response.data;
    } catch (error) {
      console.error("Error getting event statistics:", error);
      return {
        upcoming: 0,
        completed: 0,
        past: 0,
        total: 0,
        incomplete: 0,
      };
    }
  }

  // ============================================
  // GET PAST INCOMPLETE EVENTS
  // ============================================
  async getPastIncompleteEvents(): Promise<FutureEvent[]> {
    try {
      const response = await api.get("/events?past=true");
      return response.data.map((event: any) => ({
        ...event,
        id: String(event._id || event.id),
        _id: undefined,
      }));
    } catch (error) {
      console.error("Error getting past incomplete events:", error);
      return [];
    }
  }
}

export default new FutureEventService();
