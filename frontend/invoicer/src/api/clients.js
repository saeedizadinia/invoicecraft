import { mock } from "@/mock/api";
// import { apiClient } from "./client";

export const clientsApi = {
  // ── Real API (uncomment when backend is ready) ──
  // list: () => apiClient.get("/clients").then((r) => r.data.clients),
  // get: (id) => apiClient.get(`/clients/${id}`).then((r) => r.data),
  // create: (payload) => apiClient.post("/clients", payload).then((r) => r.data.client),
  // update: (id, payload) => apiClient.patch(`/clients/${id}`, payload).then((r) => r.data.client),
  // remove: (id) => apiClient.delete(`/clients/${id}`).then((r) => r.data),

  // ── Mock (local data) ──
  list: () => mock.clients.list(),
  get: (id) => mock.clients.get(id),
  create: (payload) => mock.clients.create(payload),
  update: (id, payload) => mock.clients.update(id, payload),
  remove: (id) => mock.clients.remove(id),
};
