'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Activity, Mail, Lock, AlertCircle, Loader2, Eye, EyeOff, User, ArrowRight } from 'lucide-react';
import { useAuth } from '@/components/providers/AuthProvider';
import { RUTA_INICIO_ROL, RolUsuario } from '@/lib/roles';
import toast from 'react-hot-toast';

export default function AuthPage() {
    const [modo, setModo] = useState<'login' | 'registro'>('login');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [nombre, setNombre] = useState('');
    const [mostrarPwd, setMostrarPwd] = useState(false);
    const [cargando, setCargando] = useState(false);
    
    const router = useRouter();
    
    const { loginEmail, registro, perfil } = useAuth() as any; 

    useEffect(() => {
        if (perfil?.rol) {
            const rutaDestino = RUTA_INICIO_ROL[perfil.rol as RolUsuario] || '/pos';
            router.replace(rutaDestino);
        }
    }, [perfil, router]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setCargando(true);

        try {
            if (modo === 'login') {
                if (!email || !password) throw new Error("Faltan credenciales");
                await loginEmail(email, password);
                toast.success('¡Bienvenido de vuelta a Atempo!');
            } else {
                if (!email || !password || !nombre) throw new Error("Completa todos los campos");
                await registro(email, password, nombre);
                toast.success('Cuenta creada exitosamente');
            }
        } catch (err: any) {
            console.error('Error de autenticación:', err);
            const code = err?.code || '';
            if (code === 'auth/user-not-found' || code === 'auth/wrong-password' || code === 'auth/invalid-credential') {
                toast.error('Credenciales incorrectas. Verifica tus datos.');
            } else if (code === 'auth/email-already-in-use') {
                toast.error('Este correo ya está registrado.');
            } else {
                toast.error(err.message || 'Error de conexión. Intenta de nuevo.');
            }
            setCargando(false);
        }
    };

    return (
        <div className="min-h-screen flex flex-col justify-center py-12 sm:px-6 lg:px-8 relative overflow-hidden bg-[#050810]">
            
            <div className="absolute inset-0 z-0">
                <img 
                    src="https://images.unsplash.com/photo-1508700115892-45ecd05ae2ad?q=80&w=2069&auto=format&fit=crop" 
                    alt="Fondo Academia" 
                    className="w-full h-full object-cover opacity-20 mix-blend-luminosity"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#050810] via-[#050810]/80 to-transparent z-10" />
                <div className="absolute inset-0 bg-gradient-to-r from-[#050810] via-transparent to-[#050810] z-10" />
            </div>

            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-blue-600/20 rounded-[100%] blur-[120px] pointer-events-none z-10" />

            <div className="sm:mx-auto sm:w-full sm:max-w-md relative z-20">
                <div className="flex justify-center mb-2">
                    <div className="w-16 h-16 bg-gradient-to-br from-blue-500 via-indigo-500 to-purple-600 rounded-2xl flex items-center justify-center shadow-[0_0_30px_rgba(59,130,246,0.5)] ring-1 ring-white/20">
                        <Activity className="w-8 h-8 text-white" />
                    </div>
                </div>
                
                <h2 className="text-center text-4xl font-extrabold tracking-tight mb-1">
                    <span className="bg-clip-text text-transparent bg-gradient-to-r from-blue-400 via-indigo-300 to-purple-400 drop-shadow-[0_0_15px_rgba(99,102,241,0.5)]">
                        ATEMPO
                    </span>
                </h2>
                <p className="text-center text-xs text-blue-200/60 font-medium tracking-[0.3em] uppercase mb-8">
                    Business Core
                </p>
            </div>

            <div className="sm:mx-auto sm:w-full sm:max-w-md relative z-20">
                <div className="bg-[#0B1120]/70 backdrop-blur-2xl py-8 px-4 shadow-2xl sm:rounded-3xl sm:px-10 border border-white/10 ring-1 ring-inset ring-white/5">
                    
                    <div className="mb-6 text-center">
                        <h3 className="text-lg font-bold text-white">
                            {modo === 'login' ? 'Acceso al Sistema' : 'Registro de Personal'}
                        </h3>
                        <p className="text-sm text-slate-400 mt-1">
                            {modo === 'login' ? 'Ingresa tus credenciales para continuar' : 'Crea tu cuenta corporativa'}
                        </p>
                    </div>

                    <form className="space-y-5" onSubmit={handleSubmit}>
                        
                        {modo === 'registro' && (
                            <div className="animate-in fade-in slide-in-from-top-2 duration-300">
                                <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Nombre Completo</label>
                                <div className="relative">
                                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none"><User className="h-4 w-4 text-slate-500" /></div>
                                    <input
                                        type="text" required value={nombre} onChange={(e) => setNombre(e.target.value)} disabled={cargando}
                                        className="block w-full pl-10 pr-3 py-3 border border-white/10 rounded-xl bg-black/40 text-white placeholder-slate-500 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all sm:text-sm"
                                        placeholder="Ej: Camila Ruiz"
                                    />
                                </div>
                            </div>
                        )}

                        <div>
                            <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Correo Corporativo</label>
                            <div className="relative">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none"><Mail className="h-4 w-4 text-slate-500" /></div>
                                <input
                                    type="email" required value={email} onChange={(e) => setEmail(e.target.value)} disabled={cargando}
                                    className="block w-full pl-10 pr-3 py-3 border border-white/10 rounded-xl bg-black/40 text-white placeholder-slate-500 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all sm:text-sm"
                                    placeholder="usuario@atempo.com"
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Contraseña</label>
                            <div className="relative">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none"><Lock className="h-4 w-4 text-slate-500" /></div>
                                <input
                                    type={mostrarPwd ? 'text' : 'password'} required value={password} onChange={(e) => setPassword(e.target.value)} disabled={cargando}
                                    className="block w-full pl-10 pr-10 py-3 border border-white/10 rounded-xl bg-black/40 text-white placeholder-slate-500 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all sm:text-sm"
                                    placeholder="••••••••"
                                />
                                <button type="button" onClick={() => setMostrarPwd(!mostrarPwd)} className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-500 hover:text-white transition-colors">
                                    {mostrarPwd ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                </button>
                            </div>
                        </div>

                        <div className="pt-2">
                            <button
                                type="submit" disabled={cargando}
                                className="w-full flex justify-center items-center py-3.5 px-4 rounded-xl shadow-[0_0_20px_rgba(37,99,235,0.3)] text-sm font-bold text-white bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 focus:ring-offset-[#0B1120] transition-all disabled:opacity-50 group"
                            >
                                {cargando ? (
                                    <><Loader2 className="animate-spin -ml-1 mr-2 h-5 w-5" /> Procesando...</>
                                ) : (
                                    <>{modo === 'login' ? 'Ingresar al Sistema' : 'Crear Cuenta'} <ArrowRight className="ml-2 w-4 h-4 group-hover:translate-x-1 transition-transform"/></>
                                )}
                            </button>
                        </div>
                    </form>

                    <div className="mt-6 text-center">
                        <p className="text-xs text-slate-400">
                            {modo === 'login' ? '¿Eres nuevo en el equipo?' : '¿Ya tienes credenciales?'}
                            <button 
                                onClick={() => { setModo(modo === 'login' ? 'registro' : 'login'); }} 
                                className="ml-2 text-blue-400 hover:text-blue-300 font-bold transition-colors"
                            >
                                {modo === 'login' ? 'Regístrate aquí' : 'Inicia Sesión'}
                            </button>
                        </p>
                    </div>

                    <div className="mt-8 pt-6 border-t border-white/10 flex items-start gap-3">
                        <AlertCircle className="w-5 h-5 text-amber-500/70 flex-shrink-0 mt-0.5" />
                        <p className="text-[10px] text-slate-500 leading-relaxed">
                            Acceso restringido. El sistema monitorea la IP y la actividad. Al registrarte o iniciar sesión, aceptas las políticas de seguridad de ATEMPO Financial Systems.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}
