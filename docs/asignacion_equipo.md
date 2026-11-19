# Asignación de Módulos y Ramas para los 7 Integrantes (Equipo 6CM3 - ESCOM)

La base del proyecto (`AnthroEngine` + tablas OMS 2006 + SQLite + Repositorios + Firebase/Sync + Navegación Expo Router + ViewModels) ya está integrada en `develop`.  
Cada integrante debe crear su rama desde `develop` (`git checkout develop && git pull && git checkout -b feature/<su-rama>`).

---

| Integrante | Rama asignada | Archivos / Módulos de su responsabilidad | Qué debe completar y probar |
| :--- | :--- | :--- | :--- |
| **1. Tech Lead / Motor OMS** | `feature/core-qa-motor` | `src/domain/`, `scripts/build_who_tables.py`, `__tests__/anthroEngine.test.ts` | Ampliar casos de prueba en `__tests__/fixtures/who_anthro_cases.json` (hasta 30–50 casos límite) y validar `RNF-01` (`< 0.01 Z`) y `RNF-05` (`< 1.5 s`). |
| **2. Datos Locales y SQLite** | `feature/data-edge-cases` | `src/data/repositories/`, `src/data/database/`, `__tests__/dataAndSync.test.ts` | Agregar pruebas para `CU-10` (rechazo si nueva fecha de nacimiento deja una consulta fuera de 0–60 meses), `CU-13` (corrección de consulta) y respaldo/migración. |
| **3. Autenticación y Sincronización** | `feature/cloud-auth-sync` | `src/data/firebase/`, `src/data/sync/`, `src/app/(auth)/`, `src/app/(tabs)/cuenta.tsx` | Completar UI de cambio de correo/contraseña (`CU-04`), flujo completo de eliminación de cuenta con contraseña (`CU-06`) y pruebas de `PA-06` / `PA-07` en dos dispositivos. |
| **4. UI Gestión de Pacientes** | `feature/ui-pacientes` | `src/app/(tabs)/pacientes.tsx`, `src/app/(tabs)/registrar-paciente.tsx`, `src/app/paciente/[id]/index.tsx`, `editar.tsx` | Pulir diseño Material Design, selector de fecha amigable (date picker o máscaras), mensajes de error por campo (`CU-07`, `CU-08`, `CU-09`, `CU-10`, `CU-11`) y diseño responsivo en tableta. |
| **5. UI Consultas y Resultados** | `feature/ui-consulta-resultados` | `src/app/paciente/[id]/nueva-consulta.tsx`, `src/app/paciente/consulta/[idConsulta]/index.tsx`, `editar.tsx` | Agregar aviso opcional de decremento `> 1 cm` (`CU-15 4b` con `detectarDecrementoMedida`), tarjetas visuales con colores por severidad (`CU-17`) y validación en tiempo real en inputs. |
| **6. Curvas SVG OMS y Reporte PDF** | `feature/charts-pdf` | `src/app/paciente/[id]/curvas.tsx`, `src/app/paciente/consulta/[idConsulta]/reporte.tsx`, `src/services/pdfReportService.ts`, `src/views/components/` | Crear componente `GrowthCurveSvg.tsx` (`react-native-svg`) con curvas Z (-3 a +3) y Percentiles (P3–P97), puntos cronológicos tocables (`CU-18`), y embeber la gráfica SVG en la vista previa y PDF (`CU-19`, `< 3 s`). |
| **7. QA, Pruebas de Aceptación y Documentación** | `feature/qa-docs` | `docs/`, `__tests__/`, Reporte Final (`3.10`, `4.3`, `6.6`, `7.3`, `11. Anexos`) | Ejecutar y documentar `PA-01` a `PA-07` y tiempos `RNF-05`; llenar secciones faltantes del Reporte Final (capturas de pantallas en `3.10`, stack final en `4.3`, `docs/tabla_clasificacion_oms.md` en `Anexos`) y elaborar Manual de Usuario. |

---

## Reglas para evitar conflictos al fusionar (`merge`)
1. **No edites archivos fuera de tu columna** sin avisar al equipo.
2. Antes de hacer `git push`, corre siempre:
   ```bash
   npm run typecheck
   npm run lint
   npm test
   ```
3. Sube tu rama y abre un **Pull Request hacia `develop`** (nunca directo a `main`).
