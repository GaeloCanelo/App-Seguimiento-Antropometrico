import type { ReactNode } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAppearance, useThemedStyles } from '../theme/ThemeProvider';
import type { KidoLogTheme } from '../theme/tokens';

export function SurfaceModal({
  children,
  onClose,
  wide = false,
}: {
  children: ReactNode;
  onClose: () => void;
  wide?: boolean;
}) {
  const { reduceMotion } = useAppearance();
  const styles = useThemedStyles(createStyles);
  return (
    <Modal
      transparent
      presentationStyle="overFullScreen"
      animationType={reduceMotion ? 'none' : 'fade'}
      onRequestClose={onClose}
      statusBarTranslucent
      navigationBarTranslucent
    >
      <SafeAreaView style={styles.viewport}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} accessible={false} />
        <View accessibilityViewIsModal style={[styles.card, wide && styles.wideCard]}>
          <ScrollView
            bounces={false}
            contentInsetAdjustmentBehavior="never"
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={[styles.content, wide && styles.wideContent]}
          >
            {children}
          </ScrollView>
        </View>
      </SafeAreaView>
    </Modal>
  );
}

const createStyles = (theme: KidoLogTheme) =>
  StyleSheet.create({
    viewport: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: theme.colors.backdrop,
    },
    card: {
      width: '92%',
      maxWidth: 430,
      maxHeight: '94%',
      backgroundColor: theme.colors.surface,
      borderColor: theme.colors.border,
      borderWidth: 1,
      borderRadius: theme.radius.navigation,
      overflow: 'hidden',
    },
    wideCard: { width: '98%' },
    wideContent: { paddingHorizontal: theme.spacing.sm },
    content: { padding: theme.spacing.md, gap: theme.spacing.compact },
  });
