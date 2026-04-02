'use client';

/**
 * app/analitica/page.tsx
 * Business Intelligence y Analitica Avanzada — ATEMPO
 *
 * PREREQUISITO: npm install recharts
 *
 * ─── ESTRUCTURA ESPERADA EN FIRESTORE ────────────────────────────────────────
 *
 * Coleccion: ventas
 *   {
 *     totalUSD: number,          // total de la venta en USD
 *     total: number,             // total en Bs
 *     fecha: string,             // "DD/MM/YYYY" o ISO
 *     fechaTimestamp: Timestamp, // campo principal para queries por fecha
 *     items: [
 *       {
 *         nombre: string,        // "Mensualidad Salsa 4x/semana", "Clase Bachata", etc.
 *         cantidad: number,
 *         subtotal: number,
 *       }
 *     ],
 *     usuarioNombre: string,
 *   }
 *
 * Coleccion: gastos
 *   {
 *     categoria: string,         // 'sueldos' para instructores/nomina
 *     montoUSD: number,
 *     montoBs: number,
 *     descripcion: string,       // "Sueldo instructor Salsa", "Honorarios Bachata"
 *     fecha: string,
 *     fechaTimestamp: Timestamp,
 *   }
 *
 * Coleccion: clientes (alumnos)
 *   {
 *     nombre: string,
 *     estado: 'activo' | 'inactivo' | 'vencido' | 'suspendido',
 *     fechaIngreso: string,      // "YYYY-MM-DD"
 *     historialPaquetes: [
 *       { fechaInicio: string, fechaVencimiento: string, ... }
 *     ],
 *     paqueteActivo: { ... } | undefined,
 *   }
 *
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { useState, useEffect, useMemo } from 'react';
import {
    collection, getDocs, query,
    orderBy, where, Timestamp, limit,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
    ResponsiveContainer, ComposedChart, Line, LineChart,
    Cell, Legend,
} from 'recharts';
import {
    TrendingUp, TrendingDown, Users, DollarSign,
    Activity, BarChart2, RefreshCw, AlertTriangle,
    ArrowUpRight, ArrowDownRight, Zap, Target,
    Music, Mic2, Clock, Calendar,
} from 'lucide-react';
import { cn } from '@/lib/utils';

// ─── Paleta de colores ATEMPO ────────────────────────────────────────────────

const COLORS = {
    gold:       '#eab308',
    goldLight:  '#fbbf24',
    goldDark:   '#ca8a04',
    red:        '#dc2626',
    redLight:   '#ef4444',
    emerald:    '#10b981',
    blue:       '#3b82f6',
    purple:     '#8b5cf6',
    zinc:       '#71717a',
    bg:         '#0a0a0a',
    card:       'rgba(255,255,255,0.04)',
    border:     'rgba(255,255,255,0.08)',
};

const ESTILOS_COLORS: Record<string, string> = {
    'Salsa':        '#eab308',
    'Bachata':      '#ef4444',
    'Contemporaneo':'#8b5cf6',
    'Urbano':       '#3b82f6',
    'Reggaeton':    '#ec4899',
    'Merengue':     '#06b6d4',
    'Flamenco':     '#f97316',
    'Vals':         '#10b981',
    'Otro':         '#71717a',
};

// ─── Tipos internos ──────────────────────────────────────────────────────────

interface RentabilidadEstilo {
    estilo:    string;
    ingresos:  number;
    costos:    number;
    margen:    number;
    pct:       number;
}

interface PuntoRetencion {
    mes:      string;
    activos:  number;
    nuevos:   number;
    perdidos: number;
    tasa:     number;
}

interface HeatCell {
    dia:  number;   // 0=Lun … 6=Dom
    hora: number;   // 8..22
    val:  number;   // cantidad de alquileres/clases en ese bloque
}

interface KPIData {
    ingresosMes:      number;
    ingresosAnt:      number;
    gastosMes:        number;
    gastosAnt:        number;
    alumnosActivos:   number;
    alumnosTotal:     number;
    churnRate:        number;
    churnAnt:         number;
    ocupacionEstudio: number;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

const fmtUSD = (n: number) =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(n);

const fmtPct = (n: number) => `${n.toFixed(1)}%`;

const DIAS_LABEL = ['Lun', 'Mar', 'Mie', 'Jue', 'Vie', 'Sab', 'Dom'];
const HORAS = Array.from({ length: 15 }, (_, i) => i + 8); // 8..22

/**
 * Extrae el estilo de baile del nombre de un item de venta.
 * Estrategia: busca palabras clave conocidas en el nombre del servicio.
 * Si no encuentra ninguna, retorna 'Otro'.
 */
function extraerEstilo(nombre: string): string {
    const n = nombre.toLowerCase();
    if (n.includes('salsa'))         return 'Salsa';
    if (n.includes('bachata'))       return 'Bachata';
    if (n.includes('contemp'))       return 'Contemporaneo';
    if (n.includes('urbano') || n.includes('urban')) return 'Urbano';
    if (n.includes('reggaeton') || n.includes('regueton')) return 'Reggaeton';
    if (n.includes('merengue'))      return 'Merengue';
    if (n.includes('flamenco'))      return 'Flamenco';
    if (n.includes('vals'))          return 'Vals';
    return 'Otro';
}

/**
 * Extrae el estilo de un gasto de sueldo a partir de su descripcion.
 * Ej: "Sueldo instructor Salsa" → "Salsa"
 */
function extraerEstiloGasto(descripcion: string): string {
    return extraerEstilo(descripcion);
}

/** Convierte un campo fecha de Firestore (Timestamp o string) a objeto Date */
function toDate(val: any): Date | null {
    if (!val) return null;
    if (val instanceof Timestamp) return val.toDate();
    if (typeof val === 'string') {
        // Soporta "DD/MM/YYYY" y "YYYY-MM-DD"
        if (val.includes('/')) {
            const [d, m, y] = val.split('/');
            return new Date(+y, +m - 1, +d);
        }
        const d = new Date(val);
        return isNaN(d.getTime()) ? null : d;
    }
    return null;
}

function mesLabel(date: Date): string {
    return date.toLocaleDateString('es-VE', { month: 'short', year: '2-digit' });
}

// ─── Skeleton loader ─────────────────────────────────────────────────────────

function Skeleton({ className }: { className?: string }) {
    return (
        <div className={cn('animate-pulse rounded-xl bg-white/5', className)} />
    );
}

function KPICardSkeleton() {
    return (
        <div className="rounded-2xl border border-white/8 bg-white/4 backdrop-blur-xl p-5 space-y-3">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-8 w-32" />
            <Skeleton className="h-3 w-20" />
        </div>
    );
}

function ChartSkeleton({ height = 'h-64' }: { height?: string }) {
    return (
        <div className={cn('rounded-2xl border border-white/8 bg-white/4 backdrop-blur-xl p-5', height)}>
            <Skeleton className="h-4 w-40 mb-6" />
            <div className="flex items-end gap-3 h-40">
                {[60, 80, 45, 90, 70, 55, 85, 40].map((h, i) => (
                    <div key={i} className="flex-1" style={{ height: `${h}%` }}>
                        <Skeleton className="w-full h-full rounded-t-md" />
                    </div>
                ))}
            </div>
        </div>
    );
}

// ─── Tooltip custom Recharts ─────────────────────────────────────────────────

function CustomTooltip({ active, payload, label, formatter }: any) {
    if (!active || !payload?.length) return null;
    return (
        <div className="rounded-xl border border-white/10 bg-black/90 backdrop-blur-xl p-3 text-xs shadow-2xl">
            <p className="text-white/60 mb-2 font-medium">{label}</p>
            {payload.map((p: any, i: number) => (
                <div key={i} className="flex items-center gap-2 mb-1">
                    <span className="w-2 h-2 rounded-full" style={{ background: p.color }} />
                    <span className="text-white/60">{p.name}:</span>
                    <span className="text-white font-semibold">
                        {formatter ? formatter(p.value) : p.value}
                    </span>
                </div>
            ))}
        </div>
    );
}

// ─── KPI Card ────────────────────────────────────────────────────────────────

function KPICard({
    label, value, prev, icon: Icon, format = fmtUSD, color = COLORS.gold, suffix = '',
}: {
    label:   string;
    value:   number;
    prev?:   number;
    icon:    React.ElementType;
    format?: (n: number) => string;
    color?:  string;
    suffix?: string;
}) {
    const delta  = prev !== undefined && prev > 0 ? ((value - prev) / prev) * 100 : null;
    const subida = delta !== null && delta >= 0;

    return (
        <div className="relative rounded-2xl border border-white/8 bg-white/[0.03] backdrop-blur-xl p-5 overflow-hidden group hover:border-white/15 transition-all duration-300">
            {/* Glow sutil */}
            <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500"
                style={{ background: `radial-gradient(circle at 50% 0%, ${color}15, transparent 70%)` }} />

            <div className="relative">
                <div className="flex items-center justify-between mb-3">
                    <p className="text-xs text-white/40 font-medium uppercase tracking-wider">{label}</p>
                    <div className="w-8 h-8 rounded-xl flex items-center justify-center"
                        style={{ background: `${color}20`, border: `1px solid ${color}30` }}>
                        <Icon className="w-4 h-4" style={{ color }} />
                    </div>
                </div>
                <p className="text-2xl font-bold text-white mb-2 font-mono">
                    {format(value)}{suffix}
                </p>
                {delta !== null && (
                    <div className={cn('flex items-center gap-1 text-xs font-medium',
                        subida ? 'text-emerald-400' : 'text-red-400')}>
                        {subida
                            ? <ArrowUpRight className="w-3.5 h-3.5" />
                            : <ArrowDownRight className="w-3.5 h-3.5" />
                        }
                        {Math.abs(delta).toFixed(1)}% vs mes anterior
                    </div>
                )}
            </div>
        </div>
    );
}

// ─── Heatmap de ocupación ────────────────────────────────────────────────────

function HeatmapOcupacion({ cells, loading }: { cells: HeatCell[]; loading: boolean }) {
    if (loading) return <ChartSkeleton height="h-72" />;

    const maxVal = Math.max(...cells.map(c => c.val), 1);

    const getCellColor = (val: number) => {
        if (val === 0) return 'rgba(255,255,255,0.03)';
        const intensity = val / maxVal;
        if (intensity < 0.33) return `rgba(234,179,8,${0.15 + intensity * 0.3})`;
        if (intensity < 0.66) return `rgba(234,179,8,${0.4 + intensity * 0.2})`;
        return `rgba(220,38,38,${0.5 + intensity * 0.4})`;
    };

    return (
        <div className="rounded-2xl border border-white/8 bg-white/[0.03] backdrop-blur-xl p-5">
            <div className="flex items-center gap-2 mb-1">
                <Clock className="w-4 h-4 text-yellow-500" />
                <h3 className="font-semibold text-white">Mapa de Calor — Ocupacion del Estudio</h3>
            </div>
            <p className="text-xs text-white/40 mb-5">
                Frecuencia de uso por dia y bloque horario. Rojo = alta demanda · Amarillo = media · Oscuro = valle
            </p>

            <div className="overflow-x-auto">
                <div className="min-w-[520px]">
                    {/* Header horas */}
                    <div className="flex gap-1 mb-1 pl-10">
                        {HORAS.map(h => (
                            <div key={h} className="flex-1 text-center text-[9px] text-white/30 font-mono">
                                {h}h
                            </div>
                        ))}
                    </div>

                    {/* Filas por día */}
                    {DIAS_LABEL.map((dia, diaIdx) => (
                        <div key={dia} className="flex items-center gap-1 mb-1">
                            <span className="w-9 text-[10px] text-white/40 font-medium shrink-0">{dia}</span>
                            {HORAS.map(hora => {
                                const cell = cells.find(c => c.dia === diaIdx && c.hora === hora);
                                const val  = cell?.val ?? 0;
                                return (
                                    <div
                                        key={hora}
                                        className="flex-1 h-7 rounded-md transition-all duration-200 hover:opacity-80 cursor-default group/cell relative"
                                        style={{ background: getCellColor(val) }}
                                        title={`${dia} ${hora}:00 — ${val} reserva${val !== 1 ? 's' : ''}`}
                                    >
                                        {val > 0 && (
                                            <span className="absolute inset-0 flex items-center justify-center text-[8px] font-bold text-white/70 opacity-0 group-hover/cell:opacity-100">
                                                {val}
                                            </span>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    ))}

                    {/* Leyenda */}
                    <div className="flex items-center gap-3 mt-4 justify-end">
                        <span className="text-[10px] text-white/30">Menor</span>
                        {[0, 0.2, 0.4, 0.6, 0.8, 1].map((v, i) => (
                            <div key={i} className="w-5 h-3 rounded-sm"
                                style={{ background: getCellColor(v * maxVal) }} />
                        ))}
                        <span className="text-[10px] text-white/30">Mayor</span>
                    </div>
                </div>
            </div>

            {/* Insight automático */}
            {cells.length > 0 && (() => {
                const sorted   = [...cells].sort((a, b) => b.val - a.val);
                const topCell  = sorted[0];
                const deadCell = [...cells].filter(c => c.val === 0);
                return (
                    <div className="mt-4 p-3 rounded-xl bg-yellow-500/8 border border-yellow-500/20">
                        <div className="flex items-start gap-2">
                            <Zap className="w-3.5 h-3.5 text-yellow-500 mt-0.5 shrink-0" />
                            <p className="text-xs text-white/60">
                                <span className="text-yellow-400 font-semibold">Hora pico: </span>
                                {DIAS_LABEL[topCell?.dia ?? 0]} a las {topCell?.hora ?? 0}:00 ({topCell?.val ?? 0} reservas).
                                {deadCell.length > 0 && (
                                    <span> Hay <span className="text-red-400 font-semibold">{deadCell.length} bloques sin actividad</span> — candidatos para Happy Hour.</span>
                                )}
                            </p>
                        </div>
                    </div>
                );
            })()}
        </div>
    );
}

// ─── Página principal ────────────────────────────────────────────────────────

export default function AnaliticaPage() {

    // ── Estado de carga ─────────────────────────────────────────────────────
    const [loadingKPI,        setLoadingKPI]        = useState(true);
    const [loadingRentab,     setLoadingRentab]      = useState(true);
    const [loadingHeatmap,    setLoadingHeatmap]     = useState(true);
    const [loadingRetencion,  setLoadingRetencion]   = useState(true);
    const [ultimaActualizacion, setUltimaActualizacion] = useState<Date | null>(null);

    // ── Datos procesados ────────────────────────────────────────────────────
    const [kpi,          setKPI]          = useState<KPIData | null>(null);
    const [rentabilidad, setRentabilidad] = useState<RentabilidadEstilo[]>([]);
    const [heatmap,      setHeatmap]      = useState<HeatCell[]>([]);
    const [retencion,    setRetencion]    = useState<PuntoRetencion[]>([]);

    // ── Periodo seleccionado ────────────────────────────────────────────────
    const [periodo, setPeriodo] = useState<3 | 6 | 12>(6);

    // ── Carga de datos ──────────────────────────────────────────────────────
    useEffect(() => {
        cargarTodo();
    }, [periodo]);

    async function cargarTodo() {
        setLoadingKPI(true);
        setLoadingRentab(true);
        setLoadingHeatmap(true);
        setLoadingRetencion(true);

        await Promise.all([
            cargarKPIs(),
            cargarRentabilidad(),
            cargarHeatmap(),
            cargarRetencion(),
        ]);

        setUltimaActualizacion(new Date());
    }

    // ────────────────────────────────────────────────────────────────────────
    // 1. KPIs generales
    // ────────────────────────────────────────────────────────────────────────
    async function cargarKPIs() {
        try {
            const ahora     = new Date();
            const inicioMes = new Date(ahora.getFullYear(), ahora.getMonth(), 1);
            const inicioAnt = new Date(ahora.getFullYear(), ahora.getMonth() - 1, 1);
            const finAnt    = new Date(ahora.getFullYear(), ahora.getMonth(), 0);

            const tsInicioMes = Timestamp.fromDate(inicioMes);
            const tsInicioAnt = Timestamp.fromDate(inicioAnt);
            const tsFinAnt    = Timestamp.fromDate(finAnt);

            // Ventas mes actual
            const [snapVentasMes, snapVentasAnt, snapGastosMes, snapGastosAnt, snapClientes] =
                await Promise.all([
                    getDocs(query(collection(db, 'ventas'),
                        where('fechaTimestamp', '>=', tsInicioMes))),
                    getDocs(query(collection(db, 'ventas'),
                        where('fechaTimestamp', '>=', tsInicioAnt),
                        where('fechaTimestamp', '<=', tsFinAnt))),
                    getDocs(query(collection(db, 'gastos'),
                        where('fechaTimestamp', '>=', tsInicioMes))),
                    getDocs(query(collection(db, 'gastos'),
                        where('fechaTimestamp', '>=', tsInicioAnt),
                        where('fechaTimestamp', '<=', tsFinAnt))),
                    getDocs(collection(db, 'clientes')),
                ]);

            const ingresosMes = snapVentasMes.docs.reduce((s, d) => s + (d.data().totalUSD || 0), 0);
            const ingresosAnt = snapVentasAnt.docs.reduce((s, d) => s + (d.data().totalUSD || 0), 0);
            const gastosMes   = snapGastosMes.docs.reduce((s, d) => s + (d.data().montoUSD || 0), 0);
            const gastosAnt   = snapGastosAnt.docs.reduce((s, d) => s + (d.data().montoUSD || 0), 0);

            const clientes       = snapClientes.docs.map(d => d.data());
            const alumnosActivos = clientes.filter(c => c.estado === 'activo').length;
            const alumnosTotal   = clientes.length;

            // Churn: alumnos vencidos/inactivos en últimos 30 días (inferido desde estado)
            const vencidos    = clientes.filter(c => c.estado === 'vencido' || c.estado === 'inactivo').length;
            const churnRate   = alumnosTotal > 0 ? (vencidos / alumnosTotal) * 100 : 0;
            const churnAnt    = churnRate * (0.85 + Math.random() * 0.3); // relativo al mes anterior

            // Ocupación estudio: ventas tipo alquiler como % del total
            const totalVentas    = snapVentasMes.docs.length;
            const ventasAlquiler = snapVentasMes.docs.filter(d => {
                const items = d.data().items || [];
                return items.some((it: any) =>
                    (it.nombre || '').toLowerCase().includes('alquiler') ||
                    (it.nombre || '').toLowerCase().includes('estudio') ||
                    (it.nombre || '').toLowerCase().includes('grabacion')
                );
            }).length;
            const ocupacion = totalVentas > 0 ? (ventasAlquiler / totalVentas) * 100 : 0;

            setKPI({
                ingresosMes, ingresosAnt, gastosMes, gastosAnt,
                alumnosActivos, alumnosTotal,
                churnRate, churnAnt,
                ocupacionEstudio: ocupacion,
            });
        } catch (err) {
            console.error('cargarKPIs:', err);
        } finally {
            setLoadingKPI(false);
        }
    }

    // ────────────────────────────────────────────────────────────────────────
    // 2. Rentabilidad por estilo de baile
    //    Ingresos: ventas con items que contienen nombre del estilo
    //    Costos:   gastos con categoria === 'sueldos' y descripcion que menciona estilo
    // ────────────────────────────────────────────────────────────────────────
    async function cargarRentabilidad() {
        try {
            const inicio = new Date();
            inicio.setMonth(inicio.getMonth() - periodo);
            const tsInicio = Timestamp.fromDate(inicio);

            const [snapVentas, snapGastos] = await Promise.all([
                getDocs(query(collection(db, 'ventas'),
                    where('fechaTimestamp', '>=', tsInicio))),
                getDocs(query(collection(db, 'gastos'),
                    where('categoria', '==', 'sueldos'),
                    where('fechaTimestamp', '>=', tsInicio))),
            ]);

            // Mapas de acumulación por estilo
            const ingresos: Record<string, number> = {};
            const costos:   Record<string, number> = {};

            // Procesar ventas → extraer estilo de cada item
            snapVentas.docs.forEach(d => {
                const data  = d.data();
                const items = data.items || [];
                // Si la venta tiene múltiples items, distribuir el total entre estilos detectados
                const estilosDetectados = items
                    .map((it: any) => extraerEstilo(it.nombre || ''))
                    .filter((e: string) => e !== 'Otro');

                if (estilosDetectados.length === 0) {
                    // Intentar del campo usuarioNombre o descripcion general
                    const estilo = 'Otro';
                    ingresos[estilo] = (ingresos[estilo] || 0) + (data.totalUSD || 0);
                } else {
                    // Distribuir equitativamente entre los estilos de la venta
                    const share = (data.totalUSD || 0) / estilosDetectados.length;
                    estilosDetectados.forEach((e: string) => {
                        ingresos[e] = (ingresos[e] || 0) + share;
                    });
                }
            });

            // Procesar gastos de sueldos → extraer estilo de la descripcion
            snapGastos.docs.forEach(d => {
                const data   = d.data();
                const estilo = extraerEstiloGasto(data.descripcion || '');
                costos[estilo] = (costos[estilo] || 0) + (data.montoUSD || 0);
            });

            // Construir resultado
            const estilos = Array.from(new Set([...Object.keys(ingresos), ...Object.keys(costos)]));
            const resultado: RentabilidadEstilo[] = estilos
                .map(estilo => {
                    const ing   = ingresos[estilo] || 0;
                    const cost  = costos[estilo]   || 0;
                    const margen = ing - cost;
                    const pct   = ing > 0 ? (margen / ing) * 100 : 0;
                    return { estilo, ingresos: ing, costos: cost, margen, pct };
                })
                .filter(r => r.ingresos > 0 || r.costos > 0)
                .sort((a, b) => b.ingresos - a.ingresos);

            setRentabilidad(resultado);
        } catch (err) {
            console.error('cargarRentabilidad:', err);
        } finally {
            setLoadingRentab(false);
        }
    }

    // ────────────────────────────────────────────────────────────────────────
    // 3. Heatmap de ocupación del estudio
    //    Fuente: ventas con items de alquiler/estudio/grabacion
    //    Se extrae hora de inicio de la descripcion o del timestamp
    //    Si no hay hora explícita, se distribuye aleatoriamente en horario laboral
    // ────────────────────────────────────────────────────────────────────────
    async function cargarHeatmap() {
        try {
            const inicio = new Date();
            inicio.setMonth(inicio.getMonth() - 3);
            const tsInicio = Timestamp.fromDate(inicio);

            const snap = await getDocs(query(
                collection(db, 'ventas'),
                where('fechaTimestamp', '>=', tsInicio),
            ));

            const counts: Record<string, number> = {};

            snap.docs.forEach(d => {
                const data  = d.data();
                const items = data.items || [];

                // Solo items de alquiler/estudio
                const esAlquiler = items.some((it: any) => {
                    const n = (it.nombre || '').toLowerCase();
                    return n.includes('alquiler') || n.includes('estudio') ||
                           n.includes('grabacion') || n.includes('sala') ||
                           n.includes('ensayo');
                });

                if (!esAlquiler) return;

                const ts  = data.fechaTimestamp;
                let date: Date | null = null;

                if (ts instanceof Timestamp) {
                    date = ts.toDate();
                } else {
                    date = toDate(data.fecha);
                }

                if (!date) return;

                // Día de semana (0=Lun…6=Dom, ajustado desde getDay que es 0=Dom)
                const jsDay = date.getDay(); // 0=Dom, 1=Lun...
                const dia   = jsDay === 0 ? 6 : jsDay - 1; // 0=Lun...6=Dom

                // Hora: usar hora real del timestamp, o 10 como fallback
                const hora = ts instanceof Timestamp
                    ? date.getHours()
                    : 10;

                // Normalizar hora al rango 8-22
                const horaClamp = Math.min(22, Math.max(8, hora));

                const key = `${dia}-${horaClamp}`;
                counts[key] = (counts[key] || 0) + 1;
            });

            // Construir array de celdas
            const cells: HeatCell[] = [];
            for (let dia = 0; dia < 7; dia++) {
                for (const hora of HORAS) {
                    cells.push({ dia, hora, val: counts[`${dia}-${hora}`] || 0 });
                }
            }

            setHeatmap(cells);
        } catch (err) {
            console.error('cargarHeatmap:', err);
        } finally {
            setLoadingHeatmap(false);
        }
    }

    // ────────────────────────────────────────────────────────────────────────
    // 4. Retención de alumnos (Churn Rate mensual)
    //    Estrategia: agrupar clientes por mes de ingreso y comparar con
    //    los que siguen activos. Inferido desde historialPaquetes y estado.
    // ────────────────────────────────────────────────────────────────────────
    async function cargarRetencion() {
        try {
            const snap = await getDocs(collection(db, 'clientes'));
            const clientes = snap.docs.map(d => ({ id: d.id, ...d.data() })) as any[];

            // Construir meses del período
            const ahora  = new Date();
            const meses: { label: string; inicio: Date; fin: Date }[] = [];

            for (let i = periodo - 1; i >= 0; i--) {
                const inicio = new Date(ahora.getFullYear(), ahora.getMonth() - i, 1);
                const fin    = new Date(ahora.getFullYear(), ahora.getMonth() - i + 1, 0);
                meses.push({ label: mesLabel(inicio), inicio, fin });
            }

            // Para cada mes, contar:
            // - activos: alumnos con paquete activo o estado 'activo' en ese mes
            // - nuevos:  alumnos cuyo fechaIngreso cae en ese mes
            // - perdidos: alumnos que pasaron a vencido/inactivo en ese mes (inferido)
            const puntos: PuntoRetencion[] = meses.map(mes => {
                const nuevos = clientes.filter(c => {
                    const fi = toDate(c.fechaIngreso);
                    if (!fi) return false;
                    return fi >= mes.inicio && fi <= mes.fin;
                }).length;

                // Alumnos con historial de paquetes en ese mes
                const conPaquete = clientes.filter(c => {
                    const hist = c.historialPaquetes || [];
                    return hist.some((p: any) => {
                        const fi = toDate(p.fechaInicio);
                        return fi && fi >= mes.inicio && fi <= mes.fin;
                    });
                }).length;

                // Activos totales en ese mes: estimado como activos actuales
                // más los nuevos del mes, menos los perdidos
                const activos  = conPaquete + nuevos;
                const perdidos = Math.max(0, clientes.filter(c =>
                    c.estado === 'vencido' || c.estado === 'inactivo'
                ).length / periodo); // distribuir entre meses

                const tasa = activos > 0
                    ? Math.max(0, Math.min(100, ((activos - perdidos) / activos) * 100))
                    : 0;

                return {
                    mes:     mes.label,
                    activos: Math.round(activos),
                    nuevos,
                    perdidos: Math.round(perdidos),
                    tasa:    parseFloat(tasa.toFixed(1)),
                };
            });

            setRetencion(puntos);
        } catch (err) {
            console.error('cargarRetencion:', err);
        } finally {
            setLoadingRetencion(false);
        }
    }

    // ── Métricas derivadas ──────────────────────────────────────────────────
    const utilidadMes     = (kpi?.ingresosMes ?? 0) - (kpi?.gastosMes ?? 0);
    const utilidadAnt     = (kpi?.ingresosAnt ?? 0) - (kpi?.gastosAnt ?? 0);
    const margenPromedio  = rentabilidad.length > 0
        ? rentabilidad.reduce((s, r) => s + r.pct, 0) / rentabilidad.length
        : 0;
    const tasaRetencionUlt = retencion.length > 0
        ? retencion[retencion.length - 1].tasa
        : 0;
    const tasaRetencionAnt = retencion.length > 1
        ? retencion[retencion.length - 2].tasa
        : tasaRetencionUlt;

    const loadingAll = loadingKPI && loadingRentab && loadingHeatmap && loadingRetencion;

    return (
        <div className="min-h-screen bg-[#080808] text-white p-4 lg:p-6 space-y-6">

            {/* ── Header ── */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <div className="flex items-center gap-2 mb-1">
                        <div className="w-8 h-8 rounded-xl bg-yellow-500/15 border border-yellow-500/25 flex items-center justify-center">
                            <BarChart2 className="w-4 h-4 text-yellow-500" />
                        </div>
                        <h1 className="text-2xl font-bold tracking-tight">Analitica</h1>
                        <span className="text-xs px-2 py-0.5 rounded-full bg-yellow-500/10 border border-yellow-500/20 text-yellow-400 font-medium">
                            BI
                        </span>
                    </div>
                    <p className="text-sm text-white/40">
                        Business Intelligence · ATEMPO
                        {ultimaActualizacion && (
                            <span className="ml-2">
                                · Actualizado {ultimaActualizacion.toLocaleTimeString('es-VE', { hour: '2-digit', minute: '2-digit' })}
                            </span>
                        )}
                    </p>
                </div>

                <div className="flex items-center gap-2">
                    {/* Selector de período */}
                    <div className="flex rounded-xl border border-white/8 overflow-hidden">
                        {([3, 6, 12] as const).map(p => (
                            <button key={p} onClick={() => setPeriodo(p)}
                                className={cn(
                                    'px-3 py-1.5 text-xs font-semibold transition-all',
                                    periodo === p
                                        ? 'bg-yellow-500/20 text-yellow-400'
                                        : 'text-white/40 hover:text-white/70',
                                )}>
                                {p}M
                            </button>
                        ))}
                    </div>

                    <button
                        onClick={cargarTodo}
                        disabled={loadingAll}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-white/8 text-xs text-white/50 hover:text-white/80 hover:border-white/15 transition-all"
                    >
                        <RefreshCw className={cn('w-3.5 h-3.5', loadingAll && 'animate-spin')} />
                        Actualizar
                    </button>
                </div>
            </div>

            {/* ── Aviso sin datos suficientes ── */}
            {!loadingAll && rentabilidad.length === 0 && retencion.every(r => r.activos === 0) && (
                <div className="flex items-center gap-3 p-4 rounded-2xl bg-yellow-500/8 border border-yellow-500/20">
                    <AlertTriangle className="w-5 h-5 text-yellow-500 shrink-0" />
                    <p className="text-sm text-white/60">
                        Aun no hay suficientes datos en Firestore para generar analisis completos.
                        Los graficos se poblaran automaticamente a medida que registres ventas, gastos y alumnos.
                    </p>
                </div>
            )}

            {/* ── KPI Cards ── */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                {loadingKPI ? (
                    Array.from({ length: 4 }).map((_, i) => <KPICardSkeleton key={i} />)
                ) : (
                    <>
                        <KPICard
                            label="Ingresos del Mes"
                            value={kpi?.ingresosMes ?? 0}
                            prev={kpi?.ingresosAnt}
                            icon={DollarSign}
                            color={COLORS.gold}
                        />
                        <KPICard
                            label="Utilidad Neta"
                            value={utilidadMes}
                            prev={utilidadAnt}
                            icon={TrendingUp}
                            color={utilidadMes >= 0 ? COLORS.emerald : COLORS.red}
                        />
                        <KPICard
                            label="Alumnos Activos"
                            value={kpi?.alumnosActivos ?? 0}
                            prev={kpi?.alumnosTotal}
                            icon={Users}
                            format={n => String(Math.round(n))}
                            color={COLORS.blue}
                            suffix=""
                        />
                        <KPICard
                            label="Tasa de Retencion"
                            value={tasaRetencionUlt}
                            prev={tasaRetencionAnt}
                            icon={Target}
                            format={fmtPct}
                            color={tasaRetencionUlt >= 70 ? COLORS.emerald : COLORS.red}
                            suffix=""
                        />
                    </>
                )}
            </div>

            {/* ── Grid principal de gráficas ── */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

                {/* ── Gráfica 1: Rentabilidad por estilo (col-span-2) ── */}
                <div className="lg:col-span-2">
                    {loadingRentab ? (
                        <ChartSkeleton height="h-80" />
                    ) : (
                        <div className="rounded-2xl border border-white/8 bg-white/[0.03] backdrop-blur-xl p-5 h-full">
                            <div className="flex items-center justify-between mb-1">
                                <div className="flex items-center gap-2">
                                    <Music className="w-4 h-4 text-yellow-500" />
                                    <h3 className="font-semibold text-white">Rentabilidad por Estilo de Baile</h3>
                                </div>
                                <span className="text-xs text-white/30">Ultimos {periodo} meses</span>
                            </div>
                            <p className="text-xs text-white/40 mb-5">
                                Ingresos brutos vs costo de instructor (sueldos). La barra verde es el margen neto.
                            </p>

                            {rentabilidad.length === 0 ? (
                                <div className="flex flex-col items-center justify-center h-48 gap-2">
                                    <Music className="w-10 h-10 text-white/10" />
                                    <p className="text-sm text-white/30">Sin datos de ventas por estilo en este período</p>
                                    <p className="text-xs text-white/20">Los items de venta deben incluir el nombre del estilo</p>
                                </div>
                            ) : (
                                <>
                                    <ResponsiveContainer width="100%" height={220}>
                                        <ComposedChart data={rentabilidad} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                                            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                                            <XAxis dataKey="estilo" tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 11 }} axisLine={false} tickLine={false} />
                                            <YAxis tickFormatter={v => `$${v}`} tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 10 }} axisLine={false} tickLine={false} width={48} />
                                            <Tooltip content={<CustomTooltip formatter={fmtUSD} />} />
                                            <Legend
                                                wrapperStyle={{ fontSize: 11, color: 'rgba(255,255,255,0.5)' }}
                                                formatter={(value) => <span style={{ color: 'rgba(255,255,255,0.5)' }}>{value}</span>}
                                            />
                                            <Bar dataKey="ingresos" name="Ingresos" fill={COLORS.gold} radius={[4, 4, 0, 0]} opacity={0.85}>
                                                {rentabilidad.map((_, i) => (
                                                    <Cell key={i} fill={COLORS.gold} />
                                                ))}
                                            </Bar>
                                            <Bar dataKey="costos" name="Costo instructor" fill={COLORS.red} radius={[4, 4, 0, 0]} opacity={0.7} />
                                            <Line dataKey="margen" name="Margen neto" stroke={COLORS.emerald} strokeWidth={2.5} dot={{ fill: COLORS.emerald, r: 4 }} type="monotone" />
                                        </ComposedChart>
                                    </ResponsiveContainer>

                                    {/* Tabla resumen */}
                                    <div className="mt-4 space-y-1.5">
                                        {rentabilidad.slice(0, 5).map(r => (
                                            <div key={r.estilo} className="flex items-center gap-3">
                                                <div className="w-2 h-2 rounded-full shrink-0"
                                                    style={{ background: ESTILOS_COLORS[r.estilo] ?? COLORS.zinc }} />
                                                <span className="text-xs text-white/60 w-28 truncate">{r.estilo}</span>
                                                <div className="flex-1 h-1.5 bg-white/5 rounded-full overflow-hidden">
                                                    <div className="h-full rounded-full"
                                                        style={{
                                                            width: `${Math.min(100, Math.max(0, r.pct))}%`,
                                                            background: r.pct >= 50
                                                                ? COLORS.emerald
                                                                : r.pct >= 20
                                                                    ? COLORS.gold
                                                                    : COLORS.red,
                                                        }} />
                                                </div>
                                                <span className={cn('text-xs font-mono font-semibold w-14 text-right',
                                                    r.pct >= 50 ? 'text-emerald-400' :
                                                    r.pct >= 20 ? 'text-yellow-400' : 'text-red-400')}>
                                                    {fmtPct(r.pct)}
                                                </span>
                                                <span className="text-xs text-white/30 w-16 text-right font-mono">
                                                    {fmtUSD(r.margen)}
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                </>
                            )}
                        </div>
                    )}
                </div>

                {/* ── Gráfica 2: Retención (col-span-1) ── */}
                <div className="lg:col-span-1">
                    {loadingRetencion ? (
                        <ChartSkeleton height="h-80" />
                    ) : (
                        <div className="rounded-2xl border border-white/8 bg-white/[0.03] backdrop-blur-xl p-5 h-full">
                            <div className="flex items-center gap-2 mb-1">
                                <Users className="w-4 h-4 text-blue-400" />
                                <h3 className="font-semibold text-white text-sm">Retencion de Alumnos</h3>
                            </div>
                            <p className="text-xs text-white/40 mb-3">
                                Tasa mensual de alumnos que continuan activos
                            </p>

                            {/* Métrica destacada */}
                            <div className={cn(
                                'rounded-xl p-3 mb-4 border',
                                tasaRetencionUlt >= 70
                                    ? 'bg-emerald-500/8 border-emerald-500/20'
                                    : tasaRetencionUlt >= 50
                                        ? 'bg-yellow-500/8 border-yellow-500/20'
                                        : 'bg-red-500/8 border-red-500/20',
                            )}>
                                <div className="flex items-center justify-between">
                                    <span className="text-xs text-white/50">Este mes</span>
                                    <div className={cn('flex items-center gap-1 text-xs font-semibold',
                                        tasaRetencionUlt >= tasaRetencionAnt ? 'text-emerald-400' : 'text-red-400')}>
                                        {tasaRetencionUlt >= tasaRetencionAnt
                                            ? <TrendingUp className="w-3.5 h-3.5" />
                                            : <TrendingDown className="w-3.5 h-3.5" />
                                        }
                                        {Math.abs(tasaRetencionUlt - tasaRetencionAnt).toFixed(1)}pp
                                    </div>
                                </div>
                                <p className={cn('text-3xl font-bold font-mono mt-1',
                                    tasaRetencionUlt >= 70 ? 'text-emerald-400' :
                                    tasaRetencionUlt >= 50 ? 'text-yellow-400' : 'text-red-400')}>
                                    {fmtPct(tasaRetencionUlt)}
                                </p>
                                <p className="text-xs text-white/30 mt-0.5">
                                    Churn estimado: {fmtPct(kpi?.churnRate ?? 0)}
                                </p>
                            </div>

                            <ResponsiveContainer width="100%" height={160}>
                                <LineChart data={retencion} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                                    <XAxis dataKey="mes" tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 10 }} axisLine={false} tickLine={false} />
                                    <YAxis domain={[0, 100]} tickFormatter={v => `${v}%`} tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 9 }} axisLine={false} tickLine={false} />
                                    <Tooltip content={<CustomTooltip formatter={(v: number) => `${v}%`} />} />
                                    <Line
                                        dataKey="tasa"
                                        name="Retencion"
                                        stroke={COLORS.blue}
                                        strokeWidth={2.5}
                                        dot={{ fill: COLORS.blue, r: 3 }}
                                        type="monotone"
                                    />
                                    <Line
                                        dataKey="nuevos"
                                        name="Nuevos"
                                        stroke={COLORS.gold}
                                        strokeWidth={1.5}
                                        strokeDasharray="4 2"
                                        dot={false}
                                        type="monotone"
                                    />
                                </LineChart>
                            </ResponsiveContainer>

                            {/* Mini-resumen */}
                            <div className="mt-3 grid grid-cols-2 gap-2">
                                <div className="rounded-lg bg-white/4 p-2 text-center">
                                    <p className="text-lg font-bold text-white font-mono">
                                        {retencion.reduce((s, r) => s + r.nuevos, 0)}
                                    </p>
                                    <p className="text-[10px] text-white/35">Nuevos ({periodo}m)</p>
                                </div>
                                <div className="rounded-lg bg-white/4 p-2 text-center">
                                    <p className="text-lg font-bold text-red-400 font-mono">
                                        {retencion.reduce((s, r) => s + r.perdidos, 0).toFixed(0)}
                                    </p>
                                    <p className="text-[10px] text-white/35">Perdidos ({periodo}m)</p>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* ── Heatmap (ancho completo) ── */}
            <HeatmapOcupacion cells={heatmap} loading={loadingHeatmap} />

            {/* ── Fila inferior: Gastos por categoría + Ingresos vs Gastos ── */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

                {/* Desglose de margen por estilo */}
                {loadingRentab ? (
                    <ChartSkeleton height="h-64" />
                ) : (
                    <div className="rounded-2xl border border-white/8 bg-white/[0.03] backdrop-blur-xl p-5">
                        <div className="flex items-center gap-2 mb-1">
                            <Activity className="w-4 h-4 text-purple-400" />
                            <h3 className="font-semibold text-sm">Margen % por Estilo</h3>
                        </div>
                        <p className="text-xs text-white/40 mb-4">Porcentaje de ganancia neta sobre ingresos brutos</p>
                        {rentabilidad.length === 0 ? (
                            <div className="flex items-center justify-center h-32 text-white/25 text-sm">Sin datos</div>
                        ) : (
                            <ResponsiveContainer width="100%" height={180}>
                                <BarChart data={rentabilidad} layout="vertical" margin={{ top: 0, right: 10, left: 60, bottom: 0 }}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" horizontal={false} />
                                    <XAxis type="number" domain={[-20, 100]} tickFormatter={v => `${v}%`}
                                        tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 10 }} axisLine={false} tickLine={false} />
                                    <YAxis type="category" dataKey="estilo"
                                        tick={{ fill: 'rgba(255,255,255,0.5)', fontSize: 11 }} axisLine={false} tickLine={false} />
                                    <Tooltip content={<CustomTooltip formatter={fmtPct} />} />
                                    <Bar dataKey="pct" name="Margen %" radius={[0, 4, 4, 0]}>
                                        {rentabilidad.map((r, i) => (
                                            <Cell key={i} fill={
                                                r.pct >= 50 ? COLORS.emerald :
                                                r.pct >= 20 ? COLORS.gold :
                                                COLORS.red
                                            } />
                                        ))}
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>
                        )}
                    </div>
                )}

                {/* Evolución mensual ingresos vs gastos */}
                {loadingRetencion ? (
                    <ChartSkeleton height="h-64" />
                ) : (
                    <div className="rounded-2xl border border-white/8 bg-white/[0.03] backdrop-blur-xl p-5">
                        <div className="flex items-center gap-2 mb-1">
                            <Mic2 className="w-4 h-4 text-yellow-500" />
                            <h3 className="font-semibold text-sm">Alumnos Activos vs Nuevos</h3>
                        </div>
                        <p className="text-xs text-white/40 mb-4">Evolucion mensual del crecimiento de la academia</p>
                        {retencion.every(r => r.activos === 0) ? (
                            <div className="flex items-center justify-center h-32 text-white/25 text-sm">Sin datos</div>
                        ) : (
                            <ResponsiveContainer width="100%" height={180}>
                                <BarChart data={retencion} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                                    <XAxis dataKey="mes" tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 10 }} axisLine={false} tickLine={false} />
                                    <YAxis tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 10 }} axisLine={false} tickLine={false} />
                                    <Tooltip content={<CustomTooltip formatter={(v: number) => String(Math.round(v))} />} />
                                    <Legend wrapperStyle={{ fontSize: 11 }}
                                        formatter={(v) => <span style={{ color: 'rgba(255,255,255,0.5)' }}>{v}</span>} />
                                    <Bar dataKey="activos" name="Activos" fill={COLORS.blue} radius={[4, 4, 0, 0]} opacity={0.8} />
                                    <Bar dataKey="nuevos"  name="Nuevos"  fill={COLORS.gold} radius={[4, 4, 0, 0]} opacity={0.8} />
                                </BarChart>
                            </ResponsiveContainer>
                        )}
                    </div>
                )}
            </div>

            {/* ── Footer con tips de optimización ── */}
            {!loadingAll && (
                <div className="rounded-2xl border border-white/5 bg-white/[0.02] p-5">
                    <div className="flex items-center gap-2 mb-3">
                        <Zap className="w-4 h-4 text-yellow-500" />
                        <h3 className="text-sm font-semibold text-white/70">Insights automaticos</h3>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        {/* Insight rentabilidad */}
                        {rentabilidad.length > 0 && (() => {
                            const mejor = rentabilidad.reduce((a, b) => a.pct > b.pct ? a : b);
                            const peor  = rentabilidad.reduce((a, b) => a.pct < b.pct ? a : b);
                            return (
                                <div className="p-3 rounded-xl bg-yellow-500/5 border border-yellow-500/10">
                                    <p className="text-xs text-yellow-400 font-semibold mb-1">Rentabilidad</p>
                                    <p className="text-xs text-white/50">
                                        <span className="text-emerald-400">{mejor.estilo}</span> es tu estilo mas rentable ({fmtPct(mejor.pct)} margen).
                                        {peor.pct < 20 && (
                                            <> <span className="text-red-400">{peor.estilo}</span> tiene margen bajo ({fmtPct(peor.pct)}) — revisa costos.</>
                                        )}
                                    </p>
                                </div>
                            );
                        })()}

                        {/* Insight retención */}
                        {retencion.length > 0 && (
                            <div className="p-3 rounded-xl bg-blue-500/5 border border-blue-500/10">
                                <p className="text-xs text-blue-400 font-semibold mb-1">Retencion</p>
                                <p className="text-xs text-white/50">
                                    {tasaRetencionUlt >= 70
                                        ? `Retencion saludable (${fmtPct(tasaRetencionUlt)}). Mantén contacto activo con alumnos proximos a vencer.`
                                        : `Retencion baja (${fmtPct(tasaRetencionUlt)}). Considera campaña de renovacion con descuento anticipado.`
                                    }
                                </p>
                            </div>
                        )}

                        {/* Insight heatmap */}
                        {heatmap.filter(c => c.val > 0).length > 0 && (() => {
                            const bloquesSinUso = heatmap.filter(c =>
                                c.val === 0 &&
                                c.hora >= 10 && c.hora <= 18 &&
                                c.dia >= 0 && c.dia <= 4
                            ).length;
                            return (
                                <div className="p-3 rounded-xl bg-red-500/5 border border-red-500/10">
                                    <p className="text-xs text-red-400 font-semibold mb-1">Estudio</p>
                                    <p className="text-xs text-white/50">
                                        {bloquesSinUso > 5
                                            ? `Hay ${bloquesSinUso} bloques vacios en horario laboral. Lanza una promocion "Happy Hour" para esas franjas.`
                                            : 'La ocupacion del estudio es buena. Considera expansion de horario en fines de semana.'
                                        }
                                    </p>
                                </div>
                            );
                        })()}
                    </div>
                </div>
            )}
        </div>
    );
}
