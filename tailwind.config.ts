/** @type {import('tailwindcss').Config} */
module.exports = {
    darkMode: ['class'],
    content: [
        './pages/**/*.{ts,tsx}',
        './components/**/*.{ts,tsx}',
        './app/**/*.{ts,tsx}',
        './src/**/*.{ts,tsx}',
    ],
    theme: {
        container: {
            center: true,
            padding: '2rem',
            screens: { '2xl': '1400px' },
        },
        extend: {
            colors: {
                border:      'hsl(var(--border))',
                input:       'hsl(var(--input))',
                ring:        'hsl(var(--ring))',
                background:  'hsl(var(--background))',
                foreground:  'hsl(var(--foreground))',
                primary: {
                    DEFAULT:    'hsl(var(--primary))',
                    foreground: 'hsl(var(--primary-foreground))',
                },
                secondary: {
                    DEFAULT:    'hsl(var(--secondary))',
                    foreground: 'hsl(var(--secondary-foreground))',
                },
                destructive: {
                    DEFAULT:    'hsl(var(--destructive))',
                    foreground: 'hsl(var(--destructive-foreground))',
                },
                muted: {
                    DEFAULT:    'hsl(var(--muted))',
                    foreground: 'hsl(var(--muted-foreground))',
                },
                accent: {
                    DEFAULT:    'hsl(var(--accent))',
                    foreground: 'hsl(var(--accent-foreground))',
                },
                popover: {
                    DEFAULT:    'hsl(var(--popover))',
                    foreground: 'hsl(var(--popover-foreground))',
                },
                card: {
                    DEFAULT:    'hsl(var(--card))',
                    foreground: 'hsl(var(--card-foreground))',
                },
                chart: {
                    '1': 'hsl(var(--chart-1))',
                    '2': 'hsl(var(--chart-2))',
                    '3': 'hsl(var(--chart-3))',
                    '4': 'hsl(var(--chart-4))',
                    '5': 'hsl(var(--chart-5))',
                },
                // Colores corporativos Atempo
                atempo: {
                    gold:        '#EAB308',
                    'gold-light':'#FDE047',
                    'gold-dark': '#CA8A04',
                    red:         '#DC2626',
                    'red-light': '#F87171',
                    'red-dark':  '#991B1B',
                },
                // Venezolano legacy
                venezolano: {
                    blue:        '#3b82f6',
                    green:       '#22c55e',
                    red:         '#ef4444',
                    gold:        '#f59e0b',
                    dark:        '#0f172a',
                    'dark-card': '#1e293b',
                    'dark-border':'#334155',
                },
            },

            borderRadius: {
                lg:  'var(--radius)',
                md:  'calc(var(--radius) - 2px)',
                sm:  'calc(var(--radius) - 4px)',
                '2xl': '1rem',
                '3xl': '1.5rem',
            },

            fontFamily: {
                sans:  ['DM Sans', 'system-ui', '-apple-system', 'sans-serif'],
                mono:  ['DM Mono', 'JetBrains Mono', 'Fira Code', 'monospace'],
                display: ['DM Sans', 'system-ui', 'sans-serif'],
            },

            letterSpacing: {
                tightest: '-0.04em',
                tighter:  '-0.02em',
                tight:    '-0.01em',
            },

            boxShadow: {
                'glow-gold':  '0 0 32px rgba(234,179,8,0.2)',
                'glow-red':   '0 0 32px rgba(220,38,38,0.2)',
                'glow-blue':  '0 0 32px rgba(59,130,246,0.2)',
                'glow-green': '0 0 32px rgba(34,197,94,0.2)',
                'card':       '0 1px 3px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.03)',
                'card-hover': '0 8px 32px rgba(0,0,0,0.4), 0 0 0 1px rgba(234,179,8,0.15)',
                'premium':    '0 20px 60px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.05)',
            },

            keyframes: {
                // Sistema
                'accordion-down': {
                    from: { height: '0' },
                    to:   { height: 'var(--radix-accordion-content-height)' },
                },
                'accordion-up': {
                    from: { height: 'var(--radix-accordion-content-height)' },
                    to:   { height: '0' },
                },
                // Shimmer skeleton
                shimmer: {
                    '0%':   { backgroundPosition: '-200% 0' },
                    '100%': { backgroundPosition:  '200% 0' },
                },
                // Fade & slide
                'fade-in': {
                    from: { opacity: '0', transform: 'translateY(8px)' },
                    to:   { opacity: '1', transform: 'translateY(0)' },
                },
                'slide-in': {
                    from: { opacity: '0', transform: 'translateX(-12px)' },
                    to:   { opacity: '1', transform: 'translateX(0)' },
                },
                'slide-up': {
                    from: { opacity: '0', transform: 'translateY(16px)' },
                    to:   { opacity: '1', transform: 'translateY(0)' },
                },
                // Efectos de brillo
                'pulse-gold': {
                    '0%, 100%': { boxShadow: '0 0 12px rgba(234,179,8,0.15)' },
                    '50%':       { boxShadow: '0 0 28px rgba(234,179,8,0.35)' },
                },
                'pulse-rojo': {
                    '0%, 100%': { opacity: '1' },
                    '50%':       { opacity: '0.5' },
                },
                // Orb ambiental
                'orb': {
                    '0%':   { transform: 'translate(0, 0) scale(1)' },
                    '33%':  { transform: 'translate(30px, -20px) scale(1.05)' },
                    '66%':  { transform: 'translate(-20px, 10px) scale(0.97)' },
                    '100%': { transform: 'translate(0, 0) scale(1)' },
                },
                // Float
                'float-y': {
                    '0%, 100%': { transform: 'translateY(0)' },
                    '50%':       { transform: 'translateY(-4px)' },
                },
                // Línea de scaneo
                'scan': {
                    '0%':   { top: '0%', opacity: '0' },
                    '5%':   { opacity: '1' },
                    '95%':  { opacity: '0.4' },
                    '100%': { top: '100%', opacity: '0' },
                },
                // Entrada en cascada (para usar con delay)
                'stagger-in': {
                    '0%':   { opacity: '0', transform: 'translateY(20px)' },
                    '100%': { opacity: '1', transform: 'translateY(0)' },
                },
            },

            animation: {
                // Sistema
                'accordion-down': 'accordion-down 0.2s ease-out',
                'accordion-up':   'accordion-up 0.2s ease-out',
                // Utilidades
                shimmer:    'shimmer 2s infinite linear',
                'fade-in':  'fade-in 0.4s cubic-bezier(0.4,0,0.2,1) both',
                'slide-in': 'slide-in 0.3s cubic-bezier(0.4,0,0.2,1) both',
                'slide-up': 'slide-up 0.4s cubic-bezier(0.4,0,0.2,1) both',
                // Glows
                'pulse-gold': 'pulse-gold 2.5s ease-in-out infinite',
                'pulse-rojo': 'pulse-rojo 2s ease-in-out infinite',
                // Ambientales
                'orb':     'orb 12s ease-in-out infinite',
                'float-y': 'float-y 4s ease-in-out infinite',
                // Stagger (usar con delay utility)
                'stagger': 'stagger-in 0.5s cubic-bezier(0.4,0,0.2,1) both',
            },

            backgroundImage: {
                'shimmer-gradient': 'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.05) 50%, transparent 100%)',
                'gold-gradient':    'linear-gradient(135deg, #EAB308, #FDE047, #CA8A04)',
                'card-gradient':    'linear-gradient(135deg, rgba(255,255,255,0.03), rgba(255,255,255,0))',
                'noise':            "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' opacity='0.03'/%3E%3C/svg%3E\")",
            },

            transitionTimingFunction: {
                'spring':       'cubic-bezier(0.34, 1.56, 0.64, 1)',
                'smooth':       'cubic-bezier(0.4, 0, 0.2, 1)',
                'out-expo':     'cubic-bezier(0.19, 1, 0.22, 1)',
                'out-quart':    'cubic-bezier(0.25, 1, 0.5, 1)',
            },
        },
    },
    plugins: [require('tailwindcss-animate')],
};
