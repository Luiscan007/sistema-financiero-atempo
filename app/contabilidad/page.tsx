'use client';

/**
 * app/contabilidad/page.tsx
 * Módulo de P&G, cuentas por cobrar/pagar y reportes financieros
 */

import { useState } from 'react';
import {
    TrendingUp, TrendingDown, BookOpen, Download, AlertCircle,
    CheckCircle2, Clock, Users, Building, DollarSign, BarChart3,
} from 'lucide-react';
import {
    AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
    Legend, ResponsiveContainer, BarChart, Bar,
} from 'recharts';
import { useTasas } from '@/components/providers/TasasProvider';
import { formatBs, formatUSD, formatFecha } from '@/lib/utils';
import { cn } from '@/lib/utils';

const DATOS_PYG = [
    { mes: 'Oct', ingresos: 950000, gastos: 680000, utilidad: 270000 },
    { mes: 'Nov', ingresos: 1100000, gastos: 720000, utilidad: 380000 },
    { mes: 'Dic', ingresos: 1450000, gastos: 890000, utilidad: 560000 },
    { mes: 'Ene', ingresos: 980000, gastos: 650000, utilidad: 330000 },
    { mes: 'Feb', ingresos: 1120000, gastos: 710000, utilidad: 410000 },
    { mes: 'Mar', ingresos: 1280000, gastos: 780000, utilidad: 500000 },
];

interface Cuenta {
    id: string;
    tipo: 'cobrar' | 'pagar';
    contraparte: string;
    concepto: string;
    montoBs: number;
    montoUSD: number;
    fechaVencimiento: string;
    estado: 'pendiente' | 'parcial' | 'pagado';
    montoPagado: number;
}

const CUENTAS_DEMO: Cuenta[] = [
    { id: '1', tipo: 'cobrar', contraparte: 'Tienda El Sol', concepto: 'Mercancía fiada', montoBs: 45000, montoUSD: 1111, fechaVencimiento: '2024-03-15', estado: 'pendiente', montoPagado: 0 },
    { id: '2', tipo: 'cobrar', contraparte: 'Restaurante La Cúpula', concepto: 'Suministros mes anterior', montoBs: 28000, montoUSD: 691, fechaVencimiento: '2024-03-20', estado: 'parcial', montoPagado: 14000 },
    { id: '3', tipo: 'pagar', contraparte: 'Distribuidora Central', concepto: 'Mercancía a crédito', montoBs: 120000, montoUSD: 2962, fechaVencimiento: '2024-03-10', estado: 'pendiente', montoPagado: 0 },
    { id: '4', tipo: 'pagar', contraparte: 'Almacén Mayorista CA', concepto: 'Aceites y granos', montoBs: 85000, montoUSD: 2098, fechaVencimiento: '2024-03-25', estado: 'parcial', montoPagado: 42500 },
    { id: '5', tipo: 'cobrar', contraparte: 'Empresa XYZ', concepto: 'Servicios de abastecimiento', montoBs: 200000, montoUSD: 4938, fechaVencimiento: '2024-04-01', estado: 'pagado', montoPagado: 200000 },
];

const mesActual = DATOS_PYG[DATOS_PYG.length - 1];
const totalIngresosAnual = DATOS_PYG.reduce((acc, m) => acc + m.ingresos, 0);
const totalGastosAnual = DATOS_PYG.reduce((acc, m) => acc + m.gastos, 0);
const utilidadAnual = totalIngresosAnual - totalGastosAnual;

function BadgeEstado({ estado }: { estado: string }) {
    const config = {
        pendiente: 'badge-red',
        parcial: 'badge-yellow',
        pagado: 'badge-green',
    };
    return (
        <span className={cn('badge text-xs capitalize', config[estado as keyof typeof config] || 'badge-gray')}>
            {estado}
        </span>
    );
}

export default function ContabilidadPage() {
    const { tasas } = useTasas();
    const [tabActiva, setTabActiva] = useState<'pyg' | 'cobrar' | 'pagar'>('pyg');
    const [cuentas] = useState<Cuenta[]>(CUENTAS_DEMO);

    const cuentasCobrar = cuentas.filter((c) => c.tipo === 'cobrar' && c.estado !== 'pagado');
    const cuentasPagar = cuentas.filter((c) => c.tipo === 'pagar' && c.estado !== 'pagado');

    const totalCobrar = cuentasCobrar.reduce((acc, c) => acc + (c.montoBs - c.montoPagado), 0);
    const totalPagar = cuentasPagar.reduce((acc, c) => acc + (c.montoBs - c.montoPagado), 0);

    const exportarPDF = () => {
        // En producción: usar jsPDF + jspdf-autotable
        alert('Exportar PDF: implementar con jsPDF en producción');
    };

    const exportarExcel = () => {
        // En producción: usar xlsx
        alert('Exportar Excel: implementar con xlsx en producción');
    };

    return (
        <div className="space-y-6 animate-fade-in">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold">Contabilidad</h1>
                    <p className="text-muted-foreground text-sm">P&G, Cuentas por cobrar y pagar</p>
                </div>
                <div className="flex gap-2">
                    <button className="btn-secondary text-sm" onClick={exportarPDF}>
                        <Download className="w-4 h-4" /> PDF
                    </button>
                    <button className="btn-secondary text-sm" onClick={exportarExcel}>
                        <Download className="w-4 h-4" /> Excel
                    </button>
                </div>
            </div>

            {/* KPIs */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="kpi-card">
                    <TrendingUp className="w-4 h-4 text-green-400 mb-2" />
                    <p className="text-xl font-bold font-mono text-green-400">{formatBs(mesActual.ingresos)}</p>
                    <p className="text-xs text-muted-foreground">Ingresos mes actual</p>
                </div>
                <div className="kpi-card">
                    <TrendingDown className="w-4 h-4 text-red-400 mb-2" />
                    <p className="text-xl font-bold font-mono text-red-400">{formatBs(mesActual.gastos)}</p>
                    <p className="text-xs text-muted-foreground">Gastos mes actual</p>
                </div>
                <div className={cn('kpi-card', mesActual.utilidad >= 0 ? 'border-green-500/30' : 'border-red-500/30')}>
                    <BookOpen className={cn('w-4 h-4 mb-2', mesActual.utilidad >= 0 ? 'text-green-400' : 'text-red-400')} />
                    <p className={cn(
                        'text-xl font-bold font-mono',
                        mesActual.utilidad >= 0 ? 'text-green-400' : 'text-red-400'
                    )}>
                        {formatBs(mesActual.utilidad)}
                    </p>
                    <p className="text-xs text-muted-foreground">Utilidad mes ({formatUSD(mesActual.utilidad / tasas.bcv)})</p>
                </div>
                <div className="kpi-card">
                    <BarChart3 className="w-4 h-4 text-blue-400 mb-2" />
                    <p className="text-xl font-bold font-mono text-blue-400">
                        {((mesActual.utilidad / mesActual.ingresos) * 100).toFixed(1)}%
                    </p>
                    <p className="text-xs text-muted-foreground">Margen de utilidad</p>
                </div>
            </div>

            {/* Tabs */}
            <div className="flex items-center gap-1 bg-muted/30 border border-border p-1 rounded-xl w-fit">
                {[
                    { id: 'pyg', label: 'P&G Mensual', icon: BarChart3 },
                    { id: 'cobrar', label: `Por Cobrar (${cuentasCobrar.length})`, icon: TrendingUp },
                    { id: 'pagar', label: `Por Pagar (${cuentasPagar.length})`, icon: TrendingDown },
                ].map((tab) => (
                    <button
                        key={tab.id}
                        className={cn(
                            'flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all',
                            tabActiva === tab.id
                                ? 'bg-card text-foreground shadow-sm'
                                : 'text-muted-foreground hover:text-foreground'
                        )}
                        onClick={() => setTabActiva(tab.id as any)}
                    >
                        <tab.icon className="w-4 h-4" />
                        {tab.label}
                    </button>
                ))}
            </div>

            {/* P&G */}
            {tabActiva === 'pyg' && (
                <div className="space-y-6">
                    {/* Gráfica anual */}
                    <div className="card-sistema">
                        <h3 className="font-semibold mb-4">Pérdidas y Ganancias - Últimos 6 meses</h3>
                        <ResponsiveContainer width="100%" height={300}>
                            <BarChart data={DATOS_PYG}>
                                <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.1)" />
                                <XAxis dataKey="mes" tick={{ fontSize: 11, fill: '#64748b' }} tickLine={false} axisLine={false} />
                                <YAxis
                                    tick={{ fontSize: 10, fill: '#64748b' }}
                                    tickLine={false}
                                    axisLine={false}
                                    tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`}
                                />
                                <Tooltip
                                    contentStyle={{ background: '#1e293b', border: '1px solid #334155', borderRadius: '8px', fontSize: '12px' }}
                                    formatter={(v: any) => formatBs(v)}
                                />
                                <Legend wrapperStyle={{ fontSize: '12px' }} />
                                <Bar dataKey="ingresos" name="Ingresos" fill="#22c55e" radius={[4, 4, 0, 0]} opacity={0.85} />
                                <Bar dataKey="gastos" name="Gastos" fill="#ef4444" radius={[4, 4, 0, 0]} opacity={0.85} />
                                <Bar dataKey="utilidad" name="Utilidad" fill="#3b82f6" radius={[4, 4, 0, 0]} opacity={0.85} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>

                    {/* Tabla P&G */}
                    <div className="card-sistema overflow-hidden p-0">
                        <table className="tabla-sistema">
                            <thead>
                                <tr>
                                    <th>Mes</th>
                                    <th>Ingresos</th>
                                    <th>Gastos</th>
                                    <th>Utilidad</th>
                                    <th>Margen</th>
                                    <th>USD (BCV)</th>
                                </tr>
                            </thead>
                            <tbody>
                                {DATOS_PYG.map((fila) => (
                                    <tr key={fila.mes}>
                                        <td className="font-medium">{fila.mes}</td>
                                        <td className="font-mono text-green-400">{formatBs(fila.ingresos)}</td>
                                        <td className="font-mono text-red-400">{formatBs(fila.gastos)}</td>
                                        <td className={cn('font-mono font-semibold', fila.utilidad >= 0 ? 'text-blue-400' : 'text-red-400')}>
                                            {formatBs(fila.utilidad)}
                                        </td>
                                        <td className="text-sm">
                                            {((fila.utilidad / fila.ingresos) * 100).toFixed(1)}%
                                        </td>
                                        <td className="font-mono text-muted-foreground">
                                            {formatUSD(fila.utilidad / tasas.bcv)}
                                        </td>
                                    </tr>
                                ))}
                                {/* Totales */}
                                <tr className="bg-muted/20 font-bold">
                                    <td>TOTAL ANUAL</td>
                                    <td className="font-mono text-green-400">{formatBs(totalIngresosAnual)}</td>
                                    <td className="font-mono text-red-400">{formatBs(totalGastosAnual)}</td>
                                    <td className={cn('font-mono', utilidadAnual >= 0 ? 'text-blue-400' : 'text-red-400')}>
                                        {formatBs(utilidadAnual)}
                                    </td>
                                    <td>{((utilidadAnual / totalIngresosAnual) * 100).toFixed(1)}%</td>
                                    <td className="font-mono text-muted-foreground">{formatUSD(utilidadAnual / tasas.bcv)}</td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* Cuentas por cobrar y por pagar */}
            {(tabActiva === 'cobrar' || tabActiva === 'pagar') && (
                <div className="space-y-4">
                    {/* Resumen */}
                    <div className="grid grid-cols-2 gap-4">
                        <div className="kpi-card">
                            <p className="text-xs text-muted-foreground mb-1">
                                Total {tabActiva === 'cobrar' ? 'Por Cobrar' : 'Por Pagar'}
                            </p>
                            <p className={cn(
                                'text-2xl font-bold font-mono',
                                tabActiva === 'cobrar' ? 'text-green-400' : 'text-red-400'
                            )}>
                                {formatBs(tabActiva === 'cobrar' ? totalCobrar : totalPagar)}
                            </p>
                            <p className="text-xs text-muted-foreground">
                                {formatUSD((tabActiva === 'cobrar' ? totalCobrar : totalPagar) / tasas.bcv)}
                            </p>
                        </div>
                        <div className="kpi-card">
                            <p className="text-xs text-muted-foreground mb-1">Cuentas pendientes</p>
                            <p className="text-2xl font-bold font-mono">
                                {(tabActiva === 'cobrar' ? cuentasCobrar : cuentasPagar).length}
                            </p>
                        </div>
                    </div>

                    {/* Tabla */}
                    <div className="card-sistema overflow-hidden p-0">
                        <div className="overflow-x-auto">
                            <table className="tabla-sistema">
                                <thead>
                                    <tr>
                                        <th>{tabActiva === 'cobrar' ? 'Cliente/Empresa' : 'Proveedor'}</th>
                                        <th>Concepto</th>
                                        <th>Total (Bs)</th>
                                        <th>Pagado</th>
                                        <th>Saldo</th>
                                        <th>Vencimiento</th>
                                        <th>Estado</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {(tabActiva === 'cobrar' ? cuentasCobrar : cuentasPagar).map((cuenta) => {
                                        const saldo = cuenta.montoBs - cuenta.montoPagado;
                                        const vencida = new Date(cuenta.fechaVencimiento) < new Date();
                                        return (
                                            <tr key={cuenta.id}>
                                                <td className="font-medium">{cuenta.contraparte}</td>
                                                <td className="text-sm text-muted-foreground">{cuenta.concepto}</td>
                                                <td className="font-mono text-sm">{formatBs(cuenta.montoBs)}</td>
                                                <td className="font-mono text-sm text-green-400">
                                                    {cuenta.montoPagado > 0 ? formatBs(cuenta.montoPagado) : '-'}
                                                </td>
                                                <td className={cn(
                                                    'font-mono text-sm font-semibold',
                                                    tabActiva === 'cobrar' ? 'text-blue-400' : 'text-red-400'
                                                )}>
                                                    {formatBs(saldo)}
                                                </td>
                                                <td>
                                                    <span className={cn('text-xs font-mono flex items-center gap-1', vencida && cuenta.estado !== 'pagado' ? 'text-red-400' : 'text-muted-foreground')}>
                                                        {vencida && cuenta.estado !== 'pagado' && <AlertCircle className="w-3 h-3" />}
                                                        {formatFecha(cuenta.fechaVencimiento)}
                                                    </span>
                                                </td>
                                                <td><BadgeEstado estado={cuenta.estado} /></td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
