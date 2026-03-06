# 🏦 ATEMPO - Sistema Financiero Venezolano

Sistema completo de gestión comercial con:
- 💱 Tasas de cambio en tiempo real (BCV, paralelo, EUR, USDT)
- 🛒 Punto de Venta con pago móvil venezolano
- 📊 Dashboard con gráficas inteligentes
- 📒 Contabilidad con P&G en Bs y USD
- 👥 Gestión de clientes y proveedores

---

## 🚀 INSTALACIÓN PASO A PASO

### 1. Instalar Node.js (REQUERIDO)
Descarga desde: **https://nodejs.org/** (versión LTS recomendada, ≥ 18)

Verifica la instalación:
```bash
node --version
npm --version
```

### 2. Instalar dependencias del proyecto
```bash
cd "c:\Users\tluis\Desktop\SISTEMA FINANCIERO ATEMPO"
npm install
```

### 3. Configurar Firebase
1. Ve a **https://console.firebase.google.com**
2. Crea un nuevo proyecto
3. Activa los servicios:
   - **Authentication** → habilitar Google y Email/Password
   - **Firestore Database** → crear en modo producción
   - **Storage** → para comprobantes de gastos
4. Ve a Configuración del proyecto → Config web → copia las credenciales
5. Edita el archivo `.env.local` con tus credenciales:

```env
NEXT_PUBLIC_FIREBASE_API_KEY=tu_api_key_real
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=tu-proyecto.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=tu-proyecto-id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=tu-proyecto.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=tu_sender_id
NEXT_PUBLIC_FIREBASE_APP_ID=tu_app_id
```

### 4. Ejecutar en modo desarrollo
```bash
npm run dev
```

Abre **http://localhost:3000** en tu navegador.

### 5. Build para producción
```bash
npm run build
npm start
```

---

## 📁 ESTRUCTURA DEL PROYECTO

```
SISTEMA FINANCIERO ATEMPO/
├── app/
│   ├── auth/page.tsx          → Login/Registro
│   ├── dashboard/page.tsx     → Dashboard con gráficas
│   ├── pos/page.tsx           → Punto de Venta
│   ├── inventario/page.tsx    → Gestión de inventario
│   ├── ventas/page.tsx        → Historial de ventas
│   ├── gastos/page.tsx        → Libro de gastos
│   ├── contabilidad/page.tsx  → P&G y cuentas
│   ├── cambio/page.tsx        → Tasas y brecha cambiaria
│   ├── clientes/page.tsx      → Gestión de clientes
│   ├── configuracion/page.tsx → Ajustes del negocio
│   └── api/tasas/             → API routes para scraping
├── components/
│   ├── layout/AppLayout.tsx   → Sidebar + Top bar + Widget tasas
│   ├── providers/             → Auth + Tasas context
│   └── ui/                    → Componentes reutilizables
├── lib/
│   ├── firebase.ts            → Config Firebase
│   ├── tasas.ts               → Obtención de tasas de cambio
│   ├── store.ts               → Estado global (Zustand)
│   ├── utils.ts               → Formateo de bolívares y utilidades
│   └── offline-queue.ts       → Cola offline IndexedDB
└── public/sw.js               → Service Worker para modo offline
```

---

## 💱 FUENTES DE TASAS DE CAMBIO

| Tasa | Fuente | Actualización |
|------|--------|---------------|
| BCV oficial | pydolarve.org / BCV API | Cada 30 min |
| Paralela | pydolarve.org / dolarapi.com | Cada 30 min |
| EUR/USD | api.frankfurter.app | Cada hora |
| USDT/USD | CoinGecko (gratis) | Cada 5 min |

**APIs usadas (todas gratuitas):**
- https://pydolarve.org/api/v1/
- https://ve.dolarapi.com/v1/
- https://api.frankfurter.app/
- https://api.coingecko.com/api/v3/

---

## 🏪 MÓDULOS DEL SISTEMA

### 🛒 Punto de Venta (POS)
- Catálogo de productos con búsqueda
- Carrito con descuentos por ítem y global
- **Métodos de pago venezolanos:**
  - Punto de Venta físico (con aprobación bancaria)
  - Pago Móvil (banco, teléfono, referencia)
  - Efectivo Bs / USD / EUR
  - Transferencia bancaria
  - Pago mixto (combinar métodos)
- Envío de recibo por WhatsApp
- Modo offline con sincronización automática

### 💱 Tasas y Cambio
- Tasas en tiempo real: BCV, paralelo, EUR, USDT
- Brecha cambiaria con colores (verde/amarillo/rojo)
- Parpadeo rojo si brecha > 50%
- Calculadora multi-moneda (Bs ↔ USD ↔ EUR ↔ USDT)
- Calculadora de brecha personalizada
- Historial gráfico 30 días

### 📊 Dashboard
- KPIs: ventas del día/mes, ticket promedio, utilidad
- 6 gráficas: ventas diarias, métodos pago, ingresos vs gastos, tasa histórica, top productos, horas activas

### 📦 Inventario
- CRUD completo con múltiples listas de precios
- Alertas de stock bajo (badge rojo)
- Importación CSV

### 📒 Contabilidad
- Libro de ingresos y gastos
- P&G mensual y anual (Bs y USD)
- Cuentas por cobrar/pagar con alertas de vencimiento
- Exportar a PDF y Excel

---

## 🔥 CONFIGURAR FIREBASE

### Reglas de Firestore recomendadas:
```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Usuario autenticado puede leer/escribir en su organización
    match /{document=**} {
      allow read, write: if request.auth != null;
    }
  }
}
```

### Índices de Firestore (crear en consola):
- `ventas`: índice compuesto por `fecha` (desc) + `metodoPago`
- `gastos`: índice por `fecha` (desc) + `categoria`
- `historial_tasas`: índice por `fecha` (desc)

---

## 📱 MODO OFFLINE (POS)

El sistema incluye soporte offline para el POS:
1. Se activa automáticamente cuando no hay internet
2. Las ventas se guardan en IndexedDB del navegador
3. Al recuperar la conexión, se sincronizan con Firestore
4. El indicador en el sidebar muestra el estado de conexión

---

## 🚀 DESPLIEGUE EN VERCEL (Recomendado)

```bash
npm install -g vercel
vercel login
vercel --prod
```

Variables de entorno a configurar en Vercel:
- `NEXT_PUBLIC_FIREBASE_API_KEY`
- `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN`
- `NEXT_PUBLIC_FIREBASE_PROJECT_ID`
- (todas las variables de .env.local)

---

## 🛠️ TECNOLOGÍAS

- **Framework**: Next.js 14 (App Router)
- **Estilos**: Tailwind CSS con tema oscuro personalizado
- **Gráficas**: Recharts
- **Estado**: Zustand (con persistencia localStorage)
- **Backend**: Firebase (Firestore + Auth + Storage)
- **Offline**: Service Worker + IndexedDB (idb)
- **Tasas**: APIs públicas venezolanas + CoinGecko + Frankfurter

---

## 📞 SOPORTE

Para soporte técnico o personalización:
- Configura Firebase siguiendo los pasos anteriores
- Ajusta los datos de demostración con datos reales de tu negocio
- Conecta Firestore reemplazando los datos demo en cada módulo

**¡El sistema está listo para usar!** 🎉
