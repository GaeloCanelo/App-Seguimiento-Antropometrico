# Configuración de Firebase Console (5 minutos)

Esta guía configura **Firebase Authentication** y **Cloud Firestore** para la aplicación móvil.

---

## 1. Crear el proyecto en Firebase
1. Entra a [Firebase Console](https://console.firebase.google.com/).
2. Haz clic en **Add project** (Agregar proyecto), nómbralo por ejemplo `antropometria-pediatrica-escom` y finaliza el asistente (puedes desactivar Google Analytics para agilizar).

## 2. Registrar la aplicación para obtener credenciales
1. En el menú superior izquierdo del proyecto haz clic en **Project Overview** → ícono **`</>` (Web)** *(el SDK JS de Firebase funciona en Android, iOS y Web dentro de Expo sin pasos nativos extra)*.
2. Asigna un apodo (ej. `app-movil-expo`) y registra la app.
3. Copia los 6 valores del objeto `firebaseConfig` a un archivo nuevo llamado **`.env`** en la raíz del proyecto (usando como plantilla `.env.example`):
   * `EXPO_PUBLIC_FIREBASE_API_KEY`
   * `EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN`
   * `EXPO_PUBLIC_FIREBASE_PROJECT_ID`
   * `EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET`
   * `EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID`
   * `EXPO_PUBLIC_FIREBASE_APP_ID`

> **Seguridad:** El archivo `.env` está en `.gitignore`; nunca lo subas a GitHub. Compártelo con los integrantes por un canal privado.

## 3. Activar Firebase Authentication (`CU-01` a `CU-06`)
1. En el menú izquierdo ve a **Build → Authentication → Get started**.
2. En **Sign-in method**, activa **Email/Password** (*Correo electrónico/contraseña*) y guarda.

## 4. Crear Cloud Firestore y sus Reglas de Aislamiento (`PA-07`, `RNF-03`)
1. En el menú izquierdo ve a **Build → Firestore Database → Create database**.
2. Elige la ubicación más cercana (ej. `us-central1` o `nam5`) y modo **Production mode**.
3. Ve a la pestaña **Rules** y reemplaza las reglas por las siguientes (garantizan aislamiento estricto por `uid_medico`):

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /medicos/{uid}/{document=**} {
      allow read, write: if request.auth != null && request.auth.uid == uid;
    }
  }
}
```

4. Haz clic en **Publish**.
