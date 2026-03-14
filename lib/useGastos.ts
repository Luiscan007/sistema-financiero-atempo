/**
 * lib/useGastos.ts
 * Hook para leer gastos de Firestore
 */
'use client';

import { useState, useEffect } from 'react';
import { collection, onSnapshot, query, orderBy, limit, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';

export interface Gasto {
  id: string;
  categoria: string;
  descripcion: string;
  montoBs: number;
  montoUSD: number;
  tasaUsada: number;
  metodoPago: string;
  fecha: string;
  recurrente: boolean;
  referencia?: string;
  proveedor?: string;
  fechaTimestamp?: Timestamp;
}

export function useGastos() {
  const [gastos, setGastos] = useState<Gasto[]>([]);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    const q = query(
      collection(db, 'gastos'),
      orderBy('fechaTimestamp', 'desc'),
      limit(200)
    );

    const unsub = onSnapshot(q, (snap) => {
      const datos = snap.docs.map(d => {
        const data = d.data();
        return {
          ...data,
          id: d.id,
          fecha: data.fechaTimestamp instanceof Timestamp
            ? data.fechaTimestamp.toDate().toISOString().split('T')[0]
            : data.fecha || '',
          fechaTimestamp: data.fechaTimestamp instanceof Timestamp ? data.fechaTimestamp : undefined,
        } as Gasto;
      });
      setGastos(datos);
      setCargando(false);
    }, () => setCargando(false));

    return () => unsub();
  }, []);

  return { gastos, cargando };
}
