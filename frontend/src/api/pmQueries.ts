import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "./client";

// ── Types ──────────────────────────────────────────────────────────

export interface ToolSearchResult {
  id: number;
  toolNo: string;
}

export interface MaintenanceRecord {
  date: string;
}

export interface PMEntry {
  id: string;
  toolId: number;
  toolNo: string;
  toolLife: number;
  pmStrokes: number;
  maintenanceHistory: MaintenanceRecord[];
  createdAt: string;
}

// ── Queries ────────────────────────────────────────────────────────

export function useToolSearch(query: string) {
  return useQuery({
    queryKey: ["tools", "search", query],
    queryFn: () =>
      apiFetch<ToolSearchResult[]>(
        `/api/tools/search?q=${encodeURIComponent(query)}`
      ),
    enabled: query.length >= 1,
  });
}

export function usePMEntries() {
  return useQuery({
    queryKey: ["pm-entries"],
    queryFn: () => apiFetch<PMEntry[]>("/api/pm"),
  });
}

// ── Mutations ──────────────────────────────────────────────────────

export function useAddPMEntry() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: {
      toolId: number;
      toolNo: string;
      toolLife: number;
      pmStrokes: number;
    }) =>
      apiFetch<PMEntry>("/api/pm", {
        method: "POST",
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["pm-entries"] });
    },
  });
}

export function useUpdatePMEntry() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { entryId: string; toolLife?: number; pmStrokes?: number }) =>
      apiFetch<PMEntry>(`/api/pm/${data.entryId}`, {
        method: "PATCH",
        body: JSON.stringify({
          ...(data.toolLife !== undefined && { toolLife: data.toolLife }),
          ...(data.pmStrokes !== undefined && { pmStrokes: data.pmStrokes }),
        }),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["pm-entries"] });
    },
  });
}

export function useConfirmMaintenance() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (entryId: string) =>
      apiFetch<PMEntry>(`/api/pm/${entryId}/confirm`, {
        method: "POST",
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["pm-entries"] });
    },
  });
}

export function useDeletePMEntry() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (entryId: string) =>
      apiFetch<{ message: string }>(`/api/pm/${entryId}`, {
        method: "DELETE",
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["pm-entries"] });
    },
  });
}

// ── PM Status (tools reaching ≥80% threshold) ─────────────────────

export interface PMStatusEntry {
  id: string;
  toolId: number;
  toolNo: string;
  toolLife: number;
  pmStrokes: number;
  strokesSinceLastPM: number;
  pmPercentage: number;
  totalLifetimeStrokes: number;
  lastMaintenanceDate: string | null;
  maintenanceCount: number;
}

export function usePMStatus() {
  return useQuery({
    queryKey: ["pm-status"],
    queryFn: () => apiFetch<PMStatusEntry[]>("/api/pm/status"),
    refetchInterval: 60_000, // refresh every minute
  });
}
