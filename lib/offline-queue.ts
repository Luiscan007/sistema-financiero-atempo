/**
 * lib/offline-queue.ts
 * Cola de ventas offline usando IndexedDB (via librería idb)
 * Permite registrar ventas sin internet y sincronizarlas después
 */

import { openDB, IDBPDatabase } from 'idb';

const DB_NAME = 'atempo-offline';
const DB_VERSION = 1;
const STORE_VENTAS = 'ventas_pendientes';
const STORE_TASAS = 'tasas_cache';

let db: IDBPDatabase | null = null;

// Inicializar la base de datos IndexedDB
async function getDB(): Promise<IDBPDatabase> {
    if (db) return db;

    db = await openDB(DB_NAME, DB_VERSION, {
        upgrade(database) {
            // Store de ventas pendientes (sin sincronizar)
            if (!database.objectStoreNames.contains(STORE_VENTAS)) {
                const store = database.createObjectStore(STORE_VENTAS, {
                    keyPath: 'id',
                    autoIncrement: true,
                });
                store.createIndex('timestamp', 'timestamp');
                store.createIndex('sincronizada', 'sincronizada');
            }

            // Store de cache de tasas para uso offline
            if (!database.objectStoreNames.contains(STORE_TASAS)) {
                database.createObjectStore(STORE_TASAS, { keyPath: 'key' });
            }
        },
    });

    return db;
}

// ============================
// VENTAS OFFLINE
// ============================

export interface VentaOffline {
    id?: number;
    numeroRecibo: string;
    timestamp: number;
    items: any[];
    totalBs: number;
    totalUSD: number;
    tasaUsada: number;
    metodoPago: any[];
    clienteId?: string;
    clienteNombre?: string;
    notas?: string;
    sincronizada: boolean;
    errorSincronizacion?: string;
}

/**
 * Guardar una venta en IndexedDB (para cuando no hay internet)
 */
export async function guardarVentaOffline(venta: Omit<VentaOffline, 'id' | 'sincronizada'>): Promise<number> {
    const database = await getDB();
    const id = await database.add(STORE_VENTAS, {
        ...venta,
        sincronizada: false,
        timestamp: Date.now(),
    });
    console.log('Venta guardada offline con ID:', id);
    return id as number;
}

/**
 * Obtener todas las ventas pendientes de sincronizar
 */
export async function obtenerVentasPendientes(): Promise<VentaOffline[]> {
    const database = await getDB();
    const todasLasVentas = await database.getAll(STORE_VENTAS);
    return todasLasVentas.filter((v: VentaOffline) => !v.sincronizada);
}

/**
 * Marcar una venta como sincronizada
 */
export async function marcarVentaSincronizada(id: number): Promise<void> {
    const database = await getDB();
    const tx = database.transaction(STORE_VENTAS, 'readwrite');
    const venta = await tx.store.get(id);
    if (venta) {
        venta.sincronizada = true;
        await tx.store.put(venta);
    }
    await tx.done;
}

/**
 * Sincronizar ventas pendientes con Firestore
 * Se llama cuando se recupera la conexión a internet
 */
export async function sincronizarVentas(): Promise<{ exito: number; fallo: number }> {
    const pendientes = await obtenerVentasPendientes();
    let exito = 0;
    let fallo = 0;

    for (const venta of pendientes) {
        try {
            // Importar Firestore dinámicamente para no romper el service worker
            const { db, COLECCIONES } = await import('./firebase');
            const { addDoc, collection, serverTimestamp } = await import('firebase/firestore');

            await addDoc(collection(db, COLECCIONES.VENTAS), {
                ...venta,
                timestamp: serverTimestamp(),
                origenOffline: true,
            });

            await marcarVentaSincronizada(venta.id!);
            exito++;
        } catch (error) {
            console.error('Error sincronizando venta offline:', error);
            fallo++;
        }
    }

    return { exito, fallo };
}

// ============================
// CACHE DE TASAS OFFLINE
// ============================

/**
 * Guardar tasas en IndexedDB para uso sin internet
 */
export async function cachearTasas(tasas: any): Promise<void> {
    const database = await getDB();
    await database.put(STORE_TASAS, {
        key: 'tasas_actual',
        ...tasas,
        cachedAt: Date.now(),
    });
}

/**
 * Obtener tasas cacheadas (para modo offline)
 */
export async function obtenerTasasCacheadas(): Promise<any | null> {
    try {
        const database = await getDB();
        const tasas = await database.get(STORE_TASAS, 'tasas_actual');
        if (!tasas) return null;

        // Verificar que el cache no sea muy viejo (máx 24 horas para modo offline)
        const CACHE_MAX = 24 * 60 * 60 * 1000;
        if (Date.now() - tasas.cachedAt > CACHE_MAX) {
            return null;
        }

        return tasas;
    } catch {
        return null;
    }
}

/**
 * Contar ventas pendientes de sincronizar
 */
export async function contarVentasPendientes(): Promise<number> {
    try {
        const pendientes = await obtenerVentasPendientes();
        return pendientes.length;
    } catch {
        return 0;
    }
}
