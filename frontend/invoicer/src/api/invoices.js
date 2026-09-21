import { mock } from "@/mock/api";
// import { apiClient } from "./client";

export const invoicesApi = {
  // ── Real API (uncomment when backend is ready) ──
  // list: (params = {}) => apiClient.get("/invoices", { params }).then((r) => r.data.invoices),
  // get: (id) => apiClient.get(`/invoices/${id}`).then((r) => r.data.invoice),
  // create: (payload) => apiClient.post("/invoices", payload).then((r) => r.data.invoice),
  // update: (id, payload) => apiClient.patch(`/invoices/${id}`, payload).then((r) => r.data.invoice),
  // setStatus: (id, status) => apiClient.patch(`/invoices/${id}/status`, { status }).then((r) => r.data.invoice),
  // remove: (id) => apiClient.delete(`/invoices/${id}`).then((r) => r.data),

  // ── Mock (local data) ──
  list: (params = {}) => mock.invoices.list(params),
  get: (id) => mock.invoices.get(id),
  create: (payload) => mock.invoices.create(payload),
  update: (id, payload) => mock.invoices.update(id, payload),
  setStatus: (id, status) => mock.invoices.setStatus(id, status),
  remove: (id) => mock.invoices.remove(id),
};
