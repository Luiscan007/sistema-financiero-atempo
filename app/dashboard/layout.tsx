import type { Metadata } from 'next';
import AppLayout from '@/components/layout/AppLayout';

export const metadata: Metadata = {
    title: 'Dashboard | ATEMPO Sistema Financiero',
    description: 'Panel principal con KPIs, gráficas de ventas, inventario y tasas de cambio',
};

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
    return <AppLayout>{children}</AppLayout>;
}
