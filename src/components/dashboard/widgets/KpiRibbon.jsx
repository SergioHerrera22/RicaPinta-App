import { Activity, Boxes, BadgeDollarSign, Wifi } from "lucide-react";
import { formatMoney } from "../../../utils/format";

export default function KpiRibbon({
  metrics,
  avgTicket,
  todaySalesCount,
  isOnline,
}) {
  const cards = [
    {
      id: "todays-sales",
      label: "Ventas de hoy",
      value: formatMoney(metrics.todaysSales),
      detail: `${todaySalesCount} comprobantes`,
      icon: BadgeDollarSign,
    },
    {
      id: "avg-ticket",
      label: "Ticket promedio",
      value: formatMoney(avgTicket),
      detail: "Ritmo diario de caja",
      icon: Activity,
    },
    {
      id: "inventory-value",
      label: "Capital en stock",
      value: formatMoney(metrics.inventoryValue),
      detail: `${metrics.totalStock} unidades`,
      icon: Boxes,
    },
    {
      id: "status",
      label: "Estado operativo",
      value: isOnline ? "En linea" : "Sin conexion",
      detail: "Sincronizacion y sistema en marcha",
      icon: Wifi,
    },
  ];

  return (
    <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
      {cards.map((card) => {
        const Icon = card.icon;
        return (
          <article key={card.id} className="panel reveal-up">
            <div className="flex items-center justify-between gap-3">
              <p className="text-xs uppercase tracking-[0.18em] text-slate-500">
                {card.label}
              </p>
              <span className="rounded-full border border-slate-200 bg-slate-50 p-2 text-slate-600">
                <Icon size={14} />
              </span>
            </div>
            <p className="mt-2 text-2xl font-semibold text-slate-900">{card.value}</p>
            <p className="mt-1 text-xs text-slate-500">{card.detail}</p>
          </article>
        );
      })}
    </section>
  );
}
