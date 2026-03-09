'use client';

/**
 * app/clientes/page.tsx  (reemplaza la pagina de clientes)
 * Gestion completa de alumnos de la academia
 */

import { useState, useMemo } from 'react';
import {
    Plus, Search, Edit2, Trash2, X, CheckCircle2,
    Phone, Mail, Users, BookOpen, AlertTriangle,
    ChevronRight, Loader2, UserCheck, UserX, Clock,
    GraduationCap, Wallet, MessageCircle, CalendarDays,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { cn } from '@/lib/utils';
import { useAlumnos } from '@/lib/useAlumnos';
import { useServicios } from '@/lib/useServicios';
import { useTasas } from '@/components/providers/TasasProvider';
import type { Alumno, PaqueteActivo, EstadoAlumno } from '@/lib/useAlumnos';

/* ── Config estado ──────────────────────── */
const ESTADO_CONFIG: Record<EstadoAlumno, { label: string; color: string; bg: string }> = {
    activo:     { label: 'Activo',     color: 'text-emerald-400', bg: 'bg-emerald-500/10 border-emerald-500/20' },
    inactivo:   { label: 'Inactivo',   color: 'text-slate-400',   bg: 'bg-slate-500/10 border-slate-500/20' },
    vencido:    { label: 'Vencido',    color: 'text-red-400',     bg: 'bg-red-500/10 border-red-500/20' },
    suspendido: { label: 'Suspendido', color: 'text-amber-400',   bg: 'bg-amber-500/10 border-amber-500/20' },
};

/* ── Modal nuevo/editar alumno ──────────── */
function ModalAlumno({
    alumno, onCerrar, onGuardar,
}: {
    alumno: Partial<Alumno> | null;
    onCerrar: () => void;
    onGuardar: (datos: Omit<Alumno, 'id' | 'fechaTimestamp'>) => void;
}) {
    const esEdicion = !!(alumno as any)?.id;
    const [form, setForm] = useState<Partial<Alumno>>(alumno || {
        nombre: '', telefono: '', email: '', cedula: '',
        fechaIngreso: new Date().toISOString().split('T')[0],
        estado: 'activo', historialPaquetes: [], totalPagado: 0,
    });
    const set = (k: string, v: any) => setForm(p => ({ ...p, [k]: v }));

    const guardar = () => {
        if (!form.nombre?.trim() || !form.telefono?.trim()) {
            toast.error('Nombre y telefono son requeridos');
            return;
        }
        onGuardar({
            nombre:             form.nombre!.trim(),
            telefono:           form.telefono!.trim(),
            email:              form.email || '',
            cedula:             form.cedula || '',
            telefonoEmergencia: form.telefonoEmergencia || '',
            fechaNacimiento:    form.fechaNacimiento || '',
            fechaIngreso:       form.fechaIngreso || new Date().toISOString().split('T')[0],
            estado:             form.estado || 'activo',
            historialPaquetes:  form.historialPaquetes || [],
            totalPagado:        form.totalPagado || 0,
            notas:              form.notas || '',
            paqueteActivo:      form.paqueteActivo,
        });
    };

    return (
        <div className="modal-overlay">
            <div className="glass-card w-full max-w-lg max-h-[90vh] overflow-y-auto">
                <div className="flex items-center justify-between p-5 border-b border-border">
                    <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-blue-500/15 border border-blue-500/25 flex items-center justify-center">
                            <GraduationCap className="w-5 h-5 text-blue-400" />
                        </div>
                        <h3 className="font-semibold">{esEdicion ? 'Editar Alumno' : 'Nuevo Alumno'}</h3>
                    </div>
                    <button onClick={onCerrar} className="p-1.5 hover:bg-muted rounded-lg text-muted-foreground hover:text-foreground transition-all">
                        <X className="w-4 h-4" />
                    </button>
                </div>
                <div className="p-5 space-y-4">
                    <div className="grid grid-cols-2 gap-3">
                        <div className="col-span-2">
                            <label className="text-xs text-muted-foreground mb-1 block font-medium">Nombre completo *</label>
                            <input className="input-sistema" value={form.nombre || ''} onChange={e => set('nombre', e.target.value)} placeholder="Nombre del alumno" />
                        </div>
                        <div>
                            <label className="text-xs text-muted-foreground mb-1 block font-medium">Cedula</label>
                            <input className="input-sistema" value={form.cedula || ''} onChange={e => set('cedula', e.target.value)} placeholder="V-XXXXXXXX" />
                        </div>
                        <div>
                            <label className="text-xs text-muted-foreground mb-1 block font-medium">Telefono *</label>
                            <input className="input-sistema" value={form.telefono || ''} onChange={e => set('telefono', e.target.value)} placeholder="04XX-XXXXXXX" />
                        </div>
                        <div>
                            <label className="text-xs text-muted-foreground mb-1 block font-medium">Telefono emergencia</label>
                            <input className="input-sistema" value={form.telefonoEmergencia || ''} onChange={e => set('telefonoEmergencia', e.target.value)} placeholder="04XX-XXXXXXX" />
                        </div>
                        <div>
                            <label className="text-xs text-muted-foreground mb-1 block font-medium">Email</label>
                            <input type="email" className="input-sistema" value={form.email || ''} onChange={e => set('email', e.target.value)} placeholder="correo@email.com" />
                        </div>
                        <div>
                            <label className="text-xs text-muted-foreground mb-1 block font-medium">Fecha de nacimiento</label>
                            <input type="date" className="input-sistema" value={form.fechaNacimiento || ''} onChange={e => set('fechaNacimiento', e.target.value)} />
                        </div>
                        <div>
                            <label className="text-xs text-muted-foreground mb-1 block font-medium">Fecha de ingreso</label>
                            <input type="date" className="input-sistema" value={form.fechaIngreso || ''} onChange={e => set('fechaIngreso', e.target.value)} />
                        </div>
                        <div>
                            <label className="text-xs text-muted-foreground mb-1 block font-medium">Estado</label>
                            <select className="input-sistema" value={form.estado || 'activo'} onChange={e => set('estado', e.target.value)}>
                                <option value="activo">Activo</option>
                                <option value="inactivo">Inactivo</option>
                                <option value="vencido">Vencido</option>
                                <option value="suspendido">Suspendido</option>
                            </select>
                        </div>
                        <div className="col-span-2">
                            <label className="text-xs text-muted-foreground mb-1 block font-medium">Notas internas</label>
                            <textarea className="input-sistema resize-none h-20 text-sm" value={form.notas || ''} onChange={e => set('notas', e.target.value)} placeholder="Observaciones, lesiones, preferencias..." />
                        </div>
                    </div>
                    <div className="flex justify-end gap-3 pt-2">
                        <button onClick={onCerrar} className="btn-secondary">Cancelar</button>
                        <button onClick={guardar} className="btn-primary">
                            <CheckCircle2 className="w-4 h-4" />
                            {esEdicion ? 'Actualizar' : 'Crear Alumno'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}

/* ── Modal asignar paquete ──────────────── */
function ModalPaquete({
    alumno, onCerrar, onAsignar,
}: {
    alumno: Alumno;
    onCerrar: () => void;
    onAsignar: (p: PaqueteActivo) => void;
}) {
    const { servicios } = useServicios();
    const { tasas }     = useTasas();
    const serviciosActivos = servicios.filter(s => s.activo !== false);

    const [form, setForm] = useState({
        servicioId:       '',
        clasesTotal:      0,
        fechaInicio:      new Date().toISOString().split('T')[0],
        fechaVencimiento: '',
        montoPagado:      0,
        montoUSD:         0,
        tipoPaquete:      'paquete_clases' as 'paquete_clases' | 'alquiler' | 'mensualidad' | 'otro',
    });
    const set = (k: string, v: any) => setForm(p => ({ ...p, [k]: v }));

    const servicioSeleccionado = serviciosActivos.find(s => s.id === form.servicioId);

    const seleccionarServicio = (id: string) => {
        const s = serviciosActivos.find(sv => sv.id === id);
        if (!s) { set('servicioId', ''); return; }
        const montoUSD = s.precioUSD || 0;
        set('servicioId', id);
        setForm(p => ({
            ...p, servicioId: id,
            clasesTotal:  s.clasesIncluidas || 0,
            montoPagado:  Math.round(montoUSD * (tasas.bcv || 1)),
            montoUSD,
            tipoPaquete:  (s.tipo === 'alquiler' ? 'alquiler' : 'paquete_clases') as 'paquete_clases' | 'alquiler' | 'mensualidad' | 'otro',
        }));
    };

    const guardar = () => {
        if (!form.servicioId || !form.fechaVencimiento) {
            toast.error('Selecciona un servicio y fecha de vencimiento');
            return;
        }
        onAsignar({
            servicioId:       form.servicioId,
            nombreServicio:   servicioSeleccionado?.nombre || '',
            tipoPaquete:      form.tipoPaquete,
            clasesTotal:      form.clasesTotal,
            clasesRestantes:  form.clasesTotal,
            fechaInicio:      form.fechaInicio,
            fechaVencimiento: form.fechaVencimiento,
            montoPagado:      form.montoPagado,
            montoUSD:         form.montoUSD,
        });
    };

    return (
        <div className="modal-overlay">
            <div className="glass-card w-full max-w-md">
                <div className="flex items-center justify-between p-5 border-b border-border">
                    <h3 className="font-semibold">Asignar Paquete a {alumno.nombre.split(' ')[0]}</h3>
                    <button onClick={onCerrar} className="p-1.5 hover:bg-muted rounded-lg text-muted-foreground transition-all">
                        <X className="w-4 h-4" />
                    </button>
                </div>
                <div className="p-5 space-y-4">
                    <div>
                        <label className="text-xs text-muted-foreground mb-1 block font-medium">Servicio / Paquete *</label>
                        <select className="input-sistema" value={form.servicioId} onChange={e => seleccionarServicio(e.target.value)}>
                            <option value="">Seleccionar servicio...</option>
                            {serviciosActivos.map(s => (
                                <option key={s.id} value={s.id}>
                                    {s.nombre} - ${s.precioUSD || 0}
                                </option>
                            ))}
                        </select>
                    </div>
                    {servicioSeleccionado && (
                        <div className="p-3 rounded-xl bg-blue-500/10 border border-blue-500/20 text-sm space-y-1">
                            <p className="text-blue-400 font-semibold">{servicioSeleccionado.nombre}</p>
                            <p className="text-muted-foreground">{form.clasesTotal} clases incluidas</p>
                            <p className="text-muted-foreground font-mono">Bs {form.montoPagado.toLocaleString('es-VE', { minimumFractionDigits: 2 })} (tasa BCV)</p>
                        </div>
                    )}
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="text-xs text-muted-foreground mb-1 block font-medium">Clases incluidas</label>
                            <input type="number" className="input-sistema font-mono" value={form.clasesTotal || ''} onChange={e => set('clasesTotal', parseInt(e.target.value) || 0)} />
                        </div>
                        <div>
                            <label className="text-xs text-muted-foreground mb-1 block font-medium">Monto USD cobrado</label>
                            <input type="number" className="input-sistema font-mono" value={form.montoUSD || ''} onChange={e => setForm(p => ({ ...p, montoUSD: parseFloat(e.target.value) || 0, montoPagado: Math.round((parseFloat(e.target.value) || 0) * (tasas.bcv || 1)) }))} />
                        </div>
                        <div>
                            <label className="text-xs text-muted-foreground mb-1 block font-medium">Fecha inicio</label>
                            <input type="date" className="input-sistema" value={form.fechaInicio} onChange={e => set('fechaInicio', e.target.value)} />
                        </div>
                        <div>
                            <label className="text-xs text-muted-foreground mb-1 block font-medium">Fecha vencimiento *</label>
                            <input type="date" className="input-sistema" value={form.fechaVencimiento} onChange={e => set('fechaVencimiento', e.target.value)} />
                        </div>
                    </div>
                    <div className="flex justify-end gap-3 pt-2">
                        <button onClick={onCerrar} className="btn-secondary">Cancelar</button>
                        <button onClick={guardar} className="btn-primary">
                            <BookOpen className="w-4 h-4" /> Asignar Paquete
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}

/* ── Card de alumno ─────────────────────── */
function CardAlumno({
    alumno, onEditar, onEliminar, onPaquete, onDescontar,
}: {
    alumno:     Alumno;
    onEditar:   () => void;
    onEliminar: () => void;
    onPaquete:  () => void;
    onDescontar: () => void;
}) {
    const est = ESTADO_CONFIG[alumno.estado];
    const pkg  = alumno.paqueteActivo;
    const pocasClases = pkg && pkg.clasesRestantes <= 2 && pkg.clasesRestantes > 0;
    const sinClases   = pkg && pkg.clasesRestantes <= 0;

    return (
        <div className={cn(
            'card-sistema p-4 space-y-3 hover:border-blue-500/30 transition-all duration-200',
            pocasClases && 'border-amber-500/30',
            sinClases   && 'border-red-500/30',
        )}>
            {/* Header */}
            <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 rounded-xl bg-blue-500/15 border border-blue-500/20 flex items-center justify-center flex-shrink-0">
                        <span className="text-sm font-bold text-blue-400">
                            {alumno.nombre.charAt(0).toUpperCase()}
                        </span>
                    </div>
                    <div className="min-w-0">
                        <p className="font-semibold text-sm truncate">{alumno.nombre}</p>
                        {alumno.cedula && <p className="text-xs text-muted-foreground">{alumno.cedula}</p>}
                    </div>
                </div>
                <span className={cn('text-[11px] font-medium px-2 py-0.5 rounded-full border flex-shrink-0', est.bg, est.color)}>
                    {est.label}
                </span>
            </div>

            {/* Contacto */}
            <div className="flex flex-wrap gap-x-4 gap-y-1">
                {alumno.telefono && (
                    <a href={`tel:${alumno.telefono}`} className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors">
                        <Phone className="w-3 h-3" />{alumno.telefono}
                    </a>
                )}
                {alumno.email && (
                    <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        <Mail className="w-3 h-3" />{alumno.email}
                    </span>
                )}
            </div>

            {/* Paquete activo */}
            {pkg ? (
                <div className={cn(
                    'p-3 rounded-xl border text-xs space-y-1.5',
                    sinClases   ? 'bg-red-500/10 border-red-500/20' :
                    pocasClases ? 'bg-amber-500/10 border-amber-500/20' :
                                  'bg-emerald-500/10 border-emerald-500/20'
                )}>
                    <div className="flex items-center justify-between">
                        <span className="font-semibold text-foreground">{pkg.nombreServicio}</span>
                        {pocasClases && !sinClases && <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />}
                        {sinClases   && <AlertTriangle className="w-3.5 h-3.5 text-red-400" />}
                    </div>
                    <div className="flex items-center gap-4">
                        <span className={cn('font-bold font-mono text-base',
                            sinClases ? 'text-red-400' : pocasClases ? 'text-amber-400' : 'text-emerald-400')}>
                            {pkg.clasesRestantes}
                            <span className="text-xs font-normal text-muted-foreground"> / {pkg.clasesTotal} clases</span>
                        </span>
                    </div>
                    <div className="flex items-center gap-1 text-muted-foreground">
                        <CalendarDays className="w-3 h-3" />
                        Vence: {pkg.fechaVencimiento}
                    </div>
                </div>
            ) : (
                <div className="p-3 rounded-xl border border-dashed border-border text-xs text-muted-foreground text-center">
                    Sin paquete activo
                </div>
            )}

            {/* Acciones */}
            <div className="flex items-center gap-2 pt-1">
                {pkg && pkg.clasesRestantes > 0 && (
                    <button onClick={onDescontar}
                        className="flex-1 btn-success text-xs py-1.5 justify-center">
                        <CheckCircle2 className="w-3.5 h-3.5" /> Clase asistida
                    </button>
                )}
                <button onClick={onPaquete}
                    className="flex-1 btn-secondary text-xs py-1.5 justify-center">
                    <BookOpen className="w-3.5 h-3.5" /> {pkg ? 'Renovar' : 'Asignar paquete'}
                </button>
                <button onClick={onEditar}
                    className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg transition-all">
                    <Edit2 className="w-3.5 h-3.5" />
                </button>
                <button onClick={onEliminar}
                    className="p-1.5 text-muted-foreground hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-all">
                    <Trash2 className="w-3.5 h-3.5" />
                </button>
            </div>
        </div>
    );
}

/* ── Pagina principal ───────────────────── */
export default function AlumnosPage() {
    const { alumnos, cargando, activos, vencidos, conPoco,
            crearAlumno, actualizarAlumno, eliminarAlumno,
            asignarPaquete, descontarClase } = useAlumnos();

    const [busqueda,    setBusqueda]    = useState('');
    const [filtroEstado, setFiltroEstado] = useState<'todos' | EstadoAlumno>('todos');
    const [modalAlumno, setModalAlumno] = useState<Partial<Alumno> | null | undefined>(undefined);
    const [modalPaquete, setModalPaquete] = useState<Alumno | null>(null);

    const alumnosFiltrados = useMemo(() => {
        return alumnos.filter(a => {
            const matchBusqueda = !busqueda
                || a.nombre.toLowerCase().includes(busqueda.toLowerCase())
                || (a.cedula   || '').includes(busqueda)
                || (a.telefono || '').includes(busqueda);
            const matchEstado = filtroEstado === 'todos' || a.estado === filtroEstado;
            return matchBusqueda && matchEstado;
        });
    }, [alumnos, busqueda, filtroEstado]);

    const handleGuardar = async (datos: Omit<Alumno, 'id' | 'fechaTimestamp'>) => {
        try {
            const id = (modalAlumno as any)?.id;
            if (id) {
                await actualizarAlumno(id, datos);
                toast.success('Alumno actualizado');
            } else {
                await crearAlumno(datos);
                toast.success('Alumno creado');
            }
            setModalAlumno(undefined);
        } catch {
            toast.error('Error al guardar');
        }
    };

    const handleEliminar = async (alumno: Alumno) => {
        if (!confirm(`Eliminar a ${alumno.nombre}?`)) return;
        try {
            await eliminarAlumno(alumno.id);
            toast.success('Alumno eliminado');
        } catch {
            toast.error('Error al eliminar');
        }
    };

    const handleAsignarPaquete = async (paquete: PaqueteActivo) => {
        if (!modalPaquete) return;
        try {
            await asignarPaquete(modalPaquete.id, paquete, modalPaquete);
            toast.success('Paquete asignado correctamente');
            setModalPaquete(null);
        } catch {
            toast.error('Error al asignar paquete');
        }
    };

    const handleDescontarClase = async (alumno: Alumno) => {
        try {
            await descontarClase(alumno.id, alumno);
            const restantes = (alumno.paqueteActivo?.clasesRestantes || 1) - 1;
            if (restantes <= 0) {
                toast.success('Clase registrada — paquete agotado');
            } else if (restantes <= 2) {
                toast(`Clase registrada — quedan ${restantes} clases`, { icon: '' });
            } else {
                toast.success(`Clase registrada — quedan ${restantes} clases`);
            }
        } catch {
            toast.error('Error al registrar clase');
        }
    };

    if (cargando) {
        return (
            <div className="flex items-center justify-center py-32">
                <Loader2 className="w-8 h-8 animate-spin text-blue-400" />
                <span className="ml-3 text-muted-foreground">Cargando alumnos...</span>
            </div>
        );
    }

    return (
        <div className="space-y-6 animate-fade-in">

            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold">Alumnos</h1>
                    <p className="text-muted-foreground text-sm">{alumnos.length} registrados</p>
                </div>
                <button onClick={() => setModalAlumno(null)} className="btn-primary">
                    <Plus className="w-4 h-4" /> Nuevo Alumno
                </button>
            </div>

            {/* KPIs */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="kpi-card">
                    <UserCheck className="w-4 h-4 text-emerald-400 mb-2" />
                    <p className="text-2xl font-bold font-mono text-emerald-400">{activos}</p>
                    <p className="text-xs text-muted-foreground">Activos</p>
                </div>
                <div className="kpi-card">
                    <UserX className="w-4 h-4 text-red-400 mb-2" />
                    <p className="text-2xl font-bold font-mono text-red-400">{vencidos}</p>
                    <p className="text-xs text-muted-foreground">Vencidos</p>
                </div>
                <div className="kpi-card">
                    <AlertTriangle className="w-4 h-4 text-amber-400 mb-2" />
                    <p className="text-2xl font-bold font-mono text-amber-400">{conPoco}</p>
                    <p className="text-xs text-muted-foreground">Pocas clases restantes</p>
                </div>
                <div className="kpi-card">
                    <Users className="w-4 h-4 text-blue-400 mb-2" />
                    <p className="text-2xl font-bold font-mono">{alumnos.length}</p>
                    <p className="text-xs text-muted-foreground">Total registrados</p>
                </div>
            </div>

            {/* Alerta pocas clases */}
            {conPoco > 0 && (
                <div className="flex items-center gap-3 p-4 rounded-xl bg-amber-500/10 border border-amber-500/25">
                    <AlertTriangle className="w-5 h-5 text-amber-400 flex-shrink-0" />
                    <p className="text-sm text-amber-300">
                        <span className="font-semibold">{conPoco} alumno{conPoco > 1 ? 's' : ''}</span> con 2 clases o menos restantes. Contactalos para renovar su paquete.
                    </p>
                </div>
            )}

            {/* Filtros */}
            <div className="flex flex-wrap gap-3">
                <div className="relative flex-1 min-w-52">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <input className="input-sistema pl-10" placeholder="Buscar por nombre, cedula o telefono..."
                        value={busqueda} onChange={e => setBusqueda(e.target.value)} />
                </div>
                <select className="input-sistema w-auto" value={filtroEstado}
                    onChange={e => setFiltroEstado(e.target.value as any)}>
                    <option value="todos">Todos los estados</option>
                    <option value="activo">Activos</option>
                    <option value="vencido">Vencidos</option>
                    <option value="inactivo">Inactivos</option>
                    <option value="suspendido">Suspendidos</option>
                </select>
            </div>

            {/* Grid de alumnos */}
            {alumnosFiltrados.length === 0 ? (
                <div className="card-sistema p-16 text-center">
                    <GraduationCap className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
                    <p className="text-muted-foreground font-medium">
                        {alumnos.length === 0 ? 'Aun no hay alumnos registrados' : 'No hay alumnos con esos filtros'}
                    </p>
                    {alumnos.length === 0 && (
                        <button onClick={() => setModalAlumno(null)} className="btn-primary mt-4 mx-auto">
                            <Plus className="w-4 h-4" /> Agregar primer alumno
                        </button>
                    )}
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                    {alumnosFiltrados.map(alumno => (
                        <CardAlumno
                            key={alumno.id}
                            alumno={alumno}
                            onEditar={() => setModalAlumno(alumno)}
                            onEliminar={() => handleEliminar(alumno)}
                            onPaquete={() => setModalPaquete(alumno)}
                            onDescontar={() => handleDescontarClase(alumno)}
                        />
                    ))}
                </div>
            )}

            {/* Modales */}
            {modalAlumno !== undefined && (
                <ModalAlumno
                    alumno={modalAlumno}
                    onCerrar={() => setModalAlumno(undefined)}
                    onGuardar={handleGuardar}
                />
            )}
            {modalPaquete && (
                <ModalPaquete
                    alumno={modalPaquete}
                    onCerrar={() => setModalPaquete(null)}
                    onAsignar={handleAsignarPaquete}
                />
            )}
        </div>
    );
}
