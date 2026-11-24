import { EDAD_MAX_DIAS_OMS, parseIsoDateUtc } from '../../domain';

export interface DateBounds {
  minimum: string;
  maximum: string;
}

export function todayForPicker(now = new Date()): string {
  const local = `${String(now.getFullYear()).padStart(4, '0')}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  const utc = now.toISOString().slice(0, 10);
  return local < utc ? local : utc;
}

function addUtcDays(iso: string, days: number): string {
  const date = parseIsoDateUtc(iso);
  if (!date) throw new Error('Fecha inválida para calcular los límites del selector.');
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

export function birthDateBounds(now = new Date()): DateBounds {
  return {
    minimum: addUtcDays(now.toISOString().slice(0, 10), -EDAD_MAX_DIAS_OMS),
    maximum: todayForPicker(now),
  };
}

export function consultationDateBounds(birth: string, now = new Date()): DateBounds | null {
  if (!parseIsoDateUtc(birth)) return null;
  const today = todayForPicker(now);
  if (birth > today) return null;
  const lastAllowed = addUtcDays(birth, EDAD_MAX_DIAS_OMS);
  return { minimum: birth, maximum: lastAllowed < today ? lastAllowed : today };
}

export function isDateWithinBounds(iso: string, bounds: DateBounds): boolean {
  return Boolean(parseIsoDateUtc(iso)) && iso >= bounds.minimum && iso <= bounds.maximum;
}

export function datePickerValue(iso: string) {
  return new Date(`${iso}T12:00:00.000Z`);
}

export function isoFromPicker(date: Date): string {
  return date.toISOString().slice(0, 10);
}
