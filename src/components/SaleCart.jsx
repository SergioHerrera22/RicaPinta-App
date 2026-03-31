import { Check, Plus, Receipt, Trash2, UserPlus, StickyNote } from "lucide-react";
import { useMemo, useState } from "react";
import { formatMoney } from "../utils/format";

export function SaleCart({
  items,
  saleForm,
  setSaleForm,
  clientContacts,
  paymentMethod,
  setPaymentMethod,
  onSaveClient,
  onQuantityChange,
  onRemove,
  onCheckout,
}) {
  const [showCustomerEditor, setShowCustomerEditor] = useState(false);
  const total = items.reduce((acc, item) => acc + item.subtotal, 0);
  const [showObservaciones, setShowObservaciones] = useState(false);
  const handleObservacionesChange = (e) => {
    setSaleForm((current) => ({ ...current, observaciones: e.target.value }));
  };
  // ...existing code...
  // Observaciones
  const handleToggleObservaciones = () => setShowObservaciones((v) => !v);

  const sortedClients = useMemo(
    () => [...clientContacts].sort((a, b) => a.name.localeCompare(b.name)),
    [clientContacts],
  );

  const selectedClient = useMemo(
    () =>
      sortedClients.find((client) => client.id === saleForm.customerId) || null,
    [saleForm.customerId, sortedClients],
  );

  const requiresFiscalData =
    showCustomerEditor ||
    Boolean(saleForm.customerId) ||
    saleForm.receiptType !== "ticket" ||
    paymentMethod === "Cuenta corriente";

  const updateSaleForm = (patch) =>
    setSaleForm((current) => ({
      ...current,
      ...patch,
    }));

  const applyClientToForm = (client) => {
    if (!client) {
      updateSaleForm({
        customerId: "",
        customerName: "",
        customerPhone: "",
        customerEmail: "",
        customerTaxCondition: "consumidor-final",
        customerDocType: "dni",
        customerDocNumber: "",
        customerAddress: "",
      });
      return;
    }

    updateSaleForm({
      customerId: client.id,
      customerName: client.name || "",
      customerPhone: client.phone || "",
      customerEmail: client.email || "",
      customerTaxCondition: client.taxCondition || "consumidor-final",
      customerDocType: client.docType || "dni",
      customerDocNumber: client.docNumber || "",
      customerAddress: client.address || "",
    });
  };

  const handleClientSelection = (event) => {
    const clientId = event.target.value;
    if (!clientId) {
      applyClientToForm(null);
      return;
    }

    const client = sortedClients.find((item) => item.id === clientId);
    applyClientToForm(client || null);
    setShowCustomerEditor(false);
  };

  const handleSaveCustomer = () => {
    const result = onSaveClient?.({
      name: saleForm.customerName,
      phone: saleForm.customerPhone,
      email: saleForm.customerEmail,
      taxCondition: saleForm.customerTaxCondition,
      docType: saleForm.customerDocType,
      docNumber: saleForm.customerDocNumber,
      address: saleForm.customerAddress,
    });

    if (!result?.ok) {
      return;
    }

    window.alert("Cliente guardado correctamente.");
    setShowCustomerEditor(false);
  };

  return (
    <div className="panel">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h2 className="title">Venta rapida</h2>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => {
              applyClientToForm(null);
              setShowCustomerEditor(false);
            }}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700 transition hover:border-slate-500"
          >
            <Check size={14} />
            Consumidor final
          </button>
          <button
            type="button"
            onClick={() => {
              updateSaleForm({ customerId: "" });
              setShowCustomerEditor(true);
            }}
            className="inline-flex items-center gap-2 rounded-xl border border-amber-300 bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-800 transition hover:bg-amber-100"
          >
            <UserPlus size={14} />
            Nuevo cliente
          </button>
        </div>
      </div>

      <div className="grid gap-3 lg:grid-cols-[1.4fr_1fr_1fr]">
        <label className="text-xs text-slate-500">
          Cliente registrado
          <select
            className="field mt-1 w-full"
            value={saleForm.customerId}
            onChange={handleClientSelection}
          >
            <option value="">Consumidor final o venta ocasional</option>
            {sortedClients.map((client) => (
              <option key={client.id} value={client.id}>
                {client.name}
                {client.docNumber ? ` · ${client.docNumber}` : ""}
              </option>
            ))}
          </select>
        </label>

        <label className="text-xs text-slate-500">
          Comprobante
          <select
            className="field mt-1 w-full"
            value={saleForm.receiptType}
            onChange={(event) =>
              updateSaleForm({ receiptType: event.target.value })
            }
          >
            <option value="ticket">Ticket de venta</option>
          </select>
        </label>

        <label className="text-xs text-slate-500">
          Medio de pago
          <select
            className="field mt-1 w-full"
            value={paymentMethod}
            onChange={(event) => setPaymentMethod(event.target.value)}
          >
            <option>Efectivo</option>
            <option>Transferencia</option>
            <option>Debito</option>
            <option>Credito</option>
            <option>Cuenta corriente</option>
          </select>
        </label>
      </div>

      {selectedClient && !showCustomerEditor && (
        <div className="mt-3 rounded-2xl border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <p className="font-semibold text-slate-900">{selectedClient.name}</p>
              <p className="text-xs text-slate-500">
                {selectedClient.docType?.toUpperCase() || "DOC"} {selectedClient.docNumber || "Sin documento"}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setShowCustomerEditor(true)}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:border-slate-500"
            >
              <Plus size={14} />
              Editar datos
            </button>
          </div>
        </div>
      )}

      {requiresFiscalData && (
        <div className="mt-3 rounded-2xl border border-slate-200 bg-white p-4">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <div>
              <p className="text-sm font-semibold text-slate-900">Datos del cliente</p>
              <p className="text-xs text-slate-500">
                Completa los datos para identificar al cliente y guardar el comprobante.
              </p>
            </div>
            <button
              type="button"
              onClick={handleSaveCustomer}
              className="inline-flex items-center gap-2 rounded-xl border border-emerald-300 bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-800 transition hover:bg-emerald-100"
            >
              <Check size={14} />
              Guardar cliente
            </button>
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            <label className="text-xs text-slate-500">
              Nombre o razon social
              <input
                className="field mt-1 w-full"
                placeholder="Ej. Juan Perez o Pintureria Centro SRL"
                value={saleForm.customerName}
                onChange={(event) =>
                  updateSaleForm({ customerName: event.target.value, customerId: "" })
                }
              />
            </label>

            <label className="text-xs text-slate-500">
              Condicion frente al IVA
              <select
                className="field mt-1 w-full"
                value={saleForm.customerTaxCondition}
                onChange={(event) =>
                  updateSaleForm({ customerTaxCondition: event.target.value })
                }
              >
                <option value="consumidor-final">Consumidor final</option>
                <option value="responsable-inscripto">Responsable inscripto</option>
                <option value="monotributista">Monotributista</option>
                <option value="exento">Exento</option>
              </select>
            </label>

            <label className="text-xs text-slate-500">
              Tipo de documento
              <select
                className="field mt-1 w-full"
                value={saleForm.customerDocType}
                onChange={(event) =>
                  updateSaleForm({ customerDocType: event.target.value })
                }
              >
                <option value="dni">DNI</option>
                <option value="cuit">CUIT</option>
                <option value="none">Sin identificar</option>
              </select>
            </label>

            <label className="text-xs text-slate-500">
              Numero de documento
              <input
                className="field mt-1 w-full"
                placeholder="Solo numeros"
                value={saleForm.customerDocNumber}
                onChange={(event) =>
                  updateSaleForm({ customerDocNumber: event.target.value, customerId: "" })
                }
              />
            </label>

            <label className="text-xs text-slate-500">
              Telefono
              <input
                className="field mt-1 w-full"
                placeholder="Contacto para seguimiento"
                value={saleForm.customerPhone}
                onChange={(event) =>
                  updateSaleForm({ customerPhone: event.target.value, customerId: "" })
                }
              />
            </label>

            <label className="text-xs text-slate-500">
              Correo electronico
              <input
                className="field mt-1 w-full"
                placeholder="Opcional"
                value={saleForm.customerEmail}
                onChange={(event) =>
                  updateSaleForm({ customerEmail: event.target.value, customerId: "" })
                }
              />
            </label>

            <label className="text-xs text-slate-500 md:col-span-2">
              Domicilio
              <input
                className="field mt-1 w-full"
                placeholder="Direccion del cliente"
                value={saleForm.customerAddress}
                onChange={(event) =>
                  updateSaleForm({ customerAddress: event.target.value, customerId: "" })
                }
              />
            </label>
          </div>
        </div>
      )}

      <p className="mt-3 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-600">
        La venta rapida muestra solo lo necesario. Si eliges cuenta corriente o un cliente registrado, se habilitan los datos adicionales del cliente.
      </p>

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

      <footer className="mt-4 rounded-2xl bg-slate-50 p-4 border border-slate-200">
        <div className="mb-3 flex items-center justify-between text-xs text-slate-600">
          <span className="uppercase tracking-wide font-semibold">Total</span>
          <span className="px-3 py-1 rounded-lg bg-slate-100 text-base font-bold text-slate-800 shadow-sm">{formatMoney(total)}</span>
        </div>
        <div className="mb-3">
          <button
            type="button"
            className="inline-flex items-center gap-2 text-xs text-slate-600 hover:text-slate-900"
            onClick={handleToggleObservaciones}
          >
            <StickyNote size={14} />
            {showObservaciones || saleForm.observaciones ? "Editar observaciones" : "Agregar observaciones"}
          </button>
          {showObservaciones || saleForm.observaciones ? (
            <textarea
              className="mt-2 w-full rounded-lg border border-slate-300 p-2 text-xs text-slate-700 focus:border-amber-400 focus:outline-none"
              rows={2}
              placeholder="Observaciones de la venta (opcional, se imprimen en el comprobante)"
              value={saleForm.observaciones || ""}
              onChange={handleObservacionesChange}
            />
          ) : null}
        </div>
        <button
          type="button"
          onClick={onCheckout}
          disabled={!items.length}
          className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-amber-400 px-4 py-2 text-sm font-semibold text-slate-900 transition hover:bg-amber-300 disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-400"
        >
          <Receipt size={15} />
          Confirmar venta
        </button>
      </footer>
    </div>
  );
}
