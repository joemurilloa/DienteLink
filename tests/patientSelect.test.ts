import { describe, expect, it } from 'vitest';
import { patientListSelect } from '../lib/patientSelect';

describe('patientListSelect', () => {
  it('en producción no pide columnas de save_patient', () => {
    const sql = patientListSelect(false);
    expect(sql).toContain('deleted_at');
    expect(sql).not.toContain('version');
    expect(sql).not.toContain('status, deleted_at');
    expect(sql).not.toContain('date, deleted_at');
    expect(sql).toContain('budget_items (id, unit_cost, quantity, status)');
    expect(sql).toContain('payments (id, amount, method, date)');
  });

  it('con el RPC pide version y borrado suave de dinero', () => {
    const sql = patientListSelect(true);
    expect(sql).toContain('version');
    expect(sql).toContain('budget_items (id, unit_cost, quantity, status, deleted_at)');
    expect(sql).toContain('payments (id, amount, method, date, deleted_at)');
  });
});
