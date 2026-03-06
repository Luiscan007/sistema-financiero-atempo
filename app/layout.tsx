import type { Metadata } from 'next';
import './globals.css';
import { Toaster } from 'react-hot-toast';
import { AuthProvider } from '@/components/providers/AuthProvider';
import { TasasProvider } from '@/components/providers/TasasProvider';

export const metadata: Metadata = {
    title: 'ATEMPO - Sistema Financiero Venezolano',
    description: 'Sistema de gestión comercial venezolano con pasarela de pagos, POS, contabilidad y tasas de cambio en tiempo real. BCV, paralelo, USDT, brecha cambiaria.',
    keywords: 'sistema financiero venezuela, punto de venta, pago móvil, tasa de cambio, BCV, bolívares, USDT',
    authors: [{ name: 'ATEMPO Financial Systems' }],
    viewport: 'width=device-width, initial-scale=1',
    themeColor: '#0f172a',
};

export default function RootLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <html lang="es" className="dark">
            <head>
                {/* Preconnect a Google Fonts */}
                <link rel="preconnect" href="https://fonts.googleapis.com" />
                <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
                <link
                    href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&family=JetBrains+Mono:wght@400;500;600&display=swap"
                    rel="stylesheet"
                />
                {/* Service Worker para modo offline */}
                <script
                    dangerouslySetInnerHTML={{
                        __html: `
              if ('serviceWorker' in navigator) {
                window.addEventListener('load', function() {
                  navigator.serviceWorker.register('/sw.js').catch(function() {});
                });
              }
            `,
                    }}
                />
            </head>
            <body className="min-h-screen bg-background antialiased">
                <AuthProvider>
                    <TasasProvider>
                        {children}
                        {/* Toast notifications globales */}
                        <Toaster
                            position="bottom-right"
                            toastOptions={{
                                duration: 4000,
                                style: {
                                    background: '#1e293b',
                                    color: '#f1f5f9',
                                    border: '1px solid #334155',
                                    borderRadius: '12px',
                                    fontSize: '14px',
                                    fontFamily: 'Inter, sans-serif',
                                },
                                success: {
                                    iconTheme: { primary: '#22c55e', secondary: '#1e293b' },
                                },
                                error: {
                                    iconTheme: { primary: '#ef4444', secondary: '#1e293b' },
                                },
                            }}
                        />
                    </TasasProvider>
                </AuthProvider>
            </body>
        </html>
    );
}
