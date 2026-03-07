'use client';

/**
 * app/ventas/page.tsx
 * Historial completo de ventas con filtros y exportación
 */

import { useState } from 'react';
import {
    Search, Download, Filter, Receipt, CreditCard, Smartphone,
    Banknote, DollarSign, ArrowLeftRight, Eye, Calendar, TrendingUp,
} from 'lucide-react';
import { useTasas } from '@/components/providers/TasasProvider';
import { formatBs, formatUSD, formatFechaHora } from '@/lib/utils';
import { cn } from '@/lib/utils';

interface ItemVenta {
    nombre: string;
    cantidad: number;
    precioBs: number;
    subtotal: number;
}

interface Venta {
    id: string;
    numeroRecibo: string;
    fecha: string;
    clienteNombre?: string;
    items: ItemVenta[];
    totalBs: number;
    totalUSD: number;
    tasaUsada: number;
    metodoPago: string;
    referencia?: string;
    vendedor?: string;
}

const VENTAS_DEMO: Venta[] = [];

const ICONOS_PAGO: Record<string, any> = {
    punto_venta: CreditCard,
    pago_movil: Smartphone,
    efectivo_bs: Banknote,
    efectivo_usd: DollarSign,
    efectivo_eur: DollarSign,
    transferencia: ArrowLeftRight,
    mixto: Receipt,
};

const COLORES_PAGO: Record<string, string> = {
    punto_venta: 'badge-blue',
    pago_movil: 'badge-green',
    efectivo_bs: 'badge-yellow',
    efectivo_usd: 'badge-green',
    efectivo_eur: 'badge-blue',
    transferencia: 'badge-gray',
    mixto: 'badge-blue',
};

export default function VentasPage() {
    const { tasas } = useTasas();
    const [ventas] = useState<Venta[]>(VENTAS_DEMO);
    const [busqueda, setBusqueda] = useState('');
    const [metodoPagoFiltro, setMetodoPagoFiltro] = useState('todos');
    const [ventaDetalle, setVentaDetalle] = useState<Venta | null>(null);
    const [fechaDesde, setFechaDesde] = useState('');
    const [fechaHasta, setFechaHasta] = useState('');

    const ventasFiltradas = ventas.filter((v) => {
        const matchBusqueda = v.numeroRecibo.includes(busqueda) ||
            (v.clienteNombre?.toLowerCase().includes(busqueda.toLowerCase()) ?? false);
        const matchMetodo = metodoPagoFiltro === 'todos' || v.metodoPago === metodoPagoFiltro;
        return matchBusqueda && matchMetodo;
    });

    const totalBs = ventasFiltradas.reduce((acc, v) => acc + v.totalBs, 0);
    const totalUSD = ventasFiltradas.reduce((acc, v) => acc + v.totalUSD, 0);
    const ticketPromedio = ventasFiltradas.length > 0 ? totalBs / ventasFiltradas.length : 0;

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

            {/* KPIs rápidos */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="kpi-card">
                    <TrendingUp className="w-4 h-4 text-green-400 mb-2" />
                    <p className="text-xl font-bold font-mono text-green-400">{formatBs(totalBs)}</p>
                    <p className="text-xs text-muted-foreground">Total período</p>
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
                    <p className="text-xs text-muted-foreground">Total USD (BCV)</p>
                </div>
            </div>

            {/* Filtros */}
            <div className="flex flex-wrap gap-3">
                <div className="relative flex-1 min-w-48">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <input
                        className="input-sistema pl-10"
                        placeholder="Buscar por recibo o cliente..."
                        value={busqueda}
                        onChange={(e) => setBusqueda(e.target.value)}
                    />
                </div>
                <input
                    type="date"
                    className="input-sistema w-auto"
                    value={fechaDesde}
                    onChange={(e) => setFechaDesde(e.target.value)}
                    title="Desde"
                />
                <input
                    type="date"
                    className="input-sistema w-auto"
                    value={fechaHasta}
                    onChange={(e) => setFechaHasta(e.target.value)}
                    title="Hasta"
                />
                <select
                    className="input-sistema w-auto"
                    value={metodoPagoFiltro}
                    onChange={(e) => setMetodoPagoFiltro(e.target.value)}
                >
                    <option value="todos">Todos los métodos</option>
                    <option value="punto_venta">Punto de Venta</option>
                    <option value="pago_movil">Pago Móvil</option>
                    <option value="efectivo_bs">Efectivo Bs</option>
                    <option value="efectivo_usd">Efectivo USD</option>
                    <option value="transferencia">Transferencia</option>
                    <option value="mixto">Mixto</option>
                </select>
            </div>

            {/* Tabla de ventas */}
            <div className="card-sistema overflow-hidden p-0">
                <div className="overflow-x-auto">
                    <table className="tabla-sistema">
                        <thead>
                            <tr>
                                <th>Recibo</th>
                                <th>Fecha/Hora</th>
                                <th>Cliente</th>
                                <th>Productos</th>
                                <th>Método Pago</th>
                                <th>Total (Bs)</th>
                                <th>Total (USD)</th>
                                <th>Tasa</th>
                                <th>Ver</th>
                            </tr>
                        </thead>
                        <tbody>
                            {ventasFiltradas.map((venta) => {
                                const IconoPago = ICONOS_PAGO[venta.metodoPago] || Receipt;
                                return (
                                    <tr key={venta.id}>
                                        <td>
                                            <span className="font-mono text-xs text-blue-400">{venta.numeroRecibo}</span>
                                        </td>
                                        <td>
                                            <span className="text-xs text-muted-foreground">{formatFechaHora(venta.fecha)}</span>
                                        </td>
                                        <td className="text-sm">{venta.clienteNombre || '-'}</td>
                                        <td>
                                            <div className="text-xs text-muted-foreground">
                                                {venta.items.length} item{venta.items.length !== 1 ? 's' : ''}
                                            </div>
                                        </td>
                                        <td>
                                            <span className={cn('badge text-xs flex items-center gap-1 w-fit', COLORES_PAGO[venta.metodoPago] || 'badge-gray')}>
                                                <IconoPago className="w-2.5 h-2.5" />
                                                {venta.metodoPago.replace('_', ' ')}
                                            </span>
                                        </td>
                                        <td className="font-mono text-sm text-green-400">{formatBs(venta.totalBs)}</td>
                                        <td className="font-mono text-sm text-muted-foreground">{formatUSD(venta.totalUSD)}</td>
                                        <td className="font-mono text-xs text-muted-foreground">{venta.tasaUsada.toFixed(2)}</td>
                                        <td>
                                            <button
                                                className="text-muted-foreground hover:text-blue-400 transition-colors"
                                                onClick={() => setVentaDetalle(venta)}
                                            >
                                                <Eye className="w-4 h-4" />
                                            </button>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Modal detalle de venta */}
            {ventaDetalle && (
                <div className="modal-overlay" onClick={() => setVentaDetalle(null)}>
                    <div
                        className="glass-card w-full max-w-md"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="p-6">
                            <div className="text-center mb-4">
                                <Receipt className="w-8 h-8 text-blue-400 mx-auto mb-2" />
                                <h3 className="font-bold text-lg">Detalle de Venta</h3>
                                <p className="text-sm font-mono text-blue-400">{ventaDetalle.numeroRecibo}</p>
                                <p className="text-xs text-muted-foreground mt-1">{formatFechaHora(ventaDetalle.fecha)}</p>
                            </div>

                            <div className="border-t border-border my-3" />

                            <div className="space-y-2 mb-4">
                                {ventaDetalle.items.map((item, i) => (
                                    <div key={i} className="flex justify-between text-sm">
                                        <span className="text-muted-foreground">
                                            {item.nombre} × {item.cantidad}
                                        </span>
                                        <span className="font-mono">{formatBs(item.subtotal)}</span>
                                    </div>
                                ))}
                            </div>

                            <div className="border-t border-border my-3" />

                            <div className="space-y-1 text-sm">
                                <div className="flex justify-between font-bold text-base">
                                    <span>TOTAL</span>
                                    <div className="text-right">
                                        <p className="font-mono text-green-400">{formatBs(ventaDetalle.totalBs)}</p>
                                        <p className="font-mono text-xs text-muted-foreground">{formatUSD(ventaDetalle.totalUSD)}</p>
                                    </div>
                                </div>
                                <div className="flex justify-between text-muted-foreground">
                                    <span>Método de pago</span>
                                    <span className="capitalize">{ventaDetalle.metodoPago.replace('_', ' ')}</span>
                                </div>
                                <div className="flex justify-between text-muted-foreground">
                                    <span>Tasa usada</span>
                                    <span className="font-mono">Bs {ventaDetalle.tasaUsada.toFixed(2)}</span>
                                </div>
                                {ventaDetalle.clienteNombre && (
                                    <div className="flex justify-between text-muted-foreground">
                                        <span>Cliente</span>
                                        <span>{ventaDetalle.clienteNombre}</span>
                                    </div>
                                )}
                            </div>

                            <button
                                className="w-full btn-secondary mt-4 justify-center"
                                onClick={() => setVentaDetalle(null)}
                            >
                                Cerrar
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
