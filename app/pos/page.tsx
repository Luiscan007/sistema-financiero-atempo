'use client';

/**
 * app/pos/page.tsx
 * Punto de Venta — conectado a Firestore + modo offline real
 * - Productos desde Firestore (colección 'productos') + servicios ('servicios')
 * - Ventas se guardan en Firestore con useVentas
 * - Sin internet: guarda en IndexedDB y sincroniza al reconectar
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import {
  Search, Plus, Minus, Trash2, CreditCard, Smartphone, Banknote,
  DollarSign, ArrowLeftRight, X, CheckCircle2, Printer,
  MessageCircle, ShoppingCart, Tag, ChevronDown, ChevronUp,
  Package, Scan, WifiOff, RefreshCw, AlertTriangle, Camera, User, Upload, Loader2, ImageIcon,
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
import { storage } from '@/lib/firebase';
import { ref as storageRef, uploadBytes, getDownloadURL } from 'firebase/storage';
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
function MetodoPagoForm({ tipo, index, onActualizar, onEliminar, totalPendiente, tasa }: {
  tipo: string; index: number;
  onActualizar: (i: number, m: PagoMetodo) => void;
  onEliminar: (i: number) => void;
  totalPendiente: number;
  tasa: number;
}) {
  const [datos, setDatos] = useState<any>(() => {
    const isForeign = tipo === 'efectivo_usd' || tipo === 'efectivo_eur';
    return {
      tipo,
      monto: totalPendiente,
      montoExtranjero: isForeign ? Math.round((totalPendiente / tasa) * 100) / 100 : undefined,
      tipoTarjeta: 'debito'
    };
  });
  const [subiendoComprobante, setSubiendoComprobante] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const actualizar = (campo: string, valor: any) => {
    const nd = { ...datos, [campo]: valor };
    setDatos(nd);
    onActualizar(index, nd as PagoMetodo);
  };

  const handleMontoBsChange = (val: number) => {
    const isForeign = tipo === 'efectivo_usd' || tipo === 'efectivo_eur';
    const nd = {
      ...datos,
      monto: val,
      montoExtranjero: isForeign ? Math.round((val / tasa) * 100) / 100 : undefined
    };
    setDatos(nd);
    onActualizar(index, nd as PagoMetodo);
  };

  const handleMontoExtranjeroChange = (val: number) => {
    const nd = {
      ...datos,
      montoExtranjero: val,
      monto: Math.round(val * tasa * 100) / 100
    };
    setDatos(nd);
    onActualizar(index, nd as PagoMetodo);
  };

  // Quién paga y comprobante aplican a TODOS los métodos, incluido efectivo
  const esEfectivo = tipo === 'efectivo_bs' || tipo === 'efectivo_usd' || tipo === 'efectivo_eur';

  const subirComprobante = async (file: File) => {
    setSubiendoComprobante(true);
    try {
      const nombreArchivo = `comprobantes/${Date.now()}_${file.name}`;
      const ref = storageRef(storage, nombreArchivo);
      await uploadBytes(ref, file);
      const url = await getDownloadURL(ref);
      actualizar('comprobanteUrl', url);
      toast.success('Comprobante adjuntado');
    } catch (err: any) {
      toast.error('Error al subir comprobante: ' + err.message);
    } finally {
      setSubiendoComprobante(false);
    }
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
          onChange={e => handleMontoBsChange(parseFloat(e.target.value) || 0)}
          placeholder="0.00" />
      </div>

      {/* Campos universales: quién paga + referencia — para todo excepto efectivo */}
      {true && (
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs text-muted-foreground mb-1 flex items-center gap-1">
              <User className="w-3 h-3" /> Quién paga
            </label>
            <input type="text" className="input-sistema" value={datos.nombrePagador || ''}
              onChange={e => actualizar('nombrePagador', e.target.value)}
              placeholder="Nombre de quien realiza el pago" />
          </div>
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">N° Referencia {esEfectivo && '(opcional)'}</label>
            <input type="text" className="input-sistema" value={datos.numeroReferencia || ''}
              onChange={e => actualizar('numeroReferencia', e.target.value)}
              placeholder={esEfectivo ? 'Opcional — nota interna' : 'Referencia de la transacción'} />
          </div>
        </div>
      )}

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
          <input type="number" className="input-sistema" value={datos.montoExtranjero || ''} onChange={e => handleMontoExtranjeroChange(parseFloat(e.target.value) || 0)} placeholder="0.00" />
        </div>
      )}

      {/* Adjuntar captura de comprobante — para todo excepto efectivo */}
      {true && (
        <div>
          <label className="text-xs text-muted-foreground mb-1 flex items-center gap-1">
            <Camera className="w-3 h-3" /> {esEfectivo ? 'Foto del recibo/billete (opcional)' : 'Captura del comprobante'}
          </label>
          <input ref={fileRef} type="file" accept="image/*" className="hidden"
            onChange={e => { const f = e.target.files?.[0]; if (f) subirComprobante(f); }} />

          {datos.comprobanteUrl ? (
            <div className="relative group">
              <img src={datos.comprobanteUrl} alt="Comprobante"
                className="w-full h-24 object-cover rounded-lg border border-green-500/30" />
              <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg flex items-center justify-center gap-2">
                <button onClick={() => window.open(datos.comprobanteUrl, '_blank')}
                  className="text-xs bg-white/10 hover:bg-white/20 text-white px-2 py-1 rounded">Ver</button>
                <button onClick={() => fileRef.current?.click()}
                  className="text-xs bg-white/10 hover:bg-white/20 text-white px-2 py-1 rounded">Cambiar</button>
                <button onClick={() => actualizar('comprobanteUrl', '')}
                  className="text-xs bg-red-500/30 hover:bg-red-500/50 text-white px-2 py-1 rounded">Quitar</button>
              </div>
            </div>
          ) : (
            <button onClick={() => fileRef.current?.click()} disabled={subiendoComprobante}
              className="w-full border-2 border-dashed border-border rounded-lg py-3 flex flex-col items-center gap-1 text-muted-foreground hover:border-blue-500/40 hover:text-blue-400 transition-colors">
              {subiendoComprobante ? (
                <><Loader2 className="w-5 h-5 animate-spin" /><span className="text-xs">Subiendo...</span></>
              ) : (
                <><ImageIcon className="w-5 h-5" /><span className="text-xs">Click para adjuntar captura</span></>
              )}
            </button>
          )}
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
  const [tasaSeleccionada, setTasaSeleccionada] = useState<'bcv' | 'paralelo' | 'eur'>('eur');
  const [online, setOnline]         = useState(true);
  const [pendientes, setPendientes] = useState(0);
  const [sincronizando, setSincronizando] = useState(false);
  const [ultimoRecibo, setUltimoRecibo]   = useState('');
  const [tabActiva, setTabActiva]   = useState<'productos' | 'servicios'>('productos');
  const [ajusteRedondeo, setAjusteRedondeo] = useState(0);

  const [hidratado, setHidratado] = useState(false);
  const procesandoRef = useRef(false); // bloquea doble click
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

  const tarifaActual = Math.max(1,
    tasaSeleccionada === 'bcv'      ? (tasas.bcv || 1) :
    tasaSeleccionada === 'paralelo' ? (tasas.paralelo || 1) :
    (tasas.eurBcv || 1) // EUR BCV
  );

  const totalOriginal = calcularTotal();
  const total = Math.max(0, totalOriginal + ajusteRedondeo);
  const totalPagado = calcularTotalPagado();
  const vuelto = Math.max(0, totalPagado - total);
  const vueltoUSD = vuelto / (tarifaActual || 1);
  const falta = Math.max(0, total - totalPagado);
  const diferencia = totalPagado - totalOriginal;
  const puedeAjustar = items.length > 0 && totalPagado > 0 && ajusteRedondeo === 0 && Math.abs(diferencia) > 0.01 && Math.abs(diferencia) < 150;

  const aplicarAjuste = () => {
    setAjusteRedondeo(diferencia);
    toast.success('Total ajustado por redondeo');
  };

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
      precioBs: p.precioUSD * (tarifaActual || 1), stock: p.stock, tipo: 'producto',
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
    const totalPendiente = total - totalPagado;
    agregarMetodoPago({ tipo: tipo as any, monto: Math.max(0, totalPendiente) });
    setMetodosSeleccionados([...metodosSeleccionados, tipo]);
  };

  // ── Procesar venta ────────────────────────────────────────────────────────
  const procesarVenta = useCallback(async () => {
    if (procesandoRef.current) return; // evitar doble click
    procesandoRef.current = true;
    if (items.length === 0)      { procesandoRef.current = false; toast.error('El carrito está vacío'); return; }
    if (metodoPago.length === 0) { procesandoRef.current = false; toast.error('Selecciona un método de pago'); return; }

    const totalPagado = calcularTotalPagado();
    if (totalPagado < total - 0.01) {
      toast.error(`Falta pagar ${formatBs(total - totalPagado)}`);
      procesandoRef.current = false;
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
      metodoPago:      metodoPago.map(m => ({ ...m })), // incluye nombrePagador, numeroReferencia, comprobanteUrl, etc.
      usuarioId:       'pos',
      usuarioNombre:   'Punto de Venta',
      ajusteRedondeo,
    };

    try {
      if (online) {
        // ✅ ONLINE: guardar directo en Firestore
        await guardarVenta(datosVenta);
        toast.dismiss();
        toast.success(`✅ Venta completada · Recibo ${numeroRecibo}`, { duration: 5000, id: 'venta-ok' });
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
        toast.dismiss();
        toast.success(`📴 Venta guardada offline · Se sincronizará al reconectar`, { duration: 6000, icon: '💾', id: 'venta-offline' });
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
        toast.error(`Error de conexión — guardado offline como respaldo`, { duration: 5000, id: 'venta-fallback' });
        setUltimoRecibo(numeroRecibo);
        setVentaCompletada(true);
      } catch {
        toast.error(`Error al procesar la venta: ${err.message}`);
      }
    } finally {
      setProcesando(false);
      procesandoRef.current = false;
    }
  }, [items, metodoPago, online, total, calcularTotalPagado, calcularSubtotal,
      calcularDescuento, descuentoGlobal, tarifaActual, tasaSeleccionada, guardarVenta, ajusteRedondeo]);

  const nuevaVenta = () => {
    limpiarCarrito();
    setMetodosSeleccionados([]);
    setVentaCompletada(false);
    setDescuentoGlobalInput('0');
    setAjusteRedondeo(0);
  };

  const enviarWhatsApp = () => {
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
                {([['bcv', 'BCV', 'bg-blue-600'], ['paralelo', 'Paralela', 'bg-yellow-600'], ['eur', '€ EUR', 'bg-purple-600']] as const).map(([t, label, activeColor]) => (
                  <button key={t} onClick={() => { setTasaSeleccionada(t); setTasaUsada(t === 'bcv' ? tasas.bcv : t === 'paralelo' ? tasas.paralelo : (tasas.eurBcv || tasas.bcv)); }}
                    className={cn('px-3 py-1 rounded-md text-xs font-medium transition-all',
                      tasaSeleccionada === t ? `${activeColor} text-white` : 'text-muted-foreground hover:text-foreground')}>
                    {label}
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
            <p className="text-muted-foreground text-sm mb-6">Total: {formatBs(total)}</p>
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

            <div className="flex-1 overflow-y-auto">
            <div className="p-4 space-y-2">
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
            </div>{/* cierre items */}

            {items.length > 0 && (
              <div className="border-t border-border p-4 space-y-4">
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
                      <p className="font-mono text-blue-400">{formatBs(total)}</p>
                      <p className="text-xs text-muted-foreground font-mono">
                        {formatUSD(total / (tarifaActual || 1))} ({tasaSeleccionada.toUpperCase()})
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
                      totalPendiente={total - totalPagado + m.monto}
                      tasa={tarifaActual} />
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
                  <div className="space-y-1 text-sm bg-white/[0.02] border border-border/40 rounded-xl p-3">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Pagado</span>
                      <span className={cn('font-mono', totalPagado >= total ? 'text-green-400' : 'text-red-400')}>
                        {formatBs(totalPagado)}
                      </span>
                    </div>
                    {vuelto > 0 && (
                      <div className="flex justify-between font-semibold text-green-400">
                        <span>Vuelto</span>
                        <div className="text-right">
                          <p className="font-mono">{formatBs(vuelto)}</p>
                          <p className="text-[10px] text-muted-foreground font-mono">≈ {formatUSD(vueltoUSD)}</p>
                        </div>
                      </div>
                    )}
                    {falta > 0 && (
                      <div className="flex justify-between font-semibold text-red-400">
                        <span>Falta</span>
                        <span className="font-mono">{formatBs(falta)}</span>
                      </div>
                    )}
                    {puedeAjustar && (
                      <div className="pt-2 border-t border-border/40 mt-1 flex justify-end">
                        <button
                          onClick={aplicarAjuste}
                          className="px-2.5 py-1 text-[11px] font-semibold bg-blue-500/10 border border-blue-500/20 text-blue-400 hover:bg-blue-500/20 rounded-lg transition-all flex items-center gap-1"
                        >
                          <ArrowLeftRight className="w-3 h-3" />
                          Ajustar a Pago Exacto ({diferencia > 0 ? '+' : ''}{formatBs(diferencia)})
                        </button>
                      </div>
                    )}
                    {ajusteRedondeo !== 0 && (
                      <div className="pt-2 border-t border-border/40 mt-1 flex justify-between items-center text-xs text-muted-foreground">
                        <span>Redondeo: {ajusteRedondeo > 0 ? '+' : ''}{formatBs(ajusteRedondeo)}</span>
                        <button
                          onClick={() => setAjusteRedondeo(0)}
                          className="text-red-400 hover:underline"
                        >
                          Restablecer
                        </button>
                      </div>
                    )}
                  </div>
                )}

              </div>
            )}
            </div>{/* cierre scroll único */}

            {/* Botón confirmar — SIEMPRE fijo y visible, fuera del scroll */}
            {items.length > 0 && (
              <div className="flex-shrink-0 border-t border-border p-4 bg-card">
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
