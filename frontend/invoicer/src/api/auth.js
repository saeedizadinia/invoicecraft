import { mock } from "@/mock/api";
// import { apiClient } from "./client";

export const authApi = {
  // ── Real API (uncomment when backend is ready) ──
  // register: (payload) => apiClient.post("/auth/register", payload).then((r) => r.data),
  // login: (payload) => apiClient.post("/auth/login", payload).then((r) => r.data),
  // logout: () => apiClient.post("/auth/logout").then((r) => r.data),
  // me: () => apiClient.get("/auth/me").then((r) => r.data),
  // updateProfile: (payload) => apiClient.patch("/auth/profile", payload).then((r) => r.data),
  // changePassword: (payload) => apiClient.patch("/auth/password", payload).then((r) => r.data),

  // ── Mock (local data) ──
  register: (payload) => mock.auth.register(payload),
  login: (payload) => mock.auth.login(payload),
  logout: () => mock.auth.logout(),
  me: () => mock.auth.me(),
  updateProfile: (payload) => mock.auth.updateProfile(payload),
  changePassword: (payload) => mock.auth.changePassword(payload),
};
