import { useEffect, useRef } from 'react';
import { sileo } from 'sileo';

const TIPS_STORAGE_KEY = 'dientelink_shown_tips';

function getShownTips(): Set<string> {
  try {
    const raw = localStorage.getItem(TIPS_STORAGE_KEY);
    return raw ? new Set(JSON.parse(raw)) : new Set();
  } catch {
    return new Set();
  }
}

function markTipShown(tipId: string) {
  const shown = getShownTips();
  shown.add(tipId);
  localStorage.setItem(TIPS_STORAGE_KEY, JSON.stringify([...shown]));
}

/**
 * Hook that shows a contextual tip toast the first time a section is visited.
 * Tips are persisted in localStorage so each tip only shows once.
 */
export function useContextualTip(
  tipId: string,
  title: string,
  description: string,
  delayMs: number = 1500
) {
  const hasRun = useRef(false);

  useEffect(() => {
    if (hasRun.current) return;
    hasRun.current = true;

    const shown = getShownTips();
    if (shown.has(tipId)) return;

    const timeout = setTimeout(() => {
      sileo.info({ title, description });
      markTipShown(tipId);
    }, delayMs);

    return () => clearTimeout(timeout);
  }, [tipId, title, description, delayMs]);
}

// ——— Pre-defined tips for each section ———

export function useDashboardTip() {
  useContextualTip(
    'tip_dashboard',
    'Panel del día',
    'Revisa tus citas, solicitudes web y saldos pendientes desde el inicio.'
  );
}

export function usePatientsTip() {
  useContextualTip(
    'tip_patients',
    'Nuevo paciente',
    'Crea una ficha clínica completa desde el botón de nuevo expediente.'
  );
}

export function useCalendarTip() {
  useContextualTip(
    'tip_calendar',
    'Agenda rápida',
    'Haz clic en cualquier bloque horario para agendar una cita al instante.'
  );
}

export function useSettingsTip() {
  useContextualTip(
    'tip_settings',
    'Moneda personalizada',
    'Configura tu moneda local para que presupuestos y pagos se muestren correctamente.'
  );
}

export function useWelcomeTip() {
  useContextualTip(
    'tip_welcome',
    '¡Bienvenido a DienteLink! 🦷',
    'Tu clínica dental digital está lista. Explora las secciones del menú para comenzar.',
    2000
  );
}
