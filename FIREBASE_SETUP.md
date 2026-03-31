# 🔥 FIREBASE SETUP — RollerMatch1

## 1. Crear el Proyecto en Firebase

1. Ve a https://console.firebase.google.com
2. Clic en **"Agregar proyecto"**
3. Nombre del proyecto: `rollermatch1` (o el que quieras)
4. Desactiva Google Analytics si no lo necesitas
5. Clic en **"Crear proyecto"**

---

## 2. Habilitar Authentication

1. En el panel lateral: **Build → Authentication**
2. Clic en **"Comenzar"**
3. Pestaña **"Sign-in method"**
4. Habilitar **"Correo electrónico/Contraseña"** → Guardar

---

## 3. Crear Firestore Database

1. En el panel lateral: **Build → Firestore Database**
2. Clic en **"Crear base de datos"**
3. Selecciona **"Modo de prueba"** (después cambia a producción)
4. Elige la región (europe-west para España)
5. Confirmar

---

## 4. Obtener la Config de Firebase

1. En el panel principal: **Configuración del proyecto** (⚙️)
2. Pestaña **"General"**
3. Baja hasta **"Tus apps"** → Clic en **"</>"** (Web)
4. Registra tu app con el nombre "RollerMatch1"
5. Copia la config que te muestra, algo así:

```javascript
const firebaseConfig = {
  apiKey:            "AIzaSy...",
  authDomain:        "rollermatch1.firebaseapp.com",
  projectId:         "rollermatch1",
  storageBucket:     "rollermatch1.firebasestorage.app",
  messagingSenderId: "123456789",
  appId:             "1:123456789:web:abc123...",
};
```

---

## 5. Pegar la Config en el Proyecto

Abre **`index.html`** y busca la línea:
```javascript
// ⚠️ REEMPLAZA con tu config de Firebase:
const firebaseConfig = {
  apiKey: "TU_API_KEY",
  ...
};
```
Sustituye esa sección con tu config real.

---

## 6. Reglas de Firestore

Ve a **Firestore → Reglas** y pega esto:

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {

    // Usuarios — solo el propio usuario puede escribir su perfil
    match /usuarios/{uid} {
      allow read: if request.auth != null;
      allow write: if request.auth.uid == uid;
    }

    // Usernames — solo lectura pública, escritura solo el usuario
    match /usernames/{username} {
      allow read: if true;
      allow write: if request.auth != null;
    }

    // Likes
    match /likes/{likeId} {
      allow read, write: if request.auth != null;
    }

    // Matches
    match /matches/{matchId} {
      allow read, write: if request.auth != null && 
        request.auth.uid in resource.data.users;
    }

    // Chats
    match /chats/{chatId} {
      allow read, write: if request.auth != null && 
        request.auth.uid in resource.data.users;
      
      match /messages/{msgId} {
        allow read, write: if request.auth != null;
      }
    }

    // Rutas — todos los usuarios autenticados pueden leer
    match /rutas/{rutaId} {
      allow read: if request.auth != null;
      allow write: if request.auth != null;
    }
  }
}
```

---

## 7. Índices necesarios (Firestore)

Ve a **Firestore → Índices** y crea:

- Colección: `chats` | Campo: `users` (Arrays) + `lastMsg` (Desc)
- Colección: `rutas` | Campo: `fecha` (Asc)

---

## 8. Subir a GitHub + Vercel

```bash
# En la raíz de RollerMatch1:
git init
git add .
git commit -m "Initial commit — RollerMatch1 🛼"
git branch -M main
git remote add origin https://github.com/TU_USUARIO/RollerMatch1.git
git push -u origin main
```

Luego ve a https://vercel.com → Importar el repo → Deploy automático 🚀

---

## 9. Variables de Entorno (Opcional para mayor seguridad)

En Vercel puedes usar variables de entorno. Pero para Firebase Web SDK
la apiKey es pública por diseño. Lo importante son las **reglas de Firestore**.

---

## ✅ Checklist final

- [ ] Proyecto Firebase creado
- [ ] Authentication habilitado (Email/Password)
- [ ] Firestore en modo producción con reglas
- [ ] Config pegada en `index.html`
- [ ] Repo en GitHub
- [ ] Desplegado en Vercel
