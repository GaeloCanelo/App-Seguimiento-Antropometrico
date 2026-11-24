import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import { Keyboard, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Notice, useUI } from './KidoLogUI';
import { PrimaryButton } from './PrimaryButton';
import { SurfaceModal } from './SurfaceModal';

export interface DialogAction {
  text: string;
  style?: 'cancel' | 'destructive';
  onPress?: () => void;
}
type ShowDialog = (title: string, message: string | undefined, actions: DialogAction[]) => void;
const FeedbackContext = createContext<((text: string) => void) | null>(null);
const DialogContext = createContext<ShowDialog | null>(null);

export function DialogProvider({ children }: { children: ReactNode }) {
  const ui = useUI();
  const { top } = useSafeAreaInsets();
  const [feedback, setFeedback] = useState<{ text: string } | null>(null);
  const notify = useCallback((text: string) => {
    Keyboard.dismiss();
    setFeedback({ text });
  }, []);
  useEffect(() => {
    if (!feedback) return;
    const timer = setTimeout(() => setFeedback(null), 3000);
    return () => clearTimeout(timer);
  }, [feedback]);
  const [dialog, setDialog] = useState<{
    title: string;
    message?: string;
    actions: DialogAction[];
  } | null>(null);

  const show = useCallback<ShowDialog>((title, message, actions) => {
    Keyboard.dismiss();
    setDialog({ title, message, actions });
  }, []);
  const activate = (action?: DialogAction) => {
    setDialog(null);
    action?.onPress?.();
  };

  return (
    <DialogContext.Provider value={show}>
      <FeedbackContext.Provider value={notify}>{children}</FeedbackContext.Provider>
      {feedback ? (
        <View pointerEvents="none" style={[styles.toast, { top: top + 8 }]}>
          <Notice tone="success">{feedback.text}</Notice>
        </View>
      ) : null}
      {dialog ? (
        <SurfaceModal
          onClose={() => activate(dialog.actions.find((action) => action.style === 'cancel'))}
        >
          <Text accessibilityRole="header" style={ui.section}>
            {dialog.title}
          </Text>
          {dialog.message ? <Text style={ui.muted}>{dialog.message}</Text> : null}
          {dialog.actions
            .filter((action) => action.style !== 'cancel')
            .concat(dialog.actions.filter((action) => action.style === 'cancel'))
            .map((action) => (
              <PrimaryButton
                key={action.text}
                title={action.text}
                variant={
                  action.style === 'cancel'
                    ? 'secondary'
                    : action.style === 'destructive'
                      ? 'danger'
                      : 'primary'
                }
                onPress={() => activate(action)}
              />
            ))}
        </SurfaceModal>
      ) : null}
    </DialogContext.Provider>
  );
}

export function useDialog() {
  const show = useContext(DialogContext);
  if (!show) throw new Error('KidoLog necesita un proveedor de diálogos.');
  return show;
}

export function useFeedback() {
  const notify = useContext(FeedbackContext);
  if (!notify) throw new Error('KidoLog necesita un proveedor de mensajes.');
  return notify;
}

const styles = StyleSheet.create({
  toast: { position: 'absolute', left: 20, right: 20, zIndex: 20, elevation: 4 },
});
