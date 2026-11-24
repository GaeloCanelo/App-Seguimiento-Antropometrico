import { useEffect, useRef, useState } from 'react';
import { AccessibilityInfo, Animated, Platform, StyleSheet, Text } from 'react-native';
import { useAppearance, useThemedStyles } from '../theme/ThemeProvider';
import type { KidoLogTheme } from '../theme/tokens';
import { DesignSvg } from './DesignSvg';

export function TransientNotice({ message }: { message: string }) {
  const { reduceMotion, theme } = useAppearance();
  const styles = useThemedStyles(createStyles);
  const opacity = useRef(new Animated.Value(1)).current;
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    if (Platform.OS === 'ios') AccessibilityInfo.announceForAccessibility(message);
  }, [message]);

  useEffect(() => {
    const fade = Animated.timing(opacity, {
      toValue: 0,
      duration: 280,
      useNativeDriver: true,
    });
    const timeout = setTimeout(() => {
      if (reduceMotion) {
        setVisible(false);
        return;
      }
      fade.start(({ finished }) => {
        if (finished) setVisible(false);
      });
    }, 4500);
    return () => {
      clearTimeout(timeout);
      fade.stop();
    };
  }, [opacity, reduceMotion]);

  if (!visible) return null;

  return (
    <Animated.View pointerEvents="none" style={[styles.notice, { opacity }]}>
      <DesignSvg name="info" size={18} tint={theme.colors.primaryInk} />
      <Text accessibilityLiveRegion="polite" style={styles.text}>
        {message}
      </Text>
    </Animated.View>
  );
}

const createStyles = (theme: KidoLogTheme) =>
  StyleSheet.create({
    notice: {
      position: 'absolute',
      zIndex: 1,
      alignSelf: 'center',
      top: theme.spacing.xs,
      width: '90%',
      maxWidth: 440,
      flexDirection: 'row',
      alignItems: 'center',
      gap: theme.spacing.sm,
      padding: theme.spacing.compact,
      borderRadius: theme.radius.lg,
      backgroundColor: theme.colors.primaryLight,
      borderColor: theme.colors.border,
      borderWidth: 1,
      ...theme.shadow.card,
    },
    text: { flex: 1, ...theme.typography.bodySmall, color: theme.colors.primaryInk },
  });
