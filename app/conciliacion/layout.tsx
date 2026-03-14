import type { Metadata } from 'next';
import AppLayout from '@/components/layout/AppLayout';

export const metadata: Metadata = {
    title: 'Conciliación Bancaria | ATEMPO Sistema Financiero',
    description: 'Conciliación bancaria con IA: cotejo de estados de cuenta contra registros del sistema',
};

export default function ConciliacionLayout({ children }: { children: React.ReactNode }) {
    return <AppLayout>{children}</AppLayout>;
}
