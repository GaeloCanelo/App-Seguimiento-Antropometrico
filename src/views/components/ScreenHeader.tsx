import { Pressable, StyleSheet } from 'react-native';
import { useTheme, useThemedStyles } from '../theme/ThemeProvider';
import type { KidoLogTheme } from '../theme/tokens';
import { KidoLogIcon, type KidoLogIconName } from './KidoLogIcon';

export function HeaderAction({
  icon,
  label,
  onPress,
  disabled = false,
}: {
  icon: KidoLogIconName;
  label: string;
  onPress: () => void;
  disabled?: boolean;
}) {
  const styles = useThemedStyles(createStyles);
  const theme = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [styles.action, (pressed || disabled) && styles.dimmed]}
    >
      <KidoLogIcon name={icon} size={21} color={theme.colors.onHero} />
    </Pressable>
  );
}

const createStyles = (theme: KidoLogTheme) =>
  StyleSheet.create({
    action: {
      width: 44,
      height: 44,
      borderRadius: theme.radius.md,
      backgroundColor: theme.colors.mastheadWash,
      borderWidth: 1,
      borderColor: theme.colors.mastheadBorder,
      alignItems: 'center',
      justifyContent: 'center',
    },
    dimmed: { opacity: 0.62 },
  });
