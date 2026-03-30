import { Plus, Search } from "lucide-react";
import { formatMoney } from "../utils/format";

export function ProductCatalog({
  products,
  categories,
  filters,
  onQueryChange,
  onCategoryChange,
  onToggleLowStock,
  onAdd,
}) {
  return (
    <section className="panel reveal-up min-h-120">
      <div className="mb-4 flex flex-wrap gap-3">
        <label className="relative min-w-72 flex-1">
          <Search
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
            size={16}
          />
          <input
            type="text"
            value={filters.query}
            onChange={(event) => onQueryChange(event.target.value)}
            placeholder="Buscar por nombre, SKU o marca"
            className="field w-full pl-9"
          />
        </label>

        <select
          value={filters.category}
          onChange={(event) => onCategoryChange(event.target.value)}
          className="field min-w-44"
        >
          <option value="Todas">Todas las categorias</option>
          {categories.map((category) => (
            <option key={category} value={category}>
              {category}
            </option>
          ))}
        </select>

        <button
          type="button"
          onClick={onToggleLowStock}
          className={`pill ${filters.lowStockOnly ? "pill-active" : ""}`}
        >
          Solo bajo stock
        </button>
      </div>

      <div className="overflow-hidden rounded-2xl border border-slate-200">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 text-xs uppercase tracking-[0.12em] text-slate-500">
            <tr>
              <th className="px-4 py-3">Producto</th>
              <th className="px-4 py-3">Categoria</th>
              <th className="px-4 py-3">Stock</th>
              <th className="px-4 py-3">Precio</th>
              <th className="px-4 py-3 text-right">Accion</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 bg-white">
            {products.map((product) => (
              <tr key={product.id} className="transition hover:bg-slate-50/80">
                <td className="px-4 py-3">
                  <p className="font-semibold text-slate-900">{product.name}</p>
                  <p className="text-xs text-slate-500">{product.sku}</p>
                </td>
                <td className="px-4 py-3 text-slate-600">{product.category}</td>
                <td className="px-4 py-3">
                  <span
                    className={`rounded-full px-2 py-1 text-xs font-semibold ${
                      product.stock <= product.minStock
                        ? "bg-rose-50 text-rose-600"
                        : "bg-emerald-50 text-emerald-700"
                    }`}
                  >
                    {product.stock} u.
                  </span>
                </td>
                <td className="px-4 py-3 font-medium text-slate-800">
                  {formatMoney(product.price)}
                </td>
                <td className="px-4 py-3 text-right">
                  <button
                    type="button"
                    onClick={() => onAdd(product.id)}
                    disabled={product.stock <= 0}
                    className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:bg-slate-300"
                  >
                    <Plus size={14} />
                    Agregar
                  </button>
                </td>
              </tr>
            ))}
            {!products.length && (
              <tr>
                <td
                  colSpan={5}
                  className="px-4 py-10 text-center text-slate-500"
                >
                  No se encontraron productos con estos filtros.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
