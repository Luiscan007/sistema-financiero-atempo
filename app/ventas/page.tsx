'use client';

/**
 * app/ventas/page.tsx
 * Historial de ventas - datos reales desde Firestore
 */

import { useState } from 'react';
import {
    Search, Download, Receipt, CreditCard, Smartphone,
    Banknote, DollarSign, ArrowLeftRight, Eye, TrendingUp, Loader2, X,
} from 'lucide-react';
import { useTasas } from '@/components/providers/TasasProvider';
import { formatBs, formatUSD } from '@/lib/utils';
import { cn } from '@/lib/utils';
import { useVentas } from '@/lib/useVentas';
import type { Venta } from '@/lib/useVentas';

const ICONOS_PAGO: Record<string, any> = {
    punto_venta: CreditCard,
    pago_movil: Smartphone,
    efectivo_bs: Banknote,
    efectivo_usd: DollarSign,
    efectivo_eur: DollarSign,
    transferencia: ArrowLeftRight,
    mixto: Receipt,
};

const LABELS_PAGO: Record<string, string> = {
    punto_venta: 'POS',
    pago_movil: 'Pago Movil',
    efectivo_bs: 'Efectivo Bs',
    efectivo_usd: 'Efectivo USD',
    efectivo_eur: 'Efectivo EUR',
    transferencia: 'Transferencia',
    mixto: 'Mixto',
};

const COLORES_PAGO: Record<string, string> = {
    punto_venta: 'bg-blue-500/15 text-blue-400 border-blue-500/20',
    pago_movil: 'bg-green-500/15 text-green-400 border-green-500/20',
    efectivo_bs: 'bg-yellow-500/15 text-yellow-400 border-yellow-500/20',
    efectivo_usd: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/20',
    efectivo_eur: 'bg-purple-500/15 text-purple-400 border-purple-500/20',
    transferencia: 'bg-cyan-500/15 text-cyan-400 border-cyan-500/20',
    mixto: 'bg-blue-500/15 text-blue-400 border-blue-500/20',
};

function badgePago(tipo: string) {
    return cn('inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs border',
        COLORES_PAGO[tipo] || 'bg-muted text-muted-foreground border-border');
}

function MetodosBadges({ metodos }: { metodos: Venta['metodoPago'] }) {
    if (!metodos || metodos.length === 0) return <span className="text-muted-foreground text-xs">-</span>;
    const tipo = metodos.length === 1 ? metodos[0].tipo : 'mixto';
    const Icono = ICONOS_PAGO[tipo] || Receipt;
    return (
        <span className={badgePago(tipo)}>
            <Icono className="w-3 h-3" />
            {LABELS_PAGO[tipo] || tipo}
        </span>
    );
}

export default function VentasPage() {
    const { tasas } = useTasas();
    const { ventas, cargando } = useVentas();
    const [busqueda, setBusqueda] = useState('');
    const [metodoPagoFiltro, setMetodoPagoFiltro] = useState('todos');
    const [ventaDetalle, setVentaDetalle] = useState<Venta | null>(null);

    const ventasFiltradas = ventas.filter((v) => {
        const matchBusqueda = !busqueda
            || v.numeroRecibo.toLowerCase().includes(busqueda.toLowerCase())
            || (v.usuarioNombre || '').toLowerCase().includes(busqueda.toLowerCase());
        const tiposPago = v.metodoPago?.map(m => m.tipo) || [];
        const matchMetodo = metodoPagoFiltro === 'todos'
            || tiposPago.includes(metodoPagoFiltro)
            || (metodoPagoFiltro === 'mixto' && tiposPago.length > 1);
        return matchBusqueda && matchMetodo;
    });

    const totalBs = ventasFiltradas.reduce((acc, v) => acc + (v.total || 0), 0);
    const totalUSD = ventasFiltradas.reduce((acc, v) => acc + (v.totalUSD || 0), 0);
    const ticketPromedio = ventasFiltradas.length > 0 ? totalBs / ventasFiltradas.length : 0;

    if (cargando) {
        return (
            <div className="flex items-center justify-center py-32">
                <Loader2 className="w-8 h-8 animate-spin text-blue-400" />
                <span className="ml-3 text-muted-foreground">Cargando ventas...</span>
            </div>
        );
    }

    return (
        <div className="space-y-6 animate-fade-in">

            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold">Historial de Ventas</h1>
                    <p className="text-muted-foreground text-sm">
                        {ventasFiltradas.length} ventas · {formatBs(totalBs)} · {formatUSD(totalUSD)}
                    </p>
                </div>
                <button className="btn-secondary text-sm">
                    <Download className="w-4 h-4" /> Exportar
                </button>
            </div>

            {/* KPIs */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="kpi-card">
                    <TrendingUp className="w-4 h-4 text-green-400 mb-2" />
                    <p className="text-xl font-bold font-mono text-green-400">{formatBs(totalBs)}</p>
                    <p className="text-xs text-muted-foreground">Total periodo</p>
                </div>
                <div className="kpi-card">
                    <Receipt className="w-4 h-4 text-blue-400 mb-2" />
                    <p className="text-xl font-bold font-mono">{ventasFiltradas.length}</p>
                    <p className="text-xs text-muted-foreground">Transacciones</p>
                </div>
                <div className="kpi-card">
                    <DollarSign className="w-4 h-4 text-purple-400 mb-2" />
                    <p className="text-xl font-bold font-mono text-purple-400">{formatBs(ticketPromedio)}</p>
                    <p className="text-xs text-muted-foreground">Ticket promedio</p>
                </div>
                <div className="kpi-card">
                    <DollarSign className="w-4 h-4 text-yellow-400 mb-2" />
                    <p className="text-xl font-bold font-mono text-yellow-400">{formatUSD(totalUSD)}</p>
                    <p className="text-xs text-muted-foreground">Total USD</p>
                </div>
            </div>

            {/* Filtros */}
            <div className="flex flex-wrap gap-3">
                <div className="relative flex-1 min-w-48">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <input className="input-sistema pl-10 w-full"
                        placeholder="Buscar por recibo o vendedor..."
                        value={busqueda} onChange={e => setBusqueda(e.target.value)} />
                </div>
                <select className="input-sistema w-auto" value={metodoPagoFiltro}
                    onChange={e => setMetodoPagoFiltro(e.target.value)}>
                    <option value="todos">Todos los metodos</option>
                    <option value="punto_venta">Punto de Venta</option>
                    <option value="pago_movil">Pago Movil</option>
                    <option value="efectivo_bs">Efectivo Bs</option>
                    <option value="efectivo_usd">Efectivo USD</option>
                    <option value="transferencia">Transferencia</option>
                    <option value="mixto">Mixto</option>
                </select>
            </div>

            {/* Tabla */}
            {ventasFiltradas.length === 0 ? (
                <div className="card-sistema p-12 text-center">
                    <Receipt className="w-12 h-12 text-muted-foreground mx-auto mb-4 opacity-30" />
                    <p className="text-muted-foreground font-medium">
                        {ventas.length === 0 ? 'Aun no hay ventas registradas' : 'No hay ventas que coincidan con los filtros'}
                    </p>
                </div>
            ) : (
                <div className="card-sistema overflow-hidden p-0">
                    <div className="overflow-x-auto">
                        <table className="tabla-sistema">
                            <thead>
                                <tr>
                                    <th>Recibo</th>
                                    <th>Fecha / Hora</th>
                                    <th>Vendedor</th>
                                    <th>Servicios</th>
                                    <th>Metodo Pago</th>
                                    <th>Total (Bs)</th>
                                    <th>Total (USD)</th>
                                    <th>Tasa</th>
                                    <th>Ver</th>
                                </tr>
                            </thead>
                            <tbody>
                                {ventasFiltradas.map((venta) => (
                                    <tr key={venta.id}>
                                        <td>
                                            <span className="font-mono text-xs text-blue-400">{venta.numeroRecibo}</span>
                                        </td>
                                        <td>
                                            <span className="text-xs text-muted-foreground">{venta.fecha}</span>
                                        </td>
                                        <td className="text-sm text-muted-foreground">
                                            {venta.usuarioNombre || '-'}
                                        </td>
                                        <td>
                                            <span className="text-xs text-muted-foreground">
                                                {venta.items?.length || 0} item{(venta.items?.length || 0) !== 1 ? 's' : ''}
                                            </span>
                                        </td>
                                        <td>
                                            <MetodosBadges metodos={venta.metodoPago} />
                                        </td>
                                        <td className="font-mono text-sm text-green-400">
                                            {formatBs(venta.total || 0)}
                                        </td>
                                        <td className="font-mono text-sm text-muted-foreground">
                                            {formatUSD(venta.totalUSD || 0)}
                                        </td>
                                        <td className="font-mono text-xs text-muted-foreground">
                                            {(venta.tasaUsada || 0).toFixed(2)}
                                        </td>
                                        <td>
                                            <button className="text-muted-foreground hover:text-blue-400 transition-colors"
                                                onClick={() => setVentaDetalle(venta)}>
                                                <Eye className="w-4 h-4" />
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* Modal detalle */}
            {ventaDetalle && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
                    onClick={() => setVentaDetalle(null)}>
                    <div className="bg-card border border-border rounded-2xl w-full max-w-md shadow-2xl max-h-[90vh] overflow-y-auto"
                        onClick={e => e.stopPropagation()}>
                        <div className="p-6">

                            <div className="flex items-center justify-between mb-4">
                                <div>
                                    <h3 className="font-bold text-lg">Detalle de Venta</h3>
                                    <p className="text-sm font-mono text-blue-400">{ventaDetalle.numeroRecibo}</p>
                                    <p className="text-xs text-muted-foreground mt-0.5">{ventaDetalle.fecha}</p>
                                </div>
                                <button onClick={() => setVentaDetalle(null)}
                                    className="p-2 hover:bg-muted rounded-lg transition-colors text-muted-foreground">
                                    <X className="w-4 h-4" />
                                </button>
                            </div>

                            {ventaDetalle.usuarioNombre && (
                                <div className="text-xs text-muted-foreground mb-4">
                                    Vendedor: <span className="text-foreground">{ventaDetalle.usuarioNombre}</span>
                                </div>
                            )}

                            <div className="border-t border-border my-3" />

                            {/* Items */}
                            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                                Servicios
                            </p>
                            <div className="space-y-2 mb-4">
                                {(ventaDetalle.items || []).map((item: any, i: number) => (
                                    <div key={i} className="flex justify-between text-sm">
                                        <span className="text-muted-foreground">
                                            {item.nombre} x{item.cantidad}
                                        </span>
                                        <span className="font-mono">{formatBs(item.subtotal)}</span>
                                    </div>
                                ))}
                            </div>

                            <div className="border-t border-border my-3" />

                            {/* Totales */}
                            <div className="space-y-1.5 text-sm mb-4">
                                <div className="flex justify-between text-muted-foreground">
                                    <span>Subtotal</span>
                                    <span className="font-mono">{formatBs(ventaDetalle.subtotal || ventaDetalle.total || 0)}</span>
                                </div>
                                {(ventaDetalle.montoDescuento || 0) > 0 && (
                                    <div className="flex justify-between text-yellow-400">
                                        <span>Descuento ({ventaDetalle.descuentoGlobal || 0}%)</span>
                                        <span className="font-mono">-{formatBs(ventaDetalle.montoDescuento || 0)}</span>
                                    </div>
                                )}
                                <div className="flex justify-between font-bold text-base border-t border-border pt-2">
                                    <span>TOTAL</span>
                                    <div className="text-right">
                                        <p className="font-mono text-green-400">{formatBs(ventaDetalle.total || 0)}</p>
                                        <p className="font-mono text-xs text-muted-foreground">{formatUSD(ventaDetalle.totalUSD || 0)}</p>
                                    </div>
                                </div>
                            </div>

                            <div className="border-t border-border my-3" />

                            {/* Metodos de pago */}
                            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                                Metodos de Pago
                            </p>
                            <div className="space-y-2 mb-4">
                                {(ventaDetalle.metodoPago || []).map((m: any, i: number) => {
                                    const Icono = ICONOS_PAGO[m.tipo] || Receipt;
                                    return (
                                        <div key={i} className="flex items-center justify-between text-sm">
                                            <div className="flex items-center gap-2">
                                                <Icono className="w-3.5 h-3.5 text-muted-foreground" />
                                                <span className="text-muted-foreground capitalize">
                                                    {LABELS_PAGO[m.tipo] || m.tipo}
                                                    {m.banco ? ' - ' + m.banco : ''}
                                                    {m.referencia ? ' #' + m.referencia : ''}
                                                </span>
                                            </div>
                                            <span className="font-mono">{formatBs(m.monto || 0)}</span>
                                        </div>
                                    );
                                })}
                            </div>

                            <div className="flex justify-between text-xs text-muted-foreground">
                                <span>Tasa usada ({ventaDetalle.tipoTasa || 'BCV'})</span>
                                <span className="font-mono">Bs {(ventaDetalle.tasaUsada || 0).toFixed(2)}</span>
                            </div>

                            <button className="w-full btn-secondary mt-5 justify-center"
                                onClick={() => setVentaDetalle(null)}>
                                Cerrar
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
