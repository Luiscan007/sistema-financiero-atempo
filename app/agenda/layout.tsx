import AppLayout from '@/components/layout/AppLayout';
import type { Metadata } from 'next';

export const metadata: Metadata = {
    title: 'Agenda | ATEMPO',
    description: 'ATEMPO - Sistema Financiero',
};

export default function Layout({ children }: { children: React.ReactNode }) {
    return <AppLayout>{children}</AppLayout>;
}
