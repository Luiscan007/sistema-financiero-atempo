import AppLayout from '@/components/layout/AppLayout';
import type { Metadata } from 'next';

export const metadata: Metadata = {
    title: 'Clientes | ATEMPO',
    description: 'Gestión de clientes con historial, crédito y clasificación VIP',
};

export default function ClientesLayout({ children }: { children: React.ReactNode }) {
    return <AppLayout>{children}</AppLayout>;
}
