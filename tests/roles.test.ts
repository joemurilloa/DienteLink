import { describe, expect, it } from 'vitest';
import { canSeeClinicMoney, canViewClinicalChart, normalizeClinicRole, profileRole } from '../lib/roles';

describe('normalizeClinicRole', () => {
  it('acepta los cuatro roles de la base', () => {
    expect(normalizeClinicRole('owner')).toBe('owner');
    expect(normalizeClinicRole('Admin')).toBe('admin');
    expect(normalizeClinicRole('assistant')).toBe('assistant');
    expect(normalizeClinicRole('receptionist')).toBe('receptionist');
  });

  it('trata los alias viejos como dueño', () => {
    expect(normalizeClinicRole('doctor')).toBe('owner');
    expect(normalizeClinicRole('dr')).toBe('owner');
    expect(normalizeClinicRole('odontólogo')).toBe('owner');
  });

  it('no promueve un rol desconocido', () => {
    expect(normalizeClinicRole('hacker')).toBeNull();
    expect(canSeeClinicMoney('hacker')).toBe(false);
    expect(canSeeClinicMoney('assistant')).toBe(false);
    expect(canSeeClinicMoney('receptionist')).toBe(false);
    expect(canSeeClinicMoney('doctor')).toBe(true);
    expect(canSeeClinicMoney('')).toBe(true);
    expect(canViewClinicalChart('assistant')).toBe(true);
    expect(canViewClinicalChart('receptionist')).toBe(false);
    expect(canViewClinicalChart('hacker')).toBe(false);
    expect(canViewClinicalChart('')).toBe(true);
  });

  it('un perfil sin rol se muestra como dueño y uno raro no', () => {
    expect(profileRole('')).toBe('owner');
    expect(profileRole(null)).toBe('owner');
    expect(profileRole('hacker')).toBe('hacker');
  });
});
