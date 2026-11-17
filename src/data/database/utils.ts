/** Normaliza cadenas eliminando acentos, espacios extremos y mayúsculas para búsqueda/unicidad. */
export function normalizarTextoBusqueda(texto: string): string {
  return texto
    .trim()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
}

export function ahoraUtcIso(): string {
  return new Date().toISOString();
}

export type GeneradorUuid = () => string;

/** Generador UUID v4 compatible con Web Crypto / Expo Crypto / fallback RFC4122. */
export function generarUuidV4PorDefecto(): string {
  const gCrypto = globalThis.crypto as { randomUUID?: () => string } | undefined;
  if (gCrypto?.randomUUID) {
    return gCrypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}
