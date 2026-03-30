import { Bot, ExternalLink, LoaderCircle, Search } from "lucide-react";
import { useMemo, useState } from "react";
import { formatMoney } from "../utils/format";
import { useAuthStore } from "../store/useAuthStore";

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL ||
  "https://ricapinta-backend.onrender.com/api";

const buildGoogleUrl = (query) =>
  `https://www.google.com/search?q=${encodeURIComponent(query)}`;

const parseJsonFromAiText = (text) => {
  const cleaned = String(text || "")
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/\s*```$/, "")
    .trim();

  return JSON.parse(cleaned);
};

const getTalkingPoints = (product) => {
  if (!product) {
    return [];
  }

  const basePoints = [
    `Marca: ${product.brand}`,
    `Categoria: ${product.category}`,
    `Codigo SKU: ${product.sku}`,
  ];

  if (product.category === "Pinturas") {
    return [
      ...basePoints,
      "Consulta al proveedor por rendimiento por litro y manos recomendadas.",
      "Verifica tiempo de secado y dilucion segun superficie.",
      "Confirmar uso interior/exterior y terminacion (mate/satinado/brillante).",
    ];
  }

  if (product.category === "Barnices") {
    return [
      ...basePoints,
      "Validar compatibilidad con madera y exposicion a intemperie.",
      "Revisar tiempo entre manos y curado final.",
      "Confirmar limpieza de herramientas y base del producto.",
    ];
  }

  return [
    ...basePoints,
    "Corroborar modo de uso recomendado por fabricante.",
    "Revisar hoja tecnica para cuidados y seguridad.",
    "Confirmar presentacion y compatibilidad con el trabajo del cliente.",
  ];
};

export function ProductTechLookupPanel({ products }) {
  const sortedProducts = useMemo(
    () => [...products].sort((a, b) => a.name.localeCompare(b.name)),
    [products],
  );

  const token = useAuthStore((s) => s.session?.token);
  const [selectedProductId, setSelectedProductId] = useState("");
  const [aiResult, setAiResult] = useState(null);
  const [isLoadingAi, setIsLoadingAi] = useState(false);
  const [aiError, setAiError] = useState("");

  const selectedProduct = useMemo(
    () =>
      sortedProducts.find((product) => product.id === selectedProductId) ||
      null,
    [selectedProductId, sortedProducts],
  );

  const searchSeed = selectedProduct
    ? `${selectedProduct.brand} ${selectedProduct.name}`
    : "";

  const links = selectedProduct
    ? [
        {
          id: "ficha",
          label: "Ficha tecnica",
          href: buildGoogleUrl(`${searchSeed} ficha tecnica PDF`),
        },
        {
          id: "seguridad",
          label: "Hoja de seguridad",
          href: buildGoogleUrl(`${searchSeed} hoja de seguridad SDS`),
        },
        {
          id: "aplicacion",
          label: "Rendimiento y aplicacion",
          href: buildGoogleUrl(`${searchSeed} rendimiento aplicacion`),
        },
      ]
    : [];

  const talkingPoints = getTalkingPoints(selectedProduct);

  const handleGenerateAiBrief = async () => {
    if (!selectedProduct) {
      window.alert("Selecciona un producto primero.");
      return;
    }

    setIsLoadingAi(true);
    setAiError("");
    setAiResult(null);

    try {
      const headers = { "Content-Type": "application/json" };
      if (token) headers["Authorization"] = `Bearer ${token}`;

      const response = await fetch(`${API_BASE_URL}/ai/product-brief`, {
        method: "POST",
        headers,
        body: JSON.stringify({
          productName: selectedProduct.name,
          brand: selectedProduct.brand,
          category: selectedProduct.category,
          sku: selectedProduct.sku,
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.ok) {
        throw new Error(
          data.message || `Error del servidor (${response.status})`,
        );
      }

      setAiResult(data.brief);
    } catch (err) {
      setAiError(
        err.message ||
          "No se pudo generar el analisis. Verifica que el servidor este activo.",
      );
    } finally {
      setIsLoadingAi(false);
    }
  };

  return (
    <section className="panel reveal-up">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h2 className="title">Asesor tecnico rapido</h2>
        <span className="rounded-full bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-700">
          Venta asistida
        </span>
      </div>

      <div className="grid gap-3 md:grid-cols-[1.2fr_auto_auto]">
        <label className="text-xs text-slate-500">
          Selecciona producto
          <select
            className="field mt-1 w-full"
            value={selectedProductId}
            onChange={(event) => {
              setSelectedProductId(event.target.value);
              setAiResult(null);
              setAiError("");
            }}
          >
            <option value="">Elegir producto...</option>
            {sortedProducts.map((product) => (
              <option key={product.id} value={product.id}>
                {product.name} - {product.brand}
              </option>
            ))}
          </select>
        </label>

        <a
          href={
            selectedProduct
              ? buildGoogleUrl(`${searchSeed} ficha tecnica datos clave`)
              : "#"
          }
          target="_blank"
          rel="noreferrer"
          onClick={(event) => {
            if (!selectedProduct) {
              event.preventDefault();
              window.alert(
                "Selecciona un producto para buscar informacion tecnica.",
              );
            }
          }}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 py-2 text-xs font-semibold text-white transition hover:bg-slate-700 md:self-end"
        >
          <Search size={14} />
          Buscar en internet
        </a>

        <button
          type="button"
          onClick={handleGenerateAiBrief}
          disabled={!selectedProduct || isLoadingAi}
          className="inline-flex items-center justify-center gap-2 rounded-xl border border-emerald-300 bg-emerald-50 px-4 py-2 text-xs font-semibold text-emerald-800 transition hover:bg-emerald-100 disabled:cursor-not-allowed disabled:opacity-60 md:self-end"
        >
          {isLoadingAi ? (
            <LoaderCircle size={14} className="animate-spin" />
          ) : (
            <Bot size={14} />
          )}
          Analizar con Gemini
        </button>
      </div>

      {!selectedProduct && (
        <p className="mt-3 rounded-xl border border-dashed border-slate-300 bg-slate-50 px-4 py-6 text-sm text-slate-600">
          Elige un producto para ver datos clave y abrir enlaces de ficha
          tecnica para atencion al cliente.
        </p>
      )}

      {selectedProduct && (
        <div className="mt-4 space-y-4">
          <div className="grid gap-3 md:grid-cols-4">
            <article className="rounded-xl border border-slate-200 bg-white p-3">
              <p className="text-xs uppercase tracking-[0.12em] text-slate-500">
                Marca
              </p>
              <p className="mt-1 text-sm font-semibold text-slate-900">
                {selectedProduct.brand}
              </p>
            </article>
            <article className="rounded-xl border border-slate-200 bg-white p-3">
              <p className="text-xs uppercase tracking-[0.12em] text-slate-500">
                Categoria
              </p>
              <p className="mt-1 text-sm font-semibold text-slate-900">
                {selectedProduct.category}
              </p>
            </article>
            <article className="rounded-xl border border-slate-200 bg-white p-3">
              <p className="text-xs uppercase tracking-[0.12em] text-slate-500">
                Precio
              </p>
              <p className="mt-1 text-sm font-semibold text-slate-900">
                {formatMoney(selectedProduct.price)}
              </p>
            </article>
            <article className="rounded-xl border border-slate-200 bg-white p-3">
              <p className="text-xs uppercase tracking-[0.12em] text-slate-500">
                Stock
              </p>
              <p className="mt-1 text-sm font-semibold text-slate-900">
                {selectedProduct.stock} u.
              </p>
            </article>
          </div>

          <article className="rounded-xl border border-slate-200 bg-white p-3">
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
              Puntos clave para explicar al cliente
            </p>
            <ul className="mt-2 space-y-1 text-sm text-slate-700">
              {talkingPoints.map((point) => (
                <li key={point}>- {point}</li>
              ))}
            </ul>
          </article>

          {aiError && (
            <p className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-700">
              {aiError}
            </p>
          )}

          {aiResult && (
            <article className="rounded-xl border border-emerald-200 bg-emerald-50/40 p-3">
              <p className="mb-2 text-xs font-semibold uppercase tracking-[0.12em] text-emerald-700">
                Resumen inteligente (Gemini)
              </p>
              <p className="text-sm text-slate-800">
                {aiResult.resumen || "Sin resumen"}
              </p>
              <div className="mt-3 grid gap-3 md:grid-cols-2">
                <div>
                  <p className="text-xs font-semibold text-slate-600">
                    Usos sugeridos
                  </p>
                  <ul className="mt-1 space-y-1 text-sm text-slate-700">
                    {(aiResult.usos || []).map((item) => (
                      <li key={item}>- {item}</li>
                    ))}
                  </ul>
                </div>
                <div>
                  <p className="text-xs font-semibold text-slate-600">
                    Superficies
                  </p>
                  <ul className="mt-1 space-y-1 text-sm text-slate-700">
                    {(aiResult.superficies || []).map((item) => (
                      <li key={item}>- {item}</li>
                    ))}
                  </ul>
                </div>
              </div>
              <div className="mt-3 grid gap-3 md:grid-cols-2">
                <p className="rounded-lg bg-white px-3 py-2 text-sm text-slate-700">
                  <strong>Rendimiento:</strong>{" "}
                  {aiResult.rendimiento || "Confirmar en ficha tecnica oficial"}
                </p>
                <p className="rounded-lg bg-white px-3 py-2 text-sm text-slate-700">
                  <strong>Secado:</strong>{" "}
                  {aiResult.secado || "Confirmar en ficha tecnica oficial"}
                </p>
              </div>
              <div className="mt-3 grid gap-3 md:grid-cols-2">
                <div>
                  <p className="text-xs font-semibold text-slate-600">
                    Precauciones
                  </p>
                  <ul className="mt-1 space-y-1 text-sm text-slate-700">
                    {(aiResult.precauciones || []).map((item) => (
                      <li key={item}>- {item}</li>
                    ))}
                  </ul>
                </div>
                <div>
                  <p className="text-xs font-semibold text-slate-600">
                    Preguntas para cerrar venta
                  </p>
                  <ul className="mt-1 space-y-1 text-sm text-slate-700">
                    {(aiResult.preguntasVenta || []).map((item) => (
                      <li key={item}>- {item}</li>
                    ))}
                  </ul>
                </div>
              </div>
            </article>
          )}

          <div className="grid gap-2 md:grid-cols-3">
            {links.map((link) => (
              <a
                key={link.id}
                href={link.href}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-700 transition hover:border-slate-400 hover:bg-white"
              >
                <span>{link.label}</span>
                <ExternalLink size={14} />
              </a>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}
