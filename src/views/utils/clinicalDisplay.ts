import { parseIsoDateUtc } from '../../domain';

const formatter = new Intl.DateTimeFormat('es-MX', {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
  timeZone: 'UTC',
});

export function displayDate(iso: string): string {
  const date = parseIsoDateUtc(iso);
  return date ? formatter.format(date) : iso;
}

export function dateForField(iso: string): string {
  const parts = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  return parts ? `${parts[3]}/${parts[2]}/${parts[1]}` : iso;
}

export function dateFromField(value: string): string {
  const text = value.trim();
  const parts = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(text);
  return parts ? `${parts[3]}-${parts[2].padStart(2, '0')}-${parts[1].padStart(2, '0')}` : text;
}

export function measurementFromField(value: string): number {
  const text = value.trim().replace(',', '.');
  return /^\d+(?:\.\d*)?$|^\.\d+$/.test(text) ? Number(text) : Number.NaN;
}
