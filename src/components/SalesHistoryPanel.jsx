import { useMemo, useState } from "react";
import { DocumentsPanel } from "./DocumentsPanel";
import { formatMoney } from "../utils/format";

const atStartOfDay = (value) => {
  const date = new Date(value);
  date.setHours(0, 0, 0, 0);
  return date;
};

const atEndOfDay = (value) => {
  const date = new Date(value);
  date.setHours(23, 59, 59, 999);
  return date;
};

export function SalesHistoryPanel({ sales }) {
  const [filters, setFilters] = useState({
    from: "",
    to: "",
    client: "",
    paymentMethod: "Todas",
  });

  const normalizedClient = filters.client.trim().toLowerCase();

  const filteredSales = useMemo(
    () =>
      sales.filter((sale) => {
        const saleDate = new Date(sale.createdAt);

        if (filters.from && saleDate < atStartOfDay(filters.from)) {
          return false;
        }

        if (filters.to && saleDate > atEndOfDay(filters.to)) {
          return false;
        }

        if (
          normalizedClient &&
          !sale.customerName.toLowerCase().includes(normalizedClient)
        ) {
          return false;
        }

        if (
          filters.paymentMethod !== "Todas" &&
          sale.paymentMethod !== filters.paymentMethod
        ) {
          return false;
        }

        return true;
      }),
    [filters, normalizedClient, sales],
  );

  const salesSummary = useMemo(() => {
    const totalAmount = filteredSales.reduce(
      (acc, sale) => acc + sale.total,
      0,
    );
    const byPayment = filteredSales.reduce((acc, sale) => {
      acc[sale.paymentMethod] = (acc[sale.paymentMethod] || 0) + sale.total;
      return acc;
    }, {});

    return {
      count: filteredSales.length,
      totalAmount,
      byPayment,
    };
  }, [filteredSales]);

  return (
    <section className="space-y-4">
      <article className="panel reveal-up">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h2 className="title">Ventas realizadas</h2>
        </div>

        <div className="grid gap-3 md:grid-cols-4">
          <label className="text-xs text-slate-500">
            Desde
            <input
              type="date"
              className="field mt-1 w-full"
              value={filters.from}
              onChange={(event) =>
                setFilters((current) => ({
                  ...current,
                  from: event.target.value,
                }))
              }
            />
          </label>

          <label className="text-xs text-slate-500">
            Hasta
            <input
              type="date"
              className="field mt-1 w-full"
              value={filters.to}
              onChange={(event) =>
                setFilters((current) => ({
                  ...current,
                  to: event.target.value,
                }))
              }
            />
          </label>

          <label className="text-xs text-slate-500">
            Cliente
            <input
              type="text"
              className="field mt-1 w-full"
              placeholder="Buscar cliente"
              value={filters.client}
              onChange={(event) =>
                setFilters((current) => ({
                  ...current,
                  client: event.target.value,
                }))
              }
            />
          </label>

          <label className="text-xs text-slate-500">
            Medio de pago
            <select
              className="field mt-1 w-full"
              value={filters.paymentMethod}
              onChange={(event) =>
                setFilters((current) => ({
                  ...current,
                  paymentMethod: event.target.value,
                }))
              }
            >
              <option>Todas</option>
              <option>Efectivo</option>
              <option>Transferencia</option>
              <option>Debito</option>
              <option>Credito</option>
              <option>Cuenta corriente</option>
            </select>
          </label>

        </div>

        <div className="mt-4 grid gap-3 md:grid-cols-3">
          <div className="rounded-xl border border-slate-200 bg-white p-3">
            <p className="text-xs uppercase tracking-[0.12em] text-slate-500">
              Comprobantes
            </p>
            <p className="mt-1 text-xl font-semibold text-slate-900">
              {salesSummary.count}
            </p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-3">
            <p className="text-xs uppercase tracking-[0.12em] text-slate-500">
              Total vendido
            </p>
            <p className="mt-1 text-xl font-semibold text-slate-900">
              {formatMoney(salesSummary.totalAmount)}
            </p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-3">
            <p className="text-xs uppercase tracking-[0.12em] text-slate-500">
              Cuenta corriente
            </p>
            <p className="mt-1 text-xl font-semibold text-slate-900">
              {formatMoney(salesSummary.byPayment["Cuenta corriente"] || 0)}
            </p>
          </div>
        </div>

      </article>

      <DocumentsPanel
        documents={filteredSales}
        highlightedDocument={filteredSales[0] || null}
      />
    </section>
  );
}
