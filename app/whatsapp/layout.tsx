// app/whatsapp/layout.tsx
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'WhatsApp — ATEMPO',
  description: 'Consulta a los agentes IA desde WhatsApp',
};

export default function WhatsAppLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
