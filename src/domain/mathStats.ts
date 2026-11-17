/**
 * Funciones matemáticas puras del método LMS (Lambda, Mu, Sigma) de la OMS
 * y conversión entre puntaje Z y percentil (distribución normal estándar).
 */

/** Aproximación de la función error erf(x) (Abramowitz & Stegun 7.1.26, error < 1.5e-7). */
function erf(x: number): number {
  const sign = x < 0 ? -1 : 1;
  const ax = Math.abs(x);

  const a1 = 0.254829592;
  const a2 = -0.284496736;
  const a3 = 1.421413741;
  const a4 = -1.453152027;
  const a5 = 1.061405429;
  const p = 0.3275911;

  const t = 1 / (1 + p * ax);
  const y = 1 - ((((a5 * t + a4) * t + a3) * t + a2) * t + a1) * t * Math.exp(-ax * ax);
  return sign * y;
}

/** Convierte un puntaje Z al percentil correspondiente en el rango [0, 100]. */
export function zScoreToPercentile(z: number): number {
  const cdf = 0.5 * (1 + erf(z / Math.SQRT2));
  return Math.min(100, Math.max(0, cdf * 100));
}

/** Calcula el valor de la medida correspondiente a un puntaje Z dado (inversa LMS). */
export function valorParaZScoreLMS(z: number, l: number, m: number, s: number): number {
  if (Math.abs(l) < 1e-12) {
    return m * Math.exp(s * z);
  }
  return m * Math.pow(1 + l * s * z, 1 / l);
}

/**
 * Calcula el puntaje Z mediante el método LMS de la OMS.
 * - Soporta L = 0 mediante la expresión logarítmica ln(X/M) / S (CU-16 5a).
 * - Cuando `ajustarExtremos` es true (P_E, P_T, IMC_E), aplica la extrapolación
 *   restringida de la OMS para |Z| > 3, coincidiendo con WHO Anthro (CU-16 5b).
 */
export function calcularZScoreLMS(
  x: number,
  l: number,
  m: number,
  s: number,
  ajustarExtremos: boolean,
): number {
  if (x <= 0 || m <= 0 || s <= 0) {
    throw new Error('Los valores X, M y S deben ser positivos.');
  }

  const lEsCero = Math.abs(l) < 1e-12;
  let z = lEsCero ? Math.log(x / m) / s : (Math.pow(x / m, l) - 1) / (l * s);

  if (ajustarExtremos && Math.abs(z) > 3) {
    if (z > 3) {
      const sd3Pos = valorParaZScoreLMS(3, l, m, s);
      const sd2Pos = valorParaZScoreLMS(2, l, m, s);
      const sd23Pos = sd3Pos - sd2Pos;
      z = 3 + (x - sd3Pos) / sd23Pos;
    } else {
      const sd3Neg = valorParaZScoreLMS(-3, l, m, s);
      const sd2Neg = valorParaZScoreLMS(-2, l, m, s);
      const sd23Neg = sd2Neg - sd3Neg;
      z = -3 + (x - sd3Neg) / sd23Neg;
    }
  }

  return z;
}
