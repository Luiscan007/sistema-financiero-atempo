'use client';

/**
 * app/pos/page.tsx
 * Punto de Venta - Servicios de Atempo Art Studio
 * Catalogo: paquetes de clases y alquiler de espacios
 */

import { useState } from 'react';
import {
    Search, Plus, Minus, Trash2, CreditCard, Smartphone, Banknote,
    DollarSign, ArrowLeftRight, X, CheckCircle2, Printer,
    MessageCircle, ShoppingCart, Tag, BookOpen, Home, Clock,
    Users, Calendar, Loader2,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useCarritoStore } from '@/lib/store';
import { useTasas } from '@/components/providers/TasasProvider';
import { BANCOS_VENEZOLANOS, generarNumeroRecibo } from '@/lib/utils';
import { cn } from '@/lib/utils';
import type { PagoMetodo } from '@/lib/store';

// ─── Tipos e importacion desde hook compartido ───────────────────────────────
import { useServicios } from '@/lib/useServicios';
import type { Servicio, TipoServicio } from '@/lib/useServicios';

// ─── Helpers de formato ───────────────────────────────────────────────────────

function fmt_usd(n: number) {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2 }).format(n);
}
function fmt_bs(n: number) {
    return new Intl.NumberFormat('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n) + ' Bs';
}

// ─── Badge tipo ───────────────────────────────────────────────────────────────

function BadgeTipo({ tipo }: { tipo: TipoServicio }) {
    if (tipo === 'paquete_clases') {
        return (
            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-xs bg-blue-500/15 text-blue-400 border border-blue-500/20">
                <BookOpen className="w-2.5 h-2.5" /> Paquete
            </span>
        );
    }
    return (
        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-xs bg-purple-500/15 text-purple-400 border border-purple-500/20">
            <Home className="w-2.5 h-2.5" /> Alquiler
        </span>
    );
}

// ─── Metodo de pago ───────────────────────────────────────────────────────────

function MetodoPagoForm({
    tipo,
    index,
    onActualizar,
    onEliminar,
    totalPendiente,
}: {
    tipo: string;
    index: number;
    onActualizar: (index: number, metodo: PagoMetodo) => void;
    onEliminar: (index: number) => void;
    totalPendiente: number;
}) {
    const [datos, setDatos] = useState<any>({ tipo, monto: totalPendiente, tipoTarjeta: 'debito' });

    const actualizar = (campo: string, valor: any) => {
        const nuevo = { ...datos, [campo]: valor };
        setDatos(nuevo);
        onActualizar(index, nuevo as PagoMetodo);
    };

    const labelTipo: Record<string, string> = {
        punto_venta: 'Punto de Venta',
        pago_movil: 'Pago Movil',
        efectivo_bs: 'Efectivo Bs',
        efectivo_usd: 'Efectivo USD',
        efectivo_eur: 'Efectivo EUR',
        transferencia: 'Transferencia',
    };

    return (
        <div className="bg-white/[0.03] border border-border rounded-xl p-4 space-y-3">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    {tipo === 'punto_venta' && <CreditCard className="w-4 h-4 text-blue-400" />}
                    {tipo === 'pago_movil' && <Smartphone className="w-4 h-4 text-green-400" />}
                    {tipo === 'efectivo_bs' && <Banknote className="w-4 h-4 text-yellow-400" />}
                    {tipo === 'efectivo_usd' && <DollarSign className="w-4 h-4 text-emerald-400" />}
                    {tipo === 'efectivo_eur' && <DollarSign className="w-4 h-4 text-purple-400" />}
                    {tipo === 'transferencia' && <ArrowLeftRight className="w-4 h-4 text-cyan-400" />}
                    <span className="text-sm font-medium">{labelTipo[tipo] || tipo}</span>
                </div>
                <button onClick={() => onEliminar(index)} className="text-muted-foreground hover:text-red-400 transition-colors">
                    <X className="w-4 h-4" />
                </button>
            </div>

            <div>
                <label className="text-xs text-muted-foreground mb-1 block">Monto (Bs)</label>
                <input type="number" className="input-sistema font-mono" min="0" step="0.01"
                    value={datos.monto || ''} onChange={e => actualizar('monto', parseFloat(e.target.value) || 0)} />
            </div>

            {tipo === 'pago_movil' && (
                <div className="grid grid-cols-2 gap-2">
                    <div>
                        <label className="text-xs text-muted-foreground mb-1 block">Banco</label>
                        <select className="input-sistema text-xs" value={datos.banco || ''}
                            onChange={e => actualizar('banco', e.target.value)}>
                            <option value="">Seleccionar...</option>
                            {BANCOS_VENEZOLANOS.map(b => <option key={b} value={b}>{b}</option>)}
                        </select>
                    </div>
                    <div>
                        <label className="text-xs text-muted-foreground mb-1 block">Telefono</label>
                        <input type="tel" className="input-sistema text-xs" placeholder="0414..."
                            value={datos.telefono || ''} onChange={e => actualizar('telefono', e.target.value)} />
                    </div>
                    <div className="col-span-2">
                        <label className="text-xs text-muted-foreground mb-1 block">Referencia</label>
                        <input type="text" className="input-sistema text-xs" placeholder="N de referencia"
                            value={datos.referencia || ''} onChange={e => actualizar('referencia', e.target.value)} />
                    </div>
                </div>
            )}

            {tipo === 'transferencia' && (
                <div>
                    <label className="text-xs text-muted-foreground mb-1 block">N de referencia</label>
                    <input type="text" className="input-sistema text-xs" placeholder="Referencia bancaria"
                        value={datos.referencia || ''} onChange={e => actualizar('referencia', e.target.value)} />
                </div>
            )}

            {(tipo === 'efectivo_usd' || tipo === 'efectivo_eur') && (
                <div>
                    <label className="text-xs text-muted-foreground mb-1 block">
                        Monto en {tipo === 'efectivo_usd' ? 'USD' : 'EUR'}
                    </label>
                    <input type="number" className="input-sistema text-xs font-mono" min="0" step="0.01"
                        placeholder="0.00" value={datos.montoForeign || ''}
                        onChange={e => actualizar('montoForeign', parseFloat(e.target.value) || 0)} />
                </div>
            )}
        </div>
    );
}

// ─── Pagina POS ───────────────────────────────────────────────────────────────

export default function POSPage() {
    const { servicios: todosServicios, cargando: cargandoServicios } = useServicios();
    const [busqueda, setBusqueda] = useState('');
    const [filtroTipo, setFiltroTipo] = useState<'todos' | TipoServicio>('todos');
    const [metodosSeleccionados, setMetodosSeleccionados] = useState<string[]>([]);
    const [descuentoGlobalInput, setDescuentoGlobalInput] = useState('0');
    const [ventaCompletada, setVentaCompletada] = useState(false);
    const [procesando, setProcesando] = useState(false);
    const [tasaSeleccionada, setTasaSeleccionada] = useState<'bcv' | 'paralelo'>('bcv');
    const { tasas } = useTasas();

    const {
        items,
        agregarItem,
        quitarItem,
        actualizarCantidad,
        descuentoGlobal,
        setDescuentoGlobal,
        metodoPago,
        agregarMetodoPago,
        actualizarMetodoPago,
        quitarMetodoPago,
        calcularSubtotal,
        calcularDescuento,
        calcularTotal,
        calcularTotalPagado,
        calcularVuelto,
        limpiarCarrito,
        setTasaUsada,
    } = useCarritoStore();

    const tarifaActual = tasaSeleccionada === 'bcv' ? tasas.bcv : tasas.paralelo;

    const serviciosFiltrados = todosServicios.filter(s => {
        // activo === undefined (docs viejos) se trata como activo=true
        if (s.activo === false) return false;
        const matchBusqueda = !busqueda ||
            (s.nombre || '').toLowerCase().includes(busqueda.toLowerCase()) ||
            (s.descripcion || '').toLowerCase().includes(busqueda.toLowerCase());
        const matchTipo = filtroTipo === 'todos' || s.tipo === filtroTipo;
        return matchBusqueda && matchTipo;
    });

    const agregarAlCarrito = (servicio: Servicio) => {
        const precioBs = servicio.precioUSD * tarifaActual;
        agregarItem({
            id: servicio.id,
            nombre: servicio.nombre,
            codigo: servicio.id,
            precio: precioBs,
            cantidad: 1,
            descuento: 0,
            subtotal: precioBs,
        });
        toast.success(`${servicio.nombre} agregado`, { duration: 1500 });
    };

    const agregarMetodo = (tipo: string) => {
        const totalPendiente = calcularTotal() - calcularTotalPagado();
        agregarMetodoPago({ tipo: tipo as any, monto: Math.max(0, totalPendiente) });
        setMetodosSeleccionados([...metodosSeleccionados, tipo]);
    };

    const procesarVenta = async () => {
        if (items.length === 0) { toast.error('El carrito esta vacio'); return; }
        if (metodoPago.length === 0) { toast.error('Selecciona un metodo de pago'); return; }
        const totalPagado = calcularTotalPagado();
        const total = calcularTotal();
        if (totalPagado < total - 0.01) { toast.error(`Falta pagar ${fmt_bs(total - totalPagado)}`); return; }

        setProcesando(true);
        const numeroRecibo = generarNumeroRecibo();
        try {
            await new Promise(r => setTimeout(r, 1000));
            toast.success(`Venta completada! Recibo ${numeroRecibo}`, { duration: 5000, icon: '✅' });
            setVentaCompletada(true);
        } catch {
            toast.error('Error al procesar la venta');
        } finally {
            setProcesando(false);
        }
    };

    const nuevaVenta = () => {
        limpiarCarrito();
        setMetodosSeleccionados([]);
        setVentaCompletada(false);
    };

    const enviarWhatsApp = () => {
        const total = calcularTotal();
        const totalUSD = total / tarifaActual;
        const numeroRecibo = generarNumeroRecibo();
        const texto =
            `🎨 *RECIBO - ATEMPO ART STUDIO*\n` +
            `Recibo: ${numeroRecibo}\n` +
            `Fecha: ${new Date().toLocaleString('es-VE')}\n\n` +
            `*SERVICIOS:*\n` +
            items.map(item => `• ${item.nombre} x${item.cantidad}: ${fmt_bs(item.subtotal)}`).join('\n') +
            `\n\n*TOTAL: ${fmt_bs(total)}*` +
            `\n(≈ ${fmt_usd(totalUSD)})\n\n` +
            `Gracias por elegirnos! 🎨`;
        window.open(`https://wa.me/?text=${encodeURIComponent(texto)}`, '_blank');
    };

    return (
        <div className="flex flex-col lg:flex-row gap-4 h-full -m-6 p-0">

            {/* ── PANEL IZQUIERDO: Catalogo de servicios ── */}
            <div className="flex-1 flex flex-col bg-card border-r border-border overflow-hidden">

                {/* Header */}
                <div className="p-4 border-b border-border space-y-3">
                    <div className="flex items-center justify-between">
                        <h2 className="font-semibold flex items-center gap-2">
                            <Tag className="w-4 h-4 text-blue-400" />
                            Catalogo de Servicios
                        </h2>
                        {/* Selector tasa */}
                        <div className="flex items-center gap-1 bg-muted rounded-lg p-1">
                            <button
                                className={cn('px-3 py-1 rounded-md text-xs font-medium transition-all',
                                    tasaSeleccionada === 'bcv' ? 'bg-blue-600 text-white' : 'text-muted-foreground hover:text-foreground')}
                                onClick={() => { setTasaSeleccionada('bcv'); setTasaUsada(tasas.bcv); }}
                            >
                                BCV
                            </button>
                            <button
                                className={cn('px-3 py-1 rounded-md text-xs font-medium transition-all',
                                    tasaSeleccionada === 'paralelo' ? 'bg-yellow-600 text-white' : 'text-muted-foreground hover:text-foreground')}
                                onClick={() => { setTasaSeleccionada('paralelo'); setTasaUsada(tasas.paralelo); }}
                            >
                                Paralela
                            </button>
                        </div>
                    </div>

                    {/* Filtros */}
                    <div className="flex gap-2">
                        <div className="relative flex-1">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                            <input type="text" className="input-sistema pl-10 w-full"
                                placeholder="Buscar servicio..."
                                value={busqueda} onChange={e => setBusqueda(e.target.value)} />
                        </div>
                        <select className="input-sistema w-36 text-xs" value={filtroTipo}
                            onChange={e => setFiltroTipo(e.target.value as typeof filtroTipo)}>
                            <option value="todos">Todos</option>
                            <option value="paquete_clases">Paquetes</option>
                            <option value="alquiler">Alquileres</option>
                        </select>
                    </div>
                </div>

                {/* Grid de servicios */}
                <div className="flex-1 overflow-y-auto p-4">
                    {cargandoServicios ? (
                        <div className="flex flex-col items-center justify-center h-full py-16">
                            <Loader2 className="w-8 h-8 animate-spin text-blue-400 mb-3" />
                            <p className="text-sm text-muted-foreground">Cargando servicios...</p>
                        </div>
                    ) : todosServicios.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-full text-center text-muted-foreground py-16">
                            <div className="w-16 h-16 bg-muted/30 rounded-2xl flex items-center justify-center mb-4">
                                <BookOpen className="w-8 h-8 opacity-30" />
                            </div>
                            <p className="font-medium mb-1">No hay servicios aun</p>
                            <p className="text-xs max-w-xs">
                                Agrega tus paquetes de clases y alquileres desde la seccion
                                <span className="text-blue-400 font-medium"> Inventario</span> y apareceran aqui automaticamente.
                            </p>
                        </div>
                    ) : serviciosFiltrados.length === 0 ? (
                        <div className="text-center py-12 text-muted-foreground">
                            <Search className="w-10 h-10 mx-auto mb-3 opacity-20" />
                            <p className="text-sm font-medium">Sin resultados</p>
                            <p className="text-xs mt-1 opacity-70">Prueba con otro nombre o cambia el filtro</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-3">
                            {serviciosFiltrados.map(servicio => {
                                const precioBs = servicio.precioUSD * tarifaActual;
                                return (
                                    <button
                                        key={servicio.id}
                                        onClick={() => agregarAlCarrito(servicio)}
                                        className="text-left p-3 bg-muted/30 border border-border rounded-xl hover:border-blue-500/50 hover:bg-blue-500/5 transition-all duration-200 group flex flex-col gap-2"
                                    >
                                        {/* Icon segun tipo */}
                                        <div className={cn(
                                            'w-10 h-10 rounded-lg flex items-center justify-center transition-colors',
                                            servicio.tipo === 'paquete_clases'
                                                ? 'bg-blue-500/10 group-hover:bg-blue-500/20'
                                                : 'bg-purple-500/10 group-hover:bg-purple-500/20'
                                        )}>
                                            {servicio.tipo === 'paquete_clases'
                                                ? <BookOpen className="w-5 h-5 text-blue-400" />
                                                : <Home className="w-5 h-5 text-purple-400" />
                                            }
                                        </div>

                                        <div>
                                            <BadgeTipo tipo={servicio.tipo} />
                                            <p className="text-sm font-medium leading-tight mt-1">{servicio.nombre}</p>
                                            {servicio.categoria && (
                                                <p className="text-xs text-muted-foreground">{servicio.categoria}</p>
                                            )}
                                        </div>

                                        {/* Detalles rapidos */}
                                        <div className="flex flex-wrap gap-1">
                                            {servicio.tipo === 'paquete_clases' && servicio.clasesIncluidas && (
                                                <span className="flex items-center gap-0.5 text-xs text-blue-400">
                                                    <Users className="w-3 h-3" />{servicio.clasesIncluidas} clases
                                                </span>
                                            )}
                                            {servicio.tipo === 'paquete_clases' && servicio.vigenciaDias && (
                                                <span className="flex items-center gap-0.5 text-xs text-muted-foreground">
                                                    <Calendar className="w-3 h-3" />{servicio.vigenciaDias}d
                                                </span>
                                            )}
                                            {servicio.tipo === 'alquiler' && servicio.duracionHoras && (
                                                <span className="flex items-center gap-0.5 text-xs text-purple-400">
                                                    <Clock className="w-3 h-3" />{servicio.duracionHoras}h
                                                </span>
                                            )}
                                        </div>

                                        {/* Precios */}
                                        <div className="mt-auto pt-2 border-t border-border/50">
                                            <p className="text-sm font-bold text-green-400 font-mono">
                                                {fmt_usd(servicio.precioUSD)}
                                            </p>
                                            <p className="text-xs text-amber-400 font-mono">
                                                {fmt_bs(precioBs)}
                                            </p>
                                        </div>
                                    </button>
                                );
                            })}
                        </div>
                    )}
                </div>
            </div>

            {/* ── PANEL DERECHO: Carrito y Pago ── */}
            <div className="w-full lg:w-96 flex flex-col bg-card overflow-hidden h-full">

                {ventaCompletada ? (
                    <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
                        <div className="w-20 h-20 bg-green-500/20 rounded-full flex items-center justify-center mb-4">
                            <CheckCircle2 className="w-10 h-10 text-green-400" />
                        </div>
                        <h3 className="text-xl font-bold text-green-400 mb-2">Venta Completada!</h3>
                        <p className="text-muted-foreground text-sm mb-6">
                            Total cobrado: {fmt_bs(calcularTotal())}
                        </p>
                        <div className="flex flex-col gap-3 w-full">
                            <button className="btn-secondary justify-center" onClick={() => window.print()}>
                                <Printer className="w-4 h-4" /> Imprimir Recibo
                            </button>
                            <button className="btn-secondary justify-center text-green-400 border-green-500/30 hover:bg-green-500/10" onClick={enviarWhatsApp}>
                                <MessageCircle className="w-4 h-4" /> Enviar por WhatsApp
                            </button>
                            <button className="btn-primary justify-center" onClick={nuevaVenta}>
                                <ShoppingCart className="w-4 h-4" /> Nueva Venta
                            </button>
                        </div>
                    </div>
                ) : (
                    <>
                        {/* Header carrito */}
                        <div className="p-4 border-b border-border">
                            <div className="flex items-center justify-between">
                                <h2 className="font-semibold flex items-center gap-2">
                                    <ShoppingCart className="w-4 h-4 text-blue-400" />
                                    Carrito
                                    {items.length > 0 && (
                                        <span className="badge badge-blue ml-1">{items.length}</span>
                                    )}
                                </h2>
                                {items.length > 0 && (
                                    <button onClick={limpiarCarrito}
                                        className="text-xs text-muted-foreground hover:text-red-400 transition-colors flex items-center gap-1">
                                        <Trash2 className="w-3 h-3" /> Vaciar
                                    </button>
                                )}
                            </div>
                        </div>

                        {/* Items */}
                        <div className="flex-1 overflow-y-auto p-4 space-y-2">
                            {items.length === 0 ? (
                                <div className="flex flex-col items-center justify-center h-40 text-muted-foreground">
                                    <ShoppingCart className="w-12 h-12 mb-3 opacity-20" />
                                    <p className="text-sm">Carrito vacio</p>
                                    <p className="text-xs mt-1">Selecciona un servicio del catalogo</p>
                                </div>
                            ) : (
                                items.map(item => (
                                    <div key={item.id} className="pos-item group">
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-medium truncate">{item.nombre}</p>
                                            <p className="text-xs text-muted-foreground">{fmt_bs(item.precio)}</p>
                                            {item.descuento > 0 && (
                                                <span className="badge badge-yellow text-xs mt-0.5">-{item.descuento}%</span>
                                            )}
                                        </div>
                                        <div className="flex items-center gap-2 flex-shrink-0">
                                            <button onClick={() => actualizarCantidad(item.id, item.cantidad - 1)}
                                                className="w-7 h-7 rounded-lg bg-muted hover:bg-red-500/20 hover:text-red-400 flex items-center justify-center transition-colors">
                                                <Minus className="w-3 h-3" />
                                            </button>
                                            <span className="text-sm font-medium w-6 text-center">{item.cantidad}</span>
                                            <button onClick={() => actualizarCantidad(item.id, item.cantidad + 1)}
                                                className="w-7 h-7 rounded-lg bg-muted hover:bg-blue-500/20 hover:text-blue-400 flex items-center justify-center transition-colors">
                                                <Plus className="w-3 h-3" />
                                            </button>
                                            <div className="text-right min-w-[70px]">
                                                <p className="text-sm font-semibold font-mono">{fmt_bs(item.subtotal)}</p>
                                                <p className="text-xs text-muted-foreground font-mono">
                                                    {fmt_usd(item.subtotal / tarifaActual)}
                                                </p>
                                            </div>
                                            <button onClick={() => quitarItem(item.id)}
                                                className="text-muted-foreground hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100">
                                                <X className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>

                        {/* Totales y pago */}
                        {items.length > 0 && (
                            <div className="flex-shrink-0 overflow-y-auto border-t border-border p-4 space-y-4" style={{maxHeight: '55vh'}}>
                                {/* Descuento global */}
                                <div className="flex items-center gap-2">
                                    <Tag className="w-4 h-4 text-yellow-400" />
                                    <input type="number" className="input-sistema flex-1 text-sm"
                                        placeholder="Descuento global %"
                                        value={descuentoGlobalInput}
                                        onChange={e => {
                                            setDescuentoGlobalInput(e.target.value);
                                            setDescuentoGlobal(parseFloat(e.target.value) || 0);
                                        }}
                                        min="0" max="100" />
                                </div>

                                {/* Totales */}
                                <div className="space-y-1.5 text-sm">
                                    <div className="flex justify-between text-muted-foreground">
                                        <span>Subtotal</span>
                                        <span className="font-mono">{fmt_bs(calcularSubtotal())}</span>
                                    </div>
                                    {descuentoGlobal > 0 && (
                                        <div className="flex justify-between text-yellow-400">
                                            <span>Descuento ({descuentoGlobal}%)</span>
                                            <span className="font-mono">-{fmt_bs(calcularDescuento())}</span>
                                        </div>
                                    )}
                                    <div className="flex justify-between font-bold text-base border-t border-border pt-2">
                                        <span>TOTAL</span>
                                        <div className="text-right">
                                            <p className="font-mono text-blue-400">{fmt_bs(calcularTotal())}</p>
                                            <p className="text-xs text-muted-foreground font-mono">
                                                {fmt_usd(calcularTotal() / tarifaActual)} ({tasaSeleccionada.toUpperCase()})
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                {/* Metodos de pago */}
                                <div className="space-y-3">
                                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                                        Metodos de Pago
                                    </p>
                                    {metodoPago.map((metodo, index) => (
                                        <MetodoPagoForm key={index} tipo={metodo.tipo} index={index}
                                            onActualizar={actualizarMetodoPago}
                                            onEliminar={quitarMetodoPago}
                                            totalPendiente={calcularTotal() - calcularTotalPagado() + metodo.monto} />
                                    ))}
                                    <div className="grid grid-cols-3 gap-2">
                                        {[
                                            { tipo: 'punto_venta', icon: CreditCard, label: 'POS', color: 'text-blue-400' },
                                            { tipo: 'pago_movil', icon: Smartphone, label: 'Movil', color: 'text-green-400' },
                                            { tipo: 'efectivo_bs', icon: Banknote, label: 'Bs', color: 'text-yellow-400' },
                                            { tipo: 'efectivo_usd', icon: DollarSign, label: 'USD', color: 'text-emerald-400' },
                                            { tipo: 'transferencia', icon: ArrowLeftRight, label: 'Transfer', color: 'text-cyan-400' },
                                            { tipo: 'efectivo_eur', icon: DollarSign, label: 'EUR', color: 'text-purple-400' },
                                        ].map(m => (
                                            <button key={m.tipo} onClick={() => agregarMetodo(m.tipo)}
                                                className="flex flex-col items-center gap-1 p-2 bg-muted/30 border border-border rounded-lg hover:border-blue-500/40 hover:bg-blue-500/5 transition-all text-xs">
                                                <m.icon className={`w-4 h-4 ${m.color}`} />
                                                <span className="text-muted-foreground">{m.label}</span>
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {/* Balance */}
                                {metodoPago.length > 0 && (
                                    <div className="space-y-1 text-sm">
                                        <div className="flex justify-between">
                                            <span className="text-muted-foreground">Pagado</span>
                                            <span className={cn('font-mono',
                                                calcularTotalPagado() >= calcularTotal() ? 'text-green-400' : 'text-red-400')}>
                                                {fmt_bs(calcularTotalPagado())}
                                            </span>
                                        </div>
                                        {calcularVuelto() > 0 && (
                                            <div className="flex justify-between font-semibold text-green-400">
                                                <span>Vuelto</span>
                                                <span className="font-mono">{fmt_bs(calcularVuelto())}</span>
                                            </div>
                                        )}
                                        {calcularTotalPagado() < calcularTotal() && (
                                            <div className="flex justify-between font-semibold text-red-400">
                                                <span>Falta</span>
                                                <span className="font-mono">{fmt_bs(calcularTotal() - calcularTotalPagado())}</span>
                                            </div>
                                        )}
                                    </div>
                                )}

                            </div>
                            {/* Confirmar - SIEMPRE fijo abajo, fuera del scroll */}
                            <div className="flex-shrink-0 p-4 border-t border-border bg-card">
                                <button onClick={procesarVenta}
                                    disabled={procesando || items.length === 0}
                                    className={cn('w-full btn-success justify-center text-sm font-semibold py-3',
                                        (procesando || items.length === 0) && 'opacity-50 cursor-not-allowed')}>
                                    {procesando ? (
                                        <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />Procesando...</>
                                    ) : (
                                        <><CheckCircle2 className="w-4 h-4" />Confirmar Venta</>
                                    )}
                                </button>
                            </div>
                        )}
                    </>
                )}
            </div>
        </div>
    );
}
