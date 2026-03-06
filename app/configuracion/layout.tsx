import AppLayout from '@/components/layout/AppLayout';
import type { Metadata } from 'next';

export const metadata: Metadata = {
    title: 'Configuración | ATEMPO',
    description: 'Configuración del negocio, datos bancarios, tasas y preferencias del sistema',
};

export default function ConfigLayout({ children }: { children: React.ReactNode }) {
    return <AppLayout>{children}</AppLayout>;
}
