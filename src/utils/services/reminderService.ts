import { supabase } from "@/integrations/supabase/client";
import { pushNotificationService } from "@/utils/services/pushNotificationService";

import type { Reminder, ReminderFormData } from "@/utils/types/reminder";

export class ReminderService {
  async createReminder(userId: string, data: ReminderFormData, transactionId?: string): Promise<Reminder> {
    const { data: reminder, error } = await supabase
      .from("reminders")
      .insert({
        user_id: userId,
        transaction_id: transactionId,
        title: data.title,
        description: data.description,
        reminder_date: data.reminder_date,
        repeat_type: data.repeat_type,
      })
      .select()
      .single();

    if (error) throw error;

    return reminder;
  }

  async updateReminder(id: string, data: Partial<ReminderFormData>): Promise<Reminder> {
    const { data: reminder, error } = await supabase
      .from("reminders")
      .update({
        ...data,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;

    return reminder;
  }

  async deleteReminder(id: string): Promise<void> {
    const { error } = await supabase.from("reminders").delete().eq("id", id);
    if (error) throw error;
  }

  async getUserReminders(userId: string, includeCompleted = false): Promise<Reminder[]> {
    let query = supabase.from("reminders").select("*").eq("user_id", userId).order("reminder_date", { ascending: true });
    if (!includeCompleted) {
      query = query.eq("is_completed", false);
    }

    const { data, error } = await query;

    if (error) throw error;

    return data || [];
  }

  async getUpcomingReminders(userId: string, hours = 24): Promise<Reminder[]> {
    const now = new Date();
    const future = new Date(now.getTime() + hours * 60 * 60 * 1000);
    const { data, error } = await supabase
      .from("reminders")
      .select("*")
      .eq("user_id", userId)
      .eq("is_completed", false)
      .gte("reminder_date", now.toISOString())
      .lte("reminder_date", future.toISOString())
      .order("reminder_date", { ascending: true });

    if (error) throw error;

    return data || [];
  }

  async markAsCompleted(id: string): Promise<void> {
    const { error } = await supabase
      .from("reminders")
      .update({
        is_completed: true,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id);
    if (error) throw error;
  }

  async markAsNotified(id: string): Promise<void> {
    const { error } = await supabase
      .from("reminders")
      .update({
        is_notified: true,
        notification_sent_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", id);
    if (error) throw error;
  }

  // A função 'sendNotification' não é mais necessária no cliente
  // A função 'scheduleReminder' não é mais necessária no cliente

  private async createRecurringReminder(reminder: Reminder): Promise<void> {
    const currentDate = new Date(reminder.reminder_date);
    let nextDate: Date;

    switch (reminder.repeat_type) {
      case "daily":
        nextDate = new Date(currentDate.setDate(currentDate.getDate() + 1));
        break;
      case "weekly":
        nextDate = new Date(currentDate.setDate(currentDate.getDate() + 7));
        break;
      case "monthly":
        nextDate = new Date(currentDate.setMonth(currentDate.getMonth() + 1));
        break;
      case "yearly":
        nextDate = new Date(currentDate.setFullYear(currentDate.getFullYear() + 1));
        break;
      default:
        return;
    }

    await this.createReminder(
      reminder.user_id,
      {
        title: reminder.title,
        description: reminder.description,
        reminder_date: nextDate.toISOString(),
        repeat_type: reminder.repeat_type,
      },
      reminder.transaction_id
    );
  }
}

export const reminderService = new ReminderService();
