# Aplicación Móvil de Seguimiento Antropométrico Pediátrico (0–5 años)

**Instituto Politécnico Nacional — Escuela Superior de Cómputo (ESCOM)**
Unidad de Aprendizaje: *Ingeniería de Software* (Grupo 6CM3)

Aplicación móvil **Local-First** dirigida a médicos pediatras y de primer contacto para el cálculo determinista, visualización de curvas oficiales de la OMS (2006) y generación de reportes clínicos en PDF durante consultas de niño sano y Desarrollo Infantil Temprano (DIT).

> **Aviso clínico:** Software de Soporte a la Toma de Decisiones Clínicas (CDSS) informativo. Clasificación referencial, no diagnóstica.

---

## Stack Tecnológico

* **Framework móvil:** React Native + Expo SDK 58 + TypeScript (`strict: true`)
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

## Probar KidoLog en Expo Go

Usa Node.js 24 y una versión de Expo Go compatible con Expo SDK 58.

1. Clona la rama de KidoLog e instala las dependencias del archivo de bloqueo.

   ```sh
   git clone --branch feature/kidolog-ui --single-branch https://github.com/GaeloCanelo/App-Seguimiento-Antropometrico.git
   cd App-Seguimiento-Antropometrico
   npm ci
   ```

2. Crea un archivo `.env` local a partir de `.env.example`. Completa las seis variables con la configuración de la aplicación web de tu proyecto de Firebase. Activa el acceso con correo y contraseña y configura Firestore según la [guía de Firebase](./docs/firebase_setup.md).
3. Ejecuta `npx expo start --go`. Conecta el teléfono y la computadora a la misma red y abre el QR con la cámara del iPhone o con el lector de Expo Go en Android.
4. Registra una cuenta de prueba y agrega un paciente ficticio y una consulta. Desde Resultados OMS, toca un indicador para abrir su curva o abre Reporte PDF para exportar la consulta.

## Verificación local

Las pruebas usan datos de ejemplo y SQLite en memoria. No requieren una cuenta de Firebase ni un archivo `.env`.

```sh
npm run typecheck
npm run lint
npm test -- --runInBand
```

Consulta [CONTRIBUTING.md](./CONTRIBUTING.md) para el flujo de ramas (`main`, `develop`, `feature/*`) y reglas del equipo.
