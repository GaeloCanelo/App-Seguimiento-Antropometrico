import { useFocusEffect } from 'expo-router';
import { useCallback, useRef, useState } from 'react';
import type { ConsultaConResultados } from '../data';
import type { Paciente } from '../domain';
import { useApp } from './AppProvider';

const emptyHistory: ConsultaConResultados[] = [];
interface Loaded {
  key: string;
  detalle: ConsultaConResultados | null;
  paciente: Paciente | null;
  historialConsultas: ConsultaConResultados[];
}
export function useResultsViewModel(
  idConsulta?: string,
  idPaciente?: string,
  includeHistory = Boolean(idPaciente),
) {
  const { consultaRepo, pacienteRepo, medico } = useApp();
  const owner = medico?.uid_medico;
  const key = JSON.stringify([owner, idConsulta, idPaciente, includeHistory]);
  const sequence = useRef(0);
  const [loaded, setLoaded] = useState<Loaded | null>(null);
  const [finished, setFinished] = useState<{ key: string; error: string | null } | null>(null);

  const recargar = useCallback(async () => {
    if (!consultaRepo || !pacienteRepo || !owner) return;
    const request = ++sequence.current;
    setFinished(null);
    try {
      const detalle = idConsulta ? await consultaRepo.obtenerDetallePorId(idConsulta) : null;
      const target = idConsulta ? detalle?.consulta.id_paciente : idPaciente;
      const patient = target ? await pacienteRepo.obtenerPorId(target) : null;
      const paciente = patient?.uid_medico === owner ? patient : null;
      let historialConsultas = emptyHistory;
      if (paciente && includeHistory) {
        const list = await consultaRepo.listarPorPaciente(paciente.id_paciente);
        const details = await Promise.all(
          list.map((item) => consultaRepo.obtenerDetallePorId(item.id_consulta)),
        );
        historialConsultas = details.filter((item): item is ConsultaConResultados => item !== null);
      }
      if (request === sequence.current) {
        setLoaded({ key, detalle: paciente ? detalle : null, paciente, historialConsultas });
        setFinished({ key, error: null });
      }
    } catch (reason) {
      if (request === sequence.current) {
        setFinished({
          key,
          error: reason instanceof Error ? reason.message : 'Error al cargar resultados.',
        });
      }
    }
  }, [consultaRepo, idConsulta, idPaciente, includeHistory, key, owner, pacienteRepo]);

  useFocusEffect(
    useCallback(() => {
      void recargar();
      return () => {
        sequence.current += 1;
      };
    }, [recargar]),
  );

  const current = loaded?.key === key ? loaded : null;
  return {
    detalle: current?.detalle ?? null,
    paciente: current?.paciente ?? null,
    historialConsultas: current?.historialConsultas ?? emptyHistory,
    cargando: finished?.key !== key,
    error: finished?.key === key ? finished.error : null,
    recargar,
  };
}
