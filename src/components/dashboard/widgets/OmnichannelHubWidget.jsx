const channels = [
  { id: "local", label: "Mostrador", status: "Activo" },
  { id: "web", label: "Web", status: "Sincronizado" },
  { id: "social", label: "Redes", status: "En monitoreo" },
];

export default function OmnichannelHubWidget({ isOnline, queueDepth }) {
  return (
    <article className="panel reveal-up">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="title">Centro de ventas unificadas</h2>
        <span
          className={`rounded-full px-2 py-1 text-xs font-semibold ${
            isOnline
              ? "bg-emerald-50 text-emerald-700"
              : "bg-rose-50 text-rose-700"
          }`}
        >
          {isOnline ? "Tiempo real" : "Modo diferido"}
        </span>
      </div>

      <div className="space-y-2">
        {channels.map((channel) => (
          <div
            key={channel.id}
            className="flex items-center justify-between rounded-xl border border-slate-200 bg-white px-3 py-2"
          >
            <p className="text-sm font-semibold text-slate-900">
              {channel.label}
            </p>
            <p className="text-xs font-semibold text-slate-500">
              {channel.status}
            </p>
          </div>
        ))}
      </div>

      <p className="mt-3 rounded-xl border border-dashed border-slate-300 bg-slate-50 px-3 py-2 text-xs text-slate-600">
        Cola pendiente actual: {queueDepth}. Cuando vuelves online, el sistema
        sincroniza operaciones automaticamente.
      </p>
    </article>
  );
}
