'use client';

/**
 * app/dashboard/page.tsx
 * Dashboard principal - datos reales desde Firestore
 */

import { useState, useEffect, useMemo } from 'react';
import {
    TrendingUp, TrendingDown, ShoppingCart, DollarSign,
    Package, Users, Receipt, ArrowUpRight, ArrowDownRight,
    Wallet, BarChart3, RefreshCw, Activity,
} from 'lucide-react';
import {
    BarChart, Bar, LineChart, Line, AreaChart, Area,
    PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid,
    Tooltip, Legend, ResponsiveContainer,
} from 'recharts';
import { formatBs, formatUSD } from '@/lib/utils';
import { useTasas } from '@/components/providers/TasasProvider';
import { obtenerHistorialTasas } from '@/lib/tasas';
import { useVentas } from '@/lib/useVentas';
import { useServicios } from '@/lib/useServicios';

/* ─────────────────────────────────────────
   HELPERS
───────────────────────────────────────── */
function hoy()  { return new Date().toDateString(); }
function mes()  { const d = new Date(); return `${d.getFullYear()}-${d.getMonth()}`; }
function ayer() { const d = new Date(); d.setDate(d.getDate() - 1); return d.toDateString(); }

function inicioMes() {
    const d = new Date(); d.setDate(1); d.setHours(0,0,0,0); return d;
}
function inicioAyer() {
    const d = new Date(); d.setDate(d.getDate() - 1); d.setHours(0,0,0,0); return d;
}
function finAyer() {
    const d = new Date(); d.setHours(0,0,0,0); return d;
}

/* ─────────────────────────────────────────
   SUBCOMPONENTES
───────────────────────────────────────── */
function SkeletonKPI() {
    return (
        <div className="kpi-card">
            <div className="skeleton h-4 w-24 mb-3 rounded" />
            <div className="skeleton h-8 w-32 mb-2 rounded" />
            <div className="skeleton h-3 w-20 rounded" />
        </div>
    );
}

function KPICard({
    titulo, valor, subtitulo, icono: Icono,
    cambio, tipo = 'neutral', onClick,
}: {
    titulo: string; valor: string; subtitulo?: string;
    icono: React.ElementType; cambio?: number | null;
    tipo?: 'positivo' | 'negativo' | 'neutral';
    onClick?: () => void;
}) {
    const colorIcon = {
        positivo: 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400',
        negativo: 'bg-red-500/10 border-red-500/20 text-red-400',
        neutral:  'bg-blue-500/10 border-blue-500/20 text-blue-400',
    };
    return (
        <div className={`kpi-card ${onClick ? 'cursor-pointer' : ''}`} onClick={onClick}>
            <div className="flex items-start justify-between mb-4">
                <div className={`p-2 rounded-xl border ${colorIcon[tipo]}`}>
                    <Icono className="w-5 h-5" />
                </div>
                {cambio != null && (
                    <div className={`flex items-center gap-1 text-xs font-medium ${cambio >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                        {cambio >= 0 ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                        {Math.abs(cambio).toFixed(1)}% vs ayer
                    </div>
                )}
            </div>
            <p className="text-2xl font-bold font-mono mb-1">{valor}</p>
            <p className="text-xs text-muted-foreground font-medium">{titulo}</p>
            {subtitulo && <p className="text-xs text-muted-foreground/60 mt-0.5">{subtitulo}</p>}
        </div>
    );
}

function TooltipPersonalizado({ active, payload, label }: any) {
    if (!active || !payload?.length) return null;
    return (
        <div className="glass-card p-3 text-sm min-w-32">
            <p className="text-muted-foreground text-xs mb-2 font-medium">{label}</p>
            {payload.map((entry: any, i: number) => (
                <div key={i} className="flex items-center gap-2 text-xs">
                    <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: entry.color }} />
                    <span className="text-foreground">
                        {entry.name}: {typeof entry.value === 'number' && entry.value > 500
                            ? formatBs(entry.value) : entry.value}
                    </span>
                </div>
            ))}
        </div>
    );
}

const COLORES_METODO: Record<string, string> = {
    punto_venta:  '#3b82f6',
    pago_movil:   '#22c55e',
    efectivo_bs:  '#f59e0b',
    efectivo_usd: '#8b5cf6',
    efectivo_eur: '#a78bfa',
    transferencia:'#06b6d4',
    mixto:        '#ec4899',
};
const LABEL_METODO: Record<string, string> = {
    punto_venta:  'Punto de Venta',
    pago_movil:   'Pago Movil',
    efectivo_bs:  'Efectivo Bs',
    efectivo_usd: 'Efectivo USD',
    efectivo_eur: 'Efectivo EUR',
    transferencia:'Transferencia',
    mixto:        'Mixto',
};

/* ─────────────────────────────────────────
   DASHBOARD PRINCIPAL
───────────────────────────────────────── */
export default function DashboardPage() {
    const { tasas } = useTasas();
    const { ventas, cargando: cargandoVentas } = useVentas();
    const { servicios, cargando: cargandoServicios } = useServicios();
    const [historialTasas, setHistorialTasas] = useState<any[]>([]);
    const [refreshKey, setRefreshKey] = useState(0);

    const cargando = cargandoVentas || cargandoServicios;

    useEffect(() => {
        obtenerHistorialTasas(30).then(setHistorialTasas);
    }, [refreshKey]);

    /* ── Calculos de KPIs desde ventas reales ── */
    const kpis = useMemo(() => {
        const hoyStr  = hoy();
        const ayerStr = ayer();
        const imMes   = inicioMes();

        const ventasHoyArr  = ventas.filter(v => {
            const ts = v.fechaTimestamp?.toDate?.();
            return ts && ts.toDateString() === hoyStr;
        });
        const ventasAyerArr = ventas.filter(v => {
            const ts = v.fechaTimestamp?.toDate?.();
            return ts && ts.toDateString() === ayerStr;
        });
        const ventasMesArr  = ventas.filter(v => {
            const ts = v.fechaTimestamp?.toDate?.();
            return ts && ts >= imMes;
        });

        const totalHoy  = ventasHoyArr.reduce((a, v)  => a + (v.total || 0), 0);
        const totalAyer = ventasAyerArr.reduce((a, v) => a + (v.total || 0), 0);
        const totalMes  = ventasMesArr.reduce((a, v)  => a + (v.total || 0), 0);

        const cambioHoy = totalAyer > 0
            ? ((totalHoy - totalAyer) / totalAyer) * 100
            : null;

        const ticketProm = ventasHoyArr.length > 0
            ? totalHoy / ventasHoyArr.length : 0;

        // Servicios activos
        const serviciosActivos = servicios.filter(s => s.activo !== false).length;

        // Metodos de pago del mes
        const metodoCount: Record<string, number> = {};
        ventasMesArr.forEach(v => {
            const tipos = v.metodoPago || [];
            const tipo = tipos.length === 1 ? tipos[0].tipo : 'mixto';
            metodoCount[tipo] = (metodoCount[tipo] || 0) + 1;
        });
        const totalMetodos = Object.values(metodoCount).reduce((a, b) => a + b, 0);
        const datosPie = Object.entries(metodoCount).map(([tipo, count]) => ({
            name:  LABEL_METODO[tipo] || tipo,
            value: totalMetodos > 0 ? Math.round((count / totalMetodos) * 100) : 0,
            color: COLORES_METODO[tipo] || '#64748b',
        })).sort((a, b) => b.value - a.value);

        // Ventas por dia ultimos 30 dias
        const ventasPorDia: Record<string, { ventas: number; transacciones: number }> = {};
        const ultimos30 = new Date(); ultimos30.setDate(ultimos30.getDate() - 29);
        for (let i = 0; i < 30; i++) {
            const d = new Date(ultimos30);
            d.setDate(ultimos30.getDate() + i);
            const key = d.toLocaleDateString('es-VE', { day: '2-digit', month: '2-digit' });
            ventasPorDia[key] = { ventas: 0, transacciones: 0 };
        }
        ventas.forEach(v => {
            const ts = v.fechaTimestamp?.toDate?.();
            if (!ts || ts < ultimos30) return;
            const key = ts.toLocaleDateString('es-VE', { day: '2-digit', month: '2-digit' });
            if (ventasPorDia[key]) {
                ventasPorDia[key].ventas += v.total || 0;
                ventasPorDia[key].transacciones += 1;
            }
        });
        const datosVentasDiarias = Object.entries(ventasPorDia).map(([dia, data]) => ({
            dia, ...data,
        }));

        // Servicios mas vendidos del mes
        const servicioConteo: Record<string, { nombre: string; unidades: number; ingresos: number }> = {};
        ventasMesArr.forEach(v => {
            (v.items || []).forEach((item: any) => {
                const key = item.nombre || 'Desconocido';
                if (!servicioConteo[key]) servicioConteo[key] = { nombre: key, unidades: 0, ingresos: 0 };
                servicioConteo[key].unidades += item.cantidad || 1;
                servicioConteo[key].ingresos += item.subtotal || 0;
            });
        });
        const topServicios = Object.values(servicioConteo)
            .sort((a, b) => b.ingresos - a.ingresos)
            .slice(0, 8);

        // Actividad por hora hoy
        const porHora: Record<number, number> = {};
        for (let h = 7; h <= 20; h++) porHora[h] = 0;
        ventasHoyArr.forEach(v => {
            const ts = v.fechaTimestamp?.toDate?.();
            if (!ts) return;
            const h = ts.getHours();
            if (h >= 7 && h <= 20) porHora[h] = (porHora[h] || 0) + 1;
        });
        const datosHoras = Object.entries(porHora).map(([h, count]) => ({
            hora: `${h}:00`,
            ventas: count,
        }));

        return {
            totalHoy, totalMes, totalAyer,
            transaccionesHoy: ventasHoyArr.length,
            ticketProm,
            cambioHoy,
            serviciosActivos,
            datosPie: datosPie.length > 0 ? datosPie : [{ name: 'Sin datos', value: 100, color: '#334155' }],
            datosVentasDiarias,
            topServicios,
            datosHoras,
        };
    }, [ventas, servicios]);

    const horaMaxima = kpis.datosHoras.reduce((max, h) => h.ventas > max.ventas ? h : max, { hora: '-', ventas: 0 });

    return (
        <div className="space-y-6 animate-fade-in">

            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold">Dashboard</h1>
                    <p className="text-muted-foreground text-sm mt-0.5">
                        {new Date().toLocaleDateString('es-VE', {
                            weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
                        })}
                    </p>
                </div>
                <button className="btn-secondary text-sm" onClick={() => setRefreshKey(k => k + 1)}>
                    <RefreshCw className="w-4 h-4" /> Actualizar
                </button>
            </div>

            {/* KPIs */}
            <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
                {cargando ? (
                    Array(8).fill(0).map((_, i) => <SkeletonKPI key={i} />)
                ) : (
                    <>
                        <KPICard
                            titulo="Ventas del Dia"
                            valor={formatBs(kpis.totalHoy)}
                            subtitulo={formatUSD(kpis.totalHoy / (tasas.bcv || 1))}
                            icono={ShoppingCart}
                            cambio={kpis.cambioHoy}
                            tipo="positivo"
                        />
                        <KPICard
                            titulo="Ventas del Mes"
                            valor={formatBs(kpis.totalMes)}
                            subtitulo={formatUSD(kpis.totalMes / (tasas.bcv || 1))}
                            icono={TrendingUp}
                            tipo="positivo"
                        />
                        <KPICard
                            titulo="Transacciones Hoy"
                            valor={kpis.transaccionesHoy.toString()}
                            subtitulo="ventas realizadas"
                            icono={Receipt}
                            tipo="neutral"
                        />
                        <KPICard
                            titulo="Ticket Promedio"
                            valor={formatBs(kpis.ticketProm)}
                            subtitulo={formatUSD(kpis.ticketProm / (tasas.bcv || 1))}
                            icono={DollarSign}
                            tipo="neutral"
                        />
                        <KPICard
                            titulo="Total Ventas Registradas"
                            valor={ventas.length.toString()}
                            subtitulo="en historial completo"
                            icono={Activity}
                            tipo="neutral"
                        />
                        <KPICard
                            titulo="Servicios Activos"
                            valor={kpis.serviciosActivos.toString()}
                            subtitulo={`de ${servicios.length} en catalogo`}
                            icono={Package}
                            tipo="neutral"
                            onClick={() => window.location.href = '/inventario'}
                        />
                        <KPICard
                            titulo="Hora Pico Hoy"
                            valor={horaMaxima.hora}
                            subtitulo={`${horaMaxima.ventas} transacciones`}
                            icono={BarChart3}
                            tipo="neutral"
                        />
                        <KPICard
                            titulo="Ayer Total"
                            valor={formatBs(kpis.totalAyer)}
                            subtitulo={formatUSD(kpis.totalAyer / (tasas.bcv || 1))}
                            icono={kpis.totalHoy >= kpis.totalAyer ? TrendingUp : TrendingDown}
                            tipo={kpis.totalHoy >= kpis.totalAyer ? 'positivo' : 'negativo'}
                        />
                    </>
                )}
            </div>

            {/* Grafica ventas diarias + metodos de pago */}
            <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
                <div className="xl:col-span-2 card-sistema">
                    <div className="flex items-center justify-between mb-4">
                        <div>
                            <h3 className="font-semibold">Ventas Diarias</h3>
                            <p className="text-xs text-muted-foreground">Ultimos 30 dias</p>
                        </div>
                        <BarChart3 className="w-4 h-4 text-muted-foreground" />
                    </div>
                    {cargando ? (
                        <div className="skeleton h-64 w-full rounded-xl" />
                    ) : kpis.datosVentasDiarias.every(d => d.ventas === 0) ? (
                        <div className="h-64 flex items-center justify-center text-muted-foreground text-sm">
                            Sin ventas en los ultimos 30 dias
                        </div>
                    ) : (
                        <ResponsiveContainer width="100%" height={260}>
                            <BarChart data={kpis.datosVentasDiarias} margin={{ top: 5, right: 5, left: 5, bottom: 5 }}>
                                <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.08)" />
                                <XAxis dataKey="dia" tick={{ fontSize: 10, fill: '#64748b' }} tickLine={false} axisLine={false} interval={4} />
                                <YAxis tick={{ fontSize: 10, fill: '#64748b' }} tickLine={false} axisLine={false}
                                    tickFormatter={v => v >= 1000 ? `${(v/1000).toFixed(0)}k` : v.toString()} />
                                <Tooltip content={<TooltipPersonalizado />} />
                                <Bar dataKey="ventas" name="Ventas (Bs)" fill="#3b82f6" radius={[4,4,0,0]} opacity={0.9} />
                            </BarChart>
                        </ResponsiveContainer>
                    )}
                </div>

                {/* Metodos de pago */}
                <div className="card-sistema">
                    <div className="mb-4">
                        <h3 className="font-semibold">Metodos de Pago</h3>
                        <p className="text-xs text-muted-foreground">Distribucion del mes</p>
                    </div>
                    {cargando ? (
                        <div className="skeleton h-64 w-full rounded-xl" />
                    ) : (
                        <>
                            <ResponsiveContainer width="100%" height={180}>
                                <PieChart>
                                    <Pie data={kpis.datosPie} cx="50%" cy="50%"
                                        innerRadius={48} outerRadius={72} paddingAngle={3} dataKey="value">
                                        {kpis.datosPie.map((entry, i) => (
                                            <Cell key={i} fill={entry.color} />
                                        ))}
                                    </Pie>
                                    <Tooltip formatter={(v: any) => [`${v}%`, '']}
                                        contentStyle={{ background: 'hsl(220 18% 12%)', border: '1px solid hsl(220 15% 20%)', borderRadius: '12px', fontSize: '12px' }} />
                                </PieChart>
                            </ResponsiveContainer>
                            <div className="space-y-1.5 mt-2">
                                {kpis.datosPie.map(item => (
                                    <div key={item.name} className="flex items-center justify-between text-xs">
                                        <div className="flex items-center gap-2">
                                            <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: item.color }} />
                                            <span className="text-muted-foreground truncate max-w-28">{item.name}</span>
                                        </div>
                                        <span className="font-semibold font-mono">{item.value}%</span>
                                    </div>
                                ))}
                            </div>
                        </>
                    )}
                </div>
            </div>

            {/* Top servicios + actividad por hora */}
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                <div className="card-sistema">
                    <div className="mb-4">
                        <h3 className="font-semibold">Servicios Mas Vendidos</h3>
                        <p className="text-xs text-muted-foreground">Top del mes actual</p>
                    </div>
                    {cargando ? (
                        <div className="skeleton h-64 w-full rounded-xl" />
                    ) : kpis.topServicios.length === 0 ? (
                        <div className="h-64 flex flex-col items-center justify-center text-muted-foreground text-sm gap-2">
                            <Package className="w-8 h-8 opacity-20" />
                            <p>Sin ventas este mes</p>
                        </div>
                    ) : (
                        <ResponsiveContainer width="100%" height={260}>
                            <BarChart layout="vertical" data={kpis.topServicios}
                                margin={{ top: 5, right: 55, left: 5, bottom: 5 }}>
                                <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.08)" horizontal={false} />
                                <XAxis type="number" tick={{ fontSize: 10, fill: '#64748b' }} tickLine={false} axisLine={false}
                                    tickFormatter={v => v >= 1000 ? `${(v/1000).toFixed(0)}k` : v.toString()} />
                                <YAxis type="category" dataKey="nombre" tick={{ fontSize: 10, fill: '#94a3b8' }}
                                    tickLine={false} axisLine={false} width={90} />
                                <Tooltip content={<TooltipPersonalizado />} />
                                <Bar dataKey="ingresos" name="Ingresos (Bs)" fill="#3b82f6" radius={[0,4,4,0]} opacity={0.9} />
                            </BarChart>
                        </ResponsiveContainer>
                    )}
                </div>

                <div className="card-sistema">
                    <div className="mb-4">
                        <h3 className="font-semibold">Actividad por Hora</h3>
                        <p className="text-xs text-muted-foreground">Transacciones de hoy por hora</p>
                    </div>
                    {cargando ? (
                        <div className="skeleton h-64 w-full rounded-xl" />
                    ) : kpis.datosHoras.every(h => h.ventas === 0) ? (
                        <div className="h-64 flex flex-col items-center justify-center text-muted-foreground text-sm gap-2">
                            <Activity className="w-8 h-8 opacity-20" />
                            <p>Sin actividad hoy todavia</p>
                        </div>
                    ) : (
                        <ResponsiveContainer width="100%" height={260}>
                            <BarChart data={kpis.datosHoras}>
                                <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.08)" />
                                <XAxis dataKey="hora" tick={{ fontSize: 10, fill: '#64748b' }} tickLine={false} axisLine={false} />
                                <YAxis tick={{ fontSize: 10, fill: '#64748b' }} tickLine={false} axisLine={false} allowDecimals={false} />
                                <Tooltip content={<TooltipPersonalizado />} />
                                <Bar dataKey="ventas" name="Transacciones" radius={[4,4,0,0]}>
                                    {kpis.datosHoras.map((entry, i) => (
                                        <Cell key={i}
                                            fill={entry.ventas === horaMaxima.ventas && entry.ventas > 0
                                                ? '#3b82f6'
                                                : entry.ventas > 0 ? '#6366f1' : '#1e293b'} />
                                    ))}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    )}
                </div>
            </div>

            {/* Evolucion tasa BCV */}
            {historialTasas.length > 0 && (
                <div className="card-sistema">
                    <div className="mb-4">
                        <h3 className="font-semibold">Evolucion Tasa Bs/USD</h3>
                        <p className="text-xs text-muted-foreground">Ultimos 30 dias</p>
                    </div>
                    <ResponsiveContainer width="100%" height={200}>
                        <LineChart data={historialTasas.slice(-30)}>
                            <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.08)" />
                            <XAxis dataKey="fecha" tick={{ fontSize: 10, fill: '#64748b' }} tickLine={false} axisLine={false}
                                tickFormatter={v => v?.slice(5) || v} interval={4} />
                            <YAxis tick={{ fontSize: 10, fill: '#64748b' }} tickLine={false} axisLine={false}
                                domain={['auto', 'auto']} tickFormatter={v => v.toFixed(0)} />
                            <Tooltip content={<TooltipPersonalizado />} />
                            <Legend wrapperStyle={{ fontSize: '12px' }} />
                            <Line type="monotone" dataKey="bcv" name="BCV" stroke="#3b82f6" strokeWidth={2} dot={false} />
                            <Line type="monotone" dataKey="paralelo" name="Paralelo" stroke="#f59e0b" strokeWidth={2} dot={false} strokeDasharray="5 5" />
                        </LineChart>
                    </ResponsiveContainer>
                </div>
            )}
        </div>
    );
}
