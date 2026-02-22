import { Hono } from "hono";
import { sql } from "kysely";
import { db } from "../db";
import {
  getEntries,
  addEntry,
  updateEntry,
  confirmMaintenance,
  deleteEntry,
} from "../db/pmStore";

const pm = new Hono();

// GET / — list all PM entries
pm.get("/", async (c) => {
  const entries = await getEntries();
  return c.json(entries);
});

// GET /status — PM entries that have reached ≥80% of pmStrokes threshold
pm.get("/status", async (c) => {
  const entries = await getEntries();
  if (entries.length === 0) return c.json([]);

  const results: Array<{
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
  }> = [];

  for (const entry of entries) {
    // Determine the "since" date: last maintenance or createdAt
    const lastMaintenance =
      entry.maintenanceHistory.length > 0
        ? entry.maintenanceHistory[entry.maintenanceHistory.length - 1].date
        : null;
    const sinceDate = lastMaintenance ?? entry.createdAt;

    // Query strokes since last PM
    const sinceResult = await db
      .selectFrom("production_details")
      .select(sql<number>`COALESCE(SUM(PD_PRODQTY), 0)`.as("totalQty"))
      .where("PD_TOOLID", "=", entry.toolId)
      .where("PD_DATE", ">=", sinceDate)
      .executeTakeFirst();

    // Query total lifetime strokes
    const lifetimeResult = await db
      .selectFrom("production_details")
      .select(sql<number>`COALESCE(SUM(PD_PRODQTY), 0)`.as("totalQty"))
      .where("PD_TOOLID", "=", entry.toolId)
      .executeTakeFirst();

    const strokesSinceLastPM = Number(sinceResult?.totalQty ?? 0);
    const totalLifetimeStrokes = Number(lifetimeResult?.totalQty ?? 0);
    const pmPercentage =
      entry.pmStrokes > 0
        ? Math.round((strokesSinceLastPM / entry.pmStrokes) * 100)
        : 0;

    // Only include tools that have reached ≥80% of PM threshold
    if (pmPercentage >= 80) {
      results.push({
        id: entry.id,
        toolId: entry.toolId,
        toolNo: entry.toolNo,
        toolLife: entry.toolLife,
        pmStrokes: entry.pmStrokes,
        strokesSinceLastPM,
        pmPercentage,
        totalLifetimeStrokes,
        lastMaintenanceDate: lastMaintenance,
        maintenanceCount: entry.maintenanceHistory.length,
      });
    }
  }

  return c.json(results);
});

// POST / — add a new PM entry
pm.post("/", async (c) => {
  const body = await c.req.json<{
    toolId: number;
    toolNo: string;
    toolLife: number;
    pmStrokes: number;
  }>();

  if (!body.toolId || !body.toolNo || !body.toolLife || !body.pmStrokes) {
    return c.json({ message: "toolId, toolNo, toolLife, and pmStrokes are required" }, 400);
  }

  try {
    const entry = await addEntry(body.toolId, body.toolNo, body.toolLife, body.pmStrokes);
    return c.json(entry, 201);
  } catch (err: any) {
    return c.json({ message: err.message }, 409);
  }
});

// PATCH /:id — update tool life and/or PM strokes
pm.patch("/:id", async (c) => {
  const { id } = c.req.param();
  const body = await c.req.json<{ toolLife?: number; pmStrokes?: number }>();

  if (body.toolLife === undefined && body.pmStrokes === undefined) {
    return c.json({ message: "At least one of toolLife or pmStrokes is required" }, 400);
  }

  try {
    const entry = await updateEntry(id, body);
    return c.json(entry);
  } catch (err: any) {
    return c.json({ message: err.message }, 404);
  }
});

// POST /:id/confirm — confirm maintenance done
pm.post("/:id/confirm", async (c) => {
  const { id } = c.req.param();

  try {
    const entry = await confirmMaintenance(id);
    return c.json(entry);
  } catch (err: any) {
    return c.json({ message: err.message }, 404);
  }
});

// DELETE /:id — remove a PM entry
pm.delete("/:id", async (c) => {
  const { id } = c.req.param();

  try {
    await deleteEntry(id);
    return c.json({ message: "Deleted" });
  } catch (err: any) {
    return c.json({ message: err.message }, 404);
  }
});

export default pm;
