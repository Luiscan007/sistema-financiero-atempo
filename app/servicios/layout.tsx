import AppLayout from '@/components/layout/AppLayout';
import type { Metadata } from 'next';

export const metadata: Metadata = {
    title: 'Sociedad | ATEMPO',
    description: 'Modulo de control de la deuda de la socidad de paco y rosi ',
};

export default function ServiciosLayout({ children }: { children: React.ReactNode }) {
    return <AppLayout>{children}</AppLayout>;
}
