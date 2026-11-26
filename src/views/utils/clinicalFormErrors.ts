import {
  validarMedicionesConsulta,
  validarPacienteDatos,
  type EntradaConsultaValidacion,
} from '../../domain';

export function erroresPaciente(input: Parameters<typeof validarPacienteDatos>[0]) {
  return Object.fromEntries(
    validarPacienteDatos(input).map((issue) => [
      issue.campo,
      issue.campo === 'fecha_nacimiento' && !input.fecha_nacimiento
        ? 'Selecciona la fecha de nacimiento.'
        : issue.mensaje,
    ]),
  );
}

const measureKeys = ['peso_kg', 'longitud_talla_cm', 'perimetro_cefalico_cm'] as const;
export type MeasurementKey = (typeof measureKeys)[number];

export function erroresConsulta(
  input: EntradaConsultaValidacion,
  raw: Record<MeasurementKey, string>,
) {
  const errors: Record<string, string> = {};
  for (const { campo, mensaje } of validarMedicionesConsulta(input)) {
    if (!(campo in errors)) errors[campo] = mensaje.replace(/(?<=\d)\.(?=\d)/g, ',');
  }
  for (const field of measureKeys) {
    if (!errors[field]) continue;
    if (!raw[field].trim()) errors[field] = 'Escribe una medida.';
    else if (!Number.isFinite(input[field])) errors[field] = 'Usa un número. Ejemplo: 10,5.';
  }
  if (!input.fecha_consulta) errors.fecha_consulta = 'Selecciona la fecha de consulta.';
  return errors;
}
