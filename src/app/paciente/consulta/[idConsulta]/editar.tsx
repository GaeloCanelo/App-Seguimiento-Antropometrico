import { router, useLocalSearchParams } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { PosicionMedicion } from '../../../../domain';
import { useApp } from '../../../../viewmodels/AppProvider';
import { useConsultationViewModel } from '../../../../viewmodels/useConsultationViewModel';
import { FormField } from '../../../../views/components/FormField';
import { PrimaryButton } from '../../../../views/components/PrimaryButton';
import { theme } from '../../../../views/theme/tokens';

/** CU-13: Corregir mediciones de una consulta ya registrada. */
export default function EditarConsultaScreen() {
  const { idConsulta } = useLocalSearchParams<{ idConsulta: string }>();
  const { consultaRepo } = useApp();
  const { guardando, previsualizarAdvertencias, corregirConsulta } = useConsultationViewModel();

  const [idPaciente, setIdPaciente] = useState<string | null>(null);
  const [fechaConsulta, setFechaConsulta] = useState('');
  const [peso, setPeso] = useState('');
  const [talla, setTalla] = useState('');
  const [pc, setPc] = useState('');
  const [posicion, setPosicion] = useState<PosicionMedicion>('ACOSTADO');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!consultaRepo || !idConsulta) return;
    consultaRepo.obtenerDetallePorId(idConsulta).then((d) => {
      if (!d) return;
      setIdPaciente(d.consulta.id_paciente);
      setFechaConsulta(d.consulta.fecha_consulta);
      setPeso(String(d.consulta.peso_kg));
      setTalla(String(d.consulta.longitud_talla_cm));
      setPc(String(d.consulta.perimetro_cefalico_cm));
      setPosicion(d.consulta.posicion_medicion);
    });
  }, [consultaRepo, idConsulta]);

  const guardar = async (atipicoConfirmado: boolean) => {
    if (!idConsulta) return;
    await corregirConsulta({
      id_consulta: idConsulta,
      fecha_consulta: fechaConsulta,
      peso_kg: Number(peso),
      longitud_talla_cm: Number(talla),
      perimetro_cefalico_cm: Number(pc),
      posicion_medicion: posicion,
      atipico_confirmado: atipicoConfirmado,
    });
    router.back();
  };

  const manejarGuardar = async () => {
    if (!idPaciente || !idConsulta) return;
    setError(null);
    try {
      const adv = await previsualizarAdvertencias({
        id_paciente: idPaciente,
        excluir_id_consulta: idConsulta,
        fecha_consulta: fechaConsulta,
        peso_kg: Number(peso),
        longitud_talla_cm: Number(talla),
        perimetro_cefalico_cm: Number(pc),
        posicion_medicion: posicion,
      });

      const mensajes: string[] = [];
      if (adv.hayAtipicos) {
        mensajes.push('Uno o más indicadores superan los límites de plausibilidad de la OMS.');
      }
      if (adv.avisosDecremento.length > 0) {
        mensajes.push(...adv.avisosDecremento);
      }

      if (mensajes.length > 0) {
        Alert.alert(
          adv.hayAtipicos ? 'Valor biológicamente improbable' : 'Aviso de medición longitudinal',
          `${mensajes.join('\n\n')}\n\n¿Deseas corregir o confirmar?`,
          [
            { text: 'Corregir', style: 'cancel' },
            { text: 'Confirmar valor', onPress: () => void guardar(adv.hayAtipicos) },
          ],
        );
      } else {
        await guardar(false);
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error al actualizar consulta.');
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
      {error ? <Text style={styles.errorBox}>{error}</Text> : null}
      <FormField label="Fecha de consulta" value={fechaConsulta} onChangeText={setFechaConsulta} />
      <FormField label="Peso (kg)" value={peso} onChangeText={setPeso} keyboardType="decimal-pad" />
      <FormField
        label="Longitud / Talla (cm)"
        value={talla}
        onChangeText={setTalla}
        keyboardType="decimal-pad"
      />
      <FormField
        label="Perímetro cefálico (cm)"
        value={pc}
        onChangeText={setPc}
        keyboardType="decimal-pad"
      />

      <Text style={styles.label}>Posición de medición</Text>
      <View style={styles.row}>
        {(['ACOSTADO', 'DE_PIE'] as PosicionMedicion[]).map((op) => (
          <Pressable
            key={op}
            onPress={() => setPosicion(op)}
            style={[styles.chip, posicion === op && styles.chipSelected]}
          >
            <Text style={[styles.chipText, posicion === op && styles.chipTextSelected]}>
              {op === 'ACOSTADO' ? 'Acostado' : 'De pie'}
            </Text>
          </Pressable>
        ))}
      </View>

      <PrimaryButton title="Guardar corrección" onPress={manejarGuardar} loading={guardando} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: theme.spacing.md },
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
