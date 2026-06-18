'use client';

/**
 * app/productos/page.tsx
 * Catálogo de productos con dos categorías:
 *   - Cafetín:       jugos, refrescos, helados, snacks, etc.
 *   - Merchandising: gorras, franelas, chaquetas, accesorios, etc.
 *
 * Misma estructura y lógica que app/servicios/page.tsx
 */

import { useState } from 'react';
import {
    Plus, Search, Edit2, Trash2, Tag, CheckCircle2,
    X, DollarSign, Loader2, ShoppingBag, Coffee,
    Package, AlertTriangle,
} from 'lucide-react';
import { useTasas } from '@/components/providers/TasasProvider';
import { cn } from '@/lib/utils';
import { useProductos } from '@/lib/useProductos';
import type { Producto, CategoriaProducto } from '@/lib/useProductos';
import toast from 'react-hot-toast';

// ─── Helpers de formato ────────────────────────────────────────────────────────

function formatUSD(n: number) {
    return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        minimumFractionDigits: 2,
    }).format(n);
}

function formatBs(n: number) {
    return new Intl.NumberFormat('es-VE', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    }).format(n) + ' Bs';
}

// ─── Constantes de categorías y subcategorías ──────────────────────────────────

const CONFIG_CATEGORIAS: Record<CategoriaProducto, {
    label: string;
    icon: React.ElementType;
    color: string;
    colorBg: string;
    colorBorder: string;
    subcategorias: string[];
}> = {
    cafetín: {
        label: 'Cafetín',
        icon: Coffee,
        color: 'text-orange-400',
        colorBg: 'bg-orange-500/15',
        colorBorder: 'border-orange-500/20',
        subcategorias: ['Bebidas', 'Refrescos', 'Jugos', 'Helados', 'Snacks', 'Dulces', 'Comidas', 'Otro'],
    },
    merchandising: {
        label: 'Merchandising',
        icon: ShoppingBag,
        color: 'text-violet-400',
        colorBg: 'bg-violet-500/15',
        colorBorder: 'border-violet-500/20',
        subcategorias: ['Gorras', 'Franelas', 'Chaquetas', 'Shorts', 'Medias', 'Bolsos', 'Accesorios', 'Otro'],
    },
};

// ─── Badge de categoría ────────────────────────────────────────────────────────

function BadgeCategoria({ categoria }: { categoria: CategoriaProducto }) {
    const cfg = CONFIG_CATEGORIAS[categoria];
    const Icon = cfg.icon;
    return (
        <span className={cn(
            'inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border',
            cfg.colorBg, cfg.color, cfg.colorBorder,
        )}>
            <Icon className="w-3 h-3" />
            {cfg.label}
        </span>
    );
}

// ─── Modal crear / editar producto ────────────────────────────────────────────

// Opciones de tasa disponibles
const OPCIONES_TASA = [
    { key: 'eur',      label: '€ EUR BCV',   color: 'text-purple-400', bg: 'bg-purple-500/10', border: 'border-purple-500/30' },
    { key: 'bcv',      label: '$ BCV',        color: 'text-blue-400',   bg: 'bg-blue-500/10',   border: 'border-blue-500/30'   },
    { key: 'paralelo', label: '$ Paralelo',   color: 'text-amber-400',  bg: 'bg-amber-500/10',  border: 'border-amber-500/30'  },
] as const;

type TipoTasa = 'bcv' | 'paralelo' | 'eur';

function ModalProducto({
    producto,
    onCerrar,
    onGuardar,
    tasas,
}: {
    producto: Partial<Producto> | null;
    onCerrar: () => void;
    onGuardar: (p: Producto) => void;
    tasas: import('@/lib/tasas').TasasCambio;
}) {
    const esEdicion = !!(producto as Producto)?.id;

    const [form, setForm] = useState<Partial<Producto>>(producto || {
        nombre:       '',
        categoria:    'cafetín',
        subcategoria: '',
        descripcion:  '',
        precioUSD:    0,
        stock:        0,
        stockMinimo:  3,
        unidad:       'und',
        activo:       true,
    });

    // EUR BCV como tasa predeterminada
    const [tasaSeleccionada, setTasaSeleccionada] = useState<TipoTasa>('eur');

    const set = (campo: keyof Producto, valor: unknown) =>
        setForm(prev => ({ ...prev, [campo]: valor }));

    // Calcular precio en Bs según la tasa elegida
    const tasaValor = tasaSeleccionada === 'eur'
        ? tasas.eurBcv
        : tasaSeleccionada === 'paralelo'
        ? tasas.paralelo
        : tasas.bcv;

    const precioBs = (form.precioUSD || 0) * tasaValor;
    const catCfg   = CONFIG_CATEGORIAS[form.categoria as CategoriaProducto] ?? CONFIG_CATEGORIAS['cafetín'];
    const tasaOpc  = OPCIONES_TASA.find(o => o.key === tasaSeleccionada)!;

    const guardar = () => {
        if (!form.nombre?.trim())               { toast.error('Ingresa el nombre del producto'); return; }
        if (!form.precioUSD || form.precioUSD <= 0) { toast.error('El precio debe ser mayor a 0'); return; }
        if (!form.subcategoria)                 { toast.error('Selecciona una subcategoría'); return; }
        onGuardar({
            ...form,
            id:            (producto as Producto)?.id || '',
            fechaCreacion: (producto as Producto)?.fechaCreacion || '',
        } as Producto);
        onCerrar();
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <div className="bg-card border border-border rounded-2xl w-full max-w-lg shadow-2xl max-h-[90vh] overflow-y-auto">

                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-border">
                    <h3 className="text-lg font-semibold">
                        {esEdicion ? 'Editar Producto' : 'Nuevo Producto'}
                    </h3>
                    <button onClick={onCerrar} className="p-1.5 hover:bg-muted rounded-lg transition-colors">
                        <X className="w-4 h-4" />
                    </button>
                </div>

                <div className="p-6 space-y-5">

                    {/* Categoría principal */}
                    <div>
                        <label className="text-xs text-muted-foreground mb-2 block">Categoría</label>
                        <div className="grid grid-cols-2 gap-3">
                            {(Object.keys(CONFIG_CATEGORIAS) as CategoriaProducto[]).map((cat) => {
                                const cfg  = CONFIG_CATEGORIAS[cat];
                                const Icon = cfg.icon;
                                const sel  = form.categoria === cat;
                                return (
                                    <button
                                        key={cat}
                                        type="button"
                                        onClick={() => { set('categoria', cat); set('subcategoria', ''); }}
                                        className={cn(
                                            'flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all text-sm font-medium',
                                            sel
                                                ? cn(cfg.colorBg, cfg.color, 'border-current')
                                                : 'border-border text-muted-foreground hover:border-muted-foreground',
                                        )}
                                    >
                                        <Icon className="w-5 h-5" />
                                        {cfg.label}
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    {/* Subcategoría */}
                    <div>
                        <label className="text-xs text-muted-foreground mb-1 block">Subcategoría *</label>
                        <select
                            className="input-sistema"
                            value={form.subcategoria || ''}
                            onChange={e => set('subcategoria', e.target.value)}
                        >
                            <option value="">Seleccionar...</option>
                            {catCfg.subcategorias.map(s => (
                                <option key={s} value={s}>{s}</option>
                            ))}
                        </select>
                    </div>

                    {/* Nombre */}
                    <div>
                        <label className="text-xs text-muted-foreground mb-1 block">Nombre del producto *</label>
                        <input
                            className="input-sistema"
                            placeholder={
                                form.categoria === 'cafetín'
                                    ? 'Ej: Jugo de naranja natural 500ml'
                                    : 'Ej: Gorra ATEMPO bordada negra'
                            }
                            value={form.nombre || ''}
                            onChange={e => set('nombre', e.target.value)}
                        />
                    </div>

                    {/* Descripción */}
                    <div>
                        <label className="text-xs text-muted-foreground mb-1 block">Descripción</label>
                        <textarea
                            className="input-sistema resize-none"
                            rows={2}
                            placeholder="Describe el producto..."
                            value={form.descripcion || ''}
                            onChange={e => set('descripcion', e.target.value)}
                        />
                    </div>

                    {/* Precio */}
                    <div className="border border-border rounded-xl p-4 bg-muted/20">
                        <h4 className="text-sm font-semibold mb-3 flex items-center gap-2">
                            <DollarSign className="w-4 h-4 text-green-400" />
                            Precio
                        </h4>

                        {/* Selector de tasa */}
                        <div className="mb-4">
                            <label className="text-xs text-muted-foreground mb-2 block">Tasa para conversión a Bs</label>
                            <div className="flex gap-2">
                                {OPCIONES_TASA.map(opt => (
                                    <button
                                        key={opt.key}
                                        type="button"
                                        onClick={() => setTasaSeleccionada(opt.key)}
                                        className={cn(
                                            'flex-1 py-1.5 px-2 rounded-lg text-xs font-semibold border transition-all',
                                            tasaSeleccionada === opt.key
                                                ? cn(opt.bg, opt.color, opt.border)
                                                : 'border-border text-muted-foreground hover:border-muted-foreground'
                                        )}
                                    >
                                        {opt.label}
                                    </button>
                                ))}
                            </div>
                        </div>

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
                                <label className={cn('text-xs mb-1 block', tasaOpc.color)}>Equivale en Bs ({tasaOpc.label})</label>
                                <div className={cn('input-sistema bg-muted/40 flex items-center font-mono text-sm font-semibold cursor-default select-none', tasaOpc.color)}>
                                    {precioBs > 0 ? formatBs(precioBs) : '0.00 Bs'}
                                </div>
                                <p className="text-xs text-muted-foreground mt-1">
                                    Tasa: {tasaValor.toFixed(2)} Bs/$
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Stock */}
                    <div className="border border-border rounded-xl p-4 bg-muted/20">
                        <h4 className="text-sm font-semibold mb-3 flex items-center gap-2">
                            <Package className="w-4 h-4 text-blue-400" />
                            Inventario
                        </h4>
                        <div className="grid grid-cols-3 gap-3">
                            <div>
                                <label className="text-xs text-muted-foreground mb-1 block">Stock actual</label>
                                <input
                                    type="number"
                                    min="0"
                                    className="input-sistema"
                                    placeholder="0"
                                    value={form.stock ?? ''}
                                    onChange={e => set('stock', parseInt(e.target.value) || 0)}
                                />
                            </div>
                            <div>
                                <label className="text-xs text-muted-foreground mb-1 block">Stock mínimo</label>
                                <input
                                    type="number"
                                    min="0"
                                    className="input-sistema"
                                    placeholder="3"
                                    value={form.stockMinimo ?? ''}
                                    onChange={e => set('stockMinimo', parseInt(e.target.value) || 0)}
                                />
                            </div>
                            <div>
                                <label className="text-xs text-muted-foreground mb-1 block">Unidad</label>
                                <select
                                    className="input-sistema"
                                    value={form.unidad || 'und'}
                                    onChange={e => set('unidad', e.target.value)}
                                >
                                    <option value="und">und</option>
                                    <option value="kg">kg</option>
                                    <option value="litro">litro</option>
                                    <option value="caja">caja</option>
                                    <option value="paquete">paquete</option>
                                    <option value="talla">talla</option>
                                </select>
                            </div>
                        </div>
                    </div>

                    {/* Toggle activo */}
                    <div className={cn(
                        'flex items-center justify-between p-3 rounded-xl border transition-all',
                        form.activo ? 'bg-green-500/10 border-green-500/30' : 'bg-red-500/10 border-red-500/30',
                    )}>
                        <div>
                            <p className={cn('text-sm font-semibold', form.activo ? 'text-green-400' : 'text-red-400')}>
                                {form.activo ? 'Activo' : 'Inactivo'}
                            </p>
                            <p className="text-xs text-muted-foreground">
                                {form.activo ? 'Visible en el Punto de Venta' : 'NO aparece en el Punto de Venta'}
                            </p>
                        </div>
                        <button
                            type="button"
                            onClick={() => set('activo', !form.activo)}
                            className={cn(
                                'relative w-12 h-6 rounded-full transition-all duration-300',
                                form.activo ? 'bg-green-500' : 'bg-muted',
                            )}
                        >
                            <span className={cn(
                                'absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-all duration-300',
                                form.activo ? 'left-7' : 'left-1',
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
                        {esEdicion ? 'Guardar cambios' : 'Crear Producto'}
                    </button>
                </div>
            </div>
        </div>
    );
}

// ─── Tarjeta de producto ───────────────────────────────────────────────────────

function TarjetaProducto({
    producto,
    tasaBCV,
    onEditar,
    onEliminar,
}: {
    producto: Producto;
    tasaBCV: number;
    onEditar: () => void;
    onEliminar: () => void;
}) {
    const precioBs    = producto.precioUSD * tasaBCV;
    const stockBajo   = producto.stock <= producto.stockMinimo;
    const sinStock    = producto.stock === 0;
    const catCfg      = CONFIG_CATEGORIAS[producto.categoria];

    return (
        <div className={cn(
            'glass-card p-5 flex flex-col gap-3 transition-all hover:border-border/80',
            !producto.activo && 'opacity-60',
        )}>
            {/* Header de la tarjeta */}
            <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                        <BadgeCategoria categoria={producto.categoria} />
                        {producto.subcategoria && (
                            <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
                                {producto.subcategoria}
                            </span>
                        )}
                        {!producto.activo && (
                            <span className="text-xs text-red-400 bg-red-500/10 px-2 py-0.5 rounded-full border border-red-500/20">
                                Inactivo
                            </span>
                        )}
                    </div>
                    <h3 className="font-semibold text-sm leading-tight">{producto.nombre}</h3>
                </div>

                {/* Acciones */}
                <div className="flex gap-1 shrink-0">
                    <button
                        onClick={onEditar}
                        className="p-1.5 hover:bg-muted rounded-lg transition-colors text-muted-foreground hover:text-foreground"
                    >
                        <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                        onClick={onEliminar}
                        className="p-1.5 hover:bg-red-500/10 rounded-lg transition-colors text-muted-foreground hover:text-red-400"
                    >
                        <Trash2 className="w-3.5 h-3.5" />
                    </button>
                </div>
            </div>

            {/* Descripción */}
            {producto.descripcion && (
                <p className="text-xs text-muted-foreground leading-relaxed">{producto.descripcion}</p>
            )}

            {/* Stock badge */}
            <div className="flex items-center gap-2">
                <span className={cn(
                    'inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border',
                    sinStock
                        ? 'bg-red-500/10 text-red-400 border-red-500/20'
                        : stockBajo
                        ? 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                        : 'bg-green-500/10 text-green-400 border-green-500/20',
                )}>
                    {sinStock && <AlertTriangle className="w-3 h-3" />}
                    {sinStock
                        ? 'Sin stock'
                        : stockBajo
                        ? `Stock bajo: ${producto.stock} ${producto.unidad}`
                        : `${producto.stock} ${producto.unidad}`}
                </span>
            </div>

            {/* Precio */}
            <div className="mt-auto pt-3 border-t border-border flex items-end justify-between">
                <div>
                    <p className="text-xs text-muted-foreground mb-0.5">Precio</p>
                    <p className="text-xl font-bold text-green-400 font-mono">
                        {formatUSD(producto.precioUSD)}
                    </p>
                </div>
                <div className="text-right">
                    <p className="text-xs text-muted-foreground mb-0.5">Equivale a</p>
                    <p className="text-sm font-semibold text-amber-400 font-mono">
                        {formatBs(precioBs)}
                    </p>
                    <p className="text-xs text-muted-foreground">tasa {tasaBCV.toFixed(2)}</p>
                </div>
            </div>
        </div>
    );
}

// ─── Página principal ──────────────────────────────────────────────────────────

export default function ProductosPage() {
    const { tasas } = useTasas();
    const { productos, cargando, guardarProducto, eliminarProducto } = useProductos();

    const [busqueda,        setBusqueda]        = useState('');
    const [filtroCategoria, setFiltroCategoria] = useState<'todos' | CategoriaProducto>('todos');
    const [filtroStock,     setFiltroStock]     = useState<'todos' | 'bajo' | 'ok'>('todos');
    const [filtroActivo,    setFiltroActivo]    = useState<'todos' | 'activos' | 'inactivos'>('todos');
    const [modalProducto,   setModalProducto]   = useState<Partial<Producto> | null | undefined>(undefined);

    // ─── Filtrado ───────────────────────────────────────────────────────────
    const productosFiltrados = productos.filter(p => {
        const matchBusqueda =
            !busqueda ||
            p.nombre.toLowerCase().includes(busqueda.toLowerCase()) ||
            (p.descripcion || '').toLowerCase().includes(busqueda.toLowerCase()) ||
            (p.subcategoria || '').toLowerCase().includes(busqueda.toLowerCase());

        const matchCategoria =
            filtroCategoria === 'todos' || p.categoria === filtroCategoria;

        const stockBajo = p.stock <= p.stockMinimo;
        const matchStock =
            filtroStock === 'todos' ||
            (filtroStock === 'bajo' ? stockBajo : !stockBajo);

        const matchActivo =
            filtroActivo === 'todos' ||
            (filtroActivo === 'activos' ? p.activo !== false : p.activo === false);

        return matchBusqueda && matchCategoria && matchStock && matchActivo;
    });

    // ─── KPIs ───────────────────────────────────────────────────────────────
    const totalActivos       = productos.filter(p => p.activo !== false).length;
    const totalCafetin       = productos.filter(p => p.categoria === 'cafetín').length;
    const totalMerch         = productos.filter(p => p.categoria === 'merchandising').length;
    const totalStockBajo     = productos.filter(p => p.stock <= p.stockMinimo).length;

    // ─── Loading ────────────────────────────────────────────────────────────
    if (cargando) {
        return (
            <div className="flex items-center justify-center py-32">
                <Loader2 className="w-8 h-8 animate-spin text-blue-400" />
                <span className="ml-3 text-muted-foreground">Cargando productos...</span>
            </div>
        );
    }

    return (
        <div className="p-4 lg:p-6 space-y-6">

            {/* ── Header ── */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold flex items-center gap-2">
                        <ShoppingBag className="w-6 h-6 text-violet-400" />
                        Catálogo de Productos
                    </h1>
                    <p className="text-sm text-muted-foreground mt-0.5">
                        Cafetín y Merchandising ATEMPO
                    </p>
                </div>
                <button onClick={() => setModalProducto({})} className="btn-primary text-sm py-2.5">
                    <Plus className="w-4 h-4" />
                    Nuevo Producto
                </button>
            </div>

            {/* ── KPIs ── */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {[
                    { label: 'Total productos', valor: productos.length,  icon: Tag,          color: 'text-blue-400'   },
                    { label: 'Activos',          valor: totalActivos,      icon: CheckCircle2, color: 'text-green-400'  },
                    { label: 'Cafetín',          valor: totalCafetin,      icon: Coffee,       color: 'text-orange-400' },
                    { label: 'Merchandising',    valor: totalMerch,        icon: ShoppingBag,  color: 'text-violet-400' },
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

            {/* Alerta stock bajo */}
            {totalStockBajo > 0 && (
                <div
                    className="flex items-center gap-3 p-4 bg-amber-500/10 border border-amber-500/30 rounded-xl cursor-pointer hover:bg-amber-500/15 transition-colors"
                    onClick={() => setFiltroStock(filtroStock === 'bajo' ? 'todos' : 'bajo')}
                >
                    <AlertTriangle className="w-5 h-5 text-amber-400 flex-shrink-0" />
                    <div className="flex-1">
                        <p className="text-sm font-semibold text-amber-400">
                            {totalStockBajo} producto{totalStockBajo > 1 ? 's' : ''} con stock bajo
                        </p>
                        <p className="text-xs text-muted-foreground">
                            {filtroStock === 'bajo' ? 'Haz clic para ver todos' : 'Haz clic para filtrar'}
                        </p>
                    </div>
                </div>
            )}

            {/* ── Filtros ── */}
            <div className="glass-card p-4">
                <div className="flex flex-col sm:flex-row gap-3">
                    {/* Búsqueda */}
                    <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <input
                            className="input-sistema pl-9 w-full"
                            placeholder="Buscar producto..."
                            value={busqueda}
                            onChange={e => setBusqueda(e.target.value)}
                        />
                    </div>
                    {/* Filtro categoría */}
                    <select
                        className="input-sistema sm:w-44"
                        value={filtroCategoria}
                        onChange={e => setFiltroCategoria(e.target.value as typeof filtroCategoria)}
                    >
                        <option value="todos">Todas las categorías</option>
                        <option value="cafetín">☕ Cafetín</option>
                        <option value="merchandising">🛍️ Merchandising</option>
                    </select>
                    {/* Filtro stock */}
                    <select
                        className="input-sistema sm:w-36"
                        value={filtroStock}
                        onChange={e => setFiltroStock(e.target.value as typeof filtroStock)}
                    >
                        <option value="todos">Todo el stock</option>
                        <option value="bajo">Stock bajo</option>
                        <option value="ok">Stock OK</option>
                    </select>
                    {/* Filtro activo */}
                    <select
                        className="input-sistema sm:w-36"
                        value={filtroActivo}
                        onChange={e => setFiltroActivo(e.target.value as typeof filtroActivo)}
                    >
                        <option value="todos">Todos</option>
                        <option value="activos">Activos</option>
                        <option value="inactivos">Inactivos</option>
                    </select>
                </div>
            </div>

            {/* ── Vista por categoría (secciones colapsables) ── */}
            {productosFiltrados.length === 0 ? (
                <div className="glass-card p-12 text-center">
                    <ShoppingBag className="w-12 h-12 text-muted-foreground mx-auto mb-4 opacity-40" />
                    <p className="text-muted-foreground font-medium">
                        {productos.length === 0
                            ? 'Aún no tienes productos registrados'
                            : 'No hay productos que coincidan con los filtros'}
                    </p>
                    {productos.length === 0 && (
                        <button onClick={() => setModalProducto({})} className="btn-primary text-sm mt-4">
                            <Plus className="w-4 h-4" /> Crear primer producto
                        </button>
                    )}
                </div>
            ) : (
                <div className="space-y-8">
                    {(Object.keys(CONFIG_CATEGORIAS) as CategoriaProducto[]).map(cat => {
                        const cfg   = CONFIG_CATEGORIAS[cat];
                        const Icon  = cfg.icon;
                        const items = productosFiltrados.filter(p => p.categoria === cat);
                        if (items.length === 0 && filtroCategoria !== 'todos') return null;
                        if (items.length === 0) return null;

                        return (
                            <section key={cat}>
                                {/* Separador de sección */}
                                <div className="flex items-center gap-3 mb-4">
                                    <div className={cn(
                                        'flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-semibold border',
                                        cfg.colorBg, cfg.color, cfg.colorBorder,
                                    )}>
                                        <Icon className="w-4 h-4" />
                                        {cfg.label}
                                    </div>
                                    <div className="flex-1 h-px bg-border" />
                                    <span className="text-xs text-muted-foreground">
                                        {items.length} producto{items.length !== 1 ? 's' : ''}
                                    </span>
                                </div>

                                {/* Grid de tarjetas */}
                                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                                    {items.map(producto => (
                                        <TarjetaProducto
                                            key={producto.id}
                                            producto={producto}
                                            tasaBCV={tasas.bcv}
                                            onEditar={() => setModalProducto(producto)}
                                            onEliminar={() => eliminarProducto(producto.id)}
                                        />
                                    ))}
                                </div>
                            </section>
                        );
                    })}
                </div>
            )}

            {/* Modal */}
            {modalProducto !== undefined && (
                <ModalProducto
                    producto={modalProducto}
                    onCerrar={() => setModalProducto(undefined)}
                    onGuardar={guardarProducto}
                    tasas={tasas}
                />
            )}
        </div>
    );
}
