export type RepeatType = "none" | "daily" | "weekly" | "monthly" | "yearly";

export interface Reminder {
  id: string;
  user_id: string;
  transaction_id?: string;
  title: string;
  description?: string;
  reminder_date: string;
  is_completed: boolean;
  is_notified: boolean;
  notification_sent_at?: string;
  repeat_type?: RepeatType;
  created_at: string;
  updated_at: string;
}

export interface ReminderFormData {
  title: string;
  description?: string;
  reminder_date: string;
  repeat_type: RepeatType;
}

export interface PushSubscription {
  id: string;
  user_id: string;
  endpoint: string;
  p256dh: string;
  auth: string;
  user_agent?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface NotificationPermissionState {
  granted: boolean;
  denied: boolean;
  default: boolean;
}

export interface InAppNotification {
  id: string;
  title: string;
  description?: string;
  type: "reminder" | "transaction" | "goal" | "system";
  timestamp: string;
  isRead: boolean;
  actionUrl?: string;
}
