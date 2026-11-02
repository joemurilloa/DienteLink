import { describe, expect, it } from 'vitest';
import {
  appointmentBlocksSlot,
  pickBookingPatient,
  type BookingPatientRow,
} from '../lib/approveLegacyMatch';

const ana: BookingPatientRow = {
  id: 'a',
  full_name: 'Ana López',
  phone: '9999-1111',
  email: 'ana@clinica.com',
};

describe('pickBookingPatient', () => {
  it('enlaza por correo aunque el nombre difiera', () => {
    expect(pickBookingPatient([ana], 'Otra', 'ANA@clinica.com', null)).toEqual({ kind: 'one', id: 'a' });
  });

  it('enlaza por teléfono y nombre, ignorando acentos', () => {
    expect(pickBookingPatient([ana], 'ana lopez', null, '(9999) 1111')).toEqual({ kind: 'one', id: 'a' });
  });

  it('con dos coincidencias no elige una', () => {
    const other = { ...ana, id: 'b', email: 'ana@clinica.com' };
    expect(pickBookingPatient([ana, other], 'Ana', 'ana@clinica.com', null)).toEqual({ kind: 'many' });
  });

  it('sin coincidencia no inventa un id', () => {
    expect(pickBookingPatient([ana], 'Beto', 'beto@clinica.com', '0000')).toEqual({ kind: 'none' });
  });
});

describe('appointmentBlocksSlot', () => {
  it('una cita eliminada o cancelada deja el hueco libre', () => {
    expect(appointmentBlocksSlot('Programada')).toBe(true);
    expect(appointmentBlocksSlot('Eliminada')).toBe(false);
    expect(appointmentBlocksSlot('cancelled')).toBe(false);
    expect(appointmentBlocksSlot('rejected')).toBe(false);
  });
});
