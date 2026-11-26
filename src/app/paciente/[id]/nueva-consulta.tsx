import { useLocalSearchParams } from 'expo-router';
import { usePatient } from '../../../viewmodels/usePatient';
import { ClinicalScreen } from '../../../views/components/ClinicalScreen';
import { ConsultationEditor } from '../../../views/components/ConsultationEditor';
import { ScreenFeedback } from '../../../views/components/KidoLogUI';

export default function NuevaConsultaScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { patient, loading, error } = usePatient(id);
  return (
    <ClinicalScreen
      title="Nueva consulta"
      info={patient ? 'Si es menor de 24 meses, se sugiere medir acostado.' : undefined}
    >
      {patient ? (
        <ConsultationEditor key={patient.id_paciente} patient={patient} />
      ) : (
        <ScreenFeedback loading={loading} error={error} empty="Paciente no encontrado." />
      )}
    </ClinicalScreen>
  );
}
