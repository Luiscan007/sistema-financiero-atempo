import AppLayout from '@/components/layout/AppLayout';
import type { Metadata } from 'next';

export const metadata: Metadata = {
    title: 'Contabilidad | ATEMPO',
    description: 'P&G, cuentas por cobrar y pagar, reportes financieros',
};

export default function ContabilidadLayout({ children }: { children: React.ReactNode }) {
    return <AppLayout>{children}</AppLayout>;
}
