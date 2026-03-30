import {
  MessageCircle,
  Plus,
  Printer,
  TrendingDown,
  TrendingUp,
  Wallet,
} from "lucide-react";
import { useMemo, useState } from "react";
import { formatDateTime, formatMoney } from "../utils/format";

const normalizePhone = (phone) => String(phone || "").replace(/[^0-9]/g, "");

const makeMonthKey = (value) => {
  const date = value instanceof Date ? value : new Date(value);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
};

const formatMonthLabel = (monthKey) => {
  if (!monthKey) {
    return "";
  }

  const [year, month] = String(monthKey).split("-");
  const date = new Date(Number(year), Number(month) - 1, 1);

  if (Number.isNaN(date.getTime())) {
    return monthKey;
  }

  return new Intl.DateTimeFormat("es-AR", {
    month: "long",
    year: "numeric",
  }).format(date);
};

const printHtmlInHiddenFrame = (html) => {
  if (typeof document === "undefined") {
    return false;
  }

  const iframe = document.createElement("iframe");
  iframe.style.position = "fixed";
  iframe.style.right = "0";
  iframe.style.bottom = "0";
  iframe.style.width = "0";
  iframe.style.height = "0";
  iframe.style.border = "0";
  iframe.style.opacity = "0";
  iframe.setAttribute("aria-hidden", "true");

  document.body.appendChild(iframe);

  const frameDoc = iframe.contentDocument || iframe.contentWindow?.document;
  if (!frameDoc || !iframe.contentWindow) {
    iframe.remove();
    return false;
  }

  frameDoc.open();
  frameDoc.write(html);
  frameDoc.close();

  const cleanup = () => {
    window.setTimeout(() => iframe.remove(), 150);
  };

  window.setTimeout(() => {
    const printWindow = iframe.contentWindow;
    if (!printWindow) {
      cleanup();
      return;
    }

    printWindow.onafterprint = cleanup;
    printWindow.focus();
    printWindow.print();
    window.setTimeout(cleanup, 3000);
  }, 180);

  return true;
};

export function CurrentAccountPanel({
  sales,
  clientContacts,
  accountMovements,
  onUpsertClientContact,
  onRegisterAccountPayment,
}) {
  const [accountForm, setAccountForm] = useState({
    clientName: "",
    phone: "",
    month: makeMonthKey(new Date()),
    paymentAmount: "",
    paymentNote: "",
  });

  const knownClients = useMemo(() => {
    const names = new Set(
      sales
        .map((sale) => sale.customerName)
        .filter((name) => name && name !== "Consumidor final"),
    );

    clientContacts.forEach((contact) => names.add(contact.name));

    return [...names].sort((a, b) => a.localeCompare(b));
  }, [clientContacts, sales]);

  const selectedClientContact = useMemo(
    () =>
      clientContacts.find(
        (contact) =>
          contact.name.toLowerCase() === accountForm.clientName.toLowerCase(),
      ) || null,
    [accountForm.clientName, clientContacts],
  );

  const handleClientNameChange = (value) => {
    const matched = clientContacts.find(
      (contact) => contact.name.toLowerCase() === value.trim().toLowerCase(),
    );

    setAccountForm((current) => ({
      ...current,
      clientName: value,
      phone: matched?.phone || current.phone,
    }));
  };

  const clientMovements = useMemo(() => {
    const key = accountForm.clientName.trim().toLowerCase();
    if (!key) {
      return [];
    }

    return accountMovements
      .filter((movement) => movement.clientName.toLowerCase() === key)
      .sort(
        (a, b) =>
          new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
      );
  }, [accountForm.clientName, accountMovements]);

  const monthlyStatement = useMemo(() => {
    if (!accountForm.month || !clientMovements.length) {
      return { openingBalance: 0, rows: [], closingBalance: 0 };
    }

    let openingBalance = 0;
    const rows = [];
    let runningBalance = 0;

    clientMovements.forEach((movement) => {
      const movementMonth = makeMonthKey(movement.createdAt);
      const signedAmount =
        movement.type === "debit" ? movement.amount : -movement.amount;

      if (movementMonth < accountForm.month) {
        openingBalance += signedAmount;
        return;
      }

      if (movementMonth === accountForm.month) {
        runningBalance += signedAmount;
        rows.push({
          ...movement,
          balance: openingBalance + runningBalance,
        });
      }
    });

    return {
      openingBalance,
      rows,
      closingBalance: openingBalance + runningBalance,
    };
  }, [accountForm.month, clientMovements]);

  const accountOverview = useMemo(() => {
    const totalBalance = clientMovements.reduce((acc, movement) => {
      const signed =
        movement.type === "debit" ? movement.amount : -movement.amount;
      return acc + signed;
    }, 0);

    const monthDebits = monthlyStatement.rows
      .filter((row) => row.type === "debit")
      .reduce((acc, row) => acc + row.amount, 0);

    const monthCredits = monthlyStatement.rows
      .filter((row) => row.type === "credit")
      .reduce((acc, row) => acc + row.amount, 0);

    const salesInMonth = sales.filter((sale) => {
      const sameClient =
        sale.customerName.toLowerCase() ===
        accountForm.clientName.trim().toLowerCase();
      const sameMonth = makeMonthKey(sale.createdAt) === accountForm.month;
      return (
        sameClient && sameMonth && sale.paymentMethod === "Cuenta corriente"
      );
    });

    const lastPayment = [...clientMovements]
      .reverse()
      .find((movement) => movement.type === "credit");

    return {
      totalBalance,
      monthDebits,
      monthCredits,
      salesCountInMonth: salesInMonth.length,
      lastPaymentAt: lastPayment?.createdAt || null,
    };
  }, [
    accountForm.clientName,
    accountForm.month,
    clientMovements,
    monthlyStatement.rows,
    sales,
  ]);

  const buildStatementMessage = () => {
    const name = accountForm.clientName.trim();
    const monthLabel = formatMonthLabel(accountForm.month);

    const lines = [
      `Hola ${name},`,
      "",
      `Le compartimos su estado de cuenta correspondiente a ${monthLabel}.`,
      "",
      "Detalle de movimientos:",
      "",
      ...monthlyStatement.rows.map((row) => {
        const label = row.type === "debit" ? "Venta" : "Pago";
        const sign = row.type === "debit" ? "+" : "-";
        return `- ${formatDateTime(row.createdAt)} | ${label} | ${row.reference} | ${sign}${formatMoney(row.amount)}`;
      }),
      "",
      `Saldo inicial del periodo: ${formatMoney(monthlyStatement.openingBalance)}`,
      `Saldo final del periodo: ${formatMoney(monthlyStatement.closingBalance)}`,
      "",
      "RicaPinta",
      "Av Uruguay, Mediagua San Juan",
      "Tel: 2646725647 / 2646307645",
    ];

    return lines.join("\n");
  };

  const buildStatementPrintHtml = () => {
    const clientName = accountForm.clientName.trim();
    const monthLabel = formatMonthLabel(accountForm.month);

    const rowsHtml = monthlyStatement.rows
      .map((row) => {
        const detail = row.type === "debit" ? "Venta" : "Pago";
        const sign = row.type === "debit" ? "+" : "-";
        return `
          <tr>
            <td>${formatDateTime(row.createdAt)}</td>
            <td>${detail}</td>
            <td>${row.reference}</td>
            <td class="num">${sign}${formatMoney(row.amount)}</td>
            <td class="num">${formatMoney(row.balance)}</td>
          </tr>
        `;
      })
      .join("");

    return `
      <!doctype html>
      <html>
        <head>
          <meta charset="utf-8" />
          <title>Estado de cuenta - ${clientName || "Cliente"}</title>
          <style>
            @page { size: A4; margin: 12mm; }
            * { box-sizing: border-box; }
            body { margin: 0; color: #111827; font-family: 'Segoe UI', Arial, sans-serif; background: #fff; }
            .sheet { width: 100%; max-width: 186mm; margin: 0 auto; border: 1px solid #d1d5db; padding: 10mm; }
            .header { display: flex; justify-content: space-between; gap: 16px; border-bottom: 1px dashed #9ca3af; padding-bottom: 10px; }
            .brand { font-size: 20px; font-weight: 800; letter-spacing: 0.5px; }
            .muted { color: #6b7280; font-size: 12px; }
            .title { margin-top: 12px; font-size: 16px; font-weight: 700; }
            .meta { margin-top: 6px; font-size: 12px; line-height: 1.5; }
            table { width: 100%; border-collapse: collapse; margin-top: 14px; font-size: 12px; }
            thead th { text-align: left; font-size: 10px; text-transform: uppercase; letter-spacing: 0.08em; color: #6b7280; border-bottom: 1px solid #d1d5db; padding: 7px 4px; }
            tbody td { border-bottom: 1px dashed #e5e7eb; padding: 7px 4px; vertical-align: top; }
            .num { text-align: right; white-space: nowrap; font-variant-numeric: tabular-nums; }
            .totals { margin-top: 12px; margin-left: auto; width: 320px; font-size: 12px; }
            .total-row { display: flex; justify-content: space-between; padding: 4px 0; border-bottom: 1px dashed #e5e7eb; }
            .total-final { font-size: 16px; font-weight: 800; border-bottom: 0; padding-top: 8px; }
            .footer { margin-top: 16px; padding-top: 10px; border-top: 1px dashed #9ca3af; font-size: 11px; color: #4b5563; }
          </style>
        </head>
        <body>
          <main class="sheet">
            <div class="header">
              <div>
                <div class="brand">RicaPinta</div>
                <div class="muted">Av Uruguay, Mediagua San Juan</div>
                <div class="muted">Tel: 2646725647 / 2646307645</div>
              </div>
              <div class="muted">Fecha de emision: ${formatDateTime(new Date())}</div>
            </div>

            <div class="title">Estado de cuenta mensual</div>
            <div class="meta">
              <div><strong>Cliente:</strong> ${clientName || "-"}</div>
              <div><strong>Periodo:</strong> ${monthLabel || "-"}</div>
            </div>

            <table>
              <thead>
                <tr>
                  <th>Fecha</th>
                  <th>Tipo</th>
                  <th>Referencia</th>
                  <th class="num">Importe</th>
                  <th class="num">Saldo</th>
                </tr>
              </thead>
              <tbody>
                ${rowsHtml}
              </tbody>
            </table>

            <section class="totals">
              <div class="total-row">
                <span>Saldo inicial</span>
                <strong>${formatMoney(monthlyStatement.openingBalance)}</strong>
              </div>
              <div class="total-row total-final">
                <span>Saldo final</span>
                <strong>${formatMoney(monthlyStatement.closingBalance)}</strong>
              </div>
            </section>

            <div class="footer">
              Comprobante interno generado automaticamente para seguimiento de cuenta corriente.
            </div>
          </main>

          <script>
            window.onload = function () { window.print(); };
          </script>
        </body>
      </html>
    `;
  };

  const handleExportStatementPdf = () => {
    if (
      !accountForm.clientName ||
      !accountForm.month ||
      !monthlyStatement.rows.length
    ) {
      window.alert(
        "Selecciona cliente y mes con movimientos para exportar el estado de cuenta.",
      );
      return;
    }

    const ok = printHtmlInHiddenFrame(buildStatementPrintHtml());
    if (!ok) {
      window.alert("No se pudo preparar la impresion del estado de cuenta.");
    }
  };

  const statementWhatsappLink = (() => {
    const phone = normalizePhone(
      accountForm.phone || selectedClientContact?.phone,
    );
    if (!phone || !accountForm.clientName || !monthlyStatement.rows.length) {
      return null;
    }

    return `https://wa.me/${phone}?text=${encodeURIComponent(buildStatementMessage())}`;
  })();

  const handleSaveClient = () => {
    const result = onUpsertClientContact({
      name: accountForm.clientName,
      phone: accountForm.phone,
    });

    if (!result.ok) {
      window.alert(result.message);
      return;
    }

    window.alert("Cliente actualizado para cuenta corriente.");
  };

  const handleRegisterPayment = () => {
    const result = onRegisterAccountPayment({
      clientName: accountForm.clientName,
      amount: accountForm.paymentAmount,
      note: accountForm.paymentNote,
    });

    if (!result.ok) {
      window.alert(result.message);
      return;
    }

    setAccountForm((current) => ({
      ...current,
      paymentAmount: "",
      paymentNote: "",
    }));
  };

  return (
    <section className="space-y-4">
      <article className="panel reveal-up">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h2 className="title">Cuenta corriente</h2>
          <span className="rounded-full bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-700">
            Estado mensual por cliente
          </span>
        </div>

        <div className="grid gap-3 md:grid-cols-4">
          <label className="text-xs text-slate-500">
            Cliente
            <input
              list="clients-list"
              className="field mt-1 w-full"
              placeholder="Nombre del cliente"
              value={accountForm.clientName}
              onChange={(event) => handleClientNameChange(event.target.value)}
            />
            <datalist id="clients-list">
              {knownClients.map((name) => (
                <option key={name} value={name} />
              ))}
            </datalist>
          </label>

          <label className="text-xs text-slate-500">
            Telefono WhatsApp
            <input
              className="field mt-1 w-full"
              placeholder="264..."
              value={accountForm.phone}
              onChange={(event) =>
                setAccountForm((current) => ({
                  ...current,
                  phone: event.target.value,
                }))
              }
            />
          </label>

          <label className="text-xs text-slate-500">
            Mes
            <input
              type="month"
              className="field mt-1 w-full"
              value={accountForm.month}
              onChange={(event) =>
                setAccountForm((current) => ({
                  ...current,
                  month: event.target.value,
                }))
              }
            />
          </label>

          <div className="flex items-end gap-2">
            <button
              type="button"
              onClick={handleSaveClient}
              className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-3 py-2 text-xs font-semibold text-white transition hover:bg-slate-700"
            >
              <Plus size={14} />
              Guardar cliente
            </button>
          </div>
        </div>

        <div className="mt-4 grid gap-3 md:grid-cols-4">
          <article className="rounded-xl border border-slate-200 bg-white p-3">
            <p className="text-xs uppercase tracking-[0.12em] text-slate-500">
              Saldo actual cliente
            </p>
            <p className="mt-1 inline-flex items-center gap-1 text-lg font-semibold text-slate-900">
              <Wallet size={16} />
              {formatMoney(accountOverview.totalBalance)}
            </p>
          </article>

          <article className="rounded-xl border border-slate-200 bg-white p-3">
            <p className="text-xs uppercase tracking-[0.12em] text-slate-500">
              Ventas del mes
            </p>
            <p className="mt-1 inline-flex items-center gap-1 text-lg font-semibold text-rose-700">
              <TrendingUp size={16} />
              {formatMoney(accountOverview.monthDebits)}
            </p>
          </article>

          <article className="rounded-xl border border-slate-200 bg-white p-3">
            <p className="text-xs uppercase tracking-[0.12em] text-slate-500">
              Pagos del mes
            </p>
            <p className="mt-1 inline-flex items-center gap-1 text-lg font-semibold text-emerald-700">
              <TrendingDown size={16} />
              {formatMoney(accountOverview.monthCredits)}
            </p>
          </article>

          <article className="rounded-xl border border-slate-200 bg-white p-3">
            <p className="text-xs uppercase tracking-[0.12em] text-slate-500">
              Ultimo pago
            </p>
            <p className="mt-1 text-sm font-semibold text-slate-900">
              {accountOverview.lastPaymentAt
                ? formatDateTime(accountOverview.lastPaymentAt)
                : "Sin pagos registrados"}
            </p>
            <p className="mt-1 text-xs text-slate-500">
              Ventas en cta cte (mes): {accountOverview.salesCountInMonth}
            </p>
          </article>
        </div>

        <div className="mt-3 grid gap-3 md:grid-cols-[1fr_1fr_auto]">
          <label className="text-xs text-slate-500">
            Registrar pago
            <input
              type="number"
              min={1}
              className="field mt-1 w-full"
              placeholder="Importe"
              value={accountForm.paymentAmount}
              onChange={(event) =>
                setAccountForm((current) => ({
                  ...current,
                  paymentAmount: event.target.value,
                }))
              }
            />
          </label>
          <label className="text-xs text-slate-500">
            Referencia
            <input
              className="field mt-1 w-full"
              placeholder="Ej: pago parcial"
              value={accountForm.paymentNote}
              onChange={(event) =>
                setAccountForm((current) => ({
                  ...current,
                  paymentNote: event.target.value,
                }))
              }
            />
          </label>
          <div className="flex items-end">
            <button
              type="button"
              onClick={handleRegisterPayment}
              className="rounded-xl border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-700 transition hover:border-slate-500"
            >
              Registrar pago
            </button>
          </div>
        </div>

        <div className="mt-4 overflow-hidden rounded-2xl border border-slate-200 bg-white">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase tracking-[0.12em] text-slate-500">
              <tr>
                <th className="px-4 py-3">Fecha</th>
                <th className="px-4 py-3">Comprobante / Ref.</th>
                <th className="px-4 py-3">Tipo</th>
                <th className="px-4 py-3 text-right">Debe</th>
                <th className="px-4 py-3 text-right">Haber</th>
                <th className="px-4 py-3 text-right">Saldo</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {monthlyStatement.rows.map((row) => (
                <tr key={row.id}>
                  <td className="px-4 py-3 text-slate-600">
                    {formatDateTime(row.createdAt)}
                  </td>
                  <td className="px-4 py-3 text-slate-800">{row.reference}</td>
                  <td className="px-4 py-3 text-slate-700">
                    <span
                      className={`rounded-full px-2 py-1 text-xs font-semibold ${
                        row.type === "debit"
                          ? "bg-rose-50 text-rose-700"
                          : "bg-emerald-50 text-emerald-700"
                      }`}
                    >
                      {row.type === "debit" ? "Venta" : "Pago"}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right font-semibold text-slate-900">
                    {row.type === "debit" ? formatMoney(row.amount) : "-"}
                  </td>
                  <td className="px-4 py-3 text-right font-semibold text-slate-900">
                    {row.type === "credit" ? formatMoney(row.amount) : "-"}
                  </td>
                  <td className="px-4 py-3 text-right font-semibold text-slate-900">
                    {formatMoney(row.balance)}
                  </td>
                </tr>
              ))}

              {!monthlyStatement.rows.length && (
                <tr>
                  <td
                    colSpan={6}
                    className="px-4 py-8 text-center text-slate-500"
                  >
                    Selecciona cliente y mes para ver el estado de cuenta.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="mt-3 flex flex-wrap items-center justify-between gap-3 rounded-xl bg-slate-50 p-3 text-sm text-slate-700">
          <p>
            Saldo inicial:{" "}
            <strong>{formatMoney(monthlyStatement.openingBalance)}</strong> ·
            Saldo final:{" "}
            <strong>{formatMoney(monthlyStatement.closingBalance)}</strong>
          </p>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={handleExportStatementPdf}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-700 transition hover:border-slate-500"
            >
              <Printer size={14} />
              Exportar PDF
            </button>

            <a
              href={statementWhatsappLink || "#"}
              target="_blank"
              rel="noreferrer"
              onClick={(event) => {
                if (!statementWhatsappLink) {
                  event.preventDefault();
                  window.alert(
                    "Completa cliente, telefono y movimientos del mes para enviar el estado por WhatsApp.",
                  );
                }
              }}
              className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-3 py-2 text-xs font-semibold text-white transition hover:bg-emerald-500"
            >
              <MessageCircle size={14} />
              Enviar estado por WhatsApp
            </a>
          </div>
        </div>
      </article>
    </section>
  );
}
