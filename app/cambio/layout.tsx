import AppLayout from '@/components/layout/AppLayout';
import type { Metadata } from 'next';

export const metadata: Metadata = {
    title: 'Tasas y Cambio | ATEMPO',
    description: 'Tasas BCV, paralelo, EUR, USDT. Brecha cambiaria, calculadora de conversión y análisis histórico.',
};

export default function CambioLayout({ children }: { children: React.ReactNode }) {
    return <AppLayout>{children}</AppLayout>;
}
