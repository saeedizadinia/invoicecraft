import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { itemsApi, expensesApi, paymentsApi, reportsApi } from "@/api/features";

/* ── Catalog items ─────────────────────────────────────────────── */
export const itemsKey = ["items"];
export function useItems() {
  return useQuery({ queryKey: itemsKey, queryFn: () => itemsApi.list() });
}
export function useItemMutations() {
  const qc = useQueryClient();
  const invalidate = () => qc.invalidateQueries({ queryKey: itemsKey });
  return {
    create: useMutation({ mutationFn: itemsApi.create, onSuccess: invalidate }),
    update: useMutation({ mutationFn: ({ id, payload }) => itemsApi.update(id, payload), onSuccess: invalidate }),
    remove: useMutation({ mutationFn: itemsApi.remove, onSuccess: invalidate }),
  };
}

/* ── Expenses ──────────────────────────────────────────────────── */
export const expensesKey = (params) => ["expenses", params || {}];
export function useExpenses(params) {
  return useQuery({ queryKey: expensesKey(params), queryFn: () => expensesApi.list(params) });
}
export function useExpenseMutations() {
  const qc = useQueryClient();
  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["expenses"] });
    qc.invalidateQueries({ queryKey: ["reports"] });
  };
  return {
    create: useMutation({ mutationFn: expensesApi.create, onSuccess: invalidate }),
    update: useMutation({ mutationFn: ({ id, payload }) => expensesApi.update(id, payload), onSuccess: invalidate }),
    remove: useMutation({ mutationFn: expensesApi.remove, onSuccess: invalidate }),
  };
}

/* ── Payments ──────────────────────────────────────────────────── */
export const paymentsKey = ["payments"];
export function usePayments() {
  return useQuery({ queryKey: paymentsKey, queryFn: () => paymentsApi.list() });
}
export function usePaymentMutations() {
  const qc = useQueryClient();
  const invalidate = () => {
    qc.invalidateQueries({ queryKey: paymentsKey });
    qc.invalidateQueries({ queryKey: ["invoices"] });
    qc.invalidateQueries({ queryKey: ["dashboard"] });
    qc.invalidateQueries({ queryKey: ["reports"] });
  };
  return {
    create: useMutation({ mutationFn: paymentsApi.create, onSuccess: invalidate }),
    remove: useMutation({ mutationFn: paymentsApi.remove, onSuccess: invalidate }),
  };
}

/* ── Reports ───────────────────────────────────────────────────── */
export const reportsKey = ["reports"];
export function useReports() {
  return useQuery({ queryKey: reportsKey, queryFn: () => reportsApi.get() });
}
