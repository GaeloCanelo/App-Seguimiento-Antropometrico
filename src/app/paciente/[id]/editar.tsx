import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Pressable, Text } from 'react-native';
import type { Paciente, Sexo } from '../../../domain';
import { usePatient } from '../../../viewmodels/usePatient';
import { usePatientsViewModel } from '../../../viewmodels/usePatientsViewModel';
import { ClinicalScreen } from '../../../views/components/ClinicalScreen';
import { useFeedback } from '../../../views/components/DialogProvider';
import { FormField } from '../../../views/components/FormField';
import { GradientCard, Notice, ScreenFeedback, useUI } from '../../../views/components/KidoLogUI';
import { PatientFields } from '../../../views/components/PatientFields';
import { PrimaryButton } from '../../../views/components/PrimaryButton';
import { erroresPaciente } from '../../../views/utils/clinicalFormErrors';
import { mensajeEnEspanol } from '../../../views/utils/formErrors';
import { folioVisible } from '../../../views/utils/patientDisplay';
import { dateForField, dateFromField } from '../../../views/utils/clinicalDisplay';

export default function EditarPacienteScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { patient, loading, error } = usePatient(id);
  return (
    <ClinicalScreen
      title="Editar paciente"
      info={patient ? 'Cambios en sexo o nacimiento recalculan consultas.' : undefined}
    >
      {patient ? (
        <Editor key={patient.id_paciente} patient={patient} />
      ) : (
        <ScreenFeedback loading={loading} error={error} empty="Paciente no encontrado." />
      )}
    </ClinicalScreen>
  );
}

function Editor({ patient }: { patient: Paciente }) {
  const feedback = useFeedback();
  const ui = useUI();
  const { actualizarPaciente } = usePatientsViewModel();
  const [folio, setFolio] = useState(patient.folio_clinico);
  const [editarFolio, setEditarFolio] = useState(false);
  const [nombre, setNombre] = useState(patient.nombre);
  const [sexo, setSexo] = useState<Sexo>(patient.sexo);
  const [fecha, setFecha] = useState(dateForField(patient.fecha_nacimiento));
  const [error, setError] = useState<string | null>(null);
  const [fields, setFields] = useState<Partial<Record<string, string>>>({});
  const [guardando, setGuardando] = useState(false);

  const guardar = async () => {
    setError(null);
    const values = {
      folio_clinico: editarFolio ? folio : patient.folio_clinico,
      nombre,
      sexo,
      fecha_nacimiento: dateFromField(fecha),
    };
    const issues = erroresPaciente(values);
    setFields(issues);
    if (Object.keys(issues).length) return;
    setGuardando(true);
    try {
      await actualizarPaciente({
        id_paciente: patient.id_paciente,
        ...values,
      });
      feedback('Cambios del paciente guardados.');
      router.dismissTo(`/paciente/${patient.id_paciente}`);
    } catch (reason) {
      setError(mensajeEnEspanol(reason, 'No fue posible actualizar al paciente.'));
    } finally {
      setGuardando(false);
    }
  };

  return (
    <>
      <GradientCard>
        <Text style={ui.title}>Folio {folioVisible(patient.folio_clinico)}</Text>
        <Pressable accessibilityRole="button" onPress={() => setEditarFolio((value) => !value)}>
          <Text style={ui.link}>
            {editarFolio ? 'Conservar folio actual' : 'Corregir folio clínico'}
          </Text>
        </Pressable>
      </GradientCard>
      {editarFolio ? (
        <FormField
          label="Folio clínico"
          value={folio}
          error={fields.folio_clinico}
          onChangeText={(value) => {
            setFolio(value);
            setFields((previous) => ({ ...previous, folio_clinico: undefined }));
          }}
        />
      ) : null}
      <PatientFields
        editing
        name={nombre}
        nameError={fields.nombre}
        onName={(value) => {
          setNombre(value);
          setFields((previous) => ({ ...previous, nombre: undefined }));
        }}
        sex={sexo}
        onSex={setSexo}
        date={fecha}
        dateError={fields.fecha_nacimiento}
        onDate={(value) => {
          setFecha(value);
          setFields((previous) => ({ ...previous, fecha_nacimiento: undefined }));
        }}
      />
      {error ? <Notice tone="error">{error}</Notice> : null}
      <PrimaryButton title="Guardar cambios" loading={guardando} onPress={guardar} />
    </>
  );
}
