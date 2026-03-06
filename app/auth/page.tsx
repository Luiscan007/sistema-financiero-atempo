'use client';

/**
 * app/auth/page.tsx
 * Página de autenticación con login por email y Google
 */

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Activity, Mail, Lock, Eye, EyeOff, Chrome, ArrowRight, User } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '@/components/providers/AuthProvider';
import { cn } from '@/lib/utils';

export default function AuthPage() {
    const [modo, setModo] = useState<'login' | 'registro'>('login');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [nombre, setNombre] = useState('');
    const [mostrarPassword, setMostrarPassword] = useState(false);
    const [cargando, setCargando] = useState(false);
    const { loginEmail, loginGoogle, registro } = useAuth();
    const router = useRouter();

    const handleEmail = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!email || !password) {
            toast.error('Completa todos los campos');
            return;
        }
        if (modo === 'registro' && !nombre) {
            toast.error('Ingresa tu nombre');
            return;
        }

        setCargando(true);
        try {
            if (modo === 'login') {
                await loginEmail(email, password);
                toast.success('¡Bienvenido!');
            } else {
                await registro(email, password, nombre);
                toast.success('¡Cuenta creada exitosamente!');
            }
            router.push('/dashboard');
        } catch (error: any) {
            const mensajes: Record<string, string> = {
                'auth/user-not-found': 'Usuario no encontrado',
                'auth/wrong-password': 'Contraseña incorrecta',
                'auth/email-already-in-use': 'El correo ya está registrado',
                'auth/weak-password': 'La contraseña debe tener al menos 6 caracteres',
                'auth/invalid-email': 'Correo electrónico inválido',
            };
            toast.error(mensajes[error.code] || 'Error de autenticación');
        } finally {
            setCargando(false);
        }
    };

    const handleGoogle = async () => {
        setCargando(true);
        try {
            await loginGoogle();
            toast.success('¡Bienvenido!');
            router.push('/dashboard');
        } catch (error) {
            toast.error('Error al iniciar sesión con Google');
        } finally {
            setCargando(false);
        }
    };

    return (
        <div className="min-h-screen bg-background flex">
            {/* Panel izquierdo - Solo visible en desktop */}
            <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-blue-900/50 via-background to-slate-900 flex-col items-center justify-center p-12 relative overflow-hidden">
                {/* Fondo decorativo */}
                <div className="absolute inset-0">
                    <div className="absolute top-1/4 left-1/4 w-72 h-72 bg-blue-500/10 rounded-full blur-3xl" />
                    <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl" />
                </div>

                <div className="relative z-10 text-center">
                    {/* Logo */}
                    <div className="w-20 h-20 bg-gradient-to-br from-blue-500 to-blue-700 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-2xl">
                        <Activity className="w-10 h-10 text-white" />
                    </div>
                    <h1 className="text-4xl font-bold mb-3">
                        <span className="text-gradient-blue">ATEMPO</span>
                    </h1>
                    <p className="text-xl text-muted-foreground mb-8">Sistema Financiero Venezolano</p>

                    {/* Features */}
                    <div className="text-left space-y-4 max-w-sm mx-auto">
                        {[
                            { emoji: '💱', label: 'Tasas BCV y paralelo en tiempo real' },
                            { emoji: '🏪', label: 'Punto de Venta con pago móvil' },
                            { emoji: '📊', label: 'Dashboard de inteligencia comercial' },
                            { emoji: '📒', label: 'Contabilidad y P&G en Bs y USD' },
                            { emoji: '🔒', label: 'Seguro con Firebase Authentication' },
                        ].map((f) => (
                            <div key={f.label} className="flex items-center gap-3">
                                <span className="text-xl">{f.emoji}</span>
                                <span className="text-sm text-muted-foreground">{f.label}</span>
                            </div>
                        ))}
                    </div>

                    <p className="text-xs text-muted-foreground mt-8">
                        Tasas actualizadas: BCV · Monitor Dólar · CoinGecko
                    </p>
                </div>
            </div>

            {/* Panel derecho - Formulario */}
            <div className="flex-1 flex items-center justify-center p-6">
                <div className="w-full max-w-md">
                    {/* Logo móvil */}
                    <div className="lg:hidden text-center mb-8">
                        <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-blue-700 rounded-2xl flex items-center justify-center mx-auto mb-3">
                            <Activity className="w-8 h-8 text-white" />
                        </div>
                        <h1 className="text-2xl font-bold text-gradient-blue">ATEMPO</h1>
                        <p className="text-sm text-muted-foreground">Sistema Financiero Venezolano</p>
                    </div>

                    <div className="glass-card p-8">
                        {/* Tabs login / registro */}
                        <div className="flex bg-muted/30 rounded-xl p-1 mb-6">
                            {(['login', 'registro'] as const).map((m) => (
                                <button
                                    key={m}
                                    className={cn(
                                        'flex-1 py-2 rounded-lg text-sm font-medium transition-all',
                                        modo === m
                                            ? 'bg-card text-foreground shadow-sm'
                                            : 'text-muted-foreground hover:text-foreground'
                                    )}
                                    onClick={() => setModo(m)}
                                >
                                    {m === 'login' ? 'Iniciar Sesión' : 'Registrarse'}
                                </button>
                            ))}
                        </div>

                        <form onSubmit={handleEmail} className="space-y-4">
                            {/* Campo nombre (solo registro) */}
                            {modo === 'registro' && (
                                <div>
                                    <label className="text-xs text-muted-foreground mb-1 block">Nombre completo</label>
                                    <div className="relative">
                                        <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                                        <input
                                            type="text"
                                            className="input-sistema pl-10"
                                            placeholder="Tu nombre completo"
                                            value={nombre}
                                            onChange={(e) => setNombre(e.target.value)}
                                        />
                                    </div>
                                </div>
                            )}

                            {/* Email */}
                            <div>
                                <label className="text-xs text-muted-foreground mb-1 block">Correo electrónico</label>
                                <div className="relative">
                                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                                    <input
                                        type="email"
                                        className="input-sistema pl-10"
                                        placeholder="correo@email.com"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        autoComplete="email"
                                    />
                                </div>
                            </div>

                            {/* Contraseña */}
                            <div>
                                <label className="text-xs text-muted-foreground mb-1 block">Contraseña</label>
                                <div className="relative">
                                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                                    <input
                                        type={mostrarPassword ? 'text' : 'password'}
                                        className="input-sistema pl-10 pr-10"
                                        placeholder={modo === 'registro' ? 'Mínimo 6 caracteres' : '••••••••'}
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        autoComplete={modo === 'login' ? 'current-password' : 'new-password'}
                                    />
                                    <button
                                        type="button"
                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                                        onClick={() => setMostrarPassword(!mostrarPassword)}
                                    >
                                        {mostrarPassword ? (
                                            <EyeOff className="w-4 h-4" />
                                        ) : (
                                            <Eye className="w-4 h-4" />
                                        )}
                                    </button>
                                </div>
                            </div>

                            {/* Botón principal */}
                            <button
                                type="submit"
                                className={cn(
                                    'w-full btn-primary justify-center py-3 text-sm font-semibold',
                                    cargando && 'opacity-70'
                                )}
                                disabled={cargando}
                            >
                                {cargando ? (
                                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                ) : (
                                    <>
                                        {modo === 'login' ? 'Iniciar Sesión' : 'Crear Cuenta'}
                                        <ArrowRight className="w-4 h-4" />
                                    </>
                                )}
                            </button>
                        </form>

                        {/* Separador */}
                        <div className="flex items-center gap-3 my-4">
                            <div className="flex-1 border-t border-border" />
                            <span className="text-xs text-muted-foreground">o continúa con</span>
                            <div className="flex-1 border-t border-border" />
                        </div>

                        {/* Login con Google */}
                        <button
                            onClick={handleGoogle}
                            disabled={cargando}
                            className="w-full btn-secondary justify-center py-3 text-sm"
                        >
                            <svg className="w-4 h-4" viewBox="0 0 24 24">
                                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                            </svg>
                            Continuar con Google
                        </button>

                        {/* Ayuda */}
                        <p className="text-xs text-center text-muted-foreground mt-4">
                            {modo === 'login' ? (
                                <>¿Aún no tienes cuenta?{' '}
                                    <button onClick={() => setModo('registro')} className="text-blue-400 hover:underline">
                                        Regístrate
                                    </button>
                                </>
                            ) : (
                                <>¿Ya tienes cuenta?{' '}
                                    <button onClick={() => setModo('login')} className="text-blue-400 hover:underline">
                                        Inicia sesión
                                    </button>
                                </>
                            )}
                        </p>
                    </div>

                    <p className="text-xs text-center text-muted-foreground mt-4">
                        Al continuar, aceptas los Términos de Servicio de ATEMPO
                    </p>
                </div>
            </div>
        </div>
    );
}
