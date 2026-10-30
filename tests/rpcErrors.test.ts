import { describe, expect, it } from 'vitest';
import {
  RpcSqlState,
  isRpcConflict,
  isRpcForbidden,
  isRpcInvalidState,
  isRpcNotFound,
  rpcErrorCode,
} from '../lib/rpcErrors';

describe('rpcErrors', () => {
  it('prioriza SQLSTATE propios sobre el mensaje', () => {
    expect(isRpcConflict({ code: RpcSqlState.Conflict, message: 'x' })).toBe(true);
    expect(isRpcInvalidState({ code: RpcSqlState.InvalidState, message: 'x' })).toBe(true);
    expect(isRpcForbidden({ code: RpcSqlState.Forbidden, message: 'x' })).toBe(true);
    expect(isRpcNotFound({ code: RpcSqlState.NotFound, message: 'x' })).toBe(true);
    expect(rpcErrorCode({ code: 'DL409' })).toBe('DL409');
    expect(isRpcConflict({ code: RpcSqlState.InvalidState, message: 'NOT_PENDING' })).toBe(false);
  });

  it('hace fallback al mensaje si no hay code', () => {
    expect(isRpcConflict({ message: 'APPOINTMENT_CONFLICT: horario ocupado' })).toBe(true);
    expect(isRpcInvalidState({ message: 'NOT_PENDING: ya no está pendiente' })).toBe(true);
    expect(isRpcForbidden({ message: 'FORBIDDEN: sin clínica' })).toBe(true);
    expect(isRpcConflict({ message: 'otro error' })).toBe(false);
  });
});
