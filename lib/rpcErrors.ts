/** SQLSTATE propios de DienteLink (migración approve / team). */
export const RpcSqlState = {
  BadRequest: 'DL400',
  Forbidden: 'DL403',
  NotFound: 'DL404',
  /** Horario ocupado (approve) — UI: ofrecer forzar solape. */
  Conflict: 'DL409',
  /** Solicitud ya no pending (approve). */
  InvalidState: 'DL410',
  /** Versión stale / alta con id existente (save_patient). */
  VersionConflict: 'DL412',
  /** Upsert sobre fila soft-deleted (save_patient). */
  SoftDeleted: 'DL413',
} as const;

export type RpcSqlStateCode = (typeof RpcSqlState)[keyof typeof RpcSqlState];

type ErrLike = {
  code?: string;
  message?: string;
  details?: string;
  hint?: string;
};

/** Extrae código PostgREST/Postgres de un error de supabase.rpc. */
export function rpcErrorCode(err: unknown): string | undefined {
  if (!err || typeof err !== 'object') return undefined;
  const e = err as ErrLike;
  return typeof e.code === 'string' ? e.code : undefined;
}

export function rpcErrorMessage(err: unknown): string {
  if (!err) return 'Error desconocido';
  if (err instanceof Error) return err.message;
  if (typeof err === 'object' && err !== null && 'message' in err) {
    const m = (err as ErrLike).message;
    if (typeof m === 'string') return m;
  }
  return String(err);
}

export function isRpcConflict(err: unknown): boolean {
  const code = rpcErrorCode(err);
  if (code === RpcSqlState.Conflict) return true;
  return rpcErrorMessage(err).includes('APPOINTMENT_CONFLICT');
}

export function isRpcForbidden(err: unknown): boolean {
  const code = rpcErrorCode(err);
  if (code === RpcSqlState.Forbidden) return true;
  return rpcErrorMessage(err).includes('FORBIDDEN');
}

export function isRpcNotFound(err: unknown): boolean {
  const code = rpcErrorCode(err);
  if (code === RpcSqlState.NotFound) return true;
  return rpcErrorMessage(err).includes('NOT_FOUND');
}

export function isRpcInvalidState(err: unknown): boolean {
  const code = rpcErrorCode(err);
  if (code === RpcSqlState.InvalidState) return true;
  return rpcErrorMessage(err).includes('NOT_PENDING');
}

export function isRpcVersionConflict(err: unknown): boolean {
  const code = rpcErrorCode(err);
  if (code === RpcSqlState.VersionConflict) return true;
  return rpcErrorMessage(err).includes('VERSION_CONFLICT');
}

export function isRpcSoftDeleted(err: unknown): boolean {
  const code = rpcErrorCode(err);
  if (code === RpcSqlState.SoftDeleted) return true;
  return rpcErrorMessage(err).includes('GONE:') || rpcErrorMessage(err).includes('soft-deleted');
}
