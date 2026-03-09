'use client';

/**
 * app/cuentas/page.tsx
 * Cuentas por cobrar - alumnos con saldo pendiente
 */

import { useState, useMemo } from 'react';
import {
    Plus, Search, X, CheckCircle2, Loader2, AlertCircle,
    Wallet, TrendingUp, Clock, User, Edit2, Trash2,
    ChevronDown, ChevronUp, DollarSign, Receipt,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { cn } from '@/lib/utils';
import { useCuentasCobrar } from '@/lib/useCuentasCobrar';
import { useAlumnos } from '@/lib/useAlumnos';
import { useTasas } from '@/components/providers/TasasProvider';
import type { CuentaCobrar, PagoCuenta, EstadoCuenta } from '@/lib/useCuentasCobrar';

const ESTADO_CONFIG: Record<EstadoCuenta, { label: string; color: string; bg: string }> = {
    pendiente: { label: 'Pendiente', color: 'text-amber-400',  bg: 'bg-amber-500/10 border-amber-500/25' },
    parcial:   { label: 'Parcial',   color: 'text-blue-400',   bg: 'bg-blue-500/10 border-blue-500/25' },
    vencida:   { label: 'Vencida',   color: 'text-red-400',    bg: 'bg-red-500/10 border-red-500/25' },
    pagado:    { label: 'Pagado',    color: 'text-emerald-400', bg: 'bg-emerald-500/10 border-emerald-500/25' },
};

const METODOS = ['Efectivo Bs', 'Efectivo USD', 'Transferencia', 'Pago Movil', 'Punto de Venta'];

/* ── Modal nueva cuenta ─────────────────── */
function ModalCuenta({
    cuenta, onCerrar, onGuardar,
}: {
    cuenta: Partial<CuentaCobrar> | null;
    onCerrar: () => void;
    onGuardar: (datos: Omit<CuentaCobrar, 'id' | 'fechaTimestamp'>) => void;
}) {
    const { alumnos } = useAlumnos();
    const { tasas }   = useTasas();
    const esEdicion   = !!(cuenta as any)?.id;

    const hoy = new Date().toISOString().split('T')[0];
    const en30 = new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0];

    const [form, setForm] = useState<Partial<CuentaCobrar>>(cuenta || {
        alumnoNombre: '', concepto: '',
        montoBs: 0, montoUSD: 0,
        montoPagado: 0, montoPagadoUSD: 0,
        fechaEmision: hoy, fechaVencimiento: en30,
        estado: 'pendiente', historialPagos: [],
    });
    const set = (k: string, v: any) => setForm(p => ({ ...p, [k]: v }));

    const seleccionarAlumno = (id: string) => {
        const a = alumnos.find(al => al.id === id);
        if (!a) return;
        setForm(p => ({ ...p, alumnoId: a.id, alumnoNombre: a.nombre }));
    };

    const guardar = () => {
        if (!form.alumnoNombre?.trim()) { toast.error('Selecciona o escribe el alumno'); return; }
        if (!form.concepto?.trim())     { toast.error('El concepto es requerido'); return; }
        if (!form.montoBs && !form.montoUSD) { toast.error('Ingresa el monto'); return; }
        onGuardar({
            alumnoId:         form.alumnoId || '',
            alumnoNombre:     form.alumnoNombre!.trim(),
            concepto:         form.concepto!.trim(),
            montoBs:          form.montoBs     || 0,
            montoUSD:         form.montoUSD    || 0,
            montoPagado:      form.montoPagado    || 0,
            montoPagadoUSD:   form.montoPagadoUSD || 0,
            fechaEmision:     form.fechaEmision  || hoy,
            fechaVencimiento: form.fechaVencimiento || en30,
            estado:           'pendiente',
            historialPagos:   [],
            notas:            form.notas || '',
        });
    };

    return (
        <div className="modal-overlay">
            <div className="glass-card w-full max-w-lg">
                <div className="flex items-center justify-between p-5 border-b border-border">
                    <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-blue-500/15 border border-blue-500/25 flex items-center justify-center">
                            <Receipt className="w-5 h-5 text-blue-400" />
                        </div>
                        <h3 className="font-semibold">{esEdicion ? 'Editar Cuenta' : 'Nueva Cuenta por Cobrar'}</h3>
                    </div>
                    <button onClick={onCerrar} className="p-1.5 hover:bg-muted rounded-lg text-muted-foreground transition-all">
                        <X className="w-4 h-4" />
                    </button>
                </div>
                <div className="p-5 space-y-4">
                    <div>
                        <label className="text-xs text-muted-foreground mb-1 block font-medium">Alumno *</label>
                        <select className="input-sistema" value={form.alumnoId || ''}
                            onChange={e => seleccionarAlumno(e.target.value)}>
                            <option value="">Seleccionar alumno...</option>
                            {alumnos.map(a => (
                                <option key={a.id} value={a.id}>{a.nombre}</option>
                            ))}
                        </select>
                        {!form.alumnoId && (
                            <input className="input-sistema mt-2" placeholder="O escribir nombre manualmente..."
                                value={form.alumnoNombre || ''}
                                onChange={e => set('alumnoNombre', e.target.value)} />
                        )}
                    </div>
                    <div>
                        <label className="text-xs text-muted-foreground mb-1 block font-medium">Concepto *</label>
                        <input className="input-sistema" placeholder="Ej: Paquete de clases mes de marzo..."
                            value={form.concepto || ''} onChange={e => set('concepto', e.target.value)} />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="text-xs text-muted-foreground mb-1 block font-medium">Monto USD</label>
                            <input type="number" className="input-sistema font-mono" placeholder="0.00"
                                value={form.montoUSD || ''}
                                onChange={e => {
                                    const usd = parseFloat(e.target.value) || 0;
                                    setForm(p => ({ ...p, montoUSD: usd, montoBs: Math.round(usd * (tasas.bcv || 1)) }));
                                }} />
                        </div>
                        <div>
                            <label className="text-xs text-muted-foreground mb-1 block font-medium">Monto Bs</label>
                            <input type="number" className="input-sistema font-mono" placeholder="0.00"
                                value={form.montoBs || ''}
                                onChange={e => {
                                    const bs = parseFloat(e.target.value) || 0;
                                    setForm(p => ({ ...p, montoBs: bs, montoUSD: Math.round((bs / (tasas.bcv || 1)) * 100) / 100 }));
                                }} />
                        </div>
                        <div>
                            <label className="text-xs text-muted-foreground mb-1 block font-medium">Fecha emision</label>
                            <input type="date" className="input-sistema" value={form.fechaEmision || hoy}
                                onChange={e => set('fechaEmision', e.target.value)} />
                        </div>
                        <div>
                            <label className="text-xs text-muted-foreground mb-1 block font-medium">Fecha vencimiento</label>
                            <input type="date" className="input-sistema" value={form.fechaVencimiento || en30}
                                onChange={e => set('fechaVencimiento', e.target.value)} />
                        </div>
                    </div>
                    <div>
                        <label className="text-xs text-muted-foreground mb-1 block font-medium">Notas</label>
                        <input className="input-sistema" placeholder="Observaciones..." value={form.notas || ''}
                            onChange={e => set('notas', e.target.value)} />
                    </div>
                    <div className="flex justify-end gap-3 pt-2">
                        <button onClick={onCerrar} className="btn-secondary">Cancelar</button>
                        <button onClick={guardar} className="btn-primary">
                            <CheckCircle2 className="w-4 h-4" />
                            {esEdicion ? 'Actualizar' : 'Crear Cuenta'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}

/* ── Modal registrar pago ───────────────── */
function ModalPago({
    cuenta, onCerrar, onPago,
}: {
    cuenta: CuentaCobrar;
    onCerrar: () => void;
    onPago: (pago: PagoCuenta) => void;
}) {
    const { tasas } = useTasas();
    const saldoUSD  = cuenta.montoUSD - cuenta.montoPagadoUSD;
    const saldoBs   = cuenta.montoBs  - cuenta.montoPagado;

    const [form, setForm] = useState({
        montoBs:    saldoBs,
        montoUSD:   saldoUSD,
        metodoPago: 'Transferencia',
        referencia: '',
        nota:       '',
        fecha:      new Date().toISOString().split('T')[0],
    });
    const set = (k: string, v: any) => setForm(p => ({ ...p, [k]: v }));

    const registrar = () => {
        if (!form.montoBs && !form.montoUSD) { toast.error('Ingresa el monto del pago'); return; }
        onPago({
            fecha:      form.fecha,
            montoBs:    form.montoBs,
            montoUSD:   form.montoUSD,
            metodoPago: form.metodoPago,
            referencia: form.referencia,
            nota:       form.nota,
        });
    };

    return (
        <div className="modal-overlay">
            <div className="glass-card w-full max-w-md">
                <div className="flex items-center justify-between p-5 border-b border-border">
                    <div>
                        <h3 className="font-semibold">Registrar Pago</h3>
                        <p className="text-xs text-muted-foreground mt-0.5">{cuenta.alumnoNombre}</p>
                    </div>
                    <button onClick={onCerrar} className="p-1.5 hover:bg-muted rounded-lg text-muted-foreground transition-all">
                        <X className="w-4 h-4" />
                    </button>
                </div>
                <div className="p-5 space-y-4">
                    {/* Saldo pendiente */}
                    <div className="p-3 rounded-xl bg-blue-500/10 border border-blue-500/20 text-sm">
                        <p className="text-muted-foreground text-xs mb-1">Saldo pendiente</p>
                        <p className="font-mono font-bold text-blue-400">
                            Bs {saldoBs.toLocaleString('es-VE', { minimumFractionDigits: 2 })}
                            <span className="text-xs font-normal text-muted-foreground ml-2">${saldoUSD.toFixed(2)}</span>
                        </p>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="text-xs text-muted-foreground mb-1 block font-medium">Monto USD</label>
                            <input type="number" className="input-sistema font-mono"
                                value={form.montoUSD || ''}
                                onChange={e => {
                                    const usd = parseFloat(e.target.value) || 0;
                                    setForm(p => ({ ...p, montoUSD: usd, montoBs: Math.round(usd * (tasas.bcv || 1)) }));
                                }} />
                        </div>
                        <div>
                            <label className="text-xs text-muted-foreground mb-1 block font-medium">Monto Bs</label>
                            <input type="number" className="input-sistema font-mono"
                                value={form.montoBs || ''}
                                onChange={e => {
                                    const bs = parseFloat(e.target.value) || 0;
                                    setForm(p => ({ ...p, montoBs: bs, montoUSD: Math.round((bs / (tasas.bcv || 1)) * 100) / 100 }));
                                }} />
                        </div>
                        <div>
                            <label className="text-xs text-muted-foreground mb-1 block font-medium">Metodo de pago</label>
                            <select className="input-sistema" value={form.metodoPago}
                                onChange={e => set('metodoPago', e.target.value)}>
                                {METODOS.map(m => <option key={m} value={m}>{m}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="text-xs text-muted-foreground mb-1 block font-medium">Fecha</label>
                            <input type="date" className="input-sistema" value={form.fecha}
                                onChange={e => set('fecha', e.target.value)} />
                        </div>
                        <div className="col-span-2">
                            <label className="text-xs text-muted-foreground mb-1 block font-medium">Referencia</label>
                            <input className="input-sistema" placeholder="N. de referencia o comprobante"
                                value={form.referencia} onChange={e => set('referencia', e.target.value)} />
                        </div>
                    </div>
                    <div className="flex justify-end gap-3 pt-2">
                        <button onClick={onCerrar} className="btn-secondary">Cancelar</button>
                        <button onClick={registrar} className="btn-success">
                            <CheckCircle2 className="w-4 h-4" /> Registrar Pago
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}

/* ── Fila de cuenta expandible ──────────── */
function FilaCuenta({
    cuenta, onPago, onEditar, onEliminar,
}: {
    cuenta:     CuentaCobrar;
    onPago:     () => void;
    onEditar:   () => void;
    onEliminar: () => void;
}) {
    const [expandida, setExpandida] = useState(false);
    const est   = ESTADO_CONFIG[cuenta.estado];
    const saldo = cuenta.montoBs - cuenta.montoPagado;
    const saldoUSD = cuenta.montoUSD - cuenta.montoPagadoUSD;
    const hoy   = new Date();
    const vence = new Date(cuenta.fechaVencimiento + 'T12:00:00');
    const diasRestantes = Math.ceil((vence.getTime() - hoy.getTime()) / 86400000);

    return (
        <>
            <tr className={cn('cursor-pointer hover:bg-muted/30 transition-all',
                cuenta.estado === 'vencida' && 'bg-red-500/5')}>
                <td onClick={() => setExpandida(!expandida)}>
                    <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-lg bg-blue-500/15 border border-blue-500/20 flex items-center justify-center text-xs font-bold text-blue-400">
                            {cuenta.alumnoNombre.charAt(0).toUpperCase()}
                        </div>
                        <div>
                            <p className="font-medium text-sm">{cuenta.alumnoNombre}</p>
                            <p className="text-xs text-muted-foreground">{cuenta.concepto}</p>
                        </div>
                    </div>
                </td>
                <td onClick={() => setExpandida(!expandida)} className="font-mono text-sm">
                    Bs {cuenta.montoBs.toLocaleString('es-VE', { minimumFractionDigits: 2 })}
                    <p className="text-xs text-muted-foreground">${cuenta.montoUSD.toFixed(2)}</p>
                </td>
                <td onClick={() => setExpandida(!expandida)}>
                    {cuenta.montoPagado > 0
                        ? <span className="font-mono text-sm text-emerald-400">
                            Bs {cuenta.montoPagado.toLocaleString('es-VE', { minimumFractionDigits: 2 })}
                          </span>
                        : <span className="text-muted-foreground text-sm">-</span>}
                </td>
                <td onClick={() => setExpandida(!expandida)}>
                    <span className={cn('font-mono text-sm font-semibold', saldo > 0 ? 'text-blue-400' : 'text-emerald-400')}>
                        Bs {saldo.toLocaleString('es-VE', { minimumFractionDigits: 2 })}
                    </span>
                    {saldoUSD > 0 && <p className="text-xs text-muted-foreground">${saldoUSD.toFixed(2)}</p>}
                </td>
                <td onClick={() => setExpandida(!expandida)}>
                    <div className="flex items-center gap-1.5">
                        {cuenta.estado === 'vencida' && <AlertCircle className="w-3.5 h-3.5 text-red-400" />}
                        <span className="text-xs text-muted-foreground font-mono">{cuenta.fechaVencimiento}</span>
                    </div>
                    {cuenta.estado !== 'pagado' && (
                        <p className={cn('text-xs mt-0.5',
                            diasRestantes < 0 ? 'text-red-400' :
                            diasRestantes <= 3 ? 'text-amber-400' : 'text-muted-foreground')}>
                            {diasRestantes < 0 ? `Vencida hace ${Math.abs(diasRestantes)}d` :
                             diasRestantes === 0 ? 'Vence hoy' :
                             `${diasRestantes}d restantes`}
                        </p>
                    )}
                </td>
                <td onClick={() => setExpandida(!expandida)}>
                    <span className={cn('text-xs px-2 py-0.5 rounded-full border font-medium', est.bg, est.color)}>
                        {est.label}
                    </span>
                </td>
                <td>
                    <div className="flex items-center gap-1">
                        {cuenta.estado !== 'pagado' && (
                            <button onClick={onPago}
                                className="px-2 py-1 text-xs btn-success rounded-lg">
                                <DollarSign className="w-3 h-3" />
                            </button>
                        )}
                        <button onClick={onEditar}
                            className="p-1.5 hover:bg-muted rounded-lg text-muted-foreground hover:text-foreground transition-all">
                            <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button onClick={onEliminar}
                            className="p-1.5 hover:bg-red-500/10 rounded-lg text-muted-foreground hover:text-red-400 transition-all">
                            <Trash2 className="w-3.5 h-3.5" />
                        </button>
                        <button onClick={() => setExpandida(!expandida)}
                            className="p-1.5 hover:bg-muted rounded-lg text-muted-foreground transition-all">
                            {expandida ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                        </button>
                    </div>
                </td>
            </tr>
            {/* Historial de pagos expandido */}
            {expandida && cuenta.historialPagos.length > 0 && (
                <tr className="bg-muted/20">
                    <td colSpan={7} className="p-3 pl-12">
                        <p className="text-xs font-medium text-muted-foreground mb-2">Historial de pagos</p>
                        <div className="space-y-1.5">
                            {cuenta.historialPagos.map((p, i) => (
                                <div key={i} className="flex items-center gap-4 text-xs">
                                    <span className="text-muted-foreground font-mono w-24">{p.fecha}</span>
                                    <span className="font-mono text-emerald-400">
                                        Bs {p.montoBs.toLocaleString('es-VE', { minimumFractionDigits: 2 })}
                                    </span>
                                    <span className="text-muted-foreground">{p.metodoPago}</span>
                                    {p.referencia && <span className="text-muted-foreground">Ref: {p.referencia}</span>}
                                </div>
                            ))}
                        </div>
                    </td>
                </tr>
            )}
        </>
    );
}

/* ── Pagina principal ───────────────────── */
export default function CuentasCobrarPage() {
    const {
        cuentas, cargando, pendientes, vencidas,
        totalPendiente, totalUSDPendiente,
        crearCuenta, registrarPago, actualizarCuenta, eliminarCuenta,
    } = useCuentasCobrar();

    const [busqueda,    setBusqueda]    = useState('');
    const [filtroEstado, setFiltroEstado] = useState<'todos' | EstadoCuenta>('todos');
    const [mostrarPagados, setMostrarPagados] = useState(false);
    const [modalCuenta, setModalCuenta] = useState<Partial<CuentaCobrar> | null | undefined>(undefined);
    const [modalPago,   setModalPago]   = useState<CuentaCobrar | null>(null);

    const cuentasFiltradas = useMemo(() => {
        return cuentas.filter(c => {
            if (!mostrarPagados && c.estado === 'pagado') return false;
            const matchBusqueda = !busqueda
                || c.alumnoNombre.toLowerCase().includes(busqueda.toLowerCase())
                || c.concepto.toLowerCase().includes(busqueda.toLowerCase());
            const matchEstado = filtroEstado === 'todos' || c.estado === filtroEstado;
            return matchBusqueda && matchEstado;
        });
    }, [cuentas, busqueda, filtroEstado, mostrarPagados]);

    const handleGuardar = async (datos: Omit<CuentaCobrar, 'id' | 'fechaTimestamp'>) => {
        try {
            const id = (modalCuenta as any)?.id;
            if (id) { await actualizarCuenta(id, datos); toast.success('Cuenta actualizada'); }
            else    { await crearCuenta(datos);          toast.success('Cuenta creada'); }
            setModalCuenta(undefined);
        } catch { toast.error('Error al guardar'); }
    };

    const handlePago = async (pago: PagoCuenta) => {
        if (!modalPago) return;
        try {
            await registrarPago(modalPago.id, pago, modalPago);
            toast.success('Pago registrado correctamente');
            setModalPago(null);
        } catch { toast.error('Error al registrar pago'); }
    };

    const handleEliminar = async (c: CuentaCobrar) => {
        if (!confirm(`Eliminar cuenta de ${c.alumnoNombre}?`)) return;
        try { await eliminarCuenta(c.id); toast.success('Cuenta eliminada'); }
        catch { toast.error('Error al eliminar'); }
    };

    if (cargando) return (
        <div className="flex items-center justify-center py-32">
            <Loader2 className="w-8 h-8 animate-spin text-blue-400" />
            <span className="ml-3 text-muted-foreground">Cargando cuentas...</span>
        </div>
    );

    return (
        <div className="space-y-6 animate-fade-in">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold">Cuentas por Cobrar</h1>
                    <p className="text-muted-foreground text-sm">{pendientes.length} pendientes</p>
                </div>
                <button onClick={() => setModalCuenta(null)} className="btn-primary">
                    <Plus className="w-4 h-4" /> Nueva Cuenta
                </button>
            </div>

            {/* KPIs */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="kpi-card">
                    <Wallet className="w-4 h-4 text-blue-400 mb-2" />
                    <p className="text-xl font-bold font-mono text-blue-400">
                        Bs {totalPendiente.toLocaleString('es-VE', { minimumFractionDigits: 0 })}
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
                    <Clock className="w-4 h-4 text-amber-400 mb-2" />
                    <p className="text-3xl font-bold font-mono text-amber-400">{pendientes.length}</p>
                    <p className="text-xs text-muted-foreground">Cuentas activas</p>
                </div>
                <div className="kpi-card">
                    <AlertCircle className="w-4 h-4 text-red-400 mb-2" />
                    <p className="text-3xl font-bold font-mono text-red-400">{vencidas.length}</p>
                    <p className="text-xs text-muted-foreground">Vencidas</p>
                </div>
            </div>

            {/* Alerta vencidas */}
            {vencidas.length > 0 && (
                <div className="flex items-center gap-3 p-4 rounded-xl bg-red-500/10 border border-red-500/25">
                    <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0" />
                    <p className="text-sm text-red-300">
                        <span className="font-semibold">{vencidas.length} cuenta{vencidas.length > 1 ? 's' : ''} vencida{vencidas.length > 1 ? 's' : ''}</span> — contacta a los alumnos para regularizar el pago.
                    </p>
                </div>
            )}

            {/* Filtros */}
            <div className="flex flex-wrap gap-3 items-center">
                <div className="relative flex-1 min-w-48">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <input className="input-sistema pl-10" placeholder="Buscar alumno o concepto..."
                        value={busqueda} onChange={e => setBusqueda(e.target.value)} />
                </div>
                <select className="input-sistema w-auto" value={filtroEstado}
                    onChange={e => setFiltroEstado(e.target.value as any)}>
                    <option value="todos">Todos</option>
                    <option value="pendiente">Pendientes</option>
                    <option value="parcial">Parciales</option>
                    <option value="vencida">Vencidas</option>
                    <option value="pagado">Pagadas</option>
                </select>
                <button onClick={() => setMostrarPagados(!mostrarPagados)}
                    className={cn('btn-secondary text-xs', mostrarPagados && 'border-blue-500/40 text-blue-400')}>
                    {mostrarPagados ? 'Ocultar pagados' : 'Mostrar pagados'}
                </button>
            </div>

            {/* Tabla */}
            {cuentasFiltradas.length === 0 ? (
                <div className="card-sistema p-16 text-center">
                    <Receipt className="w-12 h-12 text-muted-foreground/20 mx-auto mb-4" />
                    <p className="text-muted-foreground">
                        {cuentas.length === 0 ? 'No hay cuentas por cobrar registradas' : 'No hay cuentas con esos filtros'}
                    </p>
                    {cuentas.length === 0 && (
                        <button onClick={() => setModalCuenta(null)} className="btn-primary mt-4 mx-auto">
                            <Plus className="w-4 h-4" /> Crear primera cuenta
                        </button>
                    )}
                </div>
            ) : (
                <div className="card-sistema overflow-hidden p-0">
                    <div className="overflow-x-auto">
                        <table className="tabla-sistema">
                            <thead>
                                <tr>
                                    <th>Alumno / Concepto</th>
                                    <th>Total</th>
                                    <th>Pagado</th>
                                    <th>Saldo</th>
                                    <th>Vencimiento</th>
                                    <th>Estado</th>
                                    <th></th>
                                </tr>
                            </thead>
                            <tbody>
                                {cuentasFiltradas.map(c => (
                                    <FilaCuenta key={c.id} cuenta={c}
                                        onPago={() => setModalPago(c)}
                                        onEditar={() => setModalCuenta(c)}
                                        onEliminar={() => handleEliminar(c)}
                                    />
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {modalCuenta !== undefined && (
                <ModalCuenta cuenta={modalCuenta} onCerrar={() => setModalCuenta(undefined)} onGuardar={handleGuardar} />
            )}
            {modalPago && (
                <ModalPago cuenta={modalPago} onCerrar={() => setModalPago(null)} onPago={handlePago} />
            )}
        </div>
    );
}
