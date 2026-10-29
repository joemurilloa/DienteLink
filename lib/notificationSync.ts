export const MAX_STORED = 50;

export type NotificationType =
  | 'new_booking'
  | 'appointment_soon'
  | 'payment_received'
  | 'system';

export interface AppNotification {
  id: string;
  type: NotificationType;
  title: string;
  description: string;
  timestamp: string;
  read: boolean;
  actionPath?: string;
  dedupeKey?: string;
}
