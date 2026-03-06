import AppLayout from '@/components/layout/AppLayout';
import type { Metadata } from 'next';

export const metadata: Metadata = {
    title: 'Inventario | ATEMPO',
    description: 'Gestión de productos e inventario venezolano con alertas de stock bajo',
};

export default function InventarioLayout({ children }: { children: React.ReactNode }) {
    return <AppLayout>{children}</AppLayout>;
}
