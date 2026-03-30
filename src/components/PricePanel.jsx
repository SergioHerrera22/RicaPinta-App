import { useState } from "react";
import { formatMoney } from "../utils/format";

export function PricePanel({
  products,
  categories,
  onApplyBulk,
  canUpdatePrices,
}) {
  const [scope, setScope] = useState("category");
  const [category, setCategory] = useState(categories[0]);
  const [percent, setPercent] = useState("5");

  const handleApply = () => {
    onApplyBulk({ scope, category, percent });
  };

  return (
    <section className="panel reveal-up">
      <h2 className="title mb-3">Actualizacion masiva de precios</h2>
      <div className="grid gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4 md:grid-cols-4">
        <select
          className="field"
          disabled={!canUpdatePrices}
          value={scope}
          onChange={(event) => setScope(event.target.value)}
        >
          <option value="category">Por categoria</option>
          <option value="all">Todo el catalogo</option>
        </select>

        <select
          className="field"
          disabled={scope === "all" || !canUpdatePrices}
          value={category}
          onChange={(event) => setCategory(event.target.value)}
        >
          {categories.map((item) => (
            <option key={item} value={item}>
              {item}
            </option>
          ))}
        </select>

        <input
          className="field"
          type="number"
          step="0.1"
          disabled={!canUpdatePrices}
          value={percent}
          onChange={(event) => setPercent(event.target.value)}
          placeholder="Porcentaje"
        />

        <button
          disabled={!canUpdatePrices}
          className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:bg-slate-400"
          onClick={handleApply}
        >
          Aplicar cambio
        </button>
      </div>

      {!canUpdatePrices && (
        <p className="mt-3 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
          Solo el perfil admin puede ejecutar cambios masivos de precios.
        </p>
      )}

      <p className="mt-3 text-sm text-slate-600">
        Ejemplo: si cargas <strong>5</strong>, el sistema aplica un aumento del
        5% sobre el precio actual.
      </p>

      <div className="mt-4 overflow-hidden rounded-2xl border border-slate-200">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 text-xs uppercase tracking-[0.12em] text-slate-500">
            <tr>
              <th className="px-4 py-3">Producto</th>
              <th className="px-4 py-3">Categoria</th>
              <th className="px-4 py-3">Precio actual</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {products.map((product) => (
              <tr key={product.id}>
                <td className="px-4 py-3 font-medium text-slate-900">
                  {product.name}
                </td>
                <td className="px-4 py-3 text-slate-600">{product.category}</td>
                <td className="px-4 py-3 text-slate-800">
                  {formatMoney(product.price)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
