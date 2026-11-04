/** Palabras que ve el dentista en PDF y CSV. La base sigue guardando la clave interna. */

const CONDITIONS: Record<string, string> = {
  healthy: 'Sano',
  caries: 'Caries',
  obturado: 'Obturado',
  fractura: 'Fractura',
  extraccion_indicada: 'Extracción indicada',
  tratamiento_conducto: 'Endodoncia',
  corona_indicada: 'Corona indicada',
  protesis_implante: 'Prótesis o implante',
  ausente: 'Ausente',
  extraido: 'Extraído',
  implante_presente: 'Implante',
  corona_presente: 'Corona presente',
  en_observacion: 'En observación',
};

const SURFACES: Record<string, string> = {
  oclusal: 'Oclusal',
  incisal: 'Incisal',
  vestibular: 'Vestibular',
  lingual: 'Lingual',
  mesial: 'Mesial',
  distal: 'Distal',
};

const WORK: Record<string, string> = {
  pending: 'Por hacer',
  in_progress: 'En curso',
  completed: 'Hecho',
};

const PAYMENT: Record<string, string> = {
  cash: 'Efectivo',
  card: 'Tarjeta',
  transfer: 'Transferencia',
  other: 'Otro',
};

function fromMap(map: Record<string, string>, value: string | null | undefined): string {
  if (!value) return '';
  return map[value] ?? value;
}

export function conditionLabel(value: string | null | undefined): string {
  return fromMap(CONDITIONS, value);
}

export function surfaceLabel(value: string | null | undefined): string {
  return fromMap(SURFACES, value);
}

export function workStatusLabel(value: string | null | undefined): string {
  return fromMap(WORK, value);
}

export function paymentMethodLabel(value: string | null | undefined): string {
  return fromMap(PAYMENT, value);
}

export function findingLabel(surface: string | null | undefined, condition: string | null | undefined): string {
  const face = surfaceLabel(surface);
  const state = conditionLabel(condition);
  if (face && state) return `${face}: ${state}`;
  return state || face;
}
