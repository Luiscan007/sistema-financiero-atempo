import AppLayout from '@/components/layout/AppLayout';
import type { Metadata } from 'next';

export const metadata: Metadata = {
    title: 'Ventas | ATEMPO',
    description: 'Historial de ventas con filtros, método de pago y exportación',
};

export default function VentasLayout({ children }: { children: React.ReactNode }) {
    return <AppLayout>{children}</AppLayout>;
}
