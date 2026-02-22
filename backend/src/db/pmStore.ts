import { join } from "path";

// ── Types ──────────────────────────────────────────────────────────

export interface MaintenanceRecord {
  date: string; // ISO datetime
}

export interface PMEntry {
  id: string;
  toolId: number;
  toolNo: string;
  toolLife: number;
  pmStrokes: number;
  maintenanceHistory: MaintenanceRecord[];
  createdAt: string; // ISO datetime
}

// ── File path ──────────────────────────────────────────────────────

const DATA_FILE = join(import.meta.dir, "../../data/pm-entries.json");

// ── Helpers ────────────────────────────────────────────────────────

async function readEntries(): Promise<PMEntry[]> {
  try {
    const file = Bun.file(DATA_FILE);
    if (!(await file.exists())) {
      await Bun.write(DATA_FILE, "[]");
      return [];
    }
    return (await file.json()) as PMEntry[];
  } catch {
    return [];
  }
}

async function writeEntries(entries: PMEntry[]): Promise<void> {
  await Bun.write(DATA_FILE, JSON.stringify(entries, null, 2));
}

// ── Public API ─────────────────────────────────────────────────────

export async function getEntries(): Promise<PMEntry[]> {
  return readEntries();
}

export async function addEntry(
  toolId: number,
  toolNo: string,
  toolLife: number,
  pmStrokes: number
): Promise<PMEntry> {
  const entries = await readEntries();

  // Prevent duplicates
  if (entries.some((e) => e.toolId === toolId)) {
    throw new Error(`Tool ${toolNo} (ID: ${toolId}) is already added`);
  }

  const entry: PMEntry = {
    id: crypto.randomUUID(),
    toolId,
    toolNo,
    toolLife,
    pmStrokes,
    maintenanceHistory: [],
    createdAt: new Date().toISOString(),
  };

  entries.push(entry);
  await writeEntries(entries);
  return entry;
}

export async function updateEntry(
  entryId: string,
  updates: { toolLife?: number; pmStrokes?: number }
): Promise<PMEntry> {
  const entries = await readEntries();
  const entry = entries.find((e) => e.id === entryId);
  if (!entry) {
    throw new Error(`Entry ${entryId} not found`);
  }

  if (updates.toolLife !== undefined) entry.toolLife = updates.toolLife;
  if (updates.pmStrokes !== undefined) entry.pmStrokes = updates.pmStrokes;
  await writeEntries(entries);
  return entry;
}

export async function confirmMaintenance(entryId: string): Promise<PMEntry> {
  const entries = await readEntries();
  const entry = entries.find((e) => e.id === entryId);
  if (!entry) {
    throw new Error(`Entry ${entryId} not found`);
  }

  entry.maintenanceHistory.push({ date: new Date().toISOString() });
  await writeEntries(entries);
  return entry;
}

export async function deleteEntry(entryId: string): Promise<void> {
  const entries = await readEntries();
  const idx = entries.findIndex((e) => e.id === entryId);
  if (idx === -1) {
    throw new Error(`Entry ${entryId} not found`);
  }

  entries.splice(idx, 1);
  await writeEntries(entries);
}
