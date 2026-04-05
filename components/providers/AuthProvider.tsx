'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User, onAuthStateChanged, signInWithEmailAndPassword, signInWithPopup, signOut, createUserWithEmailAndPassword } from 'firebase/auth';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db, googleProvider } from '@/lib/firebase';
import { RolUsuario } from '@/lib/roles'; // Conectado directamente a la estructura de Atempo

export interface UsuarioPerfil {
    uid: string;
    email: string;
    nombre: string;
    rol: RolUsuario;
    fotoUrl?: string;
    activo: boolean;
    fechaRegistro: any;
}

interface AuthContextType {
    usuario: User | null;
    perfil: UsuarioPerfil | null;
    cargando: boolean;
    loginEmail: (email: string, password: string) => Promise<void>;
    loginGoogle: () => Promise<void>;
    logout: () => Promise<void>;
    registro: (email: string, password: string, nombre: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
    const [usuario, setUsuario] = useState<User | null>(null);
    const [perfil, setPerfil] = useState<UsuarioPerfil | null>(null);
    const [cargando, setCargando] = useState(true);

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (user) => {
            setUsuario(user);
            if (user) {
                try {
                    // Usamos 'usuarios' directamente para blindar la ruta de Firebase
                    const docRef = doc(db, 'usuarios', user.uid);
                    const docSnap = await getDoc(docRef);
                    
                    if (docSnap.exists()) {
                        setPerfil(docSnap.data() as UsuarioPerfil);
                    } else {
                        // Creación de perfil por defecto por seguridad
                        const nuevoPerfil: UsuarioPerfil = {
                            uid: user.uid,
                            email: user.email || '',
                            nombre: user.displayName || user.email || 'Usuario Atempo',
                            rol: 'recepcionista',
                            activo: true,
                            fechaRegistro: new Date(),
                        };
                        await setDoc(docRef, {
                            ...nuevoPerfil,
                            fechaRegistro: serverTimestamp(),
                        });
                        setPerfil(nuevoPerfil);
                    }
                } catch (error) {
                    console.error('Error cargando perfil:', error);
                    setPerfil(null);
                }
            } else {
                setPerfil(null);
            }
            setCargando(false);
        });
        return () => unsubscribe();
    }, []);

    const loginEmail = async (email: string, password: string) => {
        await signInWithEmailAndPassword(auth, email, password);
    };

    const loginGoogle = async () => {
        await signInWithPopup(auth, googleProvider);
    };

    const logout = async () => {
        await signOut(auth);
        setPerfil(null);
    };

    const registro = async (email: string, password: string, nombre: string) => {
        const credencial = await createUserWithEmailAndPassword(auth, email, password);
        
        // Diccionario de Whitelist (Ciberseguridad y Accesos)
        const asignacionAutomatica: Record<string, RolUsuario> = {
            'luis@atempo.com': 'admin',
            'camila@atempo.com': 'admin',
            'rosibel@atempo.com': 'admin',
            'recepcion@atempo.com': 'recepcionista',
            'baile@atempo.com': 'profesor'
        };

        const correoLimpio = email.trim().toLowerCase();
        const rolAsignado = asignacionAutomatica[correoLimpio] || 'recepcionista';

        const nuevoPerfil: UsuarioPerfil = {
            uid: credencial.user.uid,
            email,
            nombre,
            rol: rolAsignado,
            activo: true,
            fechaRegistro: new Date(),
        };
        
        await setDoc(doc(db, 'usuarios', credencial.user.uid), {
            ...nuevoPerfil,
            fechaRegistro: serverTimestamp(),
        });
        
        setPerfil(nuevoPerfil);
    };

    return (
        <AuthContext.Provider
            value={{ usuario, perfil, cargando, loginEmail, loginGoogle, logout, registro }}
        >
            {/* El candado maestro: la app no existe hasta que Firebase no valide credenciales */}
            {!cargando && children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const context = useContext(AuthContext);
    if (!context) throw new Error('useAuth debe usarse dentro de AuthProvider');
    return context;
}
