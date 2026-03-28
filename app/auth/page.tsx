'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Activity, Mail, Lock, Loader2, Eye, EyeOff, User, ArrowRight, Sparkles } from 'lucide-react';
import { useAuth } from '@/components/providers/AuthProvider';
import { RUTA_INICIO_ROL, RolUsuario } from '@/lib/roles';
import toast from 'react-hot-toast';

/* ─────────────────────────────────────────────
   ESTILOS EN LÍNEA — no dependen de Tailwind
   para los efectos más avanzados
───────────────────────────────────────────── */
const styles = `
  @import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Outfit:wght@300;400;500;600;700&display=swap');

  @keyframes shimmer {
    0%   { background-position: -200% center; }
    100% { background-position:  200% center; }
  }
  @keyframes pulse-glow {
    0%, 100% { box-shadow: 0 0 20px rgba(220,38,38,0.3), 0 0 60px rgba(220,38,38,0.1); }
    50%       { box-shadow: 0 0 40px rgba(220,38,38,0.6), 0 0 100px rgba(220,38,38,0.2); }
  }
  @keyframes float {
    0%, 100% { transform: translateY(0px) rotate(0deg); }
    33%       { transform: translateY(-8px) rotate(1deg); }
    66%       { transform: translateY(4px) rotate(-1deg); }
  }
  @keyframes scan-line {
    0%   { transform: translateY(-100%); opacity: 0; }
    10%  { opacity: 1; }
    90%  { opacity: 1; }
    100% { transform: translateY(400%); opacity: 0; }
  }
  @keyframes flicker {
    0%, 95%, 100% { opacity: 1; }
    96%            { opacity: 0.4; }
    97%            { opacity: 1; }
    98%            { opacity: 0.6; }
  }
  @keyframes slide-up-fade {
    from { opacity: 0; transform: translateY(24px); }
    to   { opacity: 1; transform: translateY(0); }
  }
  @keyframes slide-panel {
    from { opacity: 0; transform: translateX(30px); }
    to   { opacity: 1; transform: translateX(0); }
  }
  @keyframes diagonal-reveal {
    from { clip-path: polygon(0 0, 0 0, 0 100%, 0 100%); }
    to   { clip-path: polygon(0 0, 100% 0, 100% 100%, 0 100%); }
  }
  @keyframes exit-left {
    from { opacity: 1; transform: translateX(0); }
    to   { opacity: 0; transform: translateX(-40px); }
  }
  @keyframes exit-right {
    from { opacity: 1; transform: translateX(0); }
    to   { opacity: 0; transform: translateX(40px); }
  }

  .atempo-title {
    font-family: 'Bebas Neue', sans-serif;
    font-size: clamp(3rem, 8vw, 5.5rem);
    letter-spacing: 0.08em;
    background: linear-gradient(
      90deg,
      #dc2626 0%,
      #ef4444 15%,
      #fbbf24 30%,
      #fef3c7 45%,
      #fbbf24 60%,
      #ef4444 75%,
      #dc2626 90%,
      #ef4444 100%
    );
    background-size: 200% auto;
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
    animation: shimmer 4s linear infinite, flicker 8s ease-in-out infinite;
    filter: drop-shadow(0 0 20px rgba(220,38,38,0.5));
  }

  .form-input {
    width: 100%;
    background: rgba(255,255,255,0.04);
    border: 1px solid rgba(255,255,255,0.08);
    border-radius: 12px;
    padding: 14px 16px 14px 44px;
    color: white;
    font-family: 'Outfit', sans-serif;
    font-size: 14px;
    transition: all 0.3s ease;
    outline: none;
  }
  .form-input:focus {
    background: rgba(255,255,255,0.07);
    border-color: rgba(220,38,38,0.5);
    box-shadow: 0 0 0 3px rgba(220,38,38,0.1), inset 0 0 20px rgba(220,38,38,0.03);
  }
  .form-input::placeholder { color: rgba(255,255,255,0.25); }

  .btn-primary {
    width: 100%;
    padding: 15px;
    border-radius: 12px;
    font-family: 'Outfit', sans-serif;
    font-weight: 700;
    font-size: 14px;
    letter-spacing: 0.05em;
    text-transform: uppercase;
    cursor: pointer;
    border: none;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    transition: all 0.3s ease;
    position: relative;
    overflow: hidden;
  }
  .btn-login {
    background: linear-gradient(135deg, #dc2626, #b91c1c);
    color: white;
    box-shadow: 0 4px 24px rgba(220,38,38,0.35);
    animation: pulse-glow 3s ease-in-out infinite;
  }
  .btn-login:hover {
    transform: translateY(-1px);
    box-shadow: 0 8px 32px rgba(220,38,38,0.5);
  }
  .btn-registro {
    background: linear-gradient(135deg, #d97706, #b45309);
    color: white;
    box-shadow: 0 4px 24px rgba(217,119,6,0.35);
  }
  .btn-registro:hover {
    transform: translateY(-1px);
    box-shadow: 0 8px 32px rgba(217,119,6,0.5);
  }
  .btn-primary:disabled {
    opacity: 0.5;
    cursor: not-allowed;
    transform: none;
    animation: none;
  }

  .tab-btn {
    font-family: 'Outfit', sans-serif;
    font-weight: 600;
    font-size: 13px;
    letter-spacing: 0.06em;
    text-transform: uppercase;
    padding: 10px 28px;
    border-radius: 8px;
    cursor: pointer;
    border: none;
    background: transparent;
    transition: all 0.3s ease;
  }
  .tab-btn.active {
    background: rgba(220,38,38,0.15);
    color: #ef4444;
    box-shadow: inset 0 0 0 1px rgba(220,38,38,0.3);
  }
  .tab-btn.inactive {
    color: rgba(255,255,255,0.35);
  }
  .tab-btn.inactive:hover { color: rgba(255,255,255,0.6); }

  .panel-enter  { animation: slide-panel 0.45s cubic-bezier(0.22,1,0.36,1) forwards; }
  .panel-exit-l { animation: exit-left  0.3s ease forwards; }
  .panel-exit-r { animation: exit-right 0.3s ease forwards; }

  .logo-box {
    animation: float 6s ease-in-out infinite, pulse-glow 3s ease-in-out infinite;
  }

  .diagonal-bg {
    position: absolute;
    inset: 0;
    background: linear-gradient(125deg,
      rgba(30,0,0,0.95) 0%,
      rgba(15,0,0,0.98) 40%,
      rgba(5,5,15,0.99) 60%,
      rgba(0,0,10,1) 100%
    );
  }

  .scan-line {
    position: absolute;
    left: 0; right: 0;
    height: 2px;
    background: linear-gradient(90deg, transparent, rgba(220,38,38,0.4), transparent);
    animation: scan-line 6s linear infinite;
    pointer-events: none;
  }

  .label-text {
    font-family: 'Outfit', sans-serif;
    font-size: 11px;
    font-weight: 600;
    letter-spacing: 0.12em;
    text-transform: uppercase;
    color: rgba(234,179,8,0.7);
    margin-bottom: 8px;
    display: block;
  }

  .divider {
    height: 1px;
    background: linear-gradient(90deg, transparent, rgba(255,255,255,0.08), transparent);
    margin: 20px 0;
  }

  /* Transición de salida hacia el dashboard */
  .page-exit {
    animation: diagonal-reveal 0.8s cubic-bezier(0.76, 0, 0.24, 1) reverse forwards;
  }

  /* Partículas de fondo */
  .particle {
    position: absolute;
    border-radius: 50%;
    pointer-events: none;
    animation: float var(--dur, 8s) ease-in-out infinite;
    animation-delay: var(--delay, 0s);
  }
`;

export default function AuthPage() {
    const [modo, setModo] = useState<'login' | 'registro'>('login');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [nombre, setNombre] = useState('');
    const [mostrarPwd, setMostrarPwd] = useState(false);
    const [cargando, setCargando] = useState(false);
    const [saliendo, setSaliendo] = useState(false);
    const [animPanel, setAnimPanel] = useState<'enter' | 'exit-l' | 'exit-r'>('enter');

    const router = useRouter();
    const { loginEmail, registro, perfil } = useAuth() as any;

    useEffect(() => {
        if (perfil?.rol) {
            setSaliendo(true);
            setTimeout(() => {
                const rutaDestino = RUTA_INICIO_ROL[perfil.rol as RolUsuario] || '/pos';
                router.replace(rutaDestino);
            }, 700);
        }
    }, [perfil, router]);

    const cambiarModo = (nuevoModo: 'login' | 'registro') => {
        if (nuevoModo === modo) return;
        setAnimPanel(nuevoModo === 'registro' ? 'exit-l' : 'exit-r');
        setTimeout(() => {
            setModo(nuevoModo);
            setAnimPanel('enter');
            setEmail('');
            setPassword('');
            setNombre('');
        }, 280);
    };

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setCargando(true);
        try {
            if (!email || !password) throw new Error("Faltan credenciales");
            await loginEmail(email, password);
            toast.success('¡Bienvenido de vuelta!');
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
            toast.error('Credenciales incorrectas.');
        } else if (code === 'auth/email-already-in-use') {
            toast.error('Este correo ya está registrado.');
        } else {
            toast.error(err.message || 'Error de conexión.');
        }
        setCargando(false);
    };

    const panelClass = animPanel === 'enter'
        ? 'panel-enter'
        : animPanel === 'exit-l'
        ? 'panel-exit-l'
        : 'panel-exit-r';

    return (
        <>
            <style>{styles}</style>

            {/* Overlay de salida (transición al dashboard) */}
            {saliendo && (
                <div style={{
                    position: 'fixed', inset: 0, zIndex: 9999,
                    background: 'linear-gradient(135deg, #0a0000, #000005)',
                    animation: 'diagonal-reveal 0.8s cubic-bezier(0.76,0,0.24,1) forwards',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                    <div style={{ textAlign: 'center' }}>
                        <div className="atempo-title" style={{ fontSize: '4rem' }}>ATEMPO</div>
                        <div style={{
                            fontFamily: 'Outfit, sans-serif',
                            color: 'rgba(255,255,255,0.4)',
                            fontSize: 13,
                            letterSpacing: '0.2em',
                            textTransform: 'uppercase',
                            marginTop: 8,
                        }}>
                            Cargando sistema…
                        </div>
                    </div>
                </div>
            )}

            {/* PÁGINA PRINCIPAL */}
            <div style={{
                minHeight: '100vh',
                display: 'flex',
                background: '#000008',
                fontFamily: 'Outfit, sans-serif',
                overflow: 'hidden',
                position: 'relative',
            }}>

                {/* ── FONDO AMBIENTAL ── */}
                <div className="diagonal-bg" />
                <div className="scan-line" style={{ top: '30%' }} />

                {/* Luces ambientales */}
                <div style={{
                    position: 'absolute', top: '-10%', left: '-5%',
                    width: 600, height: 600,
                    background: 'radial-gradient(circle, rgba(220,38,38,0.12) 0%, transparent 70%)',
                    pointerEvents: 'none', zIndex: 1,
                    animation: 'float 10s ease-in-out infinite',
                }} />
                <div style={{
                    position: 'absolute', bottom: '-10%', right: '10%',
                    width: 500, height: 500,
                    background: 'radial-gradient(circle, rgba(30,64,175,0.08) 0%, transparent 70%)',
                    pointerEvents: 'none', zIndex: 1,
                    animation: 'float 13s ease-in-out infinite',
                    animationDelay: '-4s',
                }} />
                <div style={{
                    position: 'absolute', top: '40%', left: '40%',
                    width: 400, height: 400,
                    background: 'radial-gradient(circle, rgba(234,179,8,0.05) 0%, transparent 70%)',
                    pointerEvents: 'none', zIndex: 1,
                }} />

                {/* Línea diagonal decorativa */}
                <div style={{
                    position: 'absolute', inset: 0, zIndex: 1, pointerEvents: 'none',
                    background: 'linear-gradient(135deg, rgba(220,38,38,0.04) 49.9%, transparent 50%)',
                }} />

                {/* ── LADO IZQUIERDO: MARCA ── */}
                <div style={{
                    flex: '0 0 42%',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'center',
                    padding: '60px 48px',
                    position: 'relative',
                    zIndex: 2,
                }}>
                    {/* Logo */}
                    <div style={{ marginBottom: 32, animation: 'slide-up-fade 0.8s ease forwards' }}>
                        <div className="logo-box" style={{
                            width: 72, height: 72,
                            background: 'linear-gradient(135deg, #1a0000, #0d0d1a)',
                            borderRadius: 18,
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            border: '1px solid rgba(220,38,38,0.3)',
                        }}>
                            <Activity style={{ width: 36, height: 36, color: '#ef4444' }} />
                        </div>
                    </div>

                    {/* Título */}
                    <div style={{ animation: 'slide-up-fade 0.8s ease 0.1s both' }}>
                        <div className="atempo-title">ATEMPO</div>
                        <div style={{
                            fontFamily: 'Outfit, sans-serif',
                            fontSize: 13,
                            fontWeight: 500,
                            letterSpacing: '0.25em',
                            textTransform: 'uppercase',
                            color: 'rgba(255,255,255,0.35)',
                            marginTop: 4,
                        }}>
                            Sistema Financiero
                        </div>
                    </div>

                    {/* Separador */}
                    <div style={{
                        width: 60, height: 2, marginTop: 32, marginBottom: 28,
                        background: 'linear-gradient(90deg, #dc2626, transparent)',
                        animation: 'slide-up-fade 0.8s ease 0.2s both',
                    }} />

                    {/* Mensaje de bienvenida */}
                    <div style={{ animation: 'slide-up-fade 0.8s ease 0.3s both' }}>
                        <h2 style={{
                            fontFamily: 'Outfit, sans-serif',
                            fontSize: 28, fontWeight: 700, color: 'white',
                            lineHeight: 1.3, marginBottom: 12,
                        }}>
                            {modo === 'login' ? (
                                <>Bienvenido<br /><span style={{ color: '#ef4444' }}>de vuelta</span></>
                            ) : (
                                <>Únete al<br /><span style={{ color: '#f59e0b' }}>equipo</span></>
                            )}
                        </h2>
                        <p style={{
                            fontSize: 14, color: 'rgba(255,255,255,0.4)',
                            lineHeight: 1.7, maxWidth: 280,
                        }}>
                            {modo === 'login'
                                ? 'Ingresa tus credenciales para acceder al panel de control de Atempo.'
                                : 'Crea tu cuenta corporativa para acceder a todas las herramientas del estudio.'
                            }
                        </p>
                    </div>

                    {/* Stats decorativos */}
                    <div style={{
                        marginTop: 48, display: 'flex', gap: 24,
                        animation: 'slide-up-fade 0.8s ease 0.4s both',
                    }}>
                        {[
                            { label: 'Módulos', value: '12+' },
                            { label: 'Agentes IA', value: '8' },
                            { label: 'En vivo', value: '24/7' },
                        ].map(stat => (
                            <div key={stat.label}>
                                <div style={{ fontSize: 22, fontWeight: 800, color: '#ef4444' }}>{stat.value}</div>
                                <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)', letterSpacing: '0.1em', textTransform: 'uppercase' }}>{stat.label}</div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* ── LÍNEA DIVISORA DIAGONAL ── */}
                <div style={{
                    position: 'relative', zIndex: 2,
                    width: 1,
                    background: 'linear-gradient(180deg, transparent 0%, rgba(220,38,38,0.3) 30%, rgba(220,38,38,0.5) 50%, rgba(220,38,38,0.3) 70%, transparent 100%)',
                    flexShrink: 0,
                    transform: 'skewX(-3deg)',
                }} />

                {/* ── LADO DERECHO: FORMULARIO ── */}
                <div style={{
                    flex: 1,
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'center',
                    padding: '60px 56px',
                    position: 'relative',
                    zIndex: 2,
                }}>

                    {/* Tabs */}
                    <div style={{
                        display: 'inline-flex',
                        background: 'rgba(255,255,255,0.04)',
                        borderRadius: 10,
                        padding: 4,
                        marginBottom: 36,
                        border: '1px solid rgba(255,255,255,0.06)',
                        alignSelf: 'flex-start',
                        animation: 'slide-up-fade 0.6s ease forwards',
                    }}>
                        <button
                            className={`tab-btn ${modo === 'login' ? 'active' : 'inactive'}`}
                            onClick={() => cambiarModo('login')}
                        >
                            Iniciar Sesión
                        </button>
                        <button
                            className={`tab-btn ${modo === 'registro' ? 'active' : 'inactive'}`}
                            onClick={() => cambiarModo('registro')}
                            style={{ ...(modo === 'registro' ? { background: 'rgba(217,119,6,0.15)', color: '#f59e0b', boxShadow: 'inset 0 0 0 1px rgba(217,119,6,0.3)' } : {}) }}
                        >
                            Registrarse
                        </button>
                    </div>

                    {/* Panel animado */}
                    <div className={panelClass} style={{ maxWidth: 420 }}>

                        {/* Título del formulario */}
                        <h3 style={{
                            fontFamily: 'Outfit, sans-serif',
                            fontSize: 22, fontWeight: 700, color: 'white',
                            marginBottom: 28,
                        }}>
                            {modo === 'login' ? 'Acceso al Sistema' : 'Crear Cuenta Corporativa'}
                        </h3>

                        <form onSubmit={modo === 'login' ? handleLogin : handleRegistro}>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>

                                {/* Campo Nombre (solo registro) */}
                                {modo === 'registro' && (
                                    <div>
                                        <label className="label-text">Nombre Completo</label>
                                        <div style={{ position: 'relative' }}>
                                            <div style={{
                                                position: 'absolute', left: 14, top: '50%',
                                                transform: 'translateY(-50%)',
                                                color: 'rgba(255,255,255,0.3)',
                                            }}>
                                                <User style={{ width: 16, height: 16 }} />
                                            </div>
                                            <input
                                                type="text"
                                                className="form-input"
                                                placeholder="Ej: Camila Ruiz"
                                                value={nombre}
                                                onChange={e => setNombre(e.target.value)}
                                                required
                                                disabled={cargando}
                                            />
                                        </div>
                                    </div>
                                )}

                                {/* Campo Email */}
                                <div>
                                    <label className="label-text">Correo Electrónico</label>
                                    <div style={{ position: 'relative' }}>
                                        <div style={{
                                            position: 'absolute', left: 14, top: '50%',
                                            transform: 'translateY(-50%)',
                                            color: 'rgba(255,255,255,0.3)',
                                        }}>
                                            <Mail style={{ width: 16, height: 16 }} />
                                        </div>
                                        <input
                                            type="email"
                                            className="form-input"
                                            placeholder="usuario@atempo.com"
                                            value={email}
                                            onChange={e => setEmail(e.target.value)}
                                            required
                                            disabled={cargando}
                                        />
                                    </div>
                                </div>

                                {/* Campo Contraseña */}
                                <div>
                                    <label className="label-text">Contraseña</label>
                                    <div style={{ position: 'relative' }}>
                                        <div style={{
                                            position: 'absolute', left: 14, top: '50%',
                                            transform: 'translateY(-50%)',
                                            color: 'rgba(255,255,255,0.3)',
                                        }}>
                                            <Lock style={{ width: 16, height: 16 }} />
                                        </div>
                                        <input
                                            type={mostrarPwd ? 'text' : 'password'}
                                            className="form-input"
                                            placeholder="••••••••"
                                            value={password}
                                            onChange={e => setPassword(e.target.value)}
                                            required
                                            disabled={cargando}
                                            style={{ paddingRight: 48 }}
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setMostrarPwd(!mostrarPwd)}
                                            style={{
                                                position: 'absolute', right: 14, top: '50%',
                                                transform: 'translateY(-50%)',
                                                background: 'none', border: 'none', cursor: 'pointer',
                                                color: 'rgba(255,255,255,0.3)', padding: 0,
                                                display: 'flex', alignItems: 'center',
                                            }}
                                        >
                                            {mostrarPwd
                                                ? <EyeOff style={{ width: 16, height: 16 }} />
                                                : <Eye style={{ width: 16, height: 16 }} />
                                            }
                                        </button>
                                    </div>
                                </div>

                                {/* Botón submit */}
                                <div style={{ marginTop: 8 }}>
                                    <button
                                        type="submit"
                                        disabled={cargando}
                                        className={`btn-primary ${modo === 'login' ? 'btn-login' : 'btn-registro'}`}
                                    >
                                        {cargando ? (
                                            <Loader2 style={{ width: 18, height: 18, animation: 'spin 1s linear infinite' }} />
                                        ) : (
                                            <>
                                                {modo === 'login' ? 'Ingresar al Sistema' : 'Crear Cuenta'}
                                                <ArrowRight style={{ width: 16, height: 16 }} />
                                            </>
                                        )}
                                    </button>
                                </div>
                            </div>
                        </form>

                        <div className="divider" />

                        {/* Link cambio de modo */}
                        <div style={{ textAlign: 'center' }}>
                            <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.3)' }}>
                                {modo === 'login' ? '¿Eres nuevo en el equipo? ' : '¿Ya tienes cuenta? '}
                            </span>
                            <button
                                onClick={() => cambiarModo(modo === 'login' ? 'registro' : 'login')}
                                style={{
                                    background: 'none', border: 'none', cursor: 'pointer',
                                    fontSize: 13, fontWeight: 700,
                                    color: modo === 'login' ? '#f59e0b' : '#ef4444',
                                    fontFamily: 'Outfit, sans-serif',
                                    textDecoration: 'underline',
                                    textUnderlineOffset: 3,
                                }}
                            >
                                {modo === 'login' ? 'Regístrate' : 'Inicia Sesión'}
                            </button>
                        </div>

                        {/* Legal */}
                        <div style={{ marginTop: 20, textAlign: 'center' }}>
                            <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.2)', lineHeight: 1.6 }}>
                                Al continuar aceptas los{' '}
                                <button style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(234,179,8,0.5)', fontSize: 11, fontFamily: 'Outfit, sans-serif' }}>
                                    Términos de Servicio
                                </button>
                                {' '}y la{' '}
                                <button style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(234,179,8,0.5)', fontSize: 11, fontFamily: 'Outfit, sans-serif' }}>
                                    Política de Privacidad
                                </button>
                            </p>
                        </div>
                    </div>
                </div>

            </div>

            {/* Keyframe de spin para Loader */}
            <style>{`
              @keyframes spin { to { transform: rotate(360deg); } }
              @keyframes diagonal-reveal {
                from { clip-path: polygon(0 0, 0 0, 0 100%, 0% 100%); }
                to   { clip-path: polygon(0 0, 100% 0, 100% 100%, 0 100%); }
              }
            `}</style>
        </>
    );
}
