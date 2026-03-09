'use client';

/**
 * lib/useCuentasCobrar.ts
 * Hook Firestore para cuentas por cobrar (alumnos con saldo pendiente)
 */

import { useState, useEffect, useCallback } from 'react';
import {
    collection, onSnapshot, addDoc, updateDoc, deleteDoc,
    doc, query, orderBy, serverTimestamp, Timestamp,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';

export type EstadoCuenta = 'pendiente' | 'parcial' | 'pagado' | 'vencida';

export interface PagoCuenta {
    fecha:      string;
    montoBs:    number;
    montoUSD:   number;
    metodoPago: string;
    referencia?: string;
    nota?:       string;
}

export interface CuentaCobrar {
    id:               string;
    alumnoId?:        string;
    alumnoNombre:     string;
    concepto:         string;
    montoBs:          number;
    montoUSD:         number;
    montoPagado:      number;
    montoPagadoUSD:   number;
    fechaEmision:     string;
    fechaVencimiento: string;
    estado:           EstadoCuenta;
    historialPagos:   PagoCuenta[];
    notas?:           string;
    fechaTimestamp?:  Timestamp;
}

const COLECCION = 'cuentas_cobrar';

type CuentaInput = Omit<CuentaCobrar, 'id' | 'fechaTimestamp'>;

export function useCuentasCobrar() {
    const [cuentas,  setCuentas]  = useState<CuentaCobrar[]>([]);
    const [cargando, setCargando] = useState(true);

    useEffect(() => {
        const q = query(collection(db, COLECCION), orderBy('fechaTimestamp', 'desc'));
        const unsub = onSnapshot(q, (snap) => {
            const hoy = new Date();
            setCuentas(snap.docs.map(d => {
                const data = d.data();
                const vence = new Date(data.fechaVencimiento || '');
                const montoPagado = data.montoPagado || 0;
                const montoBs     = data.montoBs     || 0;
                let estado: EstadoCuenta = data.estado || 'pendiente';
                // Auto-calcular estado
                if (montoPagado >= montoBs) estado = 'pagado';
                else if (montoPagado > 0)   estado = 'parcial';
                else if (vence < hoy)       estado = 'vencida';
                return {
                    id:               d.id,
                    alumnoId:         data.alumnoId,
                    alumnoNombre:     data.alumnoNombre     || '',
                    concepto:         data.concepto         || '',
                    montoBs:          montoBs,
                    montoUSD:         data.montoUSD         || 0,
                    montoPagado:      montoPagado,
                    montoPagadoUSD:   data.montoPagadoUSD   || 0,
                    fechaEmision:     data.fechaEmision      || '',
                    fechaVencimiento: data.fechaVencimiento  || '',
                    estado,
                    historialPagos:   data.historialPagos    || [],
                    notas:            data.notas,
                    fechaTimestamp:   data.fechaTimestamp instanceof Timestamp
                                        ? data.fechaTimestamp : undefined,
                } as CuentaCobrar;
            }));
            setCargando(false);
        }, () => setCargando(false));
        return () => unsub();
    }, []);

    const crearCuenta = useCallback(async (datos: CuentaInput) => {
        await addDoc(collection(db, COLECCION), {
            ...datos,
            historialPagos:  datos.historialPagos || [],
            montoPagado:     0,
            montoPagadoUSD:  0,
            estado:          'pendiente',
            fechaTimestamp:  serverTimestamp(),
        });
    }, []);

    const registrarPago = useCallback(async (id: string, pago: PagoCuenta, cuenta: CuentaCobrar) => {
        const nuevoPagado    = (cuenta.montoPagado    || 0) + (pago.montoBs  || 0);
        const nuevoPagadoUSD = (cuenta.montoPagadoUSD || 0) + (pago.montoUSD || 0);
        const historial      = [pago, ...(cuenta.historialPagos || [])];
        let estado: EstadoCuenta = 'parcial';
        if (nuevoPagado >= cuenta.montoBs) estado = 'pagado';
        await updateDoc(doc(db, COLECCION, id), {
            montoPagado:    nuevoPagado,
            montoPagadoUSD: nuevoPagadoUSD,
            historialPagos: historial,
            estado,
        });
    }, []);

    const actualizarCuenta = useCallback(async (id: string, datos: Partial<CuentaInput>) => {
        await updateDoc(doc(db, COLECCION, id), { ...datos });
    }, []);

    const eliminarCuenta = useCallback(async (id: string) => {
        await deleteDoc(doc(db, COLECCION, id));
    }, []);

    const pendientes = cuentas.filter(c => c.estado !== 'pagado');
    const vencidas   = cuentas.filter(c => c.estado === 'vencida');
    const totalPendiente = pendientes.reduce((a, c) => a + (c.montoBs - c.montoPagado), 0);
    const totalUSDPendiente = pendientes.reduce((a, c) => a + (c.montoUSD - c.montoPagadoUSD), 0);

    return {
        cuentas, cargando,
        pendientes, vencidas, totalPendiente, totalUSDPendiente,
        crearCuenta, registrarPago, actualizarCuenta, eliminarCuenta,
    };
}
