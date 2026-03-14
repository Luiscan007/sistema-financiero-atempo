'use client';
/**
 * lib/useProductos.ts
 * Hook para leer productos/inventario de Firestore
 */
import { useState, useEffect } from 'react';
import { collection, onSnapshot, query, orderBy, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';

export interface Producto {
  id: string;
  nombre: string;
  codigo?: string;
  categoria?: string;
  descripcion?: string;
  precioBs: number;
  stock: number;
  stockMinimo: number;
  unidad?: string;
  activo: boolean;
}

export function useProductos() {
  const [productos, setProductos] = useState<Producto[]>([]);
  const [cargando, setCargando]   = useState(true);

  useEffect(() => {
    const q = query(collection(db, 'productos'), orderBy('nombre'));
    const unsub = onSnapshot(q, (snap) => {
      setProductos(snap.docs.map(d => ({
        id:          d.id,
        nombre:      d.data().nombre      || '',
        codigo:      d.data().codigo,
        categoria:   d.data().categoria,
        descripcion: d.data().descripcion,
        precioBs:    d.data().precioBs    || 0,
        stock:       d.data().stock       ?? 0,
        stockMinimo: d.data().stockMinimo ?? 0,
        unidad:      d.data().unidad      || 'und',
        activo:      d.data().activo      ?? true,
      })));
      setCargando(false);
    }, () => setCargando(false));
    return () => unsub();
  }, []);

  return { productos, cargando };
}
