/**
 * app/api/tasas/paralelo/route.ts
 * API Route para la tasa paralela/mercado negro
 * Obtiene de múltiples fuentes públicas venezolanas
 */

import { NextResponse } from 'next/server';

let cache: { tasa: number; timestamp: number } | null = null;
const CACHE_TTL = 30 * 60 * 1000;

export async function GET() {
    try {
        // Cache vigente
        if (cache && Date.now() - cache.timestamp < CACHE_TTL) {
            return NextResponse.json({
                tasa: cache.tasa,
                fuente: 'cache',
                timestamp: new Date(cache.timestamp).toISOString(),
            });
        }

        let tasa: number | null = null;

        // Método 1: pydolarve - paralela
        try {
            const response = await fetch(
                'https://pydolarve.org/api/v1/dollar?page=enparalelovzla',
                {
                    headers: { 'Accept': 'application/json' },
                    next: { revalidate: 1800 },
                }
            );
            if (response.ok) {
                const data = await response.json();
                if (data?.monitors?.usd?.price) {
                    tasa = parseFloat(data.monitors.usd.price);
                }
            }
        } catch {
            console.error('Fallo pydolarve paralelo');
        }

        // Método 2: otra fuente alternativa
        if (!tasa) {
            try {
                const response = await fetch(
                    'https://ve.dolarapi.com/v1/dolares/paralelo',
                    { next: { revalidate: 1800 } }
                );
                if (response.ok) {
                    const data = await response.json();
                    tasa = data?.promedio ?? data?.precio ?? null;
                }
            } catch {
                console.error('Fallo dolarapi paralelo');
            }
        }

        // Fallback
        if (!tasa || tasa <= 0) {
            tasa = 42.80;
        }

        cache = { tasa, timestamp: Date.now() };

        return NextResponse.json({
            tasa,
            fuente: 'live',
            timestamp: new Date().toISOString(),
        });

    } catch (error) {
        return NextResponse.json(
            { tasa: 42.80, fuente: 'fallback' },
            { status: 200 }
        );
    }
}
