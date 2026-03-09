'use client';

/**
 * app/contabilidad/page.tsx
 * P&G real desde Firestore: ventas + gastos + cuentas por cobrar
 */

import { useMemo } from 'react';
import { useState } from 'react';
import {
    TrendingUp, TrendingDown, BookOpen, BarChart3,
    Loader2, AlertCircle, DollarSign, Wallet,
} from 'lucide-react';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid,
    Tooltip, Legend, ResponsiveContainer,
} from 'recharts';
import { useTasas }          from '@/components/providers/TasasProvider';
import { useVentas }         from '@/lib/useVentas';
import { useGastos }         from '@/lib/useGastos';
import { useCuentasCobrar }  from '@/lib/useCuentasCobrar';
import { formatBs, formatUSD } from '@/lib/utils';
import { cn } from '@/lib/utils';

/* ── Helpers ────────────────────────────── */
function mesKey(fecha: string) {
    // fecha viene como "DD/MM/YYYY" o "YYYY-MM-DD"
    if (!fecha) return '';
    if (fecha.includes('/')) {
        const [d, m, y] = fecha.split('/');
        return `${y}-${m.padStart(2, '0')}`;
    }
    return fecha.substring(0, 7);
}

function labelMes(key: string) {
    if (!key) return '';
    const [y, m] = key.split('-');
    const meses = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];
    return `${meses[parseInt(m) - 1]} ${y.substring(2)}`;
}

function pctCambio(actual: number, anterior: number) {
    if (!anterior) return null;
    return ((actual - anterior) / anterior * 100).toFixed(1);
}

/* ── Pagina ─────────────────────────────── */
export default function ContabilidadPage() {
    const { tasas } = useTasas();
    const { ventas,  cargando: cVentas  } = useVentas();
    const { gastos,  cargando: cGastos  } = useGastos();
    const {
        cuentas, cargando: cCuentas,
        totalPendiente, totalUSDPendiente, vencidas,
    } = useCuentasCobrar();

    const [tabActiva, setTabActiva] = useState<'pyg' | 'cobrar'>('pyg');
    const cargando = cVentas || cGastos || cCuentas;

    /* ── P&G por mes (ultimos 6 meses) ── */
    const datosPYG = useMemo(() => {
        // Generar keys de los ultimos 6 meses
        const keys: string[] = [];
        const ahora = new Date();
        for (let i = 5; i >= 0; i--) {
            const d = new Date(ahora.getFullYear(), ahora.getMonth() - i, 1);
            keys.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
        }

        // Agrupar ingresos por mes
        const ingresosPorMes: Record<string, number> = {};
        ventas.forEach(v => {
            const k = mesKey(v.fecha || '');
            if (keys.includes(k)) {
                ingresosPorMes[k] = (ingresosPorMes[k] || 0) + (v.totalBs || 0);
            }
        });

        // Agrupar gastos por mes
        const gastosPorMes: Record<string, number> = {};
        gastos.forEach(g => {
            const k = mesKey(g.fecha || '');
            if (keys.includes(k)) {
                gastosPorMes[k] = (gastosPorMes[k] || 0) + (g.montoBs || 0);
            }
        });

        return keys.map(k => {
            const ingresos = ingresosPorMes[k] || 0;
            const gasto    = gastosPorMes[k]    || 0;
            const utilidad = ingresos - gasto;
            return { mes: labelMes(k), key: k, ingresos, gastos: gasto, utilidad };
        });
    }, [ventas, gastos]);

    const mesActual  = datosPYG[datosPYG.length - 1];
    const mesAnterior = datosPYG[datosPYG.length - 2];

    const totalIngresos = datosPYG.reduce((a, m) => a + m.ingresos, 0);
    const totalGastos   = datosPYG.reduce((a, m) => a + m.gastos,   0);
    const totalUtilidad = totalIngresos - totalGastos;
    const margen = totalIngresos > 0 ? ((totalUtilidad / totalIngresos) * 100).toFixed(1) : '0.0';

    const pctIngresos = mesAnterior ? pctCambio(mesActual?.ingresos || 0, mesAnterior.ingresos) : null;
    const pctGastos   = mesAnterior ? pctCambio(mesActual?.gastos   || 0, mesAnterior.gastos)   : null;

    const cuentasPendientes = cuentas.filter(c => c.estado !== 'pagado');

    if (cargando) return (
        <div className="flex items-center justify-center py-32">
            <Loader2 className="w-8 h-8 animate-spin text-blue-400" />
            <span className="ml-3 text-muted-foreground">Cargando contabilidad...</span>
        </div>
    );

    const sinDatos = totalIngresos === 0 && totalGastos === 0;

    return (
        <div className="space-y-6 animate-fade-in">

            {/* Header */}
            <div>
                <h1 className="text-2xl font-bold">Contabilidad</h1>
                <p className="text-muted-foreground text-sm">
                    Resumen financiero real — ultimos 6 meses
                </p>
            </div>

            {/* KPIs mes actual */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="kpi-card">
                    <TrendingUp className="w-4 h-4 text-emerald-400 mb-2" />
                    <p className="text-xl font-bold font-mono text-emerald-400">
                        {formatBs(mesActual?.ingresos || 0)}
                    </p>
                    <p className="text-xs text-muted-foreground">Ingresos {mesActual?.mes}</p>
                    {pctIngresos && (
                        <p className={cn('text-xs mt-1 font-medium',
                            parseFloat(pctIngresos) >= 0 ? 'text-emerald-400' : 'text-red-400')}>
                            {parseFloat(pctIngresos) >= 0 ? '+' : ''}{pctIngresos}% vs mes anterior
                        </p>
                    )}
                </div>
                <div className="kpi-card">
                    <TrendingDown className="w-4 h-4 text-red-400 mb-2" />
                    <p className="text-xl font-bold font-mono text-red-400">
                        {formatBs(mesActual?.gastos || 0)}
                    </p>
                    <p className="text-xs text-muted-foreground">Gastos {mesActual?.mes}</p>
                    {pctGastos && (
                        <p className={cn('text-xs mt-1 font-medium',
                            parseFloat(pctGastos) <= 0 ? 'text-emerald-400' : 'text-red-400')}>
                            {parseFloat(pctGastos) >= 0 ? '+' : ''}{pctGastos}% vs mes anterior
                        </p>
                    )}
                </div>
                <div className={cn('kpi-card',
                    (mesActual?.utilidad || 0) >= 0 ? 'border-emerald-500/30' : 'border-red-500/30')}>
                    <BookOpen className={cn('w-4 h-4 mb-2',
                        (mesActual?.utilidad || 0) >= 0 ? 'text-emerald-400' : 'text-red-400')} />
                    <p className={cn('text-xl font-bold font-mono',
                        (mesActual?.utilidad || 0) >= 0 ? 'text-emerald-400' : 'text-red-400')}>
                        {formatBs(mesActual?.utilidad || 0)}
                    </p>
                    <p className="text-xs text-muted-foreground">
                        Utilidad {mesActual?.mes}
                        {tasas.bcv > 0 && (
                            <span className="ml-1">({formatUSD((mesActual?.utilidad || 0) / tasas.bcv)})</span>
                        )}
                    </p>
                </div>
                <div className="kpi-card">
                    <BarChart3 className="w-4 h-4 text-blue-400 mb-2" />
                    <p className="text-xl font-bold font-mono text-blue-400">{margen}%</p>
                    <p className="text-xs text-muted-foreground">Margen 6 meses</p>
                </div>
            </div>

            {/* Tabs */}
            <div className="flex items-center gap-1 bg-muted/30 border border-border p-1 rounded-xl w-fit">
                {[
                    { id: 'pyg',    label: 'P&G Mensual',                   icon: BarChart3 },
                    { id: 'cobrar', label: `Por Cobrar (${cuentasPendientes.length})`, icon: Wallet },
                ].map(tab => (
                    <button key={tab.id}
                        onClick={() => setTabActiva(tab.id as any)}
                        className={cn(
                            'flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all',
                            tabActiva === tab.id
                                ? 'bg-card text-foreground shadow-sm'
                                : 'text-muted-foreground hover:text-foreground'
                        )}>
                        <tab.icon className="w-4 h-4" />
                        {tab.label}
                    </button>
                ))}
            </div>

            {/* Tab P&G */}
            {tabActiva === 'pyg' && (
                <div className="space-y-6">
                    {sinDatos ? (
                        <div className="card-sistema p-16 text-center">
                            <BarChart3 className="w-12 h-12 text-muted-foreground/20 mx-auto mb-4" />
                            <p className="text-muted-foreground font-medium">Sin datos aun</p>
                            <p className="text-muted-foreground text-sm mt-1">
                                Registra ventas y gastos para ver el P&G automaticamente
                            </p>
                        </div>
                    ) : (
                        <>
                            {/* Grafica */}
                            <div className="card-sistema">
                                <h3 className="font-semibold mb-4">Perdidas y Ganancias — Ultimos 6 meses</h3>
                                <ResponsiveContainer width="100%" height={300}>
                                    <BarChart data={datosPYG}>
                                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.1)" />
                                        <XAxis dataKey="mes" tick={{ fontSize: 11, fill: '#64748b' }} tickLine={false} axisLine={false} />
                                        <YAxis
                                            tick={{ fontSize: 10, fill: '#64748b' }}
                                            tickLine={false} axisLine={false}
                                            tickFormatter={v => `${(v / 1000).toFixed(0)}k`}
                                        />
                                        <Tooltip
                                            contentStyle={{ background: '#1e293b', border: '1px solid #334155', borderRadius: '8px', fontSize: '12px' }}
                                            formatter={(v: any) => formatBs(v)}
                                        />
                                        <Legend wrapperStyle={{ fontSize: '12px' }} />
                                        <Bar dataKey="ingresos" name="Ingresos" fill="#22c55e" radius={[4,4,0,0]} opacity={0.85} />
                                        <Bar dataKey="gastos"   name="Gastos"   fill="#ef4444" radius={[4,4,0,0]} opacity={0.85} />
                                        <Bar dataKey="utilidad" name="Utilidad" fill="#3b82f6" radius={[4,4,0,0]} opacity={0.85} />
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
                                        {datosPYG.map(fila => (
                                            <tr key={fila.key}>
                                                <td className="font-medium">{fila.mes}</td>
                                                <td className="font-mono text-emerald-400">{formatBs(fila.ingresos)}</td>
                                                <td className="font-mono text-red-400">{formatBs(fila.gastos)}</td>
                                                <td className={cn('font-mono font-semibold',
                                                    fila.utilidad >= 0 ? 'text-blue-400' : 'text-red-400')}>
                                                    {formatBs(fila.utilidad)}
                                                </td>
                                                <td className="text-sm text-muted-foreground">
                                                    {fila.ingresos > 0
                                                        ? `${((fila.utilidad / fila.ingresos) * 100).toFixed(1)}%`
                                                        : '-'}
                                                </td>
                                                <td className="font-mono text-muted-foreground">
                                                    {tasas.bcv > 0 ? formatUSD(fila.utilidad / tasas.bcv) : '-'}
                                                </td>
                                            </tr>
                                        ))}
                                        {/* Fila total */}
                                        <tr className="bg-muted/20 font-bold">
                                            <td>TOTAL 6 MESES</td>
                                            <td className="font-mono text-emerald-400">{formatBs(totalIngresos)}</td>
                                            <td className="font-mono text-red-400">{formatBs(totalGastos)}</td>
                                            <td className={cn('font-mono',
                                                totalUtilidad >= 0 ? 'text-blue-400' : 'text-red-400')}>
                                                {formatBs(totalUtilidad)}
                                            </td>
                                            <td className="text-sm">{margen}%</td>
                                            <td className="font-mono text-muted-foreground">
                                                {tasas.bcv > 0 ? formatUSD(totalUtilidad / tasas.bcv) : '-'}
                                            </td>
                                        </tr>
                                    </tbody>
                                </table>
                            </div>
                        </>
                    )}
                </div>
            )}

            {/* Tab Por Cobrar — resumen desde useCuentasCobrar */}
            {tabActiva === 'cobrar' && (
                <div className="space-y-4">
                    {/* Alerta vencidas */}
                    {vencidas.length > 0 && (
                        <div className="flex items-center gap-3 p-4 rounded-xl bg-red-500/10 border border-red-500/25">
                            <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0" />
                            <p className="text-sm text-red-300">
                                <span className="font-semibold">{vencidas.length} cuenta{vencidas.length > 1 ? 's' : ''} vencida{vencidas.length > 1 ? 's' : ''}</span> — ve al modulo Cuentas por Cobrar para gestionar los pagos.
                            </p>
                        </div>
                    )}

                    {/* KPIs */}
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                        <div className="kpi-card">
                            <Wallet className="w-4 h-4 text-blue-400 mb-2" />
                            <p className="text-xl font-bold font-mono text-blue-400">
                                {formatBs(totalPendiente)}
                            </p>
                            <p className="text-xs text-muted-foreground">Total pendiente (Bs)</p>
                        </div>
                        <div className="kpi-card">
                            <DollarSign className="w-4 h-4 text-emerald-400 mb-2" />
                            <p className="text-xl font-bold font-mono text-emerald-400">
                                ${totalUSDPendiente.toFixed(2)}
                            </p>
                            <p className="text-xs text-muted-foreground">Total pendiente (USD)</p>
                        </div>
                        <div className="kpi-card">
                            <AlertCircle className="w-4 h-4 text-red-400 mb-2" />
                            <p className="text-3xl font-bold font-mono text-red-400">{vencidas.length}</p>
                            <p className="text-xs text-muted-foreground">Cuentas vencidas</p>
                        </div>
                    </div>

                    {/* Tabla resumen */}
                    {cuentasPendientes.length === 0 ? (
                        <div className="card-sistema p-12 text-center">
                            <Wallet className="w-10 h-10 text-muted-foreground/20 mx-auto mb-3" />
                            <p className="text-muted-foreground">No hay cuentas pendientes por cobrar</p>
                        </div>
                    ) : (
                        <div className="card-sistema overflow-hidden p-0">
                            <div className="overflow-x-auto">
                                <table className="tabla-sistema">
                                    <thead>
                                        <tr>
                                            <th>Alumno</th>
                                            <th>Concepto</th>
                                            <th>Saldo (Bs)</th>
                                            <th>Saldo (USD)</th>
                                            <th>Vencimiento</th>
                                            <th>Estado</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {cuentasPendientes.map(c => {
                                            const saldo    = c.montoBs  - c.montoPagado;
                                            const saldoUSD = c.montoUSD - c.montoPagadoUSD;
                                            const vencida  = c.estado === 'vencida';
                                            return (
                                                <tr key={c.id} className={cn(vencida && 'bg-red-500/5')}>
                                                    <td className="font-medium">{c.alumnoNombre}</td>
                                                    <td className="text-sm text-muted-foreground">{c.concepto}</td>
                                                    <td className="font-mono text-sm text-blue-400">
                                                        {formatBs(saldo)}
                                                    </td>
                                                    <td className="font-mono text-sm text-muted-foreground">
                                                        ${saldoUSD.toFixed(2)}
                                                    </td>
                                                    <td>
                                                        <span className={cn('text-xs font-mono flex items-center gap-1',
                                                            vencida ? 'text-red-400' : 'text-muted-foreground')}>
                                                            {vencida && <AlertCircle className="w-3 h-3" />}
                                                            {c.fechaVencimiento}
                                                        </span>
                                                    </td>
                                                    <td>
                                                        <span className={cn(
                                                            'text-xs px-2 py-0.5 rounded-full border font-medium',
                                                            c.estado === 'vencida'  ? 'bg-red-500/10 border-red-500/25 text-red-400' :
                                                            c.estado === 'parcial'  ? 'bg-blue-500/10 border-blue-500/25 text-blue-400' :
                                                                                      'bg-amber-500/10 border-amber-500/25 text-amber-400'
                                                        )}>
                                                            {c.estado === 'vencida' ? 'Vencida' :
                                                             c.estado === 'parcial' ? 'Parcial' : 'Pendiente'}
                                                        </span>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
