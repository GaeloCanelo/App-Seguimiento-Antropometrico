import { router } from 'expo-router';
import { useRef, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import type { Consulta, Paciente, PosicionMedicion } from '../../domain';
import { formatearEdadMesesYDias } from '../../domain';
import { useConsultationViewModel } from '../../viewmodels/useConsultationViewModel';
import { useThemedStyles } from '../theme/ThemeProvider';
import type { KidoLogTheme } from '../theme/tokens';
import { erroresConsulta } from '../utils/clinicalFormErrors';
import { mensajeEnEspanol } from '../utils/formErrors';
import { folioVisible } from '../utils/patientDisplay';
import { dateFromField, displayDate, measurementFromField } from '../utils/clinicalDisplay';
import { consultationDateBounds, todayForPicker } from '../utils/dateBounds';
import { useDialog, useFeedback } from './DialogProvider';
import { DateField } from './DateField';
import { DesignSvg } from './DesignSvg';
import { FormField } from './FormField';
import { Choices, GradientCard, Notice, useUI } from './KidoLogUI';
import { PrimaryButton } from './PrimaryButton';

const positions = [
  { value: 'ACOSTADO', label: 'Acostado' },
  { value: 'DE_PIE', label: 'De pie' },
] as const;

function confirm(
  dialog: ReturnType<typeof useDialog>,
  title: string,
  description: string,
  action: string,
): Promise<boolean> {
  return new Promise((resolve) => {
    dialog(title, description, [
      { text: 'Cancelar', style: 'cancel', onPress: () => resolve(false) },
      { text: action, onPress: () => resolve(true) },
    ]);
  });
}

export function ConsultationEditor({
  patient,
  consultation,
}: {
  patient: Paciente;
  consultation?: Consulta;
}) {
  const styles = useThemedStyles(createStyles);
  const dialog = useDialog();
  const feedback = useFeedback();
  const ui = useUI();
  const {
    sugerirPosicionPorFecha,
    previsualizarAdvertencias,
    verificarDuplicadoMismaFecha,
    guardarConsulta,
    corregirConsulta,
  } = useConsultationViewModel();
  const bounds = consultationDateBounds(patient.fecha_nacimiento);
  const [date, setDate] = useState(
    () =>
      consultation?.fecha_consulta ?? (bounds?.maximum === todayForPicker() ? bounds.maximum : ''),
  );
  const [peso, setPeso] = useState(consultation ? String(consultation.peso_kg) : '');
  const [talla, setTalla] = useState(consultation ? String(consultation.longitud_talla_cm) : '');
  const [pc, setPc] = useState(consultation ? String(consultation.perimetro_cefalico_cm) : '');
  const [manualPosition, setPosition] = useState<PosicionMedicion | null>(
    consultation?.posicion_medicion ?? null,
  );
  const [error, setError] = useState<string | null>(null);
  const [fields, setFields] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const submitting = useRef(false);
  const isoDate = dateFromField(date);
  const position = manualPosition ?? sugerirPosicionPorFecha(patient.fecha_nacimiento, isoDate);
  const age = formatearEdadMesesYDias(
    patient.fecha_nacimiento,
    new Date().toISOString().slice(0, 10),
  ).texto;

  function clearField(field: string) {
    setFields((previous) => {
      const next = { ...previous };
      delete next[field];
      return next;
    });
    setError(null);
  }

  const submit = async () => {
    if (submitting.current) return;
    setError(null);
    const values = {
      fecha_consulta: isoDate,
      peso_kg: measurementFromField(peso),
      longitud_talla_cm: measurementFromField(talla),
      perimetro_cefalico_cm: measurementFromField(pc),
      posicion_medicion: position,
    };
    const issues = erroresConsulta(
      { ...values, fecha_nacimiento: patient.fecha_nacimiento },
      { peso_kg: peso, longitud_talla_cm: talla, perimetro_cefalico_cm: pc },
    );
    setFields(issues);
    if (Object.keys(issues).length) return;
    submitting.current = true;
    setBusy(true);
    try {
      const id_paciente = patient.id_paciente;
      const preview = await previsualizarAdvertencias({
        id_paciente,
        excluir_id_consulta: consultation?.id_consulta,
        ...values,
      });
      if (
        consultation?.fecha_consulta !== isoDate &&
        (await verificarDuplicadoMismaFecha(id_paciente, isoDate))
      ) {
        if (
          !(await confirm(
            dialog,
            'Consulta duplicada',
            `Ya existe una consulta registrada para el ${displayDate(isoDate)}. ¿Deseas continuar de todos modos?`,
            'Continuar',
          ))
        )
          return;
      }
      const warnings: string[] = [];
      if (preview.hayAtipicos) {
        warnings.push(
          'Uno o más indicadores superan los límites de plausibilidad de la OMS.',
        );
      }
      if (preview.avisosDecremento.length > 0) {
        warnings.push(...preview.avisosDecremento);
      }
      if (
        warnings.length > 0 &&
        !(await confirm(
          dialog,
          preview.hayAtipicos
            ? 'Valor biológicamente improbable'
            : 'Aviso de medición longitudinal',
          `${warnings.join('\n\n')}\n\nPuedes corregir los datos o confirmar el valor.`,
          'Confirmar valor',
        ))
      )
        return;

      if (consultation) {
        await corregirConsulta({
          id_consulta: consultation.id_consulta,
          ...values,
          atipico_confirmado: preview.hayAtipicos,
        });
        feedback('Consulta actualizada.');
        router.dismissTo(`/paciente/consulta/${consultation.id_consulta}`);
      } else {
        const saved = await guardarConsulta({
          id_paciente,
          ...values,
          atipico_confirmado: preview.hayAtipicos,
        });
        feedback('Consulta guardada.');
        router.replace(`/paciente/consulta/${saved.consulta.id_consulta}`);
      }
    } catch (reason) {
      setError(mensajeEnEspanol(reason, 'No fue posible guardar la consulta. Intenta de nuevo.'));
    } finally {
      submitting.current = false;
      setBusy(false);
    }
  };

  return (
    <>
      <GradientCard style={ui.row}>
        {!consultation ? (
          <View style={styles.avatar}>
            <View style={StyleSheet.absoluteFill} pointerEvents="none">
              <DesignSvg name="visit-avatar" />
            </View>
            <Text style={ui.link}>
              {Array.from(patient.nombre.trim())[0]?.toLocaleUpperCase('es-MX')}
            </Text>
          </View>
        ) : null}
        <View style={ui.grow}>
          <Text style={ui.title}>{patient.nombre}</Text>
          <Text style={ui.muted}>
            {consultation
              ? `Consulta del ${displayDate(consultation.fecha_consulta)}`
              : `${folioVisible(patient.folio_clinico)} · ${age}`}
          </Text>
        </View>
      </GradientCard>
      <DateField
        label="Fecha de consulta"
        bounds={bounds}
        value={date}
        error={fields.fecha_consulta}
        onChange={(value) => {
          setDate(value);
          clearField('fecha_consulta');
        }}
      />
      <View style={styles.measurements}>
        <View style={styles.section}>
          <Text accessibilityRole="header" style={ui.section}>
            Mediciones
          </Text>
          <Text style={ui.muted}>Puedes usar coma o punto para los decimales.</Text>
        </View>
        <View style={styles.row}>
          <View style={styles.half}>
            <FormField
              label="Peso"
              unit="kg"
              appearance="card"
              icon="scale"
              iconPosition="trailing"
              keyboardType="decimal-pad"
              value={peso}
              onChangeText={(value) => {
                setPeso(value);
                clearField('peso_kg');
              }}
              error={fields.peso_kg}
              hint="0,5 a 50 kg"
              placeholder="10,50"
            />
          </View>
          <View style={styles.half}>
            <FormField
              label="Longitud o talla"
              unit="cm"
              appearance="card"
              icon="ruler"
              iconPosition="trailing"
              keyboardType="decimal-pad"
              value={talla}
              onChangeText={(value) => {
                setTalla(value);
                clearField('longitud_talla_cm');
              }}
              error={fields.longitud_talla_cm}
              hint="35 a 140 cm"
              placeholder="82,0"
            />
          </View>
        </View>
        <FormField
          label="Perímetro cefálico"
          unit="cm"
          appearance="card"
          icon="chart"
          iconPosition="trailing"
          keyboardType="decimal-pad"
          value={pc}
          onChangeText={(value) => {
            setPc(value);
            clearField('perimetro_cefalico_cm');
          }}
          error={fields.perimetro_cefalico_cm}
          hint="25 a 60 cm"
          placeholder="46,0"
        />
      </View>
      <Choices
        label={consultation ? 'Posición' : 'Posición de medición'}
        options={positions}
        value={position}
        onChange={setPosition}
      />
      {error ? <Notice tone="error">{error}</Notice> : null}
      <PrimaryButton
        title={consultation ? 'Guardar correcciones' : 'Calcular y guardar'}
        variant="accent"
        onPress={submit}
        loading={busy}
      />
    </>
  );
}

const createStyles = (theme: KidoLogTheme) =>
  StyleSheet.create({
    avatar: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
    measurements: {
      padding: theme.spacing.compact,
      gap: theme.spacing.md,
      borderWidth: 1,
      borderColor: theme.colors.cardBorder,
      backgroundColor: theme.colors.surface,
      borderRadius: theme.radius.card,
    },
    row: { flexDirection: 'row', gap: theme.spacing.compact, flexWrap: 'wrap' },
    section: { gap: theme.spacing.xs },
    half: { flex: 1, flexBasis: 130 },
  });
