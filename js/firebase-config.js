// =============================================
// ROLLERMATCH1 — FIREBASE CONFIG
// ✅ Proyecto: RollerMatchv2
// =============================================

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getAuth }       from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { getFirestore }  from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const firebaseConfig = {
  apiKey:            "AIzaSyDg8pRkiLJp6V32lBLnCoyX15KCr3pEpwc",
  authDomain:        "rollermatchv2.firebaseapp.com",
  projectId:         "rollermatchv2",
  storageBucket:     "rollermatchv2.firebasestorage.app",
  messagingSenderId: "1043279960767",
  appId:             "1:1043279960767:web:f3322a2b65fa62fced040a",
  measurementId:     "G-TZYPV1R30Z",
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db   = getFirestore(app);

// UID del administrador — ponlo aquí después de registrarte
export const ADMIN_UID = "d466APZIJEfVBSNzoYelYsxdNvl1";
