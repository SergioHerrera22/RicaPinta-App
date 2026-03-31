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
  getAfipStatus,
  syncPendingAfipSales as syncPendingAfipSalesApi,
  syncSaleWithAfip as syncSaleWithAfipApi,
  updateProduct,
} from "../services/apiClient";
import {
  buildPendingOperation,
  runPendingOperation,
} from "../services/offlineSync";

const DATA_MODE = import.meta.env.VITE_DATA_MODE || "local";
const AFIP_ENABLED =
  String(import.meta.env.VITE_AFIP_ENABLED || "false").toLowerCase() === "true";
const AFIP_DEFAULT_CBTE_TYPE = Number(import.meta.env.VITE_AFIP_CBTE_TIPO || 6);
const AFIP_DEFAULT_PTO_VTA = Number(import.meta.env.VITE_AFIP_PTO_VTA || 1);
const isBrowser = typeof window !== "undefined";

const RECEIPT_TYPE_MAP = {
  ticket: { label: "Ticket", afipCbteType: 6 },
  "factura-a": { label: "Factura A", afipCbteType: 1 },
  "factura-b": { label: "Factura B", afipCbteType: 6 },
};

const TAX_CONDITION_LABELS = {
  "consumidor-final": "Consumidor Final",
  "responsable-inscripto": "Responsable Inscripto",
  monotributista: "Monotributista",
  exento: "Exento",
};

const DOC_TYPE_MAP = {
  dni: { label: "DNI", afipDocType: 96 },
  cuit: { label: "CUIT", afipDocType: 80 },
  none: { label: "Sin identificar", afipDocType: 99 },
};

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

const normalizeDocumentNumber = (value) =>
  String(value || "").replace(/\D/g, "");

const getFiscalProfile = ({ customer = {}, fiscal = {} }) => {
  const receiptKey = fiscal.receiptType || "ticket";
  const receipt = RECEIPT_TYPE_MAP[receiptKey] || RECEIPT_TYPE_MAP.ticket;

  const docTypeKey = customer.docType || "dni";
  const docType = DOC_TYPE_MAP[docTypeKey] || DOC_TYPE_MAP.dni;
  const docNumber = normalizeDocumentNumber(customer.docNumber);

  const taxConditionKey =
    customer.taxCondition || customer.taxConditionKey || "consumidor-final";

  return {
    receiptType: receiptKey,
    receiptLabel: receipt.label,
    cbteType: receipt.afipCbteType,
    ptoVta: AFIP_DEFAULT_PTO_VTA,
    customerTaxCondition: taxConditionKey,
    customerTaxConditionLabel:
      TAX_CONDITION_LABELS[taxConditionKey] || "Consumidor Final",
    customerDocType: docTypeKey,
    customerDocTypeLabel: docType.label,
    customerAfipDocType: docType.afipDocType,
    customerDocNumber: docNumber,
    customerAddress: customer.address?.trim() || "",
  };
};

const validateFiscalProfile = (profile, paymentMethod, customerName) => {
  const hasCustomerName = Boolean(String(customerName || "").trim());

  if (
    paymentMethod === "Cuenta corriente" &&
    !String(customerName || "").trim()
  ) {
    return {
      ok: false,
      message: "Para cuenta corriente debes indicar el nombre del cliente.",
    };
  }

  if (profile.receiptType !== "ticket" && !hasCustomerName) {
    return {
      ok: false,
      message: "Para Factura A/B debes indicar nombre o razon social.",
    };
  }

  if (profile.receiptType === "factura-a") {
    if (
      profile.customerDocType !== "cuit" ||
      profile.customerDocNumber.length !== 11
    ) {
      return {
        ok: false,
        message: "Factura A requiere CUIT valido de 11 digitos.",
      };
    }

    if (profile.customerTaxCondition === "consumidor-final") {
      return {
        ok: false,
        message: "Factura A no puede emitirse a Consumidor Final.",
      };
    }
  }

  if (profile.receiptType === "factura-b") {
    if (!profile.customerDocNumber || profile.customerDocType === "none") {
      return {
        ok: false,
        message: "Factura B requiere tipo y numero de documento.",
      };
    }
  }

  if (
    profile.customerDocType === "cuit" &&
    profile.customerDocNumber.length !== 11
  ) {
    return { ok: false, message: "El CUIT debe tener 11 digitos." };
  }

  if (
    profile.customerDocType === "dni" &&
    profile.customerDocNumber &&
    profile.customerDocNumber.length < 7
  ) {
    return { ok: false, message: "El DNI informado es demasiado corto." };
  }

  return { ok: true };
};

const buildAfipDraft = (
  fiscalProfile,
  status = AFIP_ENABLED ? "pending" : "disabled",
) => ({
  enabled: AFIP_ENABLED,
  status,
  cae: null,
  caeDueDate: null,
  voucherNumber: null,
  cbteType: fiscalProfile?.cbteType || AFIP_DEFAULT_CBTE_TYPE,
  cbteLabel: fiscalProfile?.receiptLabel || "Comprobante",
  ptoVta: fiscalProfile?.ptoVta || AFIP_DEFAULT_PTO_VTA,
  docType: fiscalProfile?.customerAfipDocType || 99,
  docTypeLabel: fiscalProfile?.customerDocTypeLabel || "Sin identificar",
  docNumber:
    fiscalProfile?.customerDocNumber &&
    Number.isFinite(Number(fiscalProfile.customerDocNumber))
      ? Number(fiscalProfile.customerDocNumber)
      : 0,
  lastError: null,
  syncedAt: null,
});

const patchSaleAfip = (sales, saleId, patch) =>
  sales.map((sale) =>
    sale.id === saleId
      ? {
          ...sale,
          afip: {
            ...(sale.afip || buildAfipDraft()),
            ...patch,
          },
        }
      : sale,
  );

const buildAfipSyncPayload = (sale, backendSaleId = null) => ({
  saleId: backendSaleId,
  saleReferenceId: sale.id,
  sale: {
    id: sale.id,
    customerName: sale.customerName,
    customer: {
      name: sale.customer?.name || sale.customerName,
      phone: sale.customer?.phone || "",
      email: sale.customer?.email || "",
      taxCondition: sale.customer?.taxCondition || "consumidor-final",
      docType: sale.customer?.docType || "none",
      docNumber: sale.customer?.docNumber || "",
      address: sale.customer?.address || "",
    },
    paymentMethod: sale.paymentMethod,
    total: sale.total,
    createdAt: sale.createdAt,
    items: sale.items.map((item) => ({
      productId: item.productId,
      sku: item.sku,
      name: item.name,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      subtotal: item.subtotal,
    })),
  },
  fiscal: {
    cbteType: sale.afip?.cbteType || AFIP_DEFAULT_CBTE_TYPE,
    ptoVta: sale.afip?.ptoVta || AFIP_DEFAULT_PTO_VTA,
    docType: sale.afip?.docType || sale.customer?.docAfipType || 99,
    docNumber:
      sale.afip?.docNumber || Number(sale.customer?.docNumber || 0) || 0,
    customerTaxCondition: sale.customer?.taxCondition || "consumidor-final",
  },
});

const buildSaleFromState = (
  state,
  { customer, paymentMethod, fiscal, afipStatus, observaciones },
) => {
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
  const fiscalProfile = getFiscalProfile({ customer, fiscal });
  const normalizedCustomerName =
    customer?.name?.trim() ||
    (fiscalProfile.customerTaxCondition === "consumidor-final"
      ? "Consumidor final"
      : "Cliente fiscal");

  const sale = {
    id: `SALE-${String(saleNumber).padStart(6, "0")}`,
    createdAt: stamp,
    customerName: normalizedCustomerName,
    customer: {
      name: normalizedCustomerName,
      phone: customer?.phone?.trim() || "",
      email: customer?.email?.trim() || "",
      taxCondition: fiscalProfile.customerTaxCondition,
      taxConditionLabel: fiscalProfile.customerTaxConditionLabel,
      docType: fiscalProfile.customerDocType,
      docTypeLabel: fiscalProfile.customerDocTypeLabel,
      docAfipType: fiscalProfile.customerAfipDocType,
      docNumber: fiscalProfile.customerDocNumber,
      address: fiscalProfile.customerAddress,
    },
    paymentMethod,
    total,
    internalNumber: numbers.internalNumber,
    ticketNumber: numbers.ticketNumber,
    afip: buildAfipDraft(fiscalProfile, afipStatus),
    items,
    observaciones: observaciones || "",
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
    (contact) =>
      normalizeName(contact.name) === key ||
      (nextContact.docNumber && contact.docNumber === nextContact.docNumber),
  );

  if (!existing) {
    return [
      ...contacts,
      {
        id: makeId("CLI"),
        phone: "",
        email: "",
        taxCondition: "consumidor-final",
        docType: "dni",
        docNumber: "",
        address: "",
        ...nextContact,
      },
    ];
  }

  return contacts.map((contact) =>
    contact.id === existing.id
      ? {
          ...contact,
          name: nextContact.name || contact.name,
          phone: nextContact.phone || contact.phone,
          email: nextContact.email || contact.email,
          taxCondition: nextContact.taxCondition || contact.taxCondition,
          docType: nextContact.docType || contact.docType,
          docNumber: nextContact.docNumber || contact.docNumber,
          address: nextContact.address || contact.address,
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
      activeModule: "estadisticas",
      clientContacts: [],
      accountMovements: [],
      purchaseOrders: [],
      suppliers: [],
      lastDailyCheckDate: null,
      pendingOperations: [],
      isOnline: isBrowser ? window.navigator.onLine : true,
      isSyncing: false,
      isSyncingAfip: false,
      isBootstrapping: false,
      lastSyncAt: null,
      afipConfig: {
        enabled: AFIP_ENABLED,
        status: AFIP_ENABLED ? "unknown" : "disabled",
        message: AFIP_ENABLED
          ? "Pendiente de validacion de credenciales"
          : "Integracion AFIP desactivada",
        lastCheckAt: null,
      },

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

          if (AFIP_ENABLED) {
            try {
              const afip = await getAfipStatus();
              set({
                afipConfig: {
                  enabled: true,
                  status: afip?.ok === false ? "error" : "ready",
                  message:
                    afip?.message ||
                    "AFIP operativo para emision de comprobantes.",
                  lastCheckAt: new Date().toISOString(),
                },
              });
            } catch {
              set({
                afipConfig: {
                  enabled: true,
                  status: "error",
                  message:
                    "No se pudo validar AFIP ahora. Se reintentara en sincronizacion.",
                  lastCheckAt: new Date().toISOString(),
                },
              });
            }
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

      upsertClientContact: ({
        name,
        phone,
        email,
        taxCondition,
        docType,
        docNumber,
        address,
      }) => {
        const cleanName = String(name || "").trim();
        const cleanPhone = String(phone || "").trim();
        const cleanEmail = String(email || "").trim();
        const cleanDocNumber = normalizeDocumentNumber(docNumber);
        const cleanAddress = String(address || "").trim();

        if (!cleanName) {
          return { ok: false, message: "Indica el nombre del cliente." };
        }

        set((state) => ({
          clientContacts: upsertClientContactList(state.clientContacts, {
            name: cleanName,
            phone: cleanPhone,
            email: cleanEmail,
            taxCondition: taxCondition || "consumidor-final",
            docType: docType || "dni",
            docNumber: cleanDocNumber,
            address: cleanAddress,
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

      syncSaleAfip: async (saleId) => {
        if (!AFIP_ENABLED) {
          return { ok: false, message: "Integracion AFIP desactivada." };
        }

        if (DATA_MODE !== "api") {
          return {
            ok: false,
            message: "La sincronizacion AFIP requiere VITE_DATA_MODE=api.",
          };
        }

        const state = get();
        if (!state.isOnline) {
          return { ok: false, message: "Sin conexion a internet." };
        }

        const sale = state.recentSales.find((item) => item.id === saleId);
        if (!sale) {
          return { ok: false, message: "Venta no encontrada." };
        }

        set((store) => ({
          recentSales: patchSaleAfip(store.recentSales, saleId, {
            status: "syncing",
            lastError: null,
          }),
          isSyncingAfip: true,
        }));

        try {
          const response = await syncSaleWithAfipApi(
            buildAfipSyncPayload(sale),
          );
          const afip = response?.afip || response || {};

          set((store) => ({
            recentSales: patchSaleAfip(store.recentSales, saleId, {
              status: "authorized",
              cae: afip.cae || null,
              caeDueDate: afip.caeDueDate || afip.vencimientoCae || null,
              voucherNumber:
                afip.voucherNumber ||
                afip.cbteDesde ||
                afip.numeroComprobante ||
                null,
              syncedAt: new Date().toISOString(),
              lastError: null,
            }),
            isSyncingAfip: false,
          }));

          return { ok: true, afip };
        } catch (error) {
          const message = error?.message || "No se pudo sincronizar con AFIP.";
          set((store) => ({
            recentSales: patchSaleAfip(store.recentSales, saleId, {
              status: "error",
              lastError: message,
            }),
            isSyncingAfip: false,
          }));
          return { ok: false, message };
        }
      },

      syncPendingAfipSales: async () => {
        if (!AFIP_ENABLED) {
          return { ok: true, skipped: true };
        }

        if (DATA_MODE !== "api") {
          return { ok: false, message: "AFIP requiere modo api." };
        }

        const state = get();
        if (!state.isOnline) {
          return { ok: false, message: "Sin conexion a internet." };
        }

        // Permite al backend procesar cola fiscal propia si existe.
        try {
          await syncPendingAfipSalesApi();
        } catch {
          // Si falla el endpoint batch, igualmente intentamos por venta.
        }

        const candidates = get().recentSales.filter((sale) => {
          const status = sale.afip?.status;
          return ["pending", "queued", "error"].includes(status);
        });

        let synced = 0;
        let failed = 0;

        for (const sale of candidates) {
          const result = await get().syncSaleAfip(sale.id);
          if (result.ok) {
            synced += 1;
          } else {
            failed += 1;
          }
        }

        return {
          ok: failed === 0,
          synced,
          failed,
          pending: Math.max(0, candidates.length - synced),
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

      checkout: async ({ customer, paymentMethod, fiscal, observaciones }) => {
        const state = get();
        if (!state.cart.length) {
          return { ok: false, message: "El carrito esta vacio." };
        }

        const fiscalProfile = getFiscalProfile({ customer, fiscal });
        const fiscalValidation = validateFiscalProfile(
          fiscalProfile,
          paymentMethod,
          customer?.name,
        );
        if (!fiscalValidation.ok) {
          return fiscalValidation;
        }

        const afipStatus = AFIP_ENABLED
          ? DATA_MODE === "api"
            ? state.isOnline
              ? "pending"
              : "queued"
            : "local"
          : "disabled";

        const sale = buildSaleFromState(state, {
          customer,
          paymentMethod,
          fiscal,
          afipStatus,
          observaciones,
        });
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
            sale.customerName !== "Consumidor final"
              ? upsertClientContactList(state.clientContacts, {
                  name: sale.customerName,
                  phone: sale.customer.phone || "",
                  email: sale.customer.email || "",
                  taxCondition: sale.customer.taxCondition,
                  docType: sale.customer.docType,
                  docNumber: sale.customer.docNumber,
                  address: sale.customer.address,
                })
              : state.clientContacts,
        });

        if (DATA_MODE !== "api") {
          return { ok: true, sale };
        }

        const payload = {
          customerName: sale.customerName,
          paymentMethod: sale.paymentMethod,
          saleReferenceId: sale.id,
          requestAfipSync: AFIP_ENABLED,
          observaciones: sale.observaciones,
          customer: {
            name: sale.customer.name,
            phone: sale.customer.phone,
            email: sale.customer.email,
            taxCondition: sale.customer.taxCondition,
            docType: sale.customer.docType,
            docNumber: sale.customer.docNumber,
            address: sale.customer.address,
          },
          fiscal: {
            receiptType: fiscalProfile.receiptType,
            cbteType: fiscalProfile.cbteType,
            ptoVta: fiscalProfile.ptoVta,
            docType: fiscalProfile.customerAfipDocType,
            docNumber: Number(fiscalProfile.customerDocNumber || 0),
          },
          items: sale.items.map((item) => ({
            productId: item.productId,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
          })),
        };

        if (!state.isOnline) {
          state.queueOperation("CREATE_SALE", payload);
          if (AFIP_ENABLED) {
            state.queueOperation("SYNC_AFIP_SALE", buildAfipSyncPayload(sale));
          }
          return { ok: true, sale, queued: true };
        }

        try {
          const createResult = await createSale(payload);

          if (!AFIP_ENABLED) {
            return { ok: true, sale };
          }

          try {
            const backendSaleId =
              createResult?.sale?.id || createResult?.id || null;

            const afipResponse = await syncSaleWithAfipApi(
              buildAfipSyncPayload(sale, backendSaleId),
            );
            const afip = afipResponse?.afip || afipResponse || {};

            set((store) => ({
              recentSales: patchSaleAfip(store.recentSales, sale.id, {
                status: "authorized",
                cae: afip.cae || null,
                caeDueDate: afip.caeDueDate || afip.vencimientoCae || null,
                voucherNumber:
                  afip.voucherNumber ||
                  afip.cbteDesde ||
                  afip.numeroComprobante ||
                  null,
                syncedAt: new Date().toISOString(),
                lastError: null,
              }),
            }));

            return { ok: true, sale, afip: afipResponse };
          } catch (error) {
            state.queueOperation(
              "SYNC_AFIP_SALE",
              buildAfipSyncPayload(sale, createResult?.sale?.id || null),
            );

            set((store) => ({
              recentSales: patchSaleAfip(store.recentSales, sale.id, {
                status: "queued",
                lastError:
                  error?.message || "AFIP no disponible. Quedo en cola.",
              }),
            }));

            return { ok: true, sale, afipQueued: true };
          }
        } catch {
          state.queueOperation("CREATE_SALE", payload);

          if (AFIP_ENABLED) {
            state.queueOperation("SYNC_AFIP_SALE", buildAfipSyncPayload(sale));
            set((store) => ({
              recentSales: patchSaleAfip(store.recentSales, sale.id, {
                status: "queued",
                lastError: "Venta guardada offline. AFIP pendiente.",
              }),
            }));
          }

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
        afipConfig: state.afipConfig,
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
