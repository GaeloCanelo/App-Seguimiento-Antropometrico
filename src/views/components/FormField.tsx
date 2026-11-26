import { useState, type ReactNode } from 'react';
import { StyleSheet, Text, TextInput, type TextInputProps, View } from 'react-native';
import { useTheme, useThemedStyles } from '../theme/ThemeProvider';
import type { KidoLogTheme } from '../theme/tokens';
import { DesignSvg, type DesignAsset } from './DesignSvg';
import { FieldError } from './FieldError';
import { KidoLogIcon } from './KidoLogIcon';

interface FormFieldProps extends TextInputProps {
  label?: string;
  error?: string | null;
  hint?: string | null;
  icon?: DesignAsset | 'search';
  iconPosition?: 'leading' | 'trailing';
  appearance?: 'default' | 'search' | 'card';
  suffix?: ReactNode;
  unit?: string;
}

export function FormField({
  label,
  error,
  hint,
  icon,
  iconPosition = 'leading',
  appearance = 'default',
  suffix,
  unit,
  onFocus,
  onBlur,
  style,
  ...rest
}: FormFieldProps) {
  const styles = useThemedStyles(createStyles);
  const theme = useTheme();
  const [focused, setFocused] = useState(false);
  const search = appearance === 'search';
  const card = appearance === 'card';
  const decorated = search || Boolean(icon || unit || suffix);
  const iconElement =
    icon === 'search' ? (
      <KidoLogIcon name="search" />
    ) : icon ? (
      <DesignSvg name={icon} size={18} />
    ) : null;
  const stateStyle = error ? styles.inputError : focused ? styles.focused : null;

  const input = (
    <TextInput
      accessibilityLabel={label}
      accessibilityHint={error ?? hint ?? undefined}
      placeholderTextColor={theme.colors.textMuted}
      selectionColor={theme.colors.primary}
      style={[
        styles.input,
        decorated ? styles.decoratedInput : styles.control,
        !decorated && card && styles.cardControl,
        !decorated && stateStyle,
        search && styles.searchInput,
        card && styles.cardInput,
        style,
      ]}
      onFocus={(event) => {
        setFocused(true);
        onFocus?.(event);
      }}
      onBlur={(event) => {
        setFocused(false);
        onBlur?.(event);
      }}
      {...rest}
    />
  );

  return (
    <View style={!search && !card && styles.wrapper}>
      {label ? <Text style={styles.label}>{label}</Text> : null}
      {decorated ? (
        <View
          style={[
            styles.control,
            styles.field,
            search && styles.search,
            card && styles.cardControl,
            stateStyle,
          ]}
        >
          {iconPosition === 'leading' ? iconElement : null}
          {input}
          {unit ? <Text style={styles.unit}>{unit}</Text> : null}
          {iconPosition === 'trailing' ? iconElement : null}
          {suffix}
        </View>
      ) : (
        input
      )}
      {error ? (
        <FieldError>{error}</FieldError>
      ) : hint ? (
        <Text style={styles.hint}>{hint}</Text>
      ) : null}
    </View>
  );
}

const createStyles = (theme: KidoLogTheme) =>
  StyleSheet.create({
    wrapper: { marginBottom: theme.spacing.md },
    label: { ...theme.typography.label, color: theme.colors.text, marginBottom: 6 },
    control: {
      backgroundColor: theme.colors.surface,
      borderWidth: 1,
      borderColor: theme.colors.formBorder,
      borderRadius: theme.radius.sm,
      paddingHorizontal: theme.spacing.compact,
    },
    field: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm },
    input: {
      paddingVertical: 11,
      ...theme.typography.bodySmall,
      fontSize: 14,
      color: theme.colors.text,
    },
    decoratedInput: { flex: 1, minWidth: 0, paddingHorizontal: 0 },
    search: {
      minHeight: 49,
      borderRadius: theme.radius.input,
      borderColor: theme.colors.inputBorder,
    },
    searchInput: { ...theme.typography.bodySmall },
    cardControl: { minHeight: 52, borderRadius: theme.radius.lg },
    cardInput: { fontSize: 16 },
    focused: { borderColor: theme.colors.primary, backgroundColor: theme.colors.background },
    inputError: { borderColor: theme.colors.danger, backgroundColor: theme.colors.dangerLight },
    unit: { ...theme.typography.label, color: theme.colors.primaryInk },
    hint: {
      ...theme.typography.bodySmall,
      color: theme.colors.textMuted,
      marginTop: theme.spacing.xs,
      lineHeight: 17,
    },
  });
