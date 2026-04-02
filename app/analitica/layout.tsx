import AppLayout from '@/components/layout/AppLayout';
import type { Metadata } from 'next';

export const metadata: Metadata = {
    title: 'Analitica | ATEMPO',
    description: 'Business Intelligence y Analitica Avanzada',
};

export default function Layout({ children }: { children: React.ReactNode }) {
    return <AppLayout>{children}</AppLayout>;
}
