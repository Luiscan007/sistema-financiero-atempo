/**
 * lib/firebase.ts
 * Configuración central de Firebase para ATEMPO Sistema Financiero
 * Incluye: Firestore, Auth, Storage, Analytics
 */

import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import {
    getFirestore,
    enableIndexedDbPersistence,
    connectFirestoreEmulator,
} from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

// ⚠️ IMPORTANTE: Reemplaza estos valores con tu proyecto Firebase real
// Crea tu proyecto en https://console.firebase.google.com
const firebaseConfig = {
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || 'TU_API_KEY_AQUI',
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || 'tu-proyecto.firebaseapp.com',
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 'tu-proyecto-id',
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || 'tu-proyecto.appspot.com',
    messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || '123456789',
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || '1:123456789:web:abcdef',
};

// Inicializar Firebase (evita duplicados en hot reload de Next.js)
const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);

// Exportar servicios
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);
export const googleProvider = new GoogleAuthProvider();

// Configurar proveedor de Google
googleProvider.addScope('profile');
googleProvider.addScope('email');
googleProvider.setCustomParameters({ prompt: 'select_account' });

// Persistencia offline para Firestore (modo POS sin internet)
if (typeof window !== 'undefined') {
    enableIndexedDbPersistence(db).catch((err) => {
        if (err.code === 'failed-precondition') {
            console.warn('Firestore offline: múltiples pestañas abiertas');
        } else if (err.code === 'unimplemented') {
            console.warn('Firestore offline: navegador no soportado');
        }
    });
}

// Conectar a emuladores en desarrollo
if (process.env.NODE_ENV === 'development' && process.env.NEXT_PUBLIC_USE_EMULATORS === 'true') {
    connectFirestoreEmulator(db, 'localhost', 8080);
}

export default app;

// ============================
// COLECCIONES DE FIRESTORE
// Nombres de colecciones centralizados para evitar errores de tipeo
// ============================
export const COLECCIONES = {
    VENTAS: 'ventas',
    PRODUCTOS: 'productos',
    CLIENTES: 'clientes',
    GASTOS: 'gastos',
    TASAS: 'tasas_cambio',
    HISTORIAL_TASAS: 'historial_tasas',
    USUARIOS: 'usuarios',
    CONFIGURACION: 'configuracion',
    CUENTAS_COBRAR: 'cuentas_cobrar',
    CUENTAS_PAGAR: 'cuentas_pagar',
    PROVEEDORES: 'proveedores',
    LOG_ACTIVIDAD: 'log_actividad',
} as const;
