‘use client’;

/**

- app/inventario/page.tsx
- Gestión completa de inventario/productos con CRUD y alertas de stock
  */

import { useState } from ‘react’;
import {
Plus, Search, Package, Edit2, Trash2, AlertTriangle, Filter,
Download, Upload, Tags, BarChart3, ChevronDown, ChevronUp, X,
CheckCircle2, XCircle,
} from ‘lucide-react’;
import toast from ‘react-hot-toast’;
import { useTasas } from ‘@/components/providers/TasasProvider’;
import { formatBs, formatUSD } from ‘@/lib/utils’;
import { cn } from ‘@/lib/utils’;

// Tipos
interface Producto {
id: string;
nombre: string;
codigo: string;
categoria: string;
descripcion: string;
precioBs: number;
precioLista2?: number;
precioMayorista?: number;
stock: number;
stockMinimo: number;
unidad: string;
proveedor?: string;
activo: boolean;
fechaCreacion: string;
}

// Datos demo
const PRODUCTOS_DEMO: Producto[] = [];

const CATEGORIAS_DEFAULT = [‘Bebidas’, ‘Panadería’, ‘Aceites’, ‘Harinas’, ‘Básicos’, ‘Granos’, ‘Lácteos’, ‘Café’, ‘Higiene’];
const UNIDADES = [‘unidad’, ‘kg’, ‘litro’, ‘caja’, ‘paquete’, ‘docena’, ‘gramo’, ‘ml’];

// Modal de producto
function ModalProducto({
producto,
onCerrar,
onGuardar,
tasaBCV,
categorias,
onNuevaCategoria,
}: {
producto: Partial<Producto> | null;
onCerrar: () => void;
onGuardar: (p: Producto) => void;
tasaBCV: number;
categorias: string[];
onNuevaCategoria: (c: string) => void;
}) {
const [form, setForm] = useState<Partial<Producto>>(producto || {
nombre: ‘’, codigo: ‘’, categoria: ‘’, descripcion: ‘’,
precioBs: 0, stock: 0, stockMinimo: 5, unidad: ‘unidad’, activo: true,
});
const [nuevaCategoria, setNuevaCategoria] = useState(’’);
const [mostrarNueva, setMostrarNueva] = useState(false);

```
const actualizar = (campo: string, valor: any) => setForm(prev => ({ ...prev, [campo]: valor }));
const esEdicion = !!(producto as any)?.id;

const guardar = () => {
    if (!form.nombre || !form.codigo || !form.precioBs) {
        toast.error('Completa los campos requeridos');
        return;
    }
    onGuardar({
        ...form,
        id: (producto as any)?.id || Date.now().toString(),
        fechaCreacion: (producto as any)?.fechaCreacion || new Date().toISOString().split('T')[0],
    } as Producto);
    toast.success(esEdicion ? 'Producto actualizado' : 'Producto creado');
    onCerrar();
};

return (
    <div className="modal-overlay">
        <div className="glass-card w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            {/* Header modal */}
            <div className="flex items-center justify-between p-6 border-b border-border">
                <h3 className="text-lg font-semibold">
                    {esEdicion ? 'Editar Producto' : 'Nuevo Producto'}
                </h3>
                <button onClick={onCerrar} className="text-muted-foreground hover:text-foreground">
                    <X className="w-5 h-5" />
                </button>
            </div>

            <div className="p-6 space-y-4">
                {/* Info básica */}
                <div className="grid grid-cols-2 gap-4">
                    <div className="col-span-2">
                        <label className="text-xs text-muted-foreground mb-1 block">Nombre del producto *</label>
                        <input
                            className="input-sistema"
                            value={form.nombre || ''}
                            onChange={(e) => actualizar('nombre', e.target.value)}
                            placeholder="Nombre del producto"
                        />
                    </div>
                    <div>
                        <label className="text-xs text-muted-foreground mb-1 block">Código *</label>
                        <input
                            className="input-sistema font-mono"
                            value={form.codigo || ''}
                            onChange={(e) => actualizar('codigo', e.target.value)}
                            placeholder="001"
                        />
                    </div>
                    <div>
                        <label className="text-xs text-muted-foreground mb-1 block">Categoría</label>
                        {!mostrarNueva ? (
                            <div className="flex gap-2">
                                <select
                                    className="input-sistema flex-1"
                                    value={form.categoria || ''}
                                    onChange={(e) => actualizar('categoria', e.target.value)}
                                >
                                    <option value="">Seleccionar...</option>
                                    {categorias.map((c) => <option key={c} value={c}>{c}</option>)}
                                </select>
                                <button
                                    type="button"
                                    onClick={() => setMostrarNueva(true)}
                                    className="px-3 py-2 bg-blue-500/10 border border-blue-500/30 text-blue-400 rounded-lg text-xs hover:bg-blue-500/20 transition-all whitespace-nowrap"
                                    title="Agregar nueva categoría"
                                >
                                    + Nueva
                                </button>
                            </div>
                        ) : (
                            <div className="flex gap-2">
                                <input
                                    type="text"
                                    className="input-sistema flex-1"
                                    placeholder="Nombre de categoría..."
                                    value={nuevaCategoria}
                                    onChange={(e) => setNuevaCategoria(e.target.value)}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter' && nuevaCategoria.trim()) {
                                            onNuevaCategoria(nuevaCategoria.trim());
                                            actualizar('categoria', nuevaCategoria.trim());
                                            setNuevaCategoria('');
                                            setMostrarNueva(false);
                                        }
                                        if (e.key === 'Escape') setMostrarNueva(false);
                                    }}
                                    autoFocus
                                />
                                <button
                                    type="button"
                                    onClick={() => {
                                        if (nuevaCategoria.trim()) {
                                            onNuevaCategoria(nuevaCategoria.trim());
                                            actualizar('categoria', nuevaCategoria.trim());
                                            setNuevaCategoria('');
                                        }
                                        setMostrarNueva(false);
                                    }}
                                    className="px-3 py-2 bg-green-500/10 border border-green-500/30 text-green-400 rounded-lg text-xs hover:bg-green-500/20 transition-all"
                                >
                                    ✓ Agregar
                                </button>
                                <button
                                    type="button"
                                    onClick={() => { setMostrarNueva(false); setNuevaCategoria(''); }}
                                    className="px-3 py-2 bg-red-500/10 border border-red-500/30 text-red-400 rounded-lg text-xs hover:bg-red-500/20 transition-all"
                                >
                                    ✕
                                </button>
                            </div>
                        )}
                    </div>
                    <div className="col-span-2">
                        <label className="text-xs text-muted-foreground mb-1 block">Descripción</label>
                        <textarea
                            className="input-sistema resize-none"
                            rows={2}
                            value={form.descripcion || ''}
                            onChange={(e) => actualizar('descripcion', e.target.value)}
                            placeholder="Descripción del producto..."
                        />
                    </div>
                </div>

                {/* Precios */}
                <div className="border-t border-border pt-4">
                    <h4 className="text-sm font-medium mb-3">Precios</h4>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="text-xs text-muted-foreground mb-1 block">Precio Base (Bs) *</label>
                            <input
                                type="number"
                                className="input-sistema font-mono"
                                value={form.precioBs || ''}
                                onChange={(e) => actualizar('precioBs', parseFloat(e.target.value) || 0)}
                                placeholder="0.00"
                            />
                            {form.precioBs && tasaBCV > 0 && (
                                <p className="text-xs text-blue-400 font-mono mt-0.5">
                                    ≈ {formatUSD((form.precioBs || 0) / tasaBCV)}
                                </p>
                            )}
                        </div>
                        <div>
                            <label className="text-xs text-muted-foreground mb-1 block">Precio Lista 2 (Bs)</label>
                            <input
                                type="number"
                                className="input-sistema font-mono"
                                value={form.precioLista2 || ''}
                                onChange={(e) => actualizar('precioLista2', parseFloat(e.target.value) || 0)}
                                placeholder="0.00"
                            />
                        </div>
                        <div>
                            <label className="text-xs text-muted-foreground mb-1 block">Precio Mayorista (Bs)</label>
                            <input
                                type="number"
                                className="input-sistema font-mono"
                                value={form.precioMayorista || ''}
                                onChange={(e) => actualizar('precioMayorista', parseFloat(e.target.value) || 0)}
                                placeholder="0.00"
                            />
                        </div>
                    </div>
                </div>

                {/* Stock */}
                <div className="border-t border-border pt-4">
                    <h4 className="text-sm font-medium mb-3">Stock e Inventario</h4>
                    <div className="grid grid-cols-3 gap-4">
                        <div>
                            <label className="text-xs text-muted-foreground mb-1 block">Stock actual</label>
                            <input
                                type="number"
                                className="input-sistema"
                                value={form.stock ?? ''}
                                onChange={(e) => actualizar('stock', parseInt(e.target.value) || 0)}
                                placeholder="0"
                            />
                        </div>
                        <div>
                            <label className="text-xs text-muted-foreground mb-1 block">Stock mínimo</label>
                            <input
                                type="number"
                                className="input-sistema"
                                value={form.stockMinimo ?? ''}
                                onChange={(e) => actualizar('stockMinimo', parseInt(e.target.value) || 0)}
                                placeholder="5"
                            />
                        </div>
                        <div>
                            <label className="text-xs text-muted-foreground mb-1 block">Unidad de medida</label>
                            <select
                                className="input-sistema"
                                value={form.unidad || 'unidad'}
                                onChange={(e) => actualizar('unidad', e.target.value)}
                            >
                                {UNIDADES.map((u) => <option key={u} value={u}>{u}</option>)}
                            </select>
                        </div>
                        <div className="col-span-2">
                            <label className="text-xs text-muted-foreground mb-1 block">Proveedor</label>
                            <input
                                className="input-sistema"
                                value={form.proveedor || ''}
                                onChange={(e) => actualizar('proveedor', e.target.value)}
                                placeholder="Nombre del proveedor"
                            />
                        </div>
                        <div className="flex items-center gap-2 mt-4">
                            <div
                                className={cn(
                                    'w-10 h-6 rounded-full cursor-pointer transition-colors flex items-center px-0.5',
                                    form.activo ? 'bg-green-500 justify-end' : 'bg-muted justify-start'
                                )}
                                onClick={() => actualizar('activo', !form.activo)}
                            >
                                <div className="w-5 h-5 bg-white rounded-full shadow-md" />
                            </div>
                            <span className="text-sm">{form.activo ? 'Activo' : 'Inactivo'}</span>
                        </div>
                    </div>
                </div>

                {/* Botones */}
                <div className="flex justify-end gap-3 pt-2">
                    <button onClick={onCerrar} className="btn-secondary">Cancelar</button>
                    <button onClick={guardar} className="btn-primary">
                        <CheckCircle2 className="w-4 h-4" />
                        {esEdicion ? 'Actualizar' : 'Crear Producto'}
                    </button>
                </div>
            </div>
        </div>
    </div>
);
```

}

// ============================
// PÁGINA PRINCIPAL
// ============================
export default function InventarioPage() {
const { tasas } = useTasas();
const [productos, setProductos] = useState<Producto[]>(PRODUCTOS_DEMO);
const [busqueda, setBusqueda] = useState(’’);
const [categoriaFiltro, setCategoriaFiltro] = useState(‘Todos’);
const [categoriasDinamicas, setCategoriasDinamicas] = useState<string[]>(CATEGORIAS_DEFAULT);
const [soloStockBajo, setSoloStockBajo] = useState(false);
const [soloActivos, setSoloActivos] = useState(false);
const [modalProducto, setModalProducto] = useState<Partial<Producto> | null | undefined>(undefined);

```
const productosFiltrados = productos.filter((p) => {
    const matchBusqueda = p.nombre.toLowerCase().includes(busqueda.toLowerCase()) ||
        p.codigo.includes(busqueda);
    const matchCategoria = categoriaFiltro === 'Todos' || p.categoria === categoriaFiltro;
    const matchStock = !soloStockBajo || p.stock < p.stockMinimo;
    const matchActivo = !soloActivos || p.activo;
    return matchBusqueda && matchCategoria && matchStock && matchActivo;
});

const stockBajoCount = productos.filter((p) => p.stock < p.stockMinimo).length;

const eliminarProducto = (id: string) => {
    setProductos(productos.filter((p) => p.id !== id));
    toast.success('Producto eliminado');
};

const guardarProducto = (producto: Producto) => {
    const existe = productos.find((p) => p.id === producto.id);
    if (existe) {
        setProductos(productos.map((p) => p.id === producto.id ? producto : p));
    } else {
        setProductos([...productos, producto]);
    }
};

return (
    <div className="space-y-6 animate-fade-in">
        {/* Header */}
        <div className="flex items-center justify-between">
            <div>
                <h1 className="text-2xl font-bold">Inventario</h1>
                <p className="text-muted-foreground text-sm mt-0.5">
                    {productos.length} productos · {stockBajoCount > 0 && (
                        <span className="text-red-400 font-medium">{stockBajoCount} con stock bajo</span>
                    )}
                </p>
            </div>
            <div className="flex items-center gap-2">
                <button className="btn-secondary text-sm">
                    <Upload className="w-4 h-4" /> Importar CSV
                </button>
                <button className="btn-secondary text-sm">
                    <Download className="w-4 h-4" /> Exportar
                </button>
                <button
                    className="btn-primary text-sm"
                    onClick={() => setModalProducto({})}
                >
                    <Plus className="w-4 h-4" /> Nuevo Producto
                </button>
            </div>
        </div>

        {/* Alerta stock bajo */}
        {stockBajoCount > 0 && (
            <div
                className="flex items-center gap-3 p-4 bg-red-500/10 border border-red-500/30 rounded-xl cursor-pointer hover:bg-red-500/15 transition-colors"
                onClick={() => setSoloStockBajo(!soloStockBajo)}
            >
                <AlertTriangle className="w-5 h-5 text-red-400" />
                <div className="flex-1">
                    <p className="text-sm font-semibold text-red-400">
                        ⚠️ {stockBajoCount} productos con stock bajo
                    </p>
                    <p className="text-xs text-muted-foreground">
                        Haz clic para filtrar solo los productos con stock por debajo del mínimo
                    </p>
                </div>
                {soloStockBajo && <X className="w-4 h-4 text-muted-foreground" />}
            </div>
        )}

        {/* Filtros */}
        <div className="flex flex-wrap items-center gap-3">
            <div className="relative flex-1 min-w-48">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input
                    className="input-sistema pl-10"
                    placeholder="Buscar por nombre o código..."
                    value={busqueda}
                    onChange={(e) => setBusqueda(e.target.value)}
                />
            </div>
            <select
                className="input-sistema w-auto"
                value={categoriaFiltro}
                onChange={(e) => setCategoriaFiltro(e.target.value)}
            >
                {['Todos', ...categoriasDinamicas].map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
            <button
                className={cn(
                    'btn-secondary text-sm',
                    soloActivos && 'border-green-500/40 text-green-400 bg-green-500/10'
                )}
                onClick={() => setSoloActivos(!soloActivos)}
            >
                <CheckCircle2 className="w-4 h-4" />
                Solo activos
            </button>
        </div>

        {/* Tabla de productos */}
        <div className="card-sistema overflow-hidden p-0">
            <div className="overflow-x-auto">
                <table className="tabla-sistema">
                    <thead>
                        <tr>
                            <th>Código</th>
                            <th>Producto</th>
                            <th>Categoría</th>
                            <th>Precio (Bs)</th>
                            <th>Precio (USD)</th>
                            <th>Stock</th>
                            <th>Estado</th>
                            <th>Acciones</th>
                        </tr>
                    </thead>
                    <tbody>
                        {productosFiltrados.map((producto) => {
                            const stockBajo = producto.stock < producto.stockMinimo;
                            return (
                                <tr key={producto.id}>
                                    <td>
                                        <span className="font-mono text-xs text-muted-foreground">{producto.codigo}</span>
                                    </td>
                                    <td>
                                        <div>
                                            <p className="font-medium">{producto.nombre}</p>
                                            <p className="text-xs text-muted-foreground">{producto.unidad}</p>
                                        </div>
                                    </td>
                                    <td>
                                        <span className="badge badge-blue">{producto.categoria}</span>
                                    </td>
                                    <td>
                                        <span className="font-mono text-sm">{formatBs(producto.precioBs)}</span>
                                    </td>
                                    <td>
                                        <span className="font-mono text-sm text-muted-foreground">
                                            {formatUSD(producto.precioBs / tasas.bcv)}
                                        </span>
                                    </td>
                                    <td>
                                        <div className="flex items-center gap-2">
                                            <span
                                                className={cn(
                                                    'font-semibold',
                                                    stockBajo ? 'text-red-400' : 'text-green-400'
                                                )}
                                            >
                                                {producto.stock}
                                            </span>
                                            {stockBajo && (
                                                <AlertTriangle className="w-3.5 h-3.5 text-red-400" />
                                            )}
                                            <span className="text-xs text-muted-foreground">
                                                / min {producto.stockMinimo}
                                            </span>
                                        </div>
                                    </td>
                                    <td>
                                        <span className={cn(
                                            'badge',
                                            producto.activo ? 'badge-green' : 'badge-gray'
                                        )}>
                                            {producto.activo ? 'Activo' : 'Inactivo'}
                                        </span>
                                    </td>
                                    <td>
                                        <div className="flex items-center gap-2">
                                            <button
                                                className="text-muted-foreground hover:text-blue-400 transition-colors"
                                                onClick={() => setModalProducto(producto)}
                                            >
                                                <Edit2 className="w-4 h-4" />
                                            </button>
                                            <button
                                                className="text-muted-foreground hover:text-red-400 transition-colors"
                                                onClick={() => eliminarProducto(producto.id)}
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>

                {productosFiltrados.length === 0 && (
                    <div className="text-center py-12 text-muted-foreground">
                        <Package className="w-12 h-12 mx-auto mb-3 opacity-30" />
                        <p>No se encontraron productos</p>
                    </div>
                )}
            </div>
        </div>

        {/* Modal de producto */}
        {modalProducto !== undefined && (
            <ModalProducto
                producto={modalProducto}
                onCerrar={() => setModalProducto(undefined)}
                onGuardar={guardarProducto}
                tasaBCV={tasas.bcv}
                categorias={categoriasDinamicas}
                onNuevaCategoria={(c) => {
                    if (!categoriasDinamicas.includes(c)) {
                        setCategoriasDinamicas(prev => [...prev, c]);
                        toast.success(`Categoria "${c}" agregada`);
                    }
                }}
            />
        )}
    </div>
);
```

}