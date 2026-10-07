import {apiClient} from "./client";

export const invoicesApi = {
    list: (params = {}) => apiClient.get("/invoices", {params}).then((r) => r.data.invoices),
    get: (id) => apiClient.get(`/invoices/${id}`).then((r) => r.data.invoice),
    create: (payload) => apiClient.post("/invoices", payload).then((r) => r.data.invoice),
    update: (id, payload) => apiClient.patch(`/invoices/${id}`, payload).then((r) => r.data.invoice),
    setStatus: (id, status) => apiClient.patch(`/invoices/${id}/status`, {status}).then((r) => r.data.invoice),
    remove: (id) => apiClient.delete(`/invoices/${id}`).then((r) => r.data),
};
