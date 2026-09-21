// ─────────────────────────────────────────────────────────────────────────
// BOILERPLATE MODE — the app runs on local mock data (see src/mock/).
// The real axios client below is commented out. Once your backend is running:
//   1. Uncomment the axios client below.
//   2. In each src/api/*.js file, comment the "Mock" block and uncomment the
//      "Real API" block.
//   3. Delete the src/mock/ folder.
// ─────────────────────────────────────────────────────────────────────────

// import axios from "axios";
//
// export const apiClient = axios.create({
//   baseURL: "/api",
//   withCredentials: true,
//   headers: { "Content-Type": "application/json" },
// });
//
// apiClient.interceptors.response.use(
//   (res) => res,
//   (err) => {
//     const message =
//       err.response?.data?.error?.message ||
//       err.message ||
//       "Request failed";
//     return Promise.reject({
//       status: err.response?.status,
//       message,
//       details: err.response?.data?.error?.details,
//       original: err,
//     });
//   }
// );

// Placeholder so any lingering import doesn't break in mock mode.
export const apiClient = null;
