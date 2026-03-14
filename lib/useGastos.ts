'use client';

/**
 * lib/useGastos.ts
 * Hook Firestore para gestion de gastos de la academia
 */

import { useState, useEffect, useCallback } from 'react';
import {
    collection, onSnapshot, addDoc, updateDoc, deleteDoc,
    doc, query, orderBy, limit, serverTimestamp, Timestamp,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';

export type CategoriaGasto =
    | 'alquiler' | 'servicios' | 'materiales' | 'sueldos'
    | 'mantenimiento' | 'publicidad' | 'equipos' | 'otro';

export type MetodoPagoGasto = 'efectivo_bs' | 'efectivo_usd' | 'transferencia' | 'pago_movil' | 'punto_venta';

export interface Gasto {
    id:          string;
    descripcion: string;
    categoria:   CategoriaGasto;
    montoBs:     number;
    montoUSD:    number;
    tasaUsada:   number;
    metodoPago:  MetodoPagoGasto;
    proveedor?:  string;
    referencia?: string;
    fecha:       string;
    notas?:      string;
    fechaTimestamp?: Timestamp;
}

const COLECCION = 'gastos';

type GastoInput = Omit<Gasto, 'id' | 'fechaTimestamp'>;

export const LABEL_CATEGORIA: Record<CategoriaGasto, string> = {
    alquiler:      'Alquiler',
    servicios:     'Servicios (agua/luz/internet)',
    materiales:    'Materiales',
    sueldos:       'Sueldos / Honorarios',
    mantenimiento: 'Mantenimiento',
    publicidad:    'Publicidad / Marketing',
    equipos:       'Equipos',
    otro:          'Otro',
};

export const COLOR_CATEGORIA: Record<CategoriaGasto, string> = {
    alquiler:      '#3b82f6',
    servicios:     '#06b6d4',
    materiales:    '#8b5cf6',
    sueldos:       '#f59e0b',
    mantenimiento: '#ef4444',
    publicidad:    '#ec4899',
    equipos:       '#22c55e',
    otro:          '#64748b',
};

export function useGastos() {
    const [gastos, setGastos]     = useState<Gasto[]>([]);
    const [cargando, setCargando] = useState(true);

    useEffect(() => {
        const q = query(collection(db, COLECCION), orderBy('fechaTimestamp', 'desc'), limit(200));
        const unsub = onSnapshot(q, (snap) => {
            setGastos(snap.docs.map(d => {
                const data = d.data();
                return {
                    id:          d.id,
                    descripcion: data.descripcion || '',
                    categoria:   data.categoria   || 'otro',
                    montoBs:     data.montoBs     || 0,
                    montoUSD:    data.montoUSD     || 0,
                    tasaUsada:   data.tasaUsada    || 0,
                    metodoPago:  data.metodoPago   || 'efectivo_bs',
                    proveedor:   data.proveedor,
                    referencia:  data.referencia,
                    fecha:       data.fechaTimestamp instanceof Timestamp
                                    ? data.fechaTimestamp.toDate().toLocaleDateString('es-VE')
                                    : (data.fecha || ''),
                    notas:       data.notas,
                    fechaTimestamp: data.fechaTimestamp instanceof Timestamp
                                    ? data.fechaTimestamp : undefined,
                } as Gasto;
            }));
            setCargando(false);
        }, () => setCargando(false));
        return () => unsub();
    }, []);

    const crearGasto = useCallback(async (datos: GastoInput) => {
        await addDoc(collection(db, COLECCION), {
            ...datos,
            fechaTimestamp: serverTimestamp(),
        });
    }, []);

    const actualizarGasto = useCallback(async (id: string, datos: Partial<GastoInput>) => {
        await updateDoc(doc(db, COLECCION, id), { ...datos });
    }, []);

    const eliminarGasto = useCallback(async (id: string) => {
        await deleteDoc(doc(db, COLECCION, id));
    }, []);

    return { gastos, cargando, crearGasto, actualizarGasto, eliminarGasto };
}
