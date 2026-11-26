import type { CodigoIndicador, SeveridadClasificacion } from '../../domain';
import type { DesignAsset } from '../components/DesignSvg';
import type { ColorMode } from '../theme/preferences';
import type { KidoLogTheme } from '../theme/tokens';

import { indicatorPalette, type IndicatorTone } from '../theme/indicatorPalette';

export const indicatorDesign: Record<
  CodigoIndicador,
  {
    label: string;
    icon: DesignAsset;
    light: IndicatorTone;
    dark: IndicatorTone;
  }
> = {
  P_E: {
    label: 'P/E',
    icon: 'indicator-scale',
    ...indicatorPalette.P_E,
  },
  T_E: {
    label: 'T/E',
    icon: 'indicator-ruler',
    ...indicatorPalette.T_E,
  },
  P_T: {
    label: 'P/T',
    icon: 'indicator-scale',
    ...indicatorPalette.P_T,
  },
  PC_E: {
    label: 'PC/E',
    icon: 'indicator-head',
    ...indicatorPalette.PC_E,
  },
  IMC_E: {
    label: 'IMC/E',
    icon: 'indicator-chart',
    ...indicatorPalette.IMC_E,
  },
};

export function indicatorOptions(mode: ColorMode) {
  return (Object.keys(indicatorDesign) as CodigoIndicador[]).map((value) => {
    const design = indicatorDesign[value];
    const tone = design[mode];
    return {
      value,
      label: design.label,
      color: tone.ink,
      surface: tone.surface,
      selectedColor: tone.onInk,
    };
  });
}

export function indicatorFromParam(value?: string | string[]): CodigoIndicador {
  return (
    (Object.keys(indicatorDesign) as CodigoIndicador[]).find((code) => code === value) ?? 'P_E'
  );
}

export function classificationInk(
  severity: SeveridadClasificacion,
  theme: KidoLogTheme,
  normal = theme.colors.successInk,
): string {
  switch (severity) {
    case 'normal':
      return normal;
    case 'info':
      return theme.colors.info;
    case 'alerta':
    case 'moderado':
      return theme.colors.warning;
    case 'severo':
      return theme.colors.danger;
  }
}
