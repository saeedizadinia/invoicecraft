import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { settingsApi } from "@/api/settings";

export const settingsKey = ["settings"];

export function useSettings() {
  return useQuery({ queryKey: settingsKey, queryFn: () => settingsApi.get() });
}

export function useUpdateSettings() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload) => settingsApi.update(payload),
    onSuccess: (settings) => qc.setQueryData(settingsKey, settings),
  });
}
