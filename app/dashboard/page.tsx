'use client';

/**
 * app/dashboard/page.tsx
 * Dashboard principal ATEMPO — Gold Standard del sistema
 * Stack: Framer Motion + CountUp + Recharts + Firebase real data
 */

import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import CountUp from 'react-countup';
import {
    TrendingUp, ShoppingCart, DollarSign,
    Package, Receipt, ArrowUpRight, ArrowDownRight,
    Wallet, BarChart3, Activity, Zap, RefreshCw,
    CreditCard, Target, Clock,
} from 'lucide-react';
import {
    BarChart, Bar, LineChart, Line, AreaChart, Area,
    PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid,
    Tooltip, ResponsiveContainer,
} from 'recharts';
import { useTasas } from '@/components/providers/TasasProvider';
import { obtenerHistorialTasas } from '@/lib/tasas';
import { useVentas } from '@/lib/useVentas';
import { useServicios } from '@/lib/useServicios';

/* ─────────────────────────────────────────
   HELPERS BLINDADOS (Locales)
───────────────────────────────────────── */
function hoy()  { return new Date().toDateString(); }
function ayer() { const d = new Date(); d.setDate(d.getDate() - 1); return d.toDateString(); }
function inicioMes() { const d = new Date(); d.setDate(1); d.setHours(0,0,0,0); return d; }

const formatBsLocal = (val: number) => `Bs ${val.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const formatUSDLocal = (val: number) => `$${val.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

/* ─────────────────────────────────────────
   ANIMATION VARIANTS
───────────────────────────────────────── */
const containerVariants = {
    hidden: {},
    visible: {
        transition: { staggerChildren: 0.07, delayChildren: 0.1 },
    },
};

const itemVariants = {
    hidden:   { opacity: 0, y: 20, scale: 0.98 },
    visible:  {
        opacity: 1, y: 0, scale: 1,
        transition: { duration: 0.5, ease: [0.25, 1, 0.5, 1] },
    },
};

const cardVariants = {
    hidden:   { opacity: 0, y: 24 },
    visible:  (i: number) => ({
        opacity: 1, y: 0,
        transition: { duration: 0.5, delay: i * 0.06, ease: [0.25, 1, 0.5, 1] },
    }),
};

/* ─────────────────────────────────────────
   COLORES
───────────────────────────────────────── */
const COLORES_METODO: Record<string, string> = {
    punto_venta:   '#EAB308',
    pago_movil:    '#22c55e',
    efectivo_bs:   '#f59e0b',
    efectivo_usd:  '#8b5cf6',
    efectivo_eur:  '#a78bfa',
    transferencia: '#06b6d4',
    mixto:         '#ec4899',
};
const LABEL_METODO: Record<string, string> = {
    punto_venta:   'Punto de Venta',
    pago_movil:    'Pago Movil',
    efectivo_bs:   'Efectivo Bs',
    efectivo_usd:  'Efectivo USD',
    efectivo_eur:  'Efectivo EUR',
    transferencia: 'Transferencia',
    mixto:         'Mixto',
};

/* ─────────────────────────────────────────
   TOOLTIP PERSONALIZADO (Tipado Seguro)
───────────────────────────────────────── */
interface TooltipProps {
    active?: boolean;
    payload?: any[];
    label?: string;
}

function TooltipPremium({ active, payload, label }: TooltipProps) {
    if (!active || !payload?.length) return null;
    return (
        <div style={{
            background: 'rgba(8,8,8,0.95)',
            backdropFilter: 'blur(20px)',
            border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: 12,
            padding: '10px 14px',
            boxShadow: '0 8px 32px rgba(0,0,0,0.6), inset 0 1px 0 rgba(255,255,255,0.05)',
            minWidth: 140,
        }}>
            <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', marginBottom: 8, letterSpacing: '0.05em', textTransform: 'uppercase', fontFamily: 'DM Sans' }}>{label}</p>
            {payload.map((entry, i) => (
                <div key={`tt-${i}`} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12 }}>
                    <div style={{ width: 6, height: 6, borderRadius: '50%', background: entry.color, flexShrink: 0 }} />
                    <span style={{ color: 'rgba(255,255,255,0.9)', fontFamily: 'DM Mono' }}>
                        {typeof entry.value === 'number' && entry.value > 500
                            ? formatBsLocal(entry.value)
                            : entry.value}
                    </span>
                </div>
            ))}
        </div>
    );
}

/* ─────────────────────────────────────────
   KPI CARD PREMIUM
───────────────────────────────────────── */
interface KPIProps {
    titulo: string;
    valor: number;
    prefijo?: string;
    sufijo?: string;
    subtitulo?: string;
    icono: any; // Lucide Icon
    cambio?: number | null;
    glowColor?: 'gold' | 'red' | 'green' | 'blue';
    decimales?: number;
    index: number;
    onClick?: () => void;
}

const GLOW_STYLES: Record<string, { border: string; shadow: string; iconBg: string; iconColor: string }> = {
    gold:  { border: 'rgba(234,179,8,0.3)',  shadow: 'rgba(234,179,8,0.15)',  iconBg: 'rgba(234,179,8,0.1)',  iconColor: '#EAB308' },
    red:   { border: 'rgba(220,38,38,0.3)',  shadow: 'rgba(220,38,38,0.15)',  iconBg: 'rgba(220,38,38,0.1)',  iconColor: '#F87171' },
    green: { border: 'rgba(34,197,94,0.3)',  shadow: 'rgba(34,197,94,0.15)',  iconBg: 'rgba(34,197,94,0.1)',  iconColor: '#34D399' },
    blue:  { border: 'rgba(59,130,246,0.3)', shadow: 'rgba(59,130,246,0.15)', iconBg: 'rgba(59,130,246,0.1)', iconColor: '#60A5FA' },
};

function KPICard({ titulo, valor, prefijo = '', sufijo = '', subtitulo, icono: Icon, cambio, glowColor = 'gold', decimales = 0, index, onClick }: KPIProps) {
    const [hovered, setHovered] = useState(false);
    const glow = GLOW_STYLES[glowColor];

    return (
        <motion.div
            custom={index}
            variants={cardVariants}
            initial="hidden"
            animate="visible"
            whileHover={{ y: -3, scale: 1.005 }}
            whileTap={{ scale: 0.98 }}
            onHoverStart={() => setHovered(true)}
            onHoverEnd={() => setHovered(false)}
            onClick={onClick}
            style={{
                position: 'relative',
                overflow: 'hidden',
                borderRadius: 16,
                padding: '20px',
                cursor: onClick ? 'pointer' : 'default',
                background: 'rgba(255,255,255,0.02)',
                border: `1px solid ${hovered ? glow.border : 'rgba(255,255,255,0.06)'}`,
                boxShadow: hovered
                    ? `0 0 0 1px ${glow.border}, 0 8px 40px ${glow.shadow}, 0 2px 8px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.05)`
                    : '0 1px 3px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.03)',
                transition: 'all 400ms cubic-bezier(0.25,1,0.5,1)',
            }}
        >
            <AnimatePresence>
                {hovered && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.3 }}
                        style={{
                            position: 'absolute', inset: 0, pointerEvents: 'none',
                            background: `radial-gradient(ellipse at 0% 0%, ${glow.shadow} 0%, transparent 65%)`,
                        }}
                    />
                )}
            </AnimatePresence>

            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 16, position: 'relative' }}>
                <div style={{
                    width: 38, height: 38, borderRadius: 10,
                    background: glow.iconBg,
                    border: `1px solid ${glow.border}`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    boxShadow: `inset 0 1px 0 rgba(255,255,255,0.08)`,
                }}>
                    <Icon size={18} strokeWidth={1.5} color={glow.iconColor} />
                </div>
                {cambio !== undefined && cambio !== null && (
                    <div style={{
                        display: 'flex', alignItems: 'center', gap: 3,
                        fontSize: 11, fontWeight: 600,
                        color: cambio >= 0 ? '#34D399' : '#F87171',
                        background: cambio >= 0 ? 'rgba(34,197,94,0.1)' : 'rgba(248,113,113,0.1)',
                        border: `1px solid ${cambio >= 0 ? 'rgba(34,197,94,0.2)' : 'rgba(248,113,113,0.2)'}`,
                        borderRadius: 20, padding: '2px 8px',
                    }}>
                        {cambio >= 0
                            ? <ArrowUpRight size={11} strokeWidth={2} />
                            : <ArrowDownRight size={11} strokeWidth={2} />
                        }
                        {Math.abs(cambio).toFixed(1)}%
                    </div>
                )}
            </div>

            <div style={{ position: 'relative' }}>
                <p style={{
                    fontSize: 26, fontWeight: 700, letterSpacing: '-0.02em',
                    fontFamily: 'DM Mono, monospace', color: 'rgba(255,255,255,0.95)',
                    lineHeight: 1.1, marginBottom: 4,
                }}>
                    {prefijo}
                    <CountUp
                        end={valor || 0}
                        duration={2}
                        decimals={decimales}
                        separator=","
                        preserveValue
                    />
                    {sufijo && <span style={{ fontSize: 14, fontWeight: 500, color: 'rgba(255,255,255,0.5)', marginLeft: 4 }}>{sufijo}</span>}
                </p>
                <p style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.4)', fontFamily: 'DM Sans' }}>
                    {titulo}
                </p>
                {subtitulo && (
                    <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.25)', marginTop: 2, fontFamily: 'DM Sans' }}>
                        {subtitulo}
                    </p>
                )}
            </div>
        </motion.div>
    );
}

/* ─────────────────────────────────────────
   SKELETON KPI
───────────────────────────────────────── */
function SkeletonKPI({ index }: { index: number }) {
    return (
        <motion.div
            custom={index}
            variants={cardVariants}
            initial="hidden"
            animate="visible"
            style={{
                borderRadius: 16, padding: 20,
                background: 'rgba(255,255,255,0.02)',
                border: '1px solid rgba(255,255,255,0.06)',
            }}
        >
            <div className="skeleton h-9 w-9 rounded-xl mb-4" />
            <div className="skeleton h-7 w-28 mb-2 rounded-lg" />
            <div className="skeleton h-3 w-20 rounded" />
        </motion.div>
    );
}

/* ─────────────────────────────────────────
   SECTION HEADER
───────────────────────────────────────── */
function SectionHeader({ title, subtitle, action }: { title: string; subtitle?: string; action?: React.ReactNode }) {
    return (
        <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: 16 }}>
            <div>
                <h3 style={{ fontSize: 14, fontWeight: 600, color: 'rgba(255,255,255,0.9)', letterSpacing: '-0.01em', marginBottom: 2, fontFamily: 'DM Sans' }}>
                    {title}
                </h3>
                {subtitle && (
                    <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.35)', fontFamily: 'DM Sans' }}>{subtitle}</p>
                )}
            </div>
            {action}
        </div>
    );
}

/* ─────────────────────────────────────────
   CHART CARD WRAPPER
───────────────────────────────────────── */
function ChartCard({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
    return (
        <motion.div
            variants={itemVariants}
            style={{
                background: 'rgba(255,255,255,0.02)',
                border: '1px solid rgba(255,255,255,0.06)',
                borderRadius: 16,
                padding: '20px 20px 16px',
                boxShadow: '0 1px 3px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.03)',
                ...style,
            }}
        >
            {children}
        </motion.div>
    );
}

/* ─────────────────────────────────────────
   DASHBOARD PRINCIPAL
───────────────────────────────────────── */
export default function DashboardPage() {
    const { tasas } = useTasas();
    const { ventas, cargando: cargandoVentas } = useVentas() as { ventas: any[]; cargando: boolean };
    const { servicios, cargando: cargandoServicios } = useServicios() as { servicios: any[]; cargando: boolean };
    const [historialTasas, setHistorialTasas] = useState<any[]>([]);
    const [refreshKey, setRefreshKey] = useState(0);
    const [ahora, setAhora] = useState(new Date());

    const cargando = cargandoVentas || cargandoServicios;

    useEffect(() => {
        obtenerHistorialTasas(30).then(setHistorialTasas);
    }, [refreshKey]);

    useEffect(() => {
        const t = setInterval(() => setAhora(new Date()), 60000);
        return () => clearInterval(t);
    }, []);

    const kpis = useMemo(() => {
        const hoyStr  = hoy();
        const ayerStr = ayer();
        const imMes   = inicioMes();

        const ventasHoyArr  = ventas.filter(v => v.fechaTimestamp?.toDate?.()?.toDateString() === hoyStr);
        const ventasAyerArr = ventas.filter(v => v.fechaTimestamp?.toDate?.()?.toDateString() === ayerStr);
        const ventasMesArr  = ventas.filter(v => { const ts = v.fechaTimestamp?.toDate?.(); return ts && ts >= imMes; });

        const ingresoHoyBs   = ventasHoyArr.reduce((s, v)  => s + (v.totalBs  || 0), 0);
        const ingresoAyerBs  = ventasAyerArr.reduce((s, v) => s + (v.totalBs  || 0), 0);
        const ingresoMesBs   = ventasMesArr.reduce((s, v)  => s + (v.totalBs  || 0), 0);
        const ingresoHoyUSD  = ventasHoyArr.reduce((s, v)  => s + (v.totalUSD || 0), 0);
        const ingresoMesUSD  = ventasMesArr.reduce((s, v)  => s + (v.totalUSD || 0), 0);

        const txHoy   = ventasHoyArr.length;
        const txAyer  = ventasAyerArr.length;
        const txMes   = ventasMesArr.length;

        const cambioIngresos = ingresoAyerBs > 0 ? ((ingresoHoyBs - ingresoAyerBs) / ingresoAyerBs) * 100 : null;
        const cambioTx       = txAyer > 0 ? ((txHoy - txAyer) / txAyer) * 100 : null;

        const datosHoras = Array.from({ length: 24 }, (_, h) => ({
            hora: `${h.toString().padStart(2,'0')}h`,
            ventas: ventasHoyArr.filter(v => v.fechaTimestamp?.toDate?.()?.getHours() === h).length,
        }));

        const datosVentasDiarias = Array.from({ length: 30 }, (_, i) => {
            const d = new Date(); d.setDate(d.getDate() - (29 - i));
            const dStr = d.toDateString();
            const total = ventas.filter(v => v.fechaTimestamp?.toDate?.()?.toDateString() === dStr)
                                .reduce((s, v) => s + (v.totalBs || 0), 0);
            return {
                dia: d.toLocaleDateString('es-VE', { day: '2-digit', month: 'short' }),
                ventas: total,
            };
        });

        const metodosCount: Record<string, number> = {};
        ventasMesArr.forEach(v => {
            if (v.metodoPago) metodosCount[v.metodoPago] = (metodosCount[v.metodoPago] || 0) + 1;
        });
        const totalMethods = Object.values(metodosCount).reduce((s, v) => s + v, 0) || 1;
        const datosPie = Object.entries(metodosCount)
            .map(([k, v]) => ({
                name: LABEL_METODO[k] || k,
                value: Math.round((v / totalMethods) * 100),
                color: COLORES_METODO[k] || '#64748b',
            }))
            .sort((a, b) => b.value - a.value)
            .slice(0, 6);

        const servicioMap: Record<string, { nombre: string; cantidad: number; ingresos: number }> = {};
        ventasMesArr.forEach(v => {
            v.items?.forEach((item: { servicioId?: string; nombre?: string; cantidad?: number; totalBs?: number }) => {
                const key = item.servicioId || item.nombre || 'Desconocido';
                if (!servicioMap[key]) {
                    servicioMap[key] = { nombre: item.nombre || 'Desconocido', cantidad: 0, ingresos: 0 };
                }
                servicioMap[key].cantidad += item.cantidad || 1;
                servicioMap[key].ingresos += item.totalBs || 0;
            });
        });
        const topServicios = Object.values(servicioMap)
            .sort((a, b) => b.ingresos - a.ingresos)
            .slice(0, 5)
            .map(s => ({ ...s, nombre: s.nombre.length > 22 ? s.nombre.slice(0, 22) + '…' : s.nombre }));

        const horaMaxima = datosHoras.reduce((a, b) => b.ventas > a.ventas ? b : a, datosHoras[0]);

        return {
            ingresoHoyBs, ingresoAyerBs, ingresoMesBs,
            ingresoHoyUSD, ingresoMesUSD,
            txHoy, txAyer, txMes,
            cambioIngresos, cambioTx,
            datosHoras, datosVentasDiarias,
            datosPie, topServicios, horaMaxima,
            serviciosActivos: servicios.filter(s => s.activo !== false).length,
        };
    }, [ventas, servicios]);

    const hora = ahora.toLocaleTimeString('es-VE', { hour: '2-digit', minute: '2-digit' });
    const fechaStr = ahora.toLocaleDateString('es-VE', { weekday: 'long', day: 'numeric', month: 'long' });

    return (
        <div style={{ minHeight: '100vh', padding: '24px', position: 'relative', background: 'hsl(var(--background))' }}>

            {/* ── Orbes de luz ambiental ── */}
            <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none', overflow: 'hidden', zIndex: 0 }}>
                <motion.div
                    animate={{ x: [0, 40, -20, 0], y: [0, -30, 15, 0] }}
                    transition={{ duration: 18, repeat: Infinity, ease: 'easeInOut' }}
                    style={{
                        position: 'absolute', top: '-10%', left: '-5%',
                        width: '45vw', height: '45vw',
                        background: 'radial-gradient(circle, rgba(234,179,8,0.06) 0%, transparent 70%)',
                        borderRadius: '50%',
                    }}
                />
                <motion.div
                    animate={{ x: [0, -30, 20, 0], y: [0, 20, -25, 0] }}
                    transition={{ duration: 22, repeat: Infinity, ease: 'easeInOut', delay: 3 }}
                    style={{
                        position: 'absolute', bottom: '-15%', right: '-5%',
                        width: '40vw', height: '40vw',
                        background: 'radial-gradient(circle, rgba(220,38,38,0.05) 0%, transparent 70%)',
                        borderRadius: '50%',
                    }}
                />
                <motion.div
                    animate={{ x: [0, 20, -15, 0], y: [0, 10, -20, 0] }}
                    transition={{ duration: 15, repeat: Infinity, ease: 'easeInOut', delay: 6 }}
                    style={{
                        position: 'absolute', top: '40%', left: '40%',
                        width: '30vw', height: '30vw',
                        background: 'radial-gradient(circle, rgba(59,130,246,0.04) 0%, transparent 70%)',
                        borderRadius: '50%',
                    }}
                />
            </div>

            <div style={{ position: 'relative', zIndex: 1, maxWidth: 1400, margin: '0 auto' }}>

                {/* ── PAGE HEADER ── */}
                <motion.div
                    initial={{ opacity: 0, y: -12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, ease: [0.25, 1, 0.5, 1] }}
                    style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 32 }}
                >
                    <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
                            <div style={{
                                width: 6, height: 6, borderRadius: '50%',
                                background: '#EAB308',
                                boxShadow: '0 0 8px rgba(234,179,8,0.6)',
                                animation: 'pulse 2s infinite',
                            }} />
                            <span style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'rgba(234,179,8,0.7)', fontFamily: 'DM Sans' }}>
                                En vivo
                            </span>
                        </div>
                        <h1 style={{
                            fontSize: 28, fontWeight: 700, letterSpacing: '-0.02em',
                            color: 'rgba(255,255,255,0.95)', lineHeight: 1.2, fontFamily: 'DM Sans',
                        }}>
                            Dashboard
                        </h1>
                        <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.35)', marginTop: 4, textTransform: 'capitalize', fontFamily: 'DM Sans' }}>
                            {fechaStr}
                        </p>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div style={{
                            display: 'flex', alignItems: 'center', gap: 8,
                            padding: '8px 14px', borderRadius: 10,
                            background: 'rgba(255,255,255,0.03)',
                            border: '1px solid rgba(255,255,255,0.06)',
                        }}>
                            <Clock size={13} strokeWidth={1.5} color="rgba(255,255,255,0.4)" />
                            <span style={{ fontSize: 13, fontFamily: 'DM Mono', color: 'rgba(255,255,255,0.7)', letterSpacing: '0.05em' }}>
                                {hora}
                            </span>
                        </div>

                        <div style={{
                            display: 'flex', alignItems: 'center', gap: 8,
                            padding: '8px 14px', borderRadius: 10,
                            background: 'rgba(59,130,246,0.08)',
                            border: '1px solid rgba(59,130,246,0.2)',
                        }}>
                            <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', fontFamily: 'DM Sans' }}>BCV</span>
                            <span style={{ fontSize: 13, fontFamily: 'DM Mono', fontWeight: 600, color: '#60A5FA' }}>
                                Bs {tasas?.bcv?.toLocaleString('es-VE', { minimumFractionDigits: 2 }) || '0.00'}
                            </span>
                        </div>

                        <motion.button
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={() => setRefreshKey(k => k + 1)}
                            style={{
                                width: 36, height: 36, borderRadius: 10,
                                background: 'rgba(255,255,255,0.03)',
                                border: '1px solid rgba(255,255,255,0.06)',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                cursor: 'pointer',
                            }}
                            title="Actualizar"
                        >
                            <RefreshCw size={14} strokeWidth={1.5} color="rgba(255,255,255,0.5)" />
                        </motion.button>
                    </div>
                </motion.div>

                {/* ── KPI GRID ── */}
                <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                    gap: 12,
                    marginBottom: 24,
                }}>
                    {cargando ? (
                        Array.from({ length: 6 }).map((_, i) => <SkeletonKPI key={`sk-${i}`} index={i} />)
                    ) : (
                        <>
                            <KPICard index={0} titulo="Ingresos Hoy" valor={kpis.ingresoHoyBs} prefijo="Bs " decimales={0} icono={DollarSign} cambio={kpis.cambioIngresos} glowColor="gold" subtitulo={kpis.ingresoHoyUSD > 0 ? `≈ ${formatUSDLocal(kpis.ingresoHoyUSD)}` : undefined} />
                            <KPICard index={1} titulo="Ingresos del Mes" valor={kpis.ingresoMesBs} prefijo="Bs " decimales={0} icono={TrendingUp} glowColor="green" subtitulo={kpis.ingresoMesUSD > 0 ? `≈ ${formatUSDLocal(kpis.ingresoMesUSD)}` : undefined} />
                            <KPICard index={2} titulo="Transacciones Hoy" valor={kpis.txHoy} icono={Receipt} cambio={kpis.cambioTx} glowColor="blue" subtitulo={`${kpis.txAyer} ayer`} />
                            <KPICard index={3} titulo="Transacciones Mes" valor={kpis.txMes} icono={ShoppingCart} glowColor="gold" subtitulo="Total del mes actual" />
                            <KPICard index={4} titulo="Tasa BCV" valor={tasas?.bcv || 0} prefijo="Bs " decimales={2} icono={Wallet} glowColor="blue" subtitulo="Actualizada" />
                            <KPICard index={5} titulo="Servicios Activos" valor={kpis.serviciosActivos} icono={Package} glowColor="green" subtitulo="En catálogo" />
                        </>
                    )}
                </div>

                {/* ── FILA 2: Ventas diarias + Métodos de pago ── */}
                <motion.div
                    variants={containerVariants}
                    initial="hidden"
                    animate="visible"
                    style={{
                        display: 'grid',
                        gridTemplateColumns: '1fr 320px',
                        gap: 12,
                        marginBottom: 12,
                    }}
                    className="xl:grid-cols-[1fr_320px] grid-cols-1"
                >
                    <ChartCard>
                        <SectionHeader
                            title="Ventas Diarias"
                            subtitle="Ingresos en Bs — últimos 30 días"
                            action={<BarChart3 size={14} strokeWidth={1.5} color="rgba(255,255,255,0.25)" />}
                        />
                        {cargando ? (
                            <div className="skeleton h-64 w-full rounded-xl" />
                        ) : kpis.datosVentasDiarias.every(d => d.ventas === 0) ? (
                            <div style={{ height: 256, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 8, color: 'rgba(255,255,255,0.2)' }}>
                                <BarChart3 size={32} strokeWidth={1} />
                                <p style={{ fontSize: 13 }}>Sin ventas en los últimos 30 días</p>
                            </div>
                        ) : (
                            <ResponsiveContainer width="100%" height={256}>
                                <AreaChart data={kpis.datosVentasDiarias} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
                                    <defs>
                                        <linearGradient id="gradientVentas" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="0%" stopColor="#EAB308" stopOpacity={0.25} />
                                            <stop offset="100%" stopColor="#EAB308" stopOpacity={0} />
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                                    <XAxis dataKey="dia" tick={{ fontSize: 10, fill: 'rgba(255,255,255,0.3)', fontFamily: 'DM Sans' }} tickLine={false} axisLine={false} interval={4} />
                                    <YAxis tick={{ fontSize: 10, fill: 'rgba(255,255,255,0.3)', fontFamily: 'DM Mono' }} tickLine={false} axisLine={false}
                                        tickFormatter={v => v >= 1000 ? `${(v/1000).toFixed(0)}k` : String(v)} width={42} />
                                    <Tooltip content={<TooltipPremium />} />
                                    <Area type="monotone" dataKey="ventas" name="Ventas (Bs)"
                                        stroke="#EAB308" strokeWidth={2}
                                        fill="url(#gradientVentas)"
                                        dot={false} activeDot={{ r: 4, fill: '#EAB308', strokeWidth: 0 }} />
                                </AreaChart>
                            </ResponsiveContainer>
                        )}
                    </ChartCard>

                    <ChartCard>
                        <SectionHeader title="Métodos de Pago" subtitle="Distribución del mes" />
                        {cargando ? (
                            <div className="skeleton h-64 w-full rounded-xl" />
                        ) : kpis.datosPie.length === 0 ? (
                            <div style={{ height: 256, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 8, color: 'rgba(255,255,255,0.2)' }}>
                                <CreditCard size={28} strokeWidth={1} />
                                <p style={{ fontSize: 13 }}>Sin datos este mes</p>
                            </div>
                        ) : (
                            <>
                                <ResponsiveContainer width="100%" height={160}>
                                    <PieChart>
                                        <Pie data={kpis.datosPie} cx="50%" cy="50%"
                                            innerRadius={44} outerRadius={68}
                                            paddingAngle={3} dataKey="value"
                                            strokeWidth={0}>
                                            {kpis.datosPie.map((entry, i) => (
                                                <Cell key={`pie-${i}`} fill={entry.color} opacity={0.9} />
                                            ))}
                                        </Pie>
                                        <Tooltip
                                            formatter={(v: number) => [`${v}%`, '']}
                                            contentStyle={{
                                                background: 'rgba(8,8,8,0.95)',
                                                border: '1px solid rgba(255,255,255,0.08)',
                                                borderRadius: 10, fontSize: 12,
                                                fontFamily: 'DM Sans',
                                            }}
                                        />
                                    </PieChart>
                                </ResponsiveContainer>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 8 }}>
                                    {kpis.datosPie.map(item => (
                                        <div key={item.name} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                                <div style={{ width: 8, height: 8, borderRadius: '50%', background: item.color, flexShrink: 0 }} />
                                                <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)', fontFamily: 'DM Sans', maxWidth: 110, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                                    {item.name}
                                                </span>
                                            </div>
                                            <span style={{ fontSize: 12, fontWeight: 600, fontFamily: 'DM Mono', color: 'rgba(255,255,255,0.8)' }}>
                                                {item.value}%
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            </>
                        )}
                    </ChartCard>
                </motion.div>

                {/* ── FILA 3: Top Servicios + Actividad por hora ── */}
                <motion.div
                    variants={containerVariants}
                    initial="hidden"
                    animate="visible"
                    style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}
                    className="xl:grid-cols-2 grid-cols-1"
                >
                    <ChartCard>
                        <SectionHeader title="Servicios Más Vendidos" subtitle="Top del mes por ingresos" action={<Target size={14} strokeWidth={1.5} color="rgba(255,255,255,0.25)" />} />
                        {cargando ? (
                            <div className="skeleton h-56 w-full rounded-xl" />
                        ) : kpis.topServicios.length === 0 ? (
                            <div style={{ height: 224, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 8, color: 'rgba(255,255,255,0.2)' }}>
                                <Package size={28} strokeWidth={1} />
                                <p style={{ fontSize: 13 }}>Sin ventas este mes</p>
                            </div>
                        ) : (
                            <ResponsiveContainer width="100%" height={224}>
                                <BarChart layout="vertical" data={kpis.topServicios} margin={{ top: 4, right: 50, left: 4, bottom: 0 }}>
                                    <defs>
                                        <linearGradient id="gradientBar" x1="0" y1="0" x2="1" y2="0">
                                            <stop offset="0%" stopColor="#EAB308" stopOpacity={0.9} />
                                            <stop offset="100%" stopColor="#CA8A04" stopOpacity={0.7} />
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" horizontal={false} />
                                    <XAxis type="number" tick={{ fontSize: 10, fill: 'rgba(255,255,255,0.3)', fontFamily: 'DM Mono' }} tickLine={false} axisLine={false}
                                        tickFormatter={v => v >= 1000 ? `${(v/1000).toFixed(0)}k` : String(v)} />
                                    <YAxis type="category" dataKey="nombre" tick={{ fontSize: 11, fill: 'rgba(255,255,255,0.5)', fontFamily: 'DM Sans' }}
                                        tickLine={false} axisLine={false} width={95} />
                                    <Tooltip content={<TooltipPremium />} />
                                    <Bar dataKey="ingresos" name="Ingresos (Bs)" fill="url(#gradientBar)" radius={[0, 4, 4, 0]} />
                                </BarChart>
                            </ResponsiveContainer>
                        )}
                    </ChartCard>

                    <ChartCard>
                        <SectionHeader title="Actividad por Hora" subtitle="Transacciones de hoy" action={<Activity size={14} strokeWidth={1.5} color="rgba(255,255,255,0.25)" />} />
                        {cargando ? (
                            <div className="skeleton h-56 w-full rounded-xl" />
                        ) : kpis.datosHoras.every(h => h.ventas === 0) ? (
                            <div style={{ height: 224, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 8, color: 'rgba(255,255,255,0.2)' }}>
                                <Zap size={28} strokeWidth={1} />
                                <p style={{ fontSize: 13 }}>Sin actividad hoy todavía</p>
                            </div>
                        ) : (
                            <ResponsiveContainer width="100%" height={224}>
                                <BarChart data={kpis.datosHoras} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                                    <XAxis dataKey="hora" tick={{ fontSize: 9, fill: 'rgba(255,255,255,0.3)', fontFamily: 'DM Sans' }} tickLine={false} axisLine={false} interval={3} />
                                    <YAxis tick={{ fontSize: 10, fill: 'rgba(255,255,255,0.3)', fontFamily: 'DM Mono' }} tickLine={false} axisLine={false} allowDecimals={false} width={28} />
                                    <Tooltip content={<TooltipPremium />} />
                                    <Bar dataKey="ventas" name="Transacciones" radius={[3, 3, 0, 0]}>
                                        {kpis.datosHoras.map((entry, i) => (
                                            <Cell key={`bh-${i}`}
                                                fill={
                                                    entry.ventas === kpis.horaMaxima.ventas && entry.ventas > 0
                                                        ? '#EAB308'
                                                        : entry.ventas > 0
                                                            ? 'rgba(234,179,8,0.35)'
                                                            : 'rgba(255,255,255,0.04)'
                                                }
                                            />
                                        ))}
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>
                        )}
                    </ChartCard>
                </motion.div>

                {/* ── FILA 4: Evolución tasa BCV ── */}
                {historialTasas.length > 0 && (
                    <motion.div
                        variants={itemVariants}
                        initial="hidden"
                        animate="visible"
                    >
                        <ChartCard>
                            <SectionHeader title="Evolución Tasa Bs/USD" subtitle="BCV vs Paralelo — últimos 30 días" />
                            <ResponsiveContainer width="100%" height={180}>
                                <LineChart data={historialTasas.slice(-30)} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
                                    <defs>
                                        <linearGradient id="gradientBCV" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="0%" stopColor="#60A5FA" stopOpacity={0.15} />
                                            <stop offset="100%" stopColor="#60A5FA" stopOpacity={0} />
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                                    <XAxis dataKey="fecha" tick={{ fontSize: 10, fill: 'rgba(255,255,255,0.3)', fontFamily: 'DM Sans' }} tickLine={false} axisLine={false}
                                        tickFormatter={v => v?.slice(5) || v} interval={4} />
                                    <YAxis tick={{ fontSize: 10, fill: 'rgba(255,255,255,0.3)', fontFamily: 'DM Mono' }} tickLine={false} axisLine={false}
                                        domain={['auto', 'auto']} tickFormatter={v => v.toFixed(0)} width={42} />
                                    <Tooltip content={<TooltipPremium />} />
                                    <Line type="monotone" dataKey="bcv" name="BCV" stroke="#60A5FA" strokeWidth={2} dot={false} activeDot={{ r: 4, fill: '#60A5FA', strokeWidth: 0 }} />
                                    <Line type="monotone" dataKey="paralelo" name="Paralelo" stroke="#EAB308" strokeWidth={2} dot={false} strokeDasharray="5 5" activeDot={{ r: 4, fill: '#EAB308', strokeWidth: 0 }} />
                                </LineChart>
                            </ResponsiveContainer>
                        </ChartCard>
                    </motion.div>
                )}

                {/* ── FOOTER ── */}
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 1.2, duration: 0.5 }}
                    style={{
                        marginTop: 24, paddingTop: 16,
                        borderTop: '1px solid rgba(255,255,255,0.04)',
                        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    }}
                >
                    <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.2)', fontFamily: 'DM Sans', letterSpacing: '0.04em' }}>
                        ATEMPO Sistema Financiero — Datos en tiempo real
                    </p>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <div style={{ width: 5, height: 5, borderRadius: '50%', background: '#34D399', boxShadow: '0 0 6px rgba(52,211,153,0.6)' }} />
                        <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.25)', fontFamily: 'DM Sans' }}>
                            Firestore conectado
                        </p>
                    </div>
                </motion.div>
            </div>
        </div>
    );
}
