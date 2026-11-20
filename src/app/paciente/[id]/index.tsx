import { Link, router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import React, { useCallback } from 'react';
import { Alert, FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { formatearEdadMesesYDias } from '../../../domain';
import { usePatientsViewModel } from '../../../viewmodels/usePatientsViewModel';
import { useResultsViewModel } from '../../../viewmodels/useResultsViewModel';
import { PrimaryButton } from '../../../views/components/PrimaryButton';
import { theme } from '../../../views/theme/tokens';

/** CU-09: Historial del paciente y listado cronológico de consultas. */
export default function PacienteHistorialScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { paciente, historialConsultas, cargando, recargar } = useResultsViewModel(undefined, id);
  const { eliminarPaciente } = usePatientsViewModel();

  useFocusEffect(
    useCallback(() => {
      void recargar();
    }, [recargar]),
  );

  if (cargando && !paciente) {
    return (
      <View style={styles.center}>
        <Text style={styles.muted}>Cargando historial...</Text>
      </View>
    );
  }

  if (!paciente) {
    return (
      <View style={styles.center}>
        <Text style={styles.muted}>Paciente no encontrado.</Text>
      </View>
    );
  }

  const hoyIso = new Date().toISOString().slice(0, 10);
  const edadActual = formatearEdadMesesYDias(paciente.fecha_nacimiento, hoyIso).texto;

  const confirmarEliminacion = () => {
    Alert.alert(
      'Eliminar paciente',
      'Se eliminará este paciente junto con todas sus consultas asociadas.',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: async () => {
            await eliminarPaciente(paciente.id_paciente);
            router.replace('/(tabs)/pacientes');
          },
        },
      ],
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.headerCard}>
        <Text style={styles.folio}>{paciente.folio_clinico}</Text>
        <Text style={styles.name}>{paciente.nombre}</Text>
        <Text style={styles.meta}>
          {paciente.sexo === 'M' ? 'Masculino' : 'Femenino'} · Nac.: {paciente.fecha_nacimiento} ·
          Edad actual: {edadActual}
        </Text>

        <View style={styles.actionsRow}>
          <Link href={`/paciente/${paciente.id_paciente}/editar`} style={styles.actionLink}>
            Editar paciente
          </Link>
          <Pressable onPress={confirmarEliminacion}>
            <Text style={[styles.actionLink, { color: theme.colors.danger }]}>Eliminar</Text>
          </Pressable>
        </View>
      </View>

      <View style={styles.ctaRow}>
        <View style={styles.flex}>
          <PrimaryButton
            title="+ Nueva consulta"
            onPress={() => router.push(`/paciente/${paciente.id_paciente}/nueva-consulta`)}
          />
        </View>
        {historialConsultas.length > 0 ? (
          <View style={styles.flex}>
            <PrimaryButton
              title="Ver curvas"
              variant="secondary"
              onPress={() => router.push(`/paciente/${paciente.id_paciente}/curvas`)}
            />
          </View>
        ) : null}
      </View>

      <Text style={styles.sectionTitle}>Consultas registradas</Text>

      <FlatList
        data={historialConsultas}
        keyExtractor={(item) => item.consulta.id_consulta}
        ListEmptyComponent={
          <Text style={styles.muted}>Aún no hay consultas registradas para este paciente.</Text>
        }
        renderItem={({ item }) => (
          <Link href={`/paciente/consulta/${item.consulta.id_consulta}`} asChild>
            <Pressable style={styles.consultaCard}>
              <View style={styles.cardTop}>
                <Text style={styles.fecha}>{item.consulta.fecha_consulta}</Text>
                {item.consulta.atipico_confirmado ? (
                  <Text style={styles.atipicoBadge}>Atípico confirmado</Text>
                ) : null}
              </View>
              <Text style={styles.meta}>
                Peso: {item.consulta.peso_kg.toFixed(2)} kg · Talla:{' '}
                {item.consulta.longitud_talla_cm.toFixed(1)} cm · PC:{' '}
                {item.consulta.perimetro_cefalico_cm.toFixed(1)} cm
              </Text>
            </Pressable>
          </Link>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: theme.spacing.md, backgroundColor: theme.colors.background },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  headerCard: {
    backgroundColor: theme.colors.surface,
    padding: theme.spacing.md,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    marginBottom: theme.spacing.md,
  },
  folio: { color: theme.colors.primary, fontWeight: '700', fontSize: 13 },
  name: { fontSize: 18, fontWeight: '700', color: theme.colors.text, marginTop: 2 },
  meta: { fontSize: 13, color: theme.colors.textMuted, marginTop: 4 },
  actionsRow: { flexDirection: 'row', gap: 16, marginTop: 10 },
  actionLink: { color: theme.colors.primary, fontWeight: '600', fontSize: 13 },
  ctaRow: { flexDirection: 'row', gap: 10, marginBottom: theme.spacing.md },
  flex: { flex: 1 },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: theme.colors.text, marginBottom: 8 },
  consultaCard: {
    backgroundColor: theme.colors.surface,
    padding: theme.spacing.md,
    borderRadius: theme.radius.sm,
    borderWidth: 1,
    borderColor: theme.colors.border,
    marginBottom: theme.spacing.sm,
  },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  fecha: { fontWeight: '700', color: theme.colors.text, fontSize: 15 },
  atipicoBadge: {
    fontSize: 11,
    fontWeight: '700',
    color: theme.colors.warning,
    backgroundColor: '#FFF3E0',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  muted: { color: theme.colors.textMuted, fontSize: 14 },
});
