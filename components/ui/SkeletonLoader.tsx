'use client';

/**
 * components/ui/SkeletonLoader.tsx
 * Componentes de skeleton loading para toda la aplicación
 */

import { cn } from '@/lib/utils';

// Skeleton básico
export function Skeleton({ className }: { className?: string }) {
    return (
        <div
            className={cn(
                'skeleton rounded-lg',
                className
            )}
            style={{
                background: 'linear-gradient(90deg, hsl(217, 33%, 15%) 0%, hsl(217, 33%, 20%) 50%, hsl(217, 33%, 15%) 100%)',
                backgroundSize: '200% 100%',
                animation: 'shimmer 2s infinite',
            }}
        />
    );
}

// Row de tabla skeleton
export function SkeletonRow({ cols = 5 }: { cols?: number }) {
    return (
        <tr>
            {Array(cols).fill(0).map((_, i) => (
                <td key={i} className="px-4 py-3.5">
                    <Skeleton className="h-4 w-full" />
                </td>
            ))}
        </tr>
    );
}

// Card skeleton
export function SkeletonCard({ className }: { className?: string }) {
    return (
        <div className={cn('card-sistema space-y-3', className)}>
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-8 w-32" />
            <Skeleton className="h-3 w-20" />
        </div>
    );
}

// Tabla completa skeleton
export function SkeletonTabla({ filas = 5, cols = 5 }: { filas?: number; cols?: number }) {
    return (
        <div className="card-sistema overflow-hidden p-0">
            <div className="overflow-x-auto">
                <table className="tabla-sistema">
                    <thead>
                        <tr>
                            {Array(cols).fill(0).map((_, i) => (
                                <th key={i}>
                                    <Skeleton className="h-4 w-20" />
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {Array(filas).fill(0).map((_, i) => (
                            <SkeletonRow key={i} cols={cols} />
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
