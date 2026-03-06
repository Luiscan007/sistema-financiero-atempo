/**
 * app/api/tasas/historial/route.ts
 * API Route para historial de tasas (desde Firestore o datos demo)
 */

import { NextRequest, NextResponse } from 'next/server';

// Generar historial demo (en producción: leer de Firestore)
function generarHistorial(dias: number) {
    const historial = [];
    const hoy = new Date();
    let bcvBase = 38.0;
    let paralBase = 40.0;

    for (let i = dias; i >= 0; i--) {
        const fecha = new Date(hoy);
        fecha.setDate(hoy.getDate() - i);

        bcvBase += (Math.random() - 0.3) * 0.3;
        paralBase += (Math.random() - 0.2) * 0.5;
        paralBase = Math.max(paralBase, bcvBase + 0.5);

        const bcv = parseFloat(bcvBase.toFixed(2));
        const paralelo = parseFloat(paralBase.toFixed(2));
        const usdt = parseFloat((paralelo * 1.001).toFixed(2));
        const brecha = parseFloat(((paralelo - bcv) / bcv * 100).toFixed(2));

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

export async function GET(request: NextRequest) {
    const { searchParams } = new URL(request.url);
    const dias = parseInt(searchParams.get('dias') || '30');

    try {
        // En producción: obtener de Firestore
        // const historial = await obtenerHistorialFirestore(dias);

        const historial = generarHistorial(Math.min(dias, 90));

        return NextResponse.json(historial, {
            headers: {
                'Cache-Control': 'public, s-maxage=3600',
            },
        });
    } catch (error) {
        return NextResponse.json(
            { error: 'Error obteniendo historial' },
            { status: 500 }
        );
    }
}
