import AppLayout from '@/components/layout/AppLayout';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Productos | ATEMPO',
  description: 'Catálogo de productos: Cafetín y Merchandising con precios en USD y Bs',
};

export default function ProductosLayout({ children }: { children: React.ReactNode }) {
  return <AppLayout>{children}</AppLayout>;
}
