import { memo, useEffect, useMemo, useRef, useState } from "react";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import Button from "@mui/material/Button";
import Paper from "@mui/material/Paper";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableContainer from "@mui/material/TableContainer";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";
import TextField from "@mui/material/TextField";
import CircularProgress from "@mui/material/CircularProgress";
import Alert from "@mui/material/Alert";
import Snackbar from "@mui/material/Snackbar";
import IconButton from "@mui/material/IconButton";
import Tooltip from "@mui/material/Tooltip";
import Dialog from "@mui/material/Dialog";
import DialogTitle from "@mui/material/DialogTitle";
import DialogContent from "@mui/material/DialogContent";
import DialogActions from "@mui/material/DialogActions";
import EditNoteIcon from "@mui/icons-material/EditNote";
import EditIcon from "@mui/icons-material/Edit";
import HistoryIcon from "@mui/icons-material/History";
import TableViewIcon from "@mui/icons-material/TableView";
import { useRMCorrectionBatchDetails, useRMCorrectionEntries, useRMCorrectionHistory, useSubmitRMCorrections } from "@/api";
import type { RMCorrectionEntry } from "@/api";
import { useAuth } from "@/auth/AuthContext";

type Severity = "success" | "error";

type CorrectionForm = {
  rmCorrection: string;
  rmRemarks: string;
  scrapCorrection: string;
  scrapRemarks: string;
};

type FormState = Record<string, CorrectionForm>;
const EMPTY_FORM: CorrectionForm = {
  rmCorrection: "",
  rmRemarks: "",
  scrapCorrection: "",
  scrapRemarks: "",
};

// Only these user IDs can edit RM corrections
const ALLOWED_EDIT_USER_IDS = [5, 43, 268];

function rowKey(entry: RMCorrectionEntry): string {
  return `${entry.rawMaterial}__${entry.batch}`;
}

function isEntered(value: string): boolean {
  return value.trim() !== "";
}

function emptyForm(): CorrectionForm {
  return { ...EMPTY_FORM };
}

type EditDialogState = {
  open: boolean;
  key: string | null;
};

type HistoryDialogState = {
  open: boolean;
  batch: string;
  rmid: number | null;
  rawMaterial: string;
};

function formatDateYYYYMMDD(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function formatWaterfall(markers: Array<{ name: string; time: number }>): string {
  if (markers.length === 0) {
    return "";
  }
  const base = markers[0].time;
  return markers
    .map((m, index) => {
      const absolute = m.time - base;
      const delta = index === 0 ? 0 : m.time - markers[index - 1].time;
      return `${m.name} [t+${absolute}ms, +${delta}ms]`;
    })
    .join(" -> ");
}

const CorrectionRow = memo(function CorrectionRow({
  entry,
  onOpenEdit,
  onOpenHistory,
  canEdit,
}: {
  entry: RMCorrectionEntry;
  onOpenEdit: (entry: RMCorrectionEntry) => void;
  onOpenHistory: (entry: RMCorrectionEntry) => void;
  canEdit: boolean;
}) {
  const [isExpanded, setIsExpanded] = useState(false);
  const { data, isLoading, isError, error } = useRMCorrectionBatchDetails(entry.batch, isExpanded);
  const detailTotals = useMemo(() => {
    const rows = data?.entries ?? [];
    return rows.reduce(
      (acc, row) => {
        acc.noOfComp += row.noOfComp;
        acc.calCompWt += row.calCompWt;
        acc.sfRejNos += row.sfRejNos;
        acc.suWastageNos += row.suWastageNos;
        acc.scrapKg += row.scrapKg;
        acc.partWtKg += row.partWtKg;
        acc.theoRmKg += row.theoRmKg;
        return acc;
      },
      {
        noOfComp: 0,
        calCompWt: 0,
        sfRejNos: 0,
        suWastageNos: 0,
        scrapKg: 0,
        partWtKg: 0,
        theoRmKg: 0,
      }
    );
  }, [data?.entries]);

  const toggleExpand = () => {
    setIsExpanded((prev) => !prev);
  };

  return (
    <>
      <TableRow hover>
        <TableCell>{entry.rawMaterial || "-"}</TableCell>
        <TableCell>{entry.batch}</TableCell>
        <TableCell align="right">{entry.totalInwarded.toFixed(2)}</TableCell>
        <TableCell align="right">{entry.rmGiven.toFixed(2)}</TableCell>
        <TableCell align="right">{entry.rmRemaining.toFixed(2)}</TableCell>
        <TableCell align="right">{entry.scrap.toFixed(2)}</TableCell>
        <TableCell align="center">
          <Tooltip title={canEdit ? "Edit" : "You do not have permission to edit corrections"}>
            <span>
              <IconButton
                size="small"
                onClick={() => onOpenEdit(entry)}
                disabled={!canEdit}
              >
                <EditIcon fontSize="small" />
              </IconButton>
            </span>
          </Tooltip>
          <Tooltip title="Production Details">
            <IconButton size="small" onClick={toggleExpand}>
              <TableViewIcon fontSize="small" />
            </IconButton>
          </Tooltip>
          <Tooltip title="Correction History">
            <IconButton size="small" onClick={() => onOpenHistory(entry)}>
              <HistoryIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        </TableCell>
      </TableRow>

      {isExpanded && (
        <TableRow>
          <TableCell colSpan={7} sx={{ bgcolor: "#f5f7fa", py: 1.5 }}>
            {isLoading && <Typography variant="body2">Loading batch production details...</Typography>}
            {isError && (
              <Alert severity="error" sx={{ my: 1 }}>
                {(error as Error)?.message || "Failed to load batch details"}
              </Alert>
            )}
            {!isLoading && !isError && (
              <Box
                sx={{
                  mt: 0.5,
                  p: 1,
                  border: "2px solid",
                  borderColor: "#1565c0",
                  borderRadius: 1.5,
                  bgcolor: "#ffffff",
                  boxShadow: "0 2px 12px rgba(21, 101, 192, 0.15)",
                }}
              >
                <Typography
                  variant="caption"
                  sx={{
                    display: "inline-block",
                    mb: 0.75,
                    px: 0.75,
                    py: 0.25,
                    borderRadius: 0.75,
                    bgcolor: "#1565c0",
                    color: "#ffffff",
                    fontWeight: 700,
                    letterSpacing: 0.2,
                  }}
                >
                  Production Details
                </Typography>
                <TableContainer
                  component={Paper}
                  variant="outlined"
                  sx={{
                    border: "1px solid",
                    borderColor: "#1565c0",
                    borderRadius: 1,
                    overflow: "hidden",
                  }}
                >
                <Table
                  size="small"
                  sx={{
                    tableLayout: "fixed",
                    width: "100%",
                    "& .MuiTableCell-root": {
                      px: 0.75,
                      py: 0.5,
                      whiteSpace: "normal",
                      wordBreak: "break-word",
                      verticalAlign: "middle",
                      fontSize: 12,
                    },
                    "& .MuiTableCell-head": {
                      fontWeight: 700,
                    },
                  }}
                >
                  <TableHead>
                    <TableRow>
                      <TableCell>ProductionDate</TableCell>
                      <TableCell>Part No</TableCell>
                      <TableCell>Lot No</TableCell>
                      <TableCell>Tool</TableCell>
                      <TableCell align="right">No Of Comp</TableCell>
                      <TableCell align="right">Theo RM(Kg)</TableCell>
                      <TableCell align="right">Cal Comp Wt (Kg)</TableCell>
                      <TableCell align="right">Theo Scrap</TableCell>
                      <TableCell align="right">SF Rej(Nos)</TableCell>
                      <TableCell align="right">SU Wastage(Nos)</TableCell>
                      <TableCell align="right">Scrap(Kg)</TableCell>
                      <TableCell align="right">Part Wt(Kg)</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {(data?.entries ?? []).map((detail, idx) => (
                      <TableRow key={`${entry.batch}_detail_${idx}`}>
                        <TableCell>{detail.productionDate}</TableCell>
                        <TableCell>{detail.partNo || "-"}</TableCell>
                        <TableCell>{detail.lotNo || "-"}</TableCell>
                        <TableCell>{detail.tool || "-"}</TableCell>
                        <TableCell align="right">{detail.noOfComp}</TableCell>
                        <TableCell align="right">{detail.theoRmKg.toFixed(4)}</TableCell>
                        <TableCell align="right">{detail.calCompWt.toFixed(4)}</TableCell>
                        <TableCell align="right">{(detail.theoRmKg - detail.calCompWt).toFixed(4)}</TableCell>
                        <TableCell align="right">{detail.sfRejNos}</TableCell>
                        <TableCell align="right">{detail.suWastageNos}</TableCell>
                        <TableCell align="right">{detail.scrapKg.toFixed(2)}</TableCell>
                        <TableCell align="right">{detail.partWtKg.toFixed(2)}</TableCell>
                      </TableRow>
                    ))}
                    {!!data && data.entries.length > 0 && (
                      <TableRow
                        sx={{
                          "& .MuiTableCell-root": {
                            fontWeight: 700,
                            bgcolor: "#f3f6f9",
                          },
                        }}
                      >
                        <TableCell colSpan={4}>Total</TableCell>
                        <TableCell align="right">{detailTotals.noOfComp}</TableCell>
                        <TableCell align="right">{detailTotals.theoRmKg.toFixed(4)}</TableCell>
                        <TableCell align="right">{detailTotals.calCompWt.toFixed(4)}</TableCell>
                        <TableCell align="right">{(detailTotals.theoRmKg - detailTotals.calCompWt).toFixed(4)}</TableCell>
                        <TableCell align="right">{detailTotals.sfRejNos}</TableCell>
                        <TableCell align="right">{detailTotals.suWastageNos}</TableCell>
                        <TableCell align="right">{detailTotals.scrapKg.toFixed(2)}</TableCell>
                        <TableCell align="right">{detailTotals.partWtKg.toFixed(2)}</TableCell>
                      </TableRow>
                    )}
                    {(!data || data.entries.length === 0) && (
                      <TableRow>
                        <TableCell colSpan={12} align="center" sx={{ color: "text.secondary" }}>
                          No production rows found for this batch in selected date range.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
                </TableContainer>
              </Box>
            )}
          </TableCell>
        </TableRow>
      )}
    </>
  );
});

export default function RMCorrectionPage() {
  const defaultStartDate = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() - 10);
    return formatDateYYYYMMDD(d);
  }, []);

  const { user } = useAuth();
  const canEdit = user ? ALLOWED_EDIT_USER_IDS.includes(user.id) : false;

  const mountStartedAtRef = useRef<number>(Date.now());
  const fetchStartedAtRef = useRef<number | null>(null);
  const firstLoadLoggedRef = useRef(false);
  const dataReadyAtRef = useRef<number | null>(null);
  const [startDate, setStartDate] = useState<string>(defaultStartDate);
  const { data, isLoading, isError, error, isFetching, dataUpdatedAt } = useRMCorrectionEntries(startDate);
  const submitCorrections = useSubmitRMCorrections();
  const [form, setForm] = useState<FormState>({});
  const [rmRemainingAdjustments, setRmRemainingAdjustments] = useState<Record<string, number>>({});
  const [scrapAdjustments, setScrapAdjustments] = useState<Record<string, number>>({});
  const [editDialog, setEditDialog] = useState<EditDialogState>({ open: false, key: null });
  const [historyDialog, setHistoryDialog] = useState<HistoryDialogState>({
    open: false,
    batch: "",
    rmid: null,
    rawMaterial: "",
  });
  const [editDraft, setEditDraft] = useState<CorrectionForm>(emptyForm());
  const [toast, setToast] = useState<{ open: boolean; severity: Severity; message: string }>({
    open: false,
    severity: "success",
    message: "",
  });

  const entries = useMemo(() => data?.entries ?? [], [data?.entries]);
  const adjustedEntries = useMemo(
    () =>
      entries.map((entry) => {
        const key = rowKey(entry);
        const adjustedRmRemaining = rmRemainingAdjustments[key];
        return {
          ...entry,
          rmRemaining:
            typeof adjustedRmRemaining === "number"
              ? adjustedRmRemaining
              : entry.rmRemaining,
          scrap:
            typeof scrapAdjustments[key] === "number"
              ? scrapAdjustments[key]
              : entry.scrap,
        };
      }),
    [entries, rmRemainingAdjustments, scrapAdjustments]
  );
  const selectedEntry = useMemo(
    () => adjustedEntries.find((e) => rowKey(e) === editDialog.key) ?? null,
    [adjustedEntries, editDialog.key]
  );
  const historyQuery = useRMCorrectionHistory(
    historyDialog.batch,
    historyDialog.rmid,
    historyDialog.open
  );

  useEffect(() => {
    console.log("[RM Correction][Page] mount started");
  }, []);

  useEffect(() => {
    if (isFetching && fetchStartedAtRef.current === null) {
      fetchStartedAtRef.current = Date.now();
      console.log("[RM Correction][Page] data fetch lifecycle started");
    }
  }, [isFetching]);

  useEffect(() => {
    if (firstLoadLoggedRef.current) {
      return;
    }

    if (!isLoading && !isError && dataUpdatedAt > 0) {
      dataReadyAtRef.current = dataUpdatedAt;
      requestAnimationFrame(() => {
        const paintedAt = Date.now();
        const fetchStartedAt = fetchStartedAtRef.current ?? mountStartedAtRef.current;
        const apiToDataMs = dataUpdatedAt - fetchStartedAt;
        const uiRenderAfterDataMs = paintedAt - dataUpdatedAt;
        const totalPageLoadMs = paintedAt - mountStartedAtRef.current;
        const markers = [
          { name: "mount", time: mountStartedAtRef.current },
          { name: "fetchStart", time: fetchStartedAt },
          { name: "dataReady", time: dataReadyAtRef.current ?? dataUpdatedAt },
          { name: "firstPaint", time: paintedAt },
        ];

        console.log(
          `[RM Correction][Page] first load metrics -> total=${totalPageLoadMs} ms, apiLifecycle=${apiToDataMs} ms, uiRenderAfterData=${uiRenderAfterDataMs} ms, rows=${entries.length}`
        );
        console.log(`[RM Correction][Waterfall] ${formatWaterfall(markers)}`);
        firstLoadLoggedRef.current = true;
      });
    }
  }, [dataUpdatedAt, entries.length, isError, isLoading]);

  useEffect(() => {
    if (firstLoadLoggedRef.current) {
      return;
    }
    if (!isLoading && isError) {
      const endedAt = Date.now();
      const totalMs = endedAt - mountStartedAtRef.current;
      console.log(`[RM Correction][Page] first load ended with error in ${totalMs} ms`);
      firstLoadLoggedRef.current = true;
    }
  }, [isError, isLoading]);

  useEffect(() => {
    setRmRemainingAdjustments({});
    setScrapAdjustments({});
  }, [entries.length]);

  const showToast = (severity: Severity, message: string) => {
    setToast({ open: true, severity, message });
  };

  const openEditDialog = (entry: RMCorrectionEntry) => {
    const key = rowKey(entry);
    setEditDialog({ open: true, key });
    setEditDraft(form[key] ?? emptyForm());
  };

  const closeEditDialog = () => {
    setEditDialog({ open: false, key: null });
    setEditDraft(emptyForm());
  };

  const openHistoryDialog = (entry: RMCorrectionEntry) => {
    setHistoryDialog({
      open: true,
      batch: entry.batch,
      rmid: entry.rmid,
      rawMaterial: entry.rawMaterial,
    });
  };

  const closeHistoryDialog = () => {
    setHistoryDialog({ open: false, batch: "", rmid: null, rawMaterial: "" });
  };

  const submitRowCorrection = async () => {
    if (!selectedEntry || !editDialog.key) {
      return;
    }
    const activeKey = editDialog.key;

    const rmEntered = isEntered(editDraft.rmCorrection);
    const scrapEntered = isEntered(editDraft.scrapCorrection);

    if (!rmEntered && !scrapEntered) {
      showToast("error", "Enter at least one Actual RM or Actual Scrap with remarks to submit.");
      return;
    }

    const item: {
      batch: string;
      rmid: number;
      theoRmRemaining?: number;
      actualRm?: number;
      rmRemarks?: string;
      scrapBefore?: number;
      actualScrap?: number;
      scrapRemarks?: string;
    } = {
      batch: selectedEntry.batch,
      rmid: selectedEntry.rmid,
    };

    if (rmEntered) {
      if (selectedEntry.rmRemaining === 0) {
        showToast("error", "Actual RM cannot be entered when Theo RM Remaining is 0.");
        return;
      }
      const rmValue = Number(editDraft.rmCorrection);
      if (Number.isNaN(rmValue) || rmValue < 0) {
        showToast("error", "Actual RM must be a valid non-negative number.");
        return;
      }
      if (!isEntered(editDraft.rmRemarks)) {
        showToast("error", "RM Remarks is required when Actual RM is entered.");
        return;
      }
      item.theoRmRemaining = selectedEntry.rmRemaining;
      item.actualRm = rmValue;
      item.rmRemarks = editDraft.rmRemarks.trim();
    }

    if (scrapEntered) {
      const scrapValue = Number(editDraft.scrapCorrection);
      if (Number.isNaN(scrapValue)) {
        showToast("error", "Actual Scrap must be a valid number.");
        return;
      }
      if (!isEntered(editDraft.scrapRemarks)) {
        showToast("error", "Scrap Remarks is required when Actual Scrap is entered.");
        return;
      }
      item.scrapBefore = selectedEntry.scrap;
      item.actualScrap = scrapValue;
      item.scrapRemarks = editDraft.scrapRemarks.trim();
    }

    try {
      const result = await submitCorrections.mutateAsync({ items: [item] });

      setForm((prev) => ({
        ...prev,
        [activeKey]: emptyForm(),
      }));

      if (rmEntered && typeof item.actualRm === "number") {
        setRmRemainingAdjustments((prev) => ({
          ...prev,
          [activeKey]: Number(item.actualRm),
        }));
      }

      if (scrapEntered && typeof item.actualScrap === "number") {
        setScrapAdjustments((prev) => ({
          ...prev,
          [activeKey]: Number(item.actualScrap),
        }));
      }

      showToast(
        "success",
        `Submitted successfully (${result.inserted} row(s): RM ${result.insertedRm}, Scrap ${result.insertedScrap})`
      );
      closeEditDialog();
    } catch (err: any) {
      showToast("error", err?.message ?? "Failed to submit RM corrections");
    }
  };

  return (
    <Box sx={{ minHeight: "100%", display: "flex", flexDirection: "column" }}>
      <Box
        sx={{
          px: 3,
          py: 2,
          bgcolor: "#fff",
          borderBottom: "1px solid",
          borderColor: "divider",
          display: "flex",
          alignItems: "center",
          gap: 2,
          flexWrap: "wrap",
        }}
      >
        <EditNoteIcon sx={{ fontSize: 28, color: "#5d4037" }} />
        <Typography variant="h5" fontWeight={700} sx={{ flexGrow: 1 }}>
          RM Correction
        </Typography>
        <TextField
          label="Start Date"
          type="date"
          size="small"
          value={startDate}
          onChange={(e) => setStartDate(e.target.value)}
          inputProps={{ max: formatDateYYYYMMDD(new Date()) }}
          InputLabelProps={{ shrink: true }}
          sx={{ minWidth: 190 }}
        />
      </Box>

      <Box sx={{ flex: 1, p: 3 }}>
        {isLoading && (
          <Box sx={{ display: "flex", justifyContent: "center", py: 10 }}>
            <CircularProgress />
          </Box>
        )}

        {isError && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {(error as Error)?.message || "Failed to load RM correction data"}
          </Alert>
        )}

        {!isLoading && !isError && (
          <TableContainer component={Paper} variant="outlined">
            <Table
              size="small"
              stickyHeader
              sx={{
                tableLayout: "fixed",
                width: "100%",
                "& .MuiTableCell-root": {
                  px: 0.75,
                  py: 0.5,
                  whiteSpace: "normal",
                  wordBreak: "break-word",
                  verticalAlign: "middle",
                  fontSize: 12,
                },
                "& .MuiTableCell-head": {
                  fontWeight: 700,
                },
              }}
            >
              <TableHead>
                <TableRow>
                  <TableCell sx={{ width: "12%" }}>Raw Material</TableCell>
                  <TableCell sx={{ width: "9%" }}>Batch</TableCell>
                  <TableCell align="right" sx={{ width: "9%" }}>
                    Total Inwarded
                  </TableCell>
                  <TableCell align="right" sx={{ width: "8%" }}>
                    RM Given
                  </TableCell>
                  <TableCell align="right" sx={{ width: "8%" }}>
                    Theo RM Remaining
                  </TableCell>
                  <TableCell align="right" sx={{ width: "7%" }}>
                    Scrap
                  </TableCell>
                  <TableCell align="center" sx={{ width: "10%" }}>
                    Actions
                  </TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {adjustedEntries.map((entry, idx) => {
                  const key = rowKey(entry);
                  return (
                    <CorrectionRow
                      key={`${key}_${idx}`}
                      entry={entry}
                      onOpenEdit={openEditDialog}
                      onOpenHistory={openHistoryDialog}
                      canEdit={canEdit}
                    />
                  );
                })}

                {entries.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={7} align="center" sx={{ py: 5, color: "text.secondary" }}>
                      No records found.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Box>

      <Dialog open={editDialog.open} onClose={closeEditDialog} fullWidth maxWidth="sm">
        <DialogTitle>Update RM and Scrap Correction</DialogTitle>
        <DialogContent sx={{ display: "flex", flexDirection: "column", gap: 2, pt: 2 }}>
          {selectedEntry && (
            <Box
              sx={{
                px: 1.5,
                py: 1,
                bgcolor: "action.hover",
                borderRadius: 1,
                display: "flex",
                gap: 3,
                flexWrap: "wrap",
              }}
            >
              <Typography variant="body2" sx={{ fontSize: 12 }}>
                Theo RM Remaining: <strong>{selectedEntry.rmRemaining.toFixed(2)}</strong>
              </Typography>
              <Typography variant="body2" sx={{ fontSize: 12 }}>
                Scrap: <strong>{selectedEntry.scrap.toFixed(2)}</strong>
              </Typography>
            </Box>
          )}
          <TextField
            size="small"
            type="number"
            label="Actual RM"
            value={editDraft.rmCorrection}
            onChange={(e) => setEditDraft((prev) => ({ ...prev, rmCorrection: e.target.value }))}
            inputProps={{ min: 0, step: "0.01" }}
            InputLabelProps={{ sx: { fontSize: 12 } }}
            fullWidth
          />
          <TextField
            size="small"
            label="RM Remarks"
            value={editDraft.rmRemarks}
            onChange={(e) => setEditDraft((prev) => ({ ...prev, rmRemarks: e.target.value }))}
            fullWidth
          />
          <TextField
            size="small"
            type="number"
            label="Actual Scrap"
            value={editDraft.scrapCorrection}
            onChange={(e) => setEditDraft((prev) => ({ ...prev, scrapCorrection: e.target.value }))}
            inputProps={{ step: "0.01" }}
            InputLabelProps={{ sx: { fontSize: 12 } }}
            fullWidth
          />
          <TextField
            size="small"
            label="Scrap Remarks"
            value={editDraft.scrapRemarks}
            onChange={(e) => setEditDraft((prev) => ({ ...prev, scrapRemarks: e.target.value }))}
            fullWidth
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={closeEditDialog}>Cancel</Button>
          <Button
            variant="contained"
            onClick={submitRowCorrection}
            disabled={submitCorrections.isPending}
          >
            Submit
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={historyDialog.open} onClose={closeHistoryDialog} fullWidth maxWidth="md">
        <DialogTitle>Correction History</DialogTitle>
        <DialogContent sx={{ pt: 2 }}>
          <Box
            sx={{
              mb: 1.5,
              px: 1.5,
              py: 1,
              bgcolor: "action.hover",
              borderRadius: 1,
              display: "flex",
              gap: 3,
              flexWrap: "wrap",
            }}
          >
            <Typography variant="body2" sx={{ fontSize: 12 }}>
              Raw Material: <strong>{historyDialog.rawMaterial || "-"}</strong>
            </Typography>
            <Typography variant="body2" sx={{ fontSize: 12 }}>
              Batch: <strong>{historyDialog.batch || "-"}</strong>
            </Typography>
          </Box>

          {historyQuery.isLoading && (
            <Box sx={{ display: "flex", justifyContent: "center", py: 3 }}>
              <CircularProgress size={24} />
            </Box>
          )}

          {historyQuery.isError && (
            <Alert severity="error" sx={{ my: 1 }}>
              {(historyQuery.error as Error)?.message || "Failed to load correction history"}
            </Alert>
          )}

          {!historyQuery.isLoading && !historyQuery.isError && (
            <TableContainer component={Paper} variant="outlined">
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Type</TableCell>
                    <TableCell align="right">Qty Before</TableCell>
                    <TableCell align="right">Actual Qty</TableCell>
                    <TableCell>Remarks</TableCell>
                    <TableCell>Entry Time</TableCell>
                    <TableCell>User</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {(historyQuery.data?.entries ?? []).map((item, idx) => (
                    <TableRow key={`hist_${idx}`}>
                      <TableCell>{item.type}</TableCell>
                      <TableCell align="right">{item.qtyBefore.toFixed(2)}</TableCell>
                      <TableCell align="right">{(item.qtyBefore - item.correction).toFixed(2)}</TableCell>
                      <TableCell>{item.remarks || "-"}</TableCell>
                      <TableCell>{item.createdAt}</TableCell>
                      <TableCell>{item.userLogin || "-"}</TableCell>
                    </TableRow>
                  ))}
                  {!!historyQuery.data && historyQuery.data.entries.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={6} align="center" sx={{ py: 4, color: "text.secondary" }}>
                        No RM/Scrap correction history found for this Batch and RM.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={closeHistoryDialog}>Close</Button>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={toast.open}
        autoHideDuration={4000}
        onClose={() => setToast((prev) => ({ ...prev, open: false }))}
        anchorOrigin={{ vertical: "top", horizontal: "right" }}
      >
        <Alert
          onClose={() => setToast((prev) => ({ ...prev, open: false }))}
          severity={toast.severity}
          variant="filled"
          sx={{ width: "100%" }}
        >
          {toast.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}
