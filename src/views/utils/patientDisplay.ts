import { calcularEdadEnDias, formatearEdadMesesYDias, parseIsoDateUtc } from '../../domain';

export function folioAutomatico(uuid: string): string {
  return uuid.replaceAll('-', '').slice(-12).toUpperCase();
}

// The original identifier is kept in storage and in existing exports.
export function folioVisible(folio: string): string {
  return /^KID-[0-9A-F]{12}$/.test(folio) ? folio.slice(4) : folio;
}

export function edadPaciente(
  birth: string,
  today = new Date().toISOString().slice(0, 10),
): string | null {
  const birthDate = parseIsoDateUtc(birth);
  const endDate = parseIsoDateUtc(today);
  if (!birthDate || !endDate || birthDate > endDate) return null;
  const { meses, dias, texto } = formatearEdadMesesYDias(birth, today);
  if (!meses) {
    const total = calcularEdadEnDias(birth, today);
    return `${total} ${total === 1 ? 'día' : 'días'}`;
  }
  return dias > 0 ? texto : `${meses} ${meses === 1 ? 'mes' : 'meses'}`;
}
