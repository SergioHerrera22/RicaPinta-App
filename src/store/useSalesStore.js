import { create } from "zustand";
import { persist } from "zustand/middleware";
import { categories, initialProducts } from "../data/mockProducts";
import {
  adjustProductStock,
  bulkUpdatePrices,
  createProduct,
  createSale,
  deleteProduct,
  fetchProducts,
  updateProduct,
} from "../services/apiClient";
import {
  buildPendingOperation,
  runPendingOperation,
} from "../services/offlineSync";

const DATA_MODE = import.meta.env.VITE_DATA_MODE || "local";
const isBrowser = typeof window !== "undefined";

const roundPrice = (value) => Math.round(value);

const makeDocumentNumbers = (saleNumber) => ({
  internalNumber: `INT-${String(saleNumber).padStart(6, "0")}`,
  ticketNumber: `BOL-${String(saleNumber).padStart(6, "0")}`,
});

const updateStockLocal = (products, productId, delta) =>
  products.map((product) => {
    if (product.id !== productId) {
      return product;
    }

    return {
      ...product,
      stock: Math.max(0, product.stock + delta),
    };
  });

const updatePricesLocal = (products, { scope, category, percent }) => {
  const factor = 1 + Number(percent) / 100;
  const targetCategory = scope === "category" ? category : null;

  return products.map((product) => {
    const shouldApply = !targetCategory || product.category === targetCategory;
    if (!shouldApply) {
      return product;
    }

    return {
      ...product,
      price: roundPrice(product.price * factor),
    };
  });
};

const buildSaleFromState = (state, { customerName, paymentMethod }) => {
  const saleNumber = state.recentSales.length + 1;
  const stamp = new Date().toISOString();
  const numbers = makeDocumentNumbers(saleNumber);

  const items = state.cart
    .map((cartItem) => {
      const product = state.products.find(
        (item) => item.id === cartItem.productId,
      );
      if (!product) {
        return null;
      }

      return {
        productId: product.id,
        sku: product.sku,
        name: product.name,
        quantity: cartItem.quantity,
        unitPrice: cartItem.unitPrice,
        subtotal: cartItem.quantity * cartItem.unitPrice,
      };
    })
    .filter(Boolean);

  const total = items.reduce((acc, item) => acc + item.subtotal, 0);

  const sale = {
    id: `SALE-${String(saleNumber).padStart(6, "0")}`,
    createdAt: stamp,
    customerName: customerName?.trim() || "Consumidor final",
    paymentMethod,
    total,
    internalNumber: numbers.internalNumber,
    ticketNumber: numbers.ticketNumber,
    items,
  };

  return sale;
};

const applySaleToStock = (products, items) =>
  products.map((product) => {
    const soldItem = items.find((item) => item.productId === product.id);
    if (!soldItem) {
      return product;
    }

    return {
      ...product,
      stock: Math.max(0, product.stock - soldItem.quantity),
    };
  });

const makeId = (prefix) =>
  `${prefix}-${Date.now()}-${Math.floor(Math.random() * 100000)}`;

const normalizeName = (name) =>
  String(name || "")
    .trim()
    .toLowerCase();

const getTodayKey = () => new Date().toISOString().slice(0, 10);

const getSuggestedOrderQty = (product) =>
  Math.max(1, (product.minStock || 2) - product.stock);

const upsertClientContactList = (contacts, nextContact) => {
  const key = normalizeName(nextContact.name);
  const existing = contacts.find(
    (contact) => normalizeName(contact.name) === key,
  );

  if (!existing) {
    return [...contacts, { id: makeId("CLI"), ...nextContact }];
  }

  return contacts.map((contact) =>
    contact.id === existing.id
      ? {
          ...contact,
          phone: nextContact.phone || contact.phone,
        }
      : contact,
  );
};

const upsertCriticalOrders = (orders, products) => {
  const nextOrders = [...orders];

  products
    .filter((product) => product.stock <= 2)
    .forEach((product) => {
      const exists = nextOrders.some((order) => order.productId === product.id);
      if (!exists) {
        nextOrders.push({
          id: makeId("ORDER"),
          productId: product.id,
          sku: product.sku,
          name: product.name,
          stock: product.stock,
          neededQuantity: getSuggestedOrderQty(product),
          supplierId: null,
          createdAt: new Date().toISOString(),
        });
      }
    });

  return nextOrders.map((order) => {
    const product = products.find((item) => item.id === order.productId);
    if (!product) {
      return order;
    }

    return {
      ...order,
      stock: product.stock,
      neededQuantity: Math.max(
        order.neededQuantity,
        getSuggestedOrderQty(product),
      ),
    };
  });
};

export const useSalesStore = create(
  persist(
    (set, get) => ({
      products: initialProducts,
      categories,
      filters: {
        query: "",
        category: "Todas",
        lowStockOnly: false,
      },
      cart: [],
      recentSales: [],
      lastDocument: null,
      activeModule: "ventas",
      clientContacts: [],
      accountMovements: [],
      purchaseOrders: [],
      suppliers: [],
      lastDailyCheckDate: null,
      pendingOperations: [],
      isOnline: isBrowser ? window.navigator.onLine : true,
      isSyncing: false,
      isBootstrapping: false,
      lastSyncAt: null,

      setOnlineStatus: (isOnline) => set({ isOnline }),

      initialize: async () => {
        if (DATA_MODE !== "api") {
          return;
        }

        const state = get();
        if (!state.isOnline) {
          return;
        }

        set({ isBootstrapping: true });

        try {
          const result = await fetchProducts();
          const apiProducts = Array.isArray(result) ? result : result?.items;

          if (Array.isArray(apiProducts) && apiProducts.length) {
            set((store) => ({
              products: apiProducts,
              purchaseOrders: upsertCriticalOrders(
                store.purchaseOrders,
                apiProducts,
              ),
            }));
          }
        } catch {
          // El front sigue operativo en modo local aunque falle el backend.
        } finally {
          set({ isBootstrapping: false });
        }
      },

      setActiveModule: (module) => set({ activeModule: module }),
      setQuery: (query) =>
        set((state) => ({ filters: { ...state.filters, query } })),
      setCategory: (category) =>
        set((state) => ({ filters: { ...state.filters, category } })),
      toggleLowStock: () =>
        set((state) => ({
          filters: {
            ...state.filters,
            lowStockOnly: !state.filters.lowStockOnly,
          },
        })),

      runDailyStockCheck: () => {
        const state = get();
        const today = getTodayKey();
        if (state.lastDailyCheckDate === today) {
          return {
            isNewDay: false,
            lowStockProducts: state.products.filter(
              (item) => item.stock <= item.minStock,
            ),
          };
        }

        const lowStockProducts = state.products.filter(
          (item) => item.stock <= item.minStock,
        );

        set((store) => ({
          lastDailyCheckDate: today,
          purchaseOrders: upsertCriticalOrders(
            store.purchaseOrders,
            store.products,
          ),
        }));

        return {
          isNewDay: true,
          lowStockProducts,
        };
      },

      addSupplier: ({ name, phone }) => {
        const cleanName = String(name || "").trim();
        const cleanPhone = String(phone || "").trim();

        if (!cleanName || !cleanPhone) {
          return {
            ok: false,
            message: "Completa nombre y telefono del proveedor.",
          };
        }

        set((state) => ({
          suppliers: [
            ...state.suppliers,
            { id: makeId("SUP"), name: cleanName, phone: cleanPhone },
          ],
        }));

        return { ok: true };
      },

      removeSupplier: (supplierId) =>
        set((state) => ({
          suppliers: state.suppliers.filter((item) => item.id !== supplierId),
          purchaseOrders: state.purchaseOrders.map((order) =>
            order.supplierId === supplierId
              ? { ...order, supplierId: null }
              : order,
          ),
        })),

      assignSupplierToOrder: (orderId, supplierId) =>
        set((state) => ({
          purchaseOrders: state.purchaseOrders.map((order) =>
            order.id === orderId ? { ...order, supplierId } : order,
          ),
        })),

      updateOrderNeededQuantity: (orderId, quantity) => {
        const parsed = Number(quantity);
        if (Number.isNaN(parsed) || parsed <= 0) {
          return;
        }

        set((state) => ({
          purchaseOrders: state.purchaseOrders.map((order) =>
            order.id === orderId ? { ...order, neededQuantity: parsed } : order,
          ),
        }));
      },

      removePurchaseOrder: (orderId) =>
        set((state) => ({
          purchaseOrders: state.purchaseOrders.filter(
            (order) => order.id !== orderId,
          ),
        })),

      upsertClientContact: ({ name, phone }) => {
        const cleanName = String(name || "").trim();
        const cleanPhone = String(phone || "").trim();

        if (!cleanName) {
          return { ok: false, message: "Indica el nombre del cliente." };
        }

        set((state) => ({
          clientContacts: upsertClientContactList(state.clientContacts, {
            name: cleanName,
            phone: cleanPhone,
          }),
        }));

        return { ok: true };
      },

      registerAccountPayment: ({ clientName, amount, note }) => {
        const cleanName = String(clientName || "").trim();
        const parsedAmount = Number(amount);

        if (!cleanName) {
          return { ok: false, message: "Selecciona un cliente." };
        }

        if (Number.isNaN(parsedAmount) || parsedAmount <= 0) {
          return { ok: false, message: "Importe invalido." };
        }

        const movement = {
          id: makeId("MOV"),
          clientName: cleanName,
          createdAt: new Date().toISOString(),
          type: "credit",
          reference: note?.trim() || "Pago en cuenta corriente",
          amount: parsedAmount,
        };

        set((state) => ({
          accountMovements: [movement, ...state.accountMovements],
        }));

        return { ok: true };
      },

      queueOperation: (type, payload) =>
        set((state) => ({
          pendingOperations: [
            ...state.pendingOperations,
            buildPendingOperation(type, payload),
          ],
        })),

      syncPendingOperations: async () => {
        if (DATA_MODE !== "api") {
          return { ok: true, skipped: true };
        }

        const state = get();
        if (!state.isOnline) {
          return { ok: false, message: "Sin conexion a internet." };
        }

        if (!state.pendingOperations.length) {
          return { ok: true, processed: 0 };
        }

        set({ isSyncing: true });
        const failed = [];
        let processed = 0;

        for (const operation of state.pendingOperations) {
          try {
            await runPendingOperation(operation);
            processed += 1;
          } catch {
            failed.push(operation);
          }
        }

        set({
          pendingOperations: failed,
          isSyncing: false,
          lastSyncAt: new Date().toISOString(),
        });

        return {
          ok: failed.length === 0,
          processed,
          pending: failed.length,
        };
      },

      addToCart: (productId) => {
        const { cart, products } = get();
        const product = products.find((item) => item.id === productId);

        if (!product) {
          return { ok: false, message: "Producto no encontrado." };
        }

        const existing = cart.find((item) => item.productId === productId);
        const currentQty = existing?.quantity || 0;

        if (currentQty >= product.stock) {
          return { ok: false, message: "No hay stock disponible para sumar." };
        }

        if (existing) {
          set({
            cart: cart.map((item) =>
              item.productId === productId
                ? { ...item, quantity: item.quantity + 1 }
                : item,
            ),
          });
        } else {
          set({
            cart: [
              ...cart,
              { productId, quantity: 1, unitPrice: product.price },
            ],
          });
        }

        return { ok: true };
      },

      removeFromCart: (productId) =>
        set((state) => ({
          cart: state.cart.filter((item) => item.productId !== productId),
        })),

      updateCartQuantity: (productId, quantity) => {
        const { products, cart } = get();
        const parsedQty = Number(quantity);

        if (Number.isNaN(parsedQty) || parsedQty <= 0) {
          set({ cart: cart.filter((item) => item.productId !== productId) });
          return;
        }

        const product = products.find((item) => item.id === productId);
        if (!product) {
          return;
        }

        const nextQty = Math.min(parsedQty, product.stock);
        set({
          cart: cart.map((item) =>
            item.productId === productId
              ? { ...item, quantity: nextQty }
              : item,
          ),
        });
      },

      clearCart: () => set({ cart: [] }),

      adjustStock: async (productId, delta) => {
        const parsed = Number(delta);
        if (Number.isNaN(parsed)) {
          return { ok: false, message: "Delta invalido." };
        }

        set((state) => ({
          products: updateStockLocal(state.products, productId, parsed),
          purchaseOrders: upsertCriticalOrders(
            state.purchaseOrders,
            updateStockLocal(state.products, productId, parsed),
          ),
        }));

        if (DATA_MODE !== "api") {
          return { ok: true };
        }

        const state = get();
        if (!state.isOnline) {
          state.queueOperation("ADJUST_STOCK", { productId, delta: parsed });
          return { ok: true, queued: true };
        }

        try {
          await adjustProductStock(productId, parsed);
          return { ok: true };
        } catch {
          state.queueOperation("ADJUST_STOCK", { productId, delta: parsed });
          return { ok: true, queued: true };
        }
      },

      importProduct: async ({
        name,
        sku,
        category,
        stock,
        minStock,
        cost,
        price,
        brand,
      }) => {
        const state = get();

        // Validar que no exista un producto con el mismo SKU
        const exists = state.products.some(
          (p) => p.sku.toLowerCase() === sku.toLowerCase(),
        );

        if (exists) {
          return { ok: false, message: "Ya existe un producto con ese SKU." };
        }

        const newProduct = {
          id: `P-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
          sku,
          name,
          category,
          stock: Math.max(0, stock),
          minStock: Math.max(0, minStock),
          cost,
          price,
          brand,
        };

        set((state) => ({
          products: [...state.products, newProduct],
          purchaseOrders: upsertCriticalOrders(state.purchaseOrders, [
            ...state.products,
            newProduct,
          ]),
        }));

        if (DATA_MODE === "api") {
          try {
            const result = await createProduct({
              sku,
              name,
              category,
              brand,
              stock: Math.max(0, stock),
              min_stock: Math.max(0, minStock),
              cost,
              price,
            });
            if (result.ok) {
              set((state) => ({
                products: state.products.map((p) =>
                  p.sku === sku ? { ...p, id: result.product.id } : p,
                ),
              }));
            }
          } catch {}
        }

        return { ok: true, product: newProduct };
      },

      updateProduct: async (id, data) => {
        const payload = {
          sku: data.sku,
          name: data.name,
          category: data.category,
          brand: data.brand,
          stock: Math.max(0, parseInt(data.stock) || 0),
          min_stock: Math.max(0, parseInt(data.minStock) || 0),
          cost: parseFloat(data.cost) || 0,
          price: parseFloat(data.price) || 0,
        };

        set((state) => ({
          products: state.products.map((p) =>
            p.id === id ? { ...p, ...payload, minStock: payload.min_stock } : p,
          ),
        }));

        if (DATA_MODE === "api") {
          try {
            await updateProduct(id, payload);
          } catch (err) {
            return { ok: false, message: err.message };
          }
        }
        return { ok: true };
      },

      deleteProduct: async (id) => {
        if (DATA_MODE === "api") {
          try {
            const result = await deleteProduct(id);
            if (!result.ok) return { ok: false, message: result.message };
          } catch (err) {
            return { ok: false, message: err.message };
          }
        }

        set((state) => ({
          products: state.products.filter((p) => p.id !== id),
          purchaseOrders: state.purchaseOrders.filter(
            (o) => o.productId !== id,
          ),
        }));
        return { ok: true };
      },

      applyBulkPriceUpdate: async ({ scope, category, percent }) => {
        const parsedPercent = Number(percent);
        if (Number.isNaN(parsedPercent)) {
          return { ok: false, message: "Porcentaje invalido." };
        }

        set((state) => ({
          products: updatePricesLocal(state.products, {
            scope,
            category,
            percent: parsedPercent,
          }),
        }));

        if (DATA_MODE !== "api") {
          return { ok: true };
        }

        const state = get();
        const payload = {
          scope,
          category: scope === "all" ? null : category,
          percent: parsedPercent,
        };

        if (!state.isOnline) {
          state.queueOperation("BULK_PRICE_UPDATE", payload);
          return { ok: true, queued: true };
        }

        try {
          await bulkUpdatePrices(payload);
          return { ok: true };
        } catch {
          state.queueOperation("BULK_PRICE_UPDATE", payload);
          return { ok: true, queued: true };
        }
      },

      checkout: async ({ customerName, paymentMethod }) => {
        const state = get();
        if (!state.cart.length) {
          return { ok: false, message: "El carrito esta vacio." };
        }

        if (
          paymentMethod === "Cuenta corriente" &&
          !String(customerName || "").trim()
        ) {
          return {
            ok: false,
            message:
              "Para cuenta corriente debes indicar el nombre del cliente.",
          };
        }

        const sale = buildSaleFromState(state, { customerName, paymentMethod });
        const nextProducts = applySaleToStock(state.products, sale.items);

        set({
          products: nextProducts,
          purchaseOrders: upsertCriticalOrders(
            state.purchaseOrders,
            nextProducts,
          ),
          cart: [],
          recentSales: [sale, ...state.recentSales].slice(0, 12),
          lastDocument: sale,
          accountMovements:
            sale.paymentMethod === "Cuenta corriente"
              ? [
                  {
                    id: makeId("MOV"),
                    clientName: sale.customerName,
                    createdAt: sale.createdAt,
                    type: "debit",
                    reference: sale.ticketNumber,
                    amount: sale.total,
                  },
                  ...state.accountMovements,
                ]
              : state.accountMovements,
          clientContacts:
            sale.paymentMethod === "Cuenta corriente"
              ? upsertClientContactList(state.clientContacts, {
                  name: sale.customerName,
                  phone: "",
                })
              : state.clientContacts,
        });

        if (DATA_MODE !== "api") {
          return { ok: true, sale };
        }

        const payload = {
          customerName: sale.customerName,
          paymentMethod: sale.paymentMethod,
          items: sale.items.map((item) => ({
            productId: item.productId,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
          })),
        };

        if (!state.isOnline) {
          state.queueOperation("CREATE_SALE", payload);
          return { ok: true, sale, queued: true };
        }

        try {
          await createSale(payload);
          return { ok: true, sale };
        } catch {
          state.queueOperation("CREATE_SALE", payload);
          return { ok: true, sale, queued: true };
        }
      },
    }),
    {
      name: "ricapinta-sales-store-v2",
      partialize: (state) => ({
        products: state.products,
        cart: state.cart,
        filters: state.filters,
        recentSales: state.recentSales,
        lastDocument: state.lastDocument,
        activeModule: state.activeModule,
        clientContacts: state.clientContacts,
        accountMovements: state.accountMovements,
        purchaseOrders: state.purchaseOrders,
        suppliers: state.suppliers,
        lastDailyCheckDate: state.lastDailyCheckDate,
        pendingOperations: state.pendingOperations,
        lastSyncAt: state.lastSyncAt,
      }),
    },
  ),
);

export const selectFilteredProducts = (state) => {
  const query = state.filters.query.trim().toLowerCase();

  return state.products.filter((product) => {
    const matchesCategory =
      state.filters.category === "Todas" ||
      product.category === state.filters.category;

    const matchesQuery =
      !query ||
      product.name.toLowerCase().includes(query) ||
      product.sku.toLowerCase().includes(query) ||
      product.brand.toLowerCase().includes(query);

    const lowStockOnly =
      !state.filters.lowStockOnly || product.stock <= product.minStock;

    return matchesCategory && matchesQuery && lowStockOnly;
  });
};

export const selectCartItems = (state) =>
  state.cart
    .map((item) => {
      const product = state.products.find(
        (productItem) => productItem.id === item.productId,
      );
      if (!product) {
        return null;
      }

      return {
        ...item,
        name: product.name,
        sku: product.sku,
        stock: product.stock,
        subtotal: item.quantity * item.unitPrice,
      };
    })
    .filter(Boolean);

export const selectDashboardMetrics = (state) => {
  const totalStock = state.products.reduce(
    (acc, product) => acc + product.stock,
    0,
  );
  const lowStockCount = state.products.filter(
    (product) => product.stock <= product.minStock,
  ).length;
  const inventoryValue = state.products.reduce(
    (acc, product) => acc + product.stock * product.price,
    0,
  );
  const todaysSales = state.recentSales
    .filter(
      (sale) =>
        new Date(sale.createdAt).toDateString() === new Date().toDateString(),
    )
    .reduce((acc, sale) => acc + sale.total, 0);

  return {
    totalStock,
    lowStockCount,
    inventoryValue,
    todaysSales,
  };
};
