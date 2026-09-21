import { mock } from "@/mock/api";
// import { apiClient } from "./client";

export const settingsApi = {
  // ── Real API (uncomment when backend is ready) ──
  // get: () => apiClient.get("/settings").then((r) => r.data.settings),
  // update: (payload) => apiClient.patch("/settings", payload).then((r) => r.data.settings),

  // ── Mock (local data) ──
  get: () => mock.settings.get(),
  update: (payload) => mock.settings.update(payload),
};
