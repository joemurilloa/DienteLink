/**
 * Avisos de la app. Se guardan por usuario en Postgres y en este navegador.
 * La demo y un fallo de red se quedan en localStorage.
 */

import { useCallback, useEffect, useRef } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { useAuth } from '../services/authService';
import { formatAppDate } from '../lib/utils';
import { AppointmentRequest } from '../types';
import {
  MAX_STORED,
  mergeNotifications,
  type AppNotification,
  type NotificationType,
} from '../lib/notificationSync';

export type { AppNotification, NotificationType };

const STORAGE_PREFIX = 'dientelink_notifications_v3_';
const LEGACY_KEY = 'dientelink_notifications_v2';
const RETENTION_MS = 7 * 24 * 60 * 60 * 1000;

interface NotificationRow {
  id: string;
  type: NotificationType;
  title: string;
  description: string;
  created_at: string;
  is_read: boolean;
  action_path: string | null;
  dedupe_key: string | null;
}

function storageKeyFor(userId: string | null) {
  return `${STORAGE_PREFIX}${userId || 'anon'}`;
}

function loadStored(key: string): AppNotification[] {
  try {
    localStorage.removeItem(LEGACY_KEY);
    const raw = localStorage.getItem(key);
    if (!raw) return [];
    const parsed: AppNotification[] = JSON.parse(raw);
    const cutoff = Date.now() - RETENTION_MS;
    return parsed.filter((n) => new Date(n.timestamp).getTime() > cutoff);
  } catch {
    return [];
  }
}

function saveStored(key: string, notifications: AppNotification[]) {
  try {
    localStorage.setItem(key, JSON.stringify(notifications.slice(0, MAX_STORED)));
  } catch { /* quota */ }
}

function rowToNotification(row: NotificationRow): AppNotification {
  return {
    id: row.id,
    type: row.type,
    title: row.title,
    description: row.description,
    timestamp: row.created_at,
    read: row.is_read,
    actionPath: row.action_path || undefined,
    dedupeKey: row.dedupe_key || undefined,
  };
}

function toRow(item: AppNotification): NotificationRow {
  return {
    id: item.id,
    type: item.type,
    title: item.title,
    description: item.description,
    created_at: item.timestamp,
    is_read: item.read,
    action_path: item.actionPath || null,
    dedupe_key: item.dedupeKey || null,
  };
}

function makeId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export function useNotifications() {
  const { user, isGuest } = useAuth();
  const userId = user?.id ?? null;
  const storageKey = storageKeyFor(userId);
  const queryClient = useQueryClient();
  const queryKey = ['notifications', userId || 'local'] as const;
  const canSync = !!userId && !isGuest;

  const query = useQuery({
    queryKey,
    queryFn: async (): Promise<AppNotification[]> => {
      const local = loadStored(storageKey);
      if (!canSync || !userId) return local;

      const cutoff = new Date(Date.now() - RETENTION_MS).toISOString();
      const { data, error } = await supabase
        .from('user_notifications')
        .select('id, type, title, description, created_at, is_read, action_path, dedupe_key')
        .eq('user_id', userId)
        .gte('created_at', cutoff)
        .order('created_at', { ascending: false })
        .limit(MAX_STORED);

      if (error) {
        console.warn('[useNotifications] Usando avisos locales:', error.message);
        return local;
      }

      const cloud = ((data || []) as NotificationRow[]).map(rowToNotification);
      const { list, toUpload } = mergeNotifications(cloud, local);
      if (toUpload.length > 0) {
        const { error: uploadError } = await supabase
          .from('user_notifications')
          .upsert(toUpload.map((item) => ({ ...toRow(item), user_id: userId })), { onConflict: 'id', ignoreDuplicates: true });
        if (uploadError) {
          console.warn('[useNotifications] No se pudieron subir avisos locales:', uploadError.message);
        }
      }
      saveStored(storageKey, list);
      return list;
    },
  });

  const notifications = query.data ?? loadStored(storageKey);
  const listRef = useRef(notifications);
  listRef.current = notifications;
  const syncRef = useRef({ canSync, userId, storageKey });
  syncRef.current = { canSync, userId, storageKey };

  const writeCache = useCallback((next: AppNotification[]) => {
    const { userId: uid, storageKey: key } = syncRef.current;
    const trimmed = next.slice(0, MAX_STORED);
    queryClient.setQueryData(['notifications', uid || 'local'], trimmed);
    saveStored(key, trimmed);
  }, [queryClient]);

  const addNotification = useCallback((
    type: NotificationType,
    title: string,
    description: string,
    actionPath?: string,
    dedupeKey?: string,
  ) => {
    const current = listRef.current;
    if (dedupeKey && current.some((n) => n.dedupeKey === dedupeKey)) return;
    const notification: AppNotification = {
      id: makeId(),
      type,
      title,
      description,
      timestamp: new Date().toISOString(),
      read: false,
      actionPath,
      dedupeKey,
    };
    writeCache([notification, ...current]);
    const { canSync: sync, userId: uid } = syncRef.current;
    if (!sync || !uid) return;
    void supabase
      .from('user_notifications')
      .upsert({ ...toRow(notification), user_id: uid }, { onConflict: 'id' })
      .then(({ error }) => {
        if (error) console.warn('[useNotifications] No se guardó el aviso:', error.message);
      });
  }, [writeCache]);

  const markRead = useCallback((id: string) => {
    writeCache(listRef.current.map((n) => (n.id === id ? { ...n, read: true } : n)));
    if (!canSync) return;
    void supabase.from('user_notifications').update({ is_read: true }).eq('id', id);
  }, [canSync, writeCache]);

  const markAllRead = useCallback(() => {
    writeCache(listRef.current.map((n) => ({ ...n, read: true })));
    if (!canSync || !userId) return;
    void supabase.from('user_notifications').update({ is_read: true }).eq('user_id', userId).eq('is_read', false);
  }, [canSync, userId, writeCache]);

  const clearAll = useCallback(() => {
    writeCache([]);
    if (!canSync || !userId) return;
    void supabase.from('user_notifications').delete().eq('user_id', userId);
  }, [canSync, userId, writeCache]);

  useEffect(() => {
    const handler = (e: Event) => {
      const req = (e as CustomEvent<AppointmentRequest>).detail;
      if (!req) return;
      addNotification(
        'new_booking',
        '¡Nueva solicitud de cita!',
        `${req.patientName} — ${formatAppDate(req.requestedDate)} a las ${req.requestedTime}`,
        '/booking/manage',
        `booking-${req.id}`,
      );
    };
    window.addEventListener('newAppointmentRequest', handler);
    return () => window.removeEventListener('newAppointmentRequest', handler);
  }, [addNotification]);

  const unreadCount = notifications.filter((n) => !n.read).length;

  return {
    notifications,
    unreadCount,
    addNotification,
    markRead,
    markAllRead,
    clearAll,
  };
}
