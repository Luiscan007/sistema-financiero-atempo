import type { Metadata } from 'next';
import AppLayout from '@/components/layout/AppLayout';

export const metadata: Metadata = {
    title: 'Conciliación Bancaria | ATEMPO Sistema Financiero',
    description: 'Conciliación bancaria con IA',
};

export default function ConciliacionLayout({ children }: { children: React.ReactNode }) {
    return <AppLayout>{children}</AppLayout>;
}
