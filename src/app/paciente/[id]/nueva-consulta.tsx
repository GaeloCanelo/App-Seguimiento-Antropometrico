import { router, useLocalSearchParams } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { PosicionMedicion } from '../../../domain';
import { useApp } from '../../../viewmodels/AppProvider';
import { useConsultationViewModel } from '../../../viewmodels/useConsultationViewModel';
import { FormField } from '../../../views/components/FormField';
import { PrimaryButton } from '../../../views/components/PrimaryButton';
import { theme } from '../../../views/theme/tokens';

/** CU-12 + CU-15: Captura de consulta con sugerencia de posición y confirmación de atípicos. */
export default function NuevaConsultaScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { pacienteRepo } = useApp();
  const {
    guardando,
    sugerirPosicionPorFecha,
    previsualizarAtipicos,
    verificarDuplicadoMismaFecha,
    guardarConsulta,
  } = useConsultationViewModel();

  const [fechaNacimiento, setFechaNacimiento] = useState<string | null>(null);
  const [fechaConsulta, setFechaConsulta] = useState(() => new Date().toISOString().slice(0, 10));
  const [peso, setPeso] = useState('');
  const [talla, setTalla] = useState('');
  const [pc, setPc] = useState('');
  const [posicion, setPosicion] = useState<PosicionMedicion>('ACOSTADO');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!pacienteRepo || !id) return;
    pacienteRepo.obtenerPorId(id).then((p) => {
      if (!p) return;
      setFechaNacimiento(p.fecha_nacimiento);
      setPosicion(sugerirPosicionPorFecha(p.fecha_nacimiento, fechaConsulta));
    });
  }, [fechaConsulta, id, pacienteRepo, sugerirPosicionPorFecha]);

  const confirmarYGuardar = async (atipicoConfirmado: boolean) => {
    if (!id) return;
    const detalle = await guardarConsulta({
      id_paciente: id,
      fecha_consulta: fechaConsulta,
      peso_kg: Number(peso),
      longitud_talla_cm: Number(talla),
      perimetro_cefalico_cm: Number(pc),
      posicion_medicion: posicion,
      atipico_confirmado: atipicoConfirmado,
    });
    router.replace(`/paciente/consulta/${detalle.consulta.id_consulta}`);
  };

  const manejarEnvio = async () => {
    if (!id || !fechaNacimiento) return;
    setError(null);
    try {
      const payload = {
        id_paciente: id,
        fecha_consulta: fechaConsulta,
        peso_kg: Number(peso),
        longitud_talla_cm: Number(talla),
        perimetro_cefalico_cm: Number(pc),
        posicion_medicion: posicion,
      };
      const evalPrevia = await previsualizarAtipicos(payload);

      const continuarDespuesDeDuplicado = async () => {
        if (evalPrevia.hay_atipicos) {
          Alert.alert(
            'Valor biológicamente improbable',
            'Uno o más indicadores superan los límites de plausibilidad de la OMS. ¿Deseas corregir o confirmar el valor?',
            [
              { text: 'Corregir', style: 'cancel' },
              {
                text: 'Confirmar valor',
                onPress: () => void confirmarYGuardar(true),
              },
            ],
          );
        } else {
          await confirmarYGuardar(false);
        }
      };

      const hayDuplicado = await verificarDuplicadoMismaFecha(id, fechaConsulta);
      if (hayDuplicado) {
        Alert.alert(
          'Consulta duplicada',
          `Ya existe una consulta registrada para el ${fechaConsulta}. ¿Deseas continuar de todos modos?`,
          [
            { text: 'Cancelar', style: 'cancel' },
            { text: 'Guardar', onPress: () => void continuarDespuesDeDuplicado() },
          ],
        );
      } else {
        await continuarDespuesDeDuplicado();
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Verifica los datos capturados.');
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
      {error ? <Text style={styles.errorBox}>{error}</Text> : null}

      <FormField
        label="Fecha de consulta"
        value={fechaConsulta}
        onChangeText={setFechaConsulta}
        placeholder="AAAA-MM-DD"
      />
      <FormField
        label="Peso (kg)"
        value={peso}
        onChangeText={setPeso}
        keyboardType="decimal-pad"
        placeholder="Ej. 10.50"
        hint="Rango permitido: 0.5 a 50 kg (hasta 2 decimales)"
      />
      <FormField
        label="Longitud / Talla (cm)"
        value={talla}
        onChangeText={setTalla}
        keyboardType="decimal-pad"
        placeholder="Ej. 82.0"
        hint="Rango permitido: 35 a 140 cm (hasta 1 decimal)"
      />
      <FormField
        label="Perímetro cefálico (cm)"
        value={pc}
        onChangeText={setPc}
        keyboardType="decimal-pad"
        placeholder="Ej. 46.0"
        hint="Rango permitido: 25 a 60 cm (hasta 1 decimal)"
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

      <PrimaryButton title="Calcular y guardar consulta" onPress={manejarEnvio} loading={guardando} />
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
