'use client';

/**
 * lib/useNotificaciones.ts
 * Hook para notificaciones en tiempo real desde Firestore
 * Escucha tambien ventas nuevas y las convierte en notificaciones automaticamente
 */

import { useState, useEffect, useCallback } from 'react';
import {
    collection, onSnapshot, addDoc, updateDoc, doc,
    query, orderBy, limit, serverTimestamp, writeBatch,
    where, Timestamp,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';

export type TipoNotif = 'venta' | 'alerta' | 'sistema' | 'info';

export interface Notificacion {
    id:        string;
    tipo:      TipoNotif;
    titulo:    string;
    mensaje:   string;
    leida:     boolean;
    fecha:     string;
    fechaTimestamp?: Timestamp;
    meta?:     Record<string, any>; // datos extra (monto, servicio, etc.)
}

const COLECCION = 'notificaciones';

export function useNotificaciones() {
    const [notifs, setNotifs] = useState<Notificacion[]>([]);
    const [cargando, setCargando] = useState(true);

    // Escuchar notificaciones en tiempo real
    useEffect(() => {
        const q = query(
            collection(db, COLECCION),
            orderBy('fechaTimestamp', 'desc'),
            limit(50)
        );

        const unsub = onSnapshot(q, (snap) => {
            const data: Notificacion[] = snap.docs.map(d => {
                const raw = d.data();
                const ts: Timestamp | undefined = raw.fechaTimestamp;
                return {
                    id:             d.id,
                    tipo:           raw.tipo       || 'info',
                    titulo:         raw.titulo     || '',
                    mensaje:        raw.mensaje    || '',
                    leida:          raw.leida      || false,
                    fecha:          ts
                        ? ts.toDate().toLocaleString('es-VE', {
                            day: '2-digit', month: '2-digit', year: '2-digit',
                            hour: '2-digit', minute: '2-digit',
                          })
                        : (raw.fecha || ''),
                    fechaTimestamp: ts,
                    meta:           raw.meta       || {},
                };
            });
            setNotifs(data);
            setCargando(false);
        }, () => {
            setCargando(false);
        });

        return () => unsub();
    }, []);

    // Escuchar ventas nuevas y crear notificacion (con dedup por ventaId)
    useEffect(() => {
        // Ignorar ventas anteriores al arranque del hook
        const arranque = Timestamp.fromDate(new Date());
        let inicializado = false;

        const q = query(
            collection(db, 'ventas'),
            orderBy('fechaTimestamp', 'desc'),
            limit(1)
        );

        const unsub = onSnapshot(q, (snap) => {
            // El primer snapshot es el estado inicial - ignorarlo
            if (!inicializado) {
                inicializado = true;
                return;
            }

            snap.docChanges().forEach(async (change) => {
                if (change.type !== 'added') return;
                const venta = change.doc.data();
                const ventaId = change.doc.id;

                // Verificar que no existe ya una notif para esta ventaId
                try {
                    const { getDocs } = await import('firebase/firestore');
                    const existentes = await getDocs(
                        query(collection(db, COLECCION), where('meta.ventaId', '==', ventaId))
                    );
                    if (!existentes.empty) return; // ya existe, no duplicar

                    await addDoc(collection(db, COLECCION), {
                        tipo:           'venta',
                        titulo:         'Nueva venta registrada',
                        mensaje:        `${venta.numeroRecibo || 'Venta'} · Bs ${(venta.total || 0).toLocaleString('es-VE', { minimumFractionDigits: 2 })}`,
                        leida:          false,
                        fecha:          new Date().toLocaleString('es-VE'),
                        fechaTimestamp: serverTimestamp(),
                        meta: {
                            ventaId,
                            numeroRecibo:  venta.numeroRecibo,
                            total:         venta.total,
                            metodoPago:    venta.metodoPago,
                        },
                    });
                } catch {
                    // Silencioso
                }
            });
        });

        return () => unsub();
    }, []);

    const marcarLeida = useCallback(async (id: string) => {
        await updateDoc(doc(db, COLECCION, id), { leida: true });
    }, []);

    const marcarTodasLeidas = useCallback(async () => {
        const batch = writeBatch(db);
        notifs.filter(n => !n.leida).forEach(n => {
            batch.update(doc(db, COLECCION, n.id), { leida: true });
        });
        await batch.commit();
    }, [notifs]);

    const crearNotif = useCallback(async (
        tipo: TipoNotif,
        titulo: string,
        mensaje: string,
        meta?: Record<string, any>
    ) => {
        await addDoc(collection(db, COLECCION), {
            tipo, titulo, mensaje, meta: meta || {},
            leida: false,
            fecha: new Date().toLocaleString('es-VE'),
            fechaTimestamp: serverTimestamp(),
        });
    }, []);

    const noLeidas = notifs.filter(n => !n.leida).length;

    return { notifs, noLeidas, cargando, marcarLeida, marcarTodasLeidas, crearNotif };
}
