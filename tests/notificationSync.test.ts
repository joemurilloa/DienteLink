import { describe, expect, it } from 'vitest';
import { mergeNotifications } from '../lib/notificationSync';
import type { AppNotification } from '../lib/notificationSync';

function notice(partial: Partial<AppNotification> & Pick<AppNotification, 'id'>): AppNotification {
  return {
    type: 'system',
    title: partial.id,
    description: '',
    timestamp: '2026-10-29T00:00:00.000Z',
    read: false,
    ...partial,
  };
}

describe('mergeNotifications', () => {
  it('sube los avisos locales que la nube no tiene', () => {
    const cloud = [notice({ id: 'c1', timestamp: '2026-10-29T02:00:00.000Z' })];
    const local = [notice({ id: 'l1', dedupeKey: 'booking-1', timestamp: '2026-10-29T01:00:00.000Z' })];
    const merged = mergeNotifications(cloud, local);
    expect(merged.list.map(n => n.id)).toEqual(['c1', 'l1']);
    expect(merged.toUpload.map(n => n.id)).toEqual(['l1']);
  });

  it('no vuelve a subir un aviso que ya está por su clave', () => {
    const cloud = [notice({ id: 'c1', dedupeKey: 'soon-1' })];
    const local = [notice({ id: 'otro', dedupeKey: 'soon-1' })];
    const merged = mergeNotifications(cloud, local);
    expect(merged.toUpload).toEqual([]);
    expect(merged.list).toHaveLength(1);
  });
});
