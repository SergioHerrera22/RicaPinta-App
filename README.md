# RicaPinta App Frontend

Frontend profesional para pintureria, optimizado para venta rapida en mostrador.

Incluye:

- Modulo de ventas con busqueda y filtros por categoria.
- Modulo de stock con ajuste manual inmediato.
- Modulo de precios con actualizacion masiva por categoria o catalogo completo.
- Generacion de comprobante interno y boleta cliente.
- Estado sincronizado: al vender se descuenta stock automaticamente.
- Login por roles: `admin` y `ventas`.
- Cola offline con sincronizacion automatica/manual cuando vuelve internet.

## Stack

- React 19
- Vite 8
- Tailwind CSS 4
- Zustand (estado global)
- Lucide React (iconos)

## Scripts

- `npm run dev` inicia entorno local
- `npm run build` genera build de produccion
- `npm run lint` valida codigo con ESLint

## Variables de entorno

Crear archivo `.env` usando `.env.example`:

`VITE_API_BASE_URL=http://localhost:4000/api`
`VITE_DATA_MODE=local`
`VITE_GEMINI_API_KEY=tu_api_key_de_google_ai_studio`
`VITE_GEMINI_MODEL=gemini-1.5-flash`

Valores recomendados:

- `VITE_DATA_MODE=local`: demo full local (sin backend)
- `VITE_DATA_MODE=api`: usa endpoints de backend
- `VITE_GEMINI_MODEL=gemini-1.5-flash`: rapido y economico para busqueda tecnica asistida

Nota sobre Gemini:

- La API key queda expuesta en frontend si se usa directo desde el navegador.
- Para produccion conviene usar un backend/proxy propio para proteger la clave.

## Usuarios demo

- `admin` / `admin123`
- `ventas` / `ventas123`

## Estructura principal

- `src/App.jsx`: layout principal y navegacion de modulos
- `src/store/useSalesStore.js`: logica sincronizada de ventas-stock-precios
- `src/components/*`: componentes UI del flujo comercial
- `src/services/apiContracts.js`: contratos de endpoints para integrar backend
- `src/services/apiClient.js`: cliente HTTP para backend
- `src/services/offlineSync.js`: replay de operaciones en cola offline
- `src/store/useAuthStore.js`: login y permisos por rol

## Integracion backend

Actualmente el frontend puede trabajar en dos modos:

1. `local`: usa estado local persistente.
2. `api`: usa endpoints backend y mantiene cola offline para operaciones fallidas.

Para conectar tu backend:

1. Implementar endpoints segun `src/services/apiContracts.js`.
2. Configurar `VITE_DATA_MODE=api`.
3. Persistir en Supabase desde backend.
4. Mantener atomica la operacion de venta + descuento de stock.

## Nota AFIP

La boleta y comprobante interno ya estan listos en frontend.
Cuando incorpores facturacion AFIP, podes extender el flujo de `checkout` para guardar y mostrar CAE/numero fiscal.
