'use client';

/**
 * lib/useAlumnos.ts
 * Hook Firestore para gestion de alumnos de la academia
 */

import { useState, useEffect, useCallback } from 'react';
import {
    collection, onSnapshot, addDoc, updateDoc, deleteDoc,
    doc, query, orderBy, serverTimestamp, Timestamp,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';

export type EstadoAlumno = 'activo' | 'inactivo' | 'vencido' | 'suspendido';
export type TipoPaquete  = 'paquete_clases' | 'alquiler' | 'mensualidad' | 'otro';

export interface PaqueteActivo {
    servicioId:      string;
    nombreServicio:  string;
    tipoPaquete:     TipoPaquete;
    clasesTotal:     number;
    clasesRestantes: number;
    fechaInicio:     string;
    fechaVencimiento: string;
    montoPagado:     number;
    montoUSD:        number;
}

export interface Alumno {
    id:                string;
    nombre:            string;
    cedula?:           string;
    telefono:          string;
    telefonoEmergencia?: string;
    email?:            string;
    fechaNacimiento?:  string;
    fechaIngreso:      string;
    estado:            EstadoAlumno;
    paqueteActivo?:    PaqueteActivo;
    historialPaquetes: PaqueteActivo[];
    totalPagado:       number;
    notas?:            string;
    fechaTimestamp?:   Timestamp;
}

const COLECCION = 'alumnos';

type AlumnoInput = Omit<Alumno, 'id' | 'fechaTimestamp'>;

export function useAlumnos() {
    const [alumnos, setAlumnos]   = useState<Alumno[]>([]);
    const [cargando, setCargando] = useState(true);

    useEffect(() => {
        const q = query(collection(db, COLECCION), orderBy('fechaTimestamp', 'desc'));
        const unsub = onSnapshot(q, (snap) => {
            setAlumnos(snap.docs.map(d => {
                const data = d.data();
                return {
                    id:                  d.id,
                    nombre:              data.nombre              || '',
                    cedula:              data.cedula,
                    telefono:            data.telefono            || '',
                    telefonoEmergencia:  data.telefonoEmergencia,
                    email:               data.email,
                    fechaNacimiento:     data.fechaNacimiento,
                    fechaIngreso:        data.fechaIngreso        || '',
                    estado:              data.estado              || 'activo',
                    paqueteActivo:       data.paqueteActivo       || undefined,
                    historialPaquetes:   data.historialPaquetes   || [],
                    totalPagado:         data.totalPagado         || 0,
                    notas:               data.notas,
                    fechaTimestamp:      data.fechaTimestamp instanceof Timestamp
                                            ? data.fechaTimestamp : undefined,
                } as Alumno;
            }));
            setCargando(false);
        }, () => setCargando(false));
        return () => unsub();
    }, []);

    const crearAlumno = useCallback(async (datos: AlumnoInput) => {
        await addDoc(collection(db, COLECCION), {
            ...datos,
            historialPaquetes: datos.historialPaquetes || [],
            totalPagado:       datos.totalPagado       || 0,
            fechaTimestamp:    serverTimestamp(),
        });
    }, []);

    const actualizarAlumno = useCallback(async (id: string, datos: Partial<AlumnoInput>) => {
        await updateDoc(doc(db, COLECCION, id), { ...datos });
    }, []);

    const eliminarAlumno = useCallback(async (id: string) => {
        await deleteDoc(doc(db, COLECCION, id));
    }, []);

    // Asignar paquete nuevo al alumno
    const asignarPaquete = useCallback(async (alumnoId: string, paquete: PaqueteActivo, alumno: Alumno) => {
        const historial = [...(alumno.historialPaquetes || [])];
        if (alumno.paqueteActivo) historial.unshift(alumno.paqueteActivo);
        await updateDoc(doc(db, COLECCION, alumnoId), {
            paqueteActivo:     paquete,
            historialPaquetes: historial,
            estado:            'activo',
            totalPagado:       (alumno.totalPagado || 0) + (paquete.montoPagado || 0),
        });
    }, []);

    // Descontar una clase del paquete activo
    const descontarClase = useCallback(async (alumnoId: string, alumno: Alumno) => {
        if (!alumno.paqueteActivo) return;
        const restantes = (alumno.paqueteActivo.clasesRestantes || 0) - 1;
        const nuevo: PaqueteActivo = { ...alumno.paqueteActivo, clasesRestantes: Math.max(0, restantes) };
        const nuevoEstado: EstadoAlumno = restantes <= 0 ? 'vencido' : 'activo';
        await updateDoc(doc(db, COLECCION, alumnoId), {
            paqueteActivo: nuevo,
            estado:        nuevoEstado,
        });
    }, []);

    // Estadisticas rapidas
    const activos   = alumnos.filter(a => a.estado === 'activo').length;
    const vencidos  = alumnos.filter(a => a.estado === 'vencido').length;
    const conPoco   = alumnos.filter(a =>
        a.paqueteActivo && a.paqueteActivo.clasesRestantes <= 2 && a.estado === 'activo'
    ).length;

    return {
        alumnos, cargando,
        activos, vencidos, conPoco,
        crearAlumno, actualizarAlumno, eliminarAlumno,
        asignarPaquete, descontarClase,
    };
}
