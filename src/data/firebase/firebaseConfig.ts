import AsyncStorage from '@react-native-async-storage/async-storage';
import { FirebaseApp, getApp, getApps, initializeApp } from 'firebase/app';
import * as firebaseAuth from 'firebase/auth';
import type { Auth, Persistence } from 'firebase/auth';
import { Firestore, getFirestore } from 'firebase/firestore';

export interface FirebaseServicios {
  app: FirebaseApp;
  auth: Auth;
  firestore: Firestore;
}

function leerConfigFirebase() {
  return {
    apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY ?? '',
    authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN ?? '',
    projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID ?? '',
    storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET ?? '',
    messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID ?? '',
    appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID ?? '',
  };
}

export function estaFirebaseConfigurado(): boolean {
  const cfg = leerConfigFirebase();
  return Boolean(cfg.apiKey && cfg.projectId && cfg.appId);
}

let instanciaCache: FirebaseServicios | null = null;

/**
 * Inicializa Firebase de forma perezosa con persistencia de sesión local en AsyncStorage
 * para permitir el acceso sin conexión cuando existe sesión vigente (CU-02 / RNF-02).
 */
export function obtenerServiciosFirebase(): FirebaseServicios {
  if (instanciaCache) return instanciaCache;

  const cfg = leerConfigFirebase();
  if (!cfg.apiKey || !cfg.projectId || !cfg.appId) {
    throw new Error(
      'Faltan variables EXPO_PUBLIC_FIREBASE_* en .env. Consulta docs/firebase_setup.md.',
    );
  }

  const app = getApps().length > 0 ? getApp() : initializeApp(cfg);
  let auth: Auth;
  try {
    const getRNPersistence = (
      firebaseAuth as unknown as {
        getReactNativePersistence?: (storage: typeof AsyncStorage) => Persistence;
      }
    ).getReactNativePersistence;

    auth = getRNPersistence
      ? firebaseAuth.initializeAuth(app, {
          persistence: getRNPersistence(AsyncStorage),
        })
      : firebaseAuth.getAuth(app);
  } catch {
    auth = firebaseAuth.getAuth(app);
  }

  const firestore = getFirestore(app);
  instanciaCache = { app, auth, firestore };
  return instanciaCache;
}
