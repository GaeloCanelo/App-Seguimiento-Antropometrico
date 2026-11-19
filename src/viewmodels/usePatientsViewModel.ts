import { useCallback, useEffect, useState } from 'react';
import { Paciente, Sexo } from '../domain';
import { useApp } from './AppProvider';

export function usePatientsViewModel() {
  const { medico, pacienteRepo, refrescarPendientes, sincronizarAhora, hayConexion } = useApp();
  const [pacientes, setPacientes] = useState<Paciente[]>([]);
  const [busqueda, setBusqueda] = useState('');
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const cargarPacientes = useCallback(
    async (filtro = busqueda) => {
      if (!pacienteRepo || !medico) {
        setPacientes([]);
        return;
      }
      setCargando(true);
      setError(null);
      try {
        const lista = await pacienteRepo.buscar(medico.uid_medico, filtro);
        setPacientes(lista);
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : 'Error al consultar pacientes.');
      } finally {
        setCargando(false);
      }
    },
    [busqueda, medico, pacienteRepo],
  );

  useEffect(() => {
    cargarPacientes(busqueda);
  }, [busqueda, cargarPacientes]);

  const registrarPaciente = useCallback(
    async (params: {
      folio_clinico: string;
      nombre: string;
      sexo: Sexo;
      fecha_nacimiento: string;
    }) => {
      if (!pacienteRepo || !medico) {
        throw new Error('La sesión o base de datos no está lista.');
      }
      const nuevo = await pacienteRepo.registrar({
        uid_medico: medico.uid_medico,
        ...params,
      });
      await refrescarPendientes();
      if (hayConexion) void sincronizarAhora();
      await cargarPacientes(busqueda);
      return nuevo;
    },
    [busqueda, cargarPacientes, hayConexion, medico, pacienteRepo, refrescarPendientes, sincronizarAhora],
  );

  const actualizarPaciente = useCallback(
    async (params: {
      id_paciente: string;
      folio_clinico: string;
      nombre: string;
      sexo: Sexo;
      fecha_nacimiento: string;
    }) => {
      if (!pacienteRepo) throw new Error('Base de datos no disponible.');
      const actualizado = await pacienteRepo.actualizar(params);
      await refrescarPendientes();
      if (hayConexion) void sincronizarAhora();
      await cargarPacientes(busqueda);
      return actualizado;
    },
    [busqueda, cargarPacientes, hayConexion, pacienteRepo, refrescarPendientes, sincronizarAhora],
  );

  const eliminarPaciente = useCallback(
    async (idPaciente: string) => {
      if (!pacienteRepo) throw new Error('Base de datos no disponible.');
      await pacienteRepo.eliminarLogico(idPaciente);
      await refrescarPendientes();
      if (hayConexion) void sincronizarAhora();
      await cargarPacientes(busqueda);
    },
    [busqueda, cargarPacientes, hayConexion, pacienteRepo, refrescarPendientes, sincronizarAhora],
  );

  return {
    pacientes,
    busqueda,
    setBusqueda,
    cargando,
    error,
    cargarPacientes,
    registrarPaciente,
    actualizarPaciente,
    eliminarPaciente,
  };
}
