// =============================================
// ROLLERMATCH1 — FIREBASE CONFIG
// =============================================
// ⚠️  RELLENA CON TUS CREDENCIALES DE FIREBASE
// ⚠️  Crea un proyecto en https://console.firebase.google.com
// =============================================

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getAuth }       from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { getFirestore }  from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

// 🔴 REEMPLAZA ESTO CON TU CONFIG DE FIREBASE:
const firebaseConfig = {
  apiKey:            "TU_API_KEY",
  authDomain:        "TU_PROJECT.firebaseapp.com",
  projectId:         "TU_PROJECT_ID",
  storageBucket:     "TU_PROJECT.firebasestorage.app",
  messagingSenderId: "TU_SENDER_ID",
  appId:             "TU_APP_ID",
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db   = getFirestore(app);

// UID del administrador (ponlo después de registrarte)
export const ADMIN_UID = "PON_AQUI_TU_UID_DE_ADMIN";
