import { redirect } from 'next/navigation';

/**
 * app/page.tsx - Redirección automática
 * Si está autenticado → /dashboard
 * Si no → /auth
 */
export default function HomePage() {
    // En producción: verificar sesión server-side con Firebase Admin
    // Por ahora, redirigir al dashboard (la protección está en el client-side)
    redirect('/dashboard');
}
