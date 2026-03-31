import { useMemo } from "react";
import { formatMoney } from "../../../utils/format";

const days = ["Dom", "Lun", "Mar", "Mie", "Jue", "Vie", "Sab"];

export default function SalesPulseWidget({ sales }) {
  const chart = useMemo(() => {
    const buckets = Array.from({ length: 7 }, (_, index) => ({
      day: days[index],
      total: 0,
    }));

    sales.forEach((sale) => {
      const date = new Date(sale.createdAt);
      const key = date.getDay();
      buckets[key].total += sale.total;
    });

    const maxValue = Math.max(...buckets.map((item) => item.total), 1);

    return { buckets, maxValue };
  }, [sales]);

  return (
    <article className="panel reveal-up">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="title">Inicio inteligente · Ritmo de ventas</h2>
        <span className="rounded-full bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-600">
          Ultimos 7 dias
        </span>
      </div>

      <div className="space-y-2">
        {chart.buckets.map((item) => {
          const width = Math.max(6, (item.total / chart.maxValue) * 100);
          return (
            <div key={item.day}>
              <div className="mb-1 flex items-center justify-between text-xs text-slate-500">
                <span>{item.day}</span>
                <span>{formatMoney(item.total)}</span>
              </div>
              <div className="h-2 rounded-full bg-slate-100">
                <div
                  className="h-2 rounded-full bg-linear-to-r from-cyan-500 to-emerald-500 transition-all duration-500"
                  style={{ width: `${width}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </article>
  );
}
