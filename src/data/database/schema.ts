import { CATALOGO_INDICADORES, CONJUNTO_OMS_VIGENTE } from '../../domain';
import { DatabaseAdapter } from './types';

export const SCHEMA_VERSION = 1;

const DDL_INICIAL = `
PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS MEDICO (
  uid_medico TEXT PRIMARY KEY NOT NULL,
  correo TEXT NOT NULL,
  nombre TEXT NULL,
  apellidos TEXT NULL,
  creado_en TEXT NOT NULL,
  actualizado_en TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS CONJUNTO_OMS (
  id_conjunto TEXT PRIMARY KEY NOT NULL,
  version TEXT NOT NULL,
  fuente_url TEXT NOT NULL,
  hash_archivos TEXT NOT NULL,
  fecha_importacion TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS INDICADOR (
  codigo_indicador TEXT PRIMARY KEY NOT NULL
    CHECK (codigo_indicador IN ('P_E', 'T_E', 'P_T', 'PC_E', 'IMC_E')),
  nombre TEXT NOT NULL,
  unidad_medida TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS PARAMETRO_LMS (
  id_parametro TEXT PRIMARY KEY NOT NULL,
  id_conjunto TEXT NOT NULL REFERENCES CONJUNTO_OMS(id_conjunto) ON DELETE CASCADE,
  codigo_indicador TEXT NOT NULL REFERENCES INDICADOR(codigo_indicador),
  sexo TEXT NOT NULL CHECK (sexo IN ('M', 'F')),
  tipo_tabla TEXT NOT NULL CHECK (tipo_tabla IN ('EDAD', 'LONGITUD', 'TALLA')),
  valor_eje REAL NOT NULL,
  l REAL NOT NULL,
  m REAL NOT NULL CHECK (m > 0),
  s REAL NOT NULL CHECK (s > 0)
);

CREATE TABLE IF NOT EXISTS PACIENTE (
  id_paciente TEXT PRIMARY KEY NOT NULL,
  uid_medico TEXT NOT NULL REFERENCES MEDICO(uid_medico) ON DELETE CASCADE,
  folio_clinico TEXT NOT NULL,
  folio_normalizado TEXT NOT NULL,
  nombre TEXT NOT NULL,
  nombre_normalizado TEXT NOT NULL,
  sexo TEXT NOT NULL CHECK (sexo IN ('M', 'F')),
  fecha_nacimiento TEXT NOT NULL,
  creado_en TEXT NOT NULL,
  actualizado_en TEXT NOT NULL,
  eliminado_en TEXT NULL,
  estado_sync TEXT NOT NULL CHECK (estado_sync IN ('PENDIENTE', 'SINCRONIZADO', 'ERROR')),
  revision_local INTEGER NOT NULL DEFAULT 1 CHECK (revision_local >= 1),
  revision_remota INTEGER NULL,
  confirmado_servidor_en TEXT NULL
);

-- Garantiza unicidad de folio por médico entre pacientes activos sin bloquear reutilización tras baja lógica
CREATE UNIQUE INDEX IF NOT EXISTS idx_paciente_folio_activo
  ON PACIENTE(uid_medico, folio_normalizado)
  WHERE eliminado_en IS NULL;

CREATE INDEX IF NOT EXISTS idx_paciente_medico_sync
  ON PACIENTE(uid_medico, estado_sync);

CREATE TABLE IF NOT EXISTS CONSULTA (
  id_consulta TEXT PRIMARY KEY NOT NULL,
  id_paciente TEXT NOT NULL REFERENCES PACIENTE(id_paciente) ON DELETE CASCADE,
  id_conjunto TEXT NOT NULL REFERENCES CONJUNTO_OMS(id_conjunto),
  fecha_consulta TEXT NOT NULL,
  peso_kg REAL NOT NULL CHECK (peso_kg >= 0.5 AND peso_kg <= 50),
  longitud_talla_cm REAL NOT NULL CHECK (longitud_talla_cm >= 35 AND longitud_talla_cm <= 140),
  perimetro_cefalico_cm REAL NOT NULL CHECK (perimetro_cefalico_cm >= 25 AND perimetro_cefalico_cm <= 60),
  posicion_medicion TEXT NOT NULL CHECK (posicion_medicion IN ('ACOSTADO', 'DE_PIE')),
  edad_dias INTEGER NOT NULL CHECK (edad_dias >= 0),
  longitud_talla_ajustada_cm REAL NOT NULL,
  imc REAL NOT NULL CHECK (imc > 0),
  atipico_confirmado INTEGER NOT NULL DEFAULT 0 CHECK (atipico_confirmado IN (0, 1)),
  version_motor TEXT NOT NULL,
  calculado_en TEXT NOT NULL,
  creado_en TEXT NOT NULL,
  actualizado_en TEXT NOT NULL,
  eliminado_en TEXT NULL,
  estado_sync TEXT NOT NULL CHECK (estado_sync IN ('PENDIENTE', 'SINCRONIZADO', 'ERROR')),
  revision_local INTEGER NOT NULL DEFAULT 1 CHECK (revision_local >= 1),
  revision_remota INTEGER NULL,
  confirmado_servidor_en TEXT NULL
);

CREATE INDEX IF NOT EXISTS idx_consulta_paciente_fecha
  ON CONSULTA(id_paciente, fecha_consulta DESC)
  WHERE eliminado_en IS NULL;

CREATE INDEX IF NOT EXISTS idx_consulta_estado_sync
  ON CONSULTA(estado_sync);

CREATE TABLE IF NOT EXISTS RESULTADO_INDICADOR (
  id_consulta TEXT NOT NULL REFERENCES CONSULTA(id_consulta) ON DELETE CASCADE,
  codigo_indicador TEXT NOT NULL REFERENCES INDICADOR(codigo_indicador),
  estado TEXT NOT NULL CHECK (estado IN ('CALCULADO', 'NO_APLICA')),
  puntaje_z REAL NULL,
  percentil REAL NULL CHECK (percentil IS NULL OR (percentil >= 0 AND percentil <= 100)),
  clasificacion TEXT NULL,
  es_atipico INTEGER NOT NULL DEFAULT 0 CHECK (es_atipico IN (0, 1)),
  motivo_no_aplica TEXT NULL,
  PRIMARY KEY (id_consulta, codigo_indicador),
  CHECK (
    (estado = 'CALCULADO' AND puntaje_z IS NOT NULL AND percentil IS NOT NULL AND clasificacion IS NOT NULL AND motivo_no_aplica IS NULL)
    OR
    (estado = 'NO_APLICA' AND puntaje_z IS NULL AND percentil IS NULL AND clasificacion IS NULL AND es_atipico = 0 AND motivo_no_aplica IS NOT NULL)
  )
);

CREATE TABLE IF NOT EXISTS ESTADO_SYNC (
  uid_medico TEXT NOT NULL REFERENCES MEDICO(uid_medico) ON DELETE CASCADE,
  id_dispositivo TEXT NOT NULL,
  cursor_remoto TEXT NULL,
  ultima_sincronizacion_en TEXT NULL,
  PRIMARY KEY (uid_medico, id_dispositivo)
);
`;

/**
 * Inicializa las tablas del esquema relacional en SQLite, activa claves foráneas
 * y siembra los catálogos inmutables (INDICADOR y CONJUNTO_OMS).
 */
export async function inicializarBaseDatos(db: DatabaseAdapter): Promise<void> {
  await db.execAsync('PRAGMA foreign_keys = ON; PRAGMA journal_mode = WAL;');

  const versionRow = await db.getFirstAsync<{ user_version: number }>('PRAGMA user_version;');
  const currentVersion = versionRow?.user_version ?? 0;

  if (currentVersion < 1) {
    await db.withExclusiveTransactionAsync(async () => {
      await db.execAsync(DDL_INICIAL);

      for (const ind of CATALOGO_INDICADORES) {
        await db.runAsync(
          `INSERT OR IGNORE INTO INDICADOR (codigo_indicador, nombre, unidad_medida)
           VALUES (?, ?, ?)`,
          ind.codigo_indicador,
          ind.nombre,
          ind.unidad_medida,
        );
      }

      await db.runAsync(
        `INSERT OR IGNORE INTO CONJUNTO_OMS
          (id_conjunto, version, fuente_url, hash_archivos, fecha_importacion)
         VALUES (?, ?, ?, ?, ?)`,
        CONJUNTO_OMS_VIGENTE.id_conjunto,
        CONJUNTO_OMS_VIGENTE.version,
        CONJUNTO_OMS_VIGENTE.fuente_url,
        CONJUNTO_OMS_VIGENTE.hash_archivos,
        CONJUNTO_OMS_VIGENTE.fecha_importacion,
      );

      await db.execAsync(`PRAGMA user_version = ${SCHEMA_VERSION};`);
    });
  }
}
