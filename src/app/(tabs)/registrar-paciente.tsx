import { router } from 'expo-router';
import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Sexo } from '../../domain';
import { usePatientsViewModel } from '../../viewmodels/usePatientsViewModel';
import { FormField } from '../../views/components/FormField';
import { PrimaryButton } from '../../views/components/PrimaryButton';
import { ResponsiveContainer } from '../../views/components/ResponsiveContainer';
import { theme } from '../../views/theme/tokens';

/** CU-07: Registrar nuevo paciente (0 a 60 meses). */
export default function RegistrarPacienteScreen() {
  const { registrarPaciente } = usePatientsViewModel();
  const [folio, setFolio] = useState('');
  const [nombre, setNombre] = useState('');
  const [sexo, setSexo] = useState<Sexo>('M');
  const [fechaNacimiento, setFechaNacimiento] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);

  const guardar = async () => {
    setError(null);
    setGuardando(true);
    try {
      const creado = await registrarPaciente({
        folio_clinico: folio,
        nombre,
        sexo,
        fecha_nacimiento: fechaNacimiento,
      });
      setFolio('');
      setNombre('');
      setFechaNacimiento('');
      router.replace(`/paciente/${creado.id_paciente}`);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'No fue posible guardar el paciente.');
    } finally {
      setGuardando(false);
    }
  };

  return (
    <ResponsiveContainer variant="form">
      {error ? <Text style={styles.errorBox}>{error}</Text> : null}

      <FormField
        label="Folio clínico"
        value={folio}
        onChangeText={setFolio}
        placeholder="Ej. GAM-001"
      />
      <FormField
        label="Nombre completo del infante"
        value={nombre}
        onChangeText={setNombre}
        placeholder="Nombre y apellidos"
      />

      <Text style={styles.label}>Sexo</Text>
      <View style={styles.row}>
        {(['M', 'F'] as Sexo[]).map((op) => (
          <Pressable
            key={op}
            onPress={() => setSexo(op)}
            style={[styles.chip, sexo === op && styles.chipSelected]}
          >
            <Text style={[styles.chipText, sexo === op && styles.chipTextSelected]}>
              {op === 'M' ? 'Masculino' : 'Femenino'}
            </Text>
          </Pressable>
        ))}
      </View>

      <FormField
        label="Fecha de nacimiento"
        value={fechaNacimiento}
        onChangeText={setFechaNacimiento}
        placeholder="AAAA-MM-DD"
        hint="Formato: AAAA-MM-DD (edad permitida: 0 a 60 meses)"
      />

      <PrimaryButton title="Guardar paciente" onPress={guardar} loading={guardando} />
    </ResponsiveContainer>
  );
}

const styles = StyleSheet.create({
  label: { fontSize: 14, fontWeight: '600', color: theme.colors.text, marginBottom: 6 },
  row: { flexDirection: 'row', gap: 10, marginBottom: theme.spacing.md },
  chip: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: theme.radius.sm,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
    alignItems: 'center',
  },
  chipSelected: { borderColor: theme.colors.primary, backgroundColor: theme.colors.primaryLight },
  chipText: { color: theme.colors.text, fontWeight: '600' },
  chipTextSelected: { color: theme.colors.primary },
  errorBox: {
    backgroundColor: '#FDECEA',
    color: theme.colors.danger,
    padding: 12,
    borderRadius: theme.radius.sm,
    marginBottom: theme.spacing.md,
  },
});
