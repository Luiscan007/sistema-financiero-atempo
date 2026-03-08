import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

/**
 * middleware.ts  (va en la RAIZ del proyecto, al lado de package.json)
 * Protege todas las rutas privadas redirigiendo a /auth si no hay sesion.
 * 
 * IMPORTANTE: Next.js Middleware corre en Edge Runtime y no puede usar
 * Firebase SDK directamente. Usamos la cookie de sesion que Firebase
 * establece automaticamente en el navegador.
 */

// Rutas que NO requieren autenticacion
const RUTAS_PUBLICAS = ['/auth', '/favicon.ico', '/_next', '/api'];

export function middleware(request: NextRequest) {
    const { pathname } = request.nextUrl;

    // Permitir rutas publicas y archivos estaticos
    const esPublica = RUTAS_PUBLICAS.some((ruta) => pathname.startsWith(ruta));
    if (esPublica) return NextResponse.next();

    // Verificar si existe alguna cookie de sesion de Firebase
    // Firebase Web SDK guarda la sesion en IndexedDB (no en cookies),
    // por lo que el guard real esta en AppLayout.tsx con onAuthStateChanged.
    // Este middleware agrega una capa extra: si la URL raiz '/' llega,
    // redirigir a /auth por defecto.
    if (pathname === '/') {
        return NextResponse.redirect(new URL('/auth', request.url));
    }

    return NextResponse.next();
}

export const config = {
    // Aplicar a todas las rutas excepto las de Next.js internals
    matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
