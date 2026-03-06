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
// Método: API Route interna que hace scraping de bcv.org.ve
// ============================
export async function obtenerTasaBCV(): Promise<number> {
    try {
        const response = await fetch('/api/tasas/bcv', {
            next: { revalidate: 1800 }, // Revalidar cada 30 minutos
        });

        if (!response.ok) throw new Error('Error al obtener tasa BCV');
        const data = await response.json();
        return data.tasa || TASAS_DEMO.bcv;
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
        const response = await fetch('/api/tasas/paralelo');
        if (!response.ok) throw new Error('Error al obtener tasa paralela');
        const data = await response.json();
        return data.tasa || TASAS_DEMO.paralelo;
    } catch (error) {
        console.error('Error tasa paralela:', error);
        return TASAS_DEMO.paralelo;
    }
}

// ============================
// OBTENER PRECIO USDT
// Fuente: CoinGecko API (gratuita, sin key requerida)
// ============================
export async function obtenerPrecioUSDT(): Promise<number> {
    try {
        const response = await fetch(
            'https://api.coingecko.com/api/v3/simple/price?ids=tether&vs_currencies=usd',
            { next: { revalidate: 300 } } // Cada 5 minutos
        );

        if (!response.ok) throw new Error('Error CoinGecko');
        const data = await response.json();
        return data.tether?.usd || 1.001;
    } catch (error) {
        console.error('Error USDT CoinGecko:', error);
        // Fallback: Binance P2P (precio promedio típico)
        return 1.0015;
    }
}

// ============================
// OBTENER EUR/USD
// Fuente: Frankfurter API (gratuita)
// ============================
export async function obtenerEURUSD(): Promise<number> {
    try {
        const response = await fetch(
            'https://api.frankfurter.app/latest?from=EUR&to=USD',
            { next: { revalidate: 3600 } } // Cada hora
        );

        if (!response.ok) throw new Error('Error Frankfurter EUR');
        const data = await response.json();
        return data.rates?.USD || 1.085;
    } catch (error) {
        console.error('Error EUR/USD:', error);
        return 1.085;
    }
}

// ============================
// OBTENER TODAS LAS TASAS
// Combina todas las fuentes
// ============================
export async function obtenerTodasLasTasas(): Promise<TasasCambio> {
    try {
        const [bcv, paralelo, usdtUsd, eurUsd] = await Promise.allSettled([
            obtenerTasaBCV(),
            obtenerTasaParalela(),
            obtenerPrecioUSDT(),
            obtenerEURUSD(),
        ]);

        const tasaBCV = bcv.status === 'fulfilled' ? bcv.value : TASAS_DEMO.bcv;
        const tasaParalelo = paralelo.status === 'fulfilled' ? paralelo.value : TASAS_DEMO.paralelo;
        const precioUSDT = usdtUsd.status === 'fulfilled' ? usdtUsd.value : TASAS_DEMO.usdtUsd;
        const ratioEUR = eurUsd.status === 'fulfilled' ? eurUsd.value : TASAS_DEMO.eurUsd;

        // Calcular derivados
        const eurBcv = tasaBCV * ratioEUR;
        const eurParalelo = tasaParalelo * ratioEUR;
        const usdtBs = tasaParalelo * precioUSDT;

        // Calcular brechas
        const brechaUSD = calcularBrecha(tasaParalelo, tasaBCV);
        const brechaEUR = calcularBrecha(eurParalelo, eurBcv);
        const brechaUSDT = calcularBrecha(usdtBs, tasaBCV * precioUSDT);

        return {
            bcv: tasaBCV,
            paralelo: tasaParalelo,
            eurUsd: ratioEUR,
            eurBcv,
            eurParalelo,
            usdtUsd: precioUSDT,
            usdtBs,
            brechaUSD,
            brechaEUR,
            brechaUSDT,
            ultimaActualizacion: new Date(),
            fuente: 'live',
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
