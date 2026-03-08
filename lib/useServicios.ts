/**
 * hooks/useServicios.ts
 * Hook para gestionar servicios en Firestore
 * Usado en: Inventario y Punto de Venta
 * Va en: hooks/useServicios.ts
 */

'use client';

import { useState, useEffect } from 'react';
import {
    collection,
    onSnapshot,
    addDoc,
    updateDoc,
    deleteDoc,
    doc,
    serverTimestamp,
    query,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import toast from 'react-hot-toast';

export type TipoServicio = 'paquete_clases' | 'alquiler';

export interface Servicio {
    id: string;
    nombre: string;
    tipo: TipoServicio;
    categoria: string;
    descripcion: string;
    precioUSD: number;
    duracionHoras?: number;
    clasesIncluidas?: number;
    frecuenciaSemana?: number;
    vigenciaDias?: number;
    activo: boolean;
    fechaCreacion: string;
}

const COLECCION = 'servicios';

export function useServicios() {
    const [servicios, setServicios] = useState<Servicio[]>([]);
    const [cargando, setCargando] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Escucha cambios en tiempo real desde Firestore
    useEffect(() => {
        // Simple collection query - no orderBy to avoid needing a Firestore index
        const q = query(collection(db, COLECCION));

        const unsubscribe = onSnapshot(
            q,
            (snapshot) => {
                const datos = snapshot.docs.map(docSnap => ({
                    id: docSnap.id,
                    ...docSnap.data(),
                })) as Servicio[];
                setServicios(datos);
                setCargando(false);
            },
            (err) => {
                console.error('Error cargando servicios:', err);
                setError('Error al cargar servicios');
                setCargando(false);
            }
        );

        return () => unsubscribe();
    }, []);

    // Crear servicio
    const crearServicio = async (datos: Omit<Servicio, 'id' | 'fechaCreacion'>) => {
        try {
            await addDoc(collection(db, COLECCION), {
                activo: true, // default siempre activo
                ...datos,     // sobreescribe si viene explicitamente
                fechaCreacion: serverTimestamp(),
            });
            toast.success('Servicio creado');
        } catch (err) {
            console.error(err);
            toast.error('Error al crear servicio');
            throw err;
        }
    };

    // Actualizar servicio
    const actualizarServicio = async (id: string, datos: Partial<Servicio>) => {
        try {
            const { id: _id, ...resto } = datos as Servicio;
            await updateDoc(doc(db, COLECCION, id), resto);
            toast.success('Servicio actualizado');
        } catch (err) {
            console.error(err);
            toast.error('Error al actualizar servicio');
            throw err;
        }
    };

    // Eliminar servicio
    const eliminarServicio = async (id: string) => {
        try {
            await deleteDoc(doc(db, COLECCION, id));
            toast.success('Servicio eliminado');
        } catch (err) {
            console.error(err);
            toast.error('Error al eliminar servicio');
            throw err;
        }
    };

    // Guardar (crear o actualizar segun si tiene id)
    const guardarServicio = async (servicio: Servicio) => {
        const esNuevo = !servicio.id || servicio.id === '';
        if (esNuevo) {
            // Nuevo: omitir id y fechaCreacion, Firestore los genera
            const { id: _id, fechaCreacion: _fc, ...datos } = servicio;
            await crearServicio(datos);
        } else {
            // Edicion: actualizar doc existente
            await actualizarServicio(servicio.id, servicio);
        }
    };

    return {
        servicios,
        cargando,
        error,
        crearServicio,
        actualizarServicio,
        eliminarServicio,
        guardarServicio,
    };
}
