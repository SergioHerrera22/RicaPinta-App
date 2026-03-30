const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || "http://localhost:4000/api";

export const apiContracts = {
  auth: {
    login: {
      method: "POST",
      url: `${API_BASE_URL}/auth/login`,
      description: "Autenticacion de usuario por rol (admin o ventas)",
      body: { username: "admin", password: "admin123" },
    },
  },
  products: {
    list: {
      method: "GET",
      url: `${API_BASE_URL}/products`,
      description: "Obtiene productos con stock y precio actuales",
    },
    updateStock: {
      method: "PATCH",
      url: `${API_BASE_URL}/products/:id/stock`,
      description: "Ajusta stock de un producto en forma manual",
      body: { delta: 0 },
    },
    bulkPriceUpdate: {
      method: "PATCH",
      url: `${API_BASE_URL}/products/prices/bulk`,
      description:
        "Actualiza precios por porcentaje para todos o por categoria",
      body: { scope: "all", category: null, percent: 0 },
    },
  },
  sales: {
    create: {
      method: "POST",
      url: `${API_BASE_URL}/sales`,
      description:
        "Registra venta, descuenta stock y retorna comprobantes internos",
      body: {
        customerName: "Consumidor final",
        paymentMethod: "Efectivo",
        items: [{ productId: "P-001", quantity: 1, unitPrice: 1000 }],
      },
    },
  },
  vouchers: {
    print: {
      method: "GET",
      url: `${API_BASE_URL}/vouchers/:saleId`,
      description: "Recupera boleta para cliente y comprobante interno",
    },
  },
  sync: {
    pending: {
      method: "POST",
      url: `${API_BASE_URL}/sync/pending`,
      description: "Opcional: procesamiento server-side de cola offline",
      body: { operations: [] },
    },
  },
};

export const integrationNotes = [
  "Cambiar VITE_DATA_MODE a 'api' para activar fetch al backend.",
  "Autenticacion: /auth/login para perfiles admin y ventas.",
  "Persistencia final recomendada en backend conectado a Supabase.",
  "Mantener atomica la operacion de venta + descuento de stock.",
  "Si hay desconexion, las operaciones quedan en cola y luego se sincronizan.",
];
