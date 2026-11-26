import type { CodigoIndicador } from '../../domain';
import type { ColorMode } from './preferences';

export interface IndicatorTone {
  surface: string;
  ink: string;
  onInk: string;
}

export const indicatorPalette: Record<CodigoIndicador, Record<ColorMode, IndicatorTone>> = {
  P_E: {
    light: { surface: '#F2E9FF', ink: '#6335A4', onInk: '#FFFFFF' },
    dark: { surface: '#382653', ink: '#DCC2FF', onInk: '#2A1943' },
  },
  T_E: {
    light: { surface: '#E4F7F3', ink: '#16736A', onInk: '#FFFFFF' },
    dark: { surface: '#193D3A', ink: '#91E2D3', onInk: '#153530' },
  },
  P_T: {
    light: { surface: '#FFF4CF', ink: '#875B08', onInk: '#FFFFFF' },
    dark: { surface: '#42351B', ink: '#F7D878', onInk: '#3B2A0F' },
  },
  PC_E: {
    light: { surface: '#FCE9F0', ink: '#9B3566', onInk: '#FFFFFF' },
    dark: { surface: '#482637', ink: '#F7B9D3', onInk: '#3B192B' },
  },
  IMC_E: {
    light: { surface: '#E5F4FF', ink: '#155F87', onInk: '#FFFFFF' },
    dark: { surface: '#1C354B', ink: '#AEDFFA', onInk: '#102C3A' },
  },
};
