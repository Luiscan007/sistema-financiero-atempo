'use client';

/**
 * lib/useAsistencia.ts
 * Hook Firestore para control de asistencia diaria
 */

import { useState, useEffect, useCallback } from 'react';
import {
    collection, onSnapshot, addDoc, updateDoc,
    doc, query, orderBy, where, limit,
    serverTimestamp, Timestamp, getDocs,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';

export interface RegistroAsistencia {
    id:          string;
    alumnoId:    string;
    alumnoNombre: string;
    fecha:       string;       // YYYY-MM-DD
    horaEntrada: string;       // HH:MM
    presente:    boolean;
    claseDescontada: boolean;
    observacion?: string;
    fechaTimestamp?: Timestamp;
}

const COLECCION = 'asistencia';

export function useAsistencia(fechaFiltro?: string) {
    const [registros, setRegistros] = useState<RegistroAsistencia[]>([]);
    const [cargando, setCargando]   = useState(true);

    useEffect(() => {
        const hoy = fechaFiltro || new Date().toISOString().split('T')[0];
        const q = query(
            collection(db, COLECCION),
            where('fecha', '==', hoy),
            orderBy('fechaTimestamp', 'desc')
        );
        const unsub = onSnapshot(q, (snap) => {
            setRegistros(snap.docs.map(d => {
                const data = d.data();
                return {
                    id:              d.id,
                    alumnoId:        data.alumnoId        || '',
                    alumnoNombre:    data.alumnoNombre    || '',
                    fecha:           data.fecha           || hoy,
                    horaEntrada:     data.horaEntrada     || '',
                    presente:        data.presente        ?? true,
                    claseDescontada: data.claseDescontada ?? false,
                    observacion:     data.observacion,
                    fechaTimestamp:  data.fechaTimestamp instanceof Timestamp
                                        ? data.fechaTimestamp : undefined,
                } as RegistroAsistencia;
            }));
            setCargando(false);
        }, () => setCargando(false));
        return () => unsub();
    }, [fechaFiltro]);

    // Marcar asistencia de un alumno (y descontar clase si aplica)
    const marcarAsistencia = useCallback(async (
        alumnoId: string,
        alumnoNombre: string,
        fecha: string,
        descontarClase: boolean = true,
        observacion?: string,
    ) => {
        // Verificar si ya tiene asistencia hoy
        const existeQ = query(
            collection(db, COLECCION),
            where('alumnoId', '==', alumnoId),
            where('fecha', '==', fecha),
            limit(1)
        );
        const existe = await getDocs(existeQ);
        if (!existe.empty) return { yaExiste: true };

        const ahora = new Date();
        const hora  = ahora.toLocaleTimeString('es-VE', { hour: '2-digit', minute: '2-digit', hour12: false });

        await addDoc(collection(db, COLECCION), {
            alumnoId, alumnoNombre, fecha,
            horaEntrada:     hora,
            presente:        true,
            claseDescontada: descontarClase,
            observacion:     observacion || '',
            fechaTimestamp:  serverTimestamp(),
        });
        return { yaExiste: false };
    }, []);

    const actualizarAsistencia = useCallback(async (id: string, datos: Partial<RegistroAsistencia>) => {
        await updateDoc(doc(db, COLECCION, id), { ...datos });
    }, []);

    // Obtener historial de asistencia de un alumno (ultimos 30 dias)
    const obtenerHistorialAlumno = useCallback(async (alumnoId: string): Promise<RegistroAsistencia[]> => {
        const hace30 = new Date();
        hace30.setDate(hace30.getDate() - 30);
        const fechaMin = hace30.toISOString().split('T')[0];
        const q = query(
            collection(db, COLECCION),
            where('alumnoId', '==', alumnoId),
            where('fecha', '>=', fechaMin),
            orderBy('fecha', 'desc'),
            limit(50)
        );
        const snap = await getDocs(q);
        return snap.docs.map(d => ({ id: d.id, ...d.data() } as RegistroAsistencia));
    }, []);

    const presentesHoy = registros.filter(r => r.presente).length;

    return {
        registros, cargando, presentesHoy,
        marcarAsistencia, actualizarAsistencia, obtenerHistorialAlumno,
    };
}
