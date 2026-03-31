import { Search, Sparkles } from "lucide-react";

const quickCommands = [
  { id: "create-sale", label: "Crear venta", shortcut: "G V" },
  { id: "view-sales", label: "Ver ventas recientes", shortcut: "G R" },
  { id: "manage-stock", label: "Ajustar stock", shortcut: "G S" },
  { id: "manage-prices", label: "Actualizar precios", shortcut: "G P" },
  { id: "open-orders", label: "Gestionar pedidos", shortcut: "G O" },
  { id: "open-account", label: "Cuenta corriente", shortcut: "G C" },
];

export default function CommandCenterWidget({ onRunCommand }) {
  return (
    <article className="panel reveal-up">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="title">Centro de acciones</h2>
        <span className="inline-flex items-center gap-1 rounded-full bg-slate-900 px-2 py-1 text-xs font-semibold text-white">
          <Sparkles size={12} />
          K
        </span>
      </div>

      <div className="mb-3 flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-500">
        <Search size={14} />
        Buscador global para entrar rapido a ventas, stock, pedidos o cuenta corriente.
      </div>

      <div className="grid gap-2 sm:grid-cols-2">
        {quickCommands.map((command) => (
          <button
            key={command.id}
            type="button"
            onClick={() => onRunCommand?.(command.id)}
            className="flex items-center justify-between rounded-xl border border-slate-200 bg-white px-3 py-2 text-left text-sm text-slate-700 transition hover:border-slate-400"
          >
            <span className="font-medium">{command.label}</span>
            <span className="rounded-md bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-500">
              {command.shortcut}
            </span>
          </button>
        ))}
      </div>
    </article>
  );
}
