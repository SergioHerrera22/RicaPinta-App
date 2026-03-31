export default function InventoryRadarWidget({
  lowStockProducts,
  pendingOrders,
  queueDepth,
}) {
  return (
    <article className="panel reveal-up">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="title">Radar de stock</h2>
        <span className="rounded-full bg-amber-50 px-2 py-1 text-xs font-semibold text-amber-700">
          Alertas inteligentes
        </span>
      </div>

      <div className="mb-3 grid gap-2 sm:grid-cols-2">
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
          <p className="text-xs uppercase tracking-[0.12em] text-slate-500">
            Pedidos sugeridos
          </p>
          <p className="mt-1 text-xl font-semibold text-slate-900">
            {pendingOrders}
          </p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
          <p className="text-xs uppercase tracking-[0.12em] text-slate-500">
            Cola de sincronizacion
          </p>
          <p className="mt-1 text-xl font-semibold text-slate-900">
            {queueDepth}
          </p>
        </div>
      </div>

      <div className="space-y-2">
        {lowStockProducts.length === 0 && (
          <p className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">
            Todo en orden: no hay productos criticos.
          </p>
        )}

        {lowStockProducts.map((product) => (
          <div
            key={product.id}
            className="flex items-center justify-between rounded-xl border border-rose-200 bg-rose-50/70 px-3 py-2 text-sm"
          >
            <div>
              <p className="font-semibold text-slate-900">{product.name}</p>
              <p className="text-xs text-slate-500">SKU: {product.sku}</p>
            </div>
            <span className="rounded-full bg-white px-2 py-1 text-xs font-semibold text-rose-700">
              Stock {product.stock}
            </span>
          </div>
        ))}
      </div>
    </article>
  );
}
