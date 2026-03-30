import { adjustProductStock, bulkUpdatePrices, createSale } from "./apiClient";

const OPERATION_MAP = {
  ADJUST_STOCK: async (payload) =>
    adjustProductStock(payload.productId, payload.delta),
  BULK_PRICE_UPDATE: async (payload) => bulkUpdatePrices(payload),
  CREATE_SALE: async (payload) => createSale(payload),
};

export const buildPendingOperation = (type, payload) => ({
  id: `${type}-${Date.now()}-${Math.floor(Math.random() * 10000)}`,
  type,
  payload,
  createdAt: new Date().toISOString(),
});

export async function runPendingOperation(operation) {
  const handler = OPERATION_MAP[operation.type];
  if (!handler) {
    return;
  }

  await handler(operation.payload);
}
