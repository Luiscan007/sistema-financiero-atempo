'use client';

/**
 * lib/useAgenda.ts
 * Hook Firestore para agenda / eventos del estudio
 */

import { useState, useEffect, useCallback } from 'react';
import {
    collection, onSnapshot, addDoc, updateDoc, deleteDoc,
    doc, query, orderBy, where, serverTimestamp, Timestamp,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';

export type TipoEvento = 'clase' | 'alquiler' | 'evento' | 'mantenimiento' | 'otro';
export type EstadoEvento = 'confirmado' | 'tentativo' | 'cancelado';

export interface Evento {
    id:           string;
    titulo:       string;
    tipo:         TipoEvento;
    estado:       EstadoEvento;
    fecha:        string;       // YYYY-MM-DD
    horaInicio:   string;       // HH:MM
    horaFin:      string;       // HH:MM
    espacio?:     string;       // sala, estudio A, etc.
    instructor?:  string;
    alumnoId?:    string;
    alumnoNombre?: string;
    descripcion?: string;
    montoBs?:     number;
    montoUSD?:    number;
    notas?:       string;
    fechaTimestamp?: Timestamp;
}

const COLECCION = 'agenda';

type EventoInput = Omit<Evento, 'id' | 'fechaTimestamp'>;

export const TIPO_EVENTO_CONFIG: Record<TipoEvento, { label: string; color: string; bg: string }> = {
    clase:         { label: 'Clase',         color: '#3b82f6', bg: 'bg-blue-500/15 border-blue-500/25' },
    alquiler:      { label: 'Alquiler',      color: '#8b5cf6', bg: 'bg-purple-500/15 border-purple-500/25' },
    evento:        { label: 'Evento',        color: '#f59e0b', bg: 'bg-amber-500/15 border-amber-500/25' },
    mantenimiento: { label: 'Mantenimiento', color: '#ef4444', bg: 'bg-red-500/15 border-red-500/25' },
    otro:          { label: 'Otro',          color: '#64748b', bg: 'bg-slate-500/15 border-slate-500/25' },
};

export function useAgenda(fechaInicio?: string, fechaFin?: string) {
    const [eventos,  setEventos]  = useState<Evento[]>([]);
    const [cargando, setCargando] = useState(true);

    useEffect(() => {
        let q;
        if (fechaInicio && fechaFin) {
            q = query(
                collection(db, COLECCION),
                where('fecha', '>=', fechaInicio),
                where('fecha', '<=', fechaFin),
                orderBy('fecha'),
                orderBy('horaInicio'),
            );
        } else {
            q = query(collection(db, COLECCION), orderBy('fecha'), orderBy('horaInicio'));
        }
        const unsub = onSnapshot(q, (snap) => {
            setEventos(snap.docs.map(d => {
                const data = d.data();
                return {
                    id:           d.id,
                    titulo:       data.titulo       || '',
                    tipo:         data.tipo         || 'otro',
                    estado:       data.estado       || 'confirmado',
                    fecha:        data.fecha        || '',
                    horaInicio:   data.horaInicio   || '',
                    horaFin:      data.horaFin      || '',
                    espacio:      data.espacio,
                    instructor:   data.instructor,
                    alumnoId:     data.alumnoId,
                    alumnoNombre: data.alumnoNombre,
                    descripcion:  data.descripcion,
                    montoBs:      data.montoBs,
                    montoUSD:     data.montoUSD,
                    notas:        data.notas,
                    fechaTimestamp: data.fechaTimestamp instanceof Timestamp
                                        ? data.fechaTimestamp : undefined,
                } as Evento;
            }));
            setCargando(false);
        }, () => setCargando(false));
        return () => unsub();
    }, [fechaInicio, fechaFin]);

    const crearEvento = useCallback(async (datos: EventoInput) => {
        await addDoc(collection(db, COLECCION), {
            ...datos,
            fechaTimestamp: serverTimestamp(),
        });
    }, []);

    const actualizarEvento = useCallback(async (id: string, datos: Partial<EventoInput>) => {
        await updateDoc(doc(db, COLECCION, id), { ...datos });
    }, []);

    const eliminarEvento = useCallback(async (id: string) => {
        await deleteDoc(doc(db, COLECCION, id));
    }, []);

    return { eventos, cargando, crearEvento, actualizarEvento, eliminarEvento };
}
