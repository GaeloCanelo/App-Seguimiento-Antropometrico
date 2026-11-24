import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme, useThemedStyles } from '../theme/ThemeProvider';
import type { KidoLogTheme } from '../theme/tokens';
import { tabDestinations, type TabDestination } from '../utils/tabDestinations';
import { useKeyboardVisible } from '../utils/useKeyboardVisible';
import { KidoLogIcon } from './KidoLogIcon';

export function KidoLogTabBar({
  active,
  onSelect,
  onLongPress,
}: {
  active?: string;
  onSelect: (tab: TabDestination) => void;
  onLongPress?: (tab: TabDestination) => void;
}) {
  const theme = useTheme();
  const styles = useThemedStyles(createStyles);
  if (useKeyboardVisible()) return null;

  return (
    <SafeAreaView
      edges={{ bottom: 'maximum', left: 'additive', right: 'additive' }}
      style={styles.frame}
    >
      <View accessibilityRole="tablist" style={styles.bar}>
        {tabDestinations.map((tab) => {
          const selected = active === tab.name;
          const create = tab.name === 'registrar-paciente';
          return (
            <Pressable
              key={tab.name}
              accessibilityRole="tab"
              accessibilityLabel={tab.label}
              accessibilityState={{ selected }}
              onPress={() => onSelect(tab)}
              onLongPress={onLongPress ? () => onLongPress(tab) : undefined}
              style={({ pressed }) => [styles.item, pressed && styles.pressed]}
            >
              <View
                style={[
                  styles.iconTile,
                  (create || selected) && styles.selectedIcon,
                  create && styles.createIcon,
                ]}
              >
                <KidoLogIcon
                  name={tab.icon}
                  size={create ? 23 : 20}
                  color={
                    create
                      ? theme.colors.onIndigoAction
                      : selected
                        ? theme.colors.primaryInk
                        : theme.colors.textMuted
                  }
                />
              </View>
              <Text
                style={[
                  styles.label,
                  selected && styles.selectedLabel,
                  create && styles.createLabel,
                ]}
              >
                {tab.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </SafeAreaView>
  );
}

const createStyles = (theme: KidoLogTheme) =>
  StyleSheet.create({
    frame: {
      backgroundColor: theme.colors.background,
      paddingBottom: theme.spacing.sm,
      paddingHorizontal: theme.spacing.md,
      paddingTop: theme.spacing.xs,
    },
    bar: {
      flexDirection: 'row',
      alignItems: 'stretch',
      width: '100%',
      maxWidth: 500,
      alignSelf: 'center',
      backgroundColor: theme.colors.surface,
      borderColor: theme.colors.border,
      borderWidth: 1,
      borderRadius: theme.radius.navigation,
      padding: 5,
      gap: 5,
      ...theme.shadow.card,
    },
    item: {
      flex: 1,
      minWidth: 0,
      minHeight: 53,
      gap: 3,
      paddingHorizontal: 3,
      paddingVertical: 5,
      justifyContent: 'center',
      alignItems: 'center',
      borderRadius: theme.radius.input,
    },
    iconTile: {
      width: 45,
      height: 29,
      borderRadius: theme.radius.md,
      alignItems: 'center',
      justifyContent: 'center',
    },
    selectedIcon: { backgroundColor: theme.colors.primaryLight },
    createIcon: { backgroundColor: theme.colors.indigoAction },
    pressed: { opacity: 0.68 },
    label: {
      ...theme.typography.label,
      color: theme.colors.textMuted,
      fontSize: 11,
      textAlign: 'center',
      flexShrink: 1,
    },
    createLabel: { color: theme.colors.indigoInk },
    selectedLabel: { color: theme.colors.primaryInk },
  });
