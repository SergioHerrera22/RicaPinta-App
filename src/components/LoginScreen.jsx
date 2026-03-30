import { LockKeyhole, UserRound } from "lucide-react";
import { useState } from "react";

export function LoginScreen({ onLogin, loading }) {
  const [username, setUsername] = useState("admin");
  const [password, setPassword] = useState("admin123");

  const handleSubmit = async (event) => {
    event.preventDefault();
    const result = await onLogin({ username, password });

    if (!result.ok) {
      window.alert(result.message || "No se pudo iniciar sesion.");
    }
  };

  return (
    <div className="min-h-screen w-full bg-app-pattern px-4 py-8">
      <div className="mx-auto grid max-w-5xl gap-4 lg:grid-cols-[1.25fr_1fr]">
        <section className="panel reveal-up flex flex-col justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">
              RicaPinta App
            </p>
            <h1 className="mt-3 text-3xl font-semibold text-slate-900 md:text-4xl">
              Control total de ventas, stock y precios
            </h1>
            <p className="mt-3 max-w-xl text-sm text-slate-600">
              Inicia sesion para operar la caja y gestionar el inventario. El
              sistema queda listo para integracion con backend/Supabase y cuenta
              con cola offline para no perder operaciones.
            </p>
          </div>

          <ul className="mt-6 grid gap-2 text-sm text-slate-700">
            <li className="rounded-xl bg-slate-50 px-3 py-2">
              Perfil admin: ventas, ajustes de stock y cambios masivos de
              precios.
            </li>
            <li className="rounded-xl bg-slate-50 px-3 py-2">
              Perfil ventas: flujo rapido de venta y consulta de stock.
            </li>
          </ul>
        </section>

        <form onSubmit={handleSubmit} className="panel reveal-up">
          <h2 className="title mb-4">Iniciar sesion</h2>

          <label className="mb-3 block">
            <span className="mb-1 block text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
              Usuario
            </span>
            <div className="relative">
              <UserRound
                size={16}
                className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
              />
              <input
                className="field w-full pl-9"
                value={username}
                onChange={(event) => setUsername(event.target.value)}
                placeholder="admin o ventas"
              />
            </div>
          </label>

          <label className="mb-4 block">
            <span className="mb-1 block text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
              Clave
            </span>
            <div className="relative">
              <LockKeyhole
                size={16}
                className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
              />
              <input
                type="password"
                className="field w-full pl-9"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="admin123 o ventas123"
              />
            </div>
          </label>

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:bg-slate-400"
          >
            {loading ? "Ingresando..." : "Ingresar"}
          </button>
        </form>
      </div>
    </div>
  );
}
