import { mock } from "@/mock/api";
// import { apiClient } from "./client";

export const dashboardApi = {
  // ── Real API (uncomment when backend is ready) ──
  // get: () => apiClient.get("/dashboard").then((r) => r.data),

  // ── Mock (local data) ──
  get: () => mock.dashboard.get(),
};
