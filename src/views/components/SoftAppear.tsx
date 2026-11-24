import { useEffect, useRef, type ReactNode } from 'react';
import { Animated } from 'react-native';
import { useAppearance } from '../theme/ThemeProvider';

export function SoftAppear({ children }: { children: ReactNode }) {
  const { reduceMotion } = useAppearance();
  const progress = useRef(new Animated.Value(reduceMotion ? 1 : 0)).current;

  useEffect(() => {
    if (reduceMotion) {
      progress.setValue(1);
      return;
    }
    progress.setValue(0);
    const animation = Animated.timing(progress, {
      toValue: 1,
      duration: 170,
      useNativeDriver: true,
    });
    animation.start();
    return () => animation.stop();
  }, [progress, reduceMotion]);

  return <Animated.View style={{ opacity: progress }}>{children}</Animated.View>;
}
