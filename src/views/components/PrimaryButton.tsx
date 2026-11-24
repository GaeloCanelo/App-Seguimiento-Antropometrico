import React from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text } from 'react-native';
import { useAppearance, useThemedStyles } from '../theme/ThemeProvider';
import type { KidoLogTheme } from '../theme/tokens';

interface PrimaryButtonProps {
  title: string;
  onPress: () => void;
  loading?: boolean;
  disabled?: boolean;
  variant?: 'primary' | 'secondary' | 'danger' | 'accent';
}

export function PrimaryButton({
  title,
  onPress,
  loading = false,
  disabled = false,
  variant = 'primary',
}: PrimaryButtonProps) {
  const styles = useThemedStyles(createStyles);
  const { theme, reduceMotion } = useAppearance();
  const bg =
    variant === 'danger'
      ? theme.colors.dangerFill
      : variant === 'accent'
        ? theme.colors.indigoAction
        : variant === 'secondary'
          ? theme.colors.primaryLight
          : theme.colors.primary;
  const fg =
    variant === 'danger'
      ? theme.colors.onDanger
      : variant === 'accent'
        ? theme.colors.onIndigoAction
        : variant === 'secondary'
          ? theme.colors.primaryInk
          : theme.colors.onPrimary;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={title}
      accessibilityState={{ disabled: disabled || loading, busy: loading }}
      onPress={onPress}
      disabled={disabled || loading}
      style={({ pressed }) => [
        styles.button,
        { backgroundColor: bg },

        (disabled || loading) && styles.disabled,
        pressed && styles.pressed,
        pressed && !reduceMotion && styles.pressedMotion,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={fg} />
      ) : (
        <Text style={[styles.text, { color: fg }]}>{title}</Text>
      )}
    </Pressable>
  );
}

const createStyles = (theme: KidoLogTheme) =>
  StyleSheet.create({
    button: {
      paddingVertical: 14,
      paddingHorizontal: theme.spacing.md,
      borderRadius: theme.radius.lg,
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: 52,
    },
    disabled: {
      opacity: 0.55,
    },
    pressed: {
      opacity: 0.82,
    },
    pressedMotion: { transform: [{ scale: 0.985 }] },
    text: {
      ...theme.typography.button,
      fontSize: 14,
      textAlign: 'center',
    },
  });
