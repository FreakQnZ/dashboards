import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "./client";

// ── Response Types ─────────────────────────────────────────────────

export interface ToolsSummary {
  referenceDate: string;
  toolsToday: number;
  machinesToday: number;
  scheduledQtyToday: number;
  toolsThisWeek: number;
  machinesThisWeek: number;
  totalActiveTools: number;
  toolsNeedingMaintenance: number;
}

export interface ScheduledTool {
  date: string;
  toolId: number;
  toolNo: string;
  drawingNo: string;
  partNo: string;
  partName: string;
  machineId: number;
  machineName: string;
  machineCapacity: string;
  scheduledQty: number;
  cavities: number;
}

export interface WeeklyScheduleDay {
  date: string;
  tools: ScheduledTool[];
  uniqueTools: number;
  uniqueMachines: number;
}

export interface WeeklyScheduleResponse {
  referenceDate: string;
  weekOffset: number;
  days: WeeklyScheduleDay[];
}

export interface MachineToolGroup {
  machineId: number;
  machineName: string;
  machineCapacity: string;
  machineMake: string;
  tools: Array<{
    toolId: number;
    toolNo: string;
    drawingNo: string;
    partNo: string;
    partName: string;
    scheduledQty: number;
    cavities: number;
    operations: number;
  }>;
}

export interface TodayByMachineResponse {
  date: string;
  machines: MachineToolGroup[];
}

export interface MaintenanceTool {
  toolId: number;
  toolNo: string;
  drawingNo: string;
  partNo: string;
  partName: string;
  usageCount: number;
  totalStrokes: number;
  totalScrap: number;
  scrapRate: number;
  firstUsed: string;
  lastUsed: string;
  daysInService: number;
}

export interface TopUsedTool {
  toolId: number;
  toolNo: string;
  totalProduced: number;
  usageCount: number;
}

export interface LifecycleTool {
  toolId: number;
  toolNo: string;
  totalStrokes: number;
  scrapRate: number;
  daysInService: number;
  usageCount: number;
}

export interface AvailableDates {
  earliest: string;
  latest: string;
}

// ── Hooks ──────────────────────────────────────────────────────────

export function useToolsSummary(date?: string) {
  const params = date ? `?date=${date}` : "";
  return useQuery({
    queryKey: ["tools", "summary", date],
    queryFn: () => apiFetch<ToolsSummary>(`/api/tools/summary${params}`),
  });
}

export function useWeeklySchedule(date?: string, weekOffset = 0) {
  const params = new URLSearchParams();
  if (date) params.set("date", date);
  if (weekOffset) params.set("weekOffset", String(weekOffset));
  const qs = params.toString() ? `?${params}` : "";
  return useQuery({
    queryKey: ["tools", "weekly-schedule", date, weekOffset],
    queryFn: () =>
      apiFetch<WeeklyScheduleResponse>(`/api/tools/weekly-schedule${qs}`),
  });
}

export function useTodayByMachine(date?: string) {
  const params = date ? `?date=${date}` : "";
  return useQuery({
    queryKey: ["tools", "today-by-machine", date],
    queryFn: () =>
      apiFetch<TodayByMachineResponse>(`/api/tools/today-by-machine${params}`),
  });
}

export function useMaintenanceTools(limit = 50) {
  return useQuery({
    queryKey: ["tools", "maintenance", limit],
    queryFn: () =>
      apiFetch<{ tools: MaintenanceTool[] }>(
        `/api/tools/maintenance?limit=${limit}`
      ),
  });
}

export function useTopUsedTools(limit = 10) {
  return useQuery({
    queryKey: ["tools", "top-used", limit],
    queryFn: () =>
      apiFetch<{ tools: TopUsedTool[] }>(
        `/api/tools/top-used?limit=${limit}`
      ),
  });
}

export function useToolLifecycle() {
  return useQuery({
    queryKey: ["tools", "lifecycle"],
    queryFn: () => apiFetch<{ tools: LifecycleTool[] }>("/api/tools/lifecycle"),
  });
}

export function useAvailableDates() {
  return useQuery({
    queryKey: ["tools", "available-dates"],
    queryFn: () => apiFetch<AvailableDates>("/api/tools/available-dates"),
  });
}
