/**
 * lib/useVentas.ts
 * Hook para guardar, leer y eliminar ventas en Firestore
 */
'use client';

import { useState, useEffect } from 'react';
import {
    collection, addDoc, deleteDoc, doc, updateDoc,
    onSnapshot, query, orderBy, limit,
    serverTimestamp, Timestamp,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { getAuth } from 'firebase/auth';

export interface ItemVenta {
    id: string;
    nombre: string;
    cantidad: number;
    precio: number;
    subtotal: number;
    descuento: number;
}

export interface MetodoPagoVenta {
    tipo: string;
    monto: number;
    banco?: string;
    telefono?: string;
    referencia?: string;
    nombrePagador?: string;
    numeroReferencia?: string;
    comprobanteUrl?: string;
    bancoOrigen?: string;
    bancoDestino?: string;
    bancoPOS?: string;
    tipoTarjeta?: string;
    ultimosCuatro?: string;
    aprobacion?: string;
    cedula?: string;
    montoExtranjero?: number;
}

export interface Venta {
    id: string;
    numeroRecibo: string;
    fecha: string;
    items: ItemVenta[];
    subtotal: number;
    descuentoGlobal: number;
    montoDescuento: number;
    total: number;
    totalUSD: number;
    tasaUsada: number;
    tipoTasa: string;
    metodoPago: MetodoPagoVenta[];
    usuarioId: string;
    usuarioNombre: string;
    fechaTimestamp?: Timestamp;
    ajusteRedondeo?: number;
}

const COLECCION = 'ventas';

export function useVentas() {
    const [ventas, setVentas]     = useState<Venta[]>([]);
    const [cargando, setCargando] = useState(true);

    useEffect(() => {
        const q = query(
            collection(db, COLECCION),
            orderBy('fechaTimestamp', 'desc'),
            limit(100)
        );
        const unsub = onSnapshot(q, (snap) => {
            setVentas(snap.docs.map(d => {
                const data = d.data();
                return {
                    ...data,
                    id: d.id,
                    // ✅ fecha como YYYY-MM-DD para filtros consistentes
                    fecha: data.fechaTimestamp instanceof Timestamp
                        ? data.fechaTimestamp.toDate().toISOString().split('T')[0]
                        : data.fecha || '',
                    fechaTimestamp: data.fechaTimestamp instanceof Timestamp
                        ? data.fechaTimestamp : undefined,
                } as Venta;
            }));
            setCargando(false);
        }, () => setCargando(false));
        return () => unsub();
    }, []);

    const guardarVenta = async (datos: Omit<Venta, 'id'>) => {
        const auth = getAuth();
        const user = auth.currentUser;
        await addDoc(collection(db, COLECCION), {
            ...datos,
            usuarioId:    user?.uid   || 'anonimo',
            usuarioNombre: user?.displayName || user?.email || 'Usuario',
            fechaTimestamp: serverTimestamp(),
        });
    };

    // ✅ NUEVO: eliminar venta por ID
    const eliminarVenta = async (id: string) => {
        await deleteDoc(doc(db, COLECCION, id));
    };

    // ✅ NUEVO: editar campos de una venta existente (ej: número de recibo, items, etc.)
    const actualizarVenta = async (id: string, datos: Partial<Omit<Venta, 'id' | 'fechaTimestamp'>>) => {
        await updateDoc(doc(db, COLECCION, id), { ...datos });
    };

    return { ventas, cargando, guardarVenta, eliminarVenta, actualizarVenta };
}
