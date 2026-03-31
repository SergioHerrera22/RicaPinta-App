import { lazy, Suspense, useMemo } from "react";

const KpiRibbon = lazy(() => import("./widgets/KpiRibbon"));
const SalesPulseWidget = lazy(() => import("./widgets/SalesPulseWidget"));
const InventoryRadarWidget = lazy(
  () => import("./widgets/InventoryRadarWidget"),
);
const OmnichannelHubWidget = lazy(
  () => import("./widgets/OmnichannelHubWidget"),
);

function WidgetSkeleton({ className = "h-40" }) {
  return (
    <article className={`panel ${className}`}>
      <div className="h-full animate-pulse rounded-xl bg-slate-100" />
    </article>
  );
}

export function SmartDashboard({
  metrics,
  products,
  sales,
  purchaseOrders,
  pendingOperations,
  isOnline,
}) {
  const insights = useMemo(() => {
    const todayKey = new Date().toDateString();
    const todaySales = sales.filter(
      (sale) => new Date(sale.createdAt).toDateString() === todayKey,
    );

    const lowStockProducts = products
      .filter((product) => product.stock <= product.minStock)
      .sort((a, b) => a.stock - b.stock)
      .slice(0, 5);

    const avgTicket = todaySales.length
      ? Math.round(
          todaySales.reduce((acc, sale) => acc + sale.total, 0) /
            todaySales.length,
        )
      : 0;

    return {
      todaySalesCount: todaySales.length,
      avgTicket,
      lowStockProducts,
      pendingOrders: purchaseOrders.length,
      queueDepth: pendingOperations.length,
    };
  }, [pendingOperations.length, products, purchaseOrders.length, sales]);

  return (
    <section className="space-y-4">
      <Suspense fallback={<WidgetSkeleton className="h-36" />}>
        <KpiRibbon
          metrics={metrics}
          avgTicket={insights.avgTicket}
          todaySalesCount={insights.todaySalesCount}
          isOnline={isOnline}
        />
      </Suspense>

      <div className="grid gap-4 xl:grid-cols-[1.35fr_1fr]">
        <Suspense fallback={<WidgetSkeleton className="h-58" />}>
          <SalesPulseWidget sales={sales} />
        </Suspense>

        <Suspense fallback={<WidgetSkeleton className="h-58" />}>
          <InventoryRadarWidget
            lowStockProducts={insights.lowStockProducts}
            pendingOrders={insights.pendingOrders}
            queueDepth={insights.queueDepth}
          />
        </Suspense>
      </div>

      <div className="grid gap-4 xl:grid-cols-1">
        <Suspense fallback={<WidgetSkeleton className="h-48" />}>
          <OmnichannelHubWidget
            isOnline={isOnline}
            queueDepth={insights.queueDepth}
          />
        </Suspense>
      </div>
    </section>
  );
}
