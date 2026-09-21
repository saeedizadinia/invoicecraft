import { mock } from "@/mock/api";
// import { apiClient } from "./client";

export const aiApi = {
  // ── Real API (uncomment when backend is ready) ──
  // Receipt/expense image or PDF → structured data to pre-fill an invoice.
  // receiptParse: (file) => {
  //   const form = new FormData();
  //   form.append("file", file);
  //   return apiClient
  //     .post("/ai/receipt-parse", form, {
  //       headers: { "Content-Type": "multipart/form-data" },
  //     })
  //     .then((r) => r.data.result);
  // },
  // businessSummary: () => apiClient.post("/ai/business-summary").then((r) => r.data),
  // paymentReminder: (invoiceId, tone) =>
  //   apiClient.post("/ai/payment-reminder", { invoiceId, tone }).then((r) => r.data),
  // writeNote: (payload) => apiClient.post("/ai/write-note", payload).then((r) => r.data.text),

  // ── Mock (canned AI responses — no Gemini in the boilerplate) ──
  receiptParse: (file) => mock.ai.receiptParse(file),
  businessSummary: () => mock.ai.businessSummary(),
  paymentReminder: (invoiceId, tone) => mock.ai.paymentReminder(invoiceId, tone),
  writeNote: (payload) => mock.ai.writeNote(payload),
};
