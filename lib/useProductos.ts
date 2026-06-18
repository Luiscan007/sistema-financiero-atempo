'use client';
/**
 * lib/useProductos.ts
 * Hook CRUD para catálogo de productos en Firestore
 * Cubre: Cafetín (bebidas, comidas) y Merchandising (ropa, accesorios)
 * Mismo patrón que useServicios.ts
 */

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

export type CategoriaProducto = 'cafetín' | 'merchandising';

export interface Producto {
    id: string;
    nombre: string;
    codigo?: string;             // código interno opcional
    categoria: CategoriaProducto;
    subcategoria: string;        // ej: "Bebidas", "Snacks", "Gorras", "Ropa"
    descripcion: string;
    precioUSD: number;           // precio base en USD
    stock: number;
    stockMinimo: number;
    unidad: string;              // und, kg, litro, etc.
    activo: boolean;
    fechaCreacion: string;
}

const COLECCION = 'productos_catalogo';

export function useProductos() {
    const [productos, setProductos] = useState<Producto[]>([]);
    const [cargando, setCargando]   = useState(true);
    const [error, setError]         = useState<string | null>(null);

    // Escucha en tiempo real desde Firestore
    useEffect(() => {
        const q = query(collection(db, COLECCION));
        const unsub = onSnapshot(
            q,
            (snap) => {
                const datos = snap.docs.map(d => ({
                    id: d.id,
                    ...d.data(),
                })) as Producto[];
                setProductos(datos);
                setCargando(false);
            },
            (err) => {
                console.error('Error cargando productos:', err);
                setError('Error al cargar productos');
                setCargando(false);
            }
        );
        return () => unsub();
    }, []);

    // ─── Crear ────────────────────────────────────────────────────────────────
    const crearProducto = async (datos: Omit<Producto, 'id' | 'fechaCreacion'>) => {
        try {
            await addDoc(collection(db, COLECCION), {
                ...datos,
                activo: datos.activo !== false,
                fechaCreacion: serverTimestamp(),
            });
            toast.success('Producto creado');
        } catch (err) {
            console.error(err);
            toast.error('Error al crear producto');
            throw err;
        }
    };

    // ─── Actualizar ───────────────────────────────────────────────────────────
    const actualizarProducto = async (id: string, datos: Partial<Producto>) => {
        try {
            const { id: _id, ...resto } = datos as Producto;
            await updateDoc(doc(db, COLECCION, id), resto);
            toast.success('Producto actualizado');
        } catch (err) {
            console.error(err);
            toast.error('Error al actualizar producto');
            throw err;
        }
    };

    // ─── Eliminar ─────────────────────────────────────────────────────────────
    const eliminarProducto = async (id: string) => {
        try {
            await deleteDoc(doc(db, COLECCION, id));
            toast.success('Producto eliminado');
        } catch (err) {
            console.error(err);
            toast.error('Error al eliminar producto');
            throw err;
        }
    };

    // ─── Guardar (crear o actualizar) ─────────────────────────────────────────
    const guardarProducto = async (producto: Producto) => {
        const esNuevo = !producto.id || producto.id === '';
        if (esNuevo) {
            const { id: _id, fechaCreacion: _fc, ...datos } = producto;
            await crearProducto(datos);
        } else {
            await actualizarProducto(producto.id, producto);
        }
    };

    return {
        productos,
        cargando,
        error,
        crearProducto,
        actualizarProducto,
        eliminarProducto,
        guardarProducto,
    };
}
