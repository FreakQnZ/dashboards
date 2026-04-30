import { Hono } from "hono";
import { sql } from "kysely";
import { db } from "../db";
import { getAuth } from "../middleware/auth";

const rmCorrection = new Hono();

rmCorrection.post("/submit", async (c) => {
  type CorrectionItem = {
    batch: string;
    rmid: number;
    theoRmRemaining?: number;
    actualRm?: number;
    rmRemarks?: string;
    scrapBefore?: number;
    actualScrap?: number;
    scrapRemarks?: string;
  };

  const auth = getAuth(c);
  const body = await c.req.json().catch(() => null) as { items?: CorrectionItem[] } | null;
  const rawItems = body?.items ?? [];
  const items = rawItems.filter((item) => {
    const actualRm = Number(item?.actualRm);
    const actualScrap = Number(item?.actualScrap);
    return Number.isFinite(actualRm) || Number.isFinite(actualScrap);
  });

  if (!Array.isArray(rawItems) || items.length === 0) {
    return c.json({ error: "No rows with Actual RM or Actual Scrap provided" }, 400);
  }

  try {
    let insertedRm = 0;
    let insertedScrap = 0;
    for (const item of items) {
      const batch = (item.batch ?? "").trim();
      const rmid = Number(item.rmid);
      const actualRm = Number(item.actualRm);
      const actualScrap = Number(item.actualScrap);
      const hasRm = Number.isFinite(actualRm);
      const hasScrap = Number.isFinite(actualScrap);

      if (!batch || !Number.isFinite(rmid)) {
        return c.json({ error: "Invalid correction payload" }, 400);
      }

      if (batch.length > 45) {
        return c.json({ error: "Batch value exceeds 45 characters" }, 400);
      }

      if (hasRm) {
        const remarks = (item.rmRemarks ?? "").trim();
        const theoRmRemaining = Number(item.theoRmRemaining);

        if (!remarks || !Number.isFinite(theoRmRemaining)) {
          return c.json({ error: "Invalid RM correction payload" }, 400);
        }

        if (remarks.length > 50) {
          return c.json({ error: "RM Remarks cannot exceed 50 characters" }, 400);
        }

        const correction = Number((theoRmRemaining - actualRm).toFixed(2));

        await sql`
          INSERT INTO rm_prodcorrection
            (rc_batchno, rc_rmid, rc_theo, rc_correction, rc_remarks, rc_createddt, rc_userid)
          VALUES
            (${batch}, ${rmid}, ${theoRmRemaining}, ${correction}, ${remarks}, NOW(), ${auth.userId})
        `.execute(db);

        insertedRm += 1;
      }

      if (hasScrap) {
        const scrapBefore = Number(item.scrapBefore);
        const scrapRemarks = (item.scrapRemarks ?? "").trim();

        if (!Number.isFinite(scrapBefore) || !scrapRemarks) {
          return c.json({ error: "Invalid Scrap correction payload" }, 400);
        }

        if (scrapRemarks.length > 50) {
          return c.json({ error: "Scrap Remarks cannot exceed 50 characters" }, 400);
        }

        const scrapCorrection = Number((scrapBefore - actualScrap).toFixed(2));

        await sql`
          INSERT INTO rm_scrapcorrection
            (rc_batchno, rc_rmid, rc_QtyBefore, rc_correction, rc_remarks, rc_createddt, rc_userid, rc_movementtype)
          VALUES
            (${batch}, ${rmid}, ${scrapBefore}, ${scrapCorrection}, ${scrapRemarks}, NOW(), ${auth.userId}, 'P')
        `.execute(db);

        insertedScrap += 1;
      }
    }

    return c.json({ inserted: insertedRm + insertedScrap, insertedRm, insertedScrap });
  } catch (err: any) {
    console.error("RM Correction submit error:", err);
    return c.json(
      {
        message: "Database insert failed",
        error: "Database insert failed",
        details: err?.message ?? String(err),
      },
      500
    );
  }
});

rmCorrection.get("/batch/:batch", async (c) => {
  const batch = (c.req.param("batch") ?? "").trim();

  if (!batch) {
    return c.json({ error: "Batch is required" }, 400);
  }

  try {
    const rows = await sql<{
      productionDate: string;
      partNo: string | null;
      lotNo: string | null;
      tool: string | null;
      calCompWt: number;
      noOfComp: number;
      sfRejNos: number;
      suWastageNos: number;
      scrapKg: number;
      partWtKg: number;
      theoRmKg: number;
    }>`
      SELECT
        DATE_FORMAT(pd_date, '%d-%m-%Y') AS productionDate,
        CO_PARTNO AS partNo,
        PD_LotNo AS lotNo,
        CT_TOOLNO AS tool,
        ROUND((COALESCE(CO_WEIGHT, 0) * COALESCE(pd_prodqty, 0)) / 1000, 4) AS calCompWt,
        pd_prodqty AS noOfComp,
        PD_SFREJECT AS sfRejNos,
        PD_SWQTY AS suWastageNos,
        PD_SCRAPQTY AS scrapKg,
        PD_QTYKG AS partWtKg,
        ROUND(pd_prodqty / NULLIF(conVal, 0), 4) AS theoRmKg
      FROM production_details
      LEFT JOIN materialmaster ON mm_id = pd_rmid
      LEFT JOIN components_tool ON ct_id = pd_toolid
      LEFT JOIN scheduled_production ON pd_psid = ps_id
      LEFT JOIN components ON PS_PARENTCOMPID = CO_ID
      LEFT JOIN (
        SELECT
          CT_ID AS ctid,
          ((1 / ((MT_Density * MM_Thickness) * MM_StripWidth)) * ((1000 * CT_NO_OF_CAVITY) / CT_Pitch)) AS conVal
        FROM components_tool
        INNER JOIN materialmaster ON CT_RMID = MM_Id
        INNER JOIN materialtypemaster ON MM_MTID = MT_Id
        WHERE CT_ActiveYN = 'Y' AND CT_PITCH > 0 AND CT_NO_OF_CAVITY > 0
      ) toolConv ON ctid = ct_id
      WHERE pd_batchno = ${batch}
      ORDER BY pd_date DESC
    `.execute(db);

    const entries = rows.rows.map((r) => ({
      productionDate: r.productionDate,
      partNo: r.partNo ?? "",
      lotNo: r.lotNo ?? "",
      tool: r.tool ?? "",
      calCompWt: Number(r.calCompWt),
      noOfComp: Number(r.noOfComp),
      sfRejNos: Number(r.sfRejNos),
      suWastageNos: Number(r.suWastageNos),
      scrapKg: Number(r.scrapKg),
      partWtKg: Number(r.partWtKg),
      theoRmKg: Number(r.theoRmKg),
    }));

    return c.json({ count: entries.length, entries });
  } catch (err: any) {
    console.error("RM Correction batch details query error:", err);
    return c.json(
      { error: "Database query failed", details: err?.message ?? String(err) },
      500
    );
  }
});

rmCorrection.get("/history/:batch/:rmid", async (c) => {
  const batch = (c.req.param("batch") ?? "").trim();
  const rmid = Number(c.req.param("rmid"));

  if (!batch || !Number.isFinite(rmid)) {
    return c.json({ error: "Valid batch and RM id are required" }, 400);
  }

  try {
    const rows = await sql<{
      type: "RM" | "SCRAP";
      qtyBefore: number;
      correction: number;
      remarks: string | null;
      createdAt: string;
      userLogin: string | null;
      sortAt: string;
    }>`
      SELECT
        historyRows.type,
        historyRows.qtyBefore,
        historyRows.correction,
        historyRows.remarks,
        DATE_FORMAT(historyRows.sortAt, '%d-%m-%Y %H:%i:%s') AS createdAt,
        historyRows.userLogin,
        historyRows.sortAt
      FROM (
        SELECT
          'RM' AS type,
          COALESCE(p.rc_theo, 0) AS qtyBefore,
          COALESCE(p.rc_correction, 0) AS correction,
          p.rc_remarks AS remarks,
          p.rc_createddt AS sortAt,
          u.US_login AS userLogin
        FROM rm_prodcorrection p
        LEFT JOIN users u ON u.US_id = p.rc_userid
        WHERE TRIM(p.rc_batchno) = TRIM(${batch})
          AND p.rc_rmid = ${rmid}

        UNION ALL

        SELECT
          'SCRAP' AS type,
          COALESCE(s.rc_QtyBefore, 0) AS qtyBefore,
          COALESCE(s.rc_correction, 0) AS correction,
          s.rc_remarks AS remarks,
          s.rc_createddt AS sortAt,
          u.US_login AS userLogin
        FROM rm_scrapcorrection s
        LEFT JOIN users u ON u.US_id = s.rc_userid
        WHERE TRIM(s.rc_batchno) = TRIM(${batch})
          AND s.rc_rmid = ${rmid}
          AND UPPER(COALESCE(s.rc_movementtype, 'P')) = 'P'
      ) historyRows
      ORDER BY historyRows.sortAt DESC
    `.execute(db);

    const entries = rows.rows.map((r) => ({
      type: r.type,
      qtyBefore: Number(r.qtyBefore),
      correction: Number(r.correction),
      remarks: r.remarks ?? "",
      createdAt: r.createdAt,
      userLogin: r.userLogin ?? "",
    }));

    return c.json({ count: entries.length, entries });
  } catch (err: any) {
    console.error("RM Correction history query error:", err);
    return c.json(
      { error: "Database query failed", details: err?.message ?? String(err) },
      500
    );
  }
});

/**
 * GET /api/rm-correction
 *
 * Returns stock adjustment candidates with RM remaining and scrap.
 */
rmCorrection.get("/", async (c) => {
  const startDateParam = (c.req.query("startDate") ?? "").trim();
  const isValidStartDate = /^\d{4}-\d{2}-\d{2}$/.test(startDateParam);
  const startDate = isValidStartDate ? startDateParam : null;

  try {
    const rows = await sql<{
      "Raw Material": string | null;
      batch: string;
      rmid: number;
      "Total Inwarded": number;
      "RM Given": number;
      "RM Remaining": number;
      Scrap: number;
    }>`
      SELECT
        COALESCE(prodQ.MM_RawMtPartNo, '') AS \`Raw Material\`,
        TRIM(prodRM.batch) AS batch,
        prodRM.rd_rmid AS rmid,
        ROUND(COALESCE(inwardTotals.totalInwarded, 0), 2) AS \`Total Inwarded\`,
        ROUND(COALESCE(prodRM.ProdQty, 0), 2) AS \`RM Given\`,

        ROUND(
          COALESCE((prodRM.ProdQty - prodQ.ThRMForProduction), 0) -
          COALESCE(corrections.totalCorrection, 0),
          2
        ) AS \`RM Remaining\`,

        ROUND(
          COALESCE(prodQ.pdscrap, 0) - COALESCE(scrapCorrections.totalScrapCorrection, 0),
          2
        ) AS Scrap
      FROM (
        SELECT
          RD_BATCHNO AS batch,
          rd_rmid,
          ROUND(
            SUM(CASE WHEN ri_movement = 'O' THEN rd_qty ELSE 0 END) -
            SUM(CASE WHEN ri_movement = 'I' THEN rd_acceptedqty ELSE 0 END),
            2
          ) AS ProdQty
        FROM rm_inwarddetails
        JOIN rm_inwardmaster ON rd_riid = ri_id
        WHERE RI_MOVEMENTTYPE = 3
        GROUP BY RD_BATCHNO, rd_rmid
      ) prodRM
      JOIN (
        SELECT DISTINCT PD_BATCHNO AS batch
        FROM production_details
        WHERE DATE(PD_DATE)  >= COALESCE(${startDate}, DATE_SUB(CURDATE(), INTERVAL 10 DAY))
          AND DATE(PD_DATE)  <= CURDATE()
      ) recentBatches ON recentBatches.batch = prodRM.batch
      LEFT JOIN (
        SELECT
          RD_BATCHNO AS batch,
          rd_rmid,
          ROUND(SUM(CASE WHEN ri_movement = 'I' AND RI_MOVEMENTTYPE = 1 THEN rd_acceptedqty ELSE 0 END), 2) AS totalInwarded
        FROM rm_inwarddetails
        JOIN rm_inwardmaster ON rd_riid = ri_id
        GROUP BY RD_BATCHNO, rd_rmid
      ) inwardTotals ON inwardTotals.batch = prodRM.batch AND inwardTotals.rd_rmid = prodRM.rd_rmid
      LEFT JOIN (
        SELECT
          TRIM(rc_batchno) AS rc_batchno,
          rc_rmid,
          ROUND(SUM(COALESCE(rc_correction, 0)), 2) AS totalCorrection
        FROM rm_prodcorrection
        GROUP BY rc_batchno, rc_rmid
      ) corrections ON corrections.rc_batchno = TRIM(prodRM.batch) AND corrections.rc_rmid = prodRM.rd_rmid
      LEFT JOIN (
        SELECT
          TRIM(rc_batchno) AS rc_batchno,
          rc_rmid,
          ROUND(SUM(COALESCE(rc_correction, 0)), 2) AS totalScrapCorrection
        FROM rm_scrapcorrection
        WHERE UPPER(COALESCE(rc_movementtype, 'P')) = 'P'
        GROUP BY rc_batchno, rc_rmid
      ) scrapCorrections ON scrapCorrections.rc_batchno = TRIM(prodRM.batch) AND scrapCorrections.rc_rmid = prodRM.rd_rmid
      LEFT JOIN (
        SELECT
          pd_batchno AS batch,
          MM_RawMtPartNo,
          mm_id,
          ROUND(SUM((PD_PRODQTY) / conVal), 2) AS ThRMForProduction,
          SUM(PD_SCRAPQTY) AS pdscrap
        FROM production_details
        LEFT JOIN scheduled_production ON pd_psid = ps_id
        LEFT JOIN (
          SELECT
            CT_COMPID,
            mm_id,
            MM_RawMtPartNo,
            ((1 / ((MT_Density * MM_Thickness) * MM_StripWidth)) * ((1000 * CT_NO_OF_CAVITY) / CT_Pitch)) AS conVal
          FROM components_tool
          INNER JOIN materialmaster ON CT_RMID = MM_Id
          INNER JOIN materialtypemaster ON MM_MTID = MT_Id
          WHERE CT_ActiveYN = 'Y'
            AND CT_PPC = 'Y'
            AND CT_PITCH > 0
            AND CT_NO_OF_CAVITY > 0
        ) t ON CT_COMPID = PS_PARENTCOMPID
        GROUP BY pd_batchno, mm_id, MM_RawMtPartNo
      ) prodQ ON prodQ.batch = prodRM.batch AND prodQ.mm_id = prodRM.rd_rmid
      WHERE NOT (
        ROUND(
          COALESCE((prodRM.ProdQty - prodQ.ThRMForProduction), 0) -
          COALESCE(corrections.totalCorrection, 0),
          2
        ) = 0
        AND ROUND(
          COALESCE(prodQ.pdscrap, 0) - COALESCE(scrapCorrections.totalScrapCorrection, 0),
          2
        ) = 0
      )
      ORDER BY \`Raw Material\`, batch
    `.execute(db);

    const entries = rows.rows.map((r) => ({
      rawMaterial: r["Raw Material"] ?? "",
      batch: r.batch,
      rmid: Number(r.rmid),
      totalInwarded: Number(r["Total Inwarded"]),
      rmGiven: Number(r["RM Given"]),
      rmRemaining: Number(r["RM Remaining"]),
      scrap: Number(r.Scrap),
    }));

    return c.json({
      count: entries.length,
      entries,
    });
  } catch (err: any) {
    console.error("RM Correction query error:", err);
    return c.json(
      { error: "Database query failed", details: err?.message ?? String(err) },
      500
    );
  }
});

export default rmCorrection;
