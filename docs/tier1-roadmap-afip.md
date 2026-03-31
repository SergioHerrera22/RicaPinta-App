# Tier 1 Roadmap (Frontend + Backend AFIP)

## 1) Estructura de archivos propuesta

Manteniendo tu app actual en React + Vite, la evolucion recomendada sin romper integraciones:

- src/
  - app/
    - providers/
      - queryClient.js
  - components/
    - dashboard/
      - SmartDashboard.jsx
      - widgets/
        - KpiRibbon.jsx
        - SalesPulseWidget.jsx
        - InventoryRadarWidget.jsx
        - OmnichannelHubWidget.jsx
        - CommandCenterWidget.jsx
    - sales/
    - inventory/
    - finance/
    - crm/
  - services/
    - apiClient.js
    - apiContracts.js
    - offlineSync.js
    - afipClient.js (nuevo)
  - store/
    - useSalesStore.js
    - useAuthStore.js
  - hooks/
    - useCommandPalette.js
    - useRealtimeChannel.js
  - utils/
    - fiscal.js
    - performance.js
  - styles/
    - tokens.css

## 2) Esquema de base de datos recomendado (PostgreSQL / Supabase)

### 2.1 Tablas nuevas

1. fiscal_customers
- id uuid pk
- legal_name text not null
- tax_condition text not null
- doc_type text not null
- doc_number text not null
- address text
- created_at timestamptz default now()
- updated_at timestamptz default now()
- unique (doc_type, doc_number)

2. sales_fiscal
- id uuid pk
- sale_id uuid not null unique references sales(id)
- customer_id uuid references fiscal_customers(id)
- receipt_type text not null
- cbte_type int not null
- pto_vta int not null
- doc_type int not null
- doc_number bigint not null default 0
- cae text
- cae_due_date date
- voucher_number int
- afip_status text not null default 'pending'
- afip_last_error text
- afip_synced_at timestamptz
- created_at timestamptz default now()
- updated_at timestamptz default now()

3. afip_sync_queue
- id uuid pk
- sale_id uuid not null references sales(id)
- operation text not null default 'SYNC_AFIP_SALE'
- status text not null default 'pending'
- attempts int not null default 0
- last_error text
- scheduled_at timestamptz default now()
- processed_at timestamptz
- payload jsonb not null
- created_at timestamptz default now()
- updated_at timestamptz default now()

4. afip_events_log
- id uuid pk
- sale_id uuid references sales(id)
- event_type text not null
- level text not null default 'info'
- message text not null
- metadata jsonb
- created_at timestamptz default now()

### 2.2 Índices recomendados

- create index idx_sales_fiscal_status on sales_fiscal(afip_status);
- create index idx_afip_queue_status_scheduled on afip_sync_queue(status, scheduled_at);
- create index idx_afip_events_sale on afip_events_log(sale_id, created_at desc);

## 3) Rutas backend a agregar (sin romper conexiones actuales)

Mantener todas las rutas actuales y agregar:

1. GET /afip/status
- valida credenciales/certificados y retorna estado operacional.

2. POST /afip/sales/sync
- sincroniza una venta puntual con AFIP.
- debe ser idempotente por sale_id o sale_reference_id.

3. POST /afip/sync/pending
- procesa cola de pendientes con retry y backoff.

4. (Opcional pero recomendado) GET /afip/sales/:saleId
- retorna estado fiscal consolidado por venta.

## 4) Paso a paso backend (orden sugerido)

1. Crear migraciones SQL de las 4 tablas nuevas.
2. Extender create sale para guardar bloque fiscal local (sin llamar AFIP todavia).
3. Implementar servicio AFIP (WSAA + WSFEv1) con token cacheado.
4. Implementar POST /afip/sales/sync con idempotencia fuerte.
5. Implementar POST /afip/sync/pending con retries.
6. Conectar create sale:
   - requestAfipSync=true => encolar en afip_sync_queue.
7. Registrar logs en afip_events_log por cada intento/resultado.
8. Tests:
   - validacion fiscal (A/B/ticket)
   - duplicados
   - reintentos
   - caidas AFIP
9. Activar cron/worker para drenar cola cada 1-2 minutos.
10. Agregar dashboard de observabilidad para cola, errores y latencia AFIP.

## 5) Mejoras frontend de performance (fase siguiente)

1. Integrar TanStack Query solo para lecturas remotas:
- products
- sales
- afip status
- queue status

2. Configuracion sugerida
- staleTime: 30s en dashboard
- gcTime: 5m
- prefetch en hover para modulos principales

3. Skeleton y lazy
- Mantener widgets del dashboard lazy + Suspense fallback.
- Agregar skeleton por tabla larga en stock/ventas.

4. Objetivo Core Web Vitals
- dividir chunks por modulo
- evitar renders en cascada (memo + selectors)
- limitar dependencias pesadas en panel inicial
