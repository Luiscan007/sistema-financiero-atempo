'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Activity, Mail, Lock, Loader2, Eye, EyeOff, User, ArrowRight, X } from 'lucide-react';
import { useAuth } from '@/components/providers/AuthProvider';
import { RUTA_INICIO_ROL, RolUsuario } from '@/lib/roles';
import toast from 'react-hot-toast';
import { cn } from '@/lib/utils'; // Asegúrate de tener esta utilidad para clases condicionales

export default function AuthPage() {
    const [modo, setModo] = useState<'login' | 'registro'>('login');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [nombre, setNombre] = useState('');
    const [mostrarPwd, setMostrarPwd] = useState(false);
    const [cargando, setCargando] = useState(false);
    
    const router = useRouter();
    
    // Importamos las funciones nativas de tu AuthProvider
    const { loginEmail, registro, perfil } = useAuth() as any; 

    // Redirección automática si el usuario ya está autenticado
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
        <div className="min-h-screen flex flex-col justify-center py-12 sm:px-6 lg:px-8 relative overflow-hidden bg-black">
            
            {/* Split Background con Desplazamiento */}
            <div className="absolute inset-0 z-0 flex transition-all duration-500 ease-in-out">
                {/* Lado izquierdo con Imagen */}
                <div className={cn('w-full transition-width duration-500 ease-in-out', modo === 'login' ? 'w-full' : 'w-0')}>
                    <img 
                        src="https://images.unsplash.com/photo-1508700115892-45ecd05ae2ad?q=80&w=2069&auto=format&fit=crop" 
                        alt="Fondo Academia Atempo - Izquierda" 
                        className="w-full h-full object-cover opacity-20 mix-blend-luminosity grayscale"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black via-black/80 to-transparent z-10" />
                    <div className="absolute inset-0 bg-gradient-to-r from-black via-transparent to-black z-10" />
                </div>
                {/* Lado derecho Negro */}
                <div className={cn('bg-black transition-width duration-500 ease-in-out', modo === 'login' ? 'w-0' : 'w-full')}>
                    <div className="absolute inset-0 bg-gradient-to-t from-black via-black/80 to-transparent z-10" />
                    <div className="absolute inset-0 bg-gradient-to-r from-black via-transparent to-black z-10" />
                </div>
            </div>

            {/* Luces Dinámicas */}
            <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-red-600/20 rounded-full blur-[120px] pointer-events-none z-10" />
            <div className="absolute bottom-0 right-1/4 w-[500px] h-[500px] bg-blue-600/10 rounded-full blur-[120px] pointer-events-none z-10" />
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[400px] bg-yellow-500/10 rounded-full blur-[150px] pointer-events-none z-10" />

            <div className="sm:mx-auto sm:w-full sm:max-w-md relative z-20">
                <div className="flex justify-center mb-4">
                    <div className="w-20 h-20 bg-gradient-to-br from-black to-zinc-900 rounded-2xl flex items-center justify-center shadow-[0_0_40px_rgba(234,179,8,0.2)] ring-1 ring-yellow-500/30 relative overflow-hidden">
                        <div className="absolute inset-0 bg-gradient-to-tr from-red-500/20 via-transparent to-blue-500/20" />
                        <Activity className="w-10 h-10 text-yellow-500 relative z-10" />
                    </div>
                </div>
                
                {/* Texto Iluminado ATEMPO */}
                <h2 className="text-center text-5xl font-extrabold tracking-tight mb-2">
                    <span className="bg-clip-text text-transparent bg-gradient-to-r from-red-500 via-yellow-500 to-yellow-200 drop-shadow-[0_0_15px_rgba(234,179,8,0.4)]">
                        ATEMPO
                    </span>
                </h2>
                <p className="text-center text-xs text-slate-300 font-medium tracking-[0.4em] uppercase mb-8 drop-shadow-md">
                    Business Core
                </p>
            </div>

            <div className="sm:mx-auto sm:w-full sm:max-w-md relative z-20">
                {/* Glassmorphism Panel con Borde de Luz */}
                <div className="bg-black/60 backdrop-blur-xl py-8 px-4 shadow-2xl sm:rounded-3xl sm:px-10 border border-white/10 ring-1 ring-inset ring-yellow-500/20 relative overflow-hidden">
                    
                    {/* Línea de luz animada en la parte superior del cuadro */}
                    <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-yellow-500 to-transparent opacity-50" />

                    <div className="mb-8 text-center">
                        <h3 className="text-xl font-bold text-white tracking-wide">
                            {modo === 'login' ? 'Acceso al Sistema' : 'Registro de Personal'}
                        </h3>
                        <p className="text-sm text-slate-400 mt-2">
                            {modo === 'login' ? 'Ingresa tus credenciales para continuar' : 'Crea tu cuenta corporativa'}
                        </p>
                    </div>

                    <form className="space-y-6" onSubmit={handleSubmit}>
                        
                        {/* Transición Fluida para el Registro */}
                        {modo === 'registro' && (
                            <div className="animate-in fade-in slide-in-from-top-4 duration-500">
                                <label className="block text-[11px] font-bold text-yellow-500/80 uppercase tracking-widest mb-2">Nombre Completo</label>
                                <div className="relative group">
                                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none"><User className="h-4 w-4 text-slate-400 group-focus-within:text-yellow-500 transition-colors" /></div>
                                    <input
                                        type="text" required value={nombre} onChange={(e) => setNombre(e.target.value)} disabled={cargando}
                                        className="block w-full pl-11 pr-4 py-3.5 border border-white/10 rounded-xl bg-white/5 text-white placeholder-slate-500 focus:ring-2 focus:ring-yellow-500/50 focus:border-yellow-500/50 transition-all sm:text-sm"
                                        placeholder="Ej: Camila Ruiz"
                                    />
                                </div>
                            </div>
                        )}

                        <div className="animate-in fade-in duration-500 delay-100">
                            <label className="block text-[11px] font-bold text-yellow-500/80 uppercase tracking-widest mb-2">Correo Corporativo</label>
                            <div className="relative group">
                                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none"><Mail className="h-4 w-4 text-slate-400 group-focus-within:text-yellow-500 transition-colors" /></div>
                                <input
                                    type="email" required value={email} onChange={(e) => setEmail(e.target.value)} disabled={cargando}
                                    className="block w-full pl-11 pr-4 py-3.5 border border-white/10 rounded-xl bg-white/5 text-white placeholder-slate-500 focus:ring-2 focus:ring-yellow-500/50 focus:border-yellow-500/50 transition-all sm:text-sm"
                                    placeholder="usuario@atempo.com"
                                />
                            </div>
                        </div>

                        <div className="animate-in fade-in duration-500 delay-200">
                            <label className="block text-[11px] font-bold text-yellow-500/80 uppercase tracking-widest mb-2">Contraseña</label>
                            <div className="relative group">
                                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none"><Lock className="h-4 w-4 text-slate-400 group-focus-within:text-yellow-500 transition-colors" /></div>
                                <input
                                    type={mostrarPwd ? 'text' : 'password'} required value={password} onChange={(e) => setPassword(e.target.value)} disabled={cargando}
                                    className="block w-full pl-11 pr-12 py-3.5 border border-white/10 rounded-xl bg-white/5 text-white placeholder-slate-500 focus:ring-2 focus:ring-yellow-500/50 focus:border-yellow-500/50 transition-all sm:text-sm"
                                    placeholder="••••••••"
                                />
                                <button type="button" onClick={() => setMostrarPwd(!mostrarPwd)} className="absolute inset-y-0 right-0 pr-4 flex items-center text-slate-400 hover:text-yellow-500 transition-colors">
                                    {mostrarPwd ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                </button>
                            </div>
                        </div>

                        <div className="pt-4 animate-in fade-in duration-500 delay-300">
                            <button
                                type="submit" disabled={cargando}
                                className="w-full flex justify-center items-center py-4 px-4 rounded-xl shadow-[0_0_20px_rgba(220,38,38,0.2)] text-sm font-bold text-white bg-gradient-to-r from-red-600 via-red-500 to-red-600 hover:from-red-500 hover:to-red-400 focus:ring-2 focus:ring-offset-2 focus:ring-red-500 focus:ring-offset-black transition-all disabled:opacity-50 group border border-red-400/30"
                            >
                                {cargando ? (
                                    <><Loader2 className="animate-spin -ml-1 mr-2 h-5 w-5" /> Procesando...</>
                                ) : (
                                    <>{modo === 'login' ? 'Ingresar al Sistema' : 'Crear Cuenta'} <ArrowRight className="ml-2 w-4 h-4 group-hover:translate-x-1 transition-transform"/></>
                                )}
                            </button>
                        </div>
                    </form>

                    {/* Toggle Modo Login / Registro */}
                    <div className="mt-8 text-center animate-in fade-in duration-500 delay-500">
                        <p className="text-xs text-slate-400">
                            {modo === 'login' ? '¿Eres nuevo en el equipo?' : '¿Ya tienes credenciales?'}
                            <button 
                                onClick={() => { setModo(modo === 'login' ? 'registro' : 'login'); }} 
                                className="ml-2 text-yellow-500 hover:text-yellow-400 font-bold transition-colors underline decoration-yellow-500/30 underline-offset-4"
                            >
                                {modo === 'login' ? 'Regístrate aquí' : 'Inicia Sesión'}
                            </button>
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}
