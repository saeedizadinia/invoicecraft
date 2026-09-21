import { mock } from "@/mock/api";
// import { apiClient } from "./client";

export const itemsApi = {
  // ── Real API (uncomment when backend is ready) ──
  // list: () => apiClient.get("/items").then((r) => r.data.items),
  // create: (payload) => apiClient.post("/items", payload).then((r) => r.data.item),
  // update: (id, payload) => apiClient.patch(`/items/${id}`, payload).then((r) => r.data.item),
  // remove: (id) => apiClient.delete(`/items/${id}`).then((r) => r.data),

  // ── Mock (local data) ──
  list: () => mock.items.list(),
  create: (payload) => mock.items.create(payload),
  update: (id, payload) => mock.items.update(id, payload),
  remove: (id) => mock.items.remove(id),
};

export const expensesApi = {
  // ── Real API ──
  // list: (params = {}) => apiClient.get("/expenses", { params }).then((r) => r.data),
  // create: (payload) => apiClient.post("/expenses", payload).then((r) => r.data.expense),
  // update: (id, payload) => apiClient.patch(`/expenses/${id}`, payload).then((r) => r.data.expense),
  // remove: (id) => apiClient.delete(`/expenses/${id}`).then((r) => r.data),

  // ── Mock ──
  list: (params = {}) => mock.expenses.list(params),
  create: (payload) => mock.expenses.create(payload),
  update: (id, payload) => mock.expenses.update(id, payload),
  remove: (id) => mock.expenses.remove(id),
};

export const paymentsApi = {
  // ── Real API ──
  // list: () => apiClient.get("/payments").then((r) => r.data),
  // create: (payload) => apiClient.post("/payments", payload).then((r) => r.data.payment),
  // remove: (id) => apiClient.delete(`/payments/${id}`).then((r) => r.data),

  // ── Mock ──
  list: () => mock.payments.list(),
  create: (payload) => mock.payments.create(payload),
  remove: (id) => mock.payments.remove(id),
};

export const reportsApi = {
  // ── Real API ──
  // get: () => apiClient.get("/reports").then((r) => r.data),

  // ── Mock ──
  get: () => mock.reports.get(),
};
