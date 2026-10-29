import { useCallback, useEffect, useRef, useState } from 'react';
import { sileo } from 'sileo';
import { useAuth } from '../services/authService';

/**
 * Tras abrir WhatsApp el doctor confirma si envió el mensaje.
 * La app no puede saberlo sola: wa.me solo abre el chat.
 * Se guarda por usuario para no mezclar cuentas en el mismo navegador.
 */
export function useWhatsAppSend(opts: {
  key: string;
  initiallySent?: boolean;
  persistLocal?: boolean;
  onSent?: () => void;
}) {
  const { user } = useAuth();
  const storageKey = `dientelink_wa_sent_${user?.id || 'anon'}_${opts.key}`;
  const onSentRef = useRef(opts.onSent);
  onSentRef.current = opts.onSent;

  const [sent, setSent] = useState(() => {
    if (opts.initiallySent) return true;
    if (!opts.persistLocal) return false;
    try { return localStorage.getItem(storageKey) === '1'; } catch { return false; }
  });
  const [pending, setPending] = useState(false);

  useEffect(() => {
    if (opts.initiallySent) setSent(true);
  }, [opts.initiallySent]);

  const open = useCallback((result: { success: boolean; error?: string }) => {
    if (!result.success) {
      sileo.warning({
        title: 'No se pudo abrir WhatsApp',
        description: result.error || 'Revisa el teléfono del paciente.',
      });
      return;
    }
    setPending(true);
  }, []);

  const confirm = useCallback((yes: boolean) => {
    setPending(false);
    if (!yes) return;
    setSent(true);
    if (opts.persistLocal) {
      try { localStorage.setItem(storageKey, '1'); } catch { /* ignore */ }
    }
    onSentRef.current?.();
    sileo.success({
      title: 'Anotado',
      description: 'El mensaje lo mandas tú en WhatsApp. La app no lo envía sola.',
    });
  }, [opts.persistLocal, storageKey]);

  return { sent, pending, open, confirm };
}
