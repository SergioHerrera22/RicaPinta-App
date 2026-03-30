import { MessageCircle, Plus, Trash2 } from "lucide-react";
import { formatMoney } from "../utils/format";

const normalizePhone = (phone) => phone.replace(/[^0-9]/g, "");

const encodeText = (text) => encodeURIComponent(text);

export function OrdersPanel({
  orders,
  suppliers,
  products,
  onAddSupplier,
  onRemoveSupplier,
  onAssignSupplier,
  onUpdateNeeded,
  onRemoveOrder,
}) {
  const handleAddSupplier = (event) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const name = String(formData.get("name") || "").trim();
    const phone = String(formData.get("phone") || "").trim();

    const result = onAddSupplier({ name, phone });
    if (!result.ok) {
      window.alert(result.message);
      return;
    }

    event.currentTarget.reset();
  };

  const buildOrderMessage = (order, supplierName) => {
    const greeting = supplierName
      ? `Hola ${supplierName}, buenas 👋`
      : "Hola, buenas 👋";

    const lines = [
      greeting,
      "",
      "🧾 Necesito reponer estos productos:",
      `• ${order.name}`,
      `  Cantidad solicitada: ${order.neededQuantity}`,
      "",
      "Gracias 🙌",
      "",
      "🤖 Este es un mensaje automatico.",
    ];

    return lines.join("\n");
  };

  const buildBulkMessage = (supplierOrders, supplierName) => {
    const greeting = supplierName
      ? `Hola ${supplierName}, buenas 👋`
      : "Hola, buenas 👋";

    const productLines = supplierOrders.flatMap((order, index) => [
      `${index + 1}. ${order.name}`,
      `   Cantidad solicitada: ${order.neededQuantity}`,
      "",
    ]);

    const lines = [
      greeting,
      "",
      "🧾 Necesito reponer estos productos:",
      ...productLines,
      "Gracias 🙌",
      "",
      "🤖 Este es un mensaje automatico.",
    ];

    return lines.join("\n");
  };

  const supplierOrderMap = suppliers.map((supplier) => {
    const supplierOrders = orders.filter(
      (order) => order.supplierId === supplier.id,
    );

    const phone = normalizePhone(supplier.phone);
    const whatsappUrl = phone
      ? `https://wa.me/${phone}?text=${encodeText(buildBulkMessage(supplierOrders, supplier.name))}`
      : null;

    return {
      supplier,
      supplierOrders,
      whatsappUrl,
    };
  });

  return (
    <section className="grid gap-4 lg:grid-cols-[1.45fr_1fr]">
      <article className="panel reveal-up">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="title">Mis pedidos (stock en 2 o menos)</h2>
          <span className="rounded-full bg-amber-50 px-2 py-1 text-xs font-semibold text-amber-700">
            {orders.length} items
          </span>
        </div>

        <div className="space-y-3">
          {orders.map((order) => {
            const supplier = suppliers.find(
              (item) => item.id === order.supplierId,
            );
            const supplierPhone = normalizePhone(supplier?.phone || "");
            const whatsappUrl = supplierPhone
              ? `https://wa.me/${supplierPhone}?text=${encodeText(buildOrderMessage(order, supplier?.name))}`
              : null;

            return (
              <article
                key={order.id}
                className="rounded-xl border border-slate-200 bg-white p-3"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold text-slate-900">{order.name}</p>
                    <p className="text-xs text-slate-500">SKU: {order.sku}</p>
                    <p className="text-xs text-rose-600">
                      Stock actual: {order.stock}
                    </p>
                    <p className="text-xs text-slate-600">
                      Precio actual:{" "}
                      {formatMoney(
                        products.find((p) => p.id === order.productId)?.price ||
                          0,
                      )}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => onRemoveOrder(order.id)}
                    className="text-slate-400 transition hover:text-rose-600"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>

                <div className="mt-3 grid gap-2 sm:grid-cols-3">
                  <label className="text-xs text-slate-500">
                    Cantidad a pedir
                    <input
                      className="field mt-1 w-full"
                      type="number"
                      min={1}
                      value={order.neededQuantity}
                      onChange={(event) =>
                        onUpdateNeeded(order.id, Number(event.target.value))
                      }
                    />
                  </label>

                  <label className="text-xs text-slate-500">
                    Proveedor
                    <select
                      className="field mt-1 w-full"
                      value={order.supplierId || ""}
                      onChange={(event) =>
                        onAssignSupplier(order.id, event.target.value || null)
                      }
                    >
                      <option value="">Sin asignar</option>
                      {suppliers.map((supplierOption) => (
                        <option
                          key={supplierOption.id}
                          value={supplierOption.id}
                        >
                          {supplierOption.name}
                        </option>
                      ))}
                    </select>
                  </label>

                  <div className="flex items-end">
                    <a
                      href={whatsappUrl || "#"}
                      onClick={(event) => {
                        if (!whatsappUrl) {
                          event.preventDefault();
                          window.alert(
                            "Asigna un proveedor con telefono para enviar por WhatsApp.",
                          );
                        }
                      }}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 px-3 py-2 text-xs font-semibold text-white transition hover:bg-emerald-500"
                    >
                      <MessageCircle size={14} />
                      Enviar
                    </a>
                  </div>
                </div>
              </article>
            );
          })}

          {!orders.length && (
            <p className="rounded-xl border border-dashed border-slate-300 bg-slate-50 px-4 py-8 text-center text-sm text-slate-500">
              No hay pedidos pendientes. Se agregan automaticamente cuando un
              producto llega a 2 unidades o menos.
            </p>
          )}
        </div>
      </article>

      <aside className="panel reveal-up">
        <h3 className="title mb-3">Proveedores</h3>

        <form onSubmit={handleAddSupplier} className="mb-3 grid gap-2">
          <input
            name="name"
            className="field"
            placeholder="Nombre proveedor"
            required
          />
          <input
            name="phone"
            className="field"
            placeholder="Telefono con caracteristica"
            required
          />
          <button
            type="submit"
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-900 px-3 py-2 text-xs font-semibold text-white transition hover:bg-slate-700"
          >
            <Plus size={14} />
            Agregar proveedor
          </button>
        </form>

        <div className="space-y-2">
          {suppliers.map((supplier) => (
            <article
              key={supplier.id}
              className="rounded-xl border border-slate-200 bg-white px-3 py-2"
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-sm font-semibold text-slate-900">
                    {supplier.name}
                  </p>
                  <p className="text-xs text-slate-500">{supplier.phone}</p>
                </div>
                <button
                  type="button"
                  onClick={() => onRemoveSupplier(supplier.id)}
                  className="text-slate-400 transition hover:text-rose-600"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </article>
          ))}

          {!suppliers.length && (
            <p className="text-xs text-slate-500">
              Agrega proveedores para enviar pedidos por WhatsApp.
            </p>
          )}
        </div>

        <div className="mt-4 space-y-2 rounded-xl bg-slate-50 p-3">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
            Envio masivo por proveedor
          </p>

          {supplierOrderMap.map(({ supplier, supplierOrders, whatsappUrl }) => (
            <a
              key={supplier.id}
              href={supplierOrders.length && whatsappUrl ? whatsappUrl : "#"}
              onClick={(event) => {
                if (!supplierOrders.length || !whatsappUrl) {
                  event.preventDefault();
                  window.alert(
                    "Ese proveedor no tiene pedidos asignados o telefono valido.",
                  );
                }
              }}
              target="_blank"
              rel="noreferrer"
              className="inline-flex w-full items-center justify-between rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-800 transition hover:bg-emerald-100"
            >
              <span>{supplier.name}</span>
              <span>{supplierOrders.length} items</span>
            </a>
          ))}
        </div>
      </aside>
    </section>
  );
}
