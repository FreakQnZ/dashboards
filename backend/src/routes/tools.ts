import { Hono } from "hono";
import { db } from "../db";
import { sql } from "kysely";

const tools = new Hono();

function isValidDateParam(value: string | undefined): value is string {
  return !!value && /^\d{4}-\d{2}-\d{2}$/.test(value);
}

function addDays(dateStr: string, days: number): string {
  const date = new Date(`${dateStr}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

type ToolMachineRow = {
  date: string;
  toolId: number;
  toolNo: string;
  drawingNo: string;
  partNo: string;
  partName: string;
  machineId: number;
  machineName: string;
  machineCapacity: string;
  machineMake: string;
  scheduledQty: number;
};

async function getToolsForDate(
  mode: "today" | "tomorrow",
  baseDate?: string
) {
  const offset = mode === "tomorrow" ? 1 : 0;
  const dateSql =
    baseDate
      ? sql`DATE_ADD(${baseDate}, INTERVAL ${offset} DAY)`
      : mode === "tomorrow"
        ? sql`DATE_ADD(CURDATE(), INTERVAL 1 DAY)`
        : sql`CURDATE()`;

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
      "mm.MCM_Make as machineMake",
      "ps.PS_QTY as scheduledQty",
    ])
    .where(sql<boolean>`ps.PS_DATE = ${dateSql}`)
    .orderBy("ct.CT_TOOLNO", "asc")
    .orderBy("mm.MCM_Name", "asc")
    .execute();

  const toolMap = new Map<
    number,
    {
      toolId: number;
      toolNo: string;
      drawingNo: string;
      partNo: string;
      partName: string;
      machineCount: number;
      totalScheduledQty: number;
      machines: Array<{
        machineId: number;
        machineName: string;
        machineCapacity: string;
        machineMake: string;
        scheduledQty: number;
      }>;
    }
  >();

  for (const row of rows as ToolMachineRow[]) {
    if (!toolMap.has(row.toolId)) {
      toolMap.set(row.toolId, {
        toolId: row.toolId,
        toolNo: row.toolNo,
        drawingNo: row.drawingNo,
        partNo: row.partNo,
        partName: row.partName,
        machineCount: 0,
        totalScheduledQty: 0,
        machines: [],
      });
    }

    const tool = toolMap.get(row.toolId)!;
    tool.machines.push({
      machineId: row.machineId,
      machineName: row.machineName,
      machineCapacity: row.machineCapacity,
      machineMake: row.machineMake,
      scheduledQty: Number(row.scheduledQty),
    });
    tool.totalScheduledQty += Number(row.scheduledQty);
  }

  for (const tool of toolMap.values()) {
    tool.machineCount = new Set(tool.machines.map((m) => m.machineId)).size;
  }

  return {
    date: rows[0]?.date ?? (baseDate ? addDays(baseDate, offset) : null),
    count: toolMap.size,
    tools: Array.from(toolMap.values()),
  };
}

// GET /search - search tools by tool number
tools.get("/search", async (c) => {
  const q = c.req.query("q")?.trim() ?? "";
  if (!q) {
    return c.json([]);
  }

  const rows = await db
    .selectFrom("components_tool")
    .select(["CT_ID as id", "CT_TOOLNO as toolNo"])
    .where("CT_ACTIVEYN", "=", "Y")
    .where("CT_TOOLNO", "like", `%${q}%`)
    .orderBy("CT_TOOLNO", "asc")
    .limit(20)
    .execute();

  return c.json(rows);
});

// GET /today - all tools scheduled for today with count and machines
tools.get("/today", async (c) => {
  const dateParam = c.req.query("date");
  const baseDate = isValidDateParam(dateParam) ? dateParam : undefined;
  const result = await getToolsForDate("today", baseDate);
  return c.json(result);
});

// GET /tomorrow - all tools scheduled for tomorrow with count and machines
tools.get("/tomorrow", async (c) => {
  const dateParam = c.req.query("date");
  const baseDate = isValidDateParam(dateParam) ? dateParam : undefined;
  const result = await getToolsForDate("tomorrow", baseDate);
  return c.json(result);
});

export default tools;
