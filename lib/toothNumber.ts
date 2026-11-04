/**
 * Única conversión entre el id interno del odontograma (1–32)
 * y la numeración FDI que ve el dentista.
 * El id interno no se imprime. Todo texto y todo campo pasa por aquí.
 */

const FDI_BY_ID = [
  18, 17, 16, 15, 14, 13, 12, 11,
  21, 22, 23, 24, 25, 26, 27, 28,
  38, 37, 36, 35, 34, 33, 32, 31,
  41, 42, 43, 44, 45, 46, 47, 48,
] as const;

const ID_BY_FDI = new Map<number, number>(FDI_BY_ID.map((fdi, index) => [fdi, index + 1]));

export function idToFdi(id: number): number | null {
  if (!Number.isInteger(id) || id < 1 || id > 32) return null;
  return FDI_BY_ID[id - 1];
}

export function fdiToId(fdi: number): number | null {
  if (!Number.isInteger(fdi)) return null;
  return ID_BY_FDI.get(fdi) ?? null;
}

export function isValidFdi(fdi: number): boolean {
  return fdiToId(fdi) !== null;
}

/** Número FDI para mostrar. Null si el id guardado no es una pieza permanente. */
export function fdiLabel(id: number | null | undefined): string | null {
  if (id == null) return null;
  const fdi = idToFdi(id);
  return fdi == null ? null : String(fdi);
}

export const FDI_INPUT_HINT = 'Ej. 16, 26, 36';
export const FDI_INPUT_ERROR = 'Esa pieza no existe. Usa 11–18, 21–28, 31–38 o 41–48.';

/** Convierte lo que escribió el dentista a id interno. Vacío es válido. */
export function parseFdiInput(raw: string): { ok: true; id?: number } | { ok: false; error: string } {
  const trimmed = raw.trim();
  if (!trimmed) return { ok: true };
  if (!/^\d{1,2}$/.test(trimmed)) return { ok: false, error: FDI_INPUT_ERROR };
  const id = fdiToId(Number(trimmed));
  if (id == null) return { ok: false, error: FDI_INPUT_ERROR };
  return { ok: true, id };
}
