import type { Metadata } from 'next';
import AppLayout from '@/components/layout/AppLayout';

export const metadata: Metadata = {
    title: 'WhatsApp | ATEMPO Sistema Financiero',
    description: 'Consulta a los agentes IA desde WhatsApp',
};

export default function WhatsAppLayout({ children }: { children: React.ReactNode }) {
    return <AppLayout>{children}</AppLayout>;
}
