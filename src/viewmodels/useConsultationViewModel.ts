import { useCallback, useState } from 'react';
import {
  PosicionMedicion,
  calcularEdadEnDias,
  detectarDecrementoMedida,
  evaluarConsultaAntropometrica,
  sugerirPosicionMedicion,
} from '../domain';
import { useApp } from './AppProvider';

export interface ResultadoPrevisualizacion {
  hayAtipicos: boolean;
  avisosDecremento: string[];
}

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

  /**
   * Valida la captura y detecta tanto valores atípicos OMS (HU-13)
   * como decrementos > 1 cm respecto a la consulta previa (CU-15 4b).
   */
  const previsualizarAdvertencias = useCallback(
    async (params: {
      id_paciente: string;
      excluir_id_consulta?: string;
      fecha_consulta: string;
      peso_kg: number;
      longitud_talla_cm: number;
      perimetro_cefalico_cm: number;
      posicion_medicion: PosicionMedicion;
    }): Promise<ResultadoPrevisualizacion> => {
      if (!pacienteRepo || !consultaRepo) {
        throw new Error('Base de datos no disponible.');
      }
      const paciente = await pacienteRepo.obtenerPorId(params.id_paciente);
      if (!paciente) throw new Error('Paciente no encontrado.');

      const evalSalida = evaluarConsultaAntropometrica({
        sexo: paciente.sexo,
        fecha_nacimiento: paciente.fecha_nacimiento,
        fecha_consulta: params.fecha_consulta,
        peso_kg: params.peso_kg,
        longitud_talla_cm: params.longitud_talla_cm,
        perimetro_cefalico_cm: params.perimetro_cefalico_cm,
        posicion_medicion: params.posicion_medicion,
      });

      const historial = await consultaRepo.listarPorPaciente(params.id_paciente);
      const previa = historial.find(
        (c) =>
          c.id_consulta !== params.excluir_id_consulta &&
          c.fecha_consulta < params.fecha_consulta,
      );

      const avisosDecremento = previa
        ? detectarDecrementoMedida(
            {
              longitud_talla_cm: previa.longitud_talla_cm,
              perimetro_cefalico_cm: previa.perimetro_cefalico_cm,
            },
            {
              longitud_talla_cm: params.longitud_talla_cm,
              perimetro_cefalico_cm: params.perimetro_cefalico_cm,
            },
          )
        : [];

      return {
        hayAtipicos: evalSalida.hay_atipicos,
        avisosDecremento,
      };
    },
    [consultaRepo, pacienteRepo],
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
    previsualizarAdvertencias,
    verificarDuplicadoMismaFecha,
    guardarConsulta,
    corregirConsulta,
    eliminarConsulta,
  };
}
