'use client';

/**
 * app/productos/page.tsx
 * Catálogo de productos con dos categorías:
 *   - Cafetín:       jugos, refrescos, helados, snacks, etc.
 *   - Merchandising: gorras, franelas, chaquetas, accesorios, etc.
 *
 * Misma estructura y lógica que app/servicios/page.tsx
 */

import { useState, useEffect } from 'react';
import {
    Plus, Search, Edit2, Trash2, Tag, CheckCircle2,
    X, DollarSign, Loader2, ShoppingBag, Coffee,
    Package, AlertTriangle, ChevronDown, ChevronUp, BarChart3,
    History as HistoryIcon, PlusCircle, FileText,
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

function conTimeout<T>(promise: Promise<T>, ms: number = 5000): Promise<T> {
    return Promise.race([
        promise,
        new Promise<never>((_, reject) =>
            setTimeout(() => reject(new Error('Tiempo de espera de red agotado (Timeout)')), ms)
        ),
    ]);
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

// Estilos personalizados para las subcategorías (Atempo style)
const SUBCATEGORIA_ESTILOS: Record<string, { bg: string; text: string; border: string }> = {
    // Cafetín
    'bebidas':    { bg: 'bg-blue-500/10',    text: 'text-blue-400',    border: 'border-blue-500/20' },
    'refrescos':  { bg: 'bg-red-500/10',     text: 'text-red-400',     border: 'border-red-500/20' },
    'jugos':      { bg: 'bg-orange-500/10',  text: 'text-orange-400',  border: 'border-orange-500/20' },
    'helados':    { bg: 'bg-pink-500/10',    text: 'text-pink-400',    border: 'border-pink-500/20' },
    'snacks':     { bg: 'bg-amber-500/10',   text: 'text-amber-400',   border: 'border-amber-500/20' },
    'dulces':     { bg: 'bg-purple-500/10',  text: 'text-purple-400',  border: 'border-purple-500/20' },
    'comidas':    { bg: 'bg-emerald-500/10', text: 'text-emerald-400', border: 'border-emerald-500/20' },
    'otro':       { bg: 'bg-slate-500/10',   text: 'text-slate-400',   border: 'border-slate-500/20' },

    // Merchandising
    'gorras':     { bg: 'bg-teal-500/10',    text: 'text-teal-400',    border: 'border-teal-500/20' },
    'franelas':   { bg: 'bg-indigo-500/10',  text: 'text-indigo-400',  border: 'border-indigo-500/20' },
    'chaquetas':  { bg: 'bg-violet-500/10',  text: 'text-violet-400',  border: 'border-violet-500/20' },
    'shorts':     { bg: 'bg-cyan-500/10',    text: 'text-cyan-400',    border: 'border-cyan-500/20' },
    'medias':     { bg: 'bg-lime-500/10',    text: 'text-lime-400',    border: 'border-lime-500/20' },
    'bolsos':     { bg: 'bg-sky-500/10',     text: 'text-sky-400',     border: 'border-sky-500/20' },
    'accesorios': { bg: 'bg-rose-500/10',    text: 'text-rose-400',    border: 'border-rose-500/20' },
};

function BadgeSubcategoria({ subcategoria }: { subcategoria: string }) {
    const key = subcategoria.toLowerCase().trim();
    const estilo = SUBCATEGORIA_ESTILOS[key] || {
        bg: 'bg-muted/50',
        text: 'text-muted-foreground',
        border: 'border-border/60',
    };

    return (
        <span className={cn(
            'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border transition-all',
            estilo.bg, estilo.text, estilo.border
        )}>
            {subcategoria}
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
    eurBcv,
    onEditar,
    onEliminar,
}: {
    producto: Producto;
    eurBcv: number;   // Tasa EUR BCV (predeterminada)
    onEditar: () => void;
    onEliminar: () => void;
}) {
    const precioBs    = producto.precioUSD * eurBcv;
    const unidad      = producto.unidad || 'und';   // fallback seguro
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
                            <BadgeSubcategoria subcategoria={producto.subcategoria} />
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
                        ? `Stock bajo: ${producto.stock} ${unidad}`
                        : `${producto.stock} ${unidad}`}
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
                    <p className="text-xs text-muted-foreground mb-0.5">€ EUR BCV</p>
                    <p className="text-sm font-semibold text-purple-400 font-mono">
                        {formatBs(precioBs)}
                    </p>
                    <p className="text-xs text-muted-foreground">tasa {eurBcv.toFixed(2)}</p>
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
    const [mostrarResumen,  setMostrarResumen]  = useState(false);
    const [mostrarHelados,  setMostrarHelados]  = useState(false);
    const [modalIngreso,    setModalIngreso]    = useState(false);
    const [mostrarHistorialModal, setMostrarHistorialModal] = useState(false);
    const [ingresos,        setIngresos]        = useState<any[]>([]);

    useEffect(() => {
        let unsub: any;
        const fetchIngresos = async () => {
            const { collection, query, orderBy, limit, onSnapshot } = await import('firebase/firestore');
            const { db: firestoreDb } = await import('@/lib/firebase');
            
            const q = query(
                collection(firestoreDb, 'ingresos_inventario'),
                orderBy('fecha', 'desc'),
                limit(100)
            );
            unsub = onSnapshot(q, (snap) => {
                setIngresos(snap.docs.map(doc => {
                    const data = doc.data();
                    return {
                        id: doc.id,
                        ...data,
                        fechaStr: data.fecha?.toDate()
                            ? data.fecha.toDate().toLocaleString('es-VE')
                            : new Date().toLocaleString('es-VE')
                    };
                }));
            }, (err) => {
                console.error("Error al escuchar ingresos de inventario:", err);
            });
        };
        fetchIngresos();
        return () => { if (unsub) unsub(); };
    }, []);

    const handleRegistrarIngreso = async (productoId: string, cantidad: number, notas: string) => {
        const { collection, addDoc, doc: docRef, updateDoc, increment, serverTimestamp } = await import('firebase/firestore');
        const { db: firestoreDb } = await import('@/lib/firebase');
        const { getAuth } = await import('firebase/auth');
        
        const auth = getAuth();
        const user = auth.currentUser;
        const prod = productos.find(p => p.id === productoId);
        if (!prod) throw new Error("Producto no encontrado");

        // 1. Incrementar stock del producto
        await updateDoc(docRef(firestoreDb, 'productos_catalogo', productoId), {
            stock: increment(cantidad)
        });

        // 2. Registrar en historial de ingresos
        await addDoc(collection(firestoreDb, 'ingresos_inventario'), {
            productoId,
            productoNombre: prod.nombre,
            categoria: prod.categoria,
            subcategoria: prod.subcategoria || '',
            cantidad,
            notas,
            fecha: serverTimestamp(),
            usuarioId: user?.uid || 'anonimo',
            usuarioNombre: user?.displayName || user?.email || 'Usuario',
        });
    };

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

    // ─── Agrupación de stock disponible por categoría y subcategoría ──────────
    const stockPorCategoria = productos.reduce((acc, p) => {
        const cat = p.categoria;
        const sub = p.subcategoria || 'Otro';
        const stock = p.stock || 0;

        if (!acc[cat]) {
            acc[cat] = { total: 0, sub: {} as Record<string, number> };
        }
        acc[cat].total += stock;
        acc[cat].sub[sub] = (acc[cat].sub[sub] || 0) + stock;
        return acc;
    }, {
        cafetín: { total: 0, sub: {} as Record<string, number> },
        merchandising: { total: 0, sub: {} as Record<string, number> }
    });

    const subcatsCafetin = Object.entries(stockPorCategoria.cafetín.sub)
        .sort((a, b) => b[1] - a[1]);
    const subcatsMerch = Object.entries(stockPorCategoria.merchandising.sub)
        .sort((a, b) => b[1] - a[1]);

    // ─── Helados detalle stock ────────────────────────────────────────────────
    const helados = productos
        .filter(p => p.categoria === 'cafetín' && p.subcategoria?.toLowerCase().trim() === 'helados')
        .sort((a, b) => b.stock - a.stock);
    const totalHeladosStock = helados.reduce((acc, p) => acc + (p.stock || 0), 0);

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
                <div className="flex items-center gap-2 flex-wrap">
                    <button onClick={() => setMostrarHistorialModal(true)} className="btn-secondary text-sm py-2.5">
                        <HistoryIcon className="w-4 h-4 text-violet-400" />
                        Historial de Entradas
                    </button>
                    <button onClick={() => setModalIngreso(true)} className="btn-secondary text-sm py-2.5 border-green-500/20 text-green-400 hover:bg-green-500/10">
                        <PlusCircle className="w-4 h-4" />
                        Registrar Entrada
                    </button>
                    <button onClick={() => setModalProducto({})} className="btn-primary text-sm py-2.5">
                        <Plus className="w-4 h-4" />
                        Nuevo Producto
                    </button>
                </div>
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

            {/* ── Resumen de Unidades Disponibles ── */}
            <div className="glass-card overflow-hidden">
                <button
                    onClick={() => setMostrarResumen(!mostrarResumen)}
                    className="w-full flex items-center justify-between p-4 hover:bg-white/[0.02] transition-colors"
                >
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-violet-500/10 flex items-center justify-center text-violet-400">
                            <BarChart3 className="w-4 h-4" />
                        </div>
                        <div className="text-left">
                            <h3 className="font-semibold text-sm">Resumen de Stock Disponible por Subcategorías</h3>
                            <p className="text-xs text-muted-foreground">
                                Total stock: <span className="font-mono font-semibold text-green-400">{stockPorCategoria.cafetín.total + stockPorCategoria.merchandising.total} uds</span> 
                                (Cafetín: {stockPorCategoria.cafetín.total} uds · Merch: {stockPorCategoria.merchandising.total} uds)
                            </p>
                        </div>
                    </div>
                    {mostrarResumen ? (
                        <ChevronUp className="w-4 h-4 text-muted-foreground" />
                    ) : (
                        <ChevronDown className="w-4 h-4 text-muted-foreground" />
                    )}
                </button>

                {mostrarResumen && (
                    <div className="p-5 border-t border-border/60 bg-muted/10 grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Cafetín */}
                        <div className="space-y-3">
                            <div className="flex items-center justify-between pb-2 border-b border-border/40">
                                <span className="flex items-center gap-2 text-sm font-semibold text-orange-400">
                                    <Coffee className="w-4 h-4" />
                                    ☕ Cafetín
                                </span>
                                <span className="text-xs font-bold bg-orange-500/10 text-orange-400 px-2.5 py-0.5 rounded-full border border-orange-500/20">
                                    {stockPorCategoria.cafetín.total} uds
                                </span>
                            </div>
                            {subcatsCafetin.length === 0 ? (
                                <p className="text-xs text-muted-foreground py-2">No hay productos en Cafetín</p>
                            ) : (
                                <div className="space-y-2.5">
                                    {subcatsCafetin.map(([sub, cant]) => {
                                        const pct = stockPorCategoria.cafetín.total > 0 ? (cant / stockPorCategoria.cafetín.total) * 100 : 0;
                                        return (
                                            <div key={sub} className="space-y-1">
                                                <div className="flex justify-between text-xs font-medium">
                                                    <span className="text-foreground">{sub}</span>
                                                    <span className="font-mono text-muted-foreground">{cant} uds ({pct.toFixed(0)}%)</span>
                                                </div>
                                                <div className="w-full h-1.5 bg-muted rounded-full overflow-hidden">
                                                    <div
                                                        className="h-full bg-orange-400 rounded-full transition-all duration-500"
                                                        style={{ width: `${pct}%` }}
                                                    />
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>

                        {/* Merchandising */}
                        <div className="space-y-3">
                            <div className="flex items-center justify-between pb-2 border-b border-border/40">
                                <span className="flex items-center gap-2 text-sm font-semibold text-violet-400">
                                    <ShoppingBag className="w-4 h-4" />
                                    🛍️ Merchandising
                                </span>
                                <span className="text-xs font-bold bg-violet-500/10 text-violet-400 px-2.5 py-0.5 rounded-full border border-violet-500/20">
                                    {stockPorCategoria.merchandising.total} uds
                                </span>
                            </div>
                            {subcatsMerch.length === 0 ? (
                                <p className="text-xs text-muted-foreground py-2">No hay productos en Merchandising</p>
                            ) : (
                                <div className="space-y-2.5">
                                    {subcatsMerch.map(([sub, cant]) => {
                                        const pct = stockPorCategoria.merchandising.total > 0 ? (cant / stockPorCategoria.merchandising.total) * 100 : 0;
                                        return (
                                            <div key={sub} className="space-y-1">
                                                <div className="flex justify-between text-xs font-medium">
                                                    <span className="text-foreground">{sub}</span>
                                                    <span className="font-mono text-muted-foreground">{cant} uds ({pct.toFixed(0)}%)</span>
                                                </div>
                                                <div className="w-full h-1.5 bg-muted rounded-full overflow-hidden">
                                                    <div
                                                        className="h-full bg-violet-400 rounded-full transition-all duration-500"
                                                        style={{ width: `${pct}%` }}
                                                    />
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>

            {/* ── Detalle de Stock de Helados ── */}
            <div className="glass-card overflow-hidden">
                <button
                    onClick={() => setMostrarHelados(!mostrarHelados)}
                    className="w-full flex items-center justify-between p-4 hover:bg-white/[0.02] transition-colors"
                >
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-pink-500/10 flex items-center justify-center text-pink-400">
                            <span className="text-base">🍦</span>
                        </div>
                        <div className="text-left">
                            <h3 className="font-semibold text-sm">Detalle de Stock de Helados</h3>
                            <p className="text-xs text-muted-foreground">
                                Total helados: <span className="font-mono font-semibold text-pink-400">{totalHeladosStock} uds</span> ({helados.length} sabores/tipos)
                            </p>
                        </div>
                    </div>
                    {mostrarHelados ? (
                        <ChevronUp className="w-4 h-4 text-muted-foreground" />
                    ) : (
                        <ChevronDown className="w-4 h-4 text-muted-foreground" />
                    )}
                </button>

                {mostrarHelados && (
                    <div className="p-5 border-t border-border/60 bg-muted/10">
                        {helados.length === 0 ? (
                            <p className="text-xs text-muted-foreground text-center py-4">No hay helados registrados en el catálogo</p>
                        ) : (
                            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3">
                                {helados.map(h => {
                                    const sinStock = h.stock === 0;
                                    const stockBajo = h.stock <= h.stockMinimo;
                                    return (
                                        <div key={h.id} className="bg-card border border-border/40 hover:border-pink-500/30 transition-all rounded-xl p-3 flex flex-col justify-between gap-2">
                                            <div className="min-w-0">
                                                <h4 className="text-xs font-semibold truncate" title={h.nombre}>
                                                    {h.nombre}
                                                </h4>
                                                {h.descripcion && (
                                                    <p className="text-[10px] text-muted-foreground truncate mt-0.5">{h.descripcion}</p>
                                                )}
                                            </div>
                                            <div className="flex items-center justify-between gap-2 mt-auto pt-2 border-t border-border/20">
                                                <span className={cn(
                                                    'inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold border',
                                                    sinStock
                                                        ? 'bg-red-500/10 text-red-400 border-red-500/20'
                                                        : stockBajo
                                                        ? 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                                                        : 'bg-pink-500/10 text-pink-400 border-pink-500/20'
                                                )}>
                                                    {sinStock ? 'Agotado' : `${h.stock} ${h.unidad || 'und'}`}
                                                </span>
                                                <span className="text-[11px] font-semibold text-muted-foreground font-mono">
                                                    {formatUSD(h.precioUSD)}
                                                </span>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* ── Filtros ── */}
            <div className="glass-card p-4">
                <div className="flex flex-col sm:flex-row gap-3">
                    {/* Búsqueda */}
                    <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <input
                            className="input-sistema pl-9 w-full"
                            placeholder="Buscar por nombre, descripción o subcategoría..."
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
                                            eurBcv={tasas.eurBcv ?? tasas.bcv}
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

            {/* Modal Registrar Entrada */}
            {modalIngreso && (
                <ModalIngreso
                    productos={productos}
                    onCerrar={() => setModalIngreso(false)}
                    onRegistrar={handleRegistrarIngreso}
                />
            )}

            {/* Modal Historial Entradas */}
            {mostrarHistorialModal && (
                <ModalHistorialIngresos
                    ingresos={ingresos}
                    onCerrar={() => setMostrarHistorialModal(false)}
                />
            )}
        </div>
    );
}

// ─── COMPONENTES AUXILIARES PARA INGRESO DE INVENTARIO ──────────────────────────

function ModalIngreso({
    productos,
    onCerrar,
    onRegistrar,
}: {
    productos: Producto[];
    onCerrar: () => void;
    onRegistrar: (productoId: string, cantidad: number, notas: string) => Promise<void>;
}) {
    const [productoId, setProductoId] = useState('');
    const [cantidad, setCantidad] = useState<number | ''>('');
    const [notas, setNotas] = useState('');

    // Agrupar productos
    const helados = productos.filter(p => p.categoria === 'cafetín' && p.subcategoria?.toLowerCase().trim() === 'helados');
    const otrosCafetin = productos.filter(p => p.categoria === 'cafetín' && p.subcategoria?.toLowerCase().trim() !== 'helados');
    const merch = productos.filter(p => p.categoria === 'merchandising');

    const registrar = async () => {
        if (!productoId) { toast.error('Selecciona un producto'); return; }
        if (!cantidad || cantidad <= 0) { toast.error('Ingresa una cantidad mayor a 0'); return; }
        
        const toastId = toast.loading('Registrando entrada de stock...');
        onCerrar(); // Cerrar modal inmediatamente
        
        try {
            await conTimeout(onRegistrar(productoId, cantidad, notas), 5000);
            toast.success('Entrada de inventario registrada', { id: toastId });
        } catch (err: any) {
            console.error(err);
            toast.error('Error al registrar entrada: ' + (err.message || err), { id: toastId });
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <div className="bg-card border border-border rounded-2xl w-full max-w-md shadow-2xl">
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-border">
                    <h3 className="text-lg font-semibold flex items-center gap-2">
                        <PlusCircle className="w-5 h-5 text-green-400" />
                        Registrar Entrada de Stock
                    </h3>
                    <button onClick={onCerrar} className="p-1.5 hover:bg-muted rounded-lg transition-colors">
                        <X className="w-4 h-4" />
                    </button>
                </div>

                {/* Form */}
                <div className="p-6 space-y-4">
                    <div>
                        <label className="text-xs text-muted-foreground mb-1.5 block">Seleccionar Producto *</label>
                        <select
                            className="input-sistema"
                            value={productoId}
                            onChange={e => setProductoId(e.target.value)}
                        >
                            <option value="">Selecciona un producto...</option>
                            {helados.length > 0 && (
                                <optgroup label="🍦 Helados">
                                    {helados.map(p => (
                                        <option key={p.id} value={p.id}>{p.nombre} (Stock: {p.stock})</option>
                                    ))}
                                </optgroup>
                            )}
                            {otrosCafetin.length > 0 && (
                                <optgroup label="☕ Otros Cafetín">
                                    {otrosCafetin.map(p => (
                                        <option key={p.id} value={p.id}>{p.nombre} (Stock: {p.stock})</option>
                                    ))}
                                </optgroup>
                            )}
                            {merch.length > 0 && (
                                <optgroup label="🛍️ Merchandising">
                                    {merch.map(p => (
                                        <option key={p.id} value={p.id}>{p.nombre} (Stock: {p.stock})</option>
                                    ))}
                                </optgroup>
                            )}
                        </select>
                    </div>

                    <div>
                        <label className="text-xs text-muted-foreground mb-1 block">Cantidad a Ingresar *</label>
                        <input
                            type="number"
                            min="1"
                            className="input-sistema font-mono"
                            placeholder="Ej: 12"
                            value={cantidad}
                            onChange={e => setCantidad(parseInt(e.target.value) || '')}
                        />
                    </div>

                    <div>
                        <label className="text-xs text-muted-foreground mb-1 block">Notas / Comentario (Opcional)</label>
                        <textarea
                            className="input-sistema resize-none"
                            rows={2}
                            placeholder="Ej: Compra de proveedor, reposición de nevera..."
                            value={notas}
                            onChange={e => setNotas(e.target.value)}
                        />
                    </div>
                </div>

                {/* Footer */}
                <div className="flex gap-3 p-6 border-t border-border">
                    <button onClick={onCerrar} className="flex-1 btn-secondary py-2.5 text-sm justify-center">
                        Cancelar
                    </button>
                    <button onClick={registrar} className="flex-1 btn-primary py-2.5 text-sm justify-center bg-green-600 hover:bg-green-700 text-white">
                        <PlusCircle className="w-4 h-4 mr-1.5" /> Registrar
                    </button>
                </div>
            </div>
        </div>
    );
}

function ModalHistorialIngresos({
    ingresos,
    onCerrar,
}: {
    ingresos: any[];
    onCerrar: () => void;
}) {
    const [busqueda, setBusqueda] = useState('');

    const filtrados = ingresos.filter(i =>
        i.productoNombre.toLowerCase().includes(busqueda.toLowerCase()) ||
        (i.notas || '').toLowerCase().includes(busqueda.toLowerCase()) ||
        (i.subcategoria || '').toLowerCase().includes(busqueda.toLowerCase())
    );

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <div className="bg-card border border-border rounded-2xl w-full max-w-2xl shadow-2xl max-h-[90vh] flex flex-col">
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-border flex-shrink-0">
                    <h3 className="text-lg font-semibold flex items-center gap-2">
                        <HistoryIcon className="w-5 h-5 text-violet-400" />
                        Historial de Entradas de Inventario
                    </h3>
                    <button onClick={onCerrar} className="p-1.5 hover:bg-muted rounded-lg transition-colors">
                        <X className="w-4 h-4" />
                    </button>
                </div>

                {/* Buscador */}
                <div className="p-4 border-b border-border bg-muted/10 flex-shrink-0">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <input
                            className="input-sistema pl-9 w-full"
                            placeholder="Buscar por producto, notas o subcategoría..."
                            value={busqueda}
                            onChange={e => setBusqueda(e.target.value)}
                        />
                    </div>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6 min-h-0">
                    {filtrados.length === 0 ? (
                        <div className="text-center py-12 text-muted-foreground space-y-2">
                            <FileText className="w-12 h-12 mx-auto opacity-20" />
                            <p>No se encontraron registros de entrada</p>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {filtrados.map(reg => {
                                const esHelado = reg.subcategoria?.toLowerCase().trim() === 'helados';
                                return (
                                    <div key={reg.id} className="bg-muted/20 border border-border/40 rounded-xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-3">
                                        <div className="space-y-1.5 min-w-0">
                                            <div className="flex items-center gap-2 flex-wrap">
                                                <h4 className="text-sm font-semibold truncate">{reg.productoNombre}</h4>
                                                <span className={cn(
                                                    'inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold border',
                                                    reg.categoria === 'cafetín'
                                                        ? esHelado ? 'bg-pink-500/10 text-pink-400 border-pink-500/20' : 'bg-orange-500/10 text-orange-400 border-orange-500/20'
                                                        : 'bg-violet-500/10 text-violet-400 border-violet-500/20'
                                                )}>
                                                    {esHelado ? '🍦 Helado' : reg.subcategoria || reg.categoria}
                                                </span>
                                            </div>
                                            {reg.notas && (
                                                <p className="text-xs text-muted-foreground leading-relaxed">
                                                    {reg.notas}
                                                </p>
                                            )}
                                            <p className="text-[10px] text-muted-foreground">
                                                Registrado por: <span className="text-foreground">{reg.usuarioNombre}</span> · {reg.fechaStr}
                                            </p>
                                        </div>
                                        <div className="shrink-0 flex items-center">
                                            <span className="inline-flex items-center px-3 py-1 rounded-lg text-sm font-bold bg-green-500/10 text-green-400 border border-green-500/20 font-mono">
                                                +{reg.cantidad} uds
                                            </span>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="p-4 border-t border-border flex justify-end flex-shrink-0">
                    <button onClick={onCerrar} className="btn-secondary py-2 text-sm px-6 justify-center">
                        Cerrar
                    </button>
                </div>
            </div>
        </div>
    );
}
