'use client';

/**
 * app/inventario/page.tsx
 * Control de equipos y muebles de ATEMPO
 */

import { useState, useEffect, useMemo } from 'react';
import {
    Plus, Search, Edit2, Trash2, X, CheckCircle2,
    Package, Boxes, AlertTriangle, Clock, RotateCcw,
    User, ArrowRightLeft, History, ChevronDown,
    ChevronUp, Loader2, Info, WrenchIcon, ShieldCheck,
    CalendarDays, Tag,
} from 'lucide-react';
import {
    collection, addDoc, updateDoc, deleteDoc, doc,
    onSnapshot, serverTimestamp, Timestamp,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/components/providers/AuthProvider';
import { cn } from '@/lib/utils';
import toast from 'react-hot-toast';

// ─── Tipos ────────────────────────────────────────────────────────────────────

type EstadoItem = 'bueno' | 'regular' | 'danado' | 'en_reparacion' | 'dado_de_baja';

interface ItemInventario {
    id: string;
    nombre: string;
    categoria: string;
    subcategoria?: string;
    descripcion?: string;
    cantidad: number;
    cantidadDisponible: number;
    estado: EstadoItem;
    ubicacion?: string;
    numeroSerie?: string;
    fechaAdquisicion?: string;
    valorUSD?: number;
    notas?: string;
    creadoEn: Timestamp;
    actualizadoEn?: Timestamp;
}

interface CategoriaInventario {
    id: string;
    nombre: string;
    subcategorias: string[];
}

interface Prestamo {
    id: string;
    itemId: string;
    itemNombre: string;
    cantidadPrestada: number;
    responsable: string;
    proposito: string;
    fechaPrestamo: Timestamp;
    fechaDevolucionEsperada?: Timestamp;
    fechaDevolucionReal?: Timestamp;
    devuelto: boolean;
    notas?: string;
    registradoPor: string;
}

// ─── Constantes ───────────────────────────────────────────────────────────────

const COLORES_DINAMICOS = [
    { color: 'text-blue-400',    bg: 'bg-blue-500/10 border-blue-500/20' },
    { color: 'text-purple-400',  bg: 'bg-purple-500/10 border-purple-500/20' },
    { color: 'text-amber-400',   bg: 'bg-amber-500/10 border-amber-500/20' },
    { color: 'text-orange-400',  bg: 'bg-orange-500/10 border-orange-500/20' },
    { color: 'text-cyan-400',    bg: 'bg-cyan-500/10 border-cyan-500/20' },
    { color: 'text-pink-400',    bg: 'bg-pink-500/10 border-pink-500/20' },
    { color: 'text-teal-400',    bg: 'bg-teal-500/10 border-teal-500/20' },
    { color: 'text-emerald-400', bg: 'bg-emerald-500/10 border-emerald-500/20' },
];

function getEstiloCategoria(catNombre: string) {
    if (!catNombre) return { color: 'text-slate-400', bg: 'bg-slate-500/10 border-slate-500/20' };
    const hash = catNombre.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    return COLORES_DINAMICOS[hash % COLORES_DINAMICOS.length];
}

const ESTADOS: Record<EstadoItem, { label: string; color: string; bg: string; icon: React.ElementType }> = {
    bueno:         { label: 'Bueno',         color: 'text-emerald-400', bg: 'bg-emerald-500/10 border-emerald-500/20', icon: ShieldCheck   },
    regular:       { label: 'Regular',       color: 'text-amber-400',   bg: 'bg-amber-500/10 border-amber-500/20',     icon: Info          },
    danado:        { label: 'Danado',        color: 'text-red-400',     bg: 'bg-red-500/10 border-red-500/20',         icon: AlertTriangle },
    en_reparacion: { label: 'En reparacion', color: 'text-orange-400',  bg: 'bg-orange-500/10 border-orange-500/20',   icon: WrenchIcon    },
    dado_de_baja:  { label: 'Dado de baja',  color: 'text-slate-400',   bg: 'bg-slate-500/10 border-slate-500/20',     icon: Trash2        },
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatFecha(ts: Timestamp | undefined | null): string {
    if (!ts) return '-';
    return ts.toDate().toLocaleDateString('es-VE', { day: '2-digit', month: 'short', year: 'numeric' });
}

function diasDesde(ts: Timestamp): number {
    return Math.floor((Date.now() - ts.toDate().getTime()) / 86400000);
}

function BadgeCategoria({ cat }: { cat: string }) {
    const c = getEstiloCategoria(cat);
    return (
        <span className={cn('inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold border', c.bg, c.color)}>
            {cat}
        </span>
    );
}

function BadgeSubcategoria({ subcategoria }: { subcategoria: string }) {
    return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-muted/60 text-muted-foreground border border-border/40">
            {subcategoria}
        </span>
    );
}

function BadgeEstado({ estado }: { estado: EstadoItem }) {
    const e = ESTADOS[estado] ?? { label: estado || 'Bueno', color: 'text-slate-400', bg: 'bg-slate-500/10 border-slate-500/20', icon: ShieldCheck };
    const Icon = e.icon;
    return (
        <span className={cn('inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border', e.bg, e.color)}>
            <Icon className="w-3 h-3" /> {e.label}
        </span>
    );
}

// ─── Modal Gestionar Categorías ──────────────────────────────────────────────────

function ModalGestionarCategorias({
    categorias,
    onCerrar,
    onGuardar,
    onEliminar,
}: {
    categorias: CategoriaInventario[];
    onCerrar: () => void;
    onGuardar: (id: string | null, nombre: string, subcategorias: string[]) => Promise<void>;
    onEliminar: (id: string) => Promise<void>;
}) {
    const [nuevaCatNombre, setNuevaCatNombre] = useState('');
    const [editandoCatId, setEditandoCatId] = useState<string | null>(null);
    const [editandoCatNombre, setEditandoCatNombre] = useState('');
    const [nuevaSubcat, setNuevaSubcat] = useState<Record<string, string>>({});

    const handleCrearCategoria = async () => {
        if (!nuevaCatNombre.trim()) { toast.error('Ingresa un nombre'); return; }
        await onGuardar(null, nuevaCatNombre, []);
        setNuevaCatNombre('');
    };

    const handleRename = async (cat: CategoriaInventario) => {
        if (!editandoCatNombre.trim()) return;
        await onGuardar(cat.id, editandoCatNombre, cat.subcategorias);
        setEditandoCatId(null);
    };

    const handleAddSubcat = async (cat: CategoriaInventario) => {
        const sub = nuevaSubcat[cat.id] || '';
        if (!sub.trim()) return;
        if (cat.subcategorias.includes(sub.trim())) { toast.error('Ya existe esta subcategoría'); return; }
        const actualizadas = [...cat.subcategorias, sub.trim()];
        await onGuardar(cat.id, cat.nombre, actualizadas);
        setNuevaSubcat(p => ({ ...p, [cat.id]: '' }));
    };

    const handleRemoveSubcat = async (cat: CategoriaInventario, subIndex: number) => {
        const actualizadas = cat.subcategorias.filter((_, i) => i !== subIndex);
        await onGuardar(cat.id, cat.nombre, actualizadas);
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <div className="bg-card border border-border rounded-2xl w-full max-w-lg shadow-2xl max-h-[85vh] flex flex-col">
                <div className="flex items-center justify-between p-5 border-b border-border flex-shrink-0">
                    <h3 className="text-base font-semibold flex items-center gap-2">
                        <Tag className="w-4 h-4 text-purple-400" />
                        Gestionar Categorías y Subcategorías
                    </h3>
                    <button onClick={onCerrar} className="p-1.5 hover:bg-muted rounded-lg transition-colors">
                        <X className="w-4 h-4" />
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto p-5 space-y-4">
                    <div className="bg-muted/20 border border-border p-3.5 rounded-xl space-y-2">
                        <label className="text-xs text-muted-foreground font-medium block">Crear Nueva Categoría Principal</label>
                        <div className="flex gap-2">
                            <input
                                className="input-sistema py-1.5 text-sm flex-1"
                                placeholder="Ej: Depósito, Cafetín, Oficina..."
                                value={nuevaCatNombre}
                                onChange={e => setNuevaCatNombre(e.target.value)}
                            />
                            <button onClick={handleCrearCategoria} className="btn-primary py-1.5 px-3 text-xs">
                                <Plus className="w-3.5 h-3.5" /> Agregar
                            </button>
                        </div>
                    </div>

                    <div className="border-t border-border my-2" />

                    <div className="space-y-3">
                        {categorias.length === 0 ? (
                            <p className="text-xs text-muted-foreground text-center py-6">No hay categorías configuradas. Crea una arriba.</p>
                        ) : (
                            categorias.map(cat => {
                                const isEditing = editandoCatId === cat.id;
                                return (
                                    <div key={cat.id} className="bg-muted/10 border border-border rounded-xl p-3 space-y-3">
                                        <div className="flex items-center justify-between gap-2">
                                            {isEditing ? (
                                                <div className="flex gap-1.5 flex-1">
                                                    <input
                                                        className="input-sistema py-1 text-xs flex-1"
                                                        value={editandoCatNombre}
                                                        onChange={e => setEditandoCatNombre(e.target.value)}
                                                    />
                                                    <button onClick={() => handleRename(cat)} className="text-xs text-green-400 hover:underline">Listo</button>
                                                    <button onClick={() => setEditandoCatId(null)} className="text-xs text-muted-foreground hover:underline">X</button>
                                                </div>
                                            ) : (
                                                <div className="flex items-center gap-1.5">
                                                    <span className="font-semibold text-sm">{cat.nombre}</span>
                                                    <button
                                                        onClick={() => {
                                                            setEditandoCatId(cat.id);
                                                            setEditandoCatNombre(cat.nombre);
                                                        }}
                                                        className="p-1 hover:bg-muted rounded text-muted-foreground hover:text-foreground"
                                                    >
                                                        <Edit2 className="w-3 h-3" />
                                                    </button>
                                                </div>
                                            )}

                                            {!isEditing && (
                                                <button
                                                    onClick={() => onEliminar(cat.id)}
                                                    className="p-1 hover:bg-red-500/15 rounded text-muted-foreground hover:text-red-400"
                                                >
                                                    <Trash2 className="w-3.5 h-3.5" />
                                                </button>
                                            )}
                                        </div>

                                        <div className="space-y-2">
                                            <p className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider">Subcategorías</p>
                                            <div className="flex flex-wrap gap-1.5">
                                                {cat.subcategorias.length === 0 ? (
                                                    <span className="text-xs text-muted-foreground italic">Sin subcategorías</span>
                                                ) : (
                                                    cat.subcategorias.map((sub, i) => (
                                                        <span key={i} className="inline-flex items-center gap-1 bg-background border border-border text-xs px-2 py-0.5 rounded-full text-foreground">
                                                            {sub}
                                                            <button
                                                                onClick={() => handleRemoveSubcat(cat, i)}
                                                                className="text-muted-foreground hover:text-red-400 ml-0.5 font-bold"
                                                            >
                                                                ×
                                                            </button>
                                                        </span>
                                                    ))
                                                )}
                                            </div>

                                            <div className="flex gap-1.5 pt-1">
                                                <input
                                                    className="input-sistema py-1 text-xs flex-1"
                                                    placeholder="Nueva subcategoría..."
                                                    value={nuevaSubcat[cat.id] || ''}
                                                    onChange={e => setNuevaSubcat(p => ({ ...p, [cat.id]: e.target.value }))}
                                                    onKeyDown={e => {
                                                        if (e.key === 'Enter') handleAddSubcat(cat);
                                                    }}
                                                />
                                                <button
                                                    onClick={() => handleAddSubcat(cat)}
                                                    className="px-2 py-1 bg-purple-500/10 border border-purple-500/20 text-purple-400 rounded-lg text-xs hover:bg-purple-500/20 transition-all font-semibold"
                                                >
                                                    +
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })
                        )}
                    </div>
                </div>

                <div className="p-4 border-t border-border flex justify-end flex-shrink-0">
                    <button onClick={onCerrar} className="btn-secondary py-2 px-4 text-xs font-semibold">
                        Cerrar
                    </button>
                </div>
            </div>
        </div>
    );
}

// ─── Modal Item ───────────────────────────────────────────────────────────────

function ModalItem({
    item,
    onCerrar,
    onGuardar,
    categorias,
}: {
    item: Partial<ItemInventario> | null;
    onCerrar: () => void;
    onGuardar: (data: Partial<ItemInventario>) => Promise<void>;
    categorias: CategoriaInventario[];
}) {
    const esEdicion = !!(item as ItemInventario)?.id;
    const [form, setForm] = useState<Partial<ItemInventario>>(() => {
        const defaults = {
            nombre: '',
            categoria: categorias[0]?.nombre || 'Otro',
            subcategoria: '',
            cantidad: 1,
            cantidadDisponible: 1,
            estado: 'bueno' as EstadoItem,
            ubicacion: '',
            descripcion: '',
            numeroSerie: '',
            valorUSD: undefined,
            notas: '',
        };
        return { ...defaults, ...item };
    });

    const [cantidadStr, setCantidadStr] = useState(
        String((item as ItemInventario)?.cantidad ?? 1)
    );
    const [disponibleStr, setDisponibleStr] = useState(
        String((item as ItemInventario)?.cantidadDisponible ?? 1)
    );
    const [guardando, setGuardando] = useState(false);

    const set = (k: keyof ItemInventario, v: unknown) =>
        setForm(prev => ({ ...prev, [k]: v }));

    const handleCantidadChange = (raw: string) => {
        setCantidadStr(raw);
        const num = parseInt(raw);
        if (!isNaN(num) && num >= 1) {
            set('cantidad', num);
            const dispActual = parseInt(disponibleStr);
            if (!isNaN(dispActual) && dispActual > num) {
                setDisponibleStr(String(num));
                set('cantidadDisponible', num);
            }
        }
    };

    const handleDisponibleChange = (raw: string) => {
        setDisponibleStr(raw);
        const num = parseInt(raw);
        const total = parseInt(cantidadStr) || 1;
        if (!isNaN(num) && num >= 0) {
            set('cantidadDisponible', Math.min(num, total));
        }
    };

    const handleGuardar = async () => {
        if (!form.nombre?.trim()) { toast.error('El nombre es obligatorio'); return; }
        const cantidad = parseInt(cantidadStr);
        const disponible = parseInt(disponibleStr);
        if (isNaN(cantidad) || cantidad < 1) { toast.error('La cantidad debe ser al menos 1'); return; }
        if (isNaN(disponible) || disponible < 0) { toast.error('La cantidad disponible no puede ser negativa'); return; }
        const formFinal = { ...form, cantidad, cantidadDisponible: Math.min(disponible, cantidad) };
        setGuardando(true);
        try {
            await onGuardar(formFinal);
            onCerrar();
        } catch (err) {
            console.error('Error al guardar item:', err);
            toast.error('Error al guardar. Intenta de nuevo.');
        } finally {
            setGuardando(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <div className="bg-card border border-border rounded-2xl w-full max-w-lg shadow-2xl max-h-[90vh] overflow-y-auto">
                <div className="flex items-center justify-between p-5 border-b border-border flex-shrink-0">
                    <h3 className="text-base font-semibold flex items-center gap-2">
                        <Boxes className="w-4 h-4 text-blue-400" />
                        {esEdicion ? 'Editar Item' : 'Nuevo Item'}
                    </h3>
                    <button onClick={onCerrar} className="p-1.5 hover:bg-muted rounded-lg transition-colors">
                        <X className="w-4 h-4" />
                    </button>
                </div>

                <div className="p-5 space-y-4">

                    {/* Nombre */}
                    <div>
                        <label className="text-xs text-muted-foreground mb-1 block font-medium">Nombre del item *</label>
                        <input
                            className="input-sistema"
                            placeholder="Ej: Parlante JBL EON615"
                            value={form.nombre || ''}
                            onChange={e => set('nombre', e.target.value)}
                        />
                    </div>

                    {/* Categoria + Estado */}
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="text-xs text-muted-foreground mb-1 block font-medium">Categoría *</label>
                            <select
                                className="input-sistema"
                                value={form.categoria || ''}
                                onChange={e => {
                                    const catNombre = e.target.value;
                                    const matchingCat = categorias.find(c => c.nombre === catNombre);
                                    setForm(prev => ({
                                        ...prev,
                                        categoria: catNombre,
                                        subcategoria: matchingCat?.subcategorias[0] || '',
                                    }));
                                }}
                            >
                                {categorias.map(cat => (
                                    <option key={cat.id} value={cat.nombre}>{cat.nombre}</option>
                                ))}
                                <option value="Otro">Otro</option>
                            </select>
                        </div>
                        <div>
                            <label className="text-xs text-muted-foreground mb-1 block font-medium">Estado *</label>
                            <select
                                className="input-sistema"
                                value={form.estado || 'bueno'}
                                onChange={e => set('estado', e.target.value as EstadoItem)}
                            >
                                {Object.entries(ESTADOS).map(([k, v]) => (
                                    <option key={k} value={k}>{v.label}</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    {/* Subcategoria */}
                    <div>
                        <label className="text-xs text-muted-foreground mb-1 block font-medium">Subcategoría</label>
                        <select
                            className="input-sistema"
                            value={form.subcategoria || ''}
                            onChange={e => set('subcategoria', e.target.value)}
                        >
                            <option value="">Sin subcategoría</option>
                            {categorias.find(c => c.nombre === form.categoria)?.subcategorias.map(sub => (
                                <option key={sub} value={sub}>{sub}</option>
                            ))}
                        </select>
                    </div>

                    {/* Cantidad + Disponible */}
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="text-xs text-muted-foreground mb-1 block font-medium">Cantidad total *</label>
                            <input
                                type="number"
                                min="1"
                                className="input-sistema font-mono"
                                value={cantidadStr}
                                onChange={e => handleCantidadChange(e.target.value)}
                                onBlur={() => {
                                    const num = parseInt(cantidadStr);
                                    if (isNaN(num) || num < 1) setCantidadStr('1');
                                }}
                            />
                        </div>
                        <div>
                            <label className="text-xs text-muted-foreground mb-1 block font-medium">Disponibles</label>
                            <input
                                type="number"
                                min="0"
                                max={parseInt(cantidadStr) || 1}
                                className="input-sistema font-mono"
                                value={disponibleStr}
                                onChange={e => handleDisponibleChange(e.target.value)}
                                onBlur={() => {
                                    const num = parseInt(disponibleStr);
                                    const total = parseInt(cantidadStr) || 1;
                                    if (isNaN(num) || num < 0) setDisponibleStr('0');
                                    else if (num > total) setDisponibleStr(String(total));
                                }}
                            />
                            <p className="text-xs text-muted-foreground mt-1">Max: {parseInt(cantidadStr) || 1}</p>
                        </div>
                    </div>

                    {/* Ubicacion */}
                    <div>
                        <label className="text-xs text-muted-foreground mb-1 block font-medium">Ubicacion</label>
                        <input
                            className="input-sistema"
                            placeholder="Ej: Salon principal, Deposito, Recepcion..."
                            value={form.ubicacion || ''}
                            onChange={e => set('ubicacion', e.target.value)}
                        />
                    </div>

                    {/* N. Serie + Valor */}
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="text-xs text-muted-foreground mb-1 block font-medium">N. de serie / codigo</label>
                            <input
                                className="input-sistema font-mono"
                                placeholder="Opcional"
                                value={form.numeroSerie || ''}
                                onChange={e => set('numeroSerie', e.target.value)}
                            />
                        </div>
                        <div>
                            <label className="text-xs text-muted-foreground mb-1 block font-medium">Valor aprox. (USD)</label>
                            <div className="relative">
                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-green-400 text-sm font-bold">$</span>
                                <input
                                    type="number"
                                    min="0"
                                    step="0.01"
                                    className="input-sistema pl-7 font-mono"
                                    placeholder="0.00"
                                    value={form.valorUSD || ''}
                                    onChange={e => set('valorUSD', parseFloat(e.target.value) || undefined)}
                                />
                            </div>
                        </div>
                    </div>

                    {/* Fecha adquisicion */}
                    <div>
                        <label className="text-xs text-muted-foreground mb-1 block font-medium">Fecha de adquisicion</label>
                        <input
                            type="date"
                            className="input-sistema"
                            value={form.fechaAdquisicion || ''}
                            onChange={e => set('fechaAdquisicion', e.target.value)}
                        />
                    </div>

                    {/* Notas */}
                    <div>
                        <label className="text-xs text-muted-foreground mb-1 block font-medium">Descripcion / Notas</label>
                        <textarea
                            className="input-sistema resize-none"
                            rows={2}
                            placeholder="Detalles adicionales del item..."
                            value={form.notas || ''}
                            onChange={e => set('notas', e.target.value)}
                        />
                    </div>
                </div>

                <div className="flex gap-3 p-5 border-t border-border flex-shrink-0">
                    <button onClick={onCerrar} className="flex-1 btn-secondary py-2.5 text-sm justify-center">
                        Cancelar
                    </button>
                    <button onClick={handleGuardar} disabled={guardando} className="flex-1 btn-primary py-2.5 text-sm justify-center">
                        {guardando
                            ? <Loader2 className="w-4 h-4 animate-spin" />
                            : <><CheckCircle2 className="w-4 h-4" /> {esEdicion ? 'Guardar' : 'Agregar item'}</>
                        }
                    </button>
                </div>
            </div>
        </div>
    );
}

// ─── Modal Prestamo ────────────────────────────────────────────────────────────

function ModalPrestamo({
    item,
    onCerrar,
    onRegistrar,
    usuarioNombre,
}: {
    item: ItemInventario;
    onCerrar: () => void;
    onRegistrar: (data: Omit<Prestamo, 'id' | 'fechaPrestamo' | 'devuelto'>) => Promise<void>;
    usuarioNombre: string;
}) {
    const [responsable, setResponsable] = useState('');
    const [proposito, setProposito] = useState('');
    const [cantidad, setCantidad] = useState(1);
    const [fechaDevolucion, setFechaDevolucion] = useState('');
    const [notas, setNotas] = useState('');
    const [guardando, setGuardando] = useState(false);

    const handleRegistrar = async () => {
        if (!responsable.trim()) { toast.error('Indica quien toma el item'); return; }
        if (!proposito.trim()) { toast.error('Indica para que se usa'); return; }
        if (cantidad < 1 || cantidad > item.cantidadDisponible) { toast.error('Cantidad invalida'); return; }
        setGuardando(true);
        try {
            // Construir payload sin undefined — Firestore lo rechaza
        const datosPrestamo: Record<string, unknown> = {
            itemId: item.id,
            itemNombre: item.nombre,
            cantidadPrestada: cantidad,
            responsable: responsable.trim(),
            proposito: proposito.trim(),
            registradoPor: usuarioNombre,
        };
        // Solo agregar campos opcionales si tienen valor
        if (fechaDevolucion) {
            datosPrestamo.fechaDevolucionEsperada = Timestamp.fromDate(new Date(fechaDevolucion));
        }
        if (notas.trim()) {
            datosPrestamo.notas = notas.trim();
        }
        await onRegistrar(datosPrestamo as any);
            onCerrar();
        } catch (err) {
            console.error('Error al registrar prestamo:', err);
            toast.error('Error al registrar prestamo.');
        } finally {
            setGuardando(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <div className="bg-card border border-border rounded-2xl w-full max-w-md shadow-2xl">
                <div className="flex items-center justify-between p-5 border-b border-border">
                    <h3 className="text-base font-semibold flex items-center gap-2">
                        <ArrowRightLeft className="w-4 h-4 text-amber-400" />
                        Registrar Prestamo
                    </h3>
                    <button onClick={onCerrar} className="p-1.5 hover:bg-muted rounded-lg">
                        <X className="w-4 h-4" />
                    </button>
                </div>

                <div className="p-5 space-y-4">
                    <div className="p-3 bg-muted/30 rounded-xl border border-border">
                        <p className="text-xs text-muted-foreground">Item</p>
                        <p className="font-semibold text-sm mt-0.5">{item.nombre}</p>
                        <p className="text-xs text-emerald-400 mt-1">{item.cantidadDisponible} disponibles</p>
                    </div>

                    <div>
                        <label className="text-xs text-muted-foreground mb-1 block">Responsable *</label>
                        <div className="relative">
                            <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                            <input
                                className="input-sistema pl-9"
                                placeholder="Nombre de quien lo toma"
                                value={responsable}
                                onChange={e => setResponsable(e.target.value)}
                                autoFocus
                            />
                        </div>
                    </div>

                    <div>
                        <label className="text-xs text-muted-foreground mb-1 block">Proposito / uso *</label>
                        <input
                            className="input-sistema"
                            placeholder="Para que se va a usar..."
                            value={proposito}
                            onChange={e => setProposito(e.target.value)}
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="text-xs text-muted-foreground mb-1 block">Cantidad *</label>
                            <input
                                type="number"
                                min="1"
                                max={item.cantidadDisponible}
                                className="input-sistema"
                                value={cantidad}
                                onChange={e => setCantidad(Math.min(parseInt(e.target.value) || 1, item.cantidadDisponible))}
                            />
                        </div>
                        <div>
                            <label className="text-xs text-muted-foreground mb-1 block">Devolucion esperada</label>
                            <input
                                type="date"
                                className="input-sistema"
                                value={fechaDevolucion}
                                onChange={e => setFechaDevolucion(e.target.value)}
                            />
                        </div>
                    </div>

                    <div>
                        <label className="text-xs text-muted-foreground mb-1 block">Notas adicionales</label>
                        <input
                            className="input-sistema"
                            placeholder="Opcional..."
                            value={notas}
                            onChange={e => setNotas(e.target.value)}
                        />
                    </div>
                </div>

                <div className="flex gap-3 p-5 border-t border-border">
                    <button onClick={onCerrar} className="flex-1 btn-secondary py-2.5 text-sm justify-center">
                        Cancelar
                    </button>
                    <button
                        onClick={handleRegistrar}
                        disabled={guardando}
                        className="flex-1 py-2.5 text-sm flex items-center justify-center gap-2 rounded-xl font-semibold bg-amber-500 hover:bg-amber-400 text-black transition-all disabled:opacity-50"
                    >
                        {guardando
                            ? <Loader2 className="w-4 h-4 animate-spin" />
                            : <><ArrowRightLeft className="w-4 h-4" /> Registrar</>
                        }
                    </button>
                </div>
            </div>
        </div>
    );
}

// ─── Panel Historial ──────────────────────────────────────────────────────────

function PanelHistorial({
    item,
    prestamos,
    onDevolver,
    onCerrar,
}: {
    item: ItemInventario;
    prestamos: Prestamo[];
    onDevolver: (prestamo: Prestamo) => Promise<void>;
    onCerrar: () => void;
}) {
    const prestamosItem = prestamos
        .filter(p => p.itemId === item.id)
        .sort((a, b) => b.fechaPrestamo.toDate().getTime() - a.fechaPrestamo.toDate().getTime());

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <div className="bg-card border border-border rounded-2xl w-full max-w-lg shadow-2xl max-h-[85vh] flex flex-col">
                <div className="flex items-center justify-between p-5 border-b border-border flex-shrink-0">
                    <div>
                        <h3 className="text-base font-semibold flex items-center gap-2">
                            <History className="w-4 h-4 text-blue-400" />
                            Historial de Prestamos
                        </h3>
                        <p className="text-xs text-muted-foreground mt-0.5">{item.nombre}</p>
                    </div>
                    <button onClick={onCerrar} className="p-1.5 hover:bg-muted rounded-lg">
                        <X className="w-4 h-4" />
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto p-5 space-y-3">
                    {prestamosItem.length === 0 ? (
                        <div className="text-center py-10">
                            <History className="w-10 h-10 text-muted-foreground mx-auto mb-3 opacity-30" />
                            <p className="text-sm text-muted-foreground">Sin historial de prestamos</p>
                        </div>
                    ) : prestamosItem.map(p => {
                        const diasPrestado = diasDesde(p.fechaPrestamo);
                        const vencido = !p.devuelto && p.fechaDevolucionEsperada && p.fechaDevolucionEsperada.toDate() < new Date();
                        return (
                            <div
                                key={p.id}
                                className={cn(
                                    'rounded-xl border p-4 space-y-2',
                                    p.devuelto
                                        ? 'bg-muted/20 border-border opacity-70'
                                        : vencido
                                            ? 'bg-red-500/10 border-red-500/30'
                                            : 'bg-amber-500/5 border-amber-500/20',
                                )}
                            >
                                <div className="flex items-start justify-between gap-2">
                                    <div className="flex-1">
                                        <div className="flex items-center gap-2 flex-wrap">
                                            <span className="font-semibold text-sm">{p.responsable}</span>
                                            {p.devuelto ? (
                                                <span className="text-xs text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">Devuelto</span>
                                            ) : vencido ? (
                                                <span className="text-xs text-red-400 bg-red-500/10 px-2 py-0.5 rounded-full border border-red-500/20 flex items-center gap-1">
                                                    <AlertTriangle className="w-3 h-3" /> Vencido
                                                </span>
                                            ) : (
                                                <span className="text-xs text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-full border border-amber-500/20">En uso</span>
                                            )}
                                        </div>
                                        <p className="text-xs text-muted-foreground mt-1">{p.proposito}</p>
                                    </div>
                                    {!p.devuelto && (
                                        <button
                                            onClick={() => onDevolver(p)}
                                            className="shrink-0 flex items-center gap-1 px-3 py-1.5 text-xs font-semibold bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded-lg transition-all"
                                        >
                                            <RotateCcw className="w-3 h-3" /> Devolver
                                        </button>
                                    )}
                                </div>
                                <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
                                    <span className="flex items-center gap-1">
                                        <CalendarDays className="w-3 h-3" /> {formatFecha(p.fechaPrestamo)}
                                    </span>
                                    <span className="flex items-center gap-1">
                                        <Package className="w-3 h-3" /> {p.cantidadPrestada} unidad{p.cantidadPrestada > 1 ? 'es' : ''}
                                    </span>
                                    {!p.devuelto && (
                                        <span className="flex items-center gap-1">
                                            <Clock className="w-3 h-3" /> {diasPrestado} dia{diasPrestado !== 1 ? 's' : ''} en uso
                                        </span>
                                    )}
                                    {p.fechaDevolucionEsperada && (
                                        <span className={cn('flex items-center gap-1', vencido ? 'text-red-400' : '')}>
                                            <CalendarDays className="w-3 h-3" /> Esperado: {formatFecha(p.fechaDevolucionEsperada)}
                                        </span>
                                    )}
                                    {p.devuelto && p.fechaDevolucionReal && (
                                        <span className="flex items-center gap-1 text-emerald-400">
                                            <CheckCircle2 className="w-3 h-3" /> Devuelto: {formatFecha(p.fechaDevolucionReal)}
                                        </span>
                                    )}
                                </div>
                                {p.notas && <p className="text-xs text-muted-foreground italic">{p.notas}</p>}
                                <p className="text-xs text-muted-foreground">Registrado por: {p.registradoPor}</p>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}

// ─── Pagina principal ──────────────────────────────────────────────────────────

export default function InventarioPage() {
    // Cast as any — igual que el resto de modulos del sistema
    const { perfil } = useAuth() as any;

    const [items, setItems] = useState<ItemInventario[]>([]);
    const [prestamos, setPrestamos] = useState<Prestamo[]>([]);
    const [categorias, setCategorias] = useState<CategoriaInventario[]>([]);
    const [cargandoItems, setCargandoItems] = useState(true);
    const [cargandoPrestamos, setCargandoPrestamos] = useState(true);

    const [busqueda, setBusqueda] = useState('');
    const [filtroCategoria, setFiltroCategoria] = useState<string>('todas');
    const [filtroEstado, setFiltroEstado] = useState<'todos' | EstadoItem>('todos');
    const [filtroDisponibilidad, setFiltroDisponibilidad] = useState<'todos' | 'disponible' | 'prestado'>('todos');

    const [modalItem, setModalItem] = useState<Partial<ItemInventario> | null | undefined>(undefined);
    const [modalPrestamo, setModalPrestamo] = useState<ItemInventario | null>(null);
    const [panelHistorial, setPanelHistorial] = useState<ItemInventario | null>(null);
    const [itemExpandido, setItemExpandido] = useState<string | null>(null);
    const [modalCategoriasOpen, setModalCategoriasOpen] = useState(false);

    // ─── Listeners Firestore ─────────────────────────────────────────────────

    useEffect(() => {
        const unsub = onSnapshot(collection(db, 'inventario'), snap => {
            const data = snap.docs.map(d => ({ id: d.id, ...d.data() } as ItemInventario));
            data.sort((a, b) => {
                const ta = a.creadoEn?.toDate?.()?.getTime() ?? 0;
                const tb = b.creadoEn?.toDate?.()?.getTime() ?? 0;
                return tb - ta;
            });
            setItems(data);
            setCargandoItems(false);
        }, err => {
            console.error('inventario listener:', err.message);
            toast.error('Error al cargar inventario');
            setCargandoItems(false);
        });
        return unsub;
    }, []);

    useEffect(() => {
        const unsub = onSnapshot(collection(db, 'prestamos_inventario'), snap => {
            const data = snap.docs.map(d => ({ id: d.id, ...d.data() } as Prestamo));
            data.sort((a, b) => {
                const ta = a.fechaPrestamo?.toDate?.()?.getTime() ?? 0;
                const tb = b.fechaPrestamo?.toDate?.()?.getTime() ?? 0;
                return tb - ta;
            });
            setPrestamos(data);
            setCargandoPrestamos(false);
        }, err => {
            console.warn('prestamos_inventario listener:', err.message);
            setPrestamos([]);
            setCargandoPrestamos(false);
        });
        return unsub;
    }, []);

    useEffect(() => {
        const unsub = onSnapshot(collection(db, 'inventario_categorias'), snap => {
            const data = snap.docs.map(d => ({ id: d.id, ...d.data() } as CategoriaInventario));
            // Si está vacío, sembrar categorías por defecto: Depósito y Cafetín
            if (data.length === 0 && !snap.metadata.hasPendingWrites) {
                const defaults = [
                    { nombre: 'Depósito', subcategorias: ['Equipos', 'Herramientas', 'Mobiliario'] },
                    { nombre: 'Cafetín', subcategorias: ['Vasos', 'Servilletas', 'Bebidas', 'Alimentos'] }
                ];
                defaults.forEach(async (c) => {
                    await addDoc(collection(db, 'inventario_categorias'), c);
                });
            }
            setCategorias(data);
        }, err => {
            console.error('inventario_categorias listener:', err.message);
        });
        return unsub;
    }, []);

    // ─── CRUD Categorías ─────────────────────────────────────────────────────

    const guardarCategoria = async (id: string | null, nombre: string, subcategorias: string[]) => {
        try {
            const payload = {
                nombre: nombre.trim(),
                subcategorias: subcategorias.map(s => s.trim()),
            };
            if (id) {
                await updateDoc(doc(db, 'inventario_categorias', id), payload);
                toast.success('Categoría actualizada');
            } else {
                await addDoc(collection(db, 'inventario_categorias'), payload);
                toast.success('Categoría creada');
            }
        } catch (error) {
            console.error('Error al guardar categoría:', error);
            toast.error('Error al guardar categoría');
        }
    };

    const eliminarCategoria = async (id: string) => {
        if (!confirm('¿Seguro que deseas eliminar esta categoría?')) return;
        try {
            await deleteDoc(doc(db, 'inventario_categorias', id));
            toast.success('Categoría eliminada');
        } catch (error) {
            console.error('Error al eliminar categoría:', error);
            toast.error('Error al eliminar categoría');
        }
    };

    // ─── CRUD Items ──────────────────────────────────────────────────────────

    const guardarItem = async (data: Partial<ItemInventario>) => {
        const esEdicion = !!(data as ItemInventario).id;

        const payload: Record<string, unknown> = {
            nombre: data.nombre || '',
            categoria: data.categoria || 'Otro',
            subcategoria: data.subcategoria || '',
            descripcion: data.descripcion || '',
            cantidad: data.cantidad || 1,
            cantidadDisponible: data.cantidadDisponible ?? data.cantidad ?? 1,
            estado: data.estado || 'bueno',
            ubicacion: data.ubicacion || '',
            numeroSerie: data.numeroSerie || '',
            fechaAdquisicion: data.fechaAdquisicion || '',
            notas: data.notas || '',
            actualizadoEn: serverTimestamp(),
        };

        if (data.valorUSD && data.valorUSD > 0) {
            payload.valorUSD = Number(data.valorUSD);
        }

        if (esEdicion) {
            await updateDoc(doc(db, 'inventario', (data as ItemInventario).id), payload);
            toast.success('Item actualizado');
        } else {
            await addDoc(collection(db, 'inventario'), { ...payload, creadoEn: serverTimestamp() });
            toast.success('Item agregado al inventario');
        }
    };

    const eliminarItem = async (id: string) => {
        if (!confirm('Eliminar este item del inventario?')) return;
        await deleteDoc(doc(db, 'inventario', id));
        toast.success('Item eliminado');
    };

    // ─── CRUD Prestamos ──────────────────────────────────────────────────────

    const registrarPrestamo = async (data: Omit<Prestamo, 'id' | 'fechaPrestamo' | 'devuelto'>) => {
        const item = items.find(i => i.id === data.itemId);
        if (!item) return;
        await addDoc(collection(db, 'prestamos_inventario'), {
            ...data,
            fechaPrestamo: serverTimestamp(),
            devuelto: false,
        });
        await updateDoc(doc(db, 'inventario', item.id), {
            cantidadDisponible: item.cantidadDisponible - data.cantidadPrestada,
            actualizadoEn: serverTimestamp(),
        });
        toast.success('Prestamo registrado');
    };

    const registrarDevolucion = async (prestamo: Prestamo) => {
        const item = items.find(i => i.id === prestamo.itemId);
        if (!item) return;
        await updateDoc(doc(db, 'prestamos_inventario', prestamo.id), {
            devuelto: true,
            fechaDevolucionReal: serverTimestamp(),
        });
        await updateDoc(doc(db, 'inventario', item.id), {
            cantidadDisponible: Math.min(item.cantidadDisponible + prestamo.cantidadPrestada, item.cantidad),
            actualizadoEn: serverTimestamp(),
        });
        toast.success('Devolucion registrada');
    };

    // ─── Filtros ─────────────────────────────────────────────────────────────

    const itemsFiltrados = useMemo(() => items.filter(item => {
        const matchBusq = !busqueda
            || item.nombre.toLowerCase().includes(busqueda.toLowerCase())
            || (item.ubicacion || '').toLowerCase().includes(busqueda.toLowerCase())
            || (item.categoria || '').toLowerCase().includes(busqueda.toLowerCase())
            || (item.subcategoria || '').toLowerCase().includes(busqueda.toLowerCase());
        const matchCat  = filtroCategoria === 'todas' || item.categoria === filtroCategoria;
        const matchEst  = filtroEstado === 'todos' || item.estado === filtroEstado;
        const matchDisp =
            filtroDisponibilidad === 'todos' ||
            (filtroDisponibilidad === 'disponible' ? item.cantidadDisponible > 0 : item.cantidadDisponible === 0);
        return matchBusq && matchCat && matchEst && matchDisp;
    }), [items, busqueda, filtroCategoria, filtroEstado, filtroDisponibilidad]);

    // ─── Stats ───────────────────────────────────────────────────────────────

    const totalItems        = items.reduce((s, i) => s + i.cantidad, 0);
    const totalDisponibles  = items.reduce((s, i) => s + i.cantidadDisponible, 0);
    const prestamosActivos  = prestamos.filter(p => !p.devuelto).length;
    const itemsDanados      = items.filter(i => i.estado === 'danado' || i.estado === 'en_reparacion').length;
    const prestamoVencidos  = prestamos.filter(p =>
        !p.devuelto && p.fechaDevolucionEsperada && p.fechaDevolucionEsperada.toDate() < new Date()
    ).length;

    const cargando = cargandoItems || cargandoPrestamos;

    if (cargando) {
        return (
            <div className="flex items-center justify-center py-32">
                <Loader2 className="w-8 h-8 animate-spin text-blue-400" />
                <span className="ml-3 text-muted-foreground">Cargando inventario...</span>
            </div>
        );
    }

    return (
        <div className="p-4 lg:p-6 space-y-6">

            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold flex items-center gap-2">
                        <Boxes className="w-6 h-6 text-blue-400" />
                        Inventario
                    </h1>
                    <p className="text-sm text-muted-foreground mt-0.5">
                        Control de equipos, muebles y prestamos de ATEMPO
                    </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                    <button
                        onClick={() => setModalCategoriasOpen(true)}
                        className="px-4 py-2.5 bg-purple-500/10 border border-purple-500/20 text-purple-400 rounded-xl text-sm font-semibold hover:bg-purple-500/20 transition-all flex items-center gap-2"
                    >
                        <Tag className="w-4 h-4" />
                        Gestionar Categorías
                    </button>
                    <button onClick={() => setModalItem({})} className="btn-primary text-sm py-2.5">
                        <Plus className="w-4 h-4" />
                        Agregar item
                    </button>
                </div>
            </div>

            {/* KPIs */}
            <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
                {[
                    { label: 'Total unidades',     valor: totalItems,       color: 'text-blue-400',    icon: Package        },
                    { label: 'Disponibles',        valor: totalDisponibles, color: 'text-emerald-400', icon: ShieldCheck    },
                    { label: 'En prestamo',        valor: prestamosActivos, color: 'text-amber-400',   icon: ArrowRightLeft },
                    { label: 'En mal estado',      valor: itemsDanados,     color: 'text-orange-400',  icon: WrenchIcon     },
                    {
                        label: 'Prestamos vencidos',
                        valor: prestamoVencidos,
                        color: prestamoVencidos > 0 ? 'text-red-400' : 'text-emerald-400',
                        icon: AlertTriangle,
                    },
                ].map(({ label, valor, color, icon: Icon }) => (
                    <div key={label} className="kpi-card">
                        <div className="flex items-center justify-between mb-2">
                            <p className="text-xs text-muted-foreground">{label}</p>
                            <Icon className={cn('w-4 h-4', color)} />
                        </div>
                        <p className={cn('text-2xl font-bold', color)}>{valor}</p>
                    </div>
                ))}
            </div>

            {/* Alertas */}
            {(prestamoVencidos > 0 || itemsDanados > 0) && (
                <div className="space-y-2">
                    {prestamoVencidos > 0 && (
                        <div className="flex items-center gap-3 p-3 bg-red-500/10 border border-red-500/30 rounded-xl text-sm text-red-400">
                            <AlertTriangle className="w-4 h-4 shrink-0" />
                            <span>
                                {prestamoVencidos} prestamo{prestamoVencidos > 1 ? 's' : ''} vencido{prestamoVencidos > 1 ? 's' : ''} — revisa el historial para registrar la devolucion.
                            </span>
                        </div>
                    )}
                    {itemsDanados > 0 && (
                        <div className="flex items-center gap-3 p-3 bg-orange-500/10 border border-orange-500/30 rounded-xl text-sm text-orange-400">
                            <WrenchIcon className="w-4 h-4 shrink-0" />
                            <span>{itemsDanados} item{itemsDanados > 1 ? 's' : ''} en mal estado o en reparacion.</span>
                        </div>
                    )}
                </div>
            )}

            {/* Filtros */}
            <div className="glass-card p-4">
                <div className="flex flex-col sm:flex-row gap-3">
                    <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <input
                            className="input-sistema pl-9 w-full"
                            placeholder="Buscar por nombre, ubicación, categoría o subcategoría..."
                            value={busqueda}
                            onChange={e => setBusqueda(e.target.value)}
                        />
                    </div>
                    <select
                        className="input-sistema sm:w-40"
                        value={filtroCategoria}
                        onChange={e => setFiltroCategoria(e.target.value)}
                    >
                        <option value="todas">Todas las categorías</option>
                        {categorias.map(cat => (
                            <option key={cat.id} value={cat.nombre}>{cat.nombre}</option>
                        ))}
                    </select>
                    <select
                        className="input-sistema sm:w-40"
                        value={filtroEstado}
                        onChange={e => setFiltroEstado(e.target.value as typeof filtroEstado)}
                    >
                        <option value="todos">Todos los estados</option>
                        {Object.entries(ESTADOS).map(([k, v]) => (
                            <option key={k} value={k}>{v.label}</option>
                        ))}
                    </select>
                    <select
                        className="input-sistema sm:w-36"
                        value={filtroDisponibilidad}
                        onChange={e => setFiltroDisponibilidad(e.target.value as typeof filtroDisponibilidad)}
                    >
                        <option value="todos">Disponibilidad</option>
                        <option value="disponible">Disponible</option>
                        <option value="prestado">En prestamo</option>
                    </select>
                </div>
            </div>

            {/* Lista */}
            {itemsFiltrados.length === 0 ? (
                <div className="glass-card p-12 text-center">
                    <Boxes className="w-12 h-12 text-muted-foreground mx-auto mb-4 opacity-30" />
                    <p className="text-muted-foreground font-medium">
                        {items.length === 0 ? 'Aun no tienes items registrados' : 'No hay items que coincidan'}
                    </p>
                    {items.length === 0 && (
                        <button onClick={() => setModalItem({})} className="btn-primary text-sm mt-4">
                            <Plus className="w-4 h-4" /> Agregar primer item
                        </button>
                    )}
                </div>
            ) : (
                <div className="space-y-3">
                    {itemsFiltrados.map(item => {
                        const prestamosItem = prestamos.filter(p => p.itemId === item.id && !p.devuelto);
                        const expandido = itemExpandido === item.id;
                        const porcentajeDisp = item.cantidad > 0 ? (item.cantidadDisponible / item.cantidad) * 100 : 0;
                        const catEstilo = getEstiloCategoria(item.categoria);

                        return (
                            <div
                                key={item.id}
                                className={cn('glass-card overflow-hidden transition-all', item.estado === 'dado_de_baja' && 'opacity-50')}
                            >
                                <div className="p-4 flex items-center gap-3">
                                    <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border', catEstilo.bg)}>
                                        <Package className={cn('w-5 h-5', catEstilo.color)} />
                                    </div>

                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 flex-wrap">
                                            <span className="font-semibold text-sm truncate">{item.nombre}</span>
                                            <BadgeCategoria cat={item.categoria} />
                                            {item.subcategoria && <BadgeSubcategoria subcategoria={item.subcategoria} />}
                                            <BadgeEstado estado={item.estado} />
                                        </div>
                                        <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                                            {item.ubicacion && (
                                                <span className="flex items-center gap-1">
                                                    <Tag className="w-3 h-3" /> {item.ubicacion}
                                                </span>
                                            )}
                                            {prestamosItem.length > 0 && (
                                                <span className="flex items-center gap-1 text-amber-400">
                                                    <ArrowRightLeft className="w-3 h-3" />
                                                    {prestamosItem.length} prestamo{prestamosItem.length > 1 ? 's' : ''} activo{prestamosItem.length > 1 ? 's' : ''}
                                                </span>
                                            )}
                                        </div>
                                    </div>

                                    <div className="text-right shrink-0 hidden sm:block">
                                        <p className="text-xs text-muted-foreground">Disponibles</p>
                                        <p className={cn(
                                            'text-lg font-bold',
                                            item.cantidadDisponible === 0 ? 'text-red-400' :
                                            item.cantidadDisponible < item.cantidad ? 'text-amber-400' : 'text-emerald-400',
                                        )}>
                                            {item.cantidadDisponible}
                                            <span className="text-xs text-muted-foreground font-normal">/{item.cantidad}</span>
                                        </p>
                                    </div>

                                    <div className="flex items-center gap-1 shrink-0">
                                        <button onClick={() => setPanelHistorial(item)} className="p-1.5 hover:bg-blue-500/10 rounded-lg transition-colors text-muted-foreground hover:text-blue-400" title="Ver historial">
                                            <History className="w-4 h-4" />
                                        </button>
                                        <button
                                            onClick={() => {
                                                if (item.cantidadDisponible === 0) { toast.error('No hay unidades disponibles'); return; }
                                                setModalPrestamo(item);
                                            }}
                                            className="p-1.5 hover:bg-amber-500/10 rounded-lg transition-colors text-muted-foreground hover:text-amber-400"
                                            title="Registrar prestamo"
                                        >
                                            <ArrowRightLeft className="w-4 h-4" />
                                        </button>
                                        <button onClick={() => setModalItem(item)} className="p-1.5 hover:bg-muted rounded-lg transition-colors text-muted-foreground hover:text-foreground" title="Editar">
                                            <Edit2 className="w-4 h-4" />
                                        </button>
                                        <button onClick={() => eliminarItem(item.id)} className="p-1.5 hover:bg-red-500/10 rounded-lg transition-colors text-muted-foreground hover:text-red-400" title="Eliminar">
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                        <button onClick={() => setItemExpandido(expandido ? null : item.id)} className="p-1.5 hover:bg-muted rounded-lg transition-colors text-muted-foreground">
                                            {expandido ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                                        </button>
                                    </div>
                                </div>

                                {/* Barra disponibilidad */}
                                <div className="h-1 bg-muted/40 mx-4 rounded-full overflow-hidden">
                                    <div
                                        className={cn('h-full rounded-full transition-all', porcentajeDisp === 0 ? 'bg-red-500' : porcentajeDisp < 50 ? 'bg-amber-500' : 'bg-emerald-500')}
                                        style={{ width: `${porcentajeDisp}%` }}
                                    />
                                </div>

                                {/* Detalle expandido */}
                                {expandido && (
                                    <div className="px-4 py-3 border-t border-border mt-1 grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
                                        {item.notas && (
                                            <div className="col-span-full">
                                                <p className="text-muted-foreground">Notas</p>
                                                <p className="text-foreground mt-0.5">{item.notas}</p>
                                            </div>
                                        )}
                                        {item.numeroSerie && (
                                            <div>
                                                <p className="text-muted-foreground">N. Serie</p>
                                                <p className="font-mono mt-0.5">{item.numeroSerie}</p>
                                            </div>
                                        )}
                                        {item.valorUSD && (
                                            <div>
                                                <p className="text-muted-foreground">Valor</p>
                                                <p className="text-green-400 font-semibold mt-0.5">${item.valorUSD.toFixed(2)}</p>
                                            </div>
                                        )}
                                        {item.fechaAdquisicion && (
                                            <div>
                                                <p className="text-muted-foreground">Adquirido</p>
                                                <p className="mt-0.5">{item.fechaAdquisicion}</p>
                                            </div>
                                        )}
                                        <div>
                                            <p className="text-muted-foreground">Registrado</p>
                                            <p className="mt-0.5">{formatFecha(item.creadoEn)}</p>
                                        </div>
                                        {prestamosItem.length > 0 && (
                                            <div className="col-span-full mt-1">
                                                <p className="text-muted-foreground mb-2">Prestamos activos</p>
                                                <div className="space-y-1">
                                                    {prestamosItem.map(p => {
                                                        const vencido = p.fechaDevolucionEsperada && p.fechaDevolucionEsperada.toDate() < new Date();
                                                        return (
                                                            <div
                                                                key={p.id}
                                                                className={cn(
                                                                    'flex items-center justify-between px-3 py-2 rounded-lg border',
                                                                    vencido ? 'bg-red-500/10 border-red-500/20 text-red-400' : 'bg-amber-500/10 border-amber-500/20 text-amber-400',
                                                                )}
                                                            >
                                                                <span><strong>{p.responsable}</strong> — {p.proposito} ({p.cantidadPrestada} ud.)</span>
                                                                <button
                                                                    onClick={() => registrarDevolucion(p)}
                                                                    className="flex items-center gap-1 px-2 py-1 text-xs font-semibold bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded-lg"
                                                                >
                                                                    <RotateCcw className="w-3 h-3" /> Devolver
                                                                </button>
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            )}

            {/* Modales */}
            {modalItem !== undefined && (
                <ModalItem
                    item={modalItem}
                    onCerrar={() => setModalItem(undefined)}
                    onGuardar={guardarItem}
                    categorias={categorias}
                />
            )}
            {modalCategoriasOpen && (
                <ModalGestionarCategorias
                    categorias={categorias}
                    onCerrar={() => setModalCategoriasOpen(false)}
                    onGuardar={guardarCategoria}
                    onEliminar={eliminarCategoria}
                />
            )}
            {modalPrestamo && (
                <ModalPrestamo
                    item={modalPrestamo}
                    onCerrar={() => setModalPrestamo(null)}
                    onRegistrar={registrarPrestamo}
                    usuarioNombre={perfil?.nombre || 'Sistema'}
                />
            )}
            {panelHistorial && (
                <PanelHistorial
                    item={panelHistorial}
                    prestamos={prestamos}
                    onDevolver={registrarDevolucion}
                    onCerrar={() => setPanelHistorial(null)}
                />
            )}
        </div>
    );
}
