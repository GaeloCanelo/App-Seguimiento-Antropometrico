# Guía de Contribución y Flujo Git (Equipo 6CM3 - ESCOM)

Este proyecto sigue una arquitectura **MVVM + Repository (Local-First)** y flujo de trabajo basado en **XP (Extreme Programming)** con 7 integrantes.

---

## 1. Estrategia de Ramas

* `main` — Rama estable y lista para demostración / entrega. **Nunca hacer push directo.**
* `develop` — Rama de integración continua del equipo. Todo Pull Request (PR) apunta aquí.
* `feature/<modulo>` — Ramas individuales por historia o caso de uso, siempre creadas desde `develop`:
  * `feature/core-anthro-engine`
  * `feature/data-sqlite-schema`
  * `feature/cloud-auth-sync`
  * `feature/ui-pacientes`
  * `feature/ui-consulta-resultados`
  * `feature/charts-pdf`
  * `fix/<descripcion-corta>`

### Flujo diario de trabajo
```bash
git checkout develop
git pull origin develop
git checkout -b feature/mi-modulo

# ... trabajar y probar ...
npm test
npm run typecheck

git add .
git commit -m "feat(domain): implementa calculo LMS para P/E y T/E"
git push -u origin feature/mi-modulo
```
Luego abrir un **Pull Request hacia `develop`** y solicitar revisión de al menos **1 compañero**.

---

## 2. Convención de Commits

Usar prefijos claros (Conventional Commits):
* `feat(modulo): ...` — Nueva funcionalidad
* `fix(modulo): ...` — Corrección de bug
* `test(modulo): ...` — Pruebas unitarias / aceptación
* `docs(modulo): ...` — Documentación (README, anexos, diagramas)
* `refactor(modulo): ...` — Refactorización sin cambiar comportamiento
* `chore(modulo): ...` — Configuración, dependencias, scripts

---

## 3. Reglas de Arquitectura (MVVM)

1. **`src/domain/`**: TypeScript **100% puro**. Prohibido importar librerías de UI (`react-native`), `expo-sqlite` o Firebase aquí. Debe poder probarse con `npm test` en milisegundos.
2. **`src/data/`**: Implementa el acceso a **SQLite** y **Cloud Firestore** detrás de interfaces Repository. Las escrituras de consulta + 5 resultados deben ir siempre dentro de **una transacción atómica**.
3. **`src/viewmodels/`**: Hooks y Context API que conectan la Vista con Repositorios y `AnthroEngine`, manejan estados `loading / error / sync` y validaciones de formulario.
4. **`src/views/`**: Componentes visuales y pantallas. No contienen fórmulas matemáticas ni consultas SQL directas.
5. **`src/services/`**: Utilidades transversales (generación de PDF anonimizado, monitoreo de red).

---

## 4. Criterios antes de abrir PR

* [ ] `npm run typecheck` pasa sin errores de TypeScript.
* [ ] `npm test` pasa al 100% (en especial las pruebas del motor contra referencias WHO Anthro).
* [ ] No se suben credenciales (`.env`, `google-services.json`) ni datos reales de pacientes.
