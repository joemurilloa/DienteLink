import { isSessionExpiredError, rpcErrorCode, rpcErrorMessage } from './rpcErrors';
import { knownTable, SaveFailedError } from './saveFailed';

const SAFE_MESSAGE = 'No se guardó';
const TAG_KEYS = ['fallo', 'tabla', 'codigo', 'sesion', 'red'] as const;

export type SaveFailureReport = {
  message: typeof SAFE_MESSAGE;
  tags: {
    fallo: 'guardado';
    tabla: string;
    codigo: string;
    sesion: 'si' | 'no';
    red: 'si' | 'no';
  };
};

type Frame = { vars?: unknown };
type ExceptionValue = { value?: string; stacktrace?: { frames?: Frame[] } };

/** Forma mínima del evento. El SDK trae más campos; aquí solo se tocan los que pueden llevar datos. */
export type ScrubbableEvent = {
  message?: string;
  request?: unknown;
  user?: unknown;
  extra?: unknown;
  breadcrumbs?: unknown;
  contexts?: Record<string, unknown>;
  tags?: Record<string, unknown>;
  exception?: { values?: ExceptionValue[] };
  logentry?: { message?: string; params?: unknown };
};

function safeCode(code: string | undefined): string {
  return code && /^[A-Za-z0-9]{2,12}$/.test(code) ? code : 'sin_codigo';
}

function safeText(text: string | undefined): string {
  if (text === SAFE_MESSAGE) return SAFE_MESSAGE;
  if (!text) return 'error';
  const code = text.match(/\b(PGRST\d{3}|DL4\d{2})\b/);
  return code ? code[1] : 'error';
}

export function saveFailureReport(err: unknown, tableHint?: string): SaveFailureReport {
  const table = err instanceof SaveFailedError ? err.table : knownTable(tableHint);
  const network = /failed to fetch|networkerror|load failed|offline/i.test(rpcErrorMessage(err));
  return {
    message: SAFE_MESSAGE,
    tags: {
      fallo: 'guardado',
      tabla: table,
      codigo: safeCode(err instanceof SaveFailedError ? err.code : rpcErrorCode(err)),
      sesion: isSessionExpiredError(err) ? 'si' : 'no',
      red: network ? 'si' : 'no',
    },
  };
}

/** Quita cuerpos, usuario, migas y cualquier texto que no sea el aviso fijo o un código. */
export function scrubSentryEvent<T extends ScrubbableEvent>(event: T): T {
  delete event.request;
  delete event.user;
  delete event.extra;
  event.breadcrumbs = [];

  if (event.contexts) {
    const keep: Record<string, unknown> = {};
    for (const key of ['browser', 'os']) {
      const ctx = event.contexts[key];
      if (!ctx || typeof ctx !== 'object') continue;
      const src = ctx as Record<string, unknown>;
      keep[key] = {
        name: typeof src.name === 'string' ? src.name.slice(0, 40) : undefined,
        version: typeof src.version === 'string' ? src.version.slice(0, 20) : undefined,
      };
    }
    event.contexts = keep;
  }

  if (event.message) event.message = safeText(event.message);
  if (event.logentry) {
    event.logentry.message = safeText(event.logentry.message);
    delete event.logentry.params;
  }
  if (event.exception?.values) {
    for (const value of event.exception.values) {
      value.value = safeText(value.value);
      for (const frame of value.stacktrace?.frames ?? []) delete frame.vars;
    }
  }

  if (event.tags) {
    const tags: Record<string, string> = {};
    for (const key of TAG_KEYS) {
      const val = event.tags[key];
      if (typeof val === 'string' && /^[A-Za-z0-9_]{1,32}$/.test(val)) tags[key] = val;
    }
    event.tags = tags;
  }

  return event;
}
