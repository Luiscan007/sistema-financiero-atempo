'use client';

/**
 * app/gastos/page.tsx
 * Control de gastos de la academia - conectado a Firestore
 */

import { useState, useMemo } from 'react';
import {
    Plus, Search, Trash2, X, CheckCircle2, Loader2,
    TrendingDown, Wallet, Edit2, Calendar, Tag, Receipt,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { cn } from '@/lib/utils';
import { useTasas } from '@/components/providers/TasasProvider';
import { useGastos } from '@/lib/useGastos';
import type { Gasto, CategoriaGasto, MetodoPagoGasto } from '@/lib/useGastos';
import { LABEL_CATEGORIA, COLOR_CATEGORIA } from '@/lib/useGastos';

const METODOS_PAGO: Record<MetodoPagoGasto, string> = {
    efectivo_bs:  'Efectivo Bs',
    efectivo_usd: 'Efectivo USD',
    transferencia:'Transferencia',
    pago_movil:   'Pago Movil',
    punto_venta:  'Punto de Venta',
};

/* ── Modal nuevo/editar gasto ───────────── */
function ModalGasto({
    gasto, onCerrar, onGuardar,
}: {
    gasto:    Partial<Gasto> | null;
    onCerrar: () => void;
    onGuardar: (datos: Omit<Gasto, 'id' | 'fechaTimestamp'>) => void;
}) {
    const { tasas } = useTasas();
    const esEdicion = !!(gasto as any)?.id;

    const [form, setForm] = useState<Partial<Gasto>>(gasto || {
        descripcion: '',
        categoria:   'otro',
        montoBs:     0,
        montoUSD:    0,
        tasaUsada:   tasas.bcv || 0,
        metodoPago:  'transferencia',
        fecha:       new Date().toISOString().split('T')[0],
    });
    const set = (k: string, v: any) => setForm(p => ({ ...p, [k]: v }));

    const calcularBs = (usd: number) => Math.round(usd * (tasas.bcv || 1) * 100) / 100;
    const calcularUSD = (bs: number) => Math.round((bs / (tasas.bcv || 1)) * 100) / 100;

    const guardar = () => {
        if (!form.descripcion?.trim()) { toast.error('La descripcion es requerida'); return; }
        if (!form.montoBs && !form.montoUSD) { toast.error('Ingresa el monto'); return; }
        onGuardar({
            descripcion: form.descripcion!.trim(),
            categoria:   form.categoria   || 'otro',
            montoBs:     form.montoBs     || 0,
            montoUSD:    form.montoUSD     || 0,
            tasaUsada:   form.tasaUsada    || tasas.bcv || 0,
            metodoPago:  form.metodoPago   || 'transferencia',
            proveedor:   form.proveedor    || '',
            referencia:  form.referencia   || '',
            fecha:       form.fecha        || new Date().toISOString().split('T')[0],
            notas:       form.notas        || '',
        });
    };

    return (
        <div className="modal-overlay">
            <div className="glass-card w-full max-w-lg max-h-[90vh] overflow-y-auto">
                <div className="flex items-center justify-between p-5 border-b border-border">
                    <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-red-500/15 border border-red-500/25 flex items-center justify-center">
                            <TrendingDown className="w-5 h-5 text-red-400" />
                        </div>
                        <h3 className="font-semibold">{esEdicion ? 'Editar Gasto' : 'Registrar Gasto'}</h3>
                    </div>
                    <button onClick={onCerrar} className="p-1.5 hover:bg-muted rounded-lg text-muted-foreground transition-all">
                        <X className="w-4 h-4" />
                    </button>
                </div>
                <div className="p-5 space-y-4">
                    <div>
                        <label className="text-xs text-muted-foreground mb-1 block font-medium">Descripcion *</label>
                        <input className="input-sistema" value={form.descripcion || ''}
                            onChange={e => set('descripcion', e.target.value)}
                            placeholder="Ej: Pago de alquiler local, compra de materiales..." />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="text-xs text-muted-foreground mb-1 block font-medium">Categoria</label>
                            <select className="input-sistema" value={form.categoria || 'otro'}
                                onChange={e => set('categoria', e.target.value)}>
                                {(Object.keys(LABEL_CATEGORIA) as CategoriaGasto[]).map(k => (
                                    <option key={k} value={k}>{LABEL_CATEGORIA[k]}</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="text-xs text-muted-foreground mb-1 block font-medium">Metodo de pago</label>
                            <select className="input-sistema" value={form.metodoPago || 'transferencia'}
                                onChange={e => set('metodoPago', e.target.value)}>
                                {(Object.keys(METODOS_PAGO) as MetodoPagoGasto[]).map(k => (
                                    <option key={k} value={k}>{METODOS_PAGO[k]}</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="text-xs text-muted-foreground mb-1 block font-medium">Monto USD</label>
                            <input type="number" className="input-sistema font-mono" placeholder="0.00"
                                value={form.montoUSD || ''}
                                onChange={e => {
                                    const usd = parseFloat(e.target.value) || 0;
                                    setForm(p => ({ ...p, montoUSD: usd, montoBs: calcularBs(usd), tasaUsada: tasas.bcv }));
                                }} />
                        </div>
                        <div>
                            <label className="text-xs text-muted-foreground mb-1 block font-medium">Monto Bs</label>
                            <input type="number" className="input-sistema font-mono" placeholder="0.00"
                                value={form.montoBs || ''}
                                onChange={e => {
                                    const bs = parseFloat(e.target.value) || 0;
                                    setForm(p => ({ ...p, montoBs: bs, montoUSD: calcularUSD(bs), tasaUsada: tasas.bcv }));
                                }} />
                        </div>
                        <div>
                            <label className="text-xs text-muted-foreground mb-1 block font-medium">Proveedor</label>
                            <input className="input-sistema" value={form.proveedor || ''}
                                onChange={e => set('proveedor', e.target.value)} placeholder="Nombre del proveedor" />
                        </div>
                        <div>
                            <label className="text-xs text-muted-foreground mb-1 block font-medium">Fecha</label>
                            <input type="date" className="input-sistema" value={form.fecha || ''}
                                onChange={e => set('fecha', e.target.value)} />
                        </div>
                        <div className="col-span-2">
                            <label className="text-xs text-muted-foreground mb-1 block font-medium">Referencia / Comprobante</label>
                            <input className="input-sistema" value={form.referencia || ''}
                                onChange={e => set('referencia', e.target.value)} placeholder="N. de referencia o factura" />
                        </div>
                    </div>
                    <div className="flex justify-end gap-3 pt-2">
                        <button onClick={onCerrar} className="btn-secondary">Cancelar</button>
                        <button onClick={guardar} className="btn-danger">
                            <CheckCircle2 className="w-4 h-4" />
                            {esEdicion ? 'Actualizar' : 'Registrar Gasto'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}

/* ── Pagina principal ───────────────────── */
export default function GastosPage() {
    const { gastos, cargando, crearGasto, actualizarGasto, eliminarGasto } = useGastos();
    const { tasas } = useTasas();

    const [busqueda,   setBusqueda]   = useState('');
    const [filtroMes,  setFiltroMes]  = useState('');
    const [filtroCat,  setFiltroCat]  = useState<'todas' | CategoriaGasto>('todas');
    const [modalGasto, setModalGasto] = useState<Partial<Gasto> | null | undefined>(undefined);

    const gastosFiltrados = useMemo(() => {
        return gastos.filter(g => {
            const matchBusqueda = !busqueda
                || g.descripcion.toLowerCase().includes(busqueda.toLowerCase())
                || (g.proveedor || '').toLowerCase().includes(busqueda.toLowerCase());
            const matchCat = filtroCat === 'todas' || g.categoria === filtroCat;
            const matchMes = !filtroMes || (g.fecha || '').startsWith(filtroMes);
            return matchBusqueda && matchCat && matchMes;
        });
    }, [gastos, busqueda, filtroCat, filtroMes]);

    const totalBs  = gastosFiltrados.reduce((a, g) => a + (g.montoBs  || 0), 0);
    const totalUSD = gastosFiltrados.reduce((a, g) => a + (g.montoUSD || 0), 0);

    // Gastos por categoria para resumen
    const porCategoria = useMemo(() => {
        const map: Record<string, number> = {};
        gastosFiltrados.forEach(g => {
            map[g.categoria] = (map[g.categoria] || 0) + (g.montoBs || 0);
        });
        return Object.entries(map).sort((a, b) => b[1] - a[1]).slice(0, 5);
    }, [gastosFiltrados]);

    const handleGuardar = async (datos: Omit<Gasto, 'id' | 'fechaTimestamp'>) => {
        try {
            const id = (modalGasto as any)?.id;
            if (id) {
                await actualizarGasto(id, datos);
                toast.success('Gasto actualizado');
            } else {
                await crearGasto(datos);
                toast.success('Gasto registrado');
            }
            setModalGasto(undefined);
        } catch { toast.error('Error al guardar'); }
    };

    const handleEliminar = async (g: Gasto) => {
        if (!confirm('Eliminar este gasto?')) return;
        try { await eliminarGasto(g.id); toast.success('Gasto eliminado'); }
        catch { toast.error('Error al eliminar'); }
    };

    if (cargando) return (
        <div className="flex items-center justify-center py-32">
            <Loader2 className="w-8 h-8 animate-spin text-red-400" />
            <span className="ml-3 text-muted-foreground">Cargando gastos...</span>
        </div>
    );

    return (
        <div className="space-y-6 animate-fade-in">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold">Gastos</h1>
                    <p className="text-muted-foreground text-sm">{gastosFiltrados.length} registros</p>
                </div>
                <button onClick={() => setModalGasto(null)} className="btn-danger">
                    <Plus className="w-4 h-4" /> Registrar Gasto
                </button>
            </div>

            {/* KPIs */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="kpi-card">
                    <TrendingDown className="w-4 h-4 text-red-400 mb-2" />
                    <p className="text-xl font-bold font-mono text-red-400">
                        Bs {totalBs.toLocaleString('es-VE', { minimumFractionDigits: 2 })}
                    </p>
                    <p className="text-xs text-muted-foreground">Total gastos (Bs)</p>
                </div>
                <div className="kpi-card">
                    <Wallet className="w-4 h-4 text-amber-400 mb-2" />
                    <p className="text-xl font-bold font-mono text-amber-400">
                        ${totalUSD.toLocaleString('es-VE', { minimumFractionDigits: 2 })}
                    </p>
                    <p className="text-xs text-muted-foreground">Total gastos (USD)</p>
                </div>
                <div className="kpi-card col-span-2">
                    <Tag className="w-4 h-4 text-muted-foreground mb-2" />
                    <div className="space-y-1">
                        {porCategoria.length === 0
                            ? <p className="text-muted-foreground text-xs">Sin datos</p>
                            : porCategoria.map(([cat, monto]) => (
                                <div key={cat} className="flex items-center justify-between text-xs">
                                    <div className="flex items-center gap-1.5">
                                        <div className="w-2 h-2 rounded-full" style={{ background: COLOR_CATEGORIA[cat as CategoriaGasto] || '#64748b' }} />
                                        <span className="text-muted-foreground">{LABEL_CATEGORIA[cat as CategoriaGasto] || cat}</span>
                                    </div>
                                    <span className="font-mono font-medium">
                                        Bs {monto.toLocaleString('es-VE', { minimumFractionDigits: 0 })}
                                    </span>
                                </div>
                            ))}
                    </div>
                </div>
            </div>

            {/* Filtros */}
            <div className="flex flex-wrap gap-3">
                <div className="relative flex-1 min-w-48">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <input className="input-sistema pl-10" placeholder="Buscar por descripcion o proveedor..."
                        value={busqueda} onChange={e => setBusqueda(e.target.value)} />
                </div>
                <input type="month" className="input-sistema w-auto"
                    value={filtroMes} onChange={e => setFiltroMes(e.target.value)} />
                <select className="input-sistema w-auto" value={filtroCat}
                    onChange={e => setFiltroCat(e.target.value as any)}>
                    <option value="todas">Todas las categorias</option>
                    {(Object.keys(LABEL_CATEGORIA) as CategoriaGasto[]).map(k => (
                        <option key={k} value={k}>{LABEL_CATEGORIA[k]}</option>
                    ))}
                </select>
            </div>

            {/* Tabla */}
            {gastosFiltrados.length === 0 ? (
                <div className="card-sistema p-16 text-center">
                    <TrendingDown className="w-12 h-12 text-muted-foreground/20 mx-auto mb-4" />
                    <p className="text-muted-foreground">
                        {gastos.length === 0 ? 'Aun no hay gastos registrados' : 'No hay gastos con esos filtros'}
                    </p>
                </div>
            ) : (
                <div className="card-sistema overflow-hidden p-0">
                    <div className="overflow-x-auto">
                        <table className="tabla-sistema">
                            <thead>
                                <tr>
                                    <th>Descripcion</th>
                                    <th>Categoria</th>
                                    <th>Proveedor</th>
                                    <th>Metodo</th>
                                    <th>Monto (Bs)</th>
                                    <th>Monto (USD)</th>
                                    <th>Fecha</th>
                                    <th></th>
                                </tr>
                            </thead>
                            <tbody>
                                {gastosFiltrados.map(g => (
                                    <tr key={g.id}>
                                        <td>
                                            <p className="font-medium text-sm">{g.descripcion}</p>
                                            {g.referencia && <p className="text-xs text-muted-foreground">Ref: {g.referencia}</p>}
                                        </td>
                                        <td>
                                            <span className="inline-flex items-center gap-1.5 text-xs px-2 py-0.5 rounded-full border"
                                                style={{
                                                    background: COLOR_CATEGORIA[g.categoria] + '18',
                                                    borderColor: COLOR_CATEGORIA[g.categoria] + '40',
                                                    color: COLOR_CATEGORIA[g.categoria],
                                                }}>
                                                <div className="w-1.5 h-1.5 rounded-full" style={{ background: COLOR_CATEGORIA[g.categoria] }} />
                                                {LABEL_CATEGORIA[g.categoria] || g.categoria}
                                            </span>
                                        </td>
                                        <td className="text-sm text-muted-foreground">{g.proveedor || '-'}</td>
                                        <td className="text-xs text-muted-foreground">{METODOS_PAGO[g.metodoPago] || g.metodoPago}</td>
                                        <td className="font-mono text-sm text-red-400">
                                            Bs {(g.montoBs || 0).toLocaleString('es-VE', { minimumFractionDigits: 2 })}
                                        </td>
                                        <td className="font-mono text-sm text-muted-foreground">
                                            ${(g.montoUSD || 0).toLocaleString('es-VE', { minimumFractionDigits: 2 })}
                                        </td>
                                        <td className="text-xs text-muted-foreground whitespace-nowrap">{g.fecha}</td>
                                        <td>
                                            <div className="flex items-center gap-1">
                                                <button onClick={() => setModalGasto(g)}
                                                    className="p-1.5 hover:bg-muted rounded-lg text-muted-foreground hover:text-foreground transition-all">
                                                    <Edit2 className="w-3.5 h-3.5" />
                                                </button>
                                                <button onClick={() => handleEliminar(g)}
                                                    className="p-1.5 hover:bg-red-500/10 rounded-lg text-muted-foreground hover:text-red-400 transition-all">
                                                    <Trash2 className="w-3.5 h-3.5" />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {modalGasto !== undefined && (
                <ModalGasto
                    gasto={modalGasto}
                    onCerrar={() => setModalGasto(undefined)}
                    onGuardar={handleGuardar}
                />
            )}
        </div>
    );
}
