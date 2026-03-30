import { Pencil, Trash2 } from "lucide-react";
import { useState } from "react";

const EMPTY_FORM = {
  name: "",
  sku: "",
  category: "Pinturas",
  brand: "",
  stock: "",
  minStock: "5",
  cost: "",
  price: "",
};

export function StockPanel({
  products,
  onAdjustStock,
  canAdjustStock,
  onImportProducts,
  onUpdateProduct,
  onDeleteProduct,
}) {
  const [showImportModal, setShowImportModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [editForm, setEditForm] = useState(EMPTY_FORM);
  const [customQuantities, setCustomQuantities] = useState({});
  const [importFormData, setImportFormData] = useState({
    name: "",
    sku: "",
    category: "Pinturas",
    stock: "",
    minStock: "5",
    cost: "",
    price: "",
    brand: "",
  });

  const handleCustomQuantityChange = (productId, value) => {
    const parsed = parseInt(value) || 0;
    if (parsed >= 0) {
      setCustomQuantities((prev) => ({
        ...prev,
        [productId]: parsed,
      }));
    }
  };

  const handleAddCustomQuantity = (productId) => {
    const qty = customQuantities[productId];
    if (qty && qty > 0) {
      onAdjustStock(productId, qty);
      setCustomQuantities((prev) => {
        const next = { ...prev };
        delete next[productId];
        return next;
      });
    }
  };

  const handleEditOpen = (product) => {
    setEditingProduct(product);
    setEditForm({
      name: product.name,
      sku: product.sku,
      category: product.category,
      brand: product.brand,
      stock: String(product.stock),
      minStock: String(product.minStock ?? product.min_stock ?? 5),
      cost: String(product.cost),
      price: String(product.price),
    });
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    if (!editForm.name.trim() || !editForm.sku.trim()) {
      window.alert("Nombre y SKU son obligatorios.");
      return;
    }
    if (onUpdateProduct) {
      const result = await onUpdateProduct(editingProduct.id, editForm);
      if (result?.ok === false) {
        window.alert(result.message || "Error al actualizar.");
        return;
      }
    }
    setEditingProduct(null);
  };

  const handleDelete = async (product) => {
    if (!window.confirm(`¿Eliminar "${product.name}"? Esta acción no se puede deshacer.`)) return;
    if (onDeleteProduct) {
      const result = await onDeleteProduct(product.id);
      if (result?.ok === false) {
        window.alert(result.message || "No se pudo eliminar.");
      }
    }
  };

  const handleImportSubmit = (e) => {
    e.preventDefault();

    const cost = parseInt(importFormData.cost);
    const price = parseInt(importFormData.price);
    const stock = parseInt(importFormData.stock);
    const minStock = parseInt(importFormData.minStock);

    if (!importFormData.name.trim() || !importFormData.sku.trim()) {
      window.alert("Por favor completa nombre y SKU del producto.");
      return;
    }

    if (isNaN(cost) || isNaN(price) || isNaN(stock) || isNaN(minStock)) {
      window.alert("Por favor completa todos los números correctamente.");
      return;
    }

    if (onImportProducts) {
      onImportProducts({
        name: importFormData.name.trim(),
        sku: importFormData.sku.trim(),
        category: importFormData.category,
        stock: Math.max(0, stock),
        minStock: Math.max(0, minStock),
        cost,
        price,
        brand: importFormData.brand.trim() || "Sin marca",
      });
    }

    setImportFormData({
      name: "",
      sku: "",
      category: "Pinturas",
      stock: "",
      minStock: "5",
      cost: "",
      price: "",
      brand: "",
    });
    setShowImportModal(false);
  };

  return (
    <section className="panel reveal-up">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="title">Control de stock</h2>
        {canAdjustStock && (
          <button
            onClick={() => setShowImportModal(true)}
            className="rounded-lg bg-teal-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-teal-700 active:scale-95"
          >
            + Importar Producto
          </button>
        )}
      </div>

      {showImportModal && (
        <div className="mb-4 rounded-2xl border border-teal-200 bg-teal-50 p-4">
          <h3 className="mb-3 font-semibold text-slate-900">
            Importar nuevo producto
          </h3>
          <form onSubmit={handleImportSubmit} className="space-y-3">
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Nombre *
                </label>
                <input
                  type="text"
                  value={importFormData.name}
                  onChange={(e) =>
                    setImportFormData({
                      ...importFormData,
                      name: e.target.value,
                    })
                  }
                  placeholder="Ej: Latex Interior 20L"
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  SKU *
                </label>
                <input
                  type="text"
                  value={importFormData.sku}
                  onChange={(e) =>
                    setImportFormData({
                      ...importFormData,
                      sku: e.target.value,
                    })
                  }
                  placeholder="Ej: PIN-LAT-20"
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Categoría
                </label>
                <select
                  value={importFormData.category}
                  onChange={(e) =>
                    setImportFormData({
                      ...importFormData,
                      category: e.target.value,
                    })
                  }
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                >
                  <option>Pinturas</option>
                  <option>Rodillos</option>
                  <option>Pinceles</option>
                  <option>Barnices</option>
                  <option>Accesorios</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Marca
                </label>
                <input
                  type="text"
                  value={importFormData.brand}
                  onChange={(e) =>
                    setImportFormData({
                      ...importFormData,
                      brand: e.target.value,
                    })
                  }
                  placeholder="Ej: ColorMax"
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Stock inicial *
                </label>
                <input
                  type="number"
                  value={importFormData.stock}
                  onChange={(e) =>
                    setImportFormData({
                      ...importFormData,
                      stock: e.target.value,
                    })
                  }
                  placeholder="0"
                  min="0"
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Stock mínimo
                </label>
                <input
                  type="number"
                  value={importFormData.minStock}
                  onChange={(e) =>
                    setImportFormData({
                      ...importFormData,
                      minStock: e.target.value,
                    })
                  }
                  placeholder="5"
                  min="0"
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Costo *
                </label>
                <input
                  type="number"
                  value={importFormData.cost}
                  onChange={(e) =>
                    setImportFormData({
                      ...importFormData,
                      cost: e.target.value,
                    })
                  }
                  placeholder="0"
                  min="0"
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Precio *
                </label>
                <input
                  type="number"
                  value={importFormData.price}
                  onChange={(e) =>
                    setImportFormData({
                      ...importFormData,
                      price: e.target.value,
                    })
                  }
                  placeholder="0"
                  min="0"
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                />
              </div>
            </div>
            <div className="flex gap-2">
              <button
                type="submit"
                className="rounded-lg bg-teal-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-teal-700 active:scale-95"
              >
                Importar
              </button>
              <button
                type="button"
                onClick={() => setShowImportModal(false)}
                className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-slate-500"
              >
                Cancelar
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Modal editar producto */}
      {editingProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-lg rounded-2xl bg-white p-5 shadow-xl">
            <h3 className="mb-4 text-base font-bold text-slate-900">Editar producto</h3>
            <form onSubmit={handleEditSubmit} className="space-y-3">
              <div className="grid gap-3 sm:grid-cols-2">
                {[
                  { label: "Nombre *", key: "name", type: "text", placeholder: "Ej: Latex Interior 20L" },
                  { label: "SKU *", key: "sku", type: "text", placeholder: "Ej: PIN-LAT-20" },
                  { label: "Marca", key: "brand", type: "text", placeholder: "Ej: ColorMax" },
                  { label: "Stock", key: "stock", type: "number", placeholder: "0" },
                  { label: "Stock mínimo", key: "minStock", type: "number", placeholder: "5" },
                  { label: "Costo", key: "cost", type: "number", placeholder: "0" },
                  { label: "Precio", key: "price", type: "number", placeholder: "0" },
                ].map(({ label, key, type, placeholder }) => (
                  <div key={key}>
                    <label className="mb-1 block text-xs font-semibold text-slate-700">{label}</label>
                    <input
                      type={type}
                      value={editForm[key]}
                      onChange={(e) => setEditForm({ ...editForm, [key]: e.target.value })}
                      placeholder={placeholder}
                      min={type === "number" ? "0" : undefined}
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-400 focus:outline-none"
                    />
                  </div>
                ))}
                <div>
                  <label className="mb-1 block text-xs font-semibold text-slate-700">Categoría</label>
                  <select
                    value={editForm.category}
                    onChange={(e) => setEditForm({ ...editForm, category: e.target.value })}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-400 focus:outline-none"
                  >
                    {["Pinturas", "Rodillos", "Pinceles", "Barnices", "Accesorios"].map((c) => (
                      <option key={c}>{c}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="flex gap-2 pt-1">
                <button type="submit" className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-700 active:scale-95">
                  Guardar cambios
                </button>
                <button type="button" onClick={() => setEditingProduct(null)} className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-slate-500">
                  Cancelar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="overflow-hidden rounded-2xl border border-slate-200">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 text-xs uppercase tracking-[0.12em] text-slate-500">
            <tr>
              <th className="px-4 py-3">Producto</th>
              <th className="px-4 py-3">Stock actual</th>
              <th className="px-4 py-3">Stock mínimo</th>
              <th className="px-4 py-3 text-right">Ajuste rápido</th>
              {canAdjustStock && <th className="px-4 py-3 text-right">Acciones</th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {products.map((product) => (
              <tr key={product.id}>
                <td className="px-4 py-3">
                  <p className="font-semibold text-slate-900">{product.name}</p>
                  <p className="text-xs text-slate-500">{product.sku}</p>
                </td>
                <td className="px-4 py-3 font-medium">
                  <span
                    className={
                      product.stock <= product.minStock
                        ? "text-orange-600 font-bold"
                        : ""
                    }
                  >
                    {product.stock}
                  </span>
                </td>
                <td className="px-4 py-3 text-slate-600">{product.minStock}</td>
                <td className="px-4 py-3">
                  <div className="space-y-2">
                    <div className="flex justify-end gap-2">
                      <button
                        disabled={!canAdjustStock}
                        className="rounded-lg border border-slate-300 px-3 py-1 text-xs font-semibold text-slate-700 transition hover:border-slate-500 disabled:cursor-not-allowed disabled:border-slate-200 disabled:text-slate-300"
                        onClick={() => onAdjustStock(product.id, -1)}
                      >
                        -1
                      </button>
                      <button
                        disabled={!canAdjustStock}
                        className="rounded-lg border border-slate-300 px-3 py-1 text-xs font-semibold text-slate-700 transition hover:border-slate-500 disabled:cursor-not-allowed disabled:border-slate-200 disabled:text-slate-300"
                        onClick={() => onAdjustStock(product.id, 1)}
                      >
                        +1
                      </button>
                      <button
                        disabled={!canAdjustStock}
                        className="rounded-lg border border-teal-300 bg-teal-50 px-3 py-1 text-xs font-semibold text-teal-700 transition hover:bg-teal-100 disabled:cursor-not-allowed disabled:border-slate-200 disabled:bg-slate-100 disabled:text-slate-300"
                        onClick={() => onAdjustStock(product.id, 5)}
                      >
                        +5
                      </button>
                    </div>
                    {canAdjustStock && (
                      <div className="flex justify-end gap-2">
                        <input
                          type="number"
                          min="0"
                          value={customQuantities[product.id] ?? ""}
                          onChange={(e) =>
                            handleCustomQuantityChange(
                              product.id,
                              e.target.value,
                            )
                          }
                          placeholder="Cant."
                          className="w-16 rounded-lg border border-slate-300 px-2 py-1 text-xs"
                        />
                        <button
                          disabled={!customQuantities[product.id]}
                          onClick={() => handleAddCustomQuantity(product.id)}
                          className="rounded-lg bg-blue-600 px-3 py-1 text-xs font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-slate-300"
                        >
                          +
                        </button>
                      </div>
                    )}
                  </div>
                  {!canAdjustStock && (
                    <p className="mt-1 text-right text-[11px] text-slate-500">
                      Solo lectura para perfil ventas
                    </p>
                  )}
                </td>
                {canAdjustStock && (
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-2">
                      <button
                        onClick={() => handleEditOpen(product)}
                        className="flex items-center gap-1 rounded-lg border border-blue-300 bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700 transition hover:bg-blue-100"
                      >
                        <Pencil size={12} /> Editar
                      </button>
                      <button
                        onClick={() => handleDelete(product)}
                        className="flex items-center gap-1 rounded-lg border border-rose-300 bg-rose-50 px-3 py-1 text-xs font-semibold text-rose-700 transition hover:bg-rose-100"
                      >
                        <Trash2 size={12} /> Eliminar
                      </button>
                    </div>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
