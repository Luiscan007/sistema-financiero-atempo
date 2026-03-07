'use client';
/**
 * app/dashboard/page.tsx
 * Dashboard principal con KPIs, gráficas y estadísticas del negocio
 */
import { useState, useEffect } from 'react';
import {
    TrendingUp,
    TrendingDown,
    ShoppingCart,
    DollarSign,
    Package,
    Users,
    Receipt,
    ArrowUpRight,
    ArrowDownRight,
    Wallet,
    BarChart3,
    RefreshCw,
} from 'lucide-react';
import {
    BarChart,
    Bar,
    LineChart,
    Line,
    AreaChart,
    Area,
    PieChart,
    Pie,
    Cell,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    Legend,
    ResponsiveContainer,
} from 'recharts';
import { formatBs, formatUSD, calcularCambioPercent } from '@/lib/utils';
import { useTasas } from '@/components/providers/TasasProvider';
import { obtenerHistorialTasas } from '@/lib/tasas';
// Skeleton para cards de carga
function SkeletonKPI() {
    return (
        <div className="kpi-card">
            <div className="skeleton h-4 w-24 mb-3 rounded" />
            <div className="skeleton h-8 w-32 mb-2 rounded" />
            <div className="skeleton h-3 w-20 rounded" />
        </div>
    );
}
// Componente de KPI Card
function KPICard({
    titulo,
    valor,
    subtitulo,
    icono: Icono,
    cambio,
    tipo = 'neutral',
    clickable = false,
    onClick,
}: {
    titulo: string;
    valor: string;
    subtitulo?: string;
    icono: React.ElementType;
    cambio?: number;
    tipo?: 'positivo' | 'negativo' | 'neutral';
    clickable?: boolean;
    onClick?: () => void;
}) {
    const colorBg = {
        positivo: 'bg-green-500/10 border-green-500/20 text-green-400',
        negativo: 'bg-red-500/10 border-red-500/20 text-red-400',
        neutral: 'bg-blue-500/10 border-blue-500/20 text-blue-400',
    };
    return (
        <div
            className={`kpi-card ${clickable ? 'cursor-pointer' : ''}`}
            onClick={onClick}
        >
            <div className="flex items-start justify-between mb-4">
                <div className={`p-2 rounded-lg border ${colorBg[tipo]}`}>
                    <Icono className="w-5 h-5" />
                </div>
                {cambio !== undefined && (
                    <div
                    >
                        className={`flex items-center gap-1 text-xs font-medium ${cambio >= 0 ? 'text-green-400' : 'text-red-400'
                            }`}
                        {cambio >= 0 ? (
                            <ArrowUpRight className="w-3 h-3" />
                        ) : (
                            <ArrowDownRight className="w-3 h-3" />
                        )}
                        {Math.abs(cambio).toFixed(1)}% vs ayer
                    </div>
                )}
            </div>
            <p className="text-2xl font-bold font-mono mb-1">{valor}</p>
            <p className="text-xs text-muted-foreground">{titulo}</p>
            {subtitulo && <p className="text-xs text-muted-foreground mt-1">{subtitulo}</p>}
        </div>
    );
}
// Tooltip personalizado para gráficas
function TooltipPersonalizado({ active, payload, label }: any) {
    if (active && payload && payload.length) {
        return (
            <div className="glass-card p-3 text-sm">
                <p className="text-muted-foreground mb-2">{label}</p>
                {payload.map((entry: any, index: number) => (
                    <div key={index} className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full" style={{ background: entry.color }} />
                        <span className="text-foreground">
                            {entry.name}: {typeof entry.value === 'number' && entry.value > 100
                                ? formatBs(entry.value)
                                : entry.value}
                        </span>
                    </div>
                ))}
            </div>
        );
    }
    return null;
}
// Datos vacíos - se llenan desde Firestore
function generarDatosVentasDiarias() {
    const datos = [];
    const hoy = new Date();
    for (let i = 29; i >= 0; i--) {
        const fecha = new Date(hoy);
        fecha.setDate(hoy.getDate() - i);
        datos.push({
            dia: fecha.toLocaleDateString('es-VE', { day: '2-digit', month: '2-digit' }),
            ventas: 0,
            transacciones: 0,
        });
    }
    return datos;
}
const datosMetodoPago = [
    { name: 'Punto de Venta', value: 0, color: '#3b82f6' },
    { name: 'Pago Móvil', value: 0, color: '#22c55e' },
    { name: 'Efectivo Bs', value: 0, color: '#f59e0b' },
    { name: 'Efectivo USD', value: 0, color: '#8b5cf6' },
    { name: 'Transferencia', value: 0, color: '#ec4899' },
];
const datosIngresosGastos: any[] = [];
const datosProductosMasVendidos: any[] = [];
const datosVentasPorHora = [
    { hora: '7am', ventas: 0 }, { hora: '8am', ventas: 0 },
    { hora: '9am', ventas: 0 }, { hora: '10am', ventas: 0 },
    { hora: '11am', ventas: 0 }, { hora: '12pm', ventas: 0 },
    { hora: '1pm', ventas: 0 }, { hora: '2pm', ventas: 0 },
    { hora: '3pm', ventas: 0 }, { hora: '4pm', ventas: 0 },
    { hora: '5pm', ventas: 0 }, { hora: '6pm', ventas: 0 },
    { hora: '7pm', ventas: 0 }, { hora: '8pm', ventas: 0 },
];
export default function DashboardPage() {
    const { tasas } = useTasas();
    const [cargando, setCargando] = useState(true);
    const [ventasDiarias] = useState(generarDatosVentasDiarias);
    const [historialTasas, setHistorialTasas] = useState<any[]>([]);
    useEffect(() => {
        // Simular carga de datos
        const timer = setTimeout(() => setCargando(false), 1200);
        // Cargar historial de tasas para gráfica
        obtenerHistorialTasas(30).then(setHistorialTasas);
        return () => clearTimeout(timer);
    }, []);
    // KPIs del día - se cargan desde Firestore
    const kpis = {
        ventasHoy: 0,
        ventasHoyUSD: 0,
        ventasMes: 0,
        transaccionesHoy: 0,
        ticketPromedio: 0,
        gastosMes: 0,
        utilidadMes: 0,
        stockBajo: 0,
    };
    return (
        <div className="space-y-6 animate-fade-in">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold">Dashboard</h1>
                    <p className="text-muted-foreground text-sm mt-0.5">
                        {new Date().toLocaleDateString('es-VE', {
                            weekday: 'long',
                            day: 'numeric',
                            month: 'long',
                            year: 'numeric',
                        })}
                    </p>
                </div>
                <button className="btn-secondary text-sm">
                    <RefreshCw className="w-4 h-4" />
                    Actualizar
                </button>
            </div>
            {/* ============================
          KPI CARDS
          ============================ */}
            <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
                {cargando ? (
                    Array(8).fill(0).map((_, i) => <SkeletonKPI key={i} />)
                ) : (
                    <>
                        <KPICard
                            titulo="Ventas del Día"
                            valor={formatBs(kpis.ventasHoy)}
                            subtitulo={formatUSD(kpis.ventasHoyUSD)}
                            icono={ShoppingCart}
                            cambio={12.5}
                            tipo="positivo"
                        />
                        <KPICard
                            titulo="Ventas del Mes"
                            valor={formatBs(kpis.ventasMes)}
                            subtitulo={formatUSD(kpis.ventasMes / tasas.bcv)}
                            icono={TrendingUp}
                            cambio={8.2}
                            tipo="positivo"
                        />
                        <KPICard
                            titulo="Transacciones Hoy"
                            valor={kpis.transaccionesHoy.toString()}
                            subtitulo="ventas realizadas"
                            icono={Receipt}
                            cambio={-3.1}
                            tipo="neutral"
                        />
                        <KPICard
                            titulo="Ticket Promedio"
                            valor={formatBs(kpis.ticketPromedio)}
                            subtitulo={formatUSD(kpis.ticketPromedio / tasas.bcv)}
                            icono={DollarSign}
                            cambio={5.7}
                            tipo="neutral"
                        />
                        <KPICard
                            titulo="Gastos del Mes"
                            valor={formatBs(kpis.gastosMes)}
                            subtitulo={formatUSD(kpis.gastosMes / tasas.bcv)}
                            icono={Wallet}
                            cambio={2.1}
                            tipo="negativo"
                        />
                        <KPICard
                            titulo="Utilidad del Mes"
                            valor={formatBs(kpis.utilidadMes)}
                            subtitulo={formatUSD(kpis.utilidadMes / tasas.bcv)}
                            icono={kpis.utilidadMes >= 0 ? TrendingUp : TrendingDown}
                            tipo={kpis.utilidadMes >= 0 ? 'positivo' : 'negativo'}
                        />
                        <KPICard
                            titulo="Clientes Activos"
                            valor="184"
                            subtitulo="total registrados"
                            icono={Users}
                            tipo="neutral"
                        />
                        <KPICard
                            titulo="Stock Bajo"
                            valor={kpis.stockBajo.toString()}
                            subtitulo="productos bajo mínimo"
                            icono={Package}
                            tipo="negativo"
                            clickable
                            onClick={() => window.location.href = '/inventario'}
                        />
                    </>
                )}
            </div>
            {/* ============================
          GRÁFICAS - FILA 1
          ============================ */}
            <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
                {/* Ventas por día - últimos 30 días */}
                <div className="xl:col-span-2 card-sistema">
                    <div className="flex items-center justify-between mb-4">
                        <div>
                            <h3 className="font-semibold">Ventas Diarias</h3>
                            <p className="text-xs text-muted-foreground">Últimos 30 días</p>
                        </div>
                        <BarChart3 className="w-4 h-4 text-muted-foreground" />
                    </div>
                    {cargando ? (
                        <div className="skeleton h-64 w-full rounded-lg" />
                    ) : (
                        <ResponsiveContainer width="100%" height={260}>
                            <BarChart data={ventasDiarias} margin={{ top: 5, right: 5, left: 5, bottom: 5 }}>
                                <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.1)" />
                                <XAxis
                                    dataKey="dia"
                                    tick={{ fontSize: 10, fill: '#64748b' }}
                                    tickLine={false}
                                    axisLine={false}
                                    interval={4}
                                />
                                <YAxis
                                    tick={{ fontSize: 10, fill: '#64748b' }}
                                    tickLine={false}
                                    axisLine={false}
                                    tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`}
                                />
                                <Tooltip content={<TooltipPersonalizado />} />
                                <Bar dataKey="ventas" name="Ventas (Bs)" fill="#3b82f6" radius={[4, 4, 0, 0]} opacity={0.85} />
                                <Line
                                    type="monotone"
                                    dataKey="ventas"
                                    stroke="#22c55e"
                                    strokeWidth={2}
                                    dot={false}
                                />
                            </BarChart>
                        </ResponsiveContainer>
                    )}
                </div>
                {/* Métodos de pago */}
                <div className="card-sistema">
                    <div className="flex items-center justify-between mb-4">
                        <div>
                            <h3 className="font-semibold">Métodos de Pago</h3>
                            <p className="text-xs text-muted-foreground">Distribución del mes</p>
                        </div>
                    </div>
                    {cargando ? (
                        <div className="skeleton h-64 w-full rounded-lg" />
                    ) : (
                        <>
                            <ResponsiveContainer width="100%" height={180}>
                                <PieChart>
                                    <Pie
                                        data={datosMetodoPago}
                                        cx="50%"
                                        cy="50%"
                                        innerRadius={50}
                                        outerRadius={75}
                                        paddingAngle={3}
                                        dataKey="value"
                                    >
                                        {datosMetodoPago.map((entry, index) => (
                                            <Cell key={index} fill={entry.color} />
                                        ))}
                                    </Pie>
                                    <Tooltip
                                        formatter={(value) => [`${value}%`, '']}
                                        contentStyle={{
                                            background: '#1e293b',
                                            border: '1px solid #334155',
                                            borderRadius: '8px',
                                            fontSize: '12px',
                                        }}
                                    />
                                </PieChart>
                            </ResponsiveContainer>
                            <div className="space-y-2">
                                {datosMetodoPago.map((item) => (
                                    <div key={item.name} className="flex items-center justify-between text-xs">
                                        <div className="flex items-center gap-2">
                                            <div
                                                className="w-2.5 h-2.5 rounded-full"
                                                style={{ background: item.color }}
                                            />
                                            <span className="text-muted-foreground">{item.name}</span>
                                        </div>
                                        <span className="font-medium">{item.value}%</span>
                                    </div>
                                ))}
                            </div>
                        </>
                    )}
                </div>
            </div>
            {/* ============================
          GRÁFICAS - FILA 2
          ============================ */}
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                {/* Ingresos vs Gastos - 6 meses */}
                <div className="card-sistema">
                    <div className="flex items-center justify-between mb-4">
                        <div>
                            <h3 className="font-semibold">Ingresos vs Gastos</h3>
                            <p className="text-xs text-muted-foreground">Últimos 6 meses</p>
                        </div>
                    </div>
                    {cargando ? (
                        <div className="skeleton h-56 w-full rounded-lg" />
                    ) : (
                        <ResponsiveContainer width="100%" height={220}>
                            <AreaChart data={datosIngresosGastos}>
                                <defs>
                                    <linearGradient id="colorIngresos" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#22c55e" stopOpacity={0.3} />
                                        <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
                                    </linearGradient>
                                    <linearGradient id="colorGastos" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3} />
                                        <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.1)" />
                                <XAxis dataKey="mes" tick={{ fontSize: 11, fill: '#64748b' }} tickLine={false} axisLine={false} />
                                <YAxis
                                    tick={{ fontSize: 10, fill: '#64748b' }}
                                    tickLine={false}
                                    axisLine={false}
                                    tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`}
                                />
                                <Tooltip content={<TooltipPersonalizado />} />
                                <Legend wrapperStyle={{ fontSize: '12px' }} />
                                <Area type="monotone" dataKey="ingresos" name="Ingresos" stroke="#22c55e" fill="url(#colorIngresos)" strokeWidth={2} />
                                <Area type="monotone" dataKey="gastos" name="Gastos" stroke="#ef4444" fill="url(#colorGastos)" strokeWidth={2} />
                            </AreaChart>
                        </ResponsiveContainer>
                    )}
                </div>
                {/* Tasa de cambio histórica */}
                <div className="card-sistema">
                    <div className="flex items-center justify-between mb-4">
                        <div>
                            <h3 className="font-semibold">Evolución Tasa Bs/USD</h3>
                            <p className="text-xs text-muted-foreground">Últimos 30 días</p>
                        </div>
                    </div>
                    {cargando || historialTasas.length === 0 ? (
                        <div className="skeleton h-56 w-full rounded-lg" />
                    ) : (
                        <ResponsiveContainer width="100%" height={220}>
                            <LineChart data={historialTasas.slice(-15)}>
                                <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.1)" />
                                <XAxis
                                    dataKey="fecha"
                                    tick={{ fontSize: 10, fill: '#64748b' }}
                                    tickLine={false}
                                    axisLine={false}
                                    tickFormatter={(v) => v.slice(5)} // MM-DD
                                />
                                <YAxis
                                    tick={{ fontSize: 10, fill: '#64748b' }}
                                    tickLine={false}
                                    axisLine={false}
                                    domain={['auto', 'auto']}
                                />
                                    tickFormatter={(v) => `${v.toFixed(1)}`}
                                <Tooltip content={<TooltipPersonalizado />} />
                                <Legend wrapperStyle={{ fontSize: '12px' }} />
                                <Line type="monotone" dataKey="bcv" name="BCV" stroke="#3b82f6" strokeWidth={2} dot={false} />
                                <Line type="monotone" dataKey="paralelo" name="Paralelo" stroke="#f59e0b" strokeWidth={2} dot={false} strokeDasharray="5 5" />
                            </LineChart>
                        </ResponsiveContainer>
                    )}
                </div>
            </div>
            {/* ============================
          GRÁFICAS - FILA 3
          ============================ */}
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                {/* Top 8 productos más vendidos */}
                <div className="card-sistema">
                    <div className="flex items-center justify-between mb-4">
                        <div>
                            <h3 className="font-semibold">Productos Más Vendidos</h3>
                            <p className="text-xs text-muted-foreground">Top 8 del mes</p>
                        </div>
                    </div>
                    {cargando ? (
                        <div className="skeleton h-64 w-full rounded-lg" />
                    ) : (
                        <ResponsiveContainer width="100%" height={260}>
                            <BarChart
                                layout="vertical"
                                data={datosProductosMasVendidos}
                                margin={{ top: 5, right: 60, left: 10, bottom: 5 }}
                            >
                                <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.1)" horizontal={false} />
                                <XAxis type="number" tick={{ fontSize: 10, fill: '#64748b' }} tickLine={false} axisLine={false} />
                                <YAxis
                                    type="category"
                                    dataKey="producto"
                                    tick={{ fontSize: 11, fill: '#94a3b8' }}
                                    tickLine={false}
                                    axisLine={false}
                                    width={80}
                                />
                                <Tooltip content={<TooltipPersonalizado />} />
                                <Bar dataKey="unidades" name="Unidades" fill="#3b82f6" radius={[0, 4, 4, 0]} opacity={0.85} />
                            </BarChart>
                        </ResponsiveContainer>
                    )}
                </div>
                {/* Ventas por hora */}
                <div className="card-sistema">
                    <div className="flex items-center justify-between mb-4">
                        <div>
                            <h3 className="font-semibold">Actividad por Hora</h3>
                            <p className="text-xs text-muted-foreground">Horas más activas del día</p>
                        </div>
                    </div>
                    {cargando ? (
                        <div className="skeleton h-64 w-full rounded-lg" />
                    ) : (
                        <ResponsiveContainer width="100%" height={260}>
                            <BarChart data={datosVentasPorHora}>
                                <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.1)" />
                                <XAxis dataKey="hora" tick={{ fontSize: 10, fill: '#64748b' }} tickLine={false} axisLine={false} />
                                <YAxis tick={{ fontSize: 10, fill: '#64748b' }} tickLine={false} axisLine={false} />
                                <Tooltip
                                    contentStyle={{
                                        background: '#1e293b',
                                        border: '1px solid #334155',
                                        borderRadius: '8px',
                                        fontSize: '12px',
                                    }}
                                />
                                <Bar
                                    dataKey="ventas"
                                    name="Transacciones"
                                    radius={[4, 4, 0, 0]}
                                    fill="#8b5cf6"
                                >
                                    {datosVentasPorHora.map((entry, index) => (
                                        <Cell
                                            key={index}
                                            fill={entry.ventas > 30 ? '#3b82f6' : entry.ventas > 20 ? '#8b5cf6' : '#4b5563'}
                                        />
                                    ))}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    )}
                </div>
            </div>
        </div>
    );
}