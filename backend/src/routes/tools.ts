import { Hono } from "hono";
import { db } from "../db";
import { sql } from "kysely";

const tools = new Hono();

// ─── Helper: normalize date to YYYY-MM-DD string ──────────────────
function toDateStr(d: string | Date): string {
  if (d instanceof Date) {
    return d.toISOString().slice(0, 10);
  }
  // If already a string like "2025-05-30" or ISO, extract date part
  return String(d).slice(0, 10);
}

// ─── Helper: get the latest scheduled date as "reference today" ────
async function getLatestScheduleDate(): Promise<string> {
  const row = await db
    .selectFrom("scheduled_production")
    .select(sql<string>`DATE_FORMAT(MAX(PS_DATE), '%Y-%m-%d')`.as("latest"))
    .executeTakeFirstOrThrow();
  return row.latest;
}

// ─── GET /summary ──────────────────────────────────────────────────
// Returns stat-card data for the tools dashboard overview.
tools.get("/summary", async (c) => {
  const refDate = c.req.query("date") || (await getLatestScheduleDate());

  // Week boundaries (Mon–Sun) around refDate
  const weekStart = sql<string>`DATE_SUB(${refDate}, INTERVAL (WEEKDAY(${refDate})) DAY)`;
  const weekEnd = sql<string>`DATE_ADD(DATE_SUB(${refDate}, INTERVAL (WEEKDAY(${refDate})) DAY), INTERVAL 6 DAY)`;

  const [todayStats, weekStats, activeTools, maintenanceTools] =
    await Promise.all([
      // Tools & machines scheduled for today (refDate)
      db
        .selectFrom("scheduled_production")
        .select([
          sql<number>`COUNT(DISTINCT PS_TOOLID)`.as("toolsToday"),
          sql<number>`COUNT(DISTINCT PS_MCID)`.as("machinesToday"),
          sql<number>`COALESCE(SUM(PS_QTY), 0)`.as("scheduledQtyToday"),
        ])
        .where("PS_DATE", "=", refDate)
        .executeTakeFirstOrThrow(),

      // Tools & machines scheduled for this week
      db
        .selectFrom("scheduled_production")
        .select([
          sql<number>`COUNT(DISTINCT PS_TOOLID)`.as("toolsThisWeek"),
          sql<number>`COUNT(DISTINCT PS_MCID)`.as("machinesThisWeek"),
        ])
        .where("PS_DATE", ">=", weekStart)
        .where("PS_DATE", "<=", weekEnd)
        .executeTakeFirstOrThrow(),

      // Total active tools
      db
        .selectFrom("components_tool")
        .select(sql<number>`COUNT(*)`.as("count"))
        .where("CT_ACTIVEYN", "=", "Y")
        .executeTakeFirstOrThrow(),

      // Tools at high usage (>400 production runs) — maintenance candidates
      db
        .selectFrom("production_details")
        .select(sql<number>`COUNT(DISTINCT PD_TOOLID)`.as("count"))
        .where(
          "PD_TOOLID",
          "in",
          db
            .selectFrom("production_details")
            .select("PD_TOOLID")
            .groupBy("PD_TOOLID")
            .having(sql`COUNT(*)`, ">", 400)
        )
        .executeTakeFirstOrThrow(),
    ]);

  return c.json({
    referenceDate: refDate,
    toolsToday: Number(todayStats.toolsToday),
    machinesToday: Number(todayStats.machinesToday),
    scheduledQtyToday: Number(todayStats.scheduledQtyToday),
    toolsThisWeek: Number(weekStats.toolsThisWeek),
    machinesThisWeek: Number(weekStats.machinesThisWeek),
    totalActiveTools: Number(activeTools.count),
    toolsNeedingMaintenance: Number(maintenanceTools.count),
  });
});

// ─── GET /weekly-schedule ──────────────────────────────────────────
// Returns tools scheduled per day for a given week (current or next).
tools.get("/weekly-schedule", async (c) => {
  const refDate = c.req.query("date") || (await getLatestScheduleDate());
  const weekOffset = Number(c.req.query("weekOffset") ?? 0); // 0=current, 1=next

  const weekStart = sql<string>`DATE_ADD(
    DATE_SUB(${refDate}, INTERVAL (WEEKDAY(${refDate})) DAY),
    INTERVAL ${weekOffset * 7} DAY
  )`;
  const weekEnd = sql<string>`DATE_ADD(${weekStart}, INTERVAL 6 DAY)`;

  const rows = await db
    .selectFrom("scheduled_production as ps")
    .innerJoin("components_tool as ct", "ct.CT_ID", "ps.PS_TOOLID")
    .innerJoin("components as c", "c.CO_ID", "ct.CT_COMPID")
    .innerJoin("machinemaster as mm", "mm.MCM_Id", "ps.PS_MCID")
    .select([
      sql<string>`DATE_FORMAT(ps.PS_DATE, '%Y-%m-%d')`.as("date"),
      "ps.PS_TOOLID as toolId",
      "ct.CT_TOOLNO as toolNo",
      "ct.CT_DRAWINGNO as drawingNo",
      "c.CO_PARTNO as partNo",
      "c.CO_PARTNAME as partName",
      "ps.PS_MCID as machineId",
      "mm.MCM_Name as machineName",
      "mm.MCM_Capacity as machineCapacity",
      "ps.PS_QTY as scheduledQty",
      "ct.CT_NO_OF_CAVITY as cavities",
    ])
    .where("ps.PS_DATE", ">=", weekStart)
    .where("ps.PS_DATE", "<=", weekEnd)
    .orderBy("ps.PS_DATE", "asc")
    .orderBy("mm.MCM_Name", "asc")
    .execute();

  // Group by day
  const byDay: Record<
    string,
    {
      date: string;
      tools: typeof rows;
      uniqueTools: number;
      uniqueMachines: number;
    }
  > = {};

  for (const row of rows) {
    const d = row.date;
    if (!byDay[d]) {
      byDay[d] = { date: d, tools: [], uniqueTools: 0, uniqueMachines: 0 };
    }
    byDay[d].tools.push(row);
  }

  // Compute unique counts
  for (const day of Object.values(byDay)) {
    day.uniqueTools = new Set(day.tools.map((t) => t.toolId)).size;
    day.uniqueMachines = new Set(day.tools.map((t) => t.machineId)).size;
  }

  return c.json({
    referenceDate: refDate,
    weekOffset,
    days: Object.values(byDay),
  });
});

// ─── GET /today-by-machine ─────────────────────────────────────────
// Returns tools grouped by machine for a specific date.
tools.get("/today-by-machine", async (c) => {
  const refDate = c.req.query("date") || (await getLatestScheduleDate());

  const rows = await db
    .selectFrom("scheduled_production as ps")
    .innerJoin("components_tool as ct", "ct.CT_ID", "ps.PS_TOOLID")
    .innerJoin("components as c", "c.CO_ID", "ct.CT_COMPID")
    .innerJoin("machinemaster as mm", "mm.MCM_Id", "ps.PS_MCID")
    .select([
      "ps.PS_MCID as machineId",
      "mm.MCM_Name as machineName",
      "mm.MCM_Capacity as machineCapacity",
      "mm.MCM_Make as machineMake",
      "ps.PS_TOOLID as toolId",
      "ct.CT_TOOLNO as toolNo",
      "ct.CT_DRAWINGNO as drawingNo",
      "c.CO_PARTNO as partNo",
      "c.CO_PARTNAME as partName",
      "ps.PS_QTY as scheduledQty",
      "ct.CT_NO_OF_CAVITY as cavities",
      "ct.CT_NO_OF_OPERATION as operations",
    ])
    .where("ps.PS_DATE", "=", refDate)
    .orderBy("mm.MCM_Name", "asc")
    .orderBy("ct.CT_TOOLNO", "asc")
    .execute();

  // Group by machine
  const machineMap = new Map<
    number,
    {
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
  >();

  for (const row of rows) {
    if (!machineMap.has(row.machineId)) {
      machineMap.set(row.machineId, {
        machineId: row.machineId,
        machineName: row.machineName ?? "Unknown",
        machineCapacity: row.machineCapacity,
        machineMake: row.machineMake,
        tools: [],
      });
    }
    machineMap.get(row.machineId)!.tools.push({
      toolId: row.toolId,
      toolNo: row.toolNo,
      drawingNo: row.drawingNo,
      partNo: row.partNo,
      partName: row.partName,
      scheduledQty: row.scheduledQty,
      cavities: row.cavities,
      operations: row.operations,
    });
  }

  return c.json({
    date: refDate,
    machines: Array.from(machineMap.values()),
  });
});

// ─── GET /maintenance ──────────────────────────────────────────────
// Tool usage analytics for maintenance planning.
tools.get("/maintenance", async (c) => {
  const limit = Number(c.req.query("limit") ?? 50);

  const rows = await db
    .selectFrom("production_details as pd")
    .innerJoin("components_tool as ct", "ct.CT_ID", "pd.PD_TOOLID")
    .innerJoin("components as c", "c.CO_ID", "ct.CT_COMPID")
    .select([
      "pd.PD_TOOLID as toolId",
      "ct.CT_TOOLNO as toolNo",
      "ct.CT_DRAWINGNO as drawingNo",
      "c.CO_PARTNO as partNo",
      "c.CO_PARTNAME as partName",
      sql<number>`COUNT(*)`.as("usageCount"),
      sql<number>`SUM(pd.PD_PRODQTY)`.as("totalStrokes"),
      sql<number>`SUM(pd.PD_SCRAPQTY)`.as("totalScrap"),
      sql<number>`ROUND(SUM(pd.PD_SCRAPQTY) / NULLIF(SUM(pd.PD_PRODQTY), 0) * 100, 2)`.as(
        "scrapRate"
      ),
      sql<string>`DATE_FORMAT(MIN(pd.PD_DATE), '%Y-%m-%d')`.as("firstUsed"),
      sql<string>`DATE_FORMAT(MAX(pd.PD_DATE), '%Y-%m-%d')`.as("lastUsed"),
      sql<number>`DATEDIFF(MAX(pd.PD_DATE), MIN(pd.PD_DATE))`.as(
        "daysInService"
      ),
    ])
    .groupBy(["pd.PD_TOOLID", "ct.CT_TOOLNO", "ct.CT_DRAWINGNO", "c.CO_PARTNO", "c.CO_PARTNAME"])
    .orderBy(sql`COUNT(*)`, "desc")
    .limit(limit)
    .execute();

  return c.json({
    tools: rows.map((r) => ({
      ...r,
      totalStrokes: Number(r.totalStrokes),
      totalScrap: Number(r.totalScrap),
      scrapRate: Number(r.scrapRate),
      daysInService: Number(r.daysInService),
      usageCount: Number(r.usageCount),
    })),
  });
});

// ─── GET /top-used ─────────────────────────────────────────────────
// Top N most-used tools by total production quantity (bar chart data).
tools.get("/top-used", async (c) => {
  const limit = Number(c.req.query("limit") ?? 10);

  const rows = await db
    .selectFrom("production_details as pd")
    .innerJoin("components_tool as ct", "ct.CT_ID", "pd.PD_TOOLID")
    .select([
      "pd.PD_TOOLID as toolId",
      "ct.CT_TOOLNO as toolNo",
      sql<number>`SUM(pd.PD_PRODQTY)`.as("totalProduced"),
      sql<number>`COUNT(*)`.as("usageCount"),
    ])
    .groupBy(["pd.PD_TOOLID", "ct.CT_TOOLNO"])
    .orderBy(sql`SUM(pd.PD_PRODQTY)`, "desc")
    .limit(limit)
    .execute();

  return c.json({
    tools: rows.map((r) => ({
      toolId: r.toolId,
      toolNo: r.toolNo,
      totalProduced: Number(r.totalProduced),
      usageCount: Number(r.usageCount),
    })),
  });
});

// ─── GET /lifecycle ────────────────────────────────────────────────
// Scatter plot data: X=days-in-service, Y=total-strokes, size=scrap%.
tools.get("/lifecycle", async (c) => {
  const rows = await db
    .selectFrom("production_details as pd")
    .innerJoin("components_tool as ct", "ct.CT_ID", "pd.PD_TOOLID")
    .select([
      "pd.PD_TOOLID as toolId",
      "ct.CT_TOOLNO as toolNo",
      sql<number>`SUM(pd.PD_PRODQTY)`.as("totalStrokes"),
      sql<number>`ROUND(SUM(pd.PD_SCRAPQTY) / NULLIF(SUM(pd.PD_PRODQTY), 0) * 100, 2)`.as(
        "scrapRate"
      ),
      sql<number>`DATEDIFF(MAX(pd.PD_DATE), MIN(pd.PD_DATE))`.as(
        "daysInService"
      ),
      sql<number>`COUNT(*)`.as("usageCount"),
    ])
    .groupBy(["pd.PD_TOOLID", "ct.CT_TOOLNO"])
    .having(sql`COUNT(*)`, ">", 10) // only tools with meaningful usage
    .execute();

  return c.json({
    tools: rows.map((r) => ({
      toolId: r.toolId,
      toolNo: r.toolNo,
      totalStrokes: Number(r.totalStrokes),
      scrapRate: Number(r.scrapRate) || 0,
      daysInService: Number(r.daysInService),
      usageCount: Number(r.usageCount),
    })),
  });
});

// ─── GET /available-dates ──────────────────────────────────────────
// Returns the range of dates with schedule data (for date picker).
tools.get("/available-dates", async (c) => {
  const row = await db
    .selectFrom("scheduled_production")
    .select([
      sql<string>`DATE_FORMAT(MIN(PS_DATE), '%Y-%m-%d')`.as("earliest"),
      sql<string>`DATE_FORMAT(MAX(PS_DATE), '%Y-%m-%d')`.as("latest"),
    ])
    .executeTakeFirstOrThrow();

  return c.json({
    earliest: row.earliest,
    latest: row.latest,
  });
});

export default tools;
