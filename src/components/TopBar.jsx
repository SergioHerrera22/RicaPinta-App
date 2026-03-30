import { BarChart3, Boxes, ReceiptText, Wallet } from "lucide-react";
import { formatMoney } from "../utils/format";

const metricCards = [
  {
    id: "todaysSales",
    label: "Ventas de hoy",
    icon: Wallet,
    formatter: formatMoney,
    accent: "from-amber-400/30 to-orange-300/10",
  },
  {
    id: "inventoryValue",
    label: "Valor inventario",
    icon: BarChart3,
    formatter: formatMoney,
    accent: "from-teal-400/30 to-sky-400/10",
  },
  {
    id: "totalStock",
    label: "Unidades en stock",
    icon: Boxes,
    formatter: (value) => value,
    accent: "from-indigo-400/30 to-blue-300/10",
  },
  {
    id: "lowStockCount",
    label: "Productos bajo minimo",
    icon: ReceiptText,
    formatter: (value) => value,
    accent: "from-rose-400/30 to-red-300/10",
  },
];

export function TopBar({ metrics }) {
  return (
    <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      {metricCards.map((card, index) => {
        const Icon = card.icon;
        return (
          <article
            key={card.id}
            className="panel reveal-up"
            style={{ animationDelay: `${index * 90}ms` }}
          >
            <div
              className={`pointer-events-none absolute inset-0 bg-linear-to-br ${card.accent}`}
            />
            <div className="relative flex items-start justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                  {card.label}
                </p>
                <p className="mt-2 text-2xl font-semibold text-slate-900">
                  {card.formatter(metrics[card.id])}
                </p>
              </div>
              <span className="rounded-xl bg-white/70 p-2 text-slate-700 shadow-sm">
                <Icon size={18} />
              </span>
            </div>
          </article>
        );
      })}
    </section>
  );
}
