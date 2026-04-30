import { useMutation, useQuery } from "@tanstack/react-query";
import { apiFetch } from "./client";

export interface RMCorrectionEntry {
  rawMaterial: string;
  batch: string;
  rmid: number;
  rmGiven: number;
  totalInwarded: number;
  rmRemaining: number;
  scrap: number;
}

export interface RMCorrectionResponse {
  count: number;
  entries: RMCorrectionEntry[];
}

export interface RMCorrectionBatchDetailEntry {
  productionDate: string;
  partNo: string;
  lotNo: string;
  tool: string;
  calCompWt: number;
  noOfComp: number;
  sfRejNos: number;
  suWastageNos: number;
  scrapKg: number;
  partWtKg: number;
  theoRmKg: number;
}

export interface RMCorrectionBatchDetailResponse {
  count: number;
  entries: RMCorrectionBatchDetailEntry[];
}

export interface RMCorrectionHistoryEntry {
  type: "RM" | "SCRAP";
  qtyBefore: number;
  correction: number;
  remarks: string;
  createdAt: string;
  userLogin: string;
}

export interface RMCorrectionHistoryResponse {
  count: number;
  entries: RMCorrectionHistoryEntry[];
}

export interface RMCorrectionSubmitItem {
  batch: string;
  rmid: number;
  theoRmRemaining?: number;
  actualRm?: number;
  rmRemarks?: string;
  scrapBefore?: number;
  actualScrap?: number;
  scrapRemarks?: string;
}

export interface RMCorrectionSubmitRequest {
  items: RMCorrectionSubmitItem[];
}

export interface RMCorrectionSubmitResponse {
  inserted: number;
  insertedRm: number;
  insertedScrap: number;
}

export function useRMCorrectionEntries(startDate: string | null) {
  return useQuery({
    queryKey: ["rm-correction", startDate],
    queryFn: async () => {
      const startedAt = performance.now();
      const query = startDate ? `?startDate=${encodeURIComponent(startDate)}` : "";
      console.log(`[RM Correction][API] /api/rm-correction${query} request started`);
      const response = await apiFetch<RMCorrectionResponse>(`/api/rm-correction${query}`);
      const durationMs = performance.now() - startedAt;
      console.log(
        `[RM Correction][API] /api/rm-correction${query} completed in ${durationMs.toFixed(2)} ms (rows=${response.entries.length})`
      );
      return response;
    },
  });
}

export function useRMCorrectionBatchDetails(
  batch: string,
  enabled: boolean
) {
  return useQuery({
    queryKey: ["rm-correction-batch", batch],
    enabled: enabled && !!batch,
    queryFn: async () => {
      return apiFetch<RMCorrectionBatchDetailResponse>(`/api/rm-correction/batch/${encodeURIComponent(batch)}`);
    },
  });
}

export function useRMCorrectionHistory(
  batch: string,
  rmid: number | null,
  enabled: boolean
) {
  return useQuery({
    queryKey: ["rm-correction-history", batch, rmid],
    enabled: enabled && !!batch && Number.isFinite(rmid),
    queryFn: async () => {
      return apiFetch<RMCorrectionHistoryResponse>(
        `/api/rm-correction/history/${encodeURIComponent(batch)}/${encodeURIComponent(String(rmid))}`
      );
    },
  });
}

export function useSubmitRMCorrections() {
  return useMutation({
    mutationFn: (payload: RMCorrectionSubmitRequest) =>
      apiFetch<RMCorrectionSubmitResponse>("/api/rm-correction/submit", {
        method: "POST",
        body: JSON.stringify(payload),
      }),
  });
}
