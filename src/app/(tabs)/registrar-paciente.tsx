import { router } from 'expo-router';
import { randomUUID } from 'expo-crypto';
import { useState } from 'react';
import { Pressable, Text } from 'react-native';
import type { Sexo } from '../../domain';
import { usePatientsViewModel } from '../../viewmodels/usePatientsViewModel';
import { useFeedback } from '../../views/components/DialogProvider';
import { FormField } from '../../views/components/FormField';
import { FormScroll, GradientCard, Notice, useUI } from '../../views/components/KidoLogUI';
import { Masthead } from '../../views/components/Masthead';
import { PatientFields } from '../../views/components/PatientFields';
import { PrimaryButton } from '../../views/components/PrimaryButton';
import { erroresPaciente } from '../../views/utils/clinicalFormErrors';
import { mensajeEnEspanol } from '../../views/utils/formErrors';
import { folioAutomatico } from '../../views/utils/patientDisplay';
import { dateFromField } from '../../views/utils/clinicalDisplay';
import { useUnsavedChangesGuard } from '../../views/utils/useUnsavedChangesGuard';

export default function RegistrarPacienteScreen() {
  const ui = useUI();
  const feedback = useFeedback();
  const { registrarPaciente } = usePatientsViewModel();
  const [folio, setFolio] = useState('');
  const [manual, setManual] = useState(false);
  const [nombre, setNombre] = useState('');
  const [sexo, setSexo] = useState<Sexo>('M');
  const [fechaNacimiento, setFechaNacimiento] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [fields, setFields] = useState<Partial<Record<string, string>>>({});
  const [guardando, setGuardando] = useState(false);
  const dirty = Boolean(
    nombre.trim() || fechaNacimiento || sexo !== 'M' || (manual && folio.trim()),
  );
  const { confirmExit, allowAndRun } = useUnsavedChangesGuard(dirty);

  const resetForm = () => {
    setFolio('');
    setManual(false);
    setNombre('');
    setSexo('M');
    setFechaNacimiento('');
  };

  const guardar = async () => {
    setError(null);
    const values = {
      folio_clinico: manual ? folio : folioAutomatico(randomUUID()),
      nombre,
      sexo,
      fecha_nacimiento: dateFromField(fechaNacimiento),
    };
    const issues = erroresPaciente(values);
    setFields(issues);
    if (Object.keys(issues).length) return;
    setGuardando(true);
    try {
      const creado = await registrarPaciente(values);
      resetForm();
      feedback('Paciente registrado.');
      allowAndRun(() => router.push(`/paciente/${creado.id_paciente}`));
    } catch (err: unknown) {
      setError(mensajeEnEspanol(err, 'No fue posible guardar el paciente.'));
    } finally {
      setGuardando(false);
    }
  };

  return (
    <FormScroll
      info="Atención antropométrica de 0 a 60 meses."
      masthead={
        <Masthead
          title="Registrar paciente"
          onBack={() =>
            confirmExit(() => {
              resetForm();
              router.navigate('/(tabs)/pacientes');
            })
          }
          compact
        />
      }
    >
      <GradientCard>
        <Text style={ui.title}>Folio clínico</Text>
        <Text style={ui.muted}>
          {manual ? 'Usa el folio de tu expediente.' : 'Asignación automática al guardar'}
        </Text>
        <Pressable accessibilityRole="button" onPress={() => setManual((value) => !value)}>
          <Text style={ui.link}>
            {manual ? 'Usar asignación automática' : 'Usar un folio propio'}
          </Text>
        </Pressable>
      </GradientCard>
      {manual ? (
        <FormField
          label="Folio clínico"
          icon="lock"
          value={folio}
          error={fields.folio_clinico}
          onChangeText={(value) => {
            setFolio(value);
            setFields((previous) => ({ ...previous, folio_clinico: undefined }));
          }}
        />
      ) : null}
      <PatientFields
        name={nombre}
        nameError={fields.nombre}
        onName={(value) => {
          setNombre(value);
          setFields((previous) => ({ ...previous, nombre: undefined }));
        }}
        sex={sexo}
        onSex={setSexo}
        date={fechaNacimiento}
        dateError={fields.fecha_nacimiento}
        onDate={(value) => {
          setFechaNacimiento(value);
          setFields((previous) => ({ ...previous, fecha_nacimiento: undefined }));
        }}
      />
      {error ? <Notice tone="error">{error}</Notice> : null}
      <PrimaryButton
        title="Guardar paciente"
        variant="accent"
        loading={guardando}
        onPress={guardar}
      />
    </FormScroll>
  );
}
