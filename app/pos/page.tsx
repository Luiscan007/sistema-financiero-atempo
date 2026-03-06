'use client';

/**
 * app/pos/page.tsx
 * Pantalla completa de Punto de Venta (POS)
 * Soporte para: pago móvil, punto de venta físico, efectivo Bs/USD/EUR, transferencia, pago mixto
 */

import { useState, useRef, useCallback } from 'react';
import {
    Search, Plus, Minus, Trash2, CreditCard, Smartphone, Banknote,
    DollarSign, ArrowLeftRight, Layers, X, CheckCircle2, Printer,
    MessageCircle, ShoppingCart, Tag, User, ChevronDown, ChevronUp,
    Package, Scan, Calculator, Send,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useCarritoStore } from '@/lib/store';
import { useTasas } from '@/components/providers/TasasProvider';
import { formatBs, formatUSD, BANCOS_VENEZOLANOS, generarNumeroRecibo } from '@/lib/utils';
import { cn } from '@/lib/utils';
import type { PagoMetodo } from '@/lib/store';

// ============================
// PRODUCTOS DE DEMO (sustituir por Firestore)
// ============================
const PRODUCTOS_DEMO = [
    { id: '1', nombre: 'Agua Mineral 500ml', codigo: '001', precio: 850, stock: 120 },
    { id: '2', nombre: 'Coca-Cola 1.5L', codigo: '002', precio: 1800, stock: 45 },
    { id: '3', nombre: 'Pan Canilla', codigo: '003', precio: 450, stock: 30 },
    { id: '4', nombre: 'Aceite 1L', codigo: '004', precio: 4200, stock: 25 },
    { id: '5', nombre: 'Harina PAN 1kg', codigo: '005', precio: 2800, stock: 60 },
    { id: '6', nombre: 'Azúcar 1kg', codigo: '006', precio: 3100, stock: 40 },
    { id: '7', nombre: 'Arroz 1kg', codigo: '007', precio: 2500, stock: 80 },
    { id: '8', nombre: 'Leche en Polvo', codigo: '008', precio: 8500, stock: 15 },
    { id: '9', nombre: 'Café Molido 250g', codigo: '009', precio: 5200, stock: 35 },
    { id: '10', nombre: 'Jabón de Baño', codigo: '010', precio: 1200, stock: 50 },
    { id: '11', nombre: 'Shampoo 400ml', codigo: '011', precio: 3800, stock: 22 },
    { id: '12', nombre: 'Papel Higiénico x4', codigo: '012', precio: 2200, stock: 75 },
];

// ============================
// COMPONENTE: SELECTOR DE MÉTODO DE PAGO
// ============================
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
    const [datos, setDatos] = useState<any>({
        tipo,
        monto: totalPendiente,
        tipoTarjeta: 'debito',
    });

    const actualizar = (campo: string, valor: any) => {
        const nuevoDatos = { ...datos, [campo]: valor };
        setDatos(nuevoDatos);
        onActualizar(index, nuevoDatos as PagoMetodo);
    };

    return (
        <div className="bg-white/[0.03] border border-border rounded-xl p-4 space-y-3">
            {/* Header del método */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    {tipo === 'punto_venta' && <CreditCard className="w-4 h-4 text-blue-400" />}
                    {tipo === 'pago_movil' && <Smartphone className="w-4 h-4 text-green-400" />}
                    {tipo === 'efectivo_bs' && <Banknote className="w-4 h-4 text-yellow-400" />}
                    {tipo === 'efectivo_usd' && <DollarSign className="w-4 h-4 text-emerald-400" />}
                    {tipo === 'efectivo_eur' && <DollarSign className="w-4 h-4 text-purple-400" />}
                    {tipo === 'transferencia' && <ArrowLeftRight className="w-4 h-4 text-cyan-400" />}
                    <span className="text-sm font-medium capitalize">
                        {tipo.replace('_', ' ')}
                    </span>
                </div>
                <button onClick={() => onEliminar(index)} className="text-muted-foreground hover:text-red-400 transition-colors">
                    <X className="w-4 h-4" />
                </button>
            </div>

            {/* Monto */}
            <div>
                <label className="text-xs text-muted-foreground mb-1 block">Monto (Bs)</label>
                <input
                    type="number"
                    className="input-sistema"
                    value={datos.monto}
                    onChange={(e) => actualizar('monto', parseFloat(e.target.value) || 0)}
                    placeholder="0.00"
                />
            </div>

            {/* Campos específicos por método */}
            {tipo === 'punto_venta' && (
                <div className="grid grid-cols-2 gap-3">
                    <div>
                        <label className="text-xs text-muted-foreground mb-1 block">Tipo</label>
                        <select
                            className="input-sistema"
                            value={datos.tipoTarjeta}
                            onChange={(e) => actualizar('tipoTarjeta', e.target.value)}
                        >
                            <option value="debito">Débito</option>
                            <option value="credito">Crédito</option>
                        </select>
                    </div>
                    <div>
                        <label className="text-xs text-muted-foreground mb-1 block">Últimos 4 dígitos</label>
                        <input
                            type="text"
                            className="input-sistema"
                            maxLength={4}
                            value={datos.ultimosCuatro || ''}
                            onChange={(e) => actualizar('ultimosCuatro', e.target.value)}
                            placeholder="XXXX"
                        />
                    </div>
                    <div>
                        <label className="text-xs text-muted-foreground mb-1 block">N° Aprobación</label>
                        <input
                            type="text"
                            className="input-sistema"
                            value={datos.aprobacion || ''}
                            onChange={(e) => actualizar('aprobacion', e.target.value)}
                            placeholder="Número de aprobación"
                        />
                    </div>
                    <div>
                        <label className="text-xs text-muted-foreground mb-1 block">Banco</label>
                        <select
                            className="input-sistema"
                            value={datos.bancoPOS || ''}
                            onChange={(e) => actualizar('bancoPOS', e.target.value)}
                        >
                            <option value="">Seleccionar banco</option>
                            {BANCOS_VENEZOLANOS.map((b) => (
                                <option key={b} value={b}>{b}</option>
                            ))}
                        </select>
                    </div>
                </div>
            )}

            {tipo === 'pago_movil' && (
                <div className="grid grid-cols-2 gap-3">
                    <div>
                        <label className="text-xs text-muted-foreground mb-1 block">Banco Origen</label>
                        <select
                            className="input-sistema"
                            value={datos.bancoOrigen || ''}
                            onChange={(e) => actualizar('bancoOrigen', e.target.value)}
                        >
                            <option value="">Seleccionar banco</option>
                            {BANCOS_VENEZOLANOS.map((b) => (
                                <option key={b} value={b}>{b}</option>
                            ))}
                        </select>
                    </div>
                    <div>
                        <label className="text-xs text-muted-foreground mb-1 block">Teléfono Cliente</label>
                        <input
                            type="tel"
                            className="input-sistema"
                            value={datos.telefonoCliente || ''}
                            onChange={(e) => actualizar('telefonoCliente', e.target.value)}
                            placeholder="04XX-XXX-XXXX"
                        />
                    </div>
                    <div>
                        <label className="text-xs text-muted-foreground mb-1 block">N° Referencia</label>
                        <input
                            type="text"
                            className="input-sistema"
                            value={datos.referencia || ''}
                            onChange={(e) => actualizar('referencia', e.target.value)}
                            placeholder="Referencia bancaria"
                        />
                    </div>
                    <div>
                        <label className="text-xs text-muted-foreground mb-1 block">Cédula (opcional)</label>
                        <input
                            type="text"
                            className="input-sistema"
                            value={datos.cedula || ''}
                            onChange={(e) => actualizar('cedula', e.target.value)}
                            placeholder="V-XXXXXXXX"
                        />
                    </div>
                </div>
            )}

            {(tipo === 'efectivo_usd' || tipo === 'efectivo_eur') && (
                <div className="grid grid-cols-2 gap-3">
                    <div>
                        <label className="text-xs text-muted-foreground mb-1 block">
                            Monto en {tipo === 'efectivo_usd' ? 'USD' : 'EUR'}
                        </label>
                        <input
                            type="number"
                            className="input-sistema"
                            value={datos.montoExtranjero || ''}
                            onChange={(e) => actualizar('montoExtranjero', parseFloat(e.target.value) || 0)}
                            placeholder="0.00"
                        />
                    </div>
                    <div>
                        <label className="text-xs text-muted-foreground mb-1 block">Tasa usada</label>
                        <input
                            type="number"
                            className="input-sistema font-mono"
                            value={datos.tasaUsada || ''}
                            onChange={(e) => actualizar('tasaUsada', parseFloat(e.target.value) || 0)}
                            placeholder="0.00"
                        />
                    </div>
                </div>
            )}

            {tipo === 'transferencia' && (
                <div className="grid grid-cols-2 gap-3">
                    <div>
                        <label className="text-xs text-muted-foreground mb-1 block">Banco Destino</label>
                        <select
                            className="input-sistema"
                            value={datos.bancoDestino || ''}
                            onChange={(e) => actualizar('bancoDestino', e.target.value)}
                        >
                            <option value="">Seleccionar banco</option>
                            {BANCOS_VENEZOLANOS.map((b) => (
                                <option key={b} value={b}>{b}</option>
                            ))}
                        </select>
                    </div>
                    <div>
                        <label className="text-xs text-muted-foreground mb-1 block">Referencia</label>
                        <input
                            type="text"
                            className="input-sistema"
                            value={datos.referencia || ''}
                            onChange={(e) => actualizar('referencia', e.target.value)}
                            placeholder="Número de referencia"
                        />
                    </div>
                </div>
            )}
        </div>
    );
}

// ============================
// COMPONENTE PRINCIPAL POS
// ============================
export default function POSPage() {
    const [busqueda, setBusqueda] = useState('');
    const [metodosSeleccionados, setMetodosSeleccionados] = useState<string[]>([]);
    const [descuentoGlobalInput, setDescuentoGlobalInput] = useState('0');
    const [mostrarResumen, setMostrarResumen] = useState(false);
    const [ventaCompletada, setVentaCompletada] = useState(false);
    const [procesando, setProcesando] = useState(false);
    const [tasaSeleccionada, setTasaSeleccionada] = useState<'bcv' | 'paralelo'>('bcv');
    const { tasas } = useTasas();

    const {
        items,
        agregarItem,
        quitarItem,
        actualizarCantidad,
        actualizarDescuento,
        descuentoGlobal,
        setDescuentoGlobal,
        metodoPago,
        agregarMetodoPago,
        actualizarMetodoPago,
        quitarMetodoPago,
        calcularSubtotal,
        calcularDescuento,
        calcularTotal,
        calcularTotalUSD,
        calcularTotalPagado,
        calcularVuelto,
        limpiarCarrito,
        setTasaUsada,
    } = useCarritoStore();

    const productosFiltrados = PRODUCTOS_DEMO.filter(
        (p) =>
            p.nombre.toLowerCase().includes(busqueda.toLowerCase()) ||
            p.codigo.includes(busqueda)
    );

    const tarifaActual = tasaSeleccionada === 'bcv' ? tasas.bcv : tasas.paralelo;

    const agregarAlCarrito = (producto: typeof PRODUCTOS_DEMO[0]) => {
        agregarItem({
            id: producto.id,
            nombre: producto.nombre,
            codigo: producto.codigo,
            precio: producto.precio,
            cantidad: 1,
            descuento: 0,
            subtotal: producto.precio,
        });
        toast.success(`${producto.nombre} agregado`, { duration: 1500 });
    };

    const agregarMetodo = (tipo: string) => {
        const totalPendiente = calcularTotal() - calcularTotalPagado();
        agregarMetodoPago({
            tipo: tipo as any,
            monto: Math.max(0, totalPendiente),
        });
        setMetodosSeleccionados([...metodosSeleccionados, tipo]);
    };

    const procesarVenta = async () => {
        if (items.length === 0) {
            toast.error('El carrito está vacío');
            return;
        }
        if (metodoPago.length === 0) {
            toast.error('Selecciona un método de pago');
            return;
        }

        const totalPagado = calcularTotalPagado();
        const total = calcularTotal();

        if (totalPagado < total - 0.01) {
            toast.error(`Falta pagar ${formatBs(total - totalPagado)}`);
            return;
        }

        setProcesando(true);
        const numeroRecibo = generarNumeroRecibo();

        try {
            // Aquí se guarda en Firestore en producción
            // await guardarVenta({ items, metodoPago, total, tasaUsada: tarifaActual, ... });
            await new Promise((r) => setTimeout(r, 1000)); // Simulación

            toast.success(`¡Venta completada! Recibo ${numeroRecibo}`, {
                duration: 5000,
                icon: '✅',
            });

            setVentaCompletada(true);
        } catch (error) {
            toast.error('Error al procesar la venta');
        } finally {
            setProcesando(false);
        }
    };

    const nuevaVenta = () => {
        limpiarCarrito();
        setMetodosSeleccionados([]);
        setMostrarResumen(false);
        setVentaCompletada(false);
    };

    const enviarWhatsApp = () => {
        const config = { nombre: 'Mi Negocio', whatsapp: '' };
        const total = calcularTotal();
        const totalUSD = total / tarifaActual;
        const numeroRecibo = generarNumeroRecibo();

        const texto = `🧾 *RECIBO DE VENTA - ${config.nombre}*\n` +
            `Recibo: ${numeroRecibo}\n` +
            `Fecha: ${new Date().toLocaleString('es-VE')}\n\n` +
            `*PRODUCTOS:*\n` +
            items.map((item) => `• ${item.nombre} x${item.cantidad}: ${formatBs(item.subtotal)}`).join('\n') +
            `\n\n*TOTAL: ${formatBs(total)}*` +
            `\n(≈ ${formatUSD(totalUSD)})\n\n` +
            `¡Gracias por su compra! 🛒`;

        window.open(`https://wa.me/?text=${encodeURIComponent(texto)}`, '_blank');
    };

    return (
        <div className="flex flex-col lg:flex-row gap-4 h-full -m-6 p-0">

            {/* ============================
          PANEL IZQUIERDO: Catálogo de productos
          ============================ */}
            <div className="flex-1 flex flex-col bg-card border-r border-border overflow-hidden">
                {/* Header catálogo */}
                <div className="p-4 border-b border-border space-y-3">
                    <div className="flex items-center justify-between">
                        <h2 className="font-semibold flex items-center gap-2">
                            <Package className="w-4 h-4 text-blue-400" />
                            Catálogo de Productos
                        </h2>
                        {/* Selector de tasa */}
                        <div className="flex items-center gap-1 bg-muted rounded-lg p-1">
                            <button
                                className={cn(
                                    'px-3 py-1 rounded-md text-xs font-medium transition-all',
                                    tasaSeleccionada === 'bcv'
                                        ? 'bg-blue-600 text-white'
                                        : 'text-muted-foreground hover:text-foreground'
                                )}
                                onClick={() => { setTasaSeleccionada('bcv'); setTasaUsada(tasas.bcv); }}
                            >
                                BCV
                            </button>
                            <button
                                className={cn(
                                    'px-3 py-1 rounded-md text-xs font-medium transition-all',
                                    tasaSeleccionada === 'paralelo'
                                        ? 'bg-yellow-600 text-white'
                                        : 'text-muted-foreground hover:text-foreground'
                                )}
                                onClick={() => { setTasaSeleccionada('paralelo'); setTasaUsada(tasas.paralelo); }}
                            >
                                Paralela
                            </button>
                        </div>
                    </div>

                    {/* Buscador */}
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <input
                            type="text"
                            className="input-sistema pl-10"
                            placeholder="Buscar producto por nombre o código..."
                            value={busqueda}
                            onChange={(e) => setBusqueda(e.target.value)}
                        />
                        <Scan className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground cursor-pointer hover:text-foreground transition-colors" />
                    </div>
                </div>

                {/* Grid de productos */}
                <div className="flex-1 overflow-y-auto p-4">
                    <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-3">
                        {productosFiltrados.map((producto) => (
                            <button
                                key={producto.id}
                                onClick={() => agregarAlCarrito(producto)}
                                className="text-left p-3 bg-muted/30 border border-border rounded-xl hover:border-blue-500/50 hover:bg-blue-500/5 transition-all duration-200 group"
                            >
                                <div className="w-10 h-10 bg-blue-500/10 rounded-lg flex items-center justify-center mb-2 group-hover:bg-blue-500/20 transition-colors">
                                    <Package className="w-5 h-5 text-blue-400" />
                                </div>
                                <p className="text-sm font-medium truncate">{producto.nombre}</p>
                                <p className="text-xs text-muted-foreground">Cód: {producto.codigo}</p>
                                <p className="text-sm font-semibold text-blue-400 font-mono mt-1">
                                    {formatBs(producto.precio)}
                                </p>
                                <p className="text-xs text-muted-foreground font-mono">
                                    {formatUSD(producto.precio / tarifaActual)}
                                </p>
                                <div className="mt-1 flex items-center gap-1">
                                    <span className={cn(
                                        'text-xs',
                                        producto.stock < 10 ? 'text-red-400' : 'text-green-400'
                                    )}>
                                        Stock: {producto.stock}
                                    </span>
                                </div>
                            </button>
                        ))}
                    </div>

                    {productosFiltrados.length === 0 && (
                        <div className="text-center py-12 text-muted-foreground">
                            <Package className="w-12 h-12 mx-auto mb-3 opacity-30" />
                            <p>No se encontraron productos</p>
                        </div>
                    )}
                </div>
            </div>

            {/* ============================
          PANEL DERECHO: Carrito y Pago
          ============================ */}
            <div className="w-full lg:w-96 flex flex-col bg-card overflow-hidden">

                {/* Si la venta está completada */}
                {ventaCompletada ? (
                    <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
                        <div className="w-20 h-20 bg-green-500/20 rounded-full flex items-center justify-center mb-4">
                            <CheckCircle2 className="w-10 h-10 text-green-400" />
                        </div>
                        <h3 className="text-xl font-bold text-green-400 mb-2">¡Venta Completada!</h3>
                        <p className="text-muted-foreground text-sm mb-6">
                            Total cobrado: {formatBs(calcularTotal())}
                        </p>
                        <div className="flex flex-col gap-3 w-full">
                            <button className="btn-secondary justify-center" onClick={() => window.print()}>
                                <Printer className="w-4 h-4" />
                                Imprimir Recibo
                            </button>
                            <button className="btn-secondary justify-center text-green-400 border-green-500/30 hover:bg-green-500/10" onClick={enviarWhatsApp}>
                                <MessageCircle className="w-4 h-4" />
                                Enviar por WhatsApp
                            </button>
                            <button className="btn-primary justify-center" onClick={nuevaVenta}>
                                <ShoppingCart className="w-4 h-4" />
                                Nueva Venta
                            </button>
                        </div>
                    </div>
                ) : (
                    <>
                        {/* Header del carrito */}
                        <div className="p-4 border-b border-border">
                            <div className="flex items-center justify-between mb-2">
                                <h2 className="font-semibold flex items-center gap-2">
                                    <ShoppingCart className="w-4 h-4 text-blue-400" />
                                    Carrito
                                    {items.length > 0 && (
                                        <span className="badge badge-blue ml-1">{items.length}</span>
                                    )}
                                </h2>
                                {items.length > 0 && (
                                    <button
                                        onClick={limpiarCarrito}
                                        className="text-xs text-muted-foreground hover:text-red-400 transition-colors flex items-center gap-1"
                                    >
                                        <Trash2 className="w-3 h-3" />
                                        Vaciar
                                    </button>
                                )}
                            </div>
                        </div>

                        {/* Items del carrito */}
                        <div className="flex-1 overflow-y-auto p-4 space-y-2">
                            {items.length === 0 ? (
                                <div className="flex flex-col items-center justify-center h-40 text-muted-foreground">
                                    <ShoppingCart className="w-12 h-12 mb-3 opacity-20" />
                                    <p className="text-sm">Carrito vacío</p>
                                    <p className="text-xs mt-1">Haz clic en un producto para agregar</p>
                                </div>
                            ) : (
                                items.map((item) => (
                                    <div key={item.id} className="pos-item group">
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-medium truncate">{item.nombre}</p>
                                            <p className="text-xs text-muted-foreground">{formatBs(item.precio)}</p>
                                            {item.descuento > 0 && (
                                                <span className="badge badge-yellow text-xs mt-0.5">
                                                    -{item.descuento}%
                                                </span>
                                            )}
                                        </div>

                                        {/* Controles de cantidad */}
                                        <div className="flex items-center gap-2 flex-shrink-0">
                                            <button
                                                onClick={() => actualizarCantidad(item.id, item.cantidad - 1)}
                                                className="w-7 h-7 rounded-lg bg-muted hover:bg-red-500/20 hover:text-red-400 flex items-center justify-center transition-colors"
                                            >
                                                <Minus className="w-3 h-3" />
                                            </button>
                                            <span className="text-sm font-medium w-6 text-center">{item.cantidad}</span>
                                            <button
                                                onClick={() => actualizarCantidad(item.id, item.cantidad + 1)}
                                                className="w-7 h-7 rounded-lg bg-muted hover:bg-blue-500/20 hover:text-blue-400 flex items-center justify-center transition-colors"
                                            >
                                                <Plus className="w-3 h-3" />
                                            </button>
                                            <div className="text-right min-w-[70px]">
                                                <p className="text-sm font-semibold font-mono">{formatBs(item.subtotal)}</p>
                                                <p className="text-xs text-muted-foreground">{formatUSD(item.subtotal / tarifaActual)}</p>
                                            </div>
                                            <button
                                                onClick={() => quitarItem(item.id)}
                                                className="text-muted-foreground hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100"
                                            >
                                                <X className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>

                        {/* Resumen y métodos de pago */}
                        {items.length > 0 && (
                            <div className="flex-shrink-0 border-t border-border p-4 space-y-4">
                                {/* Descuento global */}
                                <div className="flex items-center gap-2">
                                    <Tag className="w-4 h-4 text-yellow-400" />
                                    <input
                                        type="number"
                                        className="input-sistema flex-1 text-sm"
                                        placeholder="Descuento global %"
                                        value={descuentoGlobalInput}
                                        onChange={(e) => {
                                            setDescuentoGlobalInput(e.target.value);
                                            setDescuentoGlobal(parseFloat(e.target.value) || 0);
                                        }}
                                        min="0"
                                        max="100"
                                    />
                                </div>

                                {/* Totales */}
                                <div className="space-y-1.5 text-sm">
                                    <div className="flex justify-between text-muted-foreground">
                                        <span>Subtotal</span>
                                        <span className="font-mono">{formatBs(calcularSubtotal())}</span>
                                    </div>
                                    {descuentoGlobal > 0 && (
                                        <div className="flex justify-between text-yellow-400">
                                            <span>Descuento ({descuentoGlobal}%)</span>
                                            <span className="font-mono">-{formatBs(calcularDescuento())}</span>
                                        </div>
                                    )}
                                    <div className="flex justify-between font-bold text-base border-t border-border pt-2">
                                        <span>TOTAL</span>
                                        <div className="text-right">
                                            <p className="font-mono text-blue-400">{formatBs(calcularTotal())}</p>
                                            <p className="text-xs text-muted-foreground font-mono">
                                                {formatUSD(calcularTotal() / tarifaActual)} ({tasaSeleccionada.toUpperCase()})
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                {/* Métodos de pago */}
                                <div className="space-y-3">
                                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                                        Métodos de Pago
                                    </p>

                                    {metodoPago.map((metodo, index) => (
                                        <MetodoPagoForm
                                            key={index}
                                            tipo={metodo.tipo}
                                            index={index}
                                            onActualizar={actualizarMetodoPago}
                                            onEliminar={quitarMetodoPago}
                                            totalPendiente={calcularTotal() - calcularTotalPagado() + metodo.monto}
                                        />
                                    ))}

                                    {/* Botones para agregar métodos */}
                                    <div className="grid grid-cols-3 gap-2">
                                        {[
                                            { tipo: 'punto_venta', icon: CreditCard, label: 'POS', color: 'text-blue-400' },
                                            { tipo: 'pago_movil', icon: Smartphone, label: 'Móvil', color: 'text-green-400' },
                                            { tipo: 'efectivo_bs', icon: Banknote, label: 'Bs', color: 'text-yellow-400' },
                                            { tipo: 'efectivo_usd', icon: DollarSign, label: 'USD', color: 'text-emerald-400' },
                                            { tipo: 'transferencia', icon: ArrowLeftRight, label: 'Transfer', color: 'text-cyan-400' },
                                            { tipo: 'efectivo_eur', icon: DollarSign, label: 'EUR', color: 'text-purple-400' },
                                        ].map((m) => (
                                            <button
                                                key={m.tipo}
                                                onClick={() => agregarMetodo(m.tipo)}
                                                className="flex flex-col items-center gap-1 p-2 bg-muted/30 border border-border rounded-lg hover:border-blue-500/40 hover:bg-blue-500/5 transition-all text-xs"
                                            >
                                                <m.icon className={`w-4 h-4 ${m.color}`} />
                                                <span className="text-muted-foreground">{m.label}</span>
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {/* Balance de pago */}
                                {metodoPago.length > 0 && (
                                    <div className="space-y-1 text-sm">
                                        <div className="flex justify-between">
                                            <span className="text-muted-foreground">Pagado</span>
                                            <span className={cn(
                                                'font-mono',
                                                calcularTotalPagado() >= calcularTotal() ? 'text-green-400' : 'text-red-400'
                                            )}>
                                                {formatBs(calcularTotalPagado())}
                                            </span>
                                        </div>
                                        {calcularVuelto() > 0 && (
                                            <div className="flex justify-between font-semibold text-green-400">
                                                <span>Vuelto</span>
                                                <span className="font-mono">{formatBs(calcularVuelto())}</span>
                                            </div>
                                        )}
                                        {calcularTotalPagado() < calcularTotal() && (
                                            <div className="flex justify-between font-semibold text-red-400">
                                                <span>Falta</span>
                                                <span className="font-mono">{formatBs(calcularTotal() - calcularTotalPagado())}</span>
                                            </div>
                                        )}
                                    </div>
                                )}

                                {/* Botón de confirmar venta */}
                                <button
                                    onClick={procesarVenta}
                                    disabled={procesando || items.length === 0}
                                    className={cn(
                                        'w-full btn-success justify-center text-sm font-semibold py-3',
                                        (procesando || items.length === 0) && 'opacity-50 cursor-not-allowed'
                                    )}
                                >
                                    {procesando ? (
                                        <>
                                            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                            Procesando...
                                        </>
                                    ) : (
                                        <>
                                            <CheckCircle2 className="w-4 h-4" />
                                            Confirmar Venta
                                        </>
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
