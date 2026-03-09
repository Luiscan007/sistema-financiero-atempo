'use client';

/**
 * app/asistencia/page.tsx
 * Control de asistencia diaria de alumnos
 */

import { useState, useMemo } from 'react';
import {
    Search, CheckCircle2, XCircle, Clock, Users,
    CalendarDays, Loader2, AlertTriangle, ChevronDown,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { cn } from '@/lib/utils';
import { useAlumnos } from '@/lib/useAlumnos';
import { useAsistencia } from '@/lib/useAsistencia';

export default function AsistenciaPage() {
    const hoyISO = new Date().toISOString().split('T')[0];
    const [fechaSeleccionada, setFechaSeleccionada] = useState(hoyISO);
    const [busqueda, setBusqueda] = useState('');

    const { alumnos, cargando: cargandoAlumnos, descontarClase } = useAlumnos();
    const { registros, cargando: cargandoAsist, presentesHoy, marcarAsistencia } = useAsistencia(fechaSeleccionada);

    const cargando = cargandoAlumnos || cargandoAsist;

    const alumnosActivos = useMemo(() =>
        alumnos.filter(a => a.estado === 'activo' || a.estado === 'vencido'),
    [alumnos]);

    const alumnosFiltrados = useMemo(() =>
        alumnosActivos.filter(a =>
            !busqueda || a.nombre.toLowerCase().includes(busqueda.toLowerCase())
        ),
    [alumnosActivos, busqueda]);

    // Map de alumnosId -> registro de hoy
    const registrosPorAlumno = useMemo(() => {
        const map: Record<string, typeof registros[0]> = {};
        registros.forEach(r => { map[r.alumnoId] = r; });
        return map;
    }, [registros]);

    const esHoy = fechaSeleccionada === hoyISO;

    const handleMarcarAsistencia = async (alumnoId: string, alumnoNombre: string) => {
        const alumno = alumnos.find(a => a.id === alumnoId);
        const tieneClases = alumno?.paqueteActivo && alumno.paqueteActivo.clasesRestantes > 0;

        const resultado = await marcarAsistencia(alumnoId, alumnoNombre, fechaSeleccionada, !!tieneClases);

        if (resultado?.yaExiste) {
            toast('Este alumno ya fue marcado hoy', { icon: '' });
            return;
        }

        // Descontar clase si tiene paquete activo
        if (alumno && tieneClases) {
            await descontarClase(alumnoId, alumno);
            const restantes = (alumno.paqueteActivo?.clasesRestantes || 1) - 1;
            if (restantes <= 2 && restantes > 0) {
                toast(`Asistencia registrada - quedan ${restantes} clases`, { icon: '' });
            } else if (restantes <= 0) {
                toast.success('Asistencia registrada - paquete agotado');
            } else {
                toast.success(`Asistencia registrada - ${restantes} clases restantes`);
            }
        } else {
            toast.success('Asistencia registrada');
        }
    };

    const ausentes   = alumnosActivos.length - presentesHoy;
    const porcentaje = alumnosActivos.length > 0
        ? Math.round((presentesHoy / alumnosActivos.length) * 100) : 0;

    if (cargando) return (
        <div className="flex items-center justify-center py-32">
            <Loader2 className="w-8 h-8 animate-spin text-blue-400" />
            <span className="ml-3 text-muted-foreground">Cargando...</span>
        </div>
    );

    return (
        <div className="space-y-6 animate-fade-in">

            {/* Header */}
            <div className="flex items-center justify-between flex-wrap gap-4">
                <div>
                    <h1 className="text-2xl font-bold">Control de Asistencia</h1>
                    <p className="text-muted-foreground text-sm">
                        {new Date(fechaSeleccionada + 'T12:00:00').toLocaleDateString('es-VE', {
                            weekday: 'long', day: 'numeric', month: 'long',
                        })}
                    </p>
                </div>
                <div className="flex items-center gap-3">
                    <input type="date" className="input-sistema w-auto"
                        value={fechaSeleccionada}
                        max={hoyISO}
                        onChange={e => setFechaSeleccionada(e.target.value)} />
                </div>
            </div>

            {/* KPIs del dia */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="kpi-card">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 mb-2" />
                    <p className="text-3xl font-bold font-mono text-emerald-400">{presentesHoy}</p>
                    <p className="text-xs text-muted-foreground">Presentes</p>
                </div>
                <div className="kpi-card">
                    <XCircle className="w-4 h-4 text-slate-400 mb-2" />
                    <p className="text-3xl font-bold font-mono text-slate-400">{ausentes}</p>
                    <p className="text-xs text-muted-foreground">Ausentes</p>
                </div>
                <div className="kpi-card">
                    <Users className="w-4 h-4 text-blue-400 mb-2" />
                    <p className="text-3xl font-bold font-mono">{alumnosActivos.length}</p>
                    <p className="text-xs text-muted-foreground">Alumnos activos</p>
                </div>
                <div className="kpi-card">
                    <CalendarDays className="w-4 h-4 text-purple-400 mb-2" />
                    <p className="text-3xl font-bold font-mono text-purple-400">{porcentaje}%</p>
                    <p className="text-xs text-muted-foreground">Asistencia del dia</p>
                </div>
            </div>

            {/* Barra de progreso */}
            {alumnosActivos.length > 0 && (
                <div className="card-sistema py-3 px-5">
                    <div className="flex items-center justify-between text-xs text-muted-foreground mb-2">
                        <span>Progreso de asistencia</span>
                        <span className="font-mono font-medium text-foreground">{presentesHoy} / {alumnosActivos.length}</span>
                    </div>
                    <div className="h-2 bg-muted rounded-full overflow-hidden">
                        <div className="h-full bg-gradient-to-r from-blue-500 to-emerald-500 rounded-full transition-all duration-500"
                            style={{ width: `${porcentaje}%` }} />
                    </div>
                </div>
            )}

            {/* Busqueda */}
            <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input className="input-sistema pl-10" placeholder="Buscar alumno..."
                    value={busqueda} onChange={e => setBusqueda(e.target.value)} />
            </div>

            {/* Lista de alumnos */}
            {alumnosFiltrados.length === 0 ? (
                <div className="card-sistema p-12 text-center">
                    <Users className="w-10 h-10 text-muted-foreground/20 mx-auto mb-3" />
                    <p className="text-muted-foreground">No hay alumnos activos</p>
                </div>
            ) : (
                <div className="card-sistema overflow-hidden p-0">
                    <div className="divide-y divide-border/60">
                        {alumnosFiltrados.map(alumno => {
                            const registro   = registrosPorAlumno[alumno.id];
                            const presente   = !!registro;
                            const pkg        = alumno.paqueteActivo;
                            const pocasClases = pkg && pkg.clasesRestantes <= 2 && pkg.clasesRestantes > 0;
                            const sinClases   = !pkg || pkg.clasesRestantes <= 0;

                            return (
                                <div key={alumno.id} className={cn(
                                    'flex items-center gap-4 px-4 py-3.5 transition-all',
                                    presente ? 'bg-emerald-500/5' : 'hover:bg-muted/30'
                                )}>
                                    {/* Avatar */}
                                    <div className={cn(
                                        'w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 font-bold text-sm',
                                        presente
                                            ? 'bg-emerald-500/20 border border-emerald-500/30 text-emerald-400'
                                            : 'bg-muted border border-border text-muted-foreground'
                                    )}>
                                        {alumno.nombre.charAt(0).toUpperCase()}
                                    </div>

                                    {/* Info */}
                                    <div className="flex-1 min-w-0">
                                        <p className="font-medium text-sm truncate">{alumno.nombre}</p>
                                        <div className="flex items-center gap-3 mt-0.5">
                                            {pkg ? (
                                                <span className={cn('text-xs font-mono',
                                                    sinClases   ? 'text-red-400' :
                                                    pocasClases ? 'text-amber-400' :
                                                                  'text-emerald-400')}>
                                                    {pkg.clasesRestantes} clases restantes
                                                </span>
                                            ) : (
                                                <span className="text-xs text-muted-foreground">Sin paquete</span>
                                            )}
                                            {pocasClases && !sinClases && (
                                                <AlertTriangle className="w-3 h-3 text-amber-400" />
                                            )}
                                        </div>
                                    </div>

                                    {/* Hora de entrada si presente */}
                                    {presente && (
                                        <div className="text-right flex-shrink-0">
                                            <div className="flex items-center gap-1.5 text-xs text-emerald-400 font-medium">
                                                <Clock className="w-3 h-3" />
                                                {registro.horaEntrada}
                                            </div>
                                            <p className="text-xs text-muted-foreground mt-0.5">
                                                {registro.claseDescontada ? 'clase descontada' : 'sin descuento'}
                                            </p>
                                        </div>
                                    )}

                                    {/* Boton marcar */}
                                    {esHoy && (
                                        <button
                                            onClick={() => !presente && handleMarcarAsistencia(alumno.id, alumno.nombre)}
                                            disabled={presente}
                                            className={cn(
                                                'flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-medium transition-all flex-shrink-0',
                                                presente
                                                    ? 'bg-emerald-500/15 border border-emerald-500/20 text-emerald-400 cursor-default'
                                                    : 'btn-primary text-xs py-1.5'
                                            )}
                                        >
                                            {presente ? (
                                                <><CheckCircle2 className="w-3.5 h-3.5" /> Presente</>
                                            ) : (
                                                <><CheckCircle2 className="w-3.5 h-3.5" /> Marcar</>
                                            )}
                                        </button>
                                    )}

                                    {/* Solo lectura en fechas pasadas */}
                                    {!esHoy && (
                                        <span className={cn(
                                            'text-xs px-2 py-1 rounded-full border flex-shrink-0',
                                            presente
                                                ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
                                                : 'bg-muted border-border text-muted-foreground'
                                        )}>
                                            {presente ? 'Presente' : 'Ausente'}
                                        </span>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}
        </div>
    );
}
