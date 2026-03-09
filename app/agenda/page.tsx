'use client';

/**
 * app/agenda/page.tsx
 * Agenda semanal del estudio de arte
 */

import { useState, useMemo } from 'react';
import {
    Plus, ChevronLeft, ChevronRight, X, CheckCircle2,
    Clock, Loader2, Calendar, MapPin, User, Trash2, Edit2,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { cn } from '@/lib/utils';
import { useAgenda } from '@/lib/useAgenda';
import { useAlumnos } from '@/lib/useAlumnos';
import { TIPO_EVENTO_CONFIG } from '@/lib/useAgenda';
import type { Evento, TipoEvento, EstadoEvento } from '@/lib/useAgenda';

const DIAS_SEMANA = ['Dom', 'Lun', 'Mar', 'Mie', 'Jue', 'Vie', 'Sab'];
const HORAS = Array.from({ length: 14 }, (_, i) => i + 7); // 7am - 8pm

function formatHora(h: number) {
    return h < 12 ? `${h}:00 AM` : h === 12 ? '12:00 PM' : `${h - 12}:00 PM`;
}

function getSemana(fecha: Date) {
    const inicio = new Date(fecha);
    inicio.setDate(inicio.getDate() - inicio.getDay());
    return Array.from({ length: 7 }, (_, i) => {
        const d = new Date(inicio);
        d.setDate(inicio.getDate() + i);
        return d;
    });
}

/* ── Modal nuevo/editar evento ──────────── */
function ModalEvento({
    evento, fechaDefault, onCerrar, onGuardar,
}: {
    evento:       Partial<Evento> | null;
    fechaDefault: string;
    onCerrar:     () => void;
    onGuardar:    (datos: Omit<Evento, 'id' | 'fechaTimestamp'>) => void;
}) {
    const { alumnos } = useAlumnos();
    const esEdicion   = !!(evento as any)?.id;

    const [form, setForm] = useState<Partial<Evento>>(evento || {
        titulo: '', tipo: 'clase', estado: 'confirmado',
        fecha: fechaDefault, horaInicio: '09:00', horaFin: '10:00',
        espacio: '', instructor: '',
    });
    const set = (k: string, v: any) => setForm(p => ({ ...p, [k]: v }));

    const guardar = () => {
        if (!form.titulo?.trim()) { toast.error('El titulo es requerido'); return; }
        if (!form.fecha)          { toast.error('Selecciona la fecha'); return; }
        onGuardar({
            titulo:       form.titulo!.trim(),
            tipo:         form.tipo         || 'clase',
            estado:       form.estado       || 'confirmado',
            fecha:        form.fecha        || fechaDefault,
            horaInicio:   form.horaInicio   || '09:00',
            horaFin:      form.horaFin      || '10:00',
            espacio:      form.espacio      || '',
            instructor:   form.instructor   || '',
            alumnoId:     form.alumnoId     || '',
            alumnoNombre: form.alumnoNombre || '',
            descripcion:  form.descripcion  || '',
            montoBs:      form.montoBs      || 0,
            montoUSD:     form.montoUSD     || 0,
            notas:        form.notas        || '',
        });
    };

    return (
        <div className="modal-overlay">
            <div className="glass-card w-full max-w-lg max-h-[90vh] overflow-y-auto">
                <div className="flex items-center justify-between p-5 border-b border-border">
                    <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-purple-500/15 border border-purple-500/25 flex items-center justify-center">
                            <Calendar className="w-5 h-5 text-purple-400" />
                        </div>
                        <h3 className="font-semibold">{esEdicion ? 'Editar Evento' : 'Nuevo Evento'}</h3>
                    </div>
                    <button onClick={onCerrar} className="p-1.5 hover:bg-muted rounded-lg text-muted-foreground transition-all">
                        <X className="w-4 h-4" />
                    </button>
                </div>
                <div className="p-5 space-y-4">
                    <div>
                        <label className="text-xs text-muted-foreground mb-1 block font-medium">Titulo *</label>
                        <input className="input-sistema" value={form.titulo || ''}
                            onChange={e => set('titulo', e.target.value)}
                            placeholder="Ej: Clase de ballet, Alquiler sala A..." />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="text-xs text-muted-foreground mb-1 block font-medium">Tipo</label>
                            <select className="input-sistema" value={form.tipo || 'clase'}
                                onChange={e => set('tipo', e.target.value)}>
                                {(Object.keys(TIPO_EVENTO_CONFIG) as TipoEvento[]).map(t => (
                                    <option key={t} value={t}>{TIPO_EVENTO_CONFIG[t].label}</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="text-xs text-muted-foreground mb-1 block font-medium">Estado</label>
                            <select className="input-sistema" value={form.estado || 'confirmado'}
                                onChange={e => set('estado', e.target.value)}>
                                <option value="confirmado">Confirmado</option>
                                <option value="tentativo">Tentativo</option>
                                <option value="cancelado">Cancelado</option>
                            </select>
                        </div>
                        <div>
                            <label className="text-xs text-muted-foreground mb-1 block font-medium">Fecha</label>
                            <input type="date" className="input-sistema" value={form.fecha || fechaDefault}
                                onChange={e => set('fecha', e.target.value)} />
                        </div>
                        <div>
                            <label className="text-xs text-muted-foreground mb-1 block font-medium">Espacio / Sala</label>
                            <input className="input-sistema" value={form.espacio || ''}
                                onChange={e => set('espacio', e.target.value)} placeholder="Sala A, Estudio..." />
                        </div>
                        <div>
                            <label className="text-xs text-muted-foreground mb-1 block font-medium">Hora inicio</label>
                            <input type="time" className="input-sistema" value={form.horaInicio || '09:00'}
                                onChange={e => set('horaInicio', e.target.value)} />
                        </div>
                        <div>
                            <label className="text-xs text-muted-foreground mb-1 block font-medium">Hora fin</label>
                            <input type="time" className="input-sistema" value={form.horaFin || '10:00'}
                                onChange={e => set('horaFin', e.target.value)} />
                        </div>
                        <div>
                            <label className="text-xs text-muted-foreground mb-1 block font-medium">Instructor</label>
                            <input className="input-sistema" value={form.instructor || ''}
                                onChange={e => set('instructor', e.target.value)} placeholder="Nombre del instructor" />
                        </div>
                        <div>
                            <label className="text-xs text-muted-foreground mb-1 block font-medium">Alumno (opcional)</label>
                            <select className="input-sistema" value={form.alumnoId || ''}
                                onChange={e => {
                                    const a = alumnos.find(al => al.id === e.target.value);
                                    setForm(p => ({ ...p, alumnoId: e.target.value, alumnoNombre: a?.nombre || '' }));
                                }}>
                                <option value="">Seleccionar alumno...</option>
                                {alumnos.map(a => <option key={a.id} value={a.id}>{a.nombre}</option>)}
                            </select>
                        </div>
                    </div>
                    <div className="flex justify-end gap-3 pt-2">
                        <button onClick={onCerrar} className="btn-secondary">Cancelar</button>
                        <button onClick={guardar} className="btn-primary">
                            <CheckCircle2 className="w-4 h-4" />
                            {esEdicion ? 'Actualizar' : 'Crear Evento'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}

/* ── Pagina principal ───────────────────── */
export default function AgendaPage() {
    const hoy = new Date();
    const [semanaBase, setSemanaBase] = useState(new Date(hoy));
    const semana = getSemana(semanaBase);

    const fechaInicio = semana[0].toISOString().split('T')[0];
    const fechaFin    = semana[6].toISOString().split('T')[0];

    const { eventos, cargando, crearEvento, actualizarEvento, eliminarEvento } = useAgenda(fechaInicio, fechaFin);

    const [modalEvento,  setModalEvento]  = useState<Partial<Evento> | null | undefined>(undefined);
    const [fechaClick,   setFechaClick]   = useState('');
    const [eventoDetalle, setEventoDetalle] = useState<Evento | null>(null);

    const navegarSemana = (dir: -1 | 1) => {
        setSemanaBase(prev => {
            const d = new Date(prev);
            d.setDate(d.getDate() + dir * 7);
            return d;
        });
    };

    const esHoy = (d: Date) => d.toDateString() === hoy.toDateString();

    const eventosPorDia = useMemo(() => {
        const map: Record<string, Evento[]> = {};
        eventos.forEach(e => {
            if (!map[e.fecha]) map[e.fecha] = [];
            map[e.fecha].push(e);
        });
        return map;
    }, [eventos]);

    const handleGuardar = async (datos: Omit<Evento, 'id' | 'fechaTimestamp'>) => {
        try {
            const id = (modalEvento as any)?.id;
            if (id) { await actualizarEvento(id, datos); toast.success('Evento actualizado'); }
            else    { await crearEvento(datos);          toast.success('Evento creado'); }
            setModalEvento(undefined);
        } catch { toast.error('Error al guardar'); }
    };

    const handleEliminar = async (e: Evento) => {
        if (!confirm('Eliminar este evento?')) return;
        try { await eliminarEvento(e.id); toast.success('Evento eliminado'); setEventoDetalle(null); }
        catch { toast.error('Error al eliminar'); }
    };

    if (cargando) return (
        <div className="flex items-center justify-center py-32">
            <Loader2 className="w-8 h-8 animate-spin text-purple-400" />
            <span className="ml-3 text-muted-foreground">Cargando agenda...</span>
        </div>
    );

    return (
        <div className="space-y-5 animate-fade-in">
            {/* Header */}
            <div className="flex items-center justify-between flex-wrap gap-4">
                <div>
                    <h1 className="text-2xl font-bold">Agenda</h1>
                    <p className="text-muted-foreground text-sm">
                        {semana[0].toLocaleDateString('es-VE', { day: 'numeric', month: 'long' })} —{' '}
                        {semana[6].toLocaleDateString('es-VE', { day: 'numeric', month: 'long', year: 'numeric' })}
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    <button onClick={() => setSemanaBase(new Date())} className="btn-secondary text-xs">Hoy</button>
                    <button onClick={() => navegarSemana(-1)} className="p-2 hover:bg-muted rounded-xl border border-border transition-all">
                        <ChevronLeft className="w-4 h-4" />
                    </button>
                    <button onClick={() => navegarSemana(1)} className="p-2 hover:bg-muted rounded-xl border border-border transition-all">
                        <ChevronRight className="w-4 h-4" />
                    </button>
                    <button onClick={() => { setFechaClick(hoy.toISOString().split('T')[0]); setModalEvento(null); }}
                        className="btn-primary">
                        <Plus className="w-4 h-4" /> Nuevo Evento
                    </button>
                </div>
            </div>

            {/* Leyenda tipos */}
            <div className="flex flex-wrap gap-2">
                {(Object.keys(TIPO_EVENTO_CONFIG) as TipoEvento[]).map(t => (
                    <span key={t} className={cn('text-xs px-2.5 py-1 rounded-full border', TIPO_EVENTO_CONFIG[t].bg)}
                        style={{ color: TIPO_EVENTO_CONFIG[t].color }}>
                        {TIPO_EVENTO_CONFIG[t].label}
                    </span>
                ))}
            </div>

            {/* Calendario semanal */}
            <div className="card-sistema overflow-hidden p-0">
                {/* Header dias */}
                <div className="grid grid-cols-8 border-b border-border">
                    <div className="p-3 text-xs text-muted-foreground font-medium" />
                    {semana.map((dia, i) => (
                        <div key={i} className={cn(
                            'p-3 text-center border-l border-border',
                            esHoy(dia) && 'bg-blue-500/10'
                        )}>
                            <p className="text-xs text-muted-foreground font-medium">{DIAS_SEMANA[dia.getDay()]}</p>
                            <p className={cn(
                                'text-lg font-bold mt-0.5',
                                esHoy(dia) ? 'text-blue-400' : 'text-foreground'
                            )}>
                                {dia.getDate()}
                            </p>
                            {/* Puntos de eventos */}
                            <div className="flex justify-center gap-0.5 mt-1 h-2">
                                {(eventosPorDia[dia.toISOString().split('T')[0]] || []).slice(0, 3).map((e, ei) => (
                                    <div key={ei} className="w-1.5 h-1.5 rounded-full"
                                        style={{ background: TIPO_EVENTO_CONFIG[e.tipo]?.color || '#64748b' }} />
                                ))}
                            </div>
                        </div>
                    ))}
                </div>

                {/* Grilla de horas */}
                <div className="overflow-y-auto max-h-[60vh]">
                    {HORAS.map(hora => (
                        <div key={hora} className="grid grid-cols-8 border-b border-border/40 min-h-[52px]">
                            {/* Etiqueta hora */}
                            <div className="p-2 text-right pr-3">
                                <span className="text-xs text-muted-foreground font-mono">{formatHora(hora)}</span>
                            </div>
                            {/* Celdas por dia */}
                            {semana.map((dia, di) => {
                                const fechaDia   = dia.toISOString().split('T')[0];
                                const evsDia     = eventosPorDia[fechaDia] || [];
                                const evsHora    = evsDia.filter(e => {
                                    const h = parseInt(e.horaInicio.split(':')[0]);
                                    return h === hora;
                                });
                                return (
                                    <div key={di} className={cn(
                                        'border-l border-border/40 p-1 cursor-pointer hover:bg-muted/30 transition-all',
                                        esHoy(dia) && 'bg-blue-500/5'
                                    )}
                                        onClick={() => {
                                            setFechaClick(fechaDia);
                                            setModalEvento(null);
                                        }}>
                                        {evsHora.map(ev => (
                                            <div key={ev.id}
                                                onClick={e => { e.stopPropagation(); setEventoDetalle(ev); }}
                                                className={cn(
                                                    'rounded-lg px-2 py-1 mb-0.5 cursor-pointer text-xs border',
                                                    'hover:opacity-80 transition-all',
                                                    TIPO_EVENTO_CONFIG[ev.tipo]?.bg || 'bg-slate-500/15',
                                                    ev.estado === 'cancelado' && 'opacity-40 line-through'
                                                )}>
                                                <p className="font-semibold truncate" style={{ color: TIPO_EVENTO_CONFIG[ev.tipo]?.color }}>
                                                    {ev.titulo}
                                                </p>
                                                <p className="text-muted-foreground">
                                                    {ev.horaInicio} - {ev.horaFin}
                                                </p>
                                                {ev.instructor && <p className="text-muted-foreground truncate">{ev.instructor}</p>}
                                            </div>
                                        ))}
                                    </div>
                                );
                            })}
                        </div>
                    ))}
                </div>
            </div>

            {/* Panel detalle evento */}
            {eventoDetalle && (
                <div className="modal-overlay" onClick={() => setEventoDetalle(null)}>
                    <div className="glass-card w-full max-w-sm" onClick={e => e.stopPropagation()}>
                        <div className="flex items-center justify-between p-4 border-b border-border">
                            <span className={cn('text-xs px-2 py-0.5 rounded-full border', TIPO_EVENTO_CONFIG[eventoDetalle.tipo]?.bg)}
                                style={{ color: TIPO_EVENTO_CONFIG[eventoDetalle.tipo]?.color }}>
                                {TIPO_EVENTO_CONFIG[eventoDetalle.tipo]?.label}
                            </span>
                            <button onClick={() => setEventoDetalle(null)}
                                className="p-1.5 hover:bg-muted rounded-lg text-muted-foreground transition-all">
                                <X className="w-4 h-4" />
                            </button>
                        </div>
                        <div className="p-4 space-y-3">
                            <h3 className="font-semibold text-lg">{eventoDetalle.titulo}</h3>
                            <div className="space-y-2 text-sm">
                                <div className="flex items-center gap-2 text-muted-foreground">
                                    <Clock className="w-4 h-4" />
                                    {eventoDetalle.fecha} — {eventoDetalle.horaInicio} a {eventoDetalle.horaFin}
                                </div>
                                {eventoDetalle.espacio && (
                                    <div className="flex items-center gap-2 text-muted-foreground">
                                        <MapPin className="w-4 h-4" />{eventoDetalle.espacio}
                                    </div>
                                )}
                                {eventoDetalle.instructor && (
                                    <div className="flex items-center gap-2 text-muted-foreground">
                                        <User className="w-4 h-4" />{eventoDetalle.instructor}
                                    </div>
                                )}
                                {eventoDetalle.alumnoNombre && (
                                    <div className="flex items-center gap-2 text-muted-foreground">
                                        <User className="w-4 h-4" />{eventoDetalle.alumnoNombre}
                                    </div>
                                )}
                                {eventoDetalle.notas && (
                                    <p className="text-muted-foreground text-xs italic">{eventoDetalle.notas}</p>
                                )}
                            </div>
                            <div className="flex gap-2 pt-2">
                                <button onClick={() => { setModalEvento(eventoDetalle); setEventoDetalle(null); }}
                                    className="btn-secondary flex-1 justify-center text-sm">
                                    <Edit2 className="w-4 h-4" /> Editar
                                </button>
                                <button onClick={() => handleEliminar(eventoDetalle)}
                                    className="btn-danger flex-1 justify-center text-sm">
                                    <Trash2 className="w-4 h-4" /> Eliminar
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal nuevo/editar evento */}
            {modalEvento !== undefined && (
                <ModalEvento
                    evento={modalEvento}
                    fechaDefault={fechaClick || hoy.toISOString().split('T')[0]}
                    onCerrar={() => setModalEvento(undefined)}
                    onGuardar={handleGuardar}
                />
            )}
        </div>
    );
}
