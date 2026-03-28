'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Activity, Mail, Lock, Loader2, Eye, EyeOff, User, ArrowRight } from 'lucide-react';
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
    const { loginEmail, registro, perfil } = useAuth() as any; 

    // Redirección automática si el usuario ya está autenticado
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
    };

    return (
        <div className="min-h-screen flex flex-col justify-center py-12 sm:px-6 lg:px-8 relative overflow-hidden bg-black">
            
            {/* Split Background con Desplazamiento y Transición Súper Fluida */}
            {/* Usamos duration-[1200ms] y ease-in-out para una animación mucho más suave */}
            <div className="absolute inset-0 z-0 flex transition-all duration-[1200ms] ease-in-out transform">
                {/* Lado izquierdo con tu Foto de la Academia */}
                <div className={cn('w-full transition-width duration-[1200ms] ease-in-out', modo === 'login' ? 'w-full' : 'w-0')}>
                    <img 
                        src="image.png-3acd7ffa-2edd-49f4-b2f0-0f8de33219fd" 
                        alt="Fondo Atempo" 
                        className="w-full h-full object-cover opacity-40 mix-blend-luminosity"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black via-black/80 to-transparent z-10" />
                    <div className="absolute inset-0 bg-gradient-to-r from-black via-transparent to-black z-10" />
                </div>
                {/* Lado derecho Negro */}
                <div className={cn('bg-black transition-width duration-[1200ms] ease-in-out', modo === 'login' ? 'w-0' : 'w-full')}>
                    <div className="absolute inset-0 bg-gradient-to-t from-black via-black/80 to-transparent z-10" />
                    <div className="absolute inset-0 bg-gradient-to-r from-black via-transparent to-black z-10" />
                </div>
            </div>

            {/* Luces Dinámicas (Con Transiciones Suaves) */}
            <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-red-600/20 rounded-full blur-[120px] pointer-events-none z-10 transition-all duration-[1200ms] ease-in-out" />
            <div className="absolute bottom-0 right-1/4 w-[500px] h-[500px] bg-blue-600/10 rounded-full blur-[120px] pointer-events-none z-10 transition-all duration-[1200ms] ease-in-out" />
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[400px] bg-yellow-500/10 rounded-full blur-[150px] pointer-events-none z-10 transition-all duration-[1200ms] ease-in-out" />

            <div className="sm:mx-auto sm:w-full sm:max-w-md relative z-20">
                <div className="flex justify-center mb-4">
                    <div className="w-20 h-20 bg-gradient-to-br from-black to-zinc-900 rounded-2xl flex items-center justify-center shadow-[0_0_40px_rgba(234,179,8,0.2)] ring-1 ring-yellow-500/30 relative overflow-hidden">
                        <div className="absolute inset-0 bg-gradient-to-tr from-red-500/20 via-transparent to-blue-500/20 animate-pulse" />
                        <Activity className="w-10 h-10 text-yellow-500 relative z-10" />
                    </div>
                </div>
                
                {/* Texto Iluminado ATEMPO con Transiciones Suaves */}
                <h2 className="text-center text-5xl font-extrabold tracking-tight mb-2 transition-all duration-[1200ms] ease-in-out">
                    <span className="bg-clip-text text-transparent bg-gradient-to-r from-red-500 via-yellow-500 to-yellow-200 drop-shadow-[0_0_15px_rgba(234,179,8,0.4)] transition-all duration-[1200ms]">
                        ATEMPO
                    </span>
                </h2>
                <p className="text-center text-xs text-slate-300 font-medium tracking-[0.4em] uppercase mb-8 drop-shadow-md transition-all duration-[1200ms]">
                    Sistema Financiero
                </p>
            </div>

            <div className="sm:mx-auto sm:w-full sm:max-w-md relative z-20">
                {/* Glassmorphism Panel con Borde de Luz (Height Adaptable) */}
                <div className="bg-black/60 backdrop-blur-xl py-8 px-4 shadow-2xl sm:rounded-3xl border border-white/10 ring-1 ring-inset ring-yellow-500/20 relative overflow-hidden transition-all duration-[1200ms]">
                    
                    {/* Línea de luz animada en la parte superior */}
                    <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-yellow-500 to-transparent opacity-50 animate-pulse" />

                    <div className="mb-8 text-center transition-all duration-[1200ms]">
                        <h3 className="text-xl font-bold text-white tracking-wide">
                            {modo === 'login' ? 'Acceso al Sistema' : 'Registro de Personal'}
                        </h3>
                        <p className="text-sm text-slate-400 mt-2">
                            {modo === 'login' ? 'Ingresa tus credenciales para continuar' : 'Crea tu cuenta corporativa'}
                        </p>
                    </div>

                    {/* TRACK DE DESLIZAMIENTO DE FORMULARIOS con Transición Súper Fluida */}
                    <div className="relative w-full overflow-hidden">
                        <div className={cn(
                            "flex w-[200%] transition-transform duration-[1200ms] ease-in-out transform",
                            modo === 'login' ? "translate-x-0" : "-translate-x-1/2"
                        )}>
                            
                            {/* --- LADO IZQUIERDO: FORMULARIO LOGIN --- */}
                            <div className="w-1/2 px-1">
                                <form onSubmit={handleLogin} className="space-y-6">
                                    <div className="animate-in fade-in duration-500">
                                        <label className="block text-[11px] font-bold text-yellow-500/80 uppercase tracking-widest mb-2">Correo Corporativo</label>
                                        <div className="relative group">
                                            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none"><Mail className="h-4 w-4 text-slate-400 group-focus-within:text-yellow-500 transition-colors" /></div>
                                            <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} disabled={cargando}
                                                className="block w-full pl-11 pr-4 py-3.5 border border-white/10 rounded-xl bg-white/5 text-white placeholder-slate-500 focus:ring-1 focus:ring-yellow-500 focus:border-yellow-500 transition-all sm:text-sm"
                                                placeholder="usuario@atempo.com"
                                            />
                                        </div>
                                    </div>

                                    <div className="animate-in fade-in duration-500 delay-100">
                                        <label className="block text-[11px] font-bold text-yellow-500/80 uppercase tracking-widest mb-2">Contraseña</label>
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

                                    {/* Reducimos el margen superior de mt-8 a mt-6 para Tight Layout */}
                                    <div className="pt-4 mt-6 animate-in fade-in duration-500 delay-200">
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
                                <form onSubmit={handleRegistro} className="space-y-6">
                                    <div className="animate-in fade-in duration-500">
                                        <label className="block text-[11px] font-bold text-yellow-500/80 uppercase tracking-widest mb-2">Nombre Completo</label>
                                        <div className="relative group">
                                            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none"><User className="h-4 w-4 text-slate-400 group-focus-within:text-yellow-500 transition-colors" /></div>
                                            <input type="text" required value={nombre} onChange={(e) => setNombre(e.target.value)} disabled={cargando}
                                                className="block w-full pl-11 pr-4 py-3.5 border border-white/10 rounded-xl bg-white/5 text-white placeholder-slate-500 focus:ring-1 focus:ring-yellow-500 focus:border-yellow-500 transition-all sm:text-sm"
                                                placeholder="Ej: Camila Ruiz"
                                            />
                                        </div>
                                    </div>

                                    <div className="animate-in fade-in duration-500 delay-100">
                                        <label className="block text-[11px] font-bold text-yellow-500/80 uppercase tracking-widest mb-2">Correo Corporativo</label>
                                        <div className="relative group">
                                            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none"><Mail className="h-4 w-4 text-slate-400 group-focus-within:text-yellow-500 transition-colors" /></div>
                                            <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} disabled={cargando}
                                                className="block w-full pl-11 pr-4 py-3.5 border border-white/10 rounded-xl bg-white/5 text-white placeholder-slate-500 focus:ring-1 focus:ring-yellow-500 focus:border-yellow-500 transition-all sm:text-sm"
                                                placeholder="usuario@atempo.com"
                                            />
                                        </div>
                                    </div>

                                    <div className="animate-in fade-in duration-500 delay-200">
                                        <label className="block text-[11px] font-bold text-yellow-500/80 uppercase tracking-widest mb-2">Contraseña</label>
                                        <div className="relative group">
                                            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none"><Lock className="h-4 w-4 text-slate-400 group-focus-within:text-yellow-500 transition-colors" /></div>
                                            <input type={mostrarPwd ? 'text' : 'password'} required value={password} onChange={(e) => setPassword(e.target.value)} disabled={cargando}
                                                className="block w-full pl-11 pr-12 py-3.5 border border-white/10 rounded-xl bg-white/5 text-white placeholder-slate-500 focus:ring-1 focus:ring-yellow-500 focus:border-yellow-500 transition-all sm:text-sm"
                                                placeholder="••••••••"
                                            />
                                        </div>
                                    </div>

                                    <div className="pt-4 mt-6 animate-in fade-in duration-500 delay-300">
                                        <button type="submit" disabled={cargando}
                                            className="w-full flex justify-center items-center py-4 px-4 rounded-xl shadow-[0_0_20px_rgba(234,179,8,0.2)] text-sm font-bold text-black bg-gradient-to-r from-yellow-500 to-yellow-600 hover:from-yellow-400 hover:to-yellow-500 transition-all disabled:opacity-50 group border border-yellow-400/30"
                                        >
                                            {cargando ? <Loader2 className="animate-spin h-5 w-5" /> : <>Crear Cuenta Corporativa <ArrowRight className="ml-2 w-4 h-4 group-hover:translate-x-1 transition-transform"/></>}
                                        </button>
                                    </div>
                                </form>
                            </div>
                        </div>
                    </div>

                    {/* BLOQUE LEGAL Y TÉRMINOS CON LAYOUT AJUSTADO */}
                    {/* Reducimos el margen superior de mt-8 a mt-4 y pt-6 a pt-4 */}
                    <div className="mt-4 pt-4 border-t border-white/10 text-center transition-all duration-[1200ms] ease-in-out">
                        <p className="text-[11px] text-slate-400 leading-relaxed mb-4 px-2">
                            Al continuar, confirmas que has leído y aceptas los <button className="text-yellow-500 font-bold hover:text-yellow-400 transition-colors">Términos de Servicio</button> y la <button className="text-yellow-500 font-bold hover:text-yellow-400 transition-colors">Política de Privacidad</button> de Atempo. Asegúrate de proporcionar información precisa y segura.
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
