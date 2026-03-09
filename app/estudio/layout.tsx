import AppLayout from '@/components/layout/AppLayout';
import type { Metadata } from 'next';

export const metadata: Metadata = {
    title: 'Estudio en Vivo | ATEMPO',
    description: 'Vista pixel art del estudio ATEMPO con agentes en tiempo real',
};

export default function EstudioLayout({ children }: { children: React.ReactNode }) {
    return <AppLayout>{children}</AppLayout>;
}
