import { describe, expect, it } from 'vitest';
import { TOOTH_INFO } from '../components/odontogram/odontogramData';
import { fdiToId, idToFdi, isValidFdi, parseFdiInput } from '../lib/toothNumber';

describe('toothNumber', () => {
  it('convierte los casos que se contradecían en el demo', () => {
    expect(idToFdi(14)).toBe(26);
    expect(idToFdi(16)).toBe(28);
    expect(fdiToId(16)).toBe(3);
    expect(fdiToId(26)).toBe(14);
    expect(fdiToId(36)).toBe(19);
  });

  it('rechaza números que no son piezas', () => {
    for (const n of [0, 19, 20, 29, 30, 39, 40, 49]) {
      expect(isValidFdi(n)).toBe(false);
      expect(parseFdiInput(String(n)).ok).toBe(false);
    }
  });

  it('acepta una pieza FDI y la guarda como id interno', () => {
    expect(parseFdiInput('26')).toEqual({ ok: true, id: 14 });
    expect(parseFdiInput('')).toEqual({ ok: true });
  });

  it('coincide con la tabla del odontograma', () => {
    for (let id = 1; id <= 32; id++) {
      expect(TOOTH_INFO[id].fdi).toBe(idToFdi(id));
    }
  });
});
