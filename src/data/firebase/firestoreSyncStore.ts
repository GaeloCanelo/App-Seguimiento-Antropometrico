import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  orderBy,
  query,
  setDoc,
  where,
  writeBatch,
} from 'firebase/firestore';
import { Medico } from '../../domain';
import { ahoraUtcIso } from '../database/utils';
import {
  CambiosRemotosDelta,
  ConsultaRemotaDoc,
  PacienteRemotoDoc,
  RemoteSyncStore,
} from '../sync/syncTypes';
import { obtenerServiciosFirebase } from './firebaseConfig';

/**
 * Implementación remota en Cloud Firestore siguiendo el esquema de la sección 3.9:
 * - medicos/{uid_medico}
 * - medicos/{uid_medico}/pacientes/{id_paciente}
 * - medicos/{uid_medico}/consultas/{id_consulta}
 */
export class FirestoreSyncStore implements RemoteSyncStore {
  async guardarPerfilMedico(medico: Medico): Promise<void> {
    const { firestore } = obtenerServiciosFirebase();
    await setDoc(doc(firestore, 'medicos', medico.uid_medico), medico, { merge: true });
  }

  async obtenerPerfilMedico(uidMedico: string): Promise<Medico | null> {
    const { firestore } = obtenerServiciosFirebase();
    const snap = await getDoc(doc(firestore, 'medicos', uidMedico));
    return snap.exists() ? (snap.data() as Medico) : null;
  }

  async subirPaciente(
    uidMedico: string,
    pacienteDoc: PacienteRemotoDoc,
  ): Promise<{ revisionRemota: number; confirmadoEn: string }> {
    const { firestore } = obtenerServiciosFirebase();
    await setDoc(
      doc(firestore, 'medicos', uidMedico, 'pacientes', pacienteDoc.id_paciente),
      pacienteDoc,
      { merge: true },
    );
    return { revisionRemota: pacienteDoc.revision_remota, confirmadoEn: ahoraUtcIso() };
  }

  async subirConsulta(
    uidMedico: string,
    consultaDoc: ConsultaRemotaDoc,
  ): Promise<{ revisionRemota: number; confirmadoEn: string }> {
    const { firestore } = obtenerServiciosFirebase();
    await setDoc(
      doc(firestore, 'medicos', uidMedico, 'consultas', consultaDoc.id_consulta),
      consultaDoc,
      { merge: true },
    );
    return { revisionRemota: consultaDoc.revision_remota, confirmadoEn: ahoraUtcIso() };
  }

  async descargarCambios(
    uidMedico: string,
    cursorRemoto: string | null,
  ): Promise<CambiosRemotosDelta> {
    const { firestore } = obtenerServiciosFirebase();
    const pacRef = collection(firestore, 'medicos', uidMedico, 'pacientes');
    const conRef = collection(firestore, 'medicos', uidMedico, 'consultas');

    const pacQuery = cursorRemoto
      ? query(pacRef, where('actualizado_en', '>', cursorRemoto), orderBy('actualizado_en', 'asc'))
      : query(pacRef, orderBy('actualizado_en', 'asc'));

    const conQuery = cursorRemoto
      ? query(conRef, where('actualizado_en', '>', cursorRemoto), orderBy('actualizado_en', 'asc'))
      : query(conRef, orderBy('actualizado_en', 'asc'));

    const [pacSnap, conSnap] = await Promise.all([getDocs(pacQuery), getDocs(conQuery)]);

    const pacientes = pacSnap.docs.map((d) => d.data() as PacienteRemotoDoc);
    const consultas = conSnap.docs.map((d) => d.data() as ConsultaRemotaDoc);

    let maxTs = cursorRemoto;
    for (const p of pacientes) {
      if (!maxTs || p.actualizado_en > maxTs) maxTs = p.actualizado_en;
    }
    for (const c of consultas) {
      if (!maxTs || c.actualizado_en > maxTs) maxTs = c.actualizado_en;
    }

    return { pacientes, consultas, nuevoCursor: maxTs };
  }

  async eliminarTodoDeMedico(uidMedico: string): Promise<void> {
    const { firestore } = obtenerServiciosFirebase();
    const [pacSnap, conSnap] = await Promise.all([
      getDocs(collection(firestore, 'medicos', uidMedico, 'pacientes')),
      getDocs(collection(firestore, 'medicos', uidMedico, 'consultas')),
    ]);

    const batch = writeBatch(firestore);
    conSnap.docs.forEach((d) => batch.delete(d.ref));
    pacSnap.docs.forEach((d) => batch.delete(d.ref));
    await batch.commit();

    await deleteDoc(doc(firestore, 'medicos', uidMedico));
  }
}
