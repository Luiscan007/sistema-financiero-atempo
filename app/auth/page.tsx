'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Activity, Mail, Lock, AlertCircle, Loader2 } from 'lucide-react';
import { useAuth } from '@/components/providers/AuthProvider';
import { RUTA_INICIO_ROL, RolUsuario } from '@/lib/roles';

export default function AuthPage() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [cargando, setCargando] = useState(false);
    const [errorMsg, setErrorMsg] = useState('');
    
    const router = useRouter();
    // Tu hook actual de autenticación. Asumimos que tiene una función login y expone el perfil actual.
    const { login, perfil } = useAuth(); 

    // Si ya está logueado y tiene rol, lo sacamos del login automáticamente
    useEffect(() => {
        if (perfil?.rol) {
            const rutaDestino = RUTA_INICIO_ROL[perfil.rol as RolUsuario] || '/pos';
            router.replace(rutaDestino);
        }
    }, [perfil, router]);

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!email || !password) {
            setErrorMsg('Por favor ingresa correo y contraseña.');
            return;
        }

        setCargando(true);
        setErrorMsg('');

        try {
            // Ejecutamos tu función de login de Firebase (que debe estar en tu AuthProvider)
            await login(email, password);
            
            // Nota: No hacemos el router.push() aquí porque el useEffect de arriba 
            // se encargará de redirigirlo apenas el 'perfil' se actualice en el estado global.
            
        } catch (err: any) {
            console.error('Error al iniciar sesión:', err);
            // Manejo de errores comunes de Firebase
            if (err.code === 'auth/user-not-found' || err.code === 'auth/wrong-password' || err.code === 'auth/invalid-credential') {
                setErrorMsg('Credenciales incorrectas. Verifica tu correo y contraseña.');
            } else if (err.code === 'auth/too-many-requests') {
                setErrorMsg('Demasiados intentos fallidos. Intenta más tarde.');
            } else {
                setErrorMsg('Ocurrió un error al iniciar sesión. Intenta de nuevo.');
            }
            setCargando(false);
        }
    };

    return (
        <div className="min-h-screen bg-[#0A0F1C] flex flex-col justify-center py-12 sm:px-6 lg:px-8 relative overflow-hidden">
            {/* Efectos de fondo geniales */}
            <div className="absolute top-[-10%] left-[-10%] w-96 h-96 bg-blue-600/20 rounded-full blur-[100px] pointer-events-none" />
            <div className="absolute bottom-[-10%] right-[-10%] w-96 h-96 bg-purple-600/10 rounded-full blur-[100px] pointer-events-none" />

            <div className="sm:mx-auto sm:w-full sm:max-w-md relative z-10">
                <div className="flex justify-center">
                    <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-blue-700 rounded-2xl flex items-center justify-center shadow-lg shadow-blue-500/20 ring-4 ring-slate-900">
                        <Activity className="w-8 h-8 text-white" />
                    </div>
                </div>
                <h2 className="mt-6 text-center text-3xl font-extrabold text-white tracking-tight">
                    ATEMPO
                </h2>
                <p className="mt-2 text-center text-sm text-slate-400 font-medium tracking-widest uppercase">
                    Sistema Financiero
                </p>
            </div>

            <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md relative z-10">
                <div className="bg-[#111827]/80 backdrop-blur-xl py-8 px-4 shadow-2xl shadow-black/50 sm:rounded-3xl sm:px-10 border border-white/5">
                    
                    {errorMsg && (
                        <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-xl flex items-start gap-3">
                            <AlertCircle className="w-5 h-5 text-red-400 mt-0.5 flex-shrink-0" />
                            <p className="text-sm text-red-400 font-medium">{errorMsg}</p>
                        </div>
                    )}

                    <form className="space-y-6" onSubmit={handleLogin}>
                        <div>
                            <label htmlFor="email" className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                                Correo Electrónico
                            </label>
                            <div className="mt-1 relative">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                    <Mail className="h-5 w-5 text-slate-500" />
                                </div>
                                <input
                                    id="email"
                                    name="email"
                                    type="email"
                                    autoComplete="email"
                                    required
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    className="appearance-none block w-full pl-10 pr-3 py-3 border border-slate-700/50 rounded-xl bg-slate-900/50 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all sm:text-sm"
                                    placeholder="admin@atempo.com"
                                    disabled={cargando}
                                />
                            </div>
                        </div>

                        <div>
                            <label htmlFor="password" className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                                Contraseña
                            </label>
                            <div className="mt-1 relative">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                    <Lock className="h-5 w-5 text-slate-500" />
                                </div>
                                <input
                                    id="password"
                                    name="password"
                                    type="password"
                                    autoComplete="current-password"
                                    required
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="appearance-none block w-full pl-10 pr-3 py-3 border border-slate-700/50 rounded-xl bg-slate-900/50 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all sm:text-sm"
                                    placeholder="••••••••"
                                    disabled={cargando}
