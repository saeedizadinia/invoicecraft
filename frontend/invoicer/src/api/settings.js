import {apiClient} from "./client";

export const settingsApi = {
    get: () => apiClient.get("/settings").then((r) => r.data.settings),
    update: (payload) => apiClient.patch("/settings", payload).then((r) => r.data.settings),
};
