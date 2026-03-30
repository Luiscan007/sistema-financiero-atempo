'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Mail, Lock, Loader2, Eye, EyeOff, User, ArrowRight } from 'lucide-react';
import { useAuth } from '@/components/providers/AuthProvider';
import { RUTA_INICIO_ROL, RolUsuario } from '@/lib/roles';
import toast from 'react-hot-toast';

/* ─── Logo SVG de ATEMPO (la "A" triangular con slash diagonal) ─── */
function AtempoLogo({ size = 48, color = '#ef4444' }: { size?: number; color?: string }) {
    return (
        <svg
            width={size} height={size}
            viewBox="0 0 100 110"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            style={{ display: 'block' }}
        >
            {/*
                Técnica: fondo del color del logo, luego recortes negros
                encima para crear los espacios vacíos — igual que el logo real
            */}

            {/* Cuerpo blanco completo — triángulo exterior grande */}
            <polygon points="50,2 98,105 2,105" fill={color} />

            {/* Recorte: hueco diamante en la base */}
            <polygon points="50,72 36,105 50,95 64,105" fill="#000008" />

            {/* Recorte: espacio interior izquierdo de la A */}
            <polygon points="50,72 18,105 36,105" fill="#000008" />

            {/* Recorte: espacio interior derecho de la A */}
            <polygon points="50,72 82,105 64,105" fill="#000008" />

            {/* Recorte: canal interior de la punta — forma la V interna */}
            <polygon points="50,18 43,48 57,48" fill="#000008" />

            {/* Recorte negro: el slash diagonal que cruza la A de izq a der */}
            <polygon points="8,52 18,44 72,10 82,18" fill="#000008" />

            {/* Recorte adicional para la sombra del slash en el interior */}
            <polygon points="30,52 44,44 60,68 46,76" fill="#000008" />
        </svg>
    );
}

const STYLES = `
@import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Outfit:wght@300;400;500;600;700&display=swap');

*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

@keyframes shimmer {
0%   { background-position: -200% center; }
100% { background-position:  200% center; }
}
@keyframes pulse-glow-red {
0%, 100% { box-shadow: 0 0 18px rgba(220,38,38,0.28), 0 0 48px rgba(220,38,38,0.08); }
50%       { box-shadow: 0 0 36px rgba(220,38,38,0.52), 0 0 88px rgba(220,38,38,0.16); }
}
@keyframes float {
0%, 100% { transform: translateY(0px); }
50%       { transform: translateY(-7px); }
}
@keyframes flicker {
0%, 93%, 100% { opacity: 1; }
94%  { opacity: 0.45; }
96%  { opacity: 0.75; }
}
@keyframes slide-up {
from { opacity: 0; transform: translateY(18px); }
to   { opacity: 1; transform: translateY(0); }
}
@keyframes panel-in-r {
from { opacity: 0; transform: translateX(26px); }
to   { opacity: 1; transform: translateX(0); }
}
@keyframes panel-in-l {
from { opacity: 0; transform: translateX(-26px); }
to   { opacity: 1; transform: translateX(0); }
}
@keyframes panel-out-l {
from { opacity: 1; transform: translateX(0); }
to   { opacity: 0; transform: translateX(-26px); }
}
@keyframes panel-out-r {
from { opacity: 1; transform: translateX(0); }
to   { opacity: 0; transform: translateX(26px); }
}
@keyframes scan {
0%   { top: -2px; opacity: 0; }
5%   { opacity: 1; }
92%  { opacity: 0.5; }
100% { top: 100%; opacity: 0; }
}
@keyframes spin { to { transform: rotate(360deg); } }
@keyframes cover-in {
from { clip-path: polygon(0 0, 0 0, 0 100%, 0 100%); }
to   { clip-path: polygon(0 0, 100% 0, 100% 100%, 0 100%); }
}
@keyframes logo-glow {
0%, 100% { filter: drop-shadow(0 0 6px rgba(220,38,38,0.55)); }
50%       { filter: drop-shadow(0 0 18px rgba(220,38,38,0.85)) drop-shadow(0 0 36px rgba(251,191,36,0.25)); }
}

/* ── Título ── */
.atempo-title {
font-family: 'Bebas Neue', sans-serif;
letter-spacing: 0.06em;
line-height: 1;
background: linear-gradient(90deg,
#dc2626 0%, #ef4444 14%, #fbbf24 30%,
#fef3c7 48%, #fbbf24 62%, #ef4444 78%, #dc2626 100%
);
background-size: 200% auto;
-webkit-background-clip: text;
-webkit-text-fill-color: transparent;
background-clip: text;
animation: shimmer 4s linear infinite, flicker 9s ease-in-out infinite;
filter: drop-shadow(0 0 14px rgba(220,38,38,0.42));
}

/* ── Inputs ── */
.auth-input {
width: 100%;
background: rgba(255,255,255,0.04);
border: 1px solid rgba(255,255,255,0.08);
border-radius: 12px;
padding: 13px 16px 13px 44px;
color: white;
font-family: 'Outfit', sans-serif;
font-size: 14px;
transition: border-color 0.25s, box-shadow 0.25s, background 0.25s;
outline: none;
-webkit-appearance: none;
appearance: none;
}
.auth-input:focus {
background: rgba(255,255,255,0.06);
border-color: rgba(220,38,38,0.42);
box-shadow: 0 0 0 3px rgba(220,38,38,0.08);
}
.auth-input::placeholder { color: rgba(255,255,255,0.22); }

/* ── Botones ── */
.btn-auth {
width: 100%;
padding: 14px;
border-radius: 12px;
font-family: 'Outfit', sans-serif;
font-weight: 700;
font-size: 13px;
letter-spacing: 0.07em;
text-transform: uppercase;
cursor: pointer;
border: none;
display: flex;
align-items: center;
justify-content: center;
gap: 8px;
transition: transform 0.2s, box-shadow 0.2s;
-webkit-tap-highlight-color: transparent;
}
.btn-login {
background: linear-gradient(135deg, #dc2626, #991b1b);
color: white;
animation: pulse-glow-red 3s ease-in-out infinite;
}
.btn-login:hover:not(:disabled)  { transform: translateY(-1px); box-shadow: 0 8px 28px rgba(220,38,38,0.5); }
.btn-registro {
background: linear-gradient(135deg, #d97706, #92400e);
color: white;
box-shadow: 0 4px 20px rgba(217,119,6,0.3);
}
.btn-registro:hover:not(:disabled) { transform: translateY(-1px); box-shadow: 0 8px 28px rgba(217,119,6,0.5); }
.btn-auth:disabled { opacity: 0.45; cursor: not-allowed; animation: none; transform: none !important; }

/* ── Tabs ── */
.tab-pill {
font-family: 'Outfit', sans-serif;
font-weight: 600;
font-size: 12px;
letter-spacing: 0.07em;
text-transform: uppercase;
padding: 9px 20px;
border-radius: 8px;
cursor: pointer;
border: none;
background: transparent;
transition: all 0.25s;
white-space: nowrap;
-webkit-tap-highlight-color: transparent;
}
.tab-login-active { background: rgba(220,38,38,0.14); color: #ef4444; box-shadow: inset 0 0 0 1px rgba(220,38,38,0.28); }
.tab-reg-active   { background: rgba(217,119,6,0.14);  color: #f59e0b; box-shadow: inset 0 0 0 1px rgba(217,119,6,0.28); }
.tab-inactive     { color: rgba(255,255,255,0.3); }
.tab-inactive:hover { color: rgba(255,255,255,0.6); }

/* ── Animaciones panel ── */
.pan-enter-r { animation: panel-in-r  0.38s cubic-bezier(0.22,1,0.36,1) forwards; }
.pan-enter-l { animation: panel-in-l  0.38s cubic-bezier(0.22,1,0.36,1) forwards; }
.pan-exit-l  { animation: panel-out-l 0.26s ease forwards; }
.pan-exit-r  { animation: panel-out-r 0.26s ease forwards; }

/* ── Label ── */
.field-label {
display: block;
font-family: 'Outfit', sans-serif;
font-size: 10.5px;
font-weight: 600;
letter-spacing: 0.13em;
text-transform: uppercase;
color: rgba(234,179,8,0.62);
margin-bottom: 7px;
}

/* ── Divisor horizontal ── */
.h-divider {
height: 1px;
background: linear-gradient(90deg, transparent, rgba(255,255,255,0.07), transparent);
margin: 18px 0;
}

/* ── Scan line ── */
.scan-line {
position: absolute;
left: 0; right: 0; height: 1px;
background: linear-gradient(90deg, transparent 0%, rgba(220,38,38,0.3) 50%, transparent 100%);
animation: scan 9s linear infinite;
pointer-events: none;
z-index: 3;
}

/* ── Logo flotante ── */
.logo-float { animation: float 5s ease-in-out infinite, logo-glow 3s ease-in-out infinite; }

/* ════════════════════════════════════
LAYOUT — DESKTOP primero
════════════════════════════════════ */
.auth-root {
min-height: 100vh;
min-height: 100dvh;
display: flex;
flex-direction: row;
background: #000008;
overflow: hidden;
position: relative;
}

/* Panel izquierdo — marca */
.brand-panel {
flex: 0 0 42%;
display: flex;
flex-direction: column;
justify-content: center;
padding: 60px 48px;
position: relative;
z-index: 2;
animation: slide-up 0.7s ease both;
}

/* Divisor vertical */
.v-divider {
position: relative; z-index: 2;
width: 1px; flex-shrink: 0;
background: linear-gradient(180deg,
transparent 0%, rgba(220,38,38,0.22) 25%,
rgba(220,38,38,0.48) 50%, rgba(220,38,38,0.22) 75%,
transparent 100%
);
transform: skewX(-2deg);
}

/* Panel derecho — form */
.form-panel {
flex: 1;
display: flex;
flex-direction: column;
justify-content: center;
padding: 60px 52px;
position: relative;
z-index: 2;
overflow-y: auto;
}

/* Logo caja */
.logo-box {
width: 66px; height: 66px;
background: linear-gradient(135deg, #1a0000, #0b0b1c);
border-radius: 16px;
display: flex; align-items: center; justify-content: center;
border: 1px solid rgba(220,38,38,0.22);
flex-shrink: 0;
}

/* Subtítulo marca */
.brand-sub {
font-family: 'Outfit', sans-serif;
font-size: 12px; font-weight: 500;
letter-spacing: 0.26em; text-transform: uppercase;
color: rgba(255,255,255,0.3);
margin-top: 6px;
}

/* Separador rojo */
.brand-sep {
width: 52px; height: 2px; margin-top: 28px;
background: linear-gradient(90deg, #dc2626, transparent);
}

/* Bloque bienvenida */
.brand-welcome { margin-top: 22px; }
.brand-welcome h2 {
font-family: 'Outfit', sans-serif;
font-size: clamp(1.25rem, 2.4vw, 1.7rem);
font-weight: 700; color: white; line-height: 1.35; margin-bottom: 10px;
}
.brand-welcome p {
font-size: 13px; color: rgba(255,255,255,0.37);
line-height: 1.7; max-width: 255px;
}

/* Stats */
.stats-row { display: flex; gap: 26px; margin-top: 44px; }
.stat-val { font-size: 22px; font-weight: 800; color: #ef4444; font-family: 'Outfit', sans-serif; }
.stat-lbl { font-size: 10px; color: rgba(255,255,255,0.27); letter-spacing: 0.1em; text-transform: uppercase; font-family: 'Outfit', sans-serif; }

/* Tabs container */
.tabs-wrap {
display: inline-flex;
background: rgba(255,255,255,0.04);
border-radius: 10px; padding: 4px; margin-bottom: 26px;
border: 1px solid rgba(255,255,255,0.06);
align-self: flex-start;
animation: slide-up 0.6s ease both;
}

/* Form title */
.form-title {
font-family: 'Outfit', sans-serif;
font-size: 20px; font-weight: 700; color: white; margin-bottom: 22px;
}

/* ════════════ TABLET (641–1023px) ════════════ */
@media (min-width: 641px) and (max-width: 1023px) {
.brand-panel { flex: 0 0 38%; padding: 40px 32px; }
.form-panel  { padding: 40px 36px; }
.atempo-title { font-size: 3.4rem !important; }
.stats-row { gap: 18px; margin-top: 30px; }
}

/* ════════════ MOBILE (≤ 640px) ════════════ */
@media (max-width: 640px) {
/* Cambia a columna */
.auth-root { flex-direction: column; }

/* Marca: header compacto horizontal */
.brand-panel {
  flex: 0 0 auto;
  flex-direction: row;
  align-items: center;
  justify-content: flex-start;
  gap: 14px;
  padding: 20px 20px 16px;
  border-bottom: 1px solid rgba(220,38,38,0.12);
}

/* Ocultar elementos que no caben en el header móvil */
.brand-sep, .brand-welcome, .stats-row { display: none !important; }

/* Ajustar logo para móvil */
.logo-box { width: 46px !important; height: 46px !important; border-radius: 12px !important; }

/* Título más pequeño */
.atempo-title { font-size: 2.4rem !important; }
.brand-sub    { font-size: 10px !important; margin-top: 3px !important; }

/* Formulario ocupa el resto de la pantalla */
.form-panel {
  flex: 1;
  padding: 22px 20px 28px;
  justify-content: flex-start;
  overflow-y: auto;
}

/* Tabs más compactos */
.tab-pill { padding: 8px 14px; font-size: 11px; }
.tabs-wrap { margin-bottom: 20px; }

/* Form title más pequeño */
.form-title { font-size: 17px; margin-bottom: 18px; }

/* Divisor vertical oculto */
.v-divider { display: none; }

/* Input móvil — evita zoom en iOS (mínimo 16px) */
.auth-input { font-size: 16px !important; }

}
`;

export default function AuthPage() {
const [modo, setModo]         = useState<'login' | 'registro'>('login');
const [email, setEmail]       = useState('');
const [password, setPassword] = useState('');
const [nombre, setNombre]     = useState('');
const [mostrarPwd, setMostrarPwd] = useState(false);
const [cargando, setCargando] = useState(false);
const [saliendo, setSaliendo] = useState(false);
const [panelAnim, setPanelAnim] = useState<'enter-r'|'enter-l'|'exit-l'|'exit-r'>('enter-r');

const router = useRouter();
const { loginEmail, registro, perfil } = useAuth();

useEffect(() => {
    if (perfil?.rol) {
        setSaliendo(true);
        setTimeout(() => {
            router.replace(RUTA_INICIO_ROL[perfil.rol as RolUsuario] || '/pos');
        }, 800);
    }
}, [perfil, router]);

const cambiarModo = (nuevo: 'login' | 'registro') => {
    if (nuevo === modo) return;
    setPanelAnim(nuevo === 'registro' ? 'exit-l' : 'exit-r');
    setTimeout(() => {
        setModo(nuevo);
        setPanelAnim(nuevo === 'registro' ? 'enter-r' : 'enter-l');
        setEmail(''); setPassword(''); setNombre('');
    }, 240);
};

const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setCargando(true);
    try {
        if (!email || !password) throw new Error('Faltan credenciales');
        await loginEmail(email, password);
        toast.success('¡Bienvenido de vuelta!');
    } catch (err: any) { manejarError(err); }
};

const handleRegistro = async (e: React.FormEvent) => {
    e.preventDefault();
    setCargando(true);
    try {
        if (!email || !password || !nombre) throw new Error('Completa todos los campos');
        await registro(email, password, nombre);
        toast.success('Cuenta creada exitosamente');
    } catch (err: any) { manejarError(err); }
};

const manejarError = (err: any) => {
    const code = err?.code || '';
    if (['auth/user-not-found','auth/wrong-password','auth/invalid-credential'].includes(code)) {
        toast.error('Credenciales incorrectas.');
    } else if (code === 'auth/email-already-in-use') {
        toast.error('Este correo ya está registrado.');
    } else {
        toast.error(err.message || 'Error de conexión.');
    }
    setCargando(false);
};

const panelClass = {
    'enter-r': 'pan-enter-r',
    'enter-l': 'pan-enter-l',
    'exit-l':  'pan-exit-l',
    'exit-r':  'pan-exit-r',
}[panelAnim];

return (
    <>
        <style>{STYLES}</style>

        {/* ── OVERLAY TRANSICIÓN AL DASHBOARD ── */}
        {saliendo && (
            <div style={{
                position: 'fixed', inset: 0, zIndex: 9999,
                background: '#000008',
                animation: 'cover-in 0.75s cubic-bezier(0.76,0,0.24,1) forwards',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                flexDirection: 'column', gap: 14,
            }}>
                <div className="logo-float">
                    <AtempoLogo size={68} color="#ef4444" />
                </div>
                <div className="atempo-title" style={{ fontSize: '3.2rem', marginTop: 8 }}>ATEMPO</div>
                <p style={{
                    fontFamily: 'Outfit, sans-serif', color: 'rgba(255,255,255,0.3)',
                    fontSize: 11, letterSpacing: '0.22em', textTransform: 'uppercase', marginTop: 4,
                }}>
                    Cargando sistema…
                </p>
            </div>
        )}

        <div className="auth-root">

            {/* ── FONDOS AMBIENTALES ── */}
            <div style={{
                position: 'absolute', inset: 0, zIndex: 0,
                background: 'linear-gradient(125deg, rgba(28,0,0,0.97) 0%, rgba(10,0,0,0.98) 45%, rgba(0,0,12,1) 100%)',
            }} />
            <div style={{
                position: 'absolute', top: '-5%', left: '-8%',
                width: '55vw', height: '55vw', maxWidth: 560, maxHeight: 560,
                background: 'radial-gradient(circle, rgba(220,38,38,0.1) 0%, transparent 70%)',
                pointerEvents: 'none', zIndex: 1,
                animation: 'float 11s ease-in-out infinite',
            }} />
            <div style={{
                position: 'absolute', bottom: '-8%', right: '5%',
                width: '45vw', height: '45vw', maxWidth: 480, maxHeight: 480,
                background: 'radial-gradient(circle, rgba(30,64,175,0.06) 0%, transparent 70%)',
                pointerEvents: 'none', zIndex: 1,
                animation: 'float 14s ease-in-out infinite', animationDelay: '-5s',
            }} />
            <div style={{
                position: 'absolute', inset: 0, zIndex: 1, pointerEvents: 'none',
                background: 'linear-gradient(130deg, rgba(220,38,38,0.03) 49.9%, transparent 50%)',
            }} />
            <div className="scan-line" />

            {/* ══════ PANEL IZQUIERDO — MARCA ══════ */}
            <div className="brand-panel">

                {/* Logo box con la A de ATEMPO */}
                <div className="logo-box logo-float">
                    <AtempoLogo size={42} color="#ef4444" />
                </div>

                {/* Nombre y subtítulo */}
                <div style={{ marginTop: 20 }}>
                    <div className="atempo-title" style={{ fontSize: 'clamp(2.8rem, 6vw, 4.8rem)' }}>
                        ATEMPO
                    </div>
                    <div className="brand-sub">Sistema Financiero</div>
                </div>

                {/* Separador */}
                <div className="brand-sep" />

                {/* Bienvenida */}
                <div className="brand-welcome">
                    <h2>
                        {modo === 'login'
                            ? <><span>Bienvenido</span><br /><span style={{ color: '#ef4444' }}>de vuelta</span></>
                            : <><span>Únete al</span><br /><span style={{ color: '#f59e0b' }}>equipo</span></>
                        }
                    </h2>
                    <p>
                        {modo === 'login'
                            ? 'Ingresa tus credenciales para acceder al panel de control de Atempo.'
                            : 'Crea tu cuenta corporativa para acceder a todas las herramientas del estudio.'
                        }
                    </p>
                </div>

                {/* Stats */}
                <div className="stats-row">
                    {[['12+','Módulos'],['8','Agentes IA'],['24/7','En vivo']].map(([v,l]) => (
                        <div key={l}>
                            <div className="stat-val">{v}</div>
                            <div className="stat-lbl">{l}</div>
                        </div>
                    ))}
                </div>
            </div>

            {/* ── DIVISOR VERTICAL ── */}
            <div className="v-divider" />

            {/* ══════ PANEL DERECHO — FORMULARIO ══════ */}
            <div className="form-panel">

                {/* Tabs */}
                <div className="tabs-wrap">
                    <button
                        className={`tab-pill ${modo === 'login' ? 'tab-login-active' : 'tab-inactive'}`}
                        onClick={() => cambiarModo('login')}
                    >
                        Iniciar Sesión
                    </button>
                    <button
                        className={`tab-pill ${modo === 'registro' ? 'tab-reg-active' : 'tab-inactive'}`}
                        onClick={() => cambiarModo('registro')}
                    >
                        Registrarse
                    </button>
                </div>

                {/* Panel animado */}
                <div className={panelClass} style={{ maxWidth: 400, width: '100%' }}>

                    <h3 className="form-title">
                        {modo === 'login' ? 'Acceso al Sistema' : 'Crear Cuenta Corporativa'}
                    </h3>

                    <form onSubmit={modo === 'login' ? handleLogin : handleRegistro}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 15 }}>

                            {/* Nombre — solo registro */}
                            {modo === 'registro' && (
                                <div>
                                    <label className="field-label">Nombre Completo</label>
                                    <div style={{ position: 'relative' }}>
                                        <User style={{
                                            position: 'absolute', left: 14, top: '50%',
                                            transform: 'translateY(-50%)',
                                            width: 15, height: 15, color: 'rgba(255,255,255,0.26)',
                                            flexShrink: 0,
                                        }} />
                                        <input
                                            type="text"
                                            className="auth-input"
                                            placeholder="Ej: Camila Ruiz"
                                            value={nombre}
                                            onChange={e => setNombre(e.target.value)}
                                            required disabled={cargando}
                                            autoComplete="name"
                                        />
                                    </div>
                                </div>
                            )}

                            {/* Email */}
                            <div>
                                <label className="field-label">Correo Electrónico</label>
                                <div style={{ position: 'relative' }}>
                                    <Mail style={{
                                        position: 'absolute', left: 14, top: '50%',
                                        transform: 'translateY(-50%)',
                                        width: 15, height: 15, color: 'rgba(255,255,255,0.26)',
                                    }} />
                                    <input
                                        type="email"
                                        className="auth-input"
                                        placeholder="usuario@atempo.com"
                                        value={email}
                                        onChange={e => setEmail(e.target.value)}
                                        required disabled={cargando}
                                        autoComplete="email"
                                        inputMode="email"
                                    />
                                </div>
                            </div>

                            {/* Contraseña */}
                            <div>
                                <label className="field-label">Contraseña</label>
                                <div style={{ position: 'relative' }}>
                                    <Lock style={{
                                        position: 'absolute', left: 14, top: '50%',
                                        transform: 'translateY(-50%)',
                                        width: 15, height: 15, color: 'rgba(255,255,255,0.26)',
                                    }} />
                                    <input
                                        type={mostrarPwd ? 'text' : 'password'}
                                        className="auth-input"
                                        placeholder="••••••••"
                                        value={password}
                                        onChange={e => setPassword(e.target.value)}
                                        required disabled={cargando}
                                        autoComplete={modo === 'login' ? 'current-password' : 'new-password'}
                                        style={{ paddingRight: 46 }}
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setMostrarPwd(v => !v)}
                                        style={{
                                            position: 'absolute', right: 12, top: '50%',
                                            transform: 'translateY(-50%)',
                                            background: 'none', border: 'none', cursor: 'pointer',
                                            color: 'rgba(255,255,255,0.28)', padding: 4,
                                            display: 'flex', alignItems: 'center',
                                        }}
                                    >
                                        {mostrarPwd
                                            ? <EyeOff style={{ width: 15, height: 15 }} />
                                            : <Eye    style={{ width: 15, height: 15 }} />
                                        }
                                    </button>
                                </div>
                            </div>

                            {/* Botón submit */}
                            <div style={{ marginTop: 6 }}>
                                <button
                                    type="submit"
                                    disabled={cargando}
                                    className={`btn-auth ${modo === 'login' ? 'btn-login' : 'btn-registro'}`}
                                >
                                    {cargando
                                        ? <Loader2 style={{ width: 18, height: 18, animation: 'spin 1s linear infinite' }} />
                                        : <>
                                            {modo === 'login' ? 'Ingresar al Sistema' : 'Crear Cuenta'}
                                            <ArrowRight style={{ width: 15, height: 15 }} />
                                          </>
                                    }
                                </button>
                            </div>
                        </div>
                    </form>

                    <div className="h-divider" />

                    {/* Cambio de modo */}
                    <div style={{ textAlign: 'center' }}>
                        <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.28)' }}>
                            {modo === 'login' ? '¿Eres nuevo en el equipo? ' : '¿Ya tienes cuenta? '}
                        </span>
                        <button
                            onClick={() => cambiarModo(modo === 'login' ? 'registro' : 'login')}
                            style={{
                                background: 'none', border: 'none', cursor: 'pointer',
                                fontSize: 13, fontWeight: 700,
                                color: modo === 'login' ? '#f59e0b' : '#ef4444',
                                fontFamily: 'Outfit, sans-serif',
                                textDecoration: 'underline', textUnderlineOffset: 3,
                            }}
                        >
                            {modo === 'login' ? 'Regístrate' : 'Inicia Sesión'}
                        </button>
                    </div>

                    {/* Legal */}
                    <div style={{ marginTop: 18, textAlign: 'center' }}>
                        <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.18)', lineHeight: 1.6 }}>
                            Al continuar aceptas los{' '}
                            <button style={{ background:'none', border:'none', cursor:'pointer', color:'rgba(234,179,8,0.42)', fontSize:11, fontFamily:'Outfit,sans-serif' }}>
                                Términos de Servicio
                            </button>{' '}y la{' '}
                            <button style={{ background:'none', border:'none', cursor:'pointer', color:'rgba(234,179,8,0.42)', fontSize:11, fontFamily:'Outfit,sans-serif' }}>
                                Política de Privacidad
                            </button>
                        </p>
                    </div>
                </div>
            </div>

        </div>
    </>
);

}
