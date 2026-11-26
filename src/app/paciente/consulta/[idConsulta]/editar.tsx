import { useLocalSearchParams } from 'expo-router';
import { useResultsViewModel } from '../../../../viewmodels/useResultsViewModel';
import { ClinicalScreen } from '../../../../views/components/ClinicalScreen';
import { ConsultationEditor } from '../../../../views/components/ConsultationEditor';
import { ScreenFeedback } from '../../../../views/components/KidoLogUI';

export default function EditarConsultaScreen() {
  const { idConsulta } = useLocalSearchParams<{ idConsulta: string }>();
  const { detalle, paciente, cargando, error } = useResultsViewModel(idConsulta);
  return (
    <ClinicalScreen
      title="Editar consulta"
      info={
        detalle && paciente ? 'Guardar correcciones actualiza todos los indicadores.' : undefined
      }
    >
      {detalle && paciente ? (
        <ConsultationEditor
          key={detalle.consulta.id_consulta}
          patient={paciente}
          consultation={detalle.consulta}
        />
      ) : (
        <ScreenFeedback loading={cargando} error={error} empty="Consulta no encontrada." />
      )}
    </ClinicalScreen>
  );
}
