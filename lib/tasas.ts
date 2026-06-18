/**
 * lib/tasas.ts
 * Módulo de obtención y cálculo de tasas de cambio venezolanas
 * Fuentes: BCV, Monitor Dólar Venezuela, CoinGecko, Binance P2P
 */

import { calcularBrecha } from './utils';

export interface TasasCambio {
    bcv: number;           // Tasa oficial BCV (Bs/USD)
    paralelo: number;      // Tasa mercado paralelo (Bs/USD)
    eurUsd: number;        // EUR/USD ratio
    eurBcv: number;        // EUR en Bs (tasa BCV)
    eurParalelo: number;   // EUR en Bs (tasa paralela)
    usdtUsd: number;       // USDT/USD ratio
    usdtBs: number;        // USDT en Bs (calculado con paralelo)
    brechaUSD: number;     // Brecha % paralelo vs BCV
    brechaEUR: number;     // Brecha % EUR paralelo vs BCV
    brechaUSDT: number;    // Brecha % USDT vs BCV
    ultimaActualizacion: Date;
    fuente: string;
}

// Tasas de demostración (se reemplazan con datos reales via API)
export const TASAS_DEMO: TasasCambio = {
    bcv: 40.50,
    paralelo: 42.80,
    eurUsd: 1.085,
    eurBcv: 43.94,
    eurParalelo: 46.44,
    usdtUsd: 1.001,
    usdtBs: 42.84,
    brechaUSD: 5.68,
    brechaEUR: 5.68,
    brechaUSDT: 5.79,
    ultimaActualizacion: new Date(),
    fuente: 'demo',
};

// ============================
// OBTENER TASA BCV OFICIAL
// ============================
export async function obtenerTasaBCV(): Promise<number> {
    try {
        const response = await fetch('/api/tasas');
        if (!response.ok) throw new Error('Error al obtener tasa BCV');
        const data = await response.json();
        return data.bcv || TASAS_DEMO.bcv;
    } catch (error) {
        console.error('Error BCV:', error);
        return TASAS_DEMO.bcv;
    }
}

// ============================
// OBTENER TASA PARALELA
// ============================
export async function obtenerTasaParalela(): Promise<number> {
    try {
        const response = await fetch('/api/tasas');
        if (!response.ok) throw new Error('Error al obtener tasa paralela');
        const data = await response.json();
        return data.paralelo || TASAS_DEMO.paralelo;
    } catch (error) {
        console.error('Error tasa paralelo:', error);
        return TASAS_DEMO.paralelo;
    }
}

// ============================
// OBTENER PRECIO USDT
// ============================
export async function obtenerPrecioUSDT(): Promise<number> {
    try {
        const response = await fetch('/api/tasas');
        if (!response.ok) throw new Error('Error al obtener precio USDT');
        const data = await response.json();
        return data.usdtUsd || TASAS_DEMO.usdtUsd;
    } catch (error) {
        console.error('Error USDT:', error);
        return TASAS_DEMO.usdtUsd;
    }
}

// ============================
// OBTENER EUR/USD
// ============================
export async function obtenerEURUSD(): Promise<number> {
    try {
        const response = await fetch('/api/tasas');
        if (!response.ok) throw new Error('Error al obtener ratio EUR/USD');
        const data = await response.json();
        return data.eurUsd || TASAS_DEMO.eurUsd;
    } catch (error) {
        console.error('Error EUR/USD:', error);
        return TASAS_DEMO.eurUsd;
    }
}

// ============================
// OBTENER TODAS LAS TASAS
// Combina todas las fuentes
// ============================
export async function obtenerTodasLasTasas(): Promise<TasasCambio> {
    try {
        const response = await fetch('/api/tasas');
        if (!response.ok) throw new Error('Error al obtener tasas consolidadas');
        const data = await response.json();
        return {
            ...data,
            ultimaActualizacion: new Date(data.ultimaActualizacion),
        };
    } catch (error) {
        console.error('Error obteniendo tasas:', error);
        return TASAS_DEMO;
    }
}

// ============================
// HISTORIAL DE TASAS (desde Firestore)
// ============================
export interface PuntoHistorialTasa {
    fecha: string;  // YYYY-MM-DD
    bcv: number;
    paralelo: number;
    usdt: number;
    brecha: number;
}

export async function obtenerHistorialTasas(dias = 30): Promise<PuntoHistorialTasa[]> {
    try {
        const response = await fetch(`/api/tasas/historial?dias=${dias}`);
        if (!response.ok) throw new Error('Error historial');
        return await response.json();
    } catch (error) {
        // Generar datos de demostración para el gráfico
        return generarHistorialDemo(dias);
    }
}

function generarHistorialDemo(dias: number): PuntoHistorialTasa[] {
    const historial: PuntoHistorialTasa[] = [];
    const hoy = new Date();
    let bcvBase = 38.0;
    let paralBase = 40.0;

    for (let i = dias; i >= 0; i--) {
        const fecha = new Date(hoy);
        fecha.setDate(hoy.getDate() - i);

        // Simular variación diaria realista
        bcvBase += (Math.random() - 0.3) * 0.3;
        paralBase += (Math.random() - 0.2) * 0.5;
        paralBase = Math.max(paralBase, bcvBase + 0.5); // Paralelo siempre > BCV

        const bcv = parseFloat(bcvBase.toFixed(2));
        const paralelo = parseFloat(paralBase.toFixed(2));
        const usdt = parseFloat((paralelo * 1.001).toFixed(2));
        const brecha = parseFloat(calcularBrecha(paralelo, bcv).toFixed(2));

        historial.push({
            fecha: fecha.toISOString().split('T')[0],
            bcv,
            paralelo,
            usdt,
            brecha,
        });
    }

    return historial;
}

// ============================
// GUARDAR TASA EN FIRESTORE
// Usado por Cloud Functions (cron)
// ============================
export async function guardarTasaEnFirestore(tasas: TasasCambio): Promise<void> {
    const { db, COLECCIONES } = await import('./firebase');
    const { doc, setDoc, addDoc, collection, serverTimestamp } = await import('firebase/firestore');

    const fecha = new Date();
    const fechaStr = fecha.toISOString().split('T')[0]; // YYYY-MM-DD

    // Actualizar documento actual
    await setDoc(doc(db, COLECCIONES.TASAS, 'actual'), {
        ...tasas,
        ultimaActualizacion: serverTimestamp(),
    });

    // Agregar al historial diario
    await setDoc(doc(db, COLECCIONES.HISTORIAL_TASAS, fechaStr), {
        fecha: fechaStr,
        bcv: tasas.bcv,
        paralelo: tasas.paralelo,
        usdt: tasas.usdtBs,
        usdt_usd: tasas.usdtUsd,
        eur_usd: tasas.eurUsd,
        eur_bs_bcv: tasas.eurBcv,
        brecha_usd: tasas.brechaUSD,
        brecha_eur: tasas.brechaEUR,
        brecha_usdt: tasas.brechaUSDT,
        timestamp: serverTimestamp(),
    });
}
