'use client';

import {
    createContext,
    useContext,
    useState,
    useEffect,
    ReactNode,
} from 'react';
import {
    User,
    onAuthStateChanged,
    signInWithEmailAndPassword,
    signInWithPopup,
    signOut,
    createUserWithEmailAndPassword,
} from 'firebase/auth';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db, googleProvider, COLECCIONES } from '@/lib/firebase';

// 1. ROLES ACTUALIZADOS PARA ATEMPO
export type RolUsuario = 'admin' | 'recepcionista' | 'profesor';

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
                    const docRef = doc(db, COLECCIONES.USUARIOS, user.uid);
                    const docSnap = await getDoc(docRef);
                    if (docSnap.exists()) {
                        setPerfil(docSnap.data() as UsuarioPerfil);
                    } else {
                        // Si no existe perfil, creamos uno básico
                        const nuevoPerfil: UsuarioPerfil = {
                            uid: user.uid,
                            email: user.email || '',
                            nombre: user.displayName || 'Usuario Atempo',
                            rol: 'recepcionista', // Rol por defecto por seguridad
                            activo: true,
                            fechaRegistro: new Date(),
                        };
                        setPerfil(nuevoPerfil);
                    }
                } catch (error) {
                    console.error("Error obteniendo perfil:", error);
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
        const nuevoPerfil: UsuarioPerfil = {
            uid: credencial.user.uid,
            email,
            nombre,
            rol: 'recepcionista', // Todo usuario nuevo entra con permisos limitados
            activo: true,
            fechaRegistro: serverTimestamp(),
        };
        await setDoc(doc(db, COLECCIONES.USUARIOS, credencial.user.uid), nuevoPerfil);
        setPerfil(nuevoPerfil);
    };

    return (
        <AuthContext.Provider
            value={{ usuario, perfil, cargando, loginEmail, loginGoogle, logout, registro }}
        >
            {!cargando && children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const context = useContext(AuthContext);
    if (!context) throw new Error('useAuth debe usarse dentro de AuthProvider');
    return context;
}
