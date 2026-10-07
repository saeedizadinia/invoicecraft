import {apiClient} from "./client";

export const clientsApi = {
    list: () => apiClient.get("/clients").then((r) => r.data.clients),
    get: (id) => apiClient.get(`/clients/${id}`).then((r) => r.data),
    create: (payload) => apiClient.post("/clients", payload).then((r) => r.data.client),
    update: (id, payload) => apiClient.patch(`/clients/${id}`, payload).then((r) => r.data.client),
    remove: (id) => apiClient.delete(`/clients/${id}`).then((r) => r.data),
};
