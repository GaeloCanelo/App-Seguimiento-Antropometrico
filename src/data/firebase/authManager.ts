import {
  EmailAuthProvider,
  User,
  createUserWithEmailAndPassword,
  deleteUser,
  reauthenticateWithCredential,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signOut,
  updateEmail,
  updatePassword,
} from 'firebase/auth';
import { Medico } from '../../domain';
import { MedicoRepository } from '../repositories/medicoRepository';
import { RemoteSyncStore } from '../sync/syncTypes';
import { obtenerServiciosFirebase } from './firebaseConfig';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function validarCredencialesFormato(correo: string, contrasena: string): void {
  if (!EMAIL_RE.test(correo.trim())) {
    throw new Error('El formato del correo electrónico no es válido.');
  }
  if (contrasena.length < 8) {
    throw new Error('La contraseña debe tener al menos 8 caracteres.');
  }
}

export class CambiosPendientesError extends Error {
  constructor(public readonly totalPendientes: number) {
    super(`Existen ${totalPendientes} cambios sin sincronizar que se perderían al cerrar sesión.`);
    this.name = 'CambiosPendientesError';
  }
}

/**
 * Gestiona ciclo de vida de cuenta y aislamiento local (CU-01 a CU-06).
 */
export class AuthManager {
  constructor(
    private readonly medicoRepo: MedicoRepository,
    private readonly remoteSync: RemoteSyncStore,
  ) {}

  obtenerUsuarioActual(): User | null {
    return obtenerServiciosFirebase().auth.currentUser;
  }

  /** CU-01: Crear cuenta (requiere internet y contraseña >= 8 caracteres). */
  async crearCuenta(params: {
    correo: string;
    contrasena: string;
    confirmacion: string;
    hayConexion: boolean;
  }): Promise<Medico> {
    if (!params.hayConexion) {
      throw new Error('Se requiere conexión a internet para crear la cuenta.');
    }
    validarCredencialesFormato(params.correo, params.contrasena);
    if (params.contrasena !== params.confirmacion) {
      throw new Error('Las contraseñas no coinciden.');
    }

    const { auth } = obtenerServiciosFirebase();
    try {
      const cred = await createUserWithEmailAndPassword(
        auth,
        params.correo.trim(),
        params.contrasena,
      );
      const medico = await this.medicoRepo.guardarPerfil({
        uid_medico: cred.user.uid,
        correo: cred.user.email ?? params.correo.trim(),
      });
      await this.remoteSync.guardarPerfilMedico(medico);
      return medico;
    } catch (err: unknown) {
      const code = (err as { code?: string }).code;
      if (code === 'auth/email-already-in-use') {
        throw new Error('Este correo ya está registrado. Intenta iniciar sesión.');
      }
      throw err;
    }
  }

  /** CU-02: Iniciar sesión con mensaje genérico ante credenciales inválidas. */
  async iniciarSesion(params: {
    correo: string;
    contrasena: string;
    hayConexion: boolean;
  }): Promise<Medico> {
    if (!params.hayConexion) {
      throw new Error('Se requiere conexión a internet para el primer inicio de sesión.');
    }

    const { auth } = obtenerServiciosFirebase();
    try {
      const cred = await signInWithEmailAndPassword(auth, params.correo.trim(), params.contrasena);
      const perfilRemoto = await this.remoteSync.obtenerPerfilMedico(cred.user.uid);
      return await this.medicoRepo.guardarPerfil({
        uid_medico: cred.user.uid,
        correo: cred.user.email ?? params.correo.trim(),
        nombre: perfilRemoto?.nombre ?? null,
        apellidos: perfilRemoto?.apellidos ?? null,
      });
    } catch (error) {
      const code = (error as { code?: string } | null)?.code;
      if (
        code === 'auth/network-request-failed' ||
        code === 'auth/too-many-requests' ||
        code === 'unavailable'
      )
        throw error;
      // Criterio HU-02 (2): mensaje genérico sin indicar qué dato falló
      throw new Error('Correo o contraseña incorrectos.');
    }
  }

  /** CU-03: Enviar enlace de recuperación sin revelar si el correo existe. */
  async recuperarContrasena(correo: string, hayConexion: boolean): Promise<void> {
    if (!hayConexion) {
      throw new Error('Se requiere conexión a internet para recuperar la contraseña.');
    }
    if (!EMAIL_RE.test(correo.trim())) {
      throw new Error('Ingresa un correo electrónico válido.');
    }
    const { auth } = obtenerServiciosFirebase();
    auth.languageCode = 'es';
    try {
      await sendPasswordResetEmail(auth, correo.trim());
    } catch (err: unknown) {
      const code = (err as { code?: string }).code;
      // No revelar si la cuenta existe (CU-03 paso 4)
      if (code !== 'auth/user-not-found') {
        throw err;
      }
    }
  }

  /** CU-04: Actualizar nombre, apellidos, correo o contraseña. */
  async actualizarDatosCuenta(params: {
    uid_medico: string;
    nombre: string | null;
    apellidos: string | null;
    correo?: string;
    contrasenaActual?: string;
    hayConexion: boolean;
  }): Promise<Medico> {
    const { auth } = obtenerServiciosFirebase();
    const user = auth.currentUser;
    if (!user || user.uid !== params.uid_medico) {
      throw new Error('No hay una sesión activa válida.');
    }

    const nuevoCorreo = params.correo?.trim();
    if (nuevoCorreo && nuevoCorreo !== user.email) {
      if (!params.hayConexion) {
        throw new Error('Se requiere conexión a internet para actualizar el correo.');
      }
      if (!EMAIL_RE.test(nuevoCorreo)) {
        throw new Error('El formato del correo electrónico no es válido.');
      }
      if (params.contrasenaActual && user.email) {
        const cred = EmailAuthProvider.credential(user.email, params.contrasenaActual);
        await reauthenticateWithCredential(user, cred);
      }
      await updateEmail(user, nuevoCorreo);
    }

    const medico = await this.medicoRepo.guardarPerfil({
      uid_medico: params.uid_medico,
      correo: nuevoCorreo ?? user.email ?? '',
      nombre: params.nombre,
      apellidos: params.apellidos,
    });

    if (params.hayConexion) {
      await this.remoteSync.guardarPerfilMedico(medico);
    }
    return medico;
  }

  async cambiarContrasena(params: {
    contrasenaActual: string;
    nuevaContrasena: string;
    confirmacion: string;
    hayConexion: boolean;
  }): Promise<void> {
    if (!params.hayConexion) {
      throw new Error('Se requiere conexión a internet para cambiar la contraseña.');
    }
    if (params.nuevaContrasena.length < 8) {
      throw new Error('La nueva contraseña debe tener al menos 8 caracteres.');
    }
    if (params.nuevaContrasena !== params.confirmacion) {
      throw new Error('Las contraseñas no coinciden.');
    }

    const { auth } = obtenerServiciosFirebase();
    const user = auth.currentUser;
    if (!user || !user.email) {
      throw new Error('No hay una sesión activa válida.');
    }

    const cred = EmailAuthProvider.credential(user.email, params.contrasenaActual);
    try {
      await reauthenticateWithCredential(user, cred);
    } catch {
      throw new Error('La contraseña actual es incorrecta.');
    }
    await updatePassword(user, params.nuevaContrasena);
  }

  /**
   * CU-05: Cierra sesión y limpia datos locales (PA-07).
   * Si hay cambios sin sincronizar y `forzarPerdida` es false, lanza `CambiosPendientesError`.
   */
  async cerrarSesion(uidMedico: string, forzarPerdida = false): Promise<void> {
    const pendientes = await this.medicoRepo.contarCambiosPendientes(uidMedico);
    if (pendientes > 0 && !forzarPerdida) {
      throw new CambiosPendientesError(pendientes);
    }

    await this.medicoRepo.limpiarDatosLocales();
    const { auth } = obtenerServiciosFirebase();
    await signOut(auth);
  }

  /** CU-06: Elimina definitivamente la cuenta y todos los datos remotos y locales. */
  async eliminarCuenta(params: {
    uid_medico: string;
    contrasena: string;
    hayConexion: boolean;
  }): Promise<void> {
    if (!params.hayConexion) {
      throw new Error('Se requiere conexión a internet para eliminar la cuenta.');
    }
    const { auth } = obtenerServiciosFirebase();
    const user = auth.currentUser;
    if (!user || !user.email || user.uid !== params.uid_medico) {
      throw new Error('No hay una sesión activa válida.');
    }

    const cred = EmailAuthProvider.credential(user.email, params.contrasena);
    try {
      await reauthenticateWithCredential(user, cred);
    } catch {
      throw new Error('La contraseña ingresada es incorrecta.');
    }

    await this.remoteSync.eliminarTodoDeMedico(params.uid_medico);
    await deleteUser(user);
    await this.medicoRepo.limpiarDatosLocales();
  }
}
