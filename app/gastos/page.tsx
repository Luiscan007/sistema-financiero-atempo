'use client';

/**
 * app/gastos/page.tsx
 * Módulo de gastos con categorías, comprobantes y gastos recurrentes
 */

import { useState } from 'react';
import {
    Plus, Search, Trash2, Edit2, X, CheckCircle2, Upload,
    TrendingDown, Calendar, Filter, Download, Repeat,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useTasas } from '@/components/providers/TasasProvider';
import { formatBs, formatUSD, CATEGORIAS_GASTOS, BANCOS_VENEZOLANOS, formatFecha } from '@/lib/utils';
import { cn } from '@/lib/utils';

interface Gasto {
    id: string;
    categoria: string;
    descripcion: string;
    proveedor?: string;
    montoBs: number;
    montoUSD: number;
    tasaUsada: number;
    metodoPago: string;
    referencia?: string;
    fecha: string;
    recurrente: boolean;
    comprobante?: string;
}

const GASTOS_DEMO: Gasto[] = [
    { id: '1', categoria: 'Alquiler', descripcion: 'Alquiler local comercial Enero', montoBs: 250000, montoUSD: 6172, tasaUsada: 40.50, metodoPago: 'transferencia', fecha: '2024-03-01', recurrente: true },
    { id: '2', categoria: 'Nómina / Sueldos', descripcion: 'Nómina quincenal empleados', montoBs: 180000, montoUSD: 4444, tasaUsada: 40.50, metodoPago: 'transferencia', fecha: '2024-03-01', recurrente: true },
    { id: '3', categoria: 'Servicios Básicos (Luz, Agua, Gas)', descripcion: 'Factura de electricidad CORPOELEC', montoBs: 12500, montoUSD: 308, tasaUsada: 40.50, metodoPago: 'efectivo_bs', fecha: '2024-03-03', recurrente: false },
    { id: '4', categoria: 'Proveedores / Mercancía', descripcion: 'Compra de mercancía Distribuidora ABC', proveedor: 'Distribuidora ABC', montoBs: 350000, montoUSD: 8641, tasaUsada: 40.50, metodoPago: 'punto_venta', referencia: 'REF-2024-001', fecha: '2024-03-05', recurrente: false },
    { id: '5', categoria: 'Internet / Telefonía', descripcion: 'Factura Movistar/CANTV', montoBs: 8000, montoUSD: 197, tasaUsada: 40.50, metodoPago: 'pago_movil', fecha: '2024-03-05', recurrente: true },
    { id: '6', categoria: 'Impuestos y Tasas', descripcion: 'Declaración SENIAT mensual', montoBs: 25000, montoUSD: 617, tasaUsada: 40.50, metodoPago: 'transferencia', fecha: '2024-03-07', recurrente: false },
];

const METODOS_PAGO_GASTO = ['efectivo_bs', 'efectivo_usd', 'transferencia', 'pago_movil', 'punto_venta', 'cheque'];

function ModalGasto({
    gasto,
    onCerrar,
    onGuardar,
    tasaBCV,
}: {
    gasto: Partial<Gasto> | null;
    onCerrar: () => void;
    onGuardar: (g: Gasto) => void;
    tasaBCV: number;
}) {
    const [form, setForm] = useState<Partial<Gasto>>(gasto || {
        categoria: '', descripcion: '', montoBs: 0, metodoPago: 'transferencia',
        fecha: new Date().toISOString().split('T')[0], recurrente: false,
    });

    const actualizar = (campo: string, valor: any) => {
        const nuevo = { ...form, [campo]: valor };
        // Auto-calcular USD cuando cambia BS
        if (campo === 'montoBs') {
            nuevo.montoUSD = valor / tasaBCV;
            nuevo.tasaUsada = tasaBCV;
        }
        setForm(nuevo);
    };

    const guardar = () => {
        if (!form.descripcion || !form.montoBs || !form.categoria) {
            toast.error('Completa los campos requeridos');
            return;
        }
        onGuardar({
            ...form,
            id: (gasto as any)?.id || Date.now().toString(),
            montoUSD: (form.montoBs || 0) / tasaBCV,
            tasaUsada: tasaBCV,
        } as Gasto);
        toast.success('Gasto guardado');
        onCerrar();
    };

    return (
        <div className="modal-overlay">
            <div className="glass-card w-full max-w-xl">
                <div className="flex items-center justify-between p-6 border-b border-border">
                    <h3 className="text-lg font-semibold">
                        {(gasto as any)?.id ? 'Editar Gasto' : 'Registrar Gasto'}
                    </h3>
                    <button onClick={onCerrar} className="text-muted-foreground hover:text-foreground">
                        <X className="w-5 h-5" />
                    </button>
                </div>
                <div className="p-6 space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="col-span-2">
                            <label className="text-xs text-muted-foreground mb-1 block">Categoría *</label>
                            <select
                                className="input-sistema"
                                value={form.categoria || ''}
                                onChange={(e) => actualizar('categoria', e.target.value)}
                            >
                                <option value="">Seleccionar categoría...</option>
                                {CATEGORIAS_GASTOS.map((c) => <option key={c} value={c}>{c}</option>)}
                            </select>
                        </div>
                        <div className="col-span-2">
                            <label className="text-xs text-muted-foreground mb-1 block">Descripción *</label>
                            <input
                                className="input-sistema"
                                value={form.descripcion || ''}
                                onChange={(e) => actualizar('descripcion', e.target.value)}
                                placeholder="Descripción del gasto..."
                            />
                        </div>
                        <div>
                            <label className="text-xs text-muted-foreground mb-1 block">Monto (Bs) *</label>
                            <input
                                type="number"
                                className="input-sistema font-mono"
                                value={form.montoBs || ''}
                                onChange={(e) => actualizar('montoBs', parseFloat(e.target.value) || 0)}
                                placeholder="0.00"
                            />
                            {form.montoBs && (
                                <p className="text-xs text-blue-400 font-mono mt-0.5">
                                    ≈ {formatUSD((form.montoBs || 0) / tasaBCV)} (tasa BCV: {tasaBCV})
                                </p>
                            )}
                        </div>
                        <div>
                            <label className="text-xs text-muted-foreground mb-1 block">Método de pago</label>
                            <select
                                className="input-sistema"
                                value={form.metodoPago || ''}
                                onChange={(e) => actualizar('metodoPago', e.target.value)}
                            >
                                {METODOS_PAGO_GASTO.map((m) => (
                                    <option key={m} value={m}>{m.replace('_', ' ')}</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="text-xs text-muted-foreground mb-1 block">Proveedor</label>
                            <input
                                className="input-sistema"
                                value={form.proveedor || ''}
                                onChange={(e) => actualizar('proveedor', e.target.value)}
                                placeholder="Nombre del proveedor"
                            />
                        </div>
                        <div>
                            <label className="text-xs text-muted-foreground mb-1 block">Referencia</label>
                            <input
                                className="input-sistema"
                                value={form.referencia || ''}
                                onChange={(e) => actualizar('referencia', e.target.value)}
                                placeholder="Número de referencia"
                            />
                        </div>
                        <div>
                            <label className="text-xs text-muted-foreground mb-1 block">Fecha</label>
                            <input
                                type="date"
                                className="input-sistema"
                                value={form.fecha || ''}
                                onChange={(e) => actualizar('fecha', e.target.value)}
                            />
                        </div>
                        <div className="flex items-center gap-2 mt-4">
                            <div
                                className={cn(
                                    'w-10 h-6 rounded-full cursor-pointer transition-colors flex items-center px-0.5',
                                    form.recurrente ? 'bg-blue-500 justify-end' : 'bg-muted justify-start'
                                )}
                                onClick={() => actualizar('recurrente', !form.recurrente)}
                            >
                                <div className="w-5 h-5 bg-white rounded-full shadow-md" />
                            </div>
                            <span className="text-sm flex items-center gap-1">
                                <Repeat className="w-3.5 h-3.5 text-blue-400" />
                                Gasto fijo mensual
                            </span>
                        </div>
                    </div>
                    <div className="flex justify-end gap-3 pt-2">
                        <button onClick={onCerrar} className="btn-secondary">Cancelar</button>
                        <button onClick={guardar} className="btn-primary">
                            <CheckCircle2 className="w-4 h-4" />
                            Guardar Gasto
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default function GastosPage() {
    const { tasas } = useTasas();
    const [gastos, setGastos] = useState<Gasto[]>(GASTOS_DEMO);
    const [busqueda, setBusqueda] = useState('');
    const [categoriaFiltro, setCategoriaFiltro] = useState('Todas');
    const [modalGasto, setModalGasto] = useState<Partial<Gasto> | null | undefined>(undefined);

    const gastosFiltrados = gastos.filter((g) => {
        const matchBusqueda = g.descripcion.toLowerCase().includes(busqueda.toLowerCase()) ||
            (g.proveedor?.toLowerCase().includes(busqueda.toLowerCase()) ?? false);
        const matchCategoria = categoriaFiltro === 'Todas' || g.categoria === categoriaFiltro;
        return matchBusqueda && matchCategoria;
    });

    const totalBs = gastosFiltrados.reduce((acc, g) => acc + g.montoBs, 0);
    const totalUSD = gastosFiltrados.reduce((acc, g) => acc + g.montoUSD, 0);

    const guardarGasto = (gasto: Gasto) => {
        const existe = gastos.find((g) => g.id === gasto.id);
        if (existe) {
            setGastos(gastos.map((g) => g.id === gasto.id ? gasto : g));
        } else {
            setGastos([...gastos, gasto]);
        }
    };

    const eliminarGasto = (id: string) => {
        setGastos(gastos.filter((g) => g.id !== id));
        toast.success('Gasto eliminado');
    };

    return (
        <div className="space-y-6 animate-fade-in">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold">Libro de Gastos</h1>
                    <p className="text-muted-foreground text-sm">
                        Total: {formatBs(totalBs)} · {formatUSD(totalUSD)}
                    </p>
                </div>
                <div className="flex gap-2">
                    <button className="btn-secondary text-sm">
                        <Download className="w-4 h-4" /> Exportar
                    </button>
                    <button className="btn-primary text-sm" onClick={() => setModalGasto({})}>
                        <Plus className="w-4 h-4" /> Registrar Gasto
                    </button>
                </div>
            </div>

            {/* Resumen por categoría */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {['Alquiler', 'Nómina / Sueldos', 'Proveedores / Mercancía', 'Servicios Básicos (Luz, Agua, Gas)'].map((cat) => {
                    const total = gastos
                        .filter((g) => g.categoria === cat)
                        .reduce((acc, g) => acc + g.montoBs, 0);
                    return (
                        <div key={cat} className="kpi-card">
                            <TrendingDown className="w-4 h-4 text-red-400 mb-2" />
                            <p className="text-lg font-bold font-mono text-red-400">{formatBs(total)}</p>
                            <p className="text-xs text-muted-foreground">{cat.split(' ')[0]}</p>
                        </div>
                    );
                })}
            </div>

            {/* Filtros */}
            <div className="flex flex-wrap gap-3">
                <div className="relative flex-1 min-w-48">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <input
                        className="input-sistema pl-10"
                        placeholder="Buscar gastos..."
                        value={busqueda}
                        onChange={(e) => setBusqueda(e.target.value)}
                    />
                </div>
                <select
                    className="input-sistema w-auto"
                    value={categoriaFiltro}
                    onChange={(e) => setCategoriaFiltro(e.target.value)}
                >
                    <option value="Todas">Todas las categorías</option>
                    {CATEGORIAS_GASTOS.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
            </div>

            {/* Tabla */}
            <div className="card-sistema overflow-hidden p-0">
                <div className="overflow-x-auto">
                    <table className="tabla-sistema">
                        <thead>
                            <tr>
                                <th>Fecha</th>
                                <th>Categoría</th>
                                <th>Descripción</th>
                                <th>Proveedor</th>
                                <th>Método Pago</th>
                                <th>Monto (Bs)</th>
                                <th>Monto (USD)</th>
                                <th>Tipo</th>
                                <th>Acciones</th>
                            </tr>
                        </thead>
                        <tbody>
                            {gastosFiltrados.map((gasto) => (
                                <tr key={gasto.id}>
                                    <td className="text-xs text-muted-foreground font-mono">{formatFecha(gasto.fecha)}</td>
                                    <td><span className="badge badge-red text-xs">{gasto.categoria.split(' ')[0]}</span></td>
                                    <td className="max-w-xs">
                                        <p className="text-sm truncate">{gasto.descripcion}</p>
                                        {gasto.referencia && (
                                            <p className="text-xs text-muted-foreground font-mono">Ref: {gasto.referencia}</p>
                                        )}
                                    </td>
                                    <td className="text-sm text-muted-foreground">{gasto.proveedor || '-'}</td>
                                    <td>
                                        <span className="badge badge-gray text-xs">
                                            {gasto.metodoPago.replace('_', ' ')}
                                        </span>
                                    </td>
                                    <td className="font-mono text-sm text-red-400">{formatBs(gasto.montoBs)}</td>
                                    <td className="font-mono text-sm text-muted-foreground">{formatUSD(gasto.montoUSD)}</td>
                                    <td>
                                        {gasto.recurrente ? (
                                            <span className="badge badge-blue text-xs flex items-center gap-1 w-fit">
                                                <Repeat className="w-2.5 h-2.5" /> Fijo
                                            </span>
                                        ) : (
                                            <span className="text-xs text-muted-foreground">Único</span>
                                        )}
                                    </td>
                                    <td>
                                        <div className="flex items-center gap-2">
                                            <button
                                                className="text-muted-foreground hover:text-blue-400 transition-colors"
                                                onClick={() => setModalGasto(gasto)}
                                            >
                                                <Edit2 className="w-4 h-4" />
                                            </button>
                                            <button
                                                className="text-muted-foreground hover:text-red-400 transition-colors"
                                                onClick={() => eliminarGasto(gasto.id)}
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {modalGasto !== undefined && (
                <ModalGasto
                    gasto={modalGasto}
                    onCerrar={() => setModalGasto(undefined)}
                    onGuardar={guardarGasto}
                    tasaBCV={tasas.bcv}
                />
            )}
        </div>
    );
}
