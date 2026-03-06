'use client';

/**
 * components/providers/AuthProvider.tsx
 * Proveedor de autenticación Firebase
 * Maneja: sesión, login, logout, estado del usuario
 */

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
import { ROLES_USUARIO, type RolUsuario } from '@/lib/utils';

interface UsuarioPerfil {
    uid: string;
    email: string;
    nombre: string;
    rol: RolUsuario;
    fotoUrl?: string;
    activo: boolean;
    fechaRegistro: Date;
}

interface AuthContextType {
    usuario: User | null;
    perfil: UsuarioPerfil | null;
    cargando: boolean;
    loginEmail: (email: string, password: string) => Promise<void>;
    loginGoogle: () => Promise<void>;
    logout: () => Promise<void>;
    registro: (email: string, password: string, nombre: string) => Promise<void>;
    tienePermiso: (modulo: string) => boolean;
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
                // Cargar perfil desde Firestore
                try {
                    const perfilDoc = await getDoc(doc(db, COLECCIONES.USUARIOS, user.uid));
                    if (perfilDoc.exists()) {
                        setPerfil(perfilDoc.data() as UsuarioPerfil);
                    } else {
                        // Crear perfil si no existe (primer login con Google)
                        const nuevoPerfil: UsuarioPerfil = {
                            uid: user.uid,
                            email: user.email || '',
                            nombre: user.displayName || user.email || 'Usuario',
                            rol: ROLES_USUARIO.ADMIN, // Primer usuario es admin
                            fotoUrl: user.photoURL || undefined,
                            activo: true,
                            fechaRegistro: new Date(),
                        };
                        await setDoc(doc(db, COLECCIONES.USUARIOS, user.uid), {
                            ...nuevoPerfil,
                            fechaRegistro: serverTimestamp(),
                        });
                        setPerfil(nuevoPerfil);
                    }
                } catch (error) {
                    console.error('Error cargando perfil:', error);
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
            rol: ROLES_USUARIO.ADMIN,
            activo: true,
            fechaRegistro: new Date(),
        };
        await setDoc(doc(db, COLECCIONES.USUARIOS, credencial.user.uid), {
            ...nuevoPerfil,
            fechaRegistro: serverTimestamp(),
        });
        setPerfil(nuevoPerfil);
    };

    // Verificar permisos por módulo y rol
    const tienePermiso = (modulo: string): boolean => {
        if (!perfil) return false;
        if (perfil.rol === ROLES_USUARIO.ADMIN) return true;

        const permisos: Record<string, RolUsuario[]> = {
            pos: [ROLES_USUARIO.VENDEDOR],
            inventario: [ROLES_USUARIO.VENDEDOR],
            ventas: [ROLES_USUARIO.VENDEDOR],
            contabilidad: [ROLES_USUARIO.CONTADOR],
            gastos: [ROLES_USUARIO.CONTADOR],
            clientes: [ROLES_USUARIO.VENDEDOR, ROLES_USUARIO.CONTADOR],
            dashboard: [ROLES_USUARIO.VENDEDOR, ROLES_USUARIO.CONTADOR, ROLES_USUARIO.LECTOR],
            cambio: [ROLES_USUARIO.VENDEDOR, ROLES_USUARIO.CONTADOR, ROLES_USUARIO.LECTOR],
            configuracion: [],
        };

        return (permisos[modulo] || []).includes(perfil.rol);
    };

    return (
        <AuthContext.Provider
            value={{ usuario, perfil, cargando, loginEmail, loginGoogle, logout, registro, tienePermiso }}
        >
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const context = useContext(AuthContext);
    if (!context) throw new Error('useAuth debe usarse dentro de AuthProvider');
    return context;
}
