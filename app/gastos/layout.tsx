import AppLayout from '@/components/layout/AppLayout';
import type { Metadata } from 'next';

export const metadata: Metadata = {
    title: 'Gastos | ATEMPO',
    description: 'Registro de gastos con categorías, comprobantes y gastos fijos recurrentes',
};

export default function GastosLayout({ children }: { children: React.ReactNode }) {
    return <AppLayout>{children}</AppLayout>;
}
