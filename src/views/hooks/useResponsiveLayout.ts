import { useWindowDimensions } from 'react-native';

export interface ResponsiveMetrics {
  width: number;
  height: number;
  esTableta: boolean;
  esPantallaPequena: boolean;
  paddingHorizontal: number;
  maxWidthContenido: number;
  maxWidthFormulario: number;
}

/**
 * Hook de diseño responsivo para adaptar formularios, listas y gráficas
 * entre teléfonos inteligentes y tabletas clínicas (RNF-06).
 */
export function useResponsiveLayout(): ResponsiveMetrics {
  const { width, height } = useWindowDimensions();
  const esTableta = width >= 768;
  const esPantallaPequena = width < 360;

  return {
    width,
    height,
    esTableta,
    esPantallaPequena,
    paddingHorizontal: esTableta ? 28 : esPantallaPequena ? 12 : 16,
    maxWidthContenido: esTableta ? 860 : width,
    maxWidthFormulario: esTableta ? 520 : width,
  };
}
