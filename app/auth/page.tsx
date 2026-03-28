'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Activity, Mail, Lock, Loader2, Eye, EyeOff, User, ArrowRight } from 'lucide-react';
import { useAuth } from '@/components/providers/AuthProvider';
import { RUTA_INICIO_ROL, RolUsuario } from '@/lib/roles';
import toast from 'react-hot-toast';
import { cn } from '@/lib/utils';

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
        <div className="min-h-screen flex flex-col justify-center py-12 sm:px-6 lg:px-8 relative overflow-hidden bg-[#0a0a0a]">
            
            {/* 1. FONDO CON EFECTO PARALLAX (Se mueve al cambiar de modo) */}
            <div className={cn(
                "absolute inset-0 z-0 transition-transform duration-1000 ease-in-out scale-105",
                modo === 'registro' ? "-translate-x-8" : "translate-x-0"
            )}>
                <img 
                    src="https://images.unsplash.com/photo-1508700115892-45ecd05ae2ad?q=80&w=2069&auto=format&fit=crop" 
                    alt="Fondo Academia Atempo" 
                    className="w-full h-full object-cover opacity-20 mix-blend-luminosity grayscale"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a0a] via-[#0a0a0a]/80 to-transparent z-10" />
                <div className="absolute inset-0 bg-gradient-to-r from-[#0a0a0a] via-transparent to-[#0a0a0a] z-10" />
            </div>

            {/* 2. MOTOR DE LUCES (Atempo Colors: Rojo, Dorado) */}
            <div className={cn(
                "absolute top-0 left-1/4 w-[600px] h-[600px] bg-red-600/20 rounded-full blur-[150px] pointer-events-none z-10 transition-all duration-1000",
                modo === 'registro' ? "translate-x-1/2 opacity-40" : "opacity-20"
            )} />
            <div className={cn(
                "absolute bottom-0 right-1/4 w-[600px] h-[600px] bg-yellow-500/10 rounded-full blur-[150px] pointer-events-none z-10 transition-all duration-1000",
                modo === 'registro' ? "-translate-x-1/2 opacity-30" : "opacity-10"
            )} />

            <div className="sm:mx-auto sm:w-full sm:max-w-md relative z-20">
                <div className="flex justify-center mb-6">
                    <div className="w-20 h-20 bg-gradient-to-br from-black to-zinc-900 rounded-2xl flex items-center justify-center shadow-[0_0_50px_rgba(220,38,38,0.2)] ring-1 ring-red-500/30 relative overflow-hidden group">
                        <div className="absolute inset-0 bg-gradient-to-tr from-yellow-500/20 via-transparent to-red-600/20 animate-pulse" />
                        <Activity className="w-10 h-10 text-yellow-500 relative z-10 drop-shadow-[0_0_10px_rgba(234,179,8,0.8)]" />
                    </div>
                </div>
                
                {/* TÍTULO CON EFECTO NEÓN */}
                <h2 className="text-center text-5xl font-extrabold tracking-tight mb-2">
                    <span className="bg-clip-text text-transparent bg-gradient-to-r from-yellow-600 via-yellow-400 to-red-500 drop-shadow-[0_0_20px_rgba(234,179,8,0.3)]">
                        ATEMPO
                    </span>
                </h2>
                <p className="text-center text-[10px] text-zinc-400 font-bold tracking-[0.5em] uppercase mb-8">
                    Business Core
                </p>
            </div>

            <div className="sm:mx-auto sm:w-full sm:max-w-md relative z-20 perspective-1000">
                {/* CONTENEDOR GLASSMORPHISM */}
                <div className="bg-black/40 backdrop-blur-2xl py-8 px-6 shadow-2xl sm:rounded-3xl border border-white/5 ring-1 ring-inset ring-yellow-500/10 relative overflow-hidden min-h-[460px]">
                    
                    <div className="mb-8 text-center">
                        <h3 className="text-xl font-bold text-white tracking-wide">
                            {modo === 'login' ? 'Acceso al Sistema' : 'Registro Corporativo'}
                        </h3>
                    </div>

                    {/* 3. CONTENEDOR DESLIZANTE DE FORMULARIOS */}
                    <div className="relative w-full h-[280px]">
                        
                        {/* --- FORMULARIO LOGIN --- */}
                        <form 
                            onSubmit={handleSubmit}
                            className={cn(
                                "absolute top-0 w-full space-y-5 transition-all duration-700 ease-[cubic-bezier(0.87,0,0.13,1)]",
                                modo === 'login' 
                                    ? "translate-x-0 opacity-100 pointer-events-auto" 
                                    : "-translate-x-[120%] opacity-0 pointer-events-none"
                            )}
                        >
                            <div>
                                <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-2">Correo</label>
                                <div className="relative group">
                                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none"><Mail className="h-4 w-4 text-zinc-500 group-focus-within:text-yellow-500 transition-colors" /></div>
                                    <input
                                        type="email" required value={email} onChange={(e) => setEmail(e.target.value)} disabled={cargando}
                                        className="block w-full pl-11 pr-4 py-3.5 border border-white/5 rounded-xl bg-white/5 text-white focus:ring-1 focus:ring-yellow-500 focus:border-yellow-500 transition-all sm:text-sm"
                                        placeholder="usuario@atempo.com"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-2">Contraseña</label>
                                <div className="relative group">
                                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none"><Lock className="h-4 w-4 text-zinc-500 group-focus-within:text-yellow-500 transition-colors" /></div>
                                    <input
                                        type={mostrarPwd ? 'text' : 'password'} required value={password} onChange={(e) => setPassword(e.target.value)} disabled={cargando}
                                        className="block w-full pl-11 pr-12 py-3.5 border border-white/5 rounded-xl bg-white/5 text-white focus:ring-1 focus:ring-yellow-500 focus:border-yellow-500 transition-all sm:text-sm"
                                        placeholder="••••••••"
                                    />
                                    <button type="button" onClick={() => setMostrarPwd(!mostrarPwd)} className="absolute inset-y-0 right-0 pr-4 flex items-center text-zinc-500 hover:text-white transition-colors">
                                        {mostrarPwd ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                    </button>
                                </div>
                            </div>

                            <button
                                type="submit" disabled={cargando}
                                className="w-full flex justify-center items-center py-4 px-4 mt-8 rounded-xl shadow-[0_0_20px_rgba(220,38,38,0.15)] text-sm font-bold text-white bg-gradient-to-r from-red-700 to-red-600 hover:from-red-600 hover:to-red-500 transition-all disabled:opacity-50 group border border-red-500/30"
                            >
                                {cargando ? <Loader2 className="animate-spin h-5 w-5" /> : <>Ingresar <ArrowRight className="ml-2 w-4 h-4 group-hover:translate-x-1 transition-transform"/></>}
                            </button>
                        </form>

                        {/* --- FORMULARIO REGISTRO --- */}
                        <form 
                            onSubmit={handleSubmit}
                            className={cn(
                                "absolute top-0 w-full space-y-5 transition-all duration-700 ease-[cubic-bezier(0.87,0,0.13,1)]",
                                modo === 'registro' 
                                    ? "translate-x-0 opacity-100 pointer-events-auto" 
                                    : "translate-x-[120%] opacity-0 pointer-events-none"
                            )}
                        >
                            <div>
                                <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-2">Nombre</label>
                                <div className="relative group">
                                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none"><User className="h-4 w-4 text-zinc-500 group-focus-within:text-yellow-500 transition-colors" /></div>
                                    <input
                                        type="text" required={modo === 'registro'} value={nombre} onChange={(e) => setNombre(e.target.value)} disabled={cargando}
                                        className="block w-full pl-11 pr-4 py-3.5 border border-white/5 rounded-xl bg-white/5 text-white focus:ring-1 focus:ring-yellow-500 focus:border-yellow-500 transition-all sm:text-sm"
                                        placeholder="Ej: Camila Ruiz"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div className="col-span-2">
                                    <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-2">Correo & Clave</label>
                                    <div className="flex flex-col gap-3">
                                        <div className="relative group">
                                            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none"><Mail className="h-4 w-4 text-zinc-500 group-focus-within:text-yellow-500 transition-colors" /></div>
                                            <input
                                                type="email" required value={email} onChange={(e) => setEmail(e.target.value)} disabled={cargando}
                                                className="block w-full pl-11 pr-4 py-3.5 border border-white/5 rounded-xl bg-white/5 text-white focus:ring-1 focus:ring-yellow-500 focus:border-yellow-500 transition-all sm:text-sm"
                                                placeholder="usuario@atempo.com"
                                            />
                                        </div>
                                        <div className="relative group">
                                            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none"><Lock className="h-4 w-4 text-zinc-500 group-focus-within:text-yellow-500 transition-colors" /></div>
                                            <input
                                                type={mostrarPwd ? 'text' : 'password'} required value={password} onChange={(e) => setPassword(e.target.value)} disabled={cargando}
                                                className="block w-full pl-11 pr-12 py-3.5 border border-white/5 rounded-xl bg-white/5 text-white focus:ring-1 focus:ring-yellow-500 focus:border-yellow-500 transition-all sm:text-sm"
                                                placeholder="••••••••"
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <button
                                type="submit" disabled={cargando}
                                className="w-full flex justify-center items-center py-4 px-4 mt-4 rounded-xl shadow-[0_0_20px_rgba(234,179,8,0.15)] text-sm font-bold text-black bg-gradient-to-r from-yellow-500 to-yellow-600 hover:from-yellow-400 hover:to-yellow-500 transition-all disabled:opacity-50 group"
                            >
                                {cargando ? <Loader2 className="animate-spin h-5 w-5" /> : <>Crear Cuenta <ArrowRight className="ml-2 w-4 h-4 group-hover:translate-x-1 transition-transform"/></>}
                            </button>
                        </form>
                    </div>

                    {/* INTERRUPTOR INFERIOR FIJO */}
                    <div className="mt-4 text-center border-t border-white/5 pt-6">
                        <button 
                            type="button"
                            onClick={() => setModo(modo === 'login' ? 'registro' : 'login')} 
                            className="text-xs font-bold text-zinc-400 hover:text-white transition-colors"
                        >
                            {modo === 'login' ? (
                                <>¿Sin acceso? <span className="text-yellow-500 ml-1">Regístrate</span></>
                            ) : (
                                <>¿Ya tienes cuenta? <span className="text-yellow-500 ml-1">Inicia sesión</span></>
                            )}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
