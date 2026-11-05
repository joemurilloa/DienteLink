import { describe, expect, it } from 'vitest';
import { isSessionExpiredError } from '../lib/rpcErrors';
import { SaveFailedError } from '../lib/saveFailed';
import { saveFailureReport, scrubSentryEvent } from '../lib/sentryScrub';

describe('registro de un guardado fallido', () => {
  it('manda tabla y código, y deja fuera el texto', () => {
    const nota = 'Alergia a penicilina. Ana Prueba 00001111';
    const err = new SaveFailedError('evolution_notes', { code: '42501', message: nota }, `Error en notas: ${nota}`);
    const report = saveFailureReport(err, 'appointments');
    const packed = JSON.stringify(report);

    expect(report).toEqual({
      message: 'No se guardó',
      tags: {
        fallo: 'guardado',
        tabla: 'evolution_notes',
        codigo: '42501',
        sesion: 'no',
        red: 'no',
      },
    });
    expect(packed).not.toContain('penicilina');
    expect(packed).not.toContain('Ana');
    expect(packed).not.toContain('00001111');
  });

  it('sigue reconociendo la sesión vencida en el aviso del doctor', () => {
    const err = new SaveFailedError('patients', { code: 'PGRST301', message: 'JWT expired' }, 'Error en paciente: JWT expired');
    expect(isSessionExpiredError(err)).toBe(true);
    expect(saveFailureReport(err).tags.sesion).toBe('si');
    expect(saveFailureReport(err).tags.codigo).toBe('PGRST301');
  });

  it('marca la falta de red sin copiar el mensaje', () => {
    const err = new SaveFailedError('patients', new Error('TypeError: Failed to fetch'));
    expect(saveFailureReport(err).tags.red).toBe('si');
    expect(JSON.stringify(saveFailureReport(err))).not.toContain('Failed');
  });

  it('usa la tabla indicada solo si el error no trae la suya', () => {
    expect(saveFailureReport(new Error('x'), 'appointments').tags.tabla).toBe('appointments');
    expect(saveFailureReport(new Error('x'), 'notas de ana').tags.tabla).toBe('desconocida');
  });
});

describe('limpieza del evento', () => {
  it('borra cuerpos, usuario y cualquier frase clínica', () => {
    const event = scrubSentryEvent({
      message: 'No se guardó',
      request: { data: { occupation: 'Alergia a penicilina' } },
      user: { email: 'ana@example.com' },
      extra: { phone: '00001111' },
      breadcrumbs: [{ message: 'nota clínica de Ana' }],
      contexts: {
        browser: { name: 'Brave', version: '1.0' },
        response: { body: 'Alergia a penicilina' },
      },
      tags: { fallo: 'guardado', tabla: 'patients', codigo: '42501', sesion: 'no', red: 'no', nota: 'Ana' },
      exception: { values: [{ value: 'Alergia a penicilina de Ana 00001111', stacktrace: { frames: [{ vars: { nombre: 'Ana' } }] } }] },
      logentry: { message: 'guardar a Ana', params: ['00001111'] },
    });

    expect(event.request).toBeUndefined();
    expect(event.user).toBeUndefined();
    expect(event.extra).toBeUndefined();
    expect(event.breadcrumbs).toEqual([]);
    expect(event.contexts).toEqual({ browser: { name: 'Brave', version: '1.0' } });
    expect(event.message).toBe('No se guardó');
    expect(event.logentry).toEqual({ message: 'error' });
    expect(event.exception?.values?.[0].value).toBe('error');
    expect(event.exception?.values?.[0].stacktrace?.frames?.[0].vars).toBeUndefined();
    expect(event.tags).toEqual({ fallo: 'guardado', tabla: 'patients', codigo: '42501', sesion: 'no', red: 'no' });
    expect(JSON.stringify(event)).not.toContain('penicilina');
    expect(JSON.stringify(event)).not.toContain('example.com');
    expect(JSON.stringify(event)).not.toContain('00001111');
  });
});
