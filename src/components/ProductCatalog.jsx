import { useEffect, useRef, useState } from "react";
import {
  Plus,
  Search,
  Info,
  FileText,
  ClipboardEdit,
  AlertTriangle,
} from "lucide-react";
import { formatMoney } from "../utils/format";

export function ProductCatalog({
  products,
  categories,
  filters,
  autoFocusQuery = false,
  focusToken = 0,
  onQueryChange,
  onCategoryChange,
  onToggleLowStock,
  onAdd,
}) {
  const queryInputRef = useRef(null);
  const [selected, setSelected] = useState(null);
  const [showNote, setShowNote] = useState(false);
  const [note, setNote] = useState("");

  useEffect(() => {
    if (!queryInputRef.current) {
      return;
    }

    queryInputRef.current.focus();
    queryInputRef.current.select();
  }, [focusToken]);

  return (
    <div className="min-h-120">
      <div className="mb-4 flex flex-wrap gap-3">
        <label className="relative min-w-72 flex-1">
          <Search
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
            size={16}
          />
          <input
            ref={queryInputRef}
            type="text"
            value={filters.query}
            autoFocus={autoFocusQuery}
            onChange={(event) => {
              onQueryChange(event.target.value);
              setSelected(null);
            }}
            placeholder="Buscar por nombre, SKU o marca"
            className="field w-full pl-9"
            autoComplete="off"
          />
          {filters.query && !selected && (
            <div className="absolute left-0 right-0 top-full z-10 mt-1 rounded-xl border border-slate-200 bg-white shadow-lg max-h-64 overflow-auto">
              {products.length ? (
                products.slice(0, 10).map((product) => (
                  <button
                    key={product.id}
                    type="button"
                    className="flex w-full items-center justify-between px-4 py-2 text-left text-sm hover:bg-slate-50"
                    onClick={() => setSelected(product)}
                  >
                    <span>
                      <span className="font-semibold text-slate-900">
                        {product.name}
                      </span>
                      <span className="ml-2 text-xs text-slate-500">
                        {product.sku}
                      </span>
                    </span>
                    <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-700">
                      {product.category}
                    </span>
                  </button>
                ))
              ) : (
                <div className="px-4 py-3 text-center text-slate-500 text-xs">
                  No se encontraron productos.
                </div>
              )}
            </div>
          )}
        </label>
      </div>

      {selected ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-6 flex flex-col items-center gap-4">
          <div className="w-full flex flex-col md:flex-row md:items-center md:justify-between gap-2">
            <div>
              <div className="text-lg font-bold text-slate-900">
                {selected.name}
              </div>
              <div className="text-xs text-slate-500">SKU: {selected.sku}</div>
              <div className="text-xs text-slate-500">
                Categoría: {selected.category}
              </div>
              <div className="text-xs text-slate-500">
                Marca: {selected.brand || "-"}
              </div>
            </div>
            <div className="flex flex-col items-end gap-2">
              <span
                className={`rounded-full px-3 py-1 text-xs font-semibold ${selected.stock <= selected.minStock ? "bg-rose-50 text-rose-600" : "bg-emerald-50 text-emerald-700"}`}
              >
                Stock: {selected.stock} u.
              </span>
              <span className="text-base font-bold text-slate-800">
                {formatMoney(selected.price)}
              </span>
              <button
                type="button"
                onClick={() => onAdd(selected.id)}
                disabled={selected.stock <= 0}
                className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2 text-xs font-semibold text-white transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:bg-slate-300"
              >
                <Plus size={14} />
                Agregar al carrito
              </button>
            </div>
          </div>
          {selected.stock <= 0 && (
            <div className="mt-2 flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 px-4 py-2 text-sm text-rose-700">
              <AlertTriangle size={16} />
              Sin stock disponible para este producto.
            </div>
          )}
          <div className="mt-6 w-full flex flex-col md:flex-row gap-3">
            <button
              type="button"
              className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2 text-xs font-semibold text-slate-700 transition hover:border-slate-500"
              onClick={() => setShowNote((v) => !v)}
            >
              <ClipboardEdit size={14} />
              {showNote ? "Ocultar nota" : "Agregar nota"}
            </button>
            <button
              type="button"
              className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2 text-xs font-semibold text-slate-700 transition hover:border-slate-500"
            >
              <FileText size={14} />
              Ver historial de ventas
            </button>
            <button
              type="button"
              className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl border border-amber-300 bg-amber-50 px-4 py-2 text-xs font-semibold text-amber-800 transition hover:bg-amber-100"
            >
              <Info size={14} />
              Solicitar reposición
            </button>
          </div>
          {showNote && (
            <textarea
              className="mt-3 w-full rounded-lg border border-slate-300 p-2 text-xs text-slate-700 focus:border-amber-400 focus:outline-none"
              rows={2}
              placeholder="Nota sobre este producto (solo visible aquí)"
              value={note}
              onChange={(e) => setNote(e.target.value)}
            />
          )}
        </div>
      ) : null}
    </div>
  );
}
