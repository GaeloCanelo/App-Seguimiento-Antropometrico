import React from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text } from 'react-native';
import { theme } from '../theme/tokens';

interface PrimaryButtonProps {
  title: string;
  onPress: () => void;
  loading?: boolean;
  disabled?: boolean;
  variant?: 'primary' | 'secondary' | 'danger';
}

export function PrimaryButton({
  title,
  onPress,
  loading = false,
  disabled = false,
  variant = 'primary',
}: PrimaryButtonProps) {
  const bg =
    variant === 'danger'
      ? theme.colors.danger
      : variant === 'secondary'
        ? theme.colors.surface
        : theme.colors.primary;
  const fg = variant === 'secondary' ? theme.colors.primary : '#FFFFFF';

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      style={({ pressed }) => [
        styles.button,
        { backgroundColor: bg },
        variant === 'secondary' && styles.secondaryBorder,
        (disabled || loading) && styles.disabled,
        pressed && styles.pressed,
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

const styles = StyleSheet.create({
  button: {
    paddingVertical: 14,
    paddingHorizontal: theme.spacing.md,
    borderRadius: theme.radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
  },
  secondaryBorder: {
    borderWidth: 1,
    borderColor: theme.colors.primary,
  },
  disabled: {
    opacity: 0.55,
  },
  pressed: {
    opacity: 0.85,
  },
  text: {
    fontSize: 15,
    fontWeight: '600',
  },
});
