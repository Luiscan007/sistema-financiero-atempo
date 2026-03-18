'use client';

/**
 * app/pos/page.tsx
 * Punto de Venta — conectado a Firestore + modo offline real
 * - Productos desde Firestore (colección 'productos') + servicios ('servicios')
 * - Ventas se guardan en Firestore con useVentas
 * - Sin internet: guarda en IndexedDB y sincroniza al reconectar
 */

import { useState, useEffect, useCallback } from 'react';
import {
  Search, Plus, Minus, Trash2, CreditCard, Smartphone, Banknote,
  DollarSign, ArrowLeftRight, X, CheckCircle2, Printer,
  MessageCircle, ShoppingCart, Tag, ChevronDown, ChevronUp,
  Package, Scan, WifiOff, RefreshCw, AlertTriangle,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useCarritoStore } from '@/lib/store';
import { useTasas } from '@/components/providers/TasasProvider';
import { useVentas } from '@/lib/useVentas';
import { useProductos } from '@/lib/useProductos';
import { useServicios } from '@/lib/useServicios';
import {
  guardarVentaOffline,
  sincronizarVentas,
  contarVentasPendientes,
} from '@/lib/offline-queue';
import { formatBs, formatUSD, BANCOS_VENEZOLANOS, generarNumeroRecibo } from '@/lib/utils';
import { cn } from '@/lib/utils';
import type { PagoMetodo } from '@/lib/store';

// ── Tipo unificado de item vendible ─────────────────────────────────────────
interface ItemVendible {
  id: string;
  nombre: string;
  codigo: string;
  precioBs: number;
  stock?: number;
  tipo: 'producto' | 'servicio';
}

// ── Método de pago form ───────────────────────────────────────────────────────
function MetodoPagoForm({ tipo, index, onActualizar, onEliminar, totalPendiente }: {
  tipo: string; index: number;
  onActualizar: (i: number, m: PagoMetodo) => void;
  onEliminar: (i: number) => void;
  totalPendiente: number;
}) {
  const [datos, setDatos] = useState<any>({ tipo, monto: totalPendiente, tipoTarjeta: 'debito' });
  const actualizar = (campo: string, valor: any) => {
    const nd = { ...datos, [campo]: valor };
    setDatos(nd);
    onActualizar(index, nd as PagoMetodo);
  };

  return (
    <div className="bg-white/[0.03] border border-border rounded-xl p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {tipo === 'punto_venta'  && <CreditCard   className="w-4 h-4 text-blue-400" />}
          {tipo === 'pago_movil'   && <Smartphone   className="w-4 h-4 text-green-400" />}
          {tipo === 'efectivo_bs'  && <Banknote     className="w-4 h-4 text-yellow-400" />}
          {tipo === 'efectivo_usd' && <DollarSign   className="w-4 h-4 text-emerald-400" />}
          {tipo === 'efectivo_eur' && <DollarSign   className="w-4 h-4 text-purple-400" />}
          {tipo === 'transferencia'&& <ArrowLeftRight className="w-4 h-4 text-cyan-400" />}
          <span className="text-sm font-medium capitalize">{tipo.replace('_', ' ')}</span>
        </div>
        <button onClick={() => onEliminar(index)} className="text-muted-foreground hover:text-red-400 transition-colors">
          <X className="w-4 h-4" />
        </button>
      </div>

      <div>
        <label className="text-xs text-muted-foreground mb-1 block">Monto (Bs)</label>
        <input type="number" className="input-sistema"
          value={datos.monto}
          onChange={e => actualizar('monto', parseFloat(e.target.value) || 0)}
          placeholder="0.00" />
      </div>

      {tipo === 'punto_venta' && (
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Tipo</label>
            <select className="input-sistema" value={datos.tipoTarjeta} onChange={e => actualizar('tipoTarjeta', e.target.value)}>
              <option value="debito">Débito</option>
              <option value="credito">Crédito</option>
            </select>
          </div>
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Últimos 4</label>
            <input type="text" className="input-sistema" maxLength={4} value={datos.ultimosCuatro || ''} onChange={e => actualizar('ultimosCuatro', e.target.value)} placeholder="XXXX" />
          </div>
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">N° Aprobación</label>
            <input type="text" className="input-sistema" value={datos.aprobacion || ''} onChange={e => actualizar('aprobacion', e.target.value)} placeholder="Número" />
          </div>
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Banco</label>
            <select className="input-sistema" value={datos.bancoPOS || ''} onChange={e => actualizar('bancoPOS', e.target.value)}>
              <option value="">Seleccionar</option>
              {BANCOS_VENEZOLANOS.map(b => <option key={b} value={b}>{b}</option>)}
            </select>
          </div>
        </div>
      )}

      {tipo === 'pago_movil' && (
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Banco Origen</label>
            <select className="input-sistema" value={datos.bancoOrigen || ''} onChange={e => actualizar('bancoOrigen', e.target.value)}>
              <option value="">Seleccionar</option>
              {BANCOS_VENEZOLANOS.map(b => <option key={b} value={b}>{b}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Teléfono</label>
            <input type="tel" className="input-sistema" value={datos.telefonoCliente || ''} onChange={e => actualizar('telefonoCliente', e.target.value)} placeholder="04XX-XXX-XXXX" />
          </div>
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Referencia</label>
            <input type="text" className="input-sistema" value={datos.referencia || ''} onChange={e => actualizar('referencia', e.target.value)} placeholder="Referencia" />
          </div>
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Cédula</label>
            <input type="text" className="input-sistema" value={datos.cedula || ''} onChange={e => actualizar('cedula', e.target.value)} placeholder="V-XXXXXXXX" />
          </div>
        </div>
      )}

      {tipo === 'transferencia' && (
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Banco Destino</label>
            <select className="input-sistema" value={datos.bancoDestino || ''} onChange={e => actualizar('bancoDestino', e.target.value)}>
              <option value="">Seleccionar</option>
              {BANCOS_VENEZOLANOS.map(b => <option key={b} value={b}>{b}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Referencia</label>
            <input type="text" className="input-sistema" value={datos.referencia || ''} onChange={e => actualizar('referencia', e.target.value)} placeholder="Número" />
          </div>
        </div>
      )}

      {(tipo === 'efectivo_usd' || tipo === 'efectivo_eur') && (
        <div>
          <label className="text-xs text-muted-foreground mb-1 block">Monto en {tipo === 'efectivo_usd' ? 'USD' : 'EUR'}</label>
          <input type="number" className="input-sistema" value={datos.montoExtranjero || ''} onChange={e => actualizar('montoExtranjero', parseFloat(e.target.value) || 0)} placeholder="0.00" />
        </div>
      )}
    </div>
  );
}

// ── COMPONENTE PRINCIPAL ──────────────────────────────────────────────────────
export default function POSPage() {
  const [busqueda, setBusqueda]     = useState('');
  const [metodosSeleccionados, setMetodosSeleccionados] = useState<string[]>([]);
  const [descuentoGlobalInput, setDescuentoGlobalInput] = useState('0');
  const [ventaCompletada, setVentaCompletada] = useState(false);
  const [procesando, setProcesando] = useState(false);
  const [tasaSeleccionada, setTasaSeleccionada] = useState<'bcv' | 'paralelo'>('bcv');
  const [online, setOnline]         = useState(true);
  const [pendientes, setPendientes] = useState(0);
  const [sincronizando, setSincronizando] = useState(false);
  const [ultimoRecibo, setUltimoRecibo]   = useState('');
  const [tabActiva, setTabActiva]   = useState<'productos' | 'servicios'>('productos');

  const [hidratado, setHidratado] = useState(false);
  useEffect(() => setHidratado(true), []);

  const { tasas } = useTasas();
  const { guardarVenta } = useVentas();
  const { productos, cargando: cargandoP } = useProductos();
  const { servicios, cargando: cargandoS } = useServicios();

  const {
    items, agregarItem, quitarItem, actualizarCantidad,
    descuentoGlobal, setDescuentoGlobal,
    metodoPago, agregarMetodoPago, actualizarMetodoPago, quitarMetodoPago,
    calcularSubtotal, calcularDescuento, calcularTotal,
    calcularTotalPagado, calcularVuelto,
    limpiarCarrito, setTasaUsada,
  } = useCarritoStore();

  const tarifaActual = Math.max(1, tasaSeleccionada === 'bcv' ? (tasas.bcv || 1) : (tasas.paralelo || 1));

  // ── Detectar conexión ──────────────────────────────────────────────────────
  useEffect(() => {
    const goOnline = async () => {
      setOnline(true);
      // Intentar sincronizar ventas pendientes al recuperar conexión
      const count = await contarVentasPendientes();
      if (count > 0) {
        setSincronizando(true);
        const { exito, fallo } = await sincronizarVentas();
        setSincronizando(false);
        if (exito > 0) toast.success(`✅ ${exito} venta(s) offline sincronizada(s)`);
        if (fallo > 0) toast.error(`⚠ ${fallo} venta(s) no pudieron sincronizarse`);
        await actualizarPendientes();
      }
    };
    const goOffline = () => setOnline(false);

    setOnline(navigator.onLine);
    window.addEventListener('online',  goOnline);
    window.addEventListener('offline', goOffline);
    return () => {
      window.removeEventListener('online',  goOnline);
      window.removeEventListener('offline', goOffline);
    };
  }, []);

  // ── Contar ventas pendientes ───────────────────────────────────────────────
  const actualizarPendientes = async () => {
    const n = await contarVentasPendientes();
    setPendientes(n);
  };
  useEffect(() => { actualizarPendientes(); }, []);

  // ── Sincronizar manualmente ───────────────────────────────────────────────
  const sincronizarManual = async () => {
    if (!online) { toast.error('Sin conexión a internet'); return; }
    setSincronizando(true);
    const { exito, fallo } = await sincronizarVentas();
    setSincronizando(false);
    if (exito > 0) toast.success(`✅ ${exito} venta(s) sincronizada(s)`);
    if (fallo > 0) toast.error(`⚠ ${fallo} fallo(s) de sincronización`);
    await actualizarPendientes();
  };

  // ── Items vendibles ────────────────────────────────────────────────────────
  const productosVendibles: ItemVendible[] = productos
    .filter(p => p.activo)
    .map(p => ({
      id: p.id, nombre: p.nombre,
      codigo: p.codigo || p.id.slice(0, 6),
      precioBs: p.precioBs, stock: p.stock, tipo: 'producto',
    }));

  const serviciosVendibles: ItemVendible[] = servicios
    .filter(s => s.activo)
    .map(s => ({
      id: s.id, nombre: s.nombre,
      codigo: s.id.slice(0, 6),
      precioBs: s.precioUSD * (tarifaActual || 1),
      tipo: 'servicio',
    }));

  const itemsActivos = tabActiva === 'productos' ? productosVendibles : serviciosVendibles;
  const itemsFiltrados = itemsActivos.filter(p =>
    p.nombre.toLowerCase().includes(busqueda.toLowerCase()) ||
    p.codigo.toLowerCase().includes(busqueda.toLowerCase())
  );

  // ── Agregar al carrito ────────────────────────────────────────────────────
  const agregarAlCarrito = (item: ItemVendible) => {
    agregarItem({
      id: item.id,
      nombre: item.nombre,
      codigo: item.codigo,
      precio: item.precioBs,
      cantidad: 1,
      descuento: 0,
      subtotal: item.precioBs,
    });
    toast.success(`${item.nombre} agregado`, { duration: 1500 });
  };

  const agregarMetodo = (tipo: string) => {
    const totalPendiente = calcularTotal() - calcularTotalPagado();
    agregarMetodoPago({ tipo: tipo as any, monto: Math.max(0, totalPendiente) });
    setMetodosSeleccionados([...metodosSeleccionados, tipo]);
  };

  // ── Procesar venta ────────────────────────────────────────────────────────
  const procesarVenta = useCallback(async () => {
    if (items.length === 0)      { toast.error('El carrito está vacío'); return; }
    if (metodoPago.length === 0) { toast.error('Selecciona un método de pago'); return; }

    const totalPagado = calcularTotalPagado();
    const total       = calcularTotal();
    if (totalPagado < total - 0.01) {
      toast.error(`Falta pagar ${formatBs(total - totalPagado)}`);
      return;
    }

    setProcesando(true);
    const numeroRecibo = generarNumeroRecibo();
    const fecha        = new Date().toISOString().split('T')[0];
    const totalUSD     = total / (tarifaActual || 1);

    const datosVenta = {
      numeroRecibo,
      fecha,
      items: items.map(i => ({
        id:        i.id,
        nombre:    i.nombre,
        cantidad:  i.cantidad,
        precio:    i.precio,
        subtotal:  i.subtotal,
        descuento: i.descuento,
      })),
      subtotal:        calcularSubtotal(),
      descuentoGlobal: descuentoGlobal,
      montoDescuento:  calcularDescuento(),
      total,
      totalUSD,
      tasaUsada:       tarifaActual,
      tipoTasa:        tasaSeleccionada,
      metodoPago:      metodoPago.map(m => ({ tipo: m.tipo, monto: m.monto })),
      usuarioId:       'pos',
      usuarioNombre:   'Punto de Venta',
    };

    try {
      if (online) {
        // ✅ ONLINE: guardar directo en Firestore
        await guardarVenta(datosVenta);
        toast.success(`✅ Venta completada · Recibo ${numeroRecibo}`, { duration: 5000 });
      } else {
        // 📴 OFFLINE: guardar en IndexedDB
        await guardarVentaOffline({
          numeroRecibo,
          timestamp:     Date.now(),
          items:         datosVenta.items,
          totalBs:       total,
          totalUSD,
          tasaUsada:     tarifaActual,
          metodoPago:    datosVenta.metodoPago,
        });
        await actualizarPendientes();
        toast.success(`📴 Venta guardada offline · Se sincronizará al reconectar`, { duration: 6000, icon: '💾' });
      }
      setUltimoRecibo(numeroRecibo);
      setVentaCompletada(true);
    } catch (err: any) {
      // Si falla Firestore, guardar offline como respaldo
      try {
        await guardarVentaOffline({
          numeroRecibo, timestamp: Date.now(),
          items: datosVenta.items,
          totalBs: total, totalUSD,
          tasaUsada: tarifaActual,
          metodoPago: datosVenta.metodoPago,
        });
        await actualizarPendientes();
        toast.error(`Error de conexión — guardado offline como respaldo`, { duration: 5000 });
        setUltimoRecibo(numeroRecibo);
        setVentaCompletada(true);
      } catch {
        toast.error(`Error al procesar la venta: ${err.message}`);
      }
    } finally {
      setProcesando(false);
    }
  }, [items, metodoPago, online, calcularTotal, calcularTotalPagado, calcularSubtotal,
      calcularDescuento, descuentoGlobal, tarifaActual, tasaSeleccionada, guardarVenta]);

  const nuevaVenta = () => {
    limpiarCarrito();
    setMetodosSeleccionados([]);
    setVentaCompletada(false);
    setDescuentoGlobalInput('0');
  };

  const enviarWhatsApp = () => {
    const total    = calcularTotal();
    const totalUSD = total / (tarifaActual || 1);
    const texto = `🧾 *RECIBO ATEMPO*\nRecibo: ${ultimoRecibo}\nFecha: ${new Date().toLocaleString('es-VE')}\n\n*PRODUCTOS:*\n` +
      items.map(i => `• ${i.nombre} x${i.cantidad}: ${formatBs(i.subtotal)}`).join('\n') +
      `\n\n*TOTAL: ${formatBs(total)}*\n(≈ ${formatUSD(totalUSD)})\n\n¡Gracias! 🛒`;
    window.open(`https://wa.me/?text=${encodeURIComponent(texto)}`, '_blank');
  };

  const cargando = false; // No bloquear UI — los items aparecen cuando cargan

  if (!hidratado) return (
    <div className="flex items-center justify-center h-96">
      <RefreshCw className="w-6 h-6 animate-spin text-blue-400 mr-2" />
      <span className="text-muted-foreground">Cargando POS...</span>
    </div>
  );

  return (
    <div className="flex flex-col lg:flex-row gap-4 h-full -m-6 p-0">

      {/* ── PANEL IZQUIERDO: Catálogo ───────────────────────────────────── */}
      <div className="flex-1 flex flex-col bg-card border-r border-border overflow-hidden">

        {/* Header */}
        <div className="p-4 border-b border-border space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold flex items-center gap-2">
              <Package className="w-4 h-4 text-blue-400" />
              Catálogo
            </h2>
            <div className="flex items-center gap-2">
              {/* Badge ventas offline */}
              {pendientes > 0 && (
                <button onClick={sincronizarManual} disabled={sincronizando || !online}
                  className="flex items-center gap-1 text-xs px-2 py-1 rounded-lg bg-yellow-500/10 border border-yellow-500/30 text-yellow-400 hover:bg-yellow-500/20 transition-colors">
                  {sincronizando
                    ? <><RefreshCw className="w-3 h-3 animate-spin" /> Sincronizando...</>
                    : <><AlertTriangle className="w-3 h-3" /> {pendientes} offline</>
                  }
                </button>
              )}
              {/* Indicador online/offline */}
              {!online && (
                <span className="flex items-center gap-1 text-xs text-yellow-400 bg-yellow-500/10 px-2 py-1 rounded-lg border border-yellow-500/30">
                  <WifiOff className="w-3 h-3" /> Sin internet
                </span>
              )}
              {/* Selector tasa */}
              <div className="flex items-center gap-1 bg-muted rounded-lg p-1">
                {(['bcv', 'paralelo'] as const).map(t => (
                  <button key={t} onClick={() => { setTasaSeleccionada(t); setTasaUsada(t === 'bcv' ? tasas.bcv : tasas.paralelo); }}
                    className={cn('px-3 py-1 rounded-md text-xs font-medium transition-all',
                      tasaSeleccionada === t ? (t === 'bcv' ? 'bg-blue-600 text-white' : 'bg-yellow-600 text-white') : 'text-muted-foreground hover:text-foreground')}>
                    {t === 'bcv' ? 'BCV' : 'Paralela'}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Tabs productos / servicios */}
          <div className="flex gap-1 bg-muted rounded-lg p-1">
            <button onClick={() => setTabActiva('productos')}
              className={cn('flex-1 py-1.5 rounded-md text-xs font-medium transition-all',
                tabActiva === 'productos' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground')}>
              📦 Productos ({productosVendibles.length})
            </button>
            <button onClick={() => setTabActiva('servicios')}
              className={cn('flex-1 py-1.5 rounded-md text-xs font-medium transition-all',
                tabActiva === 'servicios' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground')}>
              🎓 Servicios ({serviciosVendibles.length})
            </button>
          </div>

          {/* Buscador */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input type="text" className="input-sistema pl-10"
              placeholder={`Buscar ${tabActiva}...`}
              value={busqueda} onChange={e => setBusqueda(e.target.value)} />
          </div>
        </div>

        {/* Grid items */}
        <div className="flex-1 overflow-y-auto p-4">
          {cargando ? (
            <div className="flex items-center justify-center py-12 text-muted-foreground">
              <RefreshCw className="w-5 h-5 animate-spin mr-2" /> Cargando catálogo...
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-3">
              {itemsFiltrados.map(item => (
                <button key={item.id} onClick={() => agregarAlCarrito(item)}
                  className="text-left p-3 bg-muted/30 border border-border rounded-xl hover:border-blue-500/50 hover:bg-blue-500/5 transition-all duration-200 group">
                  <div className="w-10 h-10 bg-blue-500/10 rounded-lg flex items-center justify-center mb-2 group-hover:bg-blue-500/20 transition-colors">
                    {item.tipo === 'servicio' ? <span className="text-lg">🎓</span> : <Package className="w-5 h-5 text-blue-400" />}
                  </div>
                  <p className="text-sm font-medium truncate">{item.nombre}</p>
                  <p className="text-xs text-muted-foreground">Cód: {item.codigo}</p>
                  <p className="text-sm font-semibold text-blue-400 font-mono mt-1">{formatBs(item.precioBs)}</p>
                  <p className="text-xs text-muted-foreground font-mono">{formatUSD(item.precioBs / (tarifaActual || 1))}</p>
                  {item.tipo === 'producto' && item.stock !== undefined && (
                    <span className={cn('text-xs', item.stock < 5 ? 'text-red-400' : 'text-green-400')}>
                      Stock: {item.stock}
                    </span>
                  )}
                </button>
              ))}
              {itemsFiltrados.length === 0 && !cargando && (
                <div className="col-span-4 text-center py-12 text-muted-foreground">
                  <Package className="w-12 h-12 mx-auto mb-3 opacity-30" />
                  <p>No se encontraron {tabActiva}</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ── PANEL DERECHO: Carrito ──────────────────────────────────────── */}
      <div className="w-full lg:w-96 flex flex-col bg-card overflow-hidden">

        {ventaCompletada ? (
          <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
            <div className="w-20 h-20 bg-green-500/20 rounded-full flex items-center justify-center mb-4">
              <CheckCircle2 className="w-10 h-10 text-green-400" />
            </div>
            <h3 className="text-xl font-bold text-green-400 mb-1">¡Venta Completada!</h3>
            {!online && <p className="text-xs text-yellow-400 mb-2">📴 Guardada offline — se sincronizará al reconectar</p>}
            <p className="text-muted-foreground text-sm mb-1">Recibo: {ultimoRecibo}</p>
            <p className="text-muted-foreground text-sm mb-6">Total: {formatBs(calcularTotal())}</p>
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
            <div className="p-4 border-b border-border">
              <div className="flex items-center justify-between">
                <h2 className="font-semibold flex items-center gap-2">
                  <ShoppingCart className="w-4 h-4 text-blue-400" />
                  Carrito
                  {items.length > 0 && <span className="badge badge-blue ml-1">{items.length}</span>}
                </h2>
                {items.length > 0 && (
                  <button onClick={limpiarCarrito} className="text-xs text-muted-foreground hover:text-red-400 transition-colors flex items-center gap-1">
                    <Trash2 className="w-3 h-3" /> Vaciar
                  </button>
                )}
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-2">
              {items.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-40 text-muted-foreground">
                  <ShoppingCart className="w-12 h-12 mb-3 opacity-20" />
                  <p className="text-sm">Carrito vacío</p>
                  <p className="text-xs mt-1">Selecciona un producto o servicio</p>
                </div>
              ) : (
                items.map(item => (
                  <div key={item.id} className="pos-item group">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{item.nombre}</p>
                      <p className="text-xs text-muted-foreground">{formatBs(item.precio)}</p>
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
                        <p className="text-sm font-semibold font-mono">{formatBs(item.subtotal)}</p>
                        <p className="text-xs text-muted-foreground">{formatUSD(item.subtotal / (tarifaActual || 1))}</p>
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

            {items.length > 0 && (
              <div className="flex-shrink-0 border-t border-border p-4 space-y-4">
                {/* Descuento */}
                <div className="flex items-center gap-2">
                  <Tag className="w-4 h-4 text-yellow-400" />
                  <input type="number" className="input-sistema flex-1 text-sm"
                    placeholder="Descuento global %" value={descuentoGlobalInput}
                    onChange={e => { setDescuentoGlobalInput(e.target.value); setDescuentoGlobal(parseFloat(e.target.value) || 0); }}
                    min="0" max="100" />
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
                        {formatUSD(calcularTotal() / (tarifaActual || 1))} ({tasaSeleccionada.toUpperCase()})
                      </p>
                    </div>
                  </div>
                </div>

                {/* Métodos de pago */}
                <div className="space-y-3">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Métodos de Pago</p>
                  {metodoPago.map((m, i) => (
                    <MetodoPagoForm key={i} tipo={m.tipo} index={i}
                      onActualizar={actualizarMetodoPago} onEliminar={quitarMetodoPago}
                      totalPendiente={calcularTotal() - calcularTotalPagado() + m.monto} />
                  ))}
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { tipo: 'punto_venta',  icon: CreditCard,    label: 'POS',     color: 'text-blue-400' },
                      { tipo: 'pago_movil',   icon: Smartphone,    label: 'Móvil',   color: 'text-green-400' },
                      { tipo: 'efectivo_bs',  icon: Banknote,      label: 'Bs',      color: 'text-yellow-400' },
                      { tipo: 'efectivo_usd', icon: DollarSign,    label: 'USD',     color: 'text-emerald-400' },
                      { tipo: 'transferencia',icon: ArrowLeftRight, label: 'Transfer',color: 'text-cyan-400' },
                      { tipo: 'efectivo_eur', icon: DollarSign,    label: 'EUR',     color: 'text-purple-400' },
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
                      <span className={cn('font-mono', calcularTotalPagado() >= calcularTotal() ? 'text-green-400' : 'text-red-400')}>
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

                {/* Botón confirmar */}
                <button onClick={procesarVenta}
                  disabled={procesando || items.length === 0}
                  className={cn('w-full btn-success justify-center text-sm font-semibold py-3',
                    (procesando || items.length === 0) && 'opacity-50 cursor-not-allowed')}>
                  {procesando ? (
                    <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Procesando...</>
                  ) : !online ? (
                    <><WifiOff className="w-4 h-4" /> Guardar Offline</>
                  ) : (
                    <><CheckCircle2 className="w-4 h-4" /> Confirmar Venta</>
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
