/**
 * Instrumentación de desarrollo (sessionStorage + console).
 * NO sirve como criterio de retiro del legacy en prod: los conteos viven
 * en el navegador del usuario y desaparecen al cerrar la pestaña.
 * Para retirar legacy hace falta Sentry (u otra tabla/servicio centralizado
 * tipo rpc_events). Hasta entonces, no cite estos conteos como evidencia.
 */

const KEY = 'dientelink.rpc_dl_counts';

export function recordRpcSqlState(code: string | undefined | null): void {
  if (!code || !/^DL\d{3}$/.test(code)) return;
  try {
    const raw = sessionStorage.getItem(KEY);
    const map = (raw ? JSON.parse(raw) : {}) as Record<string, number>;
    map[code] = (map[code] ?? 0) + 1;
    sessionStorage.setItem(KEY, JSON.stringify(map));
    console.info('[rpcMetrics]', code, map);
  } catch {
    // sessionStorage no disponible (SSR / privado estricto)
  }
}

export function getRpcSqlStateCounts(): Record<string, number> {
  try {
    const raw = sessionStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as Record<string, number>) : {};
  } catch {
    return {};
  }
}
