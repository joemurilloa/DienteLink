import { describe, expect, it } from 'vitest';
import {
  canApproveBookingRequests,
  canSeeClinicMoney,
  canViewClinicalChart,
  normalizeClinicRole,
  profileRole,
  roleLabel,
} from '../lib/roles';

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

  it('no promueve un rol desconocido ni vacío', () => {
    expect(normalizeClinicRole('hacker')).toBeNull();
    expect(normalizeClinicRole('')).toBeNull();
    expect(normalizeClinicRole(null)).toBeNull();
  });
});

describe('privilegios fail-closed', () => {
  it('niega dinero y clínica sin rol canónico', () => {
    expect(canSeeClinicMoney('')).toBe(false);
    expect(canSeeClinicMoney(null)).toBe(false);
    expect(canSeeClinicMoney('hacker')).toBe(false);
    expect(canViewClinicalChart('')).toBe(false);
    expect(canViewClinicalChart('hacker')).toBe(false);
  });

  it('respeta la matriz de roles', () => {
    expect(canSeeClinicMoney('doctor')).toBe(true);
    expect(canSeeClinicMoney('assistant')).toBe(false);
    expect(canSeeClinicMoney('receptionist')).toBe(false);
    expect(canViewClinicalChart('assistant')).toBe(true);
    expect(canViewClinicalChart('receptionist')).toBe(false);
    expect(canApproveBookingRequests('owner')).toBe(true);
    expect(canApproveBookingRequests('receptionist')).toBe(true);
    expect(canApproveBookingRequests('assistant')).toBe(false);
    expect(canApproveBookingRequests('')).toBe(false);
  });
});

describe('etiquetas', () => {
  it('profileRole sigue mostrando dueño sin rol; roleLabel no inventa privilegios', () => {
    expect(profileRole('')).toBe('owner');
    expect(profileRole(null)).toBe('owner');
    expect(profileRole('hacker')).toBe('hacker');
    expect(roleLabel('')).toBe('Sin rol');
    expect(roleLabel('owner')).toBe('Propietario');
  });
});
