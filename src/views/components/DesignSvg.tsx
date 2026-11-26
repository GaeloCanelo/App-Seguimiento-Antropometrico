import { useMemo } from 'react';
import { StyleSheet } from 'react-native';
import { SvgXml } from 'react-native-svg';
import { useAppearance } from '../theme/ThemeProvider';
import { artwork } from './kidologArtwork';

export type DesignAsset = keyof typeof artwork;

// The original SVG is bundled alongside the screen code.
export function DesignSvg({
  name,
  size,
  tint,
}: {
  name: DesignAsset;
  size?: number;
  tint?: string;
}) {
  const { mode, theme } = useAppearance();
  const xml = useMemo(() => {
    const original = artwork[name];
    if (tint)
      return original.replace(
        /(stroke|fill)="#[a-f0-9]{6}"/gi,
        (_, attribute: string) => `${attribute}="${tint}"`,
      );
    if (mode === 'light') return original;
    const colors: Record<string, string> = {
      '#60419f': theme.colors.primaryInk,
      '#6244ad': theme.colors.primaryInk,
      '#777188': theme.colors.textMuted,
      '#5e3a9b': theme.colors.primaryInk,
      '#8d69d6': theme.colors.brand,
      '#b4a3c8': theme.colors.textMuted,
      '#f0eafb': theme.colors.primaryLight,
    };
    return original.replace(/#[a-f0-9]{6}\b/gi, (hex) => colors[hex.toLowerCase()] ?? hex);
  }, [mode, name, theme, tint]);
  return (
    <SvgXml
      xml={xml}
      {...(size ? { width: size, height: size } : {})}
      style={styles.artwork}
      accessible={false}
      pointerEvents="none"
    />
  );
}

const styles = StyleSheet.create({ artwork: { flexShrink: 0 } });
