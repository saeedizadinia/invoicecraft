import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { clientsApi } from "@/api/clients";

export const clientsKey = ["clients"];
export const clientKey = (id) => ["client", id];

export function useClients() {
  return useQuery({ queryKey: clientsKey, queryFn: () => clientsApi.list() });
}

export function useClient(id) {
  return useQuery({
    queryKey: clientKey(id),
    queryFn: () => clientsApi.get(id),
    enabled: !!id,
  });
}

function invalidate(qc, id) {
  qc.invalidateQueries({ queryKey: clientsKey });
  qc.invalidateQueries({ queryKey: ["dashboard"] });
  if (id) qc.invalidateQueries({ queryKey: clientKey(id) });
}

export function useCreateClient() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload) => clientsApi.create(payload),
    onSuccess: () => invalidate(qc),
  });
}

export function useUpdateClient() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }) => clientsApi.update(id, payload),
    onSuccess: (c) => invalidate(qc, c?.id),
  });
}

export function useDeleteClient() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id) => clientsApi.remove(id),
    onSuccess: () => invalidate(qc),
  });
}
