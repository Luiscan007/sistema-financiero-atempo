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
    tipo?: 'producto' | 'servicio';
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
                    // ✅ Priorizar la fecha explícita (p. ej. retroactiva) y usar fechaTimestamp como fallback para registros antiguos
                    fecha: data.fecha || (data.fechaTimestamp instanceof Timestamp
                        ? data.fechaTimestamp.toDate().toISOString().split('T')[0]
                        : ''),
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
        
        let fechaTimestampVal: any = serverTimestamp();
        if (datos.fecha) {
            // Convertir YYYY-MM-DD local a Timestamp al mediodía para evitar desfases de zona horaria
            const [year, month, day] = datos.fecha.split('-').map(Number);
            const dateObj = new Date(year, month - 1, day, 12, 0, 0);
            fechaTimestampVal = Timestamp.fromDate(dateObj);
        }

        await addDoc(collection(db, COLECCION), {
            ...datos,
            usuarioId:    user?.uid   || 'anonimo',
            usuarioNombre: user?.displayName || user?.email || 'Usuario',
            fechaTimestamp: fechaTimestampVal,
        });
    };

    // ✅ NUEVO: eliminar venta por ID
    const eliminarVenta = async (id: string) => {
        await deleteDoc(doc(db, COLECCION, id));
    };

    // ✅ NUEVO: editar campos de una venta existente (ej: número de recibo, fecha, etc.)
    const actualizarVenta = async (id: string, datos: Partial<Omit<Venta, 'id'>>) => {
        const updateData: any = { ...datos };
        
        if (datos.fecha) {
            // Si se edita la fecha, actualizar también fechaTimestamp para mantener la ordenación
            const [year, month, day] = datos.fecha.split('-').map(Number);
            const dateObj = new Date(year, month - 1, day, 12, 0, 0);
            updateData.fechaTimestamp = Timestamp.fromDate(dateObj);
        }
        
        await updateDoc(doc(db, COLECCION, id), updateData);
    };

    return { ventas, cargando, guardarVenta, eliminarVenta, actualizarVenta };
}
