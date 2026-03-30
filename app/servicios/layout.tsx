import AppLayout from '@/components/layout/AppLayout';
import type { Metadata } from 'next';

export const metadata: Metadata = {
    title: 'Servicios | ATEMPO',
    description: 'Catalogo de servicios: paquetes de clases y alquiler de espacios',
};

export default function ServiciosLayout({ children }: { children: React.ReactNode }) {
    return <AppLayout>{children}</AppLayout>;
}
