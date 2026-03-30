import { create } from "zustand";
import { persist } from "zustand/middleware";
import { loginUser } from "../services/apiClient";

const USERS = [
  {
    username: "admin",
    password: "admin123",
    role: "admin",
    name: "Administrador",
  },
  {
    username: "ventas",
    password: "ventas123",
    role: "ventas",
    name: "Operador Ventas",
  },
];

export const rolePermissions = {
  admin: {
    modules: [
      "ventas",
      "ventas-realizadas",
      "cuenta-corriente",
      "stock",
      "precios",
      "pedidos",
    ],
    canAdjustStock: true,
    canUpdatePrices: true,
  },
  ventas: {
    modules: [
      "ventas",
      "ventas-realizadas",
      "cuenta-corriente",
      "stock",
      "pedidos",
    ],
    canAdjustStock: false,
    canUpdatePrices: false,
  },
};

const DATA_MODE = import.meta.env.VITE_DATA_MODE || "local";

export const useAuthStore = create(
  persist(
    (set) => ({
      session: null,
      isAuthenticating: false,

      login: async ({ username, password }) => {
        set({ isAuthenticating: true });

        try {
          if (DATA_MODE === "api") {
            const apiResult = await loginUser({ username, password });
            const role = apiResult?.session?.role || "ventas";
            set({
              session: {
                username: apiResult?.session?.username || username,
                name: apiResult?.session?.name || username,
                role,
                token: apiResult?.token || null,
              },
              isAuthenticating: false,
            });
            return { ok: true };
          }

          const localUser = USERS.find(
            (user) => user.username === username && user.password === password,
          );

          if (!localUser) {
            set({ isAuthenticating: false });
            return { ok: false, message: "Credenciales invalidas." };
          }

          set({
            session: {
              username: localUser.username,
              name: localUser.name,
              role: localUser.role,
              token: null,
            },
            isAuthenticating: false,
          });

          return { ok: true };
        } catch {
          set({ isAuthenticating: false });
          return {
            ok: false,
            message: "No se pudo autenticar contra backend.",
          };
        }
      },

      logout: () => set({ session: null }),
    }),
    {
      name: "ricapinta-auth-session-v1",
      partialize: (state) => ({ session: state.session }),
    },
  ),
);
