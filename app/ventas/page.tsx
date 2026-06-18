'use client';

/**
 * app/ventas/page.tsx
 * Historial de ventas - datos reales desde Firestore
 */

import { useState } from 'react';
import {
    Search, Download, Receipt, CreditCard, Smartphone,
    Banknote, DollarSign, ArrowLeftRight, Eye, TrendingUp, Loader2, X, Trash2, AlertTriangle, Camera, Pencil, Save,
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
    const tieneComprobante = metodos.some((m: any) => !!m.comprobanteUrl);
    return (
        <span className={badgePago(tipo) + ' gap-1.5'}>
            <Icono className="w-3 h-3" />
            {LABELS_PAGO[tipo] || tipo}
            {tieneComprobante && <span title="Tiene comprobante adjunto"><Camera className="w-3 h-3 text-blue-400" /></span>}
        </span>
    );
}

export default function VentasPage() {
    const { tasas } = useTasas();
    const { ventas, cargando, eliminarVenta, actualizarVenta } = useVentas();
    const [busqueda, setBusqueda] = useState('');
    const [metodoPagoFiltro, setMetodoPagoFiltro] = useState('todos');
    const [ventaDetalle, setVentaDetalle] = useState<Venta | null>(null);
    const [ventaAEliminar, setVentaAEliminar] = useState<Venta | null>(null);
    const [eliminando, setEliminando] = useState(false);
    const [editando, setEditando] = useState(false);
    const [numeroReciboEdit, setNumeroReciboEdit] = useState('');
    const [fechaEdit, setFechaEdit] = useState('');
    const [guardandoEdicion, setGuardandoEdicion] = useState(false);

    const confirmarEliminacion = async () => {
        if (!ventaAEliminar) return;
        setEliminando(true);
        try {
            await eliminarVenta(ventaAEliminar.id);
            setVentaAEliminar(null);
            setVentaDetalle(null);
        } catch (err) {
            alert('Error al eliminar la venta');
        } finally {
            setEliminando(false);
        }
    };

    const iniciarEdicion = () => {
        if (!ventaDetalle) return;
        setNumeroReciboEdit(ventaDetalle.numeroRecibo);
        setFechaEdit(ventaDetalle.fecha);
        setEditando(true);
    };

    const cancelarEdicion = () => setEditando(false);

    const guardarEdicion = async () => {
        if (!ventaDetalle) return;
        setGuardandoEdicion(true);
        try {
            await actualizarVenta(ventaDetalle.id, {
                numeroRecibo: numeroReciboEdit,
                fecha: fechaEdit,
            });
            setVentaDetalle({ ...ventaDetalle, numeroRecibo: numeroReciboEdit, fecha: fechaEdit });
            setEditando(false);
        } catch (err) {
            alert('Error al guardar los cambios');
        } finally {
            setGuardandoEdicion(false);
        }
    };

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
                    <p className="text-xl font-bold font-mono text-green-400">{formatUSD(totalUSD)}</p>
                    <p className="text-xs text-muted-foreground">Total periodo</p>
                    <p className="text-xs text-purple-400 font-mono mt-0.5">
                        € {formatBs(totalUSD * (tasas.eurBcv ?? tasas.bcv))}
                    </p>
                </div>
                <div className="kpi-card">
                    <Receipt className="w-4 h-4 text-blue-400 mb-2" />
                    <p className="text-xl font-bold font-mono">{ventasFiltradas.length}</p>
                    <p className="text-xs text-muted-foreground">Transacciones</p>
                </div>
                <div className="kpi-card">
                    <DollarSign className="w-4 h-4 text-purple-400 mb-2" />
                    <p className="text-xl font-bold font-mono text-purple-400">{formatUSD(totalUSD > 0 && ventasFiltradas.length > 0 ? totalUSD / ventasFiltradas.length : 0)}</p>
                    <p className="text-xs text-muted-foreground">Ticket promedio</p>
                    <p className="text-xs text-purple-400/60 font-mono mt-0.5">
                        € {formatBs(totalUSD > 0 && ventasFiltradas.length > 0 ? (totalUSD / ventasFiltradas.length) * (tasas.eurBcv ?? tasas.bcv) : 0)}
                    </p>
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
                                    <th>€ EUR</th>
                                    <th>Ver</th>
                                    <th>Anular</th>
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
                                        <td className="font-mono text-xs text-purple-400">
                                            € {(tasas.eurBcv ?? tasas.bcv).toFixed(2)}
                                        </td>
                                        <td>
                                            <button className="text-muted-foreground hover:text-blue-400 transition-colors"
                                                onClick={() => setVentaDetalle(venta)}>
                                                <Eye className="w-4 h-4" />
                                            </button>
                                        </td>
                                        <td>
                                            <button className="text-muted-foreground hover:text-red-400 transition-colors"
                                                onClick={() => setVentaAEliminar(venta)}
                                                title="Anular venta">
                                                <Trash2 className="w-4 h-4" />
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
                    <div className="bg-card border border-border rounded-2xl w-full max-w-md shadow-2xl max-h-[90vh] flex flex-col"
                        onClick={e => e.stopPropagation()}>

                        {/* Header fijo */}
                        <div className="p-6 pb-0 flex-shrink-0">
                            <div className="flex items-center justify-between mb-4">
                                <div className="flex-1">
                                    <div className="flex items-center gap-2">
                                        <h3 className="font-bold text-lg">Detalle de Venta</h3>
                                        {!editando && (
                                            <button onClick={iniciarEdicion}
                                                className="p-1 hover:bg-muted rounded-md transition-colors text-muted-foreground hover:text-blue-400"
                                                title="Editar recibo/fecha">
                                                <Pencil className="w-3.5 h-3.5" />
                                            </button>
                                        )}
                                    </div>

                                    {editando ? (
                                        <div className="space-y-2 mt-2">
                                            <div>
                                                <label className="text-xs text-muted-foreground block mb-1">N° de Recibo</label>
                                                <input type="text" value={numeroReciboEdit}
                                                    onChange={e => setNumeroReciboEdit(e.target.value)}
                                                    className="input-sistema text-sm font-mono w-full" />
                                            </div>
                                            <div>
                                                <label className="text-xs text-muted-foreground block mb-1">Fecha</label>
                                                <input type="date" value={fechaEdit}
                                                    onChange={e => setFechaEdit(e.target.value)}
                                                    className="input-sistema text-sm w-full" />
                                            </div>
                                            <div className="flex gap-2 pt-1">
                                                <button onClick={guardarEdicion} disabled={guardandoEdicion}
                                                    className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg bg-green-500/15 border border-green-500/30 text-green-400 hover:bg-green-500/25 transition-colors disabled:opacity-50">
                                                    {guardandoEdicion ? <Loader2 className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3" />}
                                                    Guardar
                                                </button>
                                                <button onClick={cancelarEdicion} disabled={guardandoEdicion}
                                                    className="text-xs px-3 py-1.5 rounded-lg border border-border text-muted-foreground hover:bg-muted transition-colors">
                                                    Cancelar
                                                </button>
                                            </div>
                                        </div>
                                    ) : (
                                        <>
                                            <p className="text-sm font-mono text-blue-400">{ventaDetalle.numeroRecibo}</p>
                                            <p className="text-xs text-muted-foreground mt-0.5">{ventaDetalle.fecha}</p>
                                        </>
                                    )}
                                </div>
                                <button onClick={() => { setVentaDetalle(null); setEditando(false); }}
                                    className="p-2 hover:bg-muted rounded-lg transition-colors text-muted-foreground flex-shrink-0">
                                    <X className="w-4 h-4" />
                                </button>
                            </div>

                            {ventaDetalle.usuarioNombre && !editando && (
                                <div className="text-xs text-muted-foreground mb-4">
                                    Vendedor: <span className="text-foreground">{ventaDetalle.usuarioNombre}</span>
                                </div>
                            )}
                        </div>

                        {/* Body con scroll */}
                        <div className="px-6 overflow-y-auto flex-1 min-h-0">
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
                                {ventaDetalle.ajusteRedondeo !== undefined && ventaDetalle.ajusteRedondeo !== 0 && (
                                    <div className="flex justify-between text-yellow-500/90 text-xs my-1">
                                        <span>Redondeo de Pago</span>
                                        <span className="font-mono">
                                            {ventaDetalle.ajusteRedondeo > 0 ? '+' : ''}
                                            {formatBs(ventaDetalle.ajusteRedondeo)}
                                        </span>
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
                            <div className="space-y-3 mb-4">
                                {(ventaDetalle.metodoPago || []).map((m: any, i: number) => {
                                    const Icono = ICONOS_PAGO[m.tipo] || Receipt;
                                    const bancoMostrar = m.bancoOrigen || m.bancoDestino || m.bancoPOS || m.banco || '';
                                    const refMostrar = m.numeroReferencia || m.referencia || '';
                                    return (
                                        <div key={i} className="bg-muted/20 border border-border rounded-lg p-3 space-y-2">
                                            <div className="flex items-center justify-between text-sm">
                                                <div className="flex items-center gap-2">
                                                    <Icono className="w-3.5 h-3.5 text-muted-foreground" />
                                                    <span className="text-muted-foreground capitalize">
                                                        {LABELS_PAGO[m.tipo] || m.tipo}
                                                        {bancoMostrar ? ' - ' + bancoMostrar : ''}
                                                    </span>
                                                </div>
                                                <span className="font-mono font-semibold">{formatBs(m.monto || 0)}</span>
                                            </div>

                                            {/* Quién paga */}
                                            {m.nombrePagador && (
                                                <div className="flex items-center justify-between text-xs">
                                                    <span className="text-muted-foreground">Quién paga</span>
                                                    <span>{m.nombrePagador}</span>
                                                </div>
                                            )}

                                            {/* Referencia */}
                                            {refMostrar && (
                                                <div className="flex items-center justify-between text-xs">
                                                    <span className="text-muted-foreground">N° Referencia</span>
                                                    <span className="font-mono text-blue-400">{refMostrar}</span>
                                                </div>
                                            )}

                                            {/* Otros datos según tipo */}
                                            {m.telefonoCliente && (
                                                <div className="flex items-center justify-between text-xs">
                                                    <span className="text-muted-foreground">Teléfono</span>
                                                    <span className="font-mono">{m.telefonoCliente}</span>
                                                </div>
                                            )}
                                            {m.cedula && (
                                                <div className="flex items-center justify-between text-xs">
                                                    <span className="text-muted-foreground">Cédula</span>
                                                    <span className="font-mono">{m.cedula}</span>
                                                </div>
                                            )}
                                            {m.ultimosCuatro && (
                                                <div className="flex items-center justify-between text-xs">
                                                    <span className="text-muted-foreground">Tarjeta</span>
                                                    <span className="font-mono">**** {m.ultimosCuatro}</span>
                                                </div>
                                            )}

                                            {/* Comprobante adjunto */}
                                            {m.comprobanteUrl && (
                                                <div>
                                                    <p className="text-xs text-muted-foreground mb-1">Comprobante</p>
                                                    <a href={m.comprobanteUrl} target="_blank" rel="noopener noreferrer"
                                                        className="block relative group">
                                                        <img src={m.comprobanteUrl} alt="Comprobante"
                                                            className="w-full h-32 object-cover rounded-lg border border-border" />
                                                        <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg flex items-center justify-center">
                                                            <span className="text-xs text-white bg-black/40 px-2 py-1 rounded">Ver completo</span>
                                                        </div>
                                                    </a>
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>

                            <div className="flex justify-between text-xs text-muted-foreground">
                                <span>Tasa usada ({ventaDetalle.tipoTasa || 'BCV'})</span>
                                <span className="font-mono">Bs {(ventaDetalle.tasaUsada || 0).toFixed(2)}</span>
                            </div>
                            <div className="pb-4" />
                        </div>{/* cierre body scrolleable */}

                        {/* Footer fijo */}
                        <div className="p-6 pt-4 flex-shrink-0 border-t border-border">
                            <div className="flex gap-3">
                                <button className="flex-1 btn-secondary justify-center"
                                    onClick={() => setVentaDetalle(null)}>
                                    Cerrar
                                </button>
                                <button className="flex-1 justify-center flex items-center gap-2 px-4 py-2 rounded-lg border border-red-500/30 bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-colors text-sm font-medium"
                                    onClick={() => { setVentaAEliminar(ventaDetalle); setVentaDetalle(null); }}>
                                    <Trash2 className="w-4 h-4" /> Anular venta
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal confirmación eliminación */}
            {ventaAEliminar && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
                    <div className="bg-card border border-red-500/30 rounded-2xl w-full max-w-sm shadow-2xl p-6">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="w-10 h-10 rounded-full bg-red-500/20 flex items-center justify-center shrink-0">
                                <AlertTriangle className="w-5 h-5 text-red-400" />
                            </div>
                            <div>
                                <h3 className="font-bold text-red-400">Anular Venta</h3>
                                <p className="text-xs text-muted-foreground">Esta acción no se puede deshacer</p>
                            </div>
                        </div>

                        <div className="bg-muted/30 rounded-lg p-3 mb-5 space-y-1 text-sm">
                            <div className="flex justify-between">
                                <span className="text-muted-foreground">Recibo</span>
                                <span className="font-mono text-blue-400">{ventaAEliminar.numeroRecibo}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-muted-foreground">Fecha</span>
                                <span>{ventaAEliminar.fecha}</span>
                            </div>
                            <div className="flex justify-between font-bold">
                                <span className="text-muted-foreground">Total</span>
                                <span className="text-red-400 font-mono">{formatBs(ventaAEliminar.total || 0)}</span>
                            </div>
                        </div>

                        <div className="flex gap-3">
                            <button className="flex-1 btn-secondary justify-center"
                                onClick={() => setVentaAEliminar(null)}
                                disabled={eliminando}>
                                Cancelar
                            </button>
                            <button
                                className="flex-1 justify-center flex items-center gap-2 px-4 py-2 rounded-lg bg-red-500 hover:bg-red-600 text-white transition-colors text-sm font-bold disabled:opacity-50"
                                onClick={confirmarEliminacion}
                                disabled={eliminando}>
                                {eliminando ? (
                                    <><Loader2 className="w-4 h-4 animate-spin" /> Anulando...</>
                                ) : (
                                    <><Trash2 className="w-4 h-4" /> Sí, anular</>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}