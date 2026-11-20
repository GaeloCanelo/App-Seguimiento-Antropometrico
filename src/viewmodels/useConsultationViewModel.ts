import { useCallback, useState } from 'react';
import {
  PosicionMedicion,
  calcularEdadEnDias,
  evaluarConsultaAntropometrica,
  sugerirPosicionMedicion,
} from '../domain';
import { useApp } from './AppProvider';

export function useConsultationViewModel() {
  const { consultaRepo, pacienteRepo, refrescarPendientes, sincronizarAhora, hayConexion } = useApp();
  const [guardando, setGuardando] = useState(false);

  const sugerirPosicionPorFecha = useCallback(
    (fechaNacimiento: string, fechaConsulta: string): PosicionMedicion => {
      try {
        const dias = calcularEdadEnDias(fechaNacimiento, fechaConsulta);
        return sugerirPosicionMedicion(Math.max(0, dias));
      } catch {
        return 'ACOSTADO';
      }
    },
    [],
  );

  const previsualizarAtipicos = useCallback(
    async (params: {
      id_paciente: string;
      fecha_consulta: string;
      peso_kg: number;
      longitud_talla_cm: number;
      perimetro_cefalico_cm: number;
      posicion_medicion: PosicionMedicion;
    }) => {
      if (!pacienteRepo) throw new Error('Base de datos no disponible.');
      const paciente = await pacienteRepo.obtenerPorId(params.id_paciente);
      if (!paciente) throw new Error('Paciente no encontrado.');

      return evaluarConsultaAntropometrica({
        sexo: paciente.sexo,
        fecha_nacimiento: paciente.fecha_nacimiento,
        fecha_consulta: params.fecha_consulta,
        peso_kg: params.peso_kg,
        longitud_talla_cm: params.longitud_talla_cm,
        perimetro_cefalico_cm: params.perimetro_cefalico_cm,
        posicion_medicion: params.posicion_medicion,
      });
    },
    [pacienteRepo],
  );

  const verificarDuplicadoMismaFecha = useCallback(
    async (idPaciente: string, fechaConsulta: string) => {
      if (!consultaRepo) return false;
      return consultaRepo.existeConsultaEnFecha(idPaciente, fechaConsulta);
    },
    [consultaRepo],
  );

  const guardarConsulta = useCallback(
    async (params: {
      id_paciente: string;
      fecha_consulta: string;
      peso_kg: number;
      longitud_talla_cm: number;
      perimetro_cefalico_cm: number;
      posicion_medicion: PosicionMedicion;
      atipico_confirmado: boolean;
    }) => {
      if (!consultaRepo) throw new Error('Base de datos no disponible.');
      setGuardando(true);
      try {
        const detalle = await consultaRepo.registrar(params);
        await refrescarPendientes();
        if (hayConexion) void sincronizarAhora();
        return detalle;
      } finally {
        setGuardando(false);
      }
    },
    [consultaRepo, hayConexion, refrescarPendientes, sincronizarAhora],
  );

  const corregirConsulta = useCallback(
    async (params: {
      id_consulta: string;
      fecha_consulta: string;
      peso_kg: number;
      longitud_talla_cm: number;
      perimetro_cefalico_cm: number;
      posicion_medicion: PosicionMedicion;
      atipico_confirmado: boolean;
    }) => {
      if (!consultaRepo) throw new Error('Base de datos no disponible.');
      setGuardando(true);
      try {
        const detalle = await consultaRepo.corregir(params);
        await refrescarPendientes();
        if (hayConexion) void sincronizarAhora();
        return detalle;
      } finally {
        setGuardando(false);
      }
    },
    [consultaRepo, hayConexion, refrescarPendientes, sincronizarAhora],
  );

  const eliminarConsulta = useCallback(
    async (idConsulta: string) => {
      if (!consultaRepo) throw new Error('Base de datos no disponible.');
      await consultaRepo.eliminarLogico(idConsulta);
      await refrescarPendientes();
      if (hayConexion) void sincronizarAhora();
    },
    [consultaRepo, hayConexion, refrescarPendientes, sincronizarAhora],
  );

  return {
    guardando,
    sugerirPosicionPorFecha,
    previsualizarAtipicos,
    verificarDuplicadoMismaFecha,
    guardarConsulta,
    corregirConsulta,
    eliminarConsulta,
  };
}
