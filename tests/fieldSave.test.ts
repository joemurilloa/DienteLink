import { describe, expect, it } from 'vitest';
import { phaseWhenFlushed } from '../lib/fieldSave';

describe('cuándo decir Guardado', () => {
  it('espera la promesa del servidor y no marca guardado al disparar el cambio', () => {
    expect(phaseWhenFlushed(Promise.resolve())).toBe('saving');
    expect(phaseWhenFlushed(undefined)).toBe('idle');
  });
});
