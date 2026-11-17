# Aplicación Móvil de Seguimiento Antropométrico Pediátrico (0–5 años)

**Instituto Politécnico Nacional — Escuela Superior de Cómputo (ESCOM)**
Unidad de Aprendizaje: *Ingeniería de Software* (Grupo 6CM3)

Aplicación móvil **Local-First** dirigida a médicos pediatras y de primer contacto para el cálculo determinista, visualización de curvas oficiales de la OMS (2006) y generación de reportes clínicos en PDF durante consultas de niño sano y Desarrollo Infantil Temprano (DIT).

> **Aviso clínico:** Software de Soporte a la Toma de Decisiones Clínicas (CDSS) informativo. Clasificación referencial, no diagnóstica.

---

## Stack Tecnológico

* **Framework móvil:** React Native + Expo (Development Build) + TypeScript (`strict: true`)
* **Arquitectura:** MVVM + Repository Pattern (Local-First)
* **Persistencia local:** SQLite (`expo-sqlite`) con integridad referencial y transacciones atómicas
* **Autenticación y respaldo remoto:** Firebase Authentication + Cloud Firestore
* **Gráficas vectoriales:** `react-native-svg`
* **Reportes PDF:** `expo-print` + `expo-sharing` (HTML + SVG → PDF offline, anonimizado `[Folio]_[Fecha].pdf`)
* **Pruebas unitarias:** Jest + `ts-jest` (validación contra casos de referencia *WHO Anthro*, `|ΔZ| < 0.01`)

---

## Estructura del Proyecto

```text
src/
 ├── assets/
 │    └── who/         # Tablas oficiales LMS de la OMS (0-1856 días y 0.1 cm) + hash SHA-256
 ├── domain/           # Entidades, validadores fisiológicos, AnthroEngine (LMS puro en TS)
 ├── data/             # Esquema SQLite, migraciones, repositorios y SyncService
 ├── viewmodels/       # Context API y hooks de estado (Auth, Pacientes, Consultas)
 ├── views/            # Pantallas React Native, componentes UI y ChartRenderer (SVG)
 └── services/         # Generador de PDF (CU-19) y utilidades de red
__tests__/             # Pruebas unitarias (AnthroEngine / WHO Anthro) e integración
scripts/               # Scripts Python para conversión y verificación SHA-256 de tablas OMS
docs/                  # Documentación técnica complementaria (Tabla 2 de clasificación, etc.)
```

---

## Comandos Principales

```bash
# Instalar dependencias
npm install

# Verificar tipos TypeScript
npm run typecheck

# Ejecutar pruebas unitarias (AnthroEngine y reglas clínicas)
npm test

# Iniciar servidor de desarrollo Expo
npx expo start
```

Consulta [CONTRIBUTING.md](./CONTRIBUTING.md) para el flujo de ramas (`main`, `develop`, `feature/*`) y reglas del equipo.
