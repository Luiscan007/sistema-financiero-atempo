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

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setCargando(true);
        try {
            if (!email || !password) throw new Error("Faltan credenciales");
            await loginEmail(email, password);
            toast.success('¡Bienvenido de vuelta a Atempo!');
        } catch (err: any) {
            manejarError(err);
        }
    };

    const handleRegistro = async (e: React.FormEvent) => {
        e.preventDefault();
        setCargando(true);
        try {
            if (!email || !password || !nombre) throw new Error("Completa todos los campos");
            await registro(email, password, nombre);
            toast.success('Cuenta creada exitosamente');
        } catch (err: any) {
            manejarError(err);
        }
    };

    const manejarError = (err: any) => {
        console.error('Error:', err);
        const code = err?.code || '';
        if (code === 'auth/user-not-found' || code === 'auth/wrong-password' || code === 'auth/invalid-credential') {
            toast.error('Credenciales incorrectas. Verifica tus datos.');
        } else if (code === 'auth/email-already-in-use') {
            toast.error('Este correo ya está registrado.');
        } else {
            toast.error(err.message || 'Error de conexión. Intenta de nuevo.');
        }
        setCargando(false);
    };

    return (
        <div className="min-h-screen flex flex-col justify-center py-12 sm:px-6 lg:px-8 relative overflow-hidden bg-[#050505]">
            
            {/* 1. FONDO DESLIZANTE (Se mueve en dirección opuesta para efecto Parallax) */}
            <div className={cn(
                "absolute inset-0 z-0 transition-transform duration-[800ms] ease-[cubic-bezier(0.87,0,0.13,1)] scale-105",
                modo === 'registro' ? "-translate-x-12" : "translate-x-0"
            )}>
                <img 
                    src="https://images.unsplash.com/photo-1508700115892-45ecd05ae2ad?q=80&w=2069&auto=format&fit=crop" 
                    alt="Fondo Atempo" 
                    className="w-full h-full object-cover opacity-20 mix-blend-luminosity grayscale"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#050505] via-[#050505]/80 to-transparent z-10" />
                <div className="absolute inset-0 bg-gradient-to-r from-[#050505] via-transparent to-[#050505] z-10" />
            </div>

            {/* LUCES DINÁMICAS */}
            <div className={cn(
                "absolute top-0 w-[600px] h-[600px] rounded-full blur-[150px] pointer-events-none z-10 transition-all duration-[800ms] ease-in-out",
                modo === 'login' ? "left-1/4 bg-red-600/20 opacity-30" : "left-1/3 bg-yellow-600/20 opacity-40 translate-y-12"
            )} />

            <div className="sm:mx-auto sm:w-full sm:max-w-md relative z-20">
                <div className="flex justify-center mb-6">
                    <div className="w-20 h-20 bg-gradient-to-br from-black to-zinc-900 rounded-2xl flex items-center justify-center shadow-[0_0_40px_rgba(234,179,8,0.15)] ring-1 ring-yellow-500/20 relative overflow-hidden">
                        <div className="absolute inset-0 bg-gradient-to-tr from-red-500/20 via-transparent to-yellow-500/20 animate-pulse" />
                        <Activity className="w-10 h-10 text-yellow-500 relative z-10" />
                    </div>
                </div>
                
                {/* 2. TÍTULO ATEMPO ANIMADO */}
                <h2 className={cn(
                    "text-center font-extrabold tracking-tight mb-2 transition-all duration-[800ms] ease-[cubic-bezier(0.87,0,0.13,1)] transform",
                    modo === 'login' ? "text-5xl scale-100" : "text-4xl scale-105"
                )}>
                    <span className={cn(
                        "bg-clip-text text-transparent transition-all duration-[800ms]",
                        modo === 'login' 
                            ? "bg-gradient-to-r from-red-500 via-yellow-500 to-yellow-200 drop-shadow-[0_0_20px_rgba(234,179,8,0.3)]" 
                            : "bg-gradient-to-l from-yellow-400 via-red-500 to-red-600 drop-shadow-[0_0_25px_rgba(220,38,38,0.5)]"
                    )}>
                        ATEMPO
                    </span>
                </h2>
                <p className="text-center text-[10px] text-zinc-400 font-bold tracking-[0.5em] uppercase mb-8">
                    Sistema Financiero
                </p>
            </div>

            <div className="sm:mx-auto sm:w-full sm:max-w-md relative z-20">
                {/* 3. CARD PRINCIPAL CON HEIGHT ADAPTABLE */}
                <div className="bg-black/60 backdrop-blur-2xl px-6 py-8 shadow-2xl sm:rounded-3xl border border-white/10 ring-1 ring-inset ring-yellow-500/10 overflow-hidden relative">
                    
                    <div className="mb-6 text-center transition-all duration-500">
                        <h3 className="text-xl font-bold text-white tracking-wide">
                            {modo === 'login' ? 'Acceso al Sistema' : 'Registro Corporativo'}
                        </h3>
                    </div>

                    {/* 4. TRACK DE DESLIZAMIENTO DE FORMULARIOS */}
                    {/* Este contenedor mide el 200% del ancho (caben 2 forms lado a lado). Al cambiar de modo, se mueve -50% a la izquierda */}
                    <div className="relative w-full overflow-hidden">
                        <div className={cn(
                            "flex w-[200%] transition-transform duration-[800ms] ease-[cubic-bezier(0.87,0,0.13,1)]",
                            modo === 'login' ? "translate-x-0" : "-translate-x-1/2"
                        )}>
                            
                            {/* --- LADO IZQUIERDO: FORMULARIO LOGIN --- */}
                            <div className="w-1/2 px-1">
                                <form onSubmit={handleLogin} className="space-y-5">
                                    <div>
                                        <label className="block text-[10px] font-bold text-yellow-500/80 uppercase tracking-widest mb-2">Correo Corporativo</label>
                                        <div className="relative group">
                                            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none"><Mail className="h-4 w-4 text-slate-400 group-focus-within:text-yellow-500 transition-colors" /></div>
                                            <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} disabled={cargando}
                                                className="block w-full pl-11 pr-4 py-3.5 border border-white/10 rounded-xl bg-white/5 text-white placeholder-slate-500 focus:ring-1 focus:ring-yellow-500 focus:border-yellow-500 transition-all sm:text-sm"
                                                placeholder="usuario@atempo.com"
                                            />
                                        </div>
                                    </div>

                                    <div>
                                        <label className="block text-[10px] font-bold text-yellow-500/80 uppercase tracking-widest mb-2">Contraseña</label>
                                        <div className="relative group">
                                            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none"><Lock className="h-4 w-4 text-slate-400 group-focus-within:text-yellow-500 transition-colors" /></div>
                                            <input type={mostrarPwd ? 'text' : 'password'} required value={password} onChange={(e) => setPassword(e.target.value)} disabled={cargando}
                                                className="block w-full pl-11 pr-12 py-3.5 border border-white/10 rounded-xl bg-white/5 text-white placeholder-slate-500 focus:ring-1 focus:ring-yellow-500 focus:border-yellow-500 transition-all sm:text-sm"
                                                placeholder="••••••••"
                                            />
                                            <button type="button" onClick={() => setMostrarPwd(!mostrarPwd)} className="absolute inset-y-0 right-0 pr-4 flex items-center text-slate-400 hover:text-yellow-500 transition-colors">
                                                {mostrarPwd ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                            </button>
                                        </div>
                                    </div>

                                    <div className="pt-2">
                                        <button type="submit" disabled={cargando}
                                            className="w-full flex justify-center items-center py-4 px-4 rounded-xl shadow-[0_0_20px_rgba(220,38,38,0.2)] text-sm font-bold text-white bg-gradient-to-r from-red-600 via-red-500 to-red-600 hover:from-red-500 hover:to-red-400 transition-all disabled:opacity-50 group border border-red-400/30"
                                        >
                                            {cargando ? <Loader2 className="animate-spin h-5 w-5" /> : <>Ingresar al Sistema <ArrowRight className="ml-2 w-4 h-4 group-hover:translate-x-1 transition-transform"/></>}
                                        </button>
                                    </div>
                                </form>
                            </div>

                            {/* --- LADO DERECHO: FORMULARIO REGISTRO --- */}
                            <div className="w-1/2 px-1">
                                <form onSubmit={handleRegistro} className="space-y-5">
                                    <div>
                                        <label className="block text-[10px] font-bold text-yellow-500/80 uppercase tracking-widest mb-2">Nombre Completo</label>
                                        <div className="relative group">
                                            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none"><User className="h-4 w-4 text-slate-400 group-focus-within:text-yellow-500 transition-colors" /></div>
                                            <input type="text" required value={nombre} onChange={(e) => setNombre(e.target.value)} disabled={cargando}
                                                className="block w-full pl-11 pr-4 py-3.5 border border-white/10 rounded-xl bg-white/5 text-white placeholder-slate-500 focus:ring-1 focus:ring-yellow-500 focus:border-yellow-500 transition-all sm:text-sm"
                                                placeholder="Ej: Camila Ruiz"
                                            />
                                        </div>
                                    </div>

                                    <div>
                                        <label className="block text-[10px] font-bold text-yellow-500/80 uppercase tracking-widest mb-2">Correo Corporativo</label>
                                        <div className="relative group">
                                            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none"><Mail className="h-4 w-4 text-slate-400 group-focus-within:text-yellow-500 transition-colors" /></div>
                                            <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} disabled={cargando}
                                                className="block w-full pl-11 pr-4 py-3.5 border border-white/10 rounded-xl bg-white/5 text-white placeholder-slate-500 focus:ring-1 focus:ring-yellow-500 focus:border-yellow-500 transition-all sm:text-sm"
                                                placeholder="usuario@atempo.com"
                                            />
                                        </div>
                                    </div>

                                    <div>
                                        <label className="block text-[10px] font-bold text-yellow-500/80 uppercase tracking-widest mb-2">Contraseña</label>
                                        <div className="relative group">
                                            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none"><Lock className="h-4 w-4 text-slate-400 group-focus-within:text-yellow-500 transition-colors" /></div>
                                            <input type={mostrarPwd ? 'text' : 'password'} required value={password} onChange={(e) => setPassword(e.target.value)} disabled={cargando}
                                                className="block w-full pl-11 pr-12 py-3.5 border border-white/10 rounded-xl bg-white/5 text-white placeholder-slate-500 focus:ring-1 focus:ring-yellow-500 focus:border-yellow-500 transition-all sm:text-sm"
                                                placeholder="••••••••"
                                            />
                                            <button type="button" onClick={() => setMostrarPwd(!mostrarPwd)} className="absolute inset-y-0 right-0 pr-4 flex items-center text-slate-400 hover:text-yellow-500 transition-colors">
                                                {mostrarPwd ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                            </button>
                                        </div>
                                    </div>

                                    <div className="pt-2">
                                        <button type="submit" disabled={cargando}
                                            className="w-full flex justify-center items-center py-4 px-4 rounded-xl shadow-[0_0_20px_rgba(234,179,8,0.2)] text-sm font-bold text-black bg-gradient-to-r from-yellow-500 to-yellow-600 hover:from-yellow-400 hover:to-yellow-500 transition-all disabled:opacity-50 group"
                                        >
                                            {cargando ? <Loader2 className="animate-spin h-5 w-5" /> : <>Crear Cuenta <ArrowRight className="ml-2 w-4 h-4 group-hover:translate-x-1 transition-transform"/></>}
                                        </button>
                                    </div>
                                </form>
                            </div>
                        </div>
                    </div>

                    {/* BLOQUE LEGAL Y TÉRMINOS */}
                    <div className="mt-8 pt-6 border-t border-white/10 text-center">
                        <p className="text-[11px] text-slate-400 leading-relaxed mb-4 px-2">
                            Al continuar, confirmas que has leído y aceptas los <button className="text-yellow-500 hover:text-yellow-400 font-bold underline decoration-yellow-500/30 underline-offset-2">Términos de Servicio</button> y la <button className="text-yellow-500 hover:text-yellow-400 font-bold underline decoration-yellow-500/30 underline-offset-2">Política de Privacidad</button> de Atempo.
                        </p>
                        
                        <div className="inline-flex items-center gap-2 px-4 py-2 bg-white/5 rounded-full border border-white/5 transition-colors hover:bg-white/10">
                            <span className="text-xs text-slate-300">
                                {modo === 'login' ? '¿Eres nuevo en el equipo?' : '¿Ya tienes credenciales?'}
                            </span>
                            <button 
                                onClick={() => setModo(modo === 'login' ? 'registro' : 'login')} 
                                className="text-xs text-yellow-500 hover:text-yellow-400 font-bold tracking-wide uppercase transition-colors"
                            >
                                {modo === 'login' ? 'Regístrate' : 'Inicia Sesión'}
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
