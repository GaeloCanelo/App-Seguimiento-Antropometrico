import { useCallback, useEffect, useState } from 'react';
import { ConsultaConResultados } from '../data';
import { Paciente } from '../domain';
import { useApp } from './AppProvider';

export function useResultsViewModel(idConsulta?: string, idPaciente?: string) {
  const { consultaRepo, pacienteRepo } = useApp();
  const [detalle, setDetalle] = useState<ConsultaConResultados | null>(null);
  const [paciente, setPaciente] = useState<Paciente | null>(null);
  const [historialConsultas, setHistorialConsultas] = useState<ConsultaConResultados[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const recargar = useCallback(async () => {
    if (!consultaRepo || !pacienteRepo) return;
    setCargando(true);
    setError(null);
    try {
      let targetPacienteId = idPaciente;
      if (idConsulta) {
        const d = await consultaRepo.obtenerDetallePorId(idConsulta);
        setDetalle(d);
        if (d) targetPacienteId = d.consulta.id_paciente;
      }

      if (targetPacienteId) {
        const pac = await pacienteRepo.obtenerPorId(targetPacienteId);
        setPaciente(pac);
        const lista = await consultaRepo.listarPorPaciente(targetPacienteId);
        const detalles = await Promise.all(
          lista.map((c) => consultaRepo.obtenerDetallePorId(c.id_consulta)),
        );
        setHistorialConsultas(
          detalles.filter((x): x is ConsultaConResultados => x !== null),
        );
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error al cargar resultados.');
    } finally {
      setCargando(false);
    }
  }, [consultaRepo, idConsulta, idPaciente, pacienteRepo]);

  useEffect(() => {
    recargar();
  }, [recargar]);

  return {
    detalle,
    paciente,
    historialConsultas,
    cargando,
    error,
    recargar,
  };
}
