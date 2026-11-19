import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';
import { onAuthStateChanged } from 'firebase/auth';
import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import {
  AuthManager,
  ConsultaRepository,
  ExpoSqliteAdapter,
  FirestoreSyncStore,
  MedicoRepository,
  PacienteRepository,
  SyncService,
  estaFirebaseConfigurado,
  generarUuidV4PorDefecto,
  inicializarBaseDatos,
  obtenerServiciosFirebase,
} from '../data';
import { Medico } from '../domain';

const KEY_ID_DISPOSITIVO = 'antropometria_id_dispositivo';

export interface AppContextValue {
  listo: boolean;
  errorInicializacion: string | null;
  hayConexion: boolean;
  sincronizando: boolean;
  pendientesSync: number;
  ultimoErrorSync: string | null;
  medico: Medico | null;
  medicoRepo: MedicoRepository | null;
  pacienteRepo: PacienteRepository | null;
  consultaRepo: ConsultaRepository | null;
  authManager: AuthManager | null;
  sincronizarAhora: () => Promise<void>;
  refrescarPendientes: () => Promise<void>;
  establecerMedicoActivo: (medico: Medico | null) => void;
}

const AppContext = createContext<AppContextValue | null>(null);

async function obtenerOGenerarIdDispositivo(): Promise<string> {
  const existente = await AsyncStorage.getItem(KEY_ID_DISPOSITIVO);
  if (existente) return existente;
  const nuevo = generarUuidV4PorDefecto();
  await AsyncStorage.setItem(KEY_ID_DISPOSITIVO, nuevo);
  return nuevo;
}

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [listo, setListo] = useState(false);
  const [errorInicializacion, setErrorInicializacion] = useState<string | null>(null);
  const [hayConexion, setHayConexion] = useState(true);
  const [sincronizando, setSincronizando] = useState(false);
  const [pendientesSync, setPendientesSync] = useState(0);
  const [ultimoErrorSync, setUltimoErrorSync] = useState<string | null>(null);
  const [medico, setMedico] = useState<Medico | null>(null);

  const medicoRepoRef = useRef<MedicoRepository | null>(null);
  const pacienteRepoRef = useRef<PacienteRepository | null>(null);
  const consultaRepoRef = useRef<ConsultaRepository | null>(null);
  const authManagerRef = useRef<AuthManager | null>(null);
  const syncServiceRef = useRef<SyncService | null>(null);
  const idDispositivoRef = useRef<string>('device-local');
  const syncEnCursoRef = useRef(false);

  const refrescarPendientes = useCallback(async () => {
    if (!medicoRepoRef.current || !medico) {
      setPendientesSync(0);
      return;
    }
    const total = await medicoRepoRef.current.contarCambiosPendientes(medico.uid_medico);
    setPendientesSync(total);
  }, [medico]);

  const sincronizarAhora = useCallback(async () => {
    if (!syncServiceRef.current || !medico || !hayConexion || syncEnCursoRef.current) {
      return;
    }
    syncEnCursoRef.current = true;
    setSincronizando(true);
    setUltimoErrorSync(null);
    try {
      const resumen = await syncServiceRef.current.sincronizar({
        uid_medico: medico.uid_medico,
        id_dispositivo: idDispositivoRef.current,
        hayConexion: true,
      });
      if (resumen.errores > 0) {
        setUltimoErrorSync('Algunos registros no pudieron sincronizarse; se reintentará luego.');
      }
      await refrescarPendientes();
    } catch (err: unknown) {
      setUltimoErrorSync(err instanceof Error ? err.message : 'Error de sincronización.');
    } finally {
      syncEnCursoRef.current = false;
      setSincronizando(false);
    }
  }, [hayConexion, medico, refrescarPendientes]);

  useEffect(() => {
    let mounted = true;
    let unsubNet: (() => void) | null = null;
    let unsubAuth: (() => void) | null = null;

    async function bootstrap() {
      try {
        const db = await ExpoSqliteAdapter.abrir();
        await inicializarBaseDatos(db);
        idDispositivoRef.current = await obtenerOGenerarIdDispositivo();

        const mRepo = new MedicoRepository(db);
        const pRepo = new PacienteRepository(db);
        const cRepo = new ConsultaRepository(db);
        const remote = new FirestoreSyncStore();
        const sync = new SyncService(db, remote);
        const authMgr = new AuthManager(mRepo, remote);

        medicoRepoRef.current = mRepo;
        pacienteRepoRef.current = pRepo;
        consultaRepoRef.current = cRepo;
        syncServiceRef.current = sync;
        authManagerRef.current = authMgr;

        const netInicial = await NetInfo.fetch();
        if (mounted) {
          setHayConexion(Boolean(netInicial.isConnected && netInicial.isInternetReachable !== false));
        }

        unsubNet = NetInfo.addEventListener((state) => {
          if (!mounted) return;
          setHayConexion(Boolean(state.isConnected && state.isInternetReachable !== false));
        });

        if (estaFirebaseConfigurado()) {
          const { auth } = obtenerServiciosFirebase();
          unsubAuth = onAuthStateChanged(auth, async (user) => {
            if (!mounted) return;
            if (!user) {
              setMedico(null);
              setPendientesSync(0);
              setListo(true);
              return;
            }
            let perfilLocal = await mRepo.obtenerPorUid(user.uid);
            if (!perfilLocal) {
              perfilLocal = await mRepo.guardarPerfil({
                uid_medico: user.uid,
                correo: user.email ?? '',
              });
            }
            if (mounted) {
              setMedico(perfilLocal);
              setListo(true);
            }
          });
        } else if (mounted) {
          setErrorInicializacion('Faltan credenciales de Firebase (.env).');
          setListo(true);
        }
      } catch (err: unknown) {
        if (mounted) {
          setErrorInicializacion(err instanceof Error ? err.message : 'Error al iniciar la app.');
          setListo(true);
        }
      }
    }

    bootstrap();
    return () => {
      mounted = false;
      unsubNet?.();
      unsubAuth?.();
    };
  }, []);

  // Sincronización automática al recuperar red o iniciar sesión (CU-20 / HU-21)
  useEffect(() => {
    if (listo && medico && hayConexion) {
      sincronizarAhora();
    } else if (listo && medico) {
      refrescarPendientes();
    }
  }, [listo, medico, hayConexion, sincronizarAhora, refrescarPendientes]);

  return (
    <AppContext.Provider
      value={{
        listo,
        errorInicializacion,
        hayConexion,
        sincronizando,
        pendientesSync,
        ultimoErrorSync,
        medico,
        medicoRepo: medicoRepoRef.current,
        pacienteRepo: pacienteRepoRef.current,
        consultaRepo: consultaRepoRef.current,
        authManager: authManagerRef.current,
        sincronizarAhora,
        refrescarPendientes,
        establecerMedicoActivo: setMedico,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useApp(): AppContextValue {
  const ctx = useContext(AppContext);
  if (!ctx) {
    throw new Error('useApp debe utilizarse dentro de AppProvider.');
  }
  return ctx;
}
