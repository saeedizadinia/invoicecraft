import {apiClient} from "./client";

export const itemsApi = {
    list: () => apiClient.get("/items").then((r) => r.data.items),
    create: (payload) => apiClient.post("/items", payload).then((r) => r.data.item),
    update: (id, payload) => apiClient.patch(`/items/${id}`, payload).then((r) => r.data.item),
    remove: (id) => apiClient.delete(`/items/${id}`).then((r) => r.data),
};

export const expensesApi = {
    list: (params = {}) => apiClient.get("/expenses", {params}).then((r) => r.data),
    create: (payload) => apiClient.post("/expenses", payload).then((r) => r.data.expense),
    update: (id, payload) => apiClient.patch(`/expenses/${id}`, payload).then((r) => r.data.expense),
    remove: (id) => apiClient.delete(`/expenses/${id}`).then((r) => r.data),
};

export const paymentsApi = {
    list: () => apiClient.get("/payments").then((r) => r.data),
    create: (payload) => apiClient.post("/payments", payload).then((r) => r.data.payment),
    remove: (id) => apiClient.delete(`/payments/${id}`).then((r) => r.data),
};

export const reportsApi = {
    get: () => apiClient.get("/reports").then((r) => r.data),
};
