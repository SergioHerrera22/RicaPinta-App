import { Suspense, lazy, useEffect, useMemo, useRef, useState } from "react";
import {
  BarChart3,
  ClipboardList,
  CloudOff,
  LogOut,
  PackageSearch,
  Receipt,
  ReceiptText,
  Tags,
  UserRound,
  WalletCards,
} from "lucide-react";
import { ProductCatalog } from "./components/ProductCatalog";
import { PricePanel } from "./components/PricePanel";
import { SaleCart } from "./components/SaleCart";
import { StockPanel } from "./components/StockPanel";
import { TopBar } from "./components/TopBar";
import { OrdersPanel } from "./components/OrdersPanel";
import { CurrentAccountPanel } from "./components/CurrentAccountPanel";
import { SalesHistoryPanel } from "./components/SalesHistoryPanel";
import { LoginScreen } from "./components/LoginScreen";
import { useSalesStore } from "./store/useSalesStore";
import { rolePermissions, useAuthStore } from "./store/useAuthStore";

const SmartDashboard = lazy(() =>
  import("./components/dashboard/SmartDashboard").then((module) => ({
    default: module.SmartDashboard,
  })),
);

const DATA_MODE = import.meta.env.VITE_DATA_MODE || "local";
const DEFAULT_SALE_FORM = {
  customerId: "",
  customerName: "",
  customerPhone: "",
  customerEmail: "",
  receiptType: "ticket",
  customerTaxCondition: "consumidor-final",
  customerDocType: "dni",
  customerDocNumber: "",
  customerAddress: "",
};

function App() {
  const [saleForm, setSaleForm] = useState(DEFAULT_SALE_FORM);
  const [paymentMethod, setPaymentMethod] = useState("Efectivo");
  const [salesSearchFocusTick, setSalesSearchFocusTick] = useState(0);
  const alertShownForDateRef = useRef(null);

  const { session, isAuthenticating, login, logout } = useAuthStore();

  const {
    products,
    categories,
    filters,
    cart,
    recentSales,
    activeModule,
    clientContacts,
    accountMovements,
    purchaseOrders,
    suppliers,
    pendingOperations,
    isOnline,
    afipConfig,
    initialize,
    runDailyStockCheck,
    setOnlineStatus,
    syncPendingOperations,
    syncPendingAfipSales,
    setActiveModule,
    setQuery,
    setCategory,
    toggleLowStock,
    addToCart,
    removeFromCart,
    updateCartQuantity,
    adjustStock,
    importProduct,
    updateProduct,
    deleteProduct,
    applyBulkPriceUpdate,
    checkout,
    addSupplier,
    removeSupplier,
    assignSupplierToOrder,
    updateOrderNeededQuantity,
    removePurchaseOrder,
    upsertClientContact,
    registerAccountPayment,
  } = useSalesStore();

  const filteredProducts = useMemo(() => {
    const query = filters.query.trim().toLowerCase();

    return products.filter((product) => {
      const matchesCategory =
        filters.category === "Todas" || product.category === filters.category;

      const matchesQuery =
        !query ||
        product.name.toLowerCase().includes(query) ||
        product.sku.toLowerCase().includes(query) ||
        product.brand.toLowerCase().includes(query);

      const lowStockOnly =
        !filters.lowStockOnly || product.stock <= product.minStock;

      return matchesCategory && matchesQuery && lowStockOnly;
    });
  }, [filters, products]);

  const cartItems = useMemo(
    () =>
      cart
        .map((item) => {
          const product = products.find(
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
        .filter(Boolean),
    [cart, products],
  );

  const metrics = useMemo(() => {
    const totalStock = products.reduce(
      (acc, product) => acc + product.stock,
      0,
    );
    const lowStockCount = products.filter(
      (product) => product.stock <= product.minStock,
    ).length;
    const inventoryValue = products.reduce(
      (acc, product) => acc + product.stock * product.price,
      0,
    );

    const today = new Date().toDateString();
    const todaysSales = recentSales
      .filter((sale) => new Date(sale.createdAt).toDateString() === today)
      .reduce((acc, sale) => acc + sale.total, 0);

    return {
      totalStock,
      lowStockCount,
      inventoryValue,
      todaysSales,
    };
  }, [products, recentSales]);

  const permissions = rolePermissions[session?.role] || rolePermissions.ventas;

  const modules = useMemo(
    () => [
      { id: "estadisticas", label: "Estadisticas", icon: BarChart3 },
      { id: "ventas", label: "Vender", icon: WalletCards },
      {
        id: "ventas-realizadas",
        label: "Ventas realizadas",
        icon: ReceiptText,
      },
      { id: "cuenta-corriente", label: "Cuenta corriente", icon: Receipt },
      { id: "stock", label: "Stock", icon: PackageSearch },
      { id: "precios", label: "Precios", icon: Tags },
      { id: "pedidos", label: "Mis pedidos", icon: ClipboardList },
    ],
    [],
  );

  const visibleModules = useMemo(
    () => modules.filter((module) => permissions.modules.includes(module.id)),
    [modules, permissions.modules],
  );

  useEffect(() => {
    if (!session) {
      return;
    }

    const run = async () => {
      await initialize();
      const check = runDailyStockCheck();

      if (!check.isNewDay) {
        return;
      }

      const todayKey = new Date().toISOString().slice(0, 10);
      if (alertShownForDateRef.current === todayKey) {
        return;
      }

      alertShownForDateRef.current = todayKey;

      if (!check.lowStockProducts.length) {
        window.alert(
          "Control diario de stock: sin productos bajos de stock hoy.",
        );
        return;
      }

      const critical = check.lowStockProducts.filter((item) => item.stock <= 2);
      window.alert(
        `Control diario de stock: ${check.lowStockProducts.length} productos bajos de stock. ` +
          `Criticos (<=2): ${critical.length}. Revisa la pestana Mis pedidos.`,
      );
    };

    run();
  }, [initialize, runDailyStockCheck, session]);

  useEffect(() => {
    const onOnline = () => setOnlineStatus(true);
    const onOffline = () => setOnlineStatus(false);

    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);

    return () => {
      window.removeEventListener("online", onOnline);
      window.removeEventListener("offline", onOffline);
    };
  }, [setOnlineStatus]);

  useEffect(() => {
    if (!visibleModules.length) {
      return;
    }

    const isAllowed = visibleModules.some(
      (module) => module.id === activeModule,
    );
    if (!isAllowed) {
      setActiveModule(visibleModules[0].id);
    }
  }, [activeModule, setActiveModule, visibleModules]);

  useEffect(() => {
    if (DATA_MODE === "api" && isOnline) {
      if (pendingOperations.length) {
        syncPendingOperations();
      }

      if (afipConfig?.enabled) {
        syncPendingAfipSales();
      }
    }
  }, [
    afipConfig?.enabled,
    isOnline,
    pendingOperations.length,
    syncPendingAfipSales,
    syncPendingOperations,
  ]);

  const handleCheckout = async () => {
    const result = await checkout({
      paymentMethod,
      customer: {
        id: saleForm.customerId,
        name: saleForm.customerName,
        phone: saleForm.customerPhone,
        email: saleForm.customerEmail,
        taxCondition: saleForm.customerTaxCondition,
        docType: saleForm.customerDocType,
        docNumber: saleForm.customerDocNumber,
        address: saleForm.customerAddress,
      },
      fiscal: {
        receiptType: saleForm.receiptType,
      },
      observaciones: saleForm.observaciones,
    });

    if (!result.ok) {
      window.alert(result.message);
      return;
    }

    if (result.queued) {
      window.alert(
        "Venta guardada en cola offline. Se sincronizara al volver la conexion.",
      );
    }

    setSaleForm(DEFAULT_SALE_FORM);
    setPaymentMethod("Efectivo");
    setSalesSearchFocusTick((current) => current + 1);
  };

  const handleAddProduct = (productId) => {
    const result = addToCart(productId);

    if (!result.ok) {
      window.alert(result.message);
    }
  };

  const handleBulkUpdate = async ({ scope, category, percent }) => {
    const result = await applyBulkPriceUpdate({ scope, category, percent });
    if (!result.ok) {
      window.alert(result.message);
      return;
    }

    if (result.queued) {
      window.alert("Cambio de precios guardado en cola offline.");
    }
  };

  const handleAdjustStock = async (productId, delta) => {
    const result = await adjustStock(productId, delta);
    if (!result.ok) {
      window.alert(result.message);
      return;
    }

    if (result.queued) {
      window.alert("Ajuste de stock guardado en cola offline.");
    }
  };

  const handleImportProduct = (productData) => {
    const result = importProduct(productData);
    if (!result.ok) {
      window.alert(result.message);
      return;
    }
    window.alert("Producto importado exitosamente.");
  };

  const handleUpdateProduct = async (id, data) => {
    const result = await updateProduct(id, data);
    if (!result.ok) window.alert(result.message || "Error al actualizar.");
    return result;
  };

  const handleDeleteProduct = async (id) => {
    const result = await deleteProduct(id);
    if (!result.ok) window.alert(result.message || "No se pudo eliminar.");
    return result;
  };

  const handleSaveClient = (clientData) => {
    const result = upsertClientContact(clientData);
    if (!result.ok) {
      window.alert(result.message);
      return result;
    }
    return result;
  };

  const handleChangeModule = (moduleId) => {
    if (moduleId === "ventas" && activeModule !== "ventas") {
      setSaleForm(DEFAULT_SALE_FORM);
      setPaymentMethod("Efectivo");
      setSalesSearchFocusTick((current) => current + 1);
      setQuery("");
      setCategory("Todas");
      if (filters.lowStockOnly) {
        toggleLowStock();
      }
    }

    setActiveModule(moduleId);
  };

  if (!session) {
    return <LoginScreen onLogin={login} loading={isAuthenticating} />;
  }

  return (
    <div className="min-h-screen w-full bg-app-pattern">
      <div className="mx-auto max-w-350 px-4 pb-8 pt-6 lg:px-8">
        <header className="mb-6 reveal-up">
          <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">
              RicaPinta App
            </p>
            <div className="flex items-center gap-2">
              <span
                className={`inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs font-semibold ${
                  isOnline
                    ? "bg-emerald-50 text-emerald-700"
                    : "bg-rose-50 text-rose-700"
                }`}
              >
                {!isOnline && <CloudOff size={12} />}
                {isOnline ? "En linea" : "Sin conexion"}
              </span>

              <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-700">
                <UserRound size={12} />
                {session.role} · {session.name}
              </span>

              <button
                type="button"
                onClick={logout}
                className="inline-flex items-center gap-1 rounded-xl border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:border-slate-500"
              >
                <LogOut size={13} />
                Salir
              </button>
            </div>
          </div>
        </header>

        {activeModule === "ventas" && (
          <div className="mb-5 reveal-up">
            <SaleCart
              items={cartItems}
              saleForm={saleForm}
              setSaleForm={setSaleForm}
              clientContacts={clientContacts}
              paymentMethod={paymentMethod}
              setPaymentMethod={setPaymentMethod}
              onSaveClient={handleSaveClient}
              onQuantityChange={updateCartQuantity}
              onRemove={removeFromCart}
              onCheckout={handleCheckout}
            />
          </div>
        )}

        <div className="mt-5 grid gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
          <main className="min-w-0">
            {activeModule === "ventas" && (
              <section className="panel reveal-up">
                <ProductCatalog
                  products={filteredProducts}
                  categories={categories}
                  filters={filters}
                  autoFocusQuery
                  focusToken={salesSearchFocusTick}
                  onQueryChange={setQuery}
                  onCategoryChange={setCategory}
                  onToggleLowStock={toggleLowStock}
                  onAdd={handleAddProduct}
                />
              </section>
            )}

            {activeModule === "estadisticas" && (
              <section className="space-y-4">
                <TopBar metrics={metrics} />
                <Suspense
                  fallback={
                    <div className="grid gap-4 lg:grid-cols-2">
                      <div className="panel h-36 animate-pulse bg-slate-100" />
                      <div className="panel h-36 animate-pulse bg-slate-100" />
                      <div className="panel h-56 animate-pulse bg-slate-100 lg:col-span-2" />
                    </div>
                  }
                >
                  <SmartDashboard
                    metrics={metrics}
                    products={products}
                    sales={recentSales}
                    purchaseOrders={purchaseOrders}
                    pendingOperations={pendingOperations}
                    isOnline={isOnline}
                  />
                </Suspense>
              </section>
            )}

            {activeModule === "stock" && (
              <section>
                <StockPanel
                  products={products}
                  onAdjustStock={handleAdjustStock}
                  canAdjustStock={permissions.canAdjustStock}
                  onImportProducts={handleImportProduct}
                  onUpdateProduct={handleUpdateProduct}
                  onDeleteProduct={handleDeleteProduct}
                />
              </section>
            )}

            {activeModule === "precios" && (
              <section>
                <PricePanel
                  products={products}
                  categories={categories}
                  onApplyBulk={handleBulkUpdate}
                  canUpdatePrices={permissions.canUpdatePrices}
                />
              </section>
            )}

            {activeModule === "pedidos" && (
              <section>
                <OrdersPanel
                  orders={purchaseOrders}
                  suppliers={suppliers}
                  products={products}
                  onAddSupplier={addSupplier}
                  onRemoveSupplier={removeSupplier}
                  onAssignSupplier={assignSupplierToOrder}
                  onUpdateNeeded={updateOrderNeededQuantity}
                  onRemoveOrder={removePurchaseOrder}
                />
              </section>
            )}

            {activeModule === "ventas-realizadas" && (
              <section>
                <SalesHistoryPanel
                  sales={recentSales}
                />
              </section>
            )}

            {activeModule === "cuenta-corriente" && (
              <section>
                <CurrentAccountPanel
                  sales={recentSales}
                  clientContacts={clientContacts}
                  accountMovements={accountMovements}
                  onUpsertClientContact={upsertClientContact}
                  onRegisterAccountPayment={registerAccountPayment}
                />
              </section>
            )}
          </main>

          <aside className="panel reveal-up h-fit xl:sticky xl:top-6">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
              Navegacion
            </p>
            <h3 className="mt-1 text-xl font-semibold text-slate-900">
              Modulos principales
            </h3>
            <p className="mt-1 text-sm text-slate-600">
              Acceso directo grande y visible para cambiar de pantalla
              rapidamente.
            </p>

            <div className="mt-4 grid gap-3">
              {visibleModules.map((module) => {
                const Icon = module.icon;
                const active = activeModule === module.id;
                return (
                  <button
                    key={module.id}
                    type="button"
                    className={`flex items-center gap-3 rounded-2xl border px-4 py-3 text-left text-base font-semibold transition ${
                      active
                        ? "border-slate-900 bg-slate-900 text-white"
                        : "border-slate-300 bg-white text-slate-700 hover:border-slate-500"
                    }`}
                    onClick={() => handleChangeModule(module.id)}
                  >
                    <span
                      className={`inline-flex h-9 w-9 items-center justify-center rounded-xl ${
                        active ? "bg-white/20" : "bg-slate-100"
                      }`}
                    >
                      <Icon size={18} />
                    </span>
                    <span>{module.label}</span>
                  </button>
                );
              })}
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}

export default App;
