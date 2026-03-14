// app/conciliacion/layout.tsx
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Conciliación Bancaria — ATEMPO',
  description: 'Conciliación bancaria con IA: cotejo de estados de cuenta contra registros del sistema',
};

export default function ConciliacionLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
