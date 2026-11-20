# Actualizaciones al Reporte Final (Alineación Código vs. Documento Preliminar)

Este documento registra todos los ajustes técnicos, arquitectónicos y de pruebas realizados durante la implementación real del sistema para que el equipo los integre directamente en el **Reporte Final** antes de la entrega.

---

## 1. Sección 2.7 y 9.1 — Alcance Multiplataforma (Android + iOS)
* **En el borrador preliminar:** La sección 2.7 (`RNF-06`) contemplaba Android 8.0+ e iOS 16.4+, mientras que las secciones 9.1 y 9.2 mencionaban que el MVP se limitó únicamente a Android.
* **Estado real implementado:** Al utilizar **Expo SDK 58 + Expo Router** con librerías multiplataforma puras/oficiales (`expo-sqlite`, `firebase` JS SDK, `react-native-svg`, `expo-print`, `expo-sharing`, `expo-file-system`), la base de código actual es **compatible tanto con Android como con iOS** sin código nativo exclusivo de Android. *(Nota: En pruebas de aceptación, especificar en qué dispositivos físicos/emuladores se validó realmente antes de la entrega).*

---

## 2. Sección 3.9 — Diccionario de Datos y Esquema SQLite
* **Correcciones tipográficas detectadas en las tablas del borrador:**
  * `CONSULTA`: corregir `56ersión56_medicion` → **`posicion_medicion`** y `56ersión_motor` → **`version_motor`**.
  * `INDICADOR`: corregir `57ódigo_indicador` → **`codigo_indicador`**.
* **Mejoras implementadas en [`src/data/database/schema.ts`](../src/data/database/schema.ts):**
  * Activación de `PRAGMA foreign_keys = ON` y `PRAGMA journal_mode = WAL`.
  * Columnas auxiliares `folio_normalizado` y `nombre_normalizado` en `PACIENTE` para cumplir `CU-08` (búsqueda parcial insensible a mayúsculas y acentos).
  * Índice único parcial `idx_paciente_folio_activo` (`UNIQUE(uid_medico, folio_normalizado) WHERE eliminado_en IS NULL`) para impedir folios duplicados en activos sin bloquear la reutilización de un folio tras baja lógica (`CU-11`).
  * Restricción `CHECK` compuesta en `RESULTADO_INDICADOR` que garantiza consistencia estricta entre `estado = 'CALCULADO'` y `estado = 'NO_APLICA'`.
  * **Tablas OMS (`oms_2006_lms.json` + `conjunto_oms.json`):** Aunque el esquema mantiene la definición de `PARAMETRO_LMS` y siembra `CONJUNTO_OMS` (`OMS_2006_V1` con SHA-256 verificable), los coeficientes oficiales día por día (`0–1826` días) y cada `0.1 cm` (`45–110 cm` y `65–120 cm`) se cargan en memoria desde un paquete JSON indexado en $O(1)$ (`397.7 KB`) extraído del repositorio oficial de la OMS [`worldhealthorganization/anthro`](https://github.com/worldhealthorganization/anthro). Esto reemplaza tablas mensuales incompletas y garantiza exactitud `|ΔZ| < 0.01` (`RNF-01`).

---

## 3. Sección 3.10 — Diseño de Pantallas
* **Pendiente en borrador:** Esta sección aparecía vacía.
* **Rutas reales implementadas con Expo Router (`src/app/`):**
  * **Autenticación:** `/(auth)/login`, `/(auth)/register`, `/(auth)/forgot-password` (`CU-01` a `CU-03`).
  * **Navegación inferior (Tabs):** `/(tabs)/pacientes` (`CU-08`), `/(tabs)/registrar-paciente` (`CU-07`), `/(tabs)/cuenta` (`CU-04` a `CU-06`).
  * **Flujo clínico:** `/paciente/[id]` (`CU-09`), `/paciente/[id]/editar` (`CU-10`), `/paciente/[id]/nueva-consulta` (`CU-12`, `CU-15`), `/paciente/[id]/curvas` (`CU-18`), `/paciente/consulta/[idConsulta]` (`CU-17`), `/paciente/consulta/[idConsulta]/editar` (`CU-13`), `/paciente/consulta/[idConsulta]/reporte` (`CU-19`).
  * **Responsividad (`RNF-06`):** `ResponsiveContainer` y `useResponsiveLayout` adaptan formularios centrados en tabletas (`>= 768 px`) y cuadrícula de 2 columnas en la lista de pacientes.
  * **Acción para el equipo:** Capturar pantallas reales (o exportar los diseños de Figma) e insertarlas en esta sección.

---

## 4. Sección 4.3, 6.1 y 6.4 — Stack Tecnológico y Herramientas (Actualizado)
El borrador preliminar listaba librerías descontinuadas (`react-native-sqlite-storage`, `react-native-svg-charts`, `react-native-pdf-lib`). La tabla real implementada en el proyecto es:

| Capa / Responsabilidad | Tecnología real implementada |
| :--- | :--- |
| **Framework móvil y enrutamiento** | React Native (`0.88.1`), Expo SDK 58 (`~58.0.25`), Expo Router (`~58.0.32`) |
| **Lenguaje y tipado** | TypeScript (`~6.0.3`, modo `strict: true`) |
| **Persistencia local** | `expo-sqlite` (`~58.0.17`) con transacciones atómicas y `PRAGMA foreign_keys = ON` |
| **Autenticación y nube** | Firebase JS SDK (`^13.4.0`: Auth con persistencia en `AsyncStorage` + Cloud Firestore) |
| **Conectividad y UUID** | `@react-native-community/netinfo` (`12.0.1`), `expo-crypto` |
| **Visualización gráfica OMS** | `react-native-svg` (`15.16.0`) + motor geométrico compartido (`growthChartBuilder.ts`) |
| **Generación y exportación PDF** | `expo-print`, `expo-file-system`, `expo-sharing` (HTML + SVG embebido → `[Folio]_[Fecha].pdf`) |
| **Pruebas y calidad** | Jest (`^30.5.2`), `ts-jest`, `node:sqlite` (integración SQL real), ESLint (`^10.15.0`), Prettier |
| **Ingesta de referencias OMS** | Script Python (`scripts/build_who_tables.py`) sobre `worldhealthorganization/anthro` |

---

## 5. Sección 6.5 y 6.6 — Implementación y Pruebas Realizadas
* **Motor LMS (`AnthroEngine`):**
  * Implementa la regla de corte de **731 días** (24 meses) para ajuste `±0.7 cm` y selección entre `LONGITUD` (`45–110 cm`) y `TALLA` (`65–120 cm`) con interpolación lineal cada `0.1 cm`.
  * Implementa la fórmula logarítmica para `L = 0` y el **ajuste restringido OMS para valores extremos `|Z| > 3`** en `P_E`, `P_T` e `IMC_E` (`SD3pos/SD23pos` y `SD3neg/SD23neg`).
* **Evidencia actual de pruebas automatizadas (ejecutadas en entorno Node/Jest):**
  * `npm run typecheck` (`tsc --noEmit`): 0 errores.
  * `npm run lint` (`eslint`): 0 errores.
  * `__tests__/anthroEngine.test.ts` y `__tests__/validationAndClassification.test.ts`: validación con diferencia `< 0.01 Z` frente a casos de referencia y vectores oficiales de `worldhealthorganization/anthro`, más medición `< 1.5 s` (`RNF-05`) para 100 evaluaciones consecutivas.
  * `__tests__/dataAndSync.test.ts`: pruebas de integración sobre SQLite real (`node:sqlite`), unicidad de folios, recálculo en cascada (`CU-10`), rollbacks, baja lógica y sincronización multi-dispositivo (`CU-20`).
  * `__tests__/growthChartAndPdf.test.ts`: geometría SVG (`CU-18`), plantilla HTML/SVG y anonimización de nombre de archivo PDF (`CU-19`).
  * `__tests__/acceptanceScenarios.test.ts`: verificación automatizada de flujos `PA-01` a `PA-07`.
* **Pendiente por documentar con dispositivo físico:** Medir y registrar tiempos reales en dispositivo Android de cálculo (`< 1.5 s`) y generación/exportación de PDF (`< 3 s`), así como evidencia con cuentas reales de Firebase Auth/Firestore.

---

## 6. Sección 11 — Anexos
* Incluir en los Anexos el contenido de [`docs/tabla_clasificacion_oms.md`](./tabla_clasificacion_oms.md) como **Tabla 2: Puntos de corte de clasificación referencial (OMS 2006/2007 y NOM-031-SSA2-1999)**, junto con los umbrales de plausibilidad biológica (`CU-15`).
