import { parseIsoDateUtc } from '../src/domain';
import {
  dateForField,
  dateFromField,
  measurementFromField,
} from '../src/views/utils/clinicalDisplay';

describe('captura clínica', () => {
  it('convierte DD/MM/AAAA y conserva las fechas ISO admitidas por los formularios anteriores', () => {
    expect(dateFromField(' 8/5/2025 ')).toBe('2025-05-08');
    expect(dateFromField('2025-05-08')).toBe('2025-05-08');
    expect(dateForField('2025-05-08')).toBe('08/05/2025');
  });
  it('deja que el validador clínico rechace fechas imposibles', () => {
    expect(parseIsoDateUtc(dateFromField('31/04/2025'))).toBeNull();
  });
  it('admite el decimal del teclado en español y rechaza texto, vacíos y separadores repetidos', () => {
    expect(measurementFromField('10,50')).toBe(10.5);
    expect(measurementFromField('82.0')).toBe(82);
    for (const text of ['', '1,2.3', '12 kg', '1e2']) expect(measurementFromField(text)).toBeNaN();
  });
});
