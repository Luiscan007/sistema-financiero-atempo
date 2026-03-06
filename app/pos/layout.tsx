import AppLayout from '@/components/layout/AppLayout';
import type { Metadata } from 'next';

export const metadata: Metadata = {
    title: 'Punto de Venta | ATEMPO',
    description: 'Sistema POS venezolano con pago móvil, punto de venta y múltiples métodos de pago',
};

export default function POSLayout({ children }: { children: React.ReactNode }) {
    return <AppLayout>{children}</AppLayout>;
}
