import AppLayout from '@/components/layout/AppLayout';
import type { Metadata } from 'next';

export const metadata: Metadata = {
    title: 'Asistencia | ATEMPO',
    description: 'Control de asistencia diaria de alumnos',
};

export default function AsistenciaLayout({ children }: { children: React.ReactNode }) {
    return <AppLayout>{children}</AppLayout>;
}
