import { StyleSheet, Text, View } from 'react-native';
import { useThemedStyles } from '../theme/ThemeProvider';
import type { KidoLogTheme } from '../theme/tokens';

export function FieldError({ children }: { children: string }) {
  const styles = useThemedStyles(createStyles);
  return (
    <View style={styles.row}>
      <Text accessible={false} importantForAccessibility="no" style={styles.icon}>
        !
      </Text>
      <Text accessibilityLiveRegion="polite" style={styles.message}>
        {children}
      </Text>
    </View>
  );
}

const createStyles = (theme: KidoLogTheme) =>
  StyleSheet.create({
    row: { flexDirection: 'row', alignItems: 'flex-start', gap: 6, paddingTop: 5 },
    icon: {
      color: theme.colors.danger,
      backgroundColor: theme.colors.dangerLight,
      borderRadius: 8,
      overflow: 'hidden',
      width: 16,
      height: 16,
      textAlign: 'center',
      fontWeight: '700',
      fontSize: 11,
    },
    message: { flex: 1, color: theme.colors.danger, ...theme.typography.bodySmall, lineHeight: 17 },
  });
