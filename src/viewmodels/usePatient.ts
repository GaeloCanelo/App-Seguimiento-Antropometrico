import { useEffect, useState } from 'react';
import type { Paciente } from '../domain';
import { useApp } from './AppProvider';

export function usePatient(id: string | undefined) {
  const { pacienteRepo, medico, listo } = useApp();
  const [result, setResult] = useState<{
    id: string;
    owner: string;
    patient: Paciente | null;
    error: string | null;
  } | null>(null);

  useEffect(() => {
    if (!pacienteRepo || !id || !medico) return;
    let current = true;
    const owner = medico.uid_medico;
    pacienteRepo.obtenerPorId(id).then(
      (patient) => {
        if (current)
          setResult({
            id,
            owner,
            patient: patient?.uid_medico === owner ? patient : null,
            error: null,
          });
      },
      (reason: unknown) => {
        if (current)
          setResult({
            id,
            owner,
            patient: null,
            error: reason instanceof Error ? reason.message : 'No fue posible cargar el paciente.',
          });
      },
    );
    return () => {
      current = false;
    };
  }, [id, medico, pacienteRepo]);

  const match = result && result.id === id && result.owner === medico?.uid_medico ? result : null;
  return {
    patient: match?.patient ?? null,
    error: match?.error ?? null,
    loading: Boolean(id) && (!listo || Boolean(pacienteRepo && medico && !match)),
  };
}
