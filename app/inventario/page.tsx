'use client';

/**
 * app/inventario/page.tsx
 * Catalogo de servicios: paquetes de clases y alquiler de espacios
 */

import { useState } from 'react';
import {
    Plus, Search, Edit2, Trash2, Tag, Clock,
    BookOpen, Home, CheckCircle2, X, DollarSign,
    Users, Calendar, ToggleLeft, ToggleRight, Loader2,
} from 'lucide-react';
import { useTasas } from '@/components/providers/TasasProvider';
import { cn } from '@/lib/utils';
import { useServicios } from '@/lib/useServicios';
import type { Servicio, TipoServicio } from '@/lib/useServicios';
import toast from 'react-hot-toast';

const CATEGORIAS_DEFAULT: string[] = [];

function formatUSD(n: number) {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2 }).format(n);
}
function formatBs(n: number) {
    return new Intl.NumberFormat('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n) + ' Bs';
}

function BadgeTipo({ tipo }: { tipo: TipoServicio }) {
    if (tipo === 'paquete_clases') {
        return (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-blue-500/15 text-blue-400 border border-blue-500/20">
                <BookOpen className="w-3 h-3" /> Paquete
            </span>
        );
    }
    return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-purple-500/15 text-purple-400 border border-purple-500/20">
            <Home className="w-3 h-3" /> Alquiler
        </span>
    );
}

// ─── Modal crear / editar servicio ────────────────────────────────────────────

function ModalServicio({
    servicio,
    onCerrar,
    onGuardar,
    tasaBCV,
    categorias,
    onNuevaCategoria,
}: {
    servicio: Partial<Servicio> | null;
    onCerrar: () => void;
    onGuardar: (s: Servicio) => void;
    tasaBCV: number;
    categorias: string[];
    onNuevaCategoria: (c: string) => void;
}) {
    const esEdicion = !!(servicio as Servicio)?.id;
    const [form, setForm] = useState<Partial<Servicio>>(servicio || {
        nombre: '',
        tipo: 'paquete_clases',
        categoria: '',
        descripcion: '',
        precioUSD: 0,
        clasesIncluidas: undefined,
        frecuenciaSemana: undefined,
        vigenciaDias: 30,
        duracionHoras: undefined,
        activo: true,
    });
    const [nuevaCat, setNuevaCat] = useState('');
    const [mostrarNuevaCat, setMostrarNuevaCat] = useState(false);

    const set = (campo: keyof Servicio, valor: unknown) =>
        setForm(prev => ({ ...prev, [campo]: valor }));

    const preciosBs = (form.precioUSD || 0) * tasaBCV;

    const guardar = () => {
        if (!form.nombre?.trim()) { toast.error('Ingresa el nombre del servicio'); return; }
        if (!form.precioUSD || form.precioUSD <= 0) { toast.error('El precio debe ser mayor a 0'); return; }
        // Para servicios nuevos pasamos id vacio - el hook detecta esto y usa addDoc
        // Para edicion pasamos el id existente - el hook usa updateDoc
        onGuardar({
            ...form,
            id: (servicio as Servicio)?.id || '',
            fechaCreacion: (servicio as Servicio)?.fechaCreacion || '',
        } as Servicio);
        onCerrar();
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <div className="bg-card border border-border rounded-2xl w-full max-w-lg shadow-2xl max-h-[90vh] overflow-y-auto">

                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-border">
                    <h3 className="text-lg font-semibold">
                        {esEdicion ? 'Editar Servicio' : 'Nuevo Servicio'}
                    </h3>
                    <button onClick={onCerrar} className="p-1.5 hover:bg-muted rounded-lg transition-colors">
                        <X className="w-4 h-4" />
                    </button>
                </div>

                <div className="p-6 space-y-5">

                    {/* Tipo de servicio */}
                    <div>
                        <label className="text-xs text-muted-foreground mb-2 block">Tipo de servicio</label>
                        <div className="grid grid-cols-2 gap-3">
                            {([
                                { value: 'paquete_clases', label: 'Paquete de Clases', icon: BookOpen, color: 'blue' },
                                { value: 'alquiler', label: 'Alquiler de Espacio', icon: Home, color: 'purple' },
                            ] as const).map(({ value, label, icon: Icon, color }) => (
                                <button
                                    key={value}
                                    type="button"
                                    onClick={() => set('tipo', value)}
                                    className={cn(
                                        'flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all text-sm font-medium',
                                        form.tipo === value
                                            ? color === 'blue'
                                                ? 'border-blue-500 bg-blue-500/10 text-blue-400'
                                                : 'border-purple-500 bg-purple-500/10 text-purple-400'
                                            : 'border-border text-muted-foreground hover:border-muted-foreground'
                                    )}
                                >
                                    <Icon className="w-5 h-5" />
                                    {label}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Nombre */}
                    <div>
                        <label className="text-xs text-muted-foreground mb-1 block">Nombre del servicio *</label>
                        <input
                            className="input-sistema"
                            placeholder={form.tipo === 'paquete_clases' ? 'Ej: Mensualidad 4 clases/semana' : 'Ej: Alquiler salon principal 1h'}
                            value={form.nombre || ''}
                            onChange={e => set('nombre', e.target.value)}
                        />
                    </div>

                    {/* Categoria */}
                    <div>
                        <label className="text-xs text-muted-foreground mb-1 block">Categoria</label>
                        {!mostrarNuevaCat ? (
                            <div className="flex gap-2">
                                <select
                                    className="input-sistema flex-1"
                                    value={form.categoria || ''}
                                    onChange={e => set('categoria', e.target.value)}
                                >
                                    <option value="">Sin categoria</option>
                                    {categorias.map(c => <option key={c} value={c}>{c}</option>)}
                                </select>
                                <button type="button" onClick={() => setMostrarNuevaCat(true)}
                                    className="px-3 py-2 bg-blue-500/10 border border-blue-500/30 text-blue-400 rounded-lg text-xs hover:bg-blue-500/20 transition-all whitespace-nowrap">
                                    + Nueva
                                </button>
                            </div>
                        ) : (
                            <div className="flex gap-2">
                                <input className="input-sistema flex-1" placeholder="Nombre de categoria..."
                                    value={nuevaCat} onChange={e => setNuevaCat(e.target.value)}
                                    onKeyDown={e => {
                                        if (e.key === 'Enter' && nuevaCat.trim()) {
                                            onNuevaCategoria(nuevaCat.trim());
                                            set('categoria', nuevaCat.trim());
                                            setNuevaCat(''); setMostrarNuevaCat(false);
                                        }
                                        if (e.key === 'Escape') setMostrarNuevaCat(false);
                                    }} autoFocus />
                                <button type="button" onClick={() => {
                                    if (nuevaCat.trim()) { onNuevaCategoria(nuevaCat.trim()); set('categoria', nuevaCat.trim()); setNuevaCat(''); }
                                    setMostrarNuevaCat(false);
                                }} className="px-3 py-2 bg-green-500/10 border border-green-500/30 text-green-400 rounded-lg text-xs hover:bg-green-500/20">
                                    Agregar
                                </button>
                                <button type="button" onClick={() => { setMostrarNuevaCat(false); setNuevaCat(''); }}
                                    className="px-3 py-2 bg-red-500/10 border border-red-500/30 text-red-400 rounded-lg text-xs hover:bg-red-500/20">
                                    X
                                </button>
                            </div>
                        )}
                    </div>

                    {/* Descripcion */}
                    <div>
                        <label className="text-xs text-muted-foreground mb-1 block">Descripcion</label>
                        <textarea className="input-sistema resize-none" rows={2}
                            placeholder="Describe que incluye este servicio..."
                            value={form.descripcion || ''}
                            onChange={e => set('descripcion', e.target.value)} />
                    </div>

                    {/* PRECIO - USD con conversion a Bs */}
                    <div className="border border-border rounded-xl p-4 bg-muted/20">
                        <h4 className="text-sm font-semibold mb-3 flex items-center gap-2">
                            <DollarSign className="w-4 h-4 text-green-400" />
                            Precio
                        </h4>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="text-xs text-muted-foreground mb-1 block">Precio (USD) *</label>
                                <div className="relative">
                                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-green-400 text-sm font-bold">$</span>
                                    <input
                                        type="number"
                                        min="0"
                                        step="0.01"
                                        className="input-sistema pl-7"
                                        placeholder="0.00"
                                        value={form.precioUSD || ''}
                                        onChange={e => set('precioUSD', parseFloat(e.target.value) || 0)}
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="text-xs text-muted-foreground mb-1 block">Equivale en Bs (BCV)</label>
                                <div className="input-sistema bg-muted/40 flex items-center font-mono text-sm text-amber-400 font-semibold cursor-default select-none">
                                    {preciosBs > 0 ? formatBs(preciosBs) : '0.00 Bs'}
                                </div>
                                <p className="text-xs text-muted-foreground mt-1">
                                    Tasa: {tasaBCV.toFixed(2)} Bs/$
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Campos especificos segun tipo */}
                    {form.tipo === 'paquete_clases' ? (
                        <div className="border border-border rounded-xl p-4 bg-muted/20">
                            <h4 className="text-sm font-semibold mb-3 flex items-center gap-2">
                                <BookOpen className="w-4 h-4 text-blue-400" />
                                Detalles del paquete
                            </h4>
                            <div className="grid grid-cols-3 gap-3">
                                <div>
                                    <label className="text-xs text-muted-foreground mb-1 block">N. de clases</label>
                                    <input type="number" min="0" className="input-sistema"
                                        placeholder="0"
                                        value={form.clasesIncluidas || ''}
                                        onChange={e => set('clasesIncluidas', parseInt(e.target.value) || undefined)} />
                                </div>
                                <div>
                                    <label className="text-xs text-muted-foreground mb-1 block">Clases/semana</label>
                                    <input type="number" min="1" max="7" className="input-sistema"
                                        placeholder="0"
                                        value={form.frecuenciaSemana || ''}
                                        onChange={e => set('frecuenciaSemana', parseInt(e.target.value) || undefined)} />
                                </div>
                                <div>
                                    <label className="text-xs text-muted-foreground mb-1 block">Vigencia (dias)</label>
                                    <input type="number" min="1" className="input-sistema"
                                        placeholder="30"
                                        value={form.vigenciaDias || ''}
                                        onChange={e => set('vigenciaDias', parseInt(e.target.value) || undefined)} />
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="border border-border rounded-xl p-4 bg-muted/20">
                            <h4 className="text-sm font-semibold mb-3 flex items-center gap-2">
                                <Clock className="w-4 h-4 text-purple-400" />
                                Detalles del alquiler
                            </h4>
                            <div>
                                <label className="text-xs text-muted-foreground mb-1 block">Duracion (horas)</label>
                                <input type="number" min="0.5" step="0.5" className="input-sistema w-1/2"
                                    placeholder="1"
                                    value={form.duracionHoras || ''}
                                    onChange={e => set('duracionHoras', parseFloat(e.target.value) || undefined)} />
                                <p className="text-xs text-muted-foreground mt-1">El precio se aplica por esta duracion</p>
                            </div>
                        </div>
                    )}

                    {/* Activo toggle */}
                    <div className={cn(
                        'flex items-center justify-between p-3 rounded-xl border transition-all',
                        form.activo
                            ? 'bg-green-500/10 border-green-500/30'
                            : 'bg-red-500/10 border-red-500/30'
                    )}>
                        <div>
                            <p className={cn('text-sm font-semibold', form.activo ? 'text-green-400' : 'text-red-400')}>
                                {form.activo ? 'Activo' : 'Inactivo'}
                            </p>
                            <p className="text-xs text-muted-foreground">
                                {form.activo
                                    ? 'Visible en el Punto de Venta'
                                    : 'NO aparece en el Punto de Venta'}
                            </p>
                        </div>
                        <button type="button" onClick={() => set('activo', !form.activo)}
                            className={cn(
                                'relative w-12 h-6 rounded-full transition-all duration-300',
                                form.activo ? 'bg-green-500' : 'bg-muted'
                            )}>
                            <span className={cn(
                                'absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-all duration-300',
                                form.activo ? 'left-7' : 'left-1'
                            )} />
                        </button>
                    </div>
                </div>

                {/* Footer */}
                <div className="flex gap-3 p-6 border-t border-border">
                    <button onClick={onCerrar} className="flex-1 btn-secondary py-2.5 text-sm justify-center">
                        Cancelar
                    </button>
                    <button onClick={guardar} className="flex-1 btn-primary py-2.5 text-sm justify-center">
                        <CheckCircle2 className="w-4 h-4" />
                        {esEdicion ? 'Guardar cambios' : 'Crear Servicio'}
                    </button>
                </div>
            </div>
        </div>
    );
}

export default function CatalogoPage() {
    const { tasas } = useTasas();
    const { servicios, cargando, guardarServicio, eliminarServicio } = useServicios();
    const [busqueda, setBusqueda] = useState('');
    const [filtroTipo, setFiltroTipo] = useState<'todos' | TipoServicio>('todos');
    const [filtroCategoria, setFiltroCategoria] = useState('Todos');
    const [filtroActivo, setFiltroActivo] = useState<'todos' | 'activos' | 'inactivos'>('todos');
    const [modalServicio, setModalServicio] = useState<Partial<Servicio> | null | undefined>(undefined);
    const [catExtras, setCatExtras] = useState<string[]>(CATEGORIAS_DEFAULT);

    const categoriasDinamicas = Array.from(new Set([
        ...servicios.map(s => s.categoria).filter(Boolean),
        ...catExtras,
    ]));

    const serviciosFiltrados = servicios.filter(s => {
        const matchBusqueda = !busqueda
            || s.nombre.toLowerCase().includes(busqueda.toLowerCase())
            || (s.descripcion || '').toLowerCase().includes(busqueda.toLowerCase());
        const matchTipo = filtroTipo === 'todos' || s.tipo === filtroTipo;
        const matchCat = filtroCategoria === 'Todos' || s.categoria === filtroCategoria;
        const matchActivo = filtroActivo === 'todos' || (filtroActivo === 'activos' ? s.activo !== false : s.activo === false);
        return matchBusqueda && matchTipo && matchCat && matchActivo;
    });

    const totalActivos = servicios.filter(s => s.activo !== false).length;
    const totalPaquetes = servicios.filter(s => s.tipo === 'paquete_clases').length;
    const totalAlquileres = servicios.filter(s => s.tipo === 'alquiler').length;

    if (cargando) {
        return (
            <div className="flex items-center justify-center py-32">
                <Loader2 className="w-8 h-8 animate-spin text-blue-400" />
                <span className="ml-3 text-muted-foreground">Cargando servicios...</span>
            </div>
        );
    }

    return (
        <div className="p-4 lg:p-6 space-y-6">

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold">Catalogo de Servicios</h1>
                    <p className="text-sm text-muted-foreground mt-0.5">
                        Paquetes de clases y alquiler de espacios
                    </p>
                </div>
                <button onClick={() => setModalServicio({})} className="btn-primary text-sm py-2.5">
                    <Plus className="w-4 h-4" />
                    Nuevo Servicio
                </button>
            </div>

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {[
                    { label: 'Total servicios', valor: servicios.length, icon: Tag, color: 'text-blue-400' },
                    { label: 'Activos', valor: totalActivos, icon: CheckCircle2, color: 'text-green-400' },
                    { label: 'Paquetes de clases', valor: totalPaquetes, icon: BookOpen, color: 'text-blue-400' },
                    { label: 'Alquileres', valor: totalAlquileres, icon: Home, color: 'text-purple-400' },
                ].map(({ label, valor, icon: Icon, color }) => (
                    <div key={label} className="kpi-card">
                        <div className="flex items-center justify-between mb-2">
                            <p className="text-xs text-muted-foreground">{label}</p>
                            <Icon className={cn('w-4 h-4', color)} />
                        </div>
                        <p className="text-2xl font-bold">{valor}</p>
                    </div>
                ))}
            </div>

            <div className="glass-card p-4">
                <div className="flex flex-col sm:flex-row gap-3">
                    <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <input className="input-sistema pl-9 w-full" placeholder="Buscar servicio..."
                            value={busqueda} onChange={e => setBusqueda(e.target.value)} />
                    </div>
                    <select className="input-sistema sm:w-44" value={filtroTipo}
                        onChange={e => setFiltroTipo(e.target.value as typeof filtroTipo)}>
                        <option value="todos">Todos los tipos</option>
                        <option value="paquete_clases">Paquetes de clases</option>
                        <option value="alquiler">Alquileres</option>
                    </select>
                    <select className="input-sistema sm:w-44" value={filtroCategoria}
                        onChange={e => setFiltroCategoria(e.target.value)}>
                        <option value="Todos">Todas las categorias</option>
                        {categoriasDinamicas.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                    <select className="input-sistema sm:w-36" value={filtroActivo}
                        onChange={e => setFiltroActivo(e.target.value as typeof filtroActivo)}>
                        <option value="todos">Todos</option>
                        <option value="activos">Activos</option>
                        <option value="inactivos">Inactivos</option>
                    </select>
                </div>
            </div>

            {serviciosFiltrados.length === 0 ? (
                <div className="glass-card p-12 text-center">
                    <Tag className="w-12 h-12 text-muted-foreground mx-auto mb-4 opacity-40" />
                    <p className="text-muted-foreground font-medium">
                        {servicios.length === 0 ? 'Aun no tienes servicios registrados' : 'No hay servicios que coincidan'}
                    </p>
                    {servicios.length === 0 && (
                        <button onClick={() => setModalServicio({})} className="btn-primary text-sm mt-4">
                            <Plus className="w-4 h-4" /> Crear primer servicio
                        </button>
                    )}
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                    {serviciosFiltrados.map(servicio => {
                        const precioBs = servicio.precioUSD * tasas.bcv;
                        return (
                            <div key={servicio.id} className={cn(
                                'glass-card p-5 flex flex-col gap-3 transition-all hover:border-border/80',
                                !servicio.activo && 'opacity-60'
                            )}>
                                <div className="flex items-start justify-between gap-2">
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 flex-wrap mb-1">
                                            <BadgeTipo tipo={servicio.tipo} />
                                            {servicio.categoria && (
                                                <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
                                                    {servicio.categoria}
                                                </span>
                                            )}
                                            {!servicio.activo && (
                                                <span className="text-xs text-red-400 bg-red-500/10 px-2 py-0.5 rounded-full border border-red-500/20">
                                                    Inactivo
                                                </span>
                                            )}
                                        </div>
                                        <h3 className="font-semibold text-sm leading-tight">{servicio.nombre}</h3>
                                    </div>
                                    <div className="flex gap-1 shrink-0">
                                        <button onClick={() => setModalServicio(servicio)}
                                            className="p-1.5 hover:bg-muted rounded-lg transition-colors text-muted-foreground hover:text-foreground">
                                            <Edit2 className="w-3.5 h-3.5" />
                                        </button>
                                        <button onClick={() => eliminarServicio(servicio.id)}
                                            className="p-1.5 hover:bg-red-500/10 rounded-lg transition-colors text-muted-foreground hover:text-red-400">
                                            <Trash2 className="w-3.5 h-3.5" />
                                        </button>
                                    </div>
                                </div>

                                {servicio.descripcion && (
                                    <p className="text-xs text-muted-foreground leading-relaxed">{servicio.descripcion}</p>
                                )}

                                <div className="flex flex-wrap gap-2 text-xs">
                                    {servicio.tipo === 'paquete_clases' && (
                                        <>
                                            {servicio.clasesIncluidas && (
                                                <span className="flex items-center gap-1 bg-blue-500/10 text-blue-400 px-2 py-0.5 rounded-full border border-blue-500/20">
                                                    <Users className="w-3 h-3" />
                                                    {servicio.clasesIncluidas} clases
                                                </span>
                                            )}
                                            {servicio.frecuenciaSemana && (
                                                <span className="flex items-center gap-1 bg-muted text-muted-foreground px-2 py-0.5 rounded-full">
                                                    <Calendar className="w-3 h-3" />
                                                    {servicio.frecuenciaSemana}x/semana
                                                </span>
                                            )}
                                            {servicio.vigenciaDias && (
                                                <span className="flex items-center gap-1 bg-muted text-muted-foreground px-2 py-0.5 rounded-full">
                                                    <Clock className="w-3 h-3" />
                                                    {servicio.vigenciaDias} dias
                                                </span>
                                            )}
                                        </>
                                    )}
                                    {servicio.tipo === 'alquiler' && servicio.duracionHoras && (
                                        <span className="flex items-center gap-1 bg-purple-500/10 text-purple-400 px-2 py-0.5 rounded-full border border-purple-500/20">
                                            <Clock className="w-3 h-3" />
                                            {servicio.duracionHoras}h de duracion
                                        </span>
                                    )}
                                </div>

                                <div className="mt-auto pt-3 border-t border-border flex items-end justify-between">
                                    <div>
                                        <p className="text-xs text-muted-foreground mb-0.5">Precio</p>
                                        <p className="text-xl font-bold text-green-400 font-mono">
                                            {formatUSD(servicio.precioUSD)}
                                        </p>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-xs text-muted-foreground mb-0.5">Equivale a</p>
                                        <p className="text-sm font-semibold text-amber-400 font-mono">
                                            {formatBs(precioBs)}
                                        </p>
                                        <p className="text-xs text-muted-foreground">tasa {tasas.bcv.toFixed(2)}</p>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {modalServicio !== undefined && (
                <ModalServicio
                    servicio={modalServicio}
                    onCerrar={() => setModalServicio(undefined)}
                    onGuardar={guardarServicio}
                    tasaBCV={tasas.bcv}
                    categorias={categoriasDinamicas}
                    onNuevaCategoria={(c) => {
                        if (!categoriasDinamicas.includes(c)) {
                            setCatExtras(prev => [...prev, c]);
                        }
                    }}
                />
            )}
        </div>
    );
}
