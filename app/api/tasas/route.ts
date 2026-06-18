/**
 * app/api/tasas/route.ts
 * API consolidada para tasas de cambio (Dólar, Euro, USDT, Brechas)
 * Fuente principal: DolarApi.com (CORS-friendly, rápido y confiable)
 * Fallback: pyDolarVE y estimaciones
 */

import { NextResponse } from 'next/server';

interface TasaCache {
    data: any;
    timestamp: number;
}

let cache: TasaCache | null = null;
const CACHE_TTL = 15 * 60 * 1000; // 15 minutos de caché

async function fetchWithTimeout(url: string, options: RequestInit = {}, timeout = 5000) {
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), timeout);
    try {
        const response = await fetch(url, {
            ...options,
            signal: controller.signal
        });
        clearTimeout(id);
        return response;
    } catch (error) {
        clearTimeout(id);
        throw error;
    }
}

export async function GET() {
    try {
        // Retornar caché si está vigente
        if (cache && Date.now() - cache.timestamp < CACHE_TTL) {
            return NextResponse.json(cache.data, {
                headers: {
                    'X-Cache': 'HIT',
                    'Cache-Control': 'public, max-age=900'
                }
            });
        }

        let bcv = 0;
        let paralelo = 0;
        let eurBcv = 0;
        let eurParalelo = 0;
        let usdtUsd = 1.001;

        // 1. Obtener tasas de DolarApi (USD y EUR)
        try {
            const [dolaresRes, eurosRes] = await Promise.all([
                fetchWithTimeout('https://ve.dolarapi.com/v1/dolares', { next: { revalidate: 900 } }),
                fetchWithTimeout('https://ve.dolarapi.com/v1/euros', { next: { revalidate: 900 } })
            ]);

            if (dolaresRes.ok) {
                const dolares = await dolaresRes.json();
                const dOficial = dolares.find((d: any) => d.fuente === 'oficial');
                const dParalelo = dolares.find((d: any) => d.fuente === 'paralelo');
                
                if (dOficial) bcv = dOficial.promedio;
                if (dParalelo) paralelo = dParalelo.promedio;
            }

            if (eurosRes.ok) {
                const euros = await eurosRes.json();
                const eOficial = euros.find((e: any) => e.fuente === 'oficial');
                const eParalelo = euros.find((e: any) => e.fuente === 'paralelo');

                if (eOficial) eurBcv = eOficial.promedio;
                if (eParalelo) eurParalelo = eParalelo.promedio;
            }
        } catch (e) {
            console.error('Error consultando DolarApi:', e);
        }

        // 2. Fallbacks para BCV si falló DolarApi
        if (bcv <= 0) {
            try {
                const res = await fetchWithTimeout('https://pydolarve.org/api/v1/dollar?page=bcv');
                if (res.ok) {
                    const data = await res.json();
                    if (data?.monitors?.usd?.price) bcv = parseFloat(data.monitors.usd.price);
                }
            } catch {}
        }
        if (bcv <= 0) {
            bcv = 602.33; // Tasa de contingencia actual aproximada
        }

        // 3. Fallbacks para Paralelo si falló DolarApi
        if (paralelo <= 0) {
            try {
                const res = await fetchWithTimeout('https://pydolarve.org/api/v1/dollar?page=enparalelovzla');
                if (res.ok) {
                    const data = await res.json();
                    if (data?.monitors?.usd?.price) paralelo = parseFloat(data.monitors.usd.price);
                }
            } catch {}
        }
        if (paralelo <= 0) {
            paralelo = 798.25; // Tasa de contingencia actual aproximada
        }

        // 4. Fallbacks para Euro si falló DolarApi
        if (eurBcv <= 0) {
            eurBcv = bcv * 1.159; // Tasa Euro/Dolar aproximada según el mercado actual de Venezuela
        }
        if (eurParalelo <= 0) {
            eurParalelo = paralelo * 1.146; // Tasa Euro/Dolar paralelo aproximada según mercado
        }

        // 5. USDT/USD de CoinGecko
        try {
            const res = await fetchWithTimeout('https://api.coingecko.com/api/v3/simple/price?ids=tether&vs_currencies=usd');
            if (res.ok) {
                const data = await res.json();
                if (data?.tether?.usd) usdtUsd = data.tether.usd;
            }
        } catch {}

        // 6. Calcular campos derivados y brechas
        const usdtBs = paralelo * usdtUsd;
        const eurUsd = eurBcv / bcv;

        const calcularBrecha = (paral: number, oficial: number) => {
            if (oficial <= 0) return 0;
            return parseFloat((((paral - oficial) / oficial) * 100).toFixed(2));
        };

        const brechaUSD = calcularBrecha(paralelo, bcv);
        const brechaEUR = calcularBrecha(eurParalelo, eurBcv);
        const brechaUSDT = calcularBrecha(usdtBs, bcv * usdtUsd);

        const data = {
            bcv,
            paralelo,
            eurUsd,
            eurBcv,
            eurParalelo,
            usdtUsd,
            usdtBs,
            brechaUSD,
            brechaEUR,
            brechaUSDT,
            ultimaActualizacion: new Date().toISOString(),
            fuente: 'dolarapi-consolidado'
        };

        // Guardar en caché
        cache = {
            data,
            timestamp: Date.now()
        };

        return NextResponse.json(data, {
            headers: {
                'X-Cache': 'MISS',
                'Cache-Control': 'public, max-age=900'
            }
        });
    } catch (error) {
        console.error('Error general en api/tasas:', error);
        return NextResponse.json(
            { error: 'Error al obtener tasas de cambio' },
            { status: 500 }
        );
    }
}
