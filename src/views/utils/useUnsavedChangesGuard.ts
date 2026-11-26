import { usePreventRemove } from 'expo-router';
import { useCallback } from 'react';
import { useDialog } from '../components/DialogProvider';

/**
 * Protege formularios con cambios sin guardar mostrando el diálogo modal de confirmación (Figma 41:1692).
 */
export function useUnsavedChangesGuard(dirty: boolean) {
  const dialog = useDialog();

  const disablePrevention = usePreventRemove(dirty, ({ repeat }) => {
    dialog('Cambios sin guardar', 'Si sales ahora, perderás los cambios del formulario.', [
      { text: 'Seguir editando', style: 'cancel' },
      {
        text: 'Salir',
        onPress: () => {
          disablePrevention();
          repeat();
        },
      },
    ]);
  });

  const confirmExit = useCallback(
    (onProceed: () => void) => {
      if (!dirty) {
        onProceed();
        return;
      }
      dialog('Cambios sin guardar', 'Si sales ahora, perderás los cambios del formulario.', [
        { text: 'Seguir editando', style: 'cancel' },
        {
          text: 'Salir',
          onPress: () => {
            disablePrevention();
            onProceed();
          },
        },
      ]);
    },
    [dialog, dirty, disablePrevention],
  );

  const allowAndRun = useCallback(
    (navigate: () => void) => {
      disablePrevention();
      navigate();
    },
    [disablePrevention],
  );

  return { confirmExit, allowAndRun };
}
