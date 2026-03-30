import { Receipt, Trash2 } from "lucide-react";
import { formatMoney } from "../utils/format";

export function SaleCart({
  items,
  customerName,
  setCustomerName,
  paymentMethod,
  setPaymentMethod,
  onQuantityChange,
  onRemove,
  onCheckout,
}) {
  const total = items.reduce((acc, item) => acc + item.subtotal, 0);

  return (
    <section className="panel reveal-up">
      <h2 className="title mb-3">Venta rapida</h2>

      <div className="grid gap-3 sm:grid-cols-2">
        <input
          className="field"
          placeholder="Cliente (opcional)"
          value={customerName}
          onChange={(event) => setCustomerName(event.target.value)}
        />
        <select
          className="field"
          value={paymentMethod}
          onChange={(event) => setPaymentMethod(event.target.value)}
        >
          <option>Efectivo</option>
          <option>Transferencia</option>
          <option>Debito</option>
          <option>Credito</option>
          <option>Cuenta corriente</option>
        </select>
      </div>

      <div className="mt-4 space-y-2">
        {items.map((item) => (
          <article
            key={item.productId}
            className="rounded-xl border border-slate-200 bg-white p-3"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="font-medium text-slate-900">{item.name}</p>
                <p className="text-xs text-slate-500">{item.sku}</p>
              </div>
              <button
                type="button"
                className="text-slate-400 transition hover:text-rose-600"
                onClick={() => onRemove(item.productId)}
              >
                <Trash2 size={16} />
              </button>
            </div>

            <div className="mt-3 flex items-center justify-between gap-3">
              <label className="inline-flex items-center gap-2 text-xs text-slate-500">
                Cantidad
                <input
                  type="number"
                  min={1}
                  max={item.stock}
                  className="field w-20 py-1"
                  value={item.quantity}
                  onChange={(event) =>
                    onQuantityChange(item.productId, event.target.value)
                  }
                />
              </label>
              <p className="text-sm font-semibold text-slate-800">
                {formatMoney(item.subtotal)}
              </p>
            </div>
          </article>
        ))}

        {!items.length && (
          <p className="rounded-xl border border-dashed border-slate-300 bg-slate-50 px-4 py-6 text-center text-sm text-slate-500">
            Agrega productos para comenzar una venta.
          </p>
        )}
      </div>

      <footer className="mt-4 rounded-2xl bg-slate-900 p-4 text-slate-100">
        <div className="mb-3 flex items-center justify-between text-sm">
          <span>Total</span>
          <strong className="text-lg">{formatMoney(total)}</strong>
        </div>
        <button
          type="button"
          onClick={onCheckout}
          disabled={!items.length}
          className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-amber-400 px-4 py-2 text-sm font-semibold text-slate-900 transition hover:bg-amber-300 disabled:cursor-not-allowed disabled:bg-slate-600 disabled:text-slate-400"
        >
          <Receipt size={15} />
          Confirmar venta
        </button>
      </footer>
    </section>
  );
}
