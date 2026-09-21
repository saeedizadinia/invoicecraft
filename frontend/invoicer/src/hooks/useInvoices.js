import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { invoicesApi } from "@/api/invoices";

export const invoicesKey = (params) => ["invoices", params || {}];
export const invoiceKey = (id) => ["invoice", id];

export function useInvoices(params) {
  return useQuery({
    queryKey: invoicesKey(params),
    queryFn: () => invoicesApi.list(params),
    keepPreviousData: true,
  });
}

export function useInvoice(id) {
  return useQuery({
    queryKey: invoiceKey(id),
    queryFn: () => invoicesApi.get(id),
    enabled: !!id,
  });
}

function invalidateAll(qc) {
  qc.invalidateQueries({ queryKey: ["invoices"] });
  qc.invalidateQueries({ queryKey: ["dashboard"] });
  qc.invalidateQueries({ queryKey: ["clients"] });
}

export function useCreateInvoice() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload) => invoicesApi.create(payload),
    onSuccess: () => invalidateAll(qc),
  });
}

export function useUpdateInvoice() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }) => invoicesApi.update(id, payload),
    onSuccess: (inv) => {
      invalidateAll(qc);
      if (inv?.id) qc.invalidateQueries({ queryKey: invoiceKey(inv.id) });
    },
  });
}

export function useSetInvoiceStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status }) => invoicesApi.setStatus(id, status),
    onSuccess: (inv) => {
      invalidateAll(qc);
      if (inv?.id) qc.invalidateQueries({ queryKey: invoiceKey(inv.id) });
    },
  });
}

export function useDeleteInvoice() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id) => invoicesApi.remove(id),
    onSuccess: () => invalidateAll(qc),
  });
}
