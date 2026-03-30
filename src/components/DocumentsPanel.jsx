import { FileText, Printer, X } from "lucide-react";
import { useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { formatDateTime, formatMoney } from "../utils/format";

export function DocumentsPanel({ documents = [], highlightedDocument = null }) {
  const [selectedDocument, setSelectedDocument] = useState(null);

  const canUsePortal = typeof document !== "undefined";

  const sortedDocuments = useMemo(
    () =>
      [...documents].sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      ),
    [documents],
  );

  const buildPrintHtml = (document) => {
    if (!document) {
      return "";
    }

    const subtotal = document.items.reduce(
      (acc, item) => acc + item.quantity * item.unitPrice,
      0,
    );
    const ivaRate = 0.21;
    const neto = Math.round(subtotal / (1 + ivaRate));
    const iva = subtotal - neto;

    const rows = document.items
      .map(
        (item) => `
          <tr>
            <td class="num">${item.quantity}</td>
            <td>
              <div class="item-name">${item.name}</div>
              <div class="item-sub">SKU: ${item.sku || "-"}</div>
            </td>
            <td class="num">${formatMoney(item.unitPrice)}</td>
            <td class="num strong">${formatMoney(item.subtotal)}</td>
          </tr>
        `,
      )
      .join("");

    return `
      <!doctype html>
      <html>
        <head>
          <meta charset="utf-8" />
          <title>Boleta consumidor final</title>
          <style>
            @page { size: A4; margin: 12mm; }
            * { box-sizing: border-box; }
            body { font-family: 'Segoe UI', Arial, sans-serif; margin: 0; padding: 0; color: #111; background: #fff; }
            .ticket { width: 100%; max-width: 186mm; margin: 0 auto; border: 1px solid #d9d9d9; padding: 8mm; }
            .center { text-align: center; }
            .small { font-size: 11px; }
            .muted { color: #666; }
            .section { margin-top: 8px; }
            .row { display: flex; justify-content: space-between; gap: 8px; margin: 2px 0; }
            .title { font-weight: 800; font-size: 16px; letter-spacing: 0.6px; }
            .subtitle { font-size: 10px; letter-spacing: 1px; text-transform: uppercase; }
            .separator { border-top: 1px dashed #bdbdbd; margin: 8px 0; }
            table { width: 100%; border-collapse: collapse; font-size: 11px; }
            thead th { text-align: left; font-size: 10px; text-transform: uppercase; color: #555; border-bottom: 1px solid #cfcfcf; padding: 4px 2px; }
            tbody td { padding: 5px 2px; border-bottom: 1px dashed #ddd; vertical-align: top; }
            .num { text-align: right; white-space: nowrap; }
            .strong { font-weight: 700; }
            .item-name { font-weight: 600; }
            .item-sub { font-size: 10px; color: #666; margin-top: 2px; }
            .totals { margin-top: 8px; }
            .totals .row { font-size: 11px; }
            .grand-total { font-size: 17px; font-weight: 800; margin-top: 4px; }
            .tag { display: inline-block; border: 1px solid #111; padding: 1px 6px; font-size: 10px; font-weight: 700; }

            @media print {
              .ticket { border: 1px solid #bdbdbd; }
            }
          </style>
        </head>
        <body>
          <div class="ticket">
            <div class="center">
              <div class="title">RicaPinta</div>
              <div class="small">Av Uruguay, Mediagua San Juan.</div>
              <div class="small">Tel : 2646725647 o 2646307645</div>
              <div class="separator"></div>
              <div class="subtitle">Comprobante consumidor final</div>
              <div style="margin-top:4px;"><span class="tag">ORIGINAL</span></div>
            </div>

            <div class="section small">
              <div class="row"><span><strong>Comprobante:</strong></span><span>${document.ticketNumber}</span></div>
              <div class="row"><span><strong>Fecha:</strong></span><span>${formatDateTime(document.createdAt)}</span></div>
              <div class="row"><span><strong>Cliente:</strong></span><span>${document.customerName}</span></div>
              <div class="row"><span><strong>Pago:</strong></span><span>${document.paymentMethod}</span></div>
              <div class="row"><span><strong>Operacion:</strong></span><span>${document.id || "-"}</span></div>
            </div>

            <div class="separator"></div>
            <div class="section">
              <table>
                <thead>
                  <tr>
                    <th>Cant</th>
                    <th>Descripcion</th>
                    <th class="num">Unit</th>
                    <th class="num">Subtotal</th>
                  </tr>
                </thead>
                <tbody>
                  ${rows}
                </tbody>
              </table>
            </div>

            <div class="totals">
              <div class="row"><span>Subtotal</span><span>${formatMoney(subtotal)}</span></div>
              <div class="row"><span>Neto gravado</span><span>${formatMoney(neto)}</span></div>
              <div class="row"><span>IVA 21%</span><span>${formatMoney(iva)}</span></div>
              <div class="row grand-total"><span>TOTAL</span><span>${formatMoney(document.total)}</span></div>
            </div>

            <div class="separator"></div>
            <div class="center small muted">Gracias por su compra.</div>
            <div class="center small muted">Conserve este comprobante.</div>
          </div>

          <script>
            window.onload = function () { window.print(); };
          </script>
        </body>
      </html>
    `;
  };

  const handlePrint = () => {
    if (!selectedDocument) {
      return;
    }

    const printWindow = window.open("", "_blank", "width=480,height=720");
    if (!printWindow) {
      window.alert(
        "No se pudo abrir la ventana de impresion. Revisa el bloqueo de ventanas emergentes.",
      );
      return;
    }

    printWindow.document.open();
    printWindow.document.write(buildPrintHtml(selectedDocument));
    printWindow.document.close();
  };

  return (
    <section className="panel reveal-up">
      <div className="no-print mb-3 flex items-center justify-between">
        <h2 className="title">Comprobantes de ventas</h2>
        <span className="rounded-full bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-700">
          {sortedDocuments.length} comprobantes
        </span>
      </div>

      {!sortedDocuments.length && (
        <p className="no-print rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-4 py-8 text-center text-sm text-slate-500">
          Cuando confirmes una venta aparecera aqui el comprobante.
        </p>
      )}

      {sortedDocuments.length > 0 && (
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase tracking-[0.12em] text-slate-500">
              <tr>
                <th className="px-4 py-3">Comprobante</th>
                <th className="px-4 py-3">Fecha</th>
                <th className="px-4 py-3">Cliente</th>
                <th className="px-4 py-3 text-right">Total</th>
                <th className="px-4 py-3 text-right">Accion</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {sortedDocuments.map((doc) => (
                <tr
                  key={doc.id}
                  className={`hover:bg-slate-50 ${
                    highlightedDocument?.id === doc.id ? "bg-amber-50/70" : ""
                  }`}
                >
                  <td className="px-4 py-3 font-semibold text-slate-900">
                    {doc.ticketNumber}
                  </td>
                  <td className="px-4 py-3 text-slate-600">
                    {formatDateTime(doc.createdAt)}
                  </td>
                  <td className="px-4 py-3 text-slate-700">
                    {doc.customerName}
                  </td>
                  <td className="px-4 py-3 text-right font-semibold text-slate-900">
                    {formatMoney(doc.total)}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      type="button"
                      onClick={() => setSelectedDocument(doc)}
                      className="inline-flex items-center gap-2 rounded-xl border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:border-slate-500"
                    >
                      <FileText size={14} />
                      Ver detalle
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {selectedDocument &&
        canUsePortal &&
        createPortal(
          <div className="fixed inset-0 z-9999 flex items-center justify-center bg-slate-950/50 p-4">
            <article className="max-h-[90vh] w-full max-w-2xl overflow-auto rounded-2xl border border-slate-200 bg-white p-5 text-slate-900 shadow-xl">
              <div className="mb-3 flex items-center justify-between">
                <h3 className="title">Detalle del comprobante</h3>
                <button
                  type="button"
                  onClick={() => setSelectedDocument(null)}
                  className="rounded-lg border border-slate-300 p-1 text-slate-600 transition hover:border-slate-500"
                >
                  <X size={16} />
                </button>
              </div>

              <header className="mb-4 border-b border-dashed border-slate-300 pb-3 text-center">
                <p className="text-lg font-bold tracking-wide">RicaPinta</p>
                <p className="text-sm">Av Uruguay, Mediagua San Juan.</p>
                <p className="text-sm">Tel : 2646725647 o 2646307645</p>
                <p className="mt-2 text-xs uppercase tracking-[0.16em] text-slate-500">
                  Comprobante consumidor final
                </p>
              </header>

              <div className="mb-4 grid gap-1 text-sm">
                <p>
                  <strong>Comprobante:</strong> {selectedDocument.ticketNumber}
                </p>
                <p>
                  <strong>Fecha:</strong>{" "}
                  {formatDateTime(selectedDocument.createdAt)}
                </p>
                <p>
                  <strong>Cliente:</strong> {selectedDocument.customerName}
                </p>
                <p>
                  <strong>Pago:</strong> {selectedDocument.paymentMethod}
                </p>
              </div>

              <div className="mb-4 overflow-hidden rounded-xl border border-slate-200">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                    <tr>
                      <th className="px-2 py-2 text-left">Cant</th>
                      <th className="px-2 py-2 text-left">Descripcion</th>
                      <th className="px-2 py-2 text-right">Unit</th>
                      <th className="px-2 py-2 text-right">Subtotal</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedDocument.items.map((item) => (
                      <tr
                        key={item.productId}
                        className="border-t border-slate-100"
                      >
                        <td className="px-2 py-2">{item.quantity}</td>
                        <td className="px-2 py-2">{item.name}</td>
                        <td className="px-2 py-2 text-right">
                          {formatMoney(item.unitPrice)}
                        </td>
                        <td className="px-2 py-2 text-right font-semibold">
                          {formatMoney(item.subtotal)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <footer className="border-t border-dashed border-slate-300 pt-3">
                <p className="text-right text-lg font-bold">
                  TOTAL: {formatMoney(selectedDocument.total)}
                </p>
                <div className="mt-3 flex items-center justify-between gap-2 text-xs text-slate-600">
                  <div className="inline-flex items-center gap-2">
                    <FileText size={14} />
                    <span>Gracias por su compra.</span>
                  </div>
                  <button
                    type="button"
                    onClick={handlePrint}
                    className="inline-flex items-center gap-2 rounded-xl border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-700 transition hover:border-slate-500"
                  >
                    <Printer size={14} />
                    Imprimir
                  </button>
                </div>
              </footer>
            </article>
          </div>,
          document.body,
        )}
    </section>
  );
}
