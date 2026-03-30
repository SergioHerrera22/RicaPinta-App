import { apiContracts } from "./apiContracts";
import { useAuthStore } from "../store/useAuthStore";

const DEFAULT_HEADERS = {
  "Content-Type": "application/json",
};

const withPathParam = (template, paramName, value) =>
  template.replace(`:${paramName}`, encodeURIComponent(value));

async function request(url, options = {}) {
  const headers = { ...DEFAULT_HEADERS };

  // Agregar token JWT si está disponible
  const session = useAuthStore.getState().session;
  if (session?.token) {
    headers["Authorization"] = `Bearer ${session.token}`;
  }

  const response = await fetch(url, {
    ...options,
    headers: {
      ...headers,
      ...(options.headers || {}),
    },
  });

  // Si token expirado (401), desloguear
  if (response.status === 401) {
    useAuthStore.getState().logout();
    window.location.href = "/login";
    throw new Error("Sesión expirada. Por favor, ingresa de nuevo.");
  }

  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || `Error HTTP ${response.status}`);
  }

  if (response.status === 204) {
    return null;
  }

  return response.json();
}

export async function fetchProducts() {
  return request(apiContracts.products.list.url, {
    method: apiContracts.products.list.method,
  });
}

export async function adjustProductStock(productId, delta) {
  return request(
    withPathParam(apiContracts.products.updateStock.url, "id", productId),
    {
      method: apiContracts.products.updateStock.method,
      body: JSON.stringify({ delta }),
    },
  );
}

export async function bulkUpdatePrices(payload) {
  return request(apiContracts.products.bulkPriceUpdate.url, {
    method: apiContracts.products.bulkPriceUpdate.method,
    body: JSON.stringify(payload),
  });
}

export async function createSale(payload) {
  return request(apiContracts.sales.create.url, {
    method: apiContracts.sales.create.method,
    body: JSON.stringify(payload),
  });
}

export async function loginUser(payload) {
  return request(apiContracts.auth.login.url, {
    method: apiContracts.auth.login.method,
    body: JSON.stringify(payload),
  });
}

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL ||
  "https://ricapinta-backend.onrender.com/api";

export async function createProduct(payload) {
  return request(`${API_BASE_URL}/products`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function updateProduct(id, payload) {
  return request(`${API_BASE_URL}/products/${encodeURIComponent(id)}`, {
    method: "PUT",
    body: JSON.stringify(payload),
  });
}

export async function deleteProduct(id) {
  return request(`${API_BASE_URL}/products/${encodeURIComponent(id)}`, {
    method: "DELETE",
  });
}
