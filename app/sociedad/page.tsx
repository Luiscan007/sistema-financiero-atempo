'use client';

/**
 * app/sociedad/page.tsx
 * Control de deuda de inversion ATEMPO
 *  - Conceptos/facturas que componen la deuda total
 *  - Abonos manuales o desde utilidades del sistema
 *  - Participacion societaria: Rosi 60% / Paco 40%
 *  - Paco no recibe dividendos hasta cubrir su deuda
 *  - Grafica de progreso, proyeccion y historial completo
 */

import { useState, useEffect, useMemo } from 'react';
import {
    Plus, X, CheckCircle2, Loader2, TrendingDown,
    TrendingUp, DollarSign, Users, Calendar, FileText,
    ChevronDown, ChevronUp, AlertTriangle, Target,
    ArrowDownCircle, ArrowUpCircle, Trash2, Edit2,
    PieChart, Clock, Banknote, ShieldCheck,
} from 'lucide-react';
import {
    collection, addDoc, updateDoc, deleteDoc,
    doc, onSnapshot, serverTimestamp, Timestamp,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { cn } from '@/lib/utils';
import toast from 'react-hot-toast';

// ─── Tipos ────────────────────────────────────────────────────────────────────

type TipoConcepto = 'construccion' | 'equipamiento' | 'capital_trabajo' | 'otro';
type TipoMovimiento = 'abono_manual' | 'dividendo_retenido' | 'ajuste_suma' | 'ajuste_resta';

interface ConceptoDeuda {
    id: string;
    descripcion: string;
    tipo: TipoConcepto;
    montoUSD: number;
    fecha: string;
    notas?: string;
    creadoEn: Timestamp;
}

interface MovimientoDeuda {
    id: string;
    tipo: TipoMovimiento;
    montoUSD: number;
    descripcion: string;
    fecha: string;
    notas?: string;
    saldoResultante?: number;
    creadoEn: Timestamp;
}

interface ConfigSociedad {
    porcentajeRosi: number;
    porcentajePaco: number;
    nombreRosi: string;
    nombrePaco: string;
    promedioAbonoMensual?: number;
}

// ─── Constantes ───────────────────────────────────────────────────────────────

const CONFIG_DEFAULT: ConfigSociedad = {
    porcentajeRosi: 60,
    porcentajePaco: 40,
    nombreRosi: 'Rosi',
    nombrePaco: 'Paco',
    promedioAbonoMensual: 500,
};

const TIPOS_CONCEPTO: Record<TipoConcepto, { label: string; color: string; bg: string }> = {
    construccion:   { label: 'Construccion',    color: 'text-orange-400', bg: 'bg-orange-500/10 border-orange-500/20' },
    equipamiento:   { label: 'Equipamiento',    color: 'text-blue-400',   bg: 'bg-blue-500/10 border-blue-500/20'     },
    capital_trabajo:{ label: 'Capital de trabajo', color: 'text-purple-400', bg: 'bg-purple-500/10 border-purple-500/20'},
    otro:           { label: 'Otro',            color: 'text-slate-400',  bg: 'bg-slate-500/10 border-slate-500/20'   },
};

const TIPOS_MOV: Record<TipoMovimiento, { label: string; color: string; signo: 1 | -1 }> = {
    abono_manual:       { label: 'Abono manual',         color: 'text-emerald-400', signo: -1 },
    dividendo_retenido: { label: 'Dividendo retenido',   color: 'text-blue-400',    signo: -1 },
    ajuste_suma:        { label: 'Ajuste (suma deuda)',   color: 'text-red-400',     signo:  1 },
    ajuste_resta:       { label: 'Ajuste (resta deuda)',  color: 'text-emerald-400', signo: -1 },
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

const fmtUSD = (n: number) =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2 }).format(n);

const fmtFecha = (s: string) => {
    if (!s) return '-';
    const [y, m, d] = s.split('-');
    const meses = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];
    return `${d} ${meses[parseInt(m) - 1]} ${y}`;
};

// ─── Barra de progreso animada ────────────────────────────────────────────────

function BarraProgreso({ porcentaje, color = 'emerald' }: { porcentaje: number; color?: string }) {
    const pct = Math.min(100, Math.max(0, porcentaje));
    const colorMap: Record<string, string> = {
        emerald: 'bg-emerald-500',
        red: 'bg-red-500',
        amber: 'bg-amber-500',
        blue: 'bg-blue-500',
    };
    return (
        <div className="w-full h-3 bg-muted/40 rounded-full overflow-hidden">
            <div
                className={cn('h-full rounded-full transition-all duration-700', colorMap[color] ?? colorMap.emerald)}
                style={{ width: `${pct}%` }}
            />
        </div>
    );
}

// ─── Grafica SVG de progreso ──────────────────────────────────────────────────

function GraficaDeuda({ movimientos, deudaInicial }: { movimientos: MovimientoDeuda[]; deudaInicial: number }) {
    if (movimientos.length === 0 || deudaInicial <= 0) {
        return (
            <div className="flex items-center justify-center h-40 text-muted-foreground text-sm">
                Sin datos suficientes para mostrar grafica
            </div>
        );
    }

    // Construir puntos historicos de saldo
    const puntos: { fecha: string; saldo: number }[] = [];
    let saldo = deudaInicial;
    puntos.push({ fecha: 'Inicio', saldo });

    const movOrdenados = [...movimientos].sort((a, b) => a.fecha.localeCompare(b.fecha));
    for (const m of movOrdenados) {
        saldo += TIPOS_MOV[m.tipo].signo * m.montoUSD;
        saldo = Math.max(0, saldo);
        puntos.push({ fecha: fmtFecha(m.fecha), saldo });
    }

    const maxSaldo = deudaInicial;
    const W = 600, H = 160, PAD = 20;
    const xStep = (W - PAD * 2) / Math.max(puntos.length - 1, 1);

    const px = (i: number) => PAD + i * xStep;
    const py = (s: number) => PAD + (1 - s / maxSaldo) * (H - PAD * 2);

    const pathD = puntos.map((p, i) => `${i === 0 ? 'M' : 'L'} ${px(i)} ${py(p.saldo)}`).join(' ');
    const areaD = `${pathD} L ${px(puntos.length - 1)} ${H - PAD} L ${PAD} ${H - PAD} Z`;

    return (
        <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-40" preserveAspectRatio="none">
            <defs>
                <linearGradient id="gradDeuda" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#10b981" stopOpacity="0.3" />
                    <stop offset="100%" stopColor="#10b981" stopOpacity="0.02" />
                </linearGradient>
            </defs>
            <path d={areaD} fill="url(#gradDeuda)" />
            <path d={pathD} fill="none" stroke="#10b981" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
            {puntos.map((p, i) => (
                <circle key={i} cx={px(i)} cy={py(p.saldo)} r="4" fill="#10b981" stroke="#000" strokeWidth="1.5" />
            ))}
            {/* Linea de meta (0) */}
            <line x1={PAD} y1={H - PAD} x2={W - PAD} y2={H - PAD} stroke="rgba(255,255,255,0.1)" strokeDasharray="4 4" />
            <text x={W - PAD} y={H - PAD - 4} textAnchor="end" fontSize="10" fill="rgba(255,255,255,0.3)">Meta: $0</text>
        </svg>
    );
}

// ─── Modal Concepto de Deuda ──────────────────────────────────────────────────

function ModalConcepto({
    concepto,
    onCerrar,
    onGuardar,
}: {
    concepto: Partial<ConceptoDeuda> | null;
    onCerrar: () => void;
    onGuardar: (data: Partial<ConceptoDeuda>) => Promise<void>;
}) {
    const esEdicion = !!(concepto as ConceptoDeuda)?.id;
    const [form, setForm] = useState<Partial<ConceptoDeuda>>(concepto || {
        descripcion: '', tipo: 'construccion', montoUSD: 0, fecha: '', notas: '',
    });
    const [guardando, setGuardando] = useState(false);
    const set = (k: keyof ConceptoDeuda, v: unknown) => setForm(p => ({ ...p, [k]: v }));

    const handleGuardar = async () => {
        if (!form.descripcion?.trim()) { toast.error('Ingresa una descripcion'); return; }
        if (!form.montoUSD || form.montoUSD <= 0) { toast.error('El monto debe ser mayor a 0'); return; }
        if (!form.fecha) { toast.error('Selecciona una fecha'); return; }
        setGuardando(true);
        try { await onGuardar(form); onCerrar(); }
        catch { toast.error('Error al guardar'); }
        finally { setGuardando(false); }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <div className="bg-card border border-border rounded-2xl w-full max-w-md shadow-2xl">
                <div className="flex items-center justify-between p-5 border-b border-border">
                    <h3 className="font-semibold flex items-center gap-2">
                        <FileText className="w-4 h-4 text-orange-400" />
                        {esEdicion ? 'Editar concepto' : 'Agregar concepto de deuda'}
                    </h3>
                    <button onClick={onCerrar} className="p-1.5 hover:bg-muted rounded-lg"><X className="w-4 h-4" /></button>
                </div>
                <div className="p-5 space-y-4">
                    <div>
                        <label className="text-xs text-muted-foreground mb-1 block">Descripcion *</label>
                        <input className="input-sistema" placeholder="Ej: Construccion techo salon principal"
                            value={form.descripcion || ''} onChange={e => set('descripcion', e.target.value)} />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="text-xs text-muted-foreground mb-1 block">Tipo</label>
                            <select className="input-sistema" value={form.tipo || 'construccion'}
                                onChange={e => set('tipo', e.target.value as TipoConcepto)}>
                                {Object.entries(TIPOS_CONCEPTO).map(([k, v]) => (
                                    <option key={k} value={k}>{v.label}</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="text-xs text-muted-foreground mb-1 block">Fecha *</label>
                            <input type="date" className="input-sistema" value={form.fecha || ''}
                                onChange={e => set('fecha', e.target.value)} />
                        </div>
                    </div>
                    <div>
                        <label className="text-xs text-muted-foreground mb-1 block">Monto (USD) *</label>
                        <div className="relative">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-green-400 font-bold text-sm">$</span>
                            <input type="number" min="0" step="0.01" className="input-sistema pl-7" placeholder="0.00"
                                value={form.montoUSD || ''} onChange={e => set('montoUSD', parseFloat(e.target.value) || 0)} />
                        </div>
                    </div>
                    <div>
                        <label className="text-xs text-muted-foreground mb-1 block">Notas</label>
                        <textarea className="input-sistema resize-none" rows={2} placeholder="Detalles adicionales..."
                            value={form.notas || ''} onChange={e => set('notas', e.target.value)} />
                    </div>
                </div>
                <div className="flex gap-3 p-5 border-t border-border">
                    <button onClick={onCerrar} className="flex-1 btn-secondary py-2.5 text-sm justify-center">Cancelar</button>
                    <button onClick={handleGuardar} disabled={guardando} className="flex-1 btn-primary py-2.5 text-sm justify-center">
                        {guardando ? <Loader2 className="w-4 h-4 animate-spin" /> : <><CheckCircle2 className="w-4 h-4" /> {esEdicion ? 'Guardar' : 'Agregar'}</>}
                    </button>
                </div>
            </div>
        </div>
    );
}

// ─── Modal Movimiento (abono/ajuste) ─────────────────────────────────────────

function ModalMovimiento({
    onCerrar,
    onGuardar,
    saldoActual,
}: {
    onCerrar: () => void;
    onGuardar: (data: Partial<MovimientoDeuda>) => Promise<void>;
    saldoActual: number;
}) {
    const [form, setForm] = useState<Partial<MovimientoDeuda>>({
        tipo: 'abono_manual', montoUSD: 0, descripcion: '', fecha: new Date().toISOString().split('T')[0], notas: '',
    });
    const [guardando, setGuardando] = useState(false);
    const set = (k: keyof MovimientoDeuda, v: unknown) => setForm(p => ({ ...p, [k]: v }));

    const signo = TIPOS_MOV[form.tipo as TipoMovimiento]?.signo ?? -1;
    const saldoResultante = Math.max(0, saldoActual + signo * (form.montoUSD || 0));

    const handleGuardar = async () => {
        if (!form.descripcion?.trim()) { toast.error('Ingresa una descripcion'); return; }
        if (!form.montoUSD || form.montoUSD <= 0) { toast.error('El monto debe ser mayor a 0'); return; }
        if (!form.fecha) { toast.error('Selecciona una fecha'); return; }
        setGuardando(true);
        try { await onGuardar({ ...form, saldoResultante }); onCerrar(); }
        catch { toast.error('Error al guardar'); }
        finally { setGuardando(false); }
    };

    const esAbono = signo === -1;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <div className="bg-card border border-border rounded-2xl w-full max-w-md shadow-2xl">
                <div className="flex items-center justify-between p-5 border-b border-border">
                    <h3 className="font-semibold flex items-center gap-2">
                        <ArrowDownCircle className="w-4 h-4 text-emerald-400" />
                        Registrar movimiento
                    </h3>
                    <button onClick={onCerrar} className="p-1.5 hover:bg-muted rounded-lg"><X className="w-4 h-4" /></button>
                </div>
                <div className="p-5 space-y-4">

                    {/* Tipo */}
                    <div className="grid grid-cols-2 gap-2">
                        {(Object.entries(TIPOS_MOV) as [TipoMovimiento, typeof TIPOS_MOV[TipoMovimiento]][]).map(([k, v]) => (
                            <button key={k} type="button" onClick={() => set('tipo', k)}
                                className={cn(
                                    'p-3 rounded-xl border-2 text-xs font-semibold transition-all text-left',
                                    form.tipo === k
                                        ? v.signo === -1
                                            ? 'border-emerald-500 bg-emerald-500/10 text-emerald-400'
                                            : 'border-red-500 bg-red-500/10 text-red-400'
                                        : 'border-border text-muted-foreground hover:border-muted-foreground',
                                )}>
                                <div className="flex items-center gap-1 mb-1">
                                    {v.signo === -1
                                        ? <ArrowDownCircle className="w-3.5 h-3.5" />
                                        : <ArrowUpCircle className="w-3.5 h-3.5" />
                                    }
                                    {v.signo === -1 ? 'Resta deuda' : 'Suma deuda'}
                                </div>
                                {v.label}
                            </button>
                        ))}
                    </div>

                    <div>
                        <label className="text-xs text-muted-foreground mb-1 block">Descripcion *</label>
                        <input className="input-sistema"
                            placeholder={form.tipo === 'dividendo_retenido' ? 'Ej: Dividendos marzo 2026 retenidos' : 'Ej: Abono mensual acuerdo societario'}
                            value={form.descripcion || ''} onChange={e => set('descripcion', e.target.value)} />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="text-xs text-muted-foreground mb-1 block">Monto (USD) *</label>
                            <div className="relative">
                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-green-400 font-bold text-sm">$</span>
                                <input type="number" min="0" step="0.01" className="input-sistema pl-7" placeholder="0.00"
                                    value={form.montoUSD || ''} onChange={e => set('montoUSD', parseFloat(e.target.value) || 0)} />
                            </div>
                        </div>
                        <div>
                            <label className="text-xs text-muted-foreground mb-1 block">Fecha *</label>
                            <input type="date" className="input-sistema" value={form.fecha || ''}
                                onChange={e => set('fecha', e.target.value)} />
                        </div>
                    </div>

                    {/* Preview saldo resultante */}
                    {(form.montoUSD || 0) > 0 && (
                        <div className={cn(
                            'p-3 rounded-xl border text-sm',
                            esAbono ? 'bg-emerald-500/10 border-emerald-500/20' : 'bg-red-500/10 border-red-500/20',
                        )}>
                            <div className="flex justify-between items-center">
                                <span className="text-muted-foreground">Saldo actual:</span>
                                <span className="font-semibold">{fmtUSD(saldoActual)}</span>
                            </div>
                            <div className="flex justify-between items-center mt-1">
                                <span className="text-muted-foreground">{esAbono ? 'Abono:' : 'Ajuste suma:'}</span>
                                <span className={cn('font-semibold', esAbono ? 'text-emerald-400' : 'text-red-400')}>
                                    {esAbono ? '-' : '+'}{fmtUSD(form.montoUSD || 0)}
                                </span>
                            </div>
                            <div className="border-t border-border/50 mt-2 pt-2 flex justify-between items-center">
                                <span className="font-semibold">Saldo resultante:</span>
                                <span className={cn('font-bold text-base', saldoResultante === 0 ? 'text-emerald-400' : 'text-foreground')}>
                                    {fmtUSD(saldoResultante)}
                                    {saldoResultante === 0 && ' 🎉'}
                                </span>
                            </div>
                        </div>
                    )}

                    <div>
                        <label className="text-xs text-muted-foreground mb-1 block">Notas</label>
                        <input className="input-sistema" placeholder="Opcional..."
                            value={form.notas || ''} onChange={e => set('notas', e.target.value)} />
                    </div>
                </div>
                <div className="flex gap-3 p-5 border-t border-border">
                    <button onClick={onCerrar} className="flex-1 btn-secondary py-2.5 text-sm justify-center">Cancelar</button>
                    <button onClick={handleGuardar} disabled={guardando}
                        className={cn(
                            'flex-1 py-2.5 text-sm flex items-center justify-center gap-2 rounded-xl font-semibold transition-all disabled:opacity-50',
                            esAbono
                                ? 'bg-emerald-500 hover:bg-emerald-400 text-black'
                                : 'bg-red-500 hover:bg-red-400 text-white',
                        )}>
                        {guardando ? <Loader2 className="w-4 h-4 animate-spin" /> : <><CheckCircle2 className="w-4 h-4" /> Registrar</>}
                    </button>
                </div>
            </div>
        </div>
    );
}

// ─── Pagina principal ──────────────────────────────────────────────────────────

export default function SociedadPage() {

    const [conceptos, setConceptos] = useState<ConceptoDeuda[]>([]);
    const [movimientos, setMovimientos] = useState<MovimientoDeuda[]>([]);
    const [config, setConfig] = useState<ConfigSociedad>(CONFIG_DEFAULT);
    const [cargando, setCargando] = useState(true);

    const [modalConcepto, setModalConcepto] = useState<Partial<ConceptoDeuda> | null | undefined>(undefined);
    const [modalMovimiento, setModalMovimiento] = useState(false);
    const [seccionExpandida, setSeccionExpandida] = useState<'conceptos' | 'movimientos' | 'grafica' | null>('grafica');
    const [promedioInput, setPromedioInput] = useState(String(CONFIG_DEFAULT.promedioAbonoMensual ?? 500));

    // ─── Listeners ───────────────────────────────────────────────────────────

    useEffect(() => {
        const u1 = onSnapshot(collection(db, 'sociedad_conceptos'), snap => {
            const data = snap.docs.map(d => ({ id: d.id, ...d.data() } as ConceptoDeuda));
            data.sort((a, b) => a.fecha.localeCompare(b.fecha));
            setConceptos(data);
        }, err => { console.warn('sociedad_conceptos:', err.message); });

        const u2 = onSnapshot(collection(db, 'sociedad_movimientos'), snap => {
            const data = snap.docs.map(d => ({ id: d.id, ...d.data() } as MovimientoDeuda));
            data.sort((a, b) => b.fecha.localeCompare(a.fecha));
            setMovimientos(data);
            setCargando(false);
        }, err => { console.warn('sociedad_movimientos:', err.message); setCargando(false); });

        const u3 = onSnapshot(doc(db, 'sociedad_config', 'principal'), snap => {
            if (snap.exists()) setConfig({ ...CONFIG_DEFAULT, ...snap.data() as ConfigSociedad });
        }, () => {});

        return () => { u1(); u2(); u3(); };
    }, []);

    // ─── Calculos ─────────────────────────────────────────────────────────────

    const deudaTotal = useMemo(() =>
        conceptos.reduce((s, c) => s + c.montoUSD, 0), [conceptos]);

    const totalAbonado = useMemo(() =>
        movimientos.reduce((s, m) => s + TIPOS_MOV[m.tipo].signo * m.montoUSD, 0) * -1, [movimientos]);

    const saldoPendiente = useMemo(() =>
        Math.max(0, deudaTotal - totalAbonado), [deudaTotal, totalAbonado]);

    const porcentajePagado = deudaTotal > 0 ? Math.min(100, (totalAbonado / deudaTotal) * 100) : 0;

    const totalDividendosRetenidos = useMemo(() =>
        movimientos.filter(m => m.tipo === 'dividendo_retenido').reduce((s, m) => s + m.montoUSD, 0),
    [movimientos]);

    const deudaCubierta = saldoPendiente === 0;

    // Proyeccion: cuantos meses faltan con el promedio actual
    const promedio = parseFloat(promedioInput) || 0;
    const mesesRestantes = promedio > 0 ? Math.ceil(saldoPendiente / promedio) : null;
    const fechaLibre = mesesRestantes !== null
        ? (() => {
            const d = new Date();
            d.setMonth(d.getMonth() + mesesRestantes);
            return d.toLocaleDateString('es-VE', { month: 'long', year: 'numeric' });
        })()
        : null;

    // ─── CRUD ─────────────────────────────────────────────────────────────────

    const guardarConcepto = async (data: Partial<ConceptoDeuda>) => {
        const esEdicion = !!(data as ConceptoDeuda).id;
        const payload = {
            descripcion: data.descripcion || '',
            tipo: data.tipo || 'otro',
            montoUSD: data.montoUSD || 0,
            fecha: data.fecha || '',
            notas: data.notas || '',
        };
        if (esEdicion) {
            await updateDoc(doc(db, 'sociedad_conceptos', (data as ConceptoDeuda).id), payload);
            toast.success('Concepto actualizado');
        } else {
            await addDoc(collection(db, 'sociedad_conceptos'), { ...payload, creadoEn: serverTimestamp() });
            toast.success('Concepto agregado');
        }
    };

    const eliminarConcepto = async (id: string) => {
        if (!confirm('Eliminar este concepto?')) return;
        await deleteDoc(doc(db, 'sociedad_conceptos', id));
        toast.success('Concepto eliminado');
    };

    const guardarMovimiento = async (data: Partial<MovimientoDeuda>) => {
        await addDoc(collection(db, 'sociedad_movimientos'), {
            tipo: data.tipo || 'abono_manual',
            montoUSD: data.montoUSD || 0,
            descripcion: data.descripcion || '',
            fecha: data.fecha || '',
            notas: data.notas || '',
            saldoResultante: data.saldoResultante ?? saldoPendiente,
            creadoEn: serverTimestamp(),
        });
        toast.success('Movimiento registrado');
    };

    const eliminarMovimiento = async (id: string) => {
        if (!confirm('Eliminar este movimiento?')) return;
        await deleteDoc(doc(db, 'sociedad_movimientos', id));
        toast.success('Movimiento eliminado');
    };

    const guardarPromedio = async () => {
        const val = parseFloat(promedioInput);
        if (isNaN(val) || val <= 0) { toast.error('Ingresa un promedio valido'); return; }
        try {
            await updateDoc(doc(db, 'sociedad_config', 'principal'), { promedioAbonoMensual: val });
            toast.success('Promedio actualizado');
        } catch {
            await addDoc(collection(db, 'sociedad_config'), { promedioAbonoMensual: val });
        }
    };

    if (cargando) {
        return (
            <div className="flex items-center justify-center py-32">
                <Loader2 className="w-8 h-8 animate-spin text-blue-400" />
                <span className="ml-3 text-muted-foreground">Cargando datos societarios...</span>
            </div>
        );
    }

    const toggle = (s: typeof seccionExpandida) =>
        setSeccionExpandida(prev => prev === s ? null : s);

    return (
        <div className="p-4 lg:p-6 space-y-6 max-w-5xl mx-auto">

            {/* ── Header ── */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold flex items-center gap-2">
                        <Users className="w-6 h-6 text-blue-400" />
                        Sociedad ATEMPO
                    </h1>
                    <p className="text-sm text-muted-foreground mt-0.5">
                        Control de inversion, deuda y dividendos societarios
                    </p>
                </div>
                <div className="flex gap-2">
                    <button onClick={() => setModalConcepto({})} className="btn-secondary text-sm py-2 px-3">
                        <Plus className="w-4 h-4" /> Concepto
                    </button>
                    <button onClick={() => setModalMovimiento(true)} className="btn-primary text-sm py-2 px-3">
                        <ArrowDownCircle className="w-4 h-4" /> Movimiento
                    </button>
                </div>
            </div>

            {/* ── Banner deuda cubierta ── */}
            {deudaCubierta && deudaTotal > 0 && (
                <div className="p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-2xl flex items-center gap-3">
                    <ShieldCheck className="w-6 h-6 text-emerald-400 shrink-0" />
                    <div>
                        <p className="font-semibold text-emerald-400">Deuda completamente cubierta</p>
                        <p className="text-sm text-muted-foreground">{config.nombrePaco} puede comenzar a recibir dividendos normalmente.</p>
                    </div>
                </div>
            )}

            {/* ── KPIs principales ── */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {[
                    { label: 'Deuda total', valor: fmtUSD(deudaTotal), icon: TrendingDown, color: 'text-red-400', sub: `${conceptos.length} concepto${conceptos.length !== 1 ? 's' : ''}` },
                    { label: 'Total abonado', valor: fmtUSD(totalAbonado), icon: TrendingUp, color: 'text-emerald-400', sub: `${movimientos.length} movimiento${movimientos.length !== 1 ? 's' : ''}` },
                    { label: 'Saldo pendiente', valor: fmtUSD(saldoPendiente), icon: Target, color: saldoPendiente === 0 ? 'text-emerald-400' : 'text-amber-400', sub: `${porcentajePagado.toFixed(1)}% pagado` },
                    { label: 'Dividendos retenidos', valor: fmtUSD(totalDividendosRetenidos), icon: Banknote, color: 'text-blue-400', sub: deudaCubierta ? 'Puede recibir dividendos' : 'Bloqueados hasta cubrir deuda' },
                ].map(({ label, valor, icon: Icon, color, sub }) => (
                    <div key={label} className="kpi-card">
                        <div className="flex items-center justify-between mb-2">
                            <p className="text-xs text-muted-foreground">{label}</p>
                            <Icon className={cn('w-4 h-4', color)} />
                        </div>
                        <p className={cn('text-xl font-bold', color)}>{valor}</p>
                        <p className="text-xs text-muted-foreground mt-1">{sub}</p>
                    </div>
                ))}
            </div>

            {/* ── Barra de progreso general ── */}
            {deudaTotal > 0 && (
                <div className="glass-card p-5">
                    <div className="flex items-center justify-between mb-3">
                        <div>
                            <p className="font-semibold text-sm">Progreso de pago — {config.nombrePaco}</p>
                            <p className="text-xs text-muted-foreground mt-0.5">
                                {fmtUSD(totalAbonado)} de {fmtUSD(deudaTotal)} cubiertos
                            </p>
                        </div>
                        <span className={cn(
                            'text-2xl font-bold',
                            porcentajePagado >= 100 ? 'text-emerald-400' :
                            porcentajePagado >= 50  ? 'text-amber-400'   : 'text-red-400',
                        )}>
                            {porcentajePagado.toFixed(1)}%
                        </span>
                    </div>
                    <BarraProgreso
                        porcentaje={porcentajePagado}
                        color={porcentajePagado >= 100 ? 'emerald' : porcentajePagado >= 50 ? 'amber' : 'red'}
                    />
                    <div className="flex justify-between mt-2 text-xs text-muted-foreground">
                        <span>$0</span>
                        <span>{fmtUSD(deudaTotal)}</span>
                    </div>
                </div>
            )}

            {/* ── Participacion societaria ── */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Rosi */}
                <div className="glass-card p-5">
                    <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                            <div className="w-9 h-9 rounded-full bg-blue-500/20 border border-blue-400/30 flex items-center justify-center font-bold text-blue-300">
                                {config.nombreRosi.charAt(0)}
                            </div>
                            <div>
                                <p className="font-semibold">{config.nombreRosi}</p>
                                <p className="text-xs text-muted-foreground">Socia mayoritaria</p>
                            </div>
                        </div>
                        <span className="text-2xl font-bold text-blue-400">{config.porcentajeRosi}%</span>
                    </div>
                    <BarraProgreso porcentaje={config.porcentajeRosi} color="blue" />
                    <div className="mt-3 p-2 bg-emerald-500/10 border border-emerald-500/20 rounded-lg text-xs text-emerald-400 flex items-center gap-2">
                        <ShieldCheck className="w-3.5 h-3.5 shrink-0" />
                        Recibe dividendos normalmente
                    </div>
                </div>

                {/* Paco */}
                <div className="glass-card p-5">
                    <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                            <div className="w-9 h-9 rounded-full bg-amber-500/20 border border-amber-400/30 flex items-center justify-center font-bold text-amber-300">
                                {config.nombrePaco.charAt(0)}
                            </div>
                            <div>
                                <p className="font-semibold">{config.nombrePaco}</p>
                                <p className="text-xs text-muted-foreground">Socio inversionista</p>
                            </div>
                        </div>
                        <span className="text-2xl font-bold text-amber-400">{config.porcentajePaco}%</span>
                    </div>
                    <BarraProgreso porcentaje={porcentajePagado} color={deudaCubierta ? 'emerald' : 'amber'} />
                    <div className={cn(
                        'mt-3 p-2 rounded-lg text-xs flex items-center gap-2',
                        deudaCubierta
                            ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-400'
                            : 'bg-amber-500/10 border border-amber-500/20 text-amber-400',
                    )}>
                        {deudaCubierta
                            ? <><ShieldCheck className="w-3.5 h-3.5 shrink-0" /> Deuda cubierta — puede recibir dividendos</>
                            : <><AlertTriangle className="w-3.5 h-3.5 shrink-0" /> Dividendos bloqueados — saldo pendiente: {fmtUSD(saldoPendiente)}</>
                        }
                    </div>
                </div>
            </div>

            {/* ── Proyeccion ── */}
            {!deudaCubierta && saldoPendiente > 0 && (
                <div className="glass-card p-5">
                    <div className="flex items-center gap-2 mb-4">
                        <Clock className="w-4 h-4 text-blue-400" />
                        <h3 className="font-semibold">Proyeccion de pago</h3>
                    </div>
                    <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-end">
                        <div className="flex-1">
                            <label className="text-xs text-muted-foreground mb-1 block">Promedio de abono mensual (USD)</label>
                            <div className="flex gap-2">
                                <div className="relative flex-1">
                                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-green-400 font-bold text-sm">$</span>
                                    <input
                                        type="number" min="0" step="10"
                                        className="input-sistema pl-7"
                                        value={promedioInput}
                                        onChange={e => setPromedioInput(e.target.value)}
                                    />
                                </div>
                                <button onClick={guardarPromedio} className="btn-secondary text-sm px-3 py-2 whitespace-nowrap">
                                    Guardar
                                </button>
                            </div>
                        </div>
                        {mesesRestantes !== null && mesesRestantes > 0 && (
                            <div className="sm:text-right">
                                <p className="text-xs text-muted-foreground">Tiempo estimado</p>
                                <p className="text-xl font-bold text-blue-400">
                                    {mesesRestantes} {mesesRestantes === 1 ? 'mes' : 'meses'}
                                </p>
                                {fechaLibre && (
                                    <p className="text-xs text-muted-foreground">
                                        Libre aprox. en <span className="text-blue-400 font-medium">{fechaLibre}</span>
                                    </p>
                                )}
                            </div>
                        )}
                    </div>
                    {mesesRestantes !== null && mesesRestantes > 0 && (
                        <div className="mt-4 grid grid-cols-3 gap-3 text-center">
                            {[3, 6, 12].map(m => {
                                const cubierto = promedio * m;
                                const nuevo = Math.max(0, saldoPendiente - cubierto);
                                const pct = deudaTotal > 0 ? Math.min(100, ((deudaTotal - nuevo) / deudaTotal) * 100) : 0;
                                return (
                                    <div key={m} className="p-3 bg-muted/20 rounded-xl border border-border">
                                        <p className="text-xs text-muted-foreground">En {m} meses</p>
                                        <p className="font-bold text-sm mt-1">{fmtUSD(nuevo)}</p>
                                        <p className="text-xs text-emerald-400">{pct.toFixed(0)}% pagado</p>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            )}

            {/* ── Grafica ── */}
            <div className="glass-card overflow-hidden">
                <button
                    onClick={() => toggle('grafica')}
                    className="w-full flex items-center justify-between p-5 hover:bg-muted/10 transition-colors"
                >
                    <div className="flex items-center gap-2">
                        <PieChart className="w-4 h-4 text-emerald-400" />
                        <span className="font-semibold">Grafica de evolucion de deuda</span>
                    </div>
                    {seccionExpandida === 'grafica' ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </button>
                {seccionExpandida === 'grafica' && (
                    <div className="px-5 pb-5">
                        <GraficaDeuda movimientos={movimientos} deudaInicial={deudaTotal} />
                    </div>
                )}
            </div>

            {/* ── Conceptos de deuda ── */}
            <div className="glass-card overflow-hidden">
                <button
                    onClick={() => toggle('conceptos')}
                    className="w-full flex items-center justify-between p-5 hover:bg-muted/10 transition-colors"
                >
                    <div className="flex items-center gap-2">
                        <FileText className="w-4 h-4 text-orange-400" />
                        <span className="font-semibold">Conceptos de deuda</span>
                        <span className="text-xs bg-orange-500/15 text-orange-400 px-2 py-0.5 rounded-full border border-orange-500/20">
                            {fmtUSD(deudaTotal)}
                        </span>
                    </div>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={e => { e.stopPropagation(); setModalConcepto({}); }}
                            className="text-xs flex items-center gap-1 px-2 py-1 bg-orange-500/10 hover:bg-orange-500/20 text-orange-400 border border-orange-500/20 rounded-lg transition-all"
                        >
                            <Plus className="w-3 h-3" /> Agregar
                        </button>
                        {seccionExpandida === 'conceptos' ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </div>
                </button>
                {seccionExpandida === 'conceptos' && (
                    <div className="border-t border-border">
                        {conceptos.length === 0 ? (
                            <div className="p-8 text-center text-muted-foreground text-sm">
                                Sin conceptos registrados. Agrega las facturas o gastos de construccion.
                            </div>
                        ) : (
                            <div className="divide-y divide-border">
                                {conceptos.map(c => {
                                    const t = TIPOS_CONCEPTO[c.tipo] ?? TIPOS_CONCEPTO.otro;
                                    return (
                                        <div key={c.id} className="flex items-center gap-3 p-4 hover:bg-muted/10 transition-colors">
                                            <div className={cn('shrink-0 px-2 py-0.5 rounded-full text-xs font-medium border', t.bg, t.color)}>
                                                {t.label}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="text-sm font-medium truncate">{c.descripcion}</p>
                                                <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                                                    <Calendar className="w-3 h-3" /> {fmtFecha(c.fecha)}
                                                    {c.notas && <span className="ml-2 truncate">{c.notas}</span>}
                                                </p>
                                            </div>
                                            <div className="text-right shrink-0">
                                                <p className="font-bold text-red-400">{fmtUSD(c.montoUSD)}</p>
                                            </div>
                                            <div className="flex gap-1 shrink-0">
                                                <button onClick={() => setModalConcepto(c)}
                                                    className="p-1.5 hover:bg-muted rounded-lg text-muted-foreground hover:text-foreground transition-colors">
                                                    <Edit2 className="w-3.5 h-3.5" />
                                                </button>
                                                <button onClick={() => eliminarConcepto(c.id)}
                                                    className="p-1.5 hover:bg-red-500/10 rounded-lg text-muted-foreground hover:text-red-400 transition-colors">
                                                    <Trash2 className="w-3.5 h-3.5" />
                                                </button>
                                            </div>
                                        </div>
                                    );
                                })}
                                <div className="p-4 flex justify-between items-center bg-muted/10">
                                    <span className="text-sm font-semibold">Total deuda</span>
                                    <span className="font-bold text-red-400 text-lg">{fmtUSD(deudaTotal)}</span>
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* ── Historial de movimientos ── */}
            <div className="glass-card overflow-hidden">
                <button
                    onClick={() => toggle('movimientos')}
                    className="w-full flex items-center justify-between p-5 hover:bg-muted/10 transition-colors"
                >
                    <div className="flex items-center gap-2">
                        <DollarSign className="w-4 h-4 text-emerald-400" />
                        <span className="font-semibold">Historial de movimientos</span>
                        <span className="text-xs bg-emerald-500/15 text-emerald-400 px-2 py-0.5 rounded-full border border-emerald-500/20">
                            {fmtUSD(totalAbonado)} abonado
                        </span>
                    </div>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={e => { e.stopPropagation(); setModalMovimiento(true); }}
                            className="text-xs flex items-center gap-1 px-2 py-1 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/20 rounded-lg transition-all"
                        >
                            <Plus className="w-3 h-3" /> Registrar
                        </button>
                        {seccionExpandida === 'movimientos' ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </div>
                </button>
                {seccionExpandida === 'movimientos' && (
                    <div className="border-t border-border">
                        {movimientos.length === 0 ? (
                            <div className="p-8 text-center text-muted-foreground text-sm">
                                Sin movimientos registrados todavia.
                            </div>
                        ) : (
                            <div className="divide-y divide-border">
                                {movimientos.map(m => {
                                    const t = TIPOS_MOV[m.tipo];
                                    const esAbono = t.signo === -1;
                                    return (
                                        <div key={m.id} className="flex items-center gap-3 p-4 hover:bg-muted/10 transition-colors">
                                            <div className={cn(
                                                'w-8 h-8 rounded-full flex items-center justify-center shrink-0',
                                                esAbono ? 'bg-emerald-500/15' : 'bg-red-500/15',
                                            )}>
                                                {esAbono
                                                    ? <ArrowDownCircle className="w-4 h-4 text-emerald-400" />
                                                    : <ArrowUpCircle className="w-4 h-4 text-red-400" />
                                                }
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="text-sm font-medium truncate">{m.descripcion}</p>
                                                <p className="text-xs text-muted-foreground flex items-center gap-2 mt-0.5">
                                                    <span className={cn('font-medium', t.color)}>{t.label}</span>
                                                    <span className="flex items-center gap-1">
                                                        <Calendar className="w-3 h-3" /> {fmtFecha(m.fecha)}
                                                    </span>
                                                    {m.saldoResultante !== undefined && (
                                                        <span>Saldo: {fmtUSD(m.saldoResultante)}</span>
                                                    )}
                                                </p>
                                            </div>
                                            <div className="text-right shrink-0">
                                                <p className={cn('font-bold', esAbono ? 'text-emerald-400' : 'text-red-400')}>
                                                    {esAbono ? '-' : '+'}{fmtUSD(m.montoUSD)}
                                                </p>
                                            </div>
                                            <button onClick={() => eliminarMovimiento(m.id)}
                                                className="p-1.5 hover:bg-red-500/10 rounded-lg text-muted-foreground hover:text-red-400 transition-colors shrink-0">
                                                <Trash2 className="w-3.5 h-3.5" />
                                            </button>
                                        </div>
                                    );
                                })}
                                <div className="p-4 grid grid-cols-2 gap-4 bg-muted/10">
                                    <div>
                                        <p className="text-xs text-muted-foreground">Total abonado</p>
                                        <p className="font-bold text-emerald-400">{fmtUSD(totalAbonado)}</p>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-xs text-muted-foreground">Saldo pendiente</p>
                                        <p className={cn('font-bold', saldoPendiente === 0 ? 'text-emerald-400' : 'text-amber-400')}>
                                            {fmtUSD(saldoPendiente)}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Modales */}
            {modalConcepto !== undefined && (
                <ModalConcepto
                    concepto={modalConcepto}
                    onCerrar={() => setModalConcepto(undefined)}
                    onGuardar={guardarConcepto}
                />
            )}
            {modalMovimiento && (
                <ModalMovimiento
                    onCerrar={() => setModalMovimiento(false)}
                    onGuardar={guardarMovimiento}
                    saldoActual={saldoPendiente}
                />
            )}
        </div>
    );
}
