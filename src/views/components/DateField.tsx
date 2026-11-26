import DateTimePicker, { DateTimePickerAndroid } from '@react-native-community/datetimepicker';
import { useState } from 'react';
import { Keyboard, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { useAppearance, useThemedStyles } from '../theme/ThemeProvider';
import type { KidoLogTheme } from '../theme/tokens';
import { dateForField } from '../utils/clinicalDisplay';
import {
  datePickerValue,
  isDateWithinBounds,
  isoFromPicker,
  type DateBounds,
} from '../utils/dateBounds';
import { DesignSvg } from './DesignSvg';
import { useUI } from './KidoLogUI';
import { FieldError } from './FieldError';
import { FormField } from './FormField';
import { PrimaryButton } from './PrimaryButton';
import { SurfaceModal } from './SurfaceModal';

export function DateField({
  label,
  value,
  bounds,
  error,
  onChange,
}: {
  label: string;
  value: string;
  bounds: DateBounds | null;
  error?: string;
  onChange: (iso: string) => void;
}) {
  const { mode, theme } = useAppearance();
  const styles = useThemedStyles(createStyles);
  const ui = useUI();
  const [draft, setDraft] = useState<string | null>(null);
  const limits = bounds
    ? {
        minimumDate: new Date(`${bounds.minimum}T00:00:00Z`),
        maximumDate: new Date(`${bounds.maximum}T23:59:59Z`),
      }
    : null;

  function save(iso: string) {
    if (bounds && isDateWithinBounds(iso, bounds)) onChange(iso);
    setDraft(null);
  }

  function open() {
    if (!bounds || !limits) return;
    Keyboard.dismiss();
    const initial = isDateWithinBounds(value, bounds) ? value : bounds.maximum;
    if (Platform.OS === 'android') {
      DateTimePickerAndroid.open({
        ...limits,
        value: datePickerValue(initial),
        mode: 'date',
        timeZoneName: 'UTC',
        onValueChange: (_, date) => save(isoFromPicker(date)),
      });
    } else {
      setDraft(initial);
    }
  }

  if (Platform.OS === 'web')
    return (
      <FormField
        label={label}
        value={value}
        error={error}
        onChangeText={onChange}
        placeholder="AAAA-MM-DD"
      />
    );

  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={label}
        accessibilityValue={{ text: value ? dateForField(value) : 'Sin seleccionar' }}
        accessibilityHint={error ?? 'Abre el calendario'}
        accessibilityState={{ disabled: !bounds }}
        disabled={!bounds}
        onPress={open}
        style={({ pressed }) => [
          styles.control,
          pressed && styles.pressed,
          Boolean(error) && styles.controlError,
        ]}
      >
        <Text style={[styles.value, !value && styles.empty]}>
          {value ? dateForField(value) : 'DD/MM/AAAA'}
        </Text>
        <DesignSvg name="calendar" size={19} />
      </Pressable>
      {error ? <FieldError>{error}</FieldError> : null}
      {draft && bounds && limits ? (
        <SurfaceModal wide onClose={() => setDraft(null)}>
          <Text accessibilityRole="header" style={ui.section}>
            {label}
          </Text>
          <DateTimePicker
            {...limits}
            value={datePickerValue(draft)}
            mode="date"
            display="inline"
            locale="es-MX"
            style={styles.calendar}
            timeZoneName="UTC"
            themeVariant={mode}
            accentColor={theme.colors.primary}
            onValueChange={(_, date) => {
              const iso = isoFromPicker(date);
              if (isDateWithinBounds(iso, bounds)) setDraft(iso);
            }}
          />
          <PrimaryButton title="Confirmar fecha" onPress={() => save(draft)} />
          <PrimaryButton title="Cancelar" variant="secondary" onPress={() => setDraft(null)} />
        </SurfaceModal>
      ) : null}
    </View>
  );
}

const createStyles = (theme: KidoLogTheme) =>
  StyleSheet.create({
    calendar: { alignSelf: 'stretch' },
    field: { gap: 6 },
    label: { color: theme.colors.text, ...theme.typography.label },
    control: {
      backgroundColor: theme.colors.surface,
      borderColor: theme.colors.formBorder,
      borderWidth: 1,
      borderRadius: theme.radius.lg,
      paddingHorizontal: theme.spacing.compact,
      paddingVertical: theme.spacing.sm,
      minHeight: 49,
      flexDirection: 'row',
      alignItems: 'center',
      gap: theme.spacing.sm,
    },
    pressed: { backgroundColor: theme.colors.primaryLight },
    controlError: { borderColor: theme.colors.danger, backgroundColor: theme.colors.dangerLight },
    value: { flex: 1, color: theme.colors.text, ...theme.typography.bodySmall, fontSize: 14 },
    empty: { color: theme.colors.textMuted },
  });
