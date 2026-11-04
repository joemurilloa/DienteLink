import { describe, expect, it } from 'vitest';
import { conditionLabel, findingLabel, paymentMethodLabel, workStatusLabel } from '../lib/clinicalLabels';

describe('etiquetas clínicas', () => {
  it('traduce las claves que iban crudas al PDF y al CSV', () => {
    expect(conditionLabel('extraccion_indicada')).toBe('Extracción indicada');
    expect(conditionLabel('tratamiento_conducto')).toBe('Endodoncia');
    expect(findingLabel('oclusal', 'extraccion_indicada')).toBe('Oclusal: Extracción indicada');
    expect(workStatusLabel('pending')).toBe('Por hacer');
    expect(paymentMethodLabel('cash')).toBe('Efectivo');
  });
});
