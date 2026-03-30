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



## Nota AFIP

La boleta y comprobante interno ya estan listos en frontend.
Cuando incorpores facturacion AFIP, podes extender el flujo de `checkout` para guardar y mostrar CAE/numero fiscal.
