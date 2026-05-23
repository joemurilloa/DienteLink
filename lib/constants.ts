// Appointment Types
export const APPOINTMENT_TYPES = {
  CONSULTA: 'Consulta',
  SEGUIMIENTO: 'Seguimiento',
  CIRUGIA: 'Cirugía',
  REVISION: 'Revisión'
} as const;

export type AppointmentType = typeof APPOINTMENT_TYPES[keyof typeof APPOINTMENT_TYPES];

// Appointment Statuses
export const APPOINTMENT_STATUSES = {
  PROGRAMADA: 'Programada',
  COMPLETADA: 'Completada',
  RETRASADA: 'Retrasada',
  ELIMINADA: 'Eliminada'
} as const;

export type AppointmentStatus = typeof APPOINTMENT_STATUSES[keyof typeof APPOINTMENT_STATUSES];

// Reminder Statuses
export const REMINDER_STATUSES = {
  NOT_SENT: 'not_sent',
  SENDING: 'sending',
  SENT: 'sent',
  ERROR: 'error'
} as const;

export type ReminderStatus = typeof REMINDER_STATUSES[keyof typeof REMINDER_STATUSES];

// Payment Methods
export const PAYMENT_METHODS = {
  CASH: 'cash',
  CARD: 'card',
  TRANSFER: 'transfer',
  OTHER: 'other'
} as const;

export type PaymentMethod = typeof PAYMENT_METHODS[keyof typeof PAYMENT_METHODS];

// Budget Item Statuses
export const BUDGET_ITEM_STATUSES = {
  PENDING: 'pending',
  IN_PROGRESS: 'in_progress',
  COMPLETED: 'completed'
} as const;

export type BudgetItemStatus = typeof BUDGET_ITEM_STATUSES[keyof typeof BUDGET_ITEM_STATUSES];

// Request Statuses
export const REQUEST_STATUSES = {
  PENDING: 'pending',
  APPROVED: 'approved',
  REJECTED: 'rejected'
} as const;

export type RequestStatus = typeof REQUEST_STATUSES[keyof typeof REQUEST_STATUSES];

// Tooth Surfaces
export const TOOTH_SURFACES = {
  OCLUSAL: 'oclusal',
  INCISAL: 'incisal',
  VESTIBULAR: 'vestibular',
  LINGUAL: 'lingual',
  MESIAL: 'mesial',
  DISTAL: 'distal'
} as const;

export type ToothSurface = typeof TOOTH_SURFACES[keyof typeof TOOTH_SURFACES];

// Clinical Conditions
export const CLINICAL_CONDITIONS = {
  // Estado
  HEALTHY: 'healthy',
  CARIES: 'caries',
  OBTURADO: 'obturado',
  FRACTURA: 'fractura',
  // Tratamiento indicado
  EXTRACCION_INDICADA: 'extraccion_indicada',
  TRATAMIENTO_CONDUCTO: 'tratamiento_conducto',
  CORONA_INDICADA: 'corona_indicada',
  PROTESIS_IMPLANTES: 'protesis_implante',
  // Estado especial
  AUSENTE: 'ausente',
  IMPLANTES_PRESENTE: 'implante_presente',
  CORONA_PRESENTE: 'corona_presente',
  EN_OBSERVACION: 'en_observacion'
} as const;

export type ClinicalCondition = typeof CLINICAL_CONDITIONS[keyof typeof CLINICAL_CONDITIONS];

// Event Types
export const EVENT_TYPES = {
  TREATMENT: 'treatment',
  EXTRACTION: 'extraction',
  CLEANING: 'cleaning',
  DIAGNOSE: 'diagnose',
  OTHER: 'other'
} as const;

export type EventType = typeof EVENT_TYPES[keyof typeof EVENT_TYPES];

// Default Values
export const DEFAULT_VALUES = {
  CURRENCY: 'HNL',
  LOCALE: 'es-HN',
  SLOT_DURATION: 30, // minutes
  BUFFER_TIME: 15, // minutes
  ADVANCE_BOOKING_DAYS: 30,
  ROLE_DOCTOR: 'doctor'
} as const;