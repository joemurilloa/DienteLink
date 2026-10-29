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

export function mergeNotifications(
  cloud: AppNotification[],
  local: AppNotification[],
): { list: AppNotification[]; toUpload: AppNotification[] } {
  const cloudKeys = new Set<string>();
  for (const item of cloud) {
    cloudKeys.add(item.id);
    if (item.dedupeKey) cloudKeys.add(item.dedupeKey);
  }

  const seen = new Set<string>();
  const list: AppNotification[] = [];
  const toUpload: AppNotification[] = [];

  for (const item of [...cloud, ...local]) {
    const key = item.dedupeKey || item.id;
    if (seen.has(key)) continue;
    seen.add(key);
    list.push(item);
    const alreadyInCloud = cloudKeys.has(item.id) || (!!item.dedupeKey && cloudKeys.has(item.dedupeKey));
    if (!alreadyInCloud) toUpload.push(item);
  }

  list.sort((a, b) => b.timestamp.localeCompare(a.timestamp));
  return { list: list.slice(0, MAX_STORED), toUpload };
}
