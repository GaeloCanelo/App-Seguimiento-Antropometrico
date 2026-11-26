const invalidCredentials =
  'El correo o la contraseña no coinciden. Revisa tus datos e inténtalo de nuevo.';
const sdkMessages: Record<string, string> = {
  'auth/invalid-credential': invalidCredentials,
  'auth/invalid-login-credentials': invalidCredentials,
  'auth/wrong-password': invalidCredentials,
  'auth/user-not-found': invalidCredentials,
  'auth/invalid-email': 'Escribe un correo electrónico válido.',
  'auth/email-already-in-use':
    'Ya hay una cuenta con ese correo. Puedes iniciar sesión o recuperar tu contraseña.',
  'auth/weak-password': 'Usa una contraseña de al menos 8 caracteres.',
  'auth/password-does-not-meet-requirements':
    'Usa una contraseña que cumpla los requisitos de seguridad.',
  'auth/network-request-failed': 'No se pudo conectar. Comprueba tu conexión e inténtalo de nuevo.',
  'auth/too-many-requests': 'Hubo demasiados intentos. Espera unos minutos y vuelve a intentar.',
  'auth/requires-recent-login':
    'Vuelve a iniciar sesión para confirmar tu identidad e intenta de nuevo.',
  'auth/user-disabled': 'Esta cuenta está deshabilitada.',
  unavailable: 'El servicio no está disponible por el momento. Vuelve a intentar.',
  'permission-denied': 'Tu cuenta no tiene permiso para realizar esta acción.',
};

export function mensajeEnEspanol(reason: unknown, fallback: string): string {
  if (typeof reason !== 'object' || reason === null) return fallback;
  const details = reason as { code?: unknown; message?: unknown };
  const code = typeof details.code === 'string' ? details.code : '';
  const mapped = sdkMessages[code];
  if (mapped) return mapped;
  const message = typeof details.message === 'string' ? details.message.trim() : '';
  if (message === 'Correo o contraseña incorrectos.') return invalidCredentials;
  // Keep messages authored by the app and replace technical SDK or native errors.
  const isAppMessage =
    /^(?:El |La |Las |Los |No (?:fue|hay|se|es|está|existe|tienes|tiene) |Se |Este |Esta |Ingresa |Escribe |Confirma |Ya |Fecha |Paciente |Consulta |Peso |Longitud |Perímetro |Folio |Debe |Formato |Credenciales |Base |Vuelve |Ocurrió |Sin |Hubo |Tu |Usa |Faltan )/.test(
      message,
    );
  return !code && isAppMessage ? message : fallback;
}

type AuthInput = { email: string; password?: string; confirmation?: string };
export type AuthErrors = Partial<Record<keyof AuthInput, string>>;

export function validarCamposAcceso({ email, password, confirmation }: AuthInput): AuthErrors {
  const errors: AuthErrors = {};
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
    errors.email = email.trim()
      ? 'Revisa el formato del correo electrónico.'
      : 'Escribe tu correo electrónico.';
  }
  if (password !== undefined && !password) errors.password = 'Escribe tu contraseña.';
  if (confirmation !== undefined) {
    if (password && password.length < 8) errors.password = 'Usa al menos 8 caracteres.';
    if (!confirmation) errors.confirmation = 'Vuelve a escribir tu contraseña.';
    else if (confirmation !== password) errors.confirmation = 'Las contraseñas no coinciden.';
  }
  return errors;
}
