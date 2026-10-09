/**
 * useNotifications — Centro de notificaciones in-app para DienteLink
 *
 * Fuentes de notificaciones:
 *  1. Solicitudes de reserva en tiempo real (window event 'newAppointmentRequest')
 *  2. Citas del día que faltan ≤ 30 min (polled on mount)
 *
 * Persistencia: localStorage (últimas 50 notificaciones, 7 días de retención)
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { AppointmentRequest } from '../types';
import { formatAppDate } from '../lib/utils';
import { useAuth } from '../services/authService';

// ─── Types ──────────────────────────────────────────────────────────────────

export type NotificationType =
  | 'new_booking'      // Nueva solicitud de reserva online
  | 'appointment_soon' // Cita en ≤ 30 min
  | 'payment_received' // Pago registrado
  | 'system';          // Mensaje del sistema

export interface AppNotification {
  id: string;
  type: NotificationType;
  title: string;
  description: string;
  timestamp: string; // ISO
  read: boolean;
  actionPath?: string; // Route to navigate to on click
  dedupeKey?: string; // Prevent duplicates across reloads
}

// ─── Persistence ──────────────────────────────────────────────────────────────

// Las notificaciones se guardan POR USUARIO: dos cuentas en el mismo navegador nunca se mezclan.
const STORAGE_PREFIX = 'dientelink_notifications_v3_';
const LEGACY_KEY = 'dientelink_notifications_v2'; // versión global antigua (filtraba entre cuentas)
const MAX_STORED = 50;
const RETENTION_MS = 7 * 24 * 60 * 60 * 1000; // 7 días

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
  } catch { /* quota exceeded — ignore */ }
}

function makeId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useNotifications() {
  const { user } = useAuth();
  const storageKey = `${STORAGE_PREFIX}${user?.id || 'anon'}`;
  const [notifications, setNotifications] = useState<AppNotification[]>(() => loadStored(storageKey));
  const seenIdsRef = useRef<Set<string>>(
    new Set(loadStored(storageKey).map((n) => n.dedupeKey || n.id).filter(Boolean))
  );
  const loadedKeyRef = useRef(storageKey);

  // Si cambia el usuario, recarga SOLO sus notificaciones
  useEffect(() => {
    if (loadedKeyRef.current === storageKey) return;
    loadedKeyRef.current = storageKey;
    const stored = loadStored(storageKey);
    seenIdsRef.current = new Set(stored.map((n) => n.dedupeKey || n.id).filter(Boolean));
    setNotifications(stored);
  }, [storageKey]);

  // Persist on every change (solo en la clave del usuario cargado)
  useEffect(() => {
    if (loadedKeyRef.current !== storageKey) return;
    saveStored(storageKey, notifications);
  }, [notifications, storageKey]);

  // ── Add a new notification ──────────────────────────────────────────────────
  const addNotification = useCallback((
    type: NotificationType,
    title: string,
    description: string,
    actionPath?: string,
    dedupeKey?: string,
  ) => {
    // Avoid exact duplicates within the same session using dedupeKey
    if (dedupeKey && seenIdsRef.current.has(dedupeKey)) return;
    if (dedupeKey) seenIdsRef.current.add(dedupeKey);

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

    setNotifications((prev) => [notification, ...prev].slice(0, MAX_STORED));
  }, []);

  // ── Mark one as read ────────────────────────────────────────────────────────
  const markRead = useCallback((id: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n))
    );
  }, []);

  // ── Mark all as read ────────────────────────────────────────────────────────
  const markAllRead = useCallback(() => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  }, []);

  // ── Clear all ───────────────────────────────────────────────────────────────
  const clearAll = useCallback(() => {
    setNotifications([]);
    seenIdsRef.current.clear();
  }, []);

  // ── Listen for new booking requests (dispatched by BookingService) ──────────
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

  // ── Derived counts ──────────────────────────────────────────────────────────
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
