import {
  memo,
  useDeferredValue,
  useState,
  useMemo,
  useRef,
  useEffect,
  useCallback,
} from "react";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import Button from "@mui/material/Button";
import TextField from "@mui/material/TextField";
import Dialog from "@mui/material/Dialog";
import DialogTitle from "@mui/material/DialogTitle";
import DialogContent from "@mui/material/DialogContent";
import DialogContentText from "@mui/material/DialogContentText";
import DialogActions from "@mui/material/DialogActions";
import Autocomplete from "@mui/material/Autocomplete";
import CircularProgress from "@mui/material/CircularProgress";
import IconButton from "@mui/material/IconButton";
import Chip from "@mui/material/Chip";
import InputAdornment from "@mui/material/InputAdornment";
import Snackbar from "@mui/material/Snackbar";
import Alert from "@mui/material/Alert";
import AddIcon from "@mui/icons-material/Add";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import SearchIcon from "@mui/icons-material/Search";
import HistoryIcon from "@mui/icons-material/History";
import SettingsIcon from "@mui/icons-material/Settings";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableContainer from "@mui/material/TableContainer";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";
import Paper from "@mui/material/Paper";
import Tooltip from "@mui/material/Tooltip";
import Link from "@mui/material/Link";
import {
  useToolSearch,
  useAllTools,
  useToolStrokes,
  usePMEntries,
  usePMStatusAll,
  useAddPMEntry,
  useUpdatePMEntry,
  useConfirmMaintenance,
  useDeletePMEntry,
  useStrokeInfo,
} from "../api";
import type { ToolSearchResult, PMEntry, AllToolsResult } from "../api";
import { formatIndianNumber } from "../utils";

// ── Add Tool Dialog ────────────────────────────────────────────────

function AddToolDialog({
  open,
  onClose,
  existingToolIds,
  initialTool = null,
}: {
  open: boolean;
  onClose: () => void;
  existingToolIds: Set<number>;
  initialTool?: AllToolsResult | null;
}) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTool, setSelectedTool] = useState<ToolSearchResult | AllToolsResult | null>(null);

  // Sync initialTool when dialog opens
  useEffect(() => {
    if (open) {
      if (initialTool) {
        setSelectedTool(initialTool);
      } else {
        setSelectedTool(null);
      }
    }
  }, [open, initialTool]);

  const [toolLife, setToolLife] = useState<string>("");
  const [spm, setSpm] = useState<string>("");
  const [pmStrokes, setPmStrokes] = useState<string>("");
  const [nextPmStroke, setNextPmStroke] = useState<string>("");
  const [snackbar, setSnackbar] = useState<string | null>(null);

  const { data: searchResults = [], isLoading: searching } =
    useToolSearch(searchQuery);
  const { data: strokeData, isLoading: strokeLoading } = useToolStrokes(
    selectedTool ? selectedTool.id : null
  );
  const addMutation = useAddPMEntry();

  const currentStrokes = strokeData?.totalStrokes ?? 0;

  // Auto-compute next PM stroke when pmStrokes or currentStrokes change
  useEffect(() => {
    if (selectedTool && pmStrokes && Number(pmStrokes) > 0) {
      setNextPmStroke(String(currentStrokes + Number(pmStrokes)));
    }
  }, [pmStrokes, currentStrokes, selectedTool]);

  const handleAdd = () => {
    if (!selectedTool || !toolLife || !pmStrokes || !spm || !nextPmStroke) return;

    addMutation.mutate(
      {
        toolId: selectedTool.id,
        toolNo: selectedTool.toolNo,
        toolLife: Number(toolLife),
        spm: Number(spm),
        pmStrokes: Number(pmStrokes),
        nextStroke: Number(nextPmStroke),
      },
      {
        onSuccess: () => {
          handleClose();
        },
        onError: (err) => {
          setSnackbar(err.message);
        },
      }
    );
  };

  const handleClose = () => {
    setSearchQuery("");
    if (!initialTool) {
      setSelectedTool(null);
    }
    setToolLife("");
    setSpm("");
    setPmStrokes("");
    setNextPmStroke("");
    setSnackbar(null);
    onClose();
  };

  return (
    <>
      <Dialog
        open={open}
        onClose={handleClose}
        maxWidth="sm"
        fullWidth
        TransitionProps={{ timeout: 0 }}
      >
        <DialogTitle>{initialTool ? `Configure Tool: ${initialTool.toolNo}` : "Add Tool for Preventive Maintenance"}</DialogTitle>
        <DialogContent sx={{ display: "flex", flexDirection: "column", gap: 3, pt: 2 }}>
          {!initialTool ? (
            <Autocomplete
              options={searchResults}
              getOptionLabel={(opt) => opt.toolNo}
              getOptionDisabled={(opt) => existingToolIds.has(opt.id)}
              renderOption={(props, opt) => (
                <li {...props} key={opt.id}>
                  <Box sx={{ display: "flex", justifyContent: "space-between", width: "100%" }}>
                    <span>{opt.toolNo}</span>
                    {existingToolIds.has(opt.id) && (
                      <Chip label="Already added" size="small" color="default" />
                    )}
                  </Box>
                </li>
              )}
              loading={searching}
              value={selectedTool as ToolSearchResult | null}
              onChange={(_, val) => setSelectedTool(val)}
              onInputChange={(_, val) => setSearchQuery(val)}
              isOptionEqualToValue={(opt, val) => opt.id === val.id}
              renderInput={(params) => (
                <TextField
                  {...params}
                  label="Search Tool"
                  placeholder="Type tool number..."
                  sx={{ mt: 1 }}
                  slotProps={{
                    input: {
                      ...params.InputProps,
                      endAdornment: (
                        <>
                          {searching ? <CircularProgress size={20} /> : null}
                          {params.InputProps.endAdornment}
                        </>
                      ),
                    },
                  }}
                />
              )}
            />
          ) : (
            <TextField
              label="Selected Tool"
              value={initialTool.toolNo}
              fullWidth
              disabled
              sx={{ mt: 1 }}
            />
          )}
          <TextField
            label="Tool Life (strokes)"
            type="number"
            value={toolLife}
            onChange={(e) => setToolLife(e.target.value)}
            placeholder="e.g. 100000"
            fullWidth
            slotProps={{ htmlInput: { min: 1 } }}
          />
          <TextField
            label="SPM (Strokes Per Minute)"
            type="number"
            value={spm}
            onChange={(e) => setSpm(e.target.value)}
            placeholder="e.g. 100"
            fullWidth
            slotProps={{ htmlInput: { min: 1 } }}
          />
          <TextField
            label="PM Strokes"
            type="number"
            value={pmStrokes}
            onChange={(e) => setPmStrokes(e.target.value)}
            placeholder="e.g. 50000"
            fullWidth
            slotProps={{ htmlInput: { min: 1 } }}
          />

          {/* Current Strokes (auto-computed, read-only) */}
          {selectedTool && (
            strokeLoading ? (
              <Box sx={{ display: "flex", justifyContent: "center", py: 1 }}>
                <CircularProgress size={24} />
              </Box>
            ) : (
              <TextField
                label="Current Strokes (total to date)"
                value={formatIndianNumber(currentStrokes)}
                fullWidth
                slotProps={{ input: { readOnly: true } }}
                helperText="Auto-computed from production data"
              />
            )
          )}

          {/* Next PM Stroke (auto-computed but editable) */}
          {selectedTool && !strokeLoading && (
            <TextField
              label="Next PM Stroke"
              type="number"
              value={nextPmStroke}
              onChange={(e) => setNextPmStroke(e.target.value)}
              fullWidth
              slotProps={{ htmlInput: { min: currentStrokes } }}
              error={nextPmStroke !== "" && Number(nextPmStroke) < currentStrokes}
              helperText={
                nextPmStroke !== "" && Number(nextPmStroke) < currentStrokes
                  ? `Must be at least ${formatIndianNumber(currentStrokes)} (current strokes)`
                  : `Auto-computed: ${formatIndianNumber(currentStrokes)} + ${formatIndianNumber(Number(pmStrokes || 0))} PM strokes`
              }
            />
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={handleClose}>Cancel</Button>
          <Button
            variant="contained"
            onClick={handleAdd}
            disabled={
              !selectedTool ||
              !toolLife ||
              !spm ||
              !pmStrokes ||
              !nextPmStroke ||
              Number(toolLife) <= 0 ||
              Number(spm) <= 0 ||
              Number(pmStrokes) <= 0 ||
              Number(nextPmStroke) < currentStrokes ||
              strokeLoading ||
              addMutation.isPending
            }
            startIcon={addMutation.isPending ? <CircularProgress size={18} /> : <AddIcon />}
          >
            Add
          </Button>
        </DialogActions>
      </Dialog>
      <Snackbar
        open={!!snackbar}
        autoHideDuration={4000}
        onClose={() => setSnackbar(null)}
      >
        <Alert severity="error" onClose={() => setSnackbar(null)}>
          {snackbar}
        </Alert>
      </Snackbar>
    </>
  );
}

// ── Edit Dialog ────────────────────────────────────────────────────

function EditDialog({
  open,
  onClose,
  entry,
}: {
  open: boolean;
  onClose: () => void;
  entry: PMEntry | null;
}) {
  const [toolLife, setToolLife] = useState<string>("");
  const [spm, setSpm] = useState<string>("");
  const [pmStrokes, setPmStrokes] = useState<string>("");
  const updateMutation = useUpdatePMEntry();

  // Sync initial values when dialog opens
  const handleEnter = () => {
    if (entry) {
      setToolLife(String(entry.toolLife));
      setSpm(String(entry.spm));
      setPmStrokes(String(entry.pmStrokes));
    }
  };

  const handleSave = () => {
    if (!entry || !toolLife || !pmStrokes || !spm) return;
    updateMutation.mutate(
      {
        toolId: entry.toolId,
        toolLife: Number(toolLife),
        spm: Number(spm),
        pmStrokes: Number(pmStrokes),
      },
      { onSuccess: () => onClose() }
    );
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="xs"
      fullWidth
      TransitionProps={{ onEnter: handleEnter, timeout: 0 }}
    >
      <DialogTitle>Edit Tool Settings</DialogTitle>
      <DialogContent sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
        <TextField
          label="Tool Life (strokes)"
          type="number"
          value={toolLife}
          onChange={(e) => setToolLife(e.target.value)}
          fullWidth
          sx={{ mt: 1 }}
          slotProps={{ htmlInput: { min: 1 } }}
        />
        <TextField
          label="SPM (Strokes Per Minute)"
          type="number"
          value={spm}
          onChange={(e) => setSpm(e.target.value)}
          fullWidth
          slotProps={{ htmlInput: { min: 1 } }}
        />
        <TextField
          label="PM Strokes"
          type="number"
          value={pmStrokes}
          onChange={(e) => setPmStrokes(e.target.value)}
          fullWidth
          slotProps={{ htmlInput: { min: 1 } }}
        />
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button
          variant="contained"
          onClick={handleSave}
          disabled={
            !toolLife ||
            !spm ||
            !pmStrokes ||
            Number(toolLife) <= 0 ||
            Number(spm) <= 0 ||
            Number(pmStrokes) <= 0 ||
            updateMutation.isPending
          }
        >
          Save
        </Button>
      </DialogActions>
    </Dialog>
  );
}

// ── Confirm Maintenance Dialog ─────────────────────────────────────

function ConfirmMaintenanceDialog({
  open,
  onClose,
  entry,
}: {
  open: boolean;
  onClose: () => void;
  entry: PMEntry | null;
}) {
  const confirmMutation = useConfirmMaintenance();
  const { data: strokeInfo, isLoading: strokeLoading } = useStrokeInfo(
    open && entry ? entry.toolId : null
  );
  const [nextStroke, setNextStroke] = useState<string>("");
  const [attachmentFile, setAttachmentFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // When stroke info loads, set the suggested next stroke
  const prevSuggested = useRef<number | null>(null);
  useEffect(() => {
    if (strokeInfo && strokeInfo.suggestedNextStroke !== prevSuggested.current) {
      setNextStroke(String(strokeInfo.suggestedNextStroke));
      prevSuggested.current = strokeInfo.suggestedNextStroke;
    }
  }, [strokeInfo]);

  // Reset when dialog closes
  useEffect(() => {
    if (!open) {
      setNextStroke("");
      setAttachmentFile(null);
      prevSuggested.current = null;
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }, [open]);

  const currentStroke = strokeInfo?.currentStroke ?? 0;
  const nextStrokeNum = Number(nextStroke) || 0;
  const isNextStrokeValid = nextStroke !== "" && nextStrokeNum >= currentStroke;

  const handleConfirm = () => {
    if (!entry || !isNextStrokeValid) return;
    confirmMutation.mutate(
      {
        toolId: entry.toolId,
        nextStroke: nextStrokeNum,
        attachmentFile: attachmentFile ?? undefined,
      },
      { onSuccess: () => onClose() }
    );
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="xs"
      fullWidth
      TransitionProps={{ timeout: 0 }}
    >
      <DialogTitle>Confirm Maintenance</DialogTitle>
      <DialogContent sx={{ display: "flex", flexDirection: "column", gap: 2.5, pt: 1 }}>
        <DialogContentText>
          Confirm maintenance for tool <strong>{entry?.toolNo}</strong>
        </DialogContentText>

        {strokeLoading ? (
          <Box sx={{ display: "flex", justifyContent: "center", py: 2 }}>
            <CircularProgress size={28} />
          </Box>
        ) : (
          <>
            <TextField
              label="Current Stroke (total to date)"
              value={formatIndianNumber(currentStroke)}
              fullWidth
              slotProps={{ input: { readOnly: true } }}
              sx={{ mt: 1 }}
            />
            <TextField
              label="Next PM Stroke"
              type="number"
              value={nextStroke}
              onChange={(e) => setNextStroke(e.target.value)}
              fullWidth
              slotProps={{ htmlInput: { min: currentStroke } }}
              error={nextStroke !== "" && !isNextStrokeValid}
              helperText={
                nextStroke !== "" && !isNextStrokeValid
                  ? `Must be at least ${formatIndianNumber(currentStroke)} (current stroke)`
                  : `Auto-computed: ${formatIndianNumber(currentStroke)} + ${formatIndianNumber(entry?.pmStrokes ?? 0)} PM strokes`
              }
            />

            {/* PM Sheet Attachment */}
            <Box>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                PM Sheet Attachment
              </Typography>
              <Button
                variant="outlined"
                component="label"
                size="small"
                sx={{ textTransform: "none" }}
              >
                {attachmentFile ? attachmentFile.name : "Choose File"}
                <input
                  ref={fileInputRef}
                  type="file"
                  hidden
                  accept=".pdf,.jpg,.jpeg,.png,.doc,.docx,.xls,.xlsx"
                  onChange={(e) => {
                    const file = e.target.files?.[0] ?? null;
                    setAttachmentFile(file);
                  }}
                />
              </Button>
              {attachmentFile && (
                <Button
                  size="small"
                  color="error"
                  onClick={() => {
                    setAttachmentFile(null);
                    if (fileInputRef.current) fileInputRef.current.value = "";
                  }}
                  sx={{ ml: 1 }}
                >
                  Remove
                </Button>
              )}
            </Box>
          </>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button
          variant="contained"
          color="success"
          onClick={handleConfirm}
          disabled={confirmMutation.isPending || strokeLoading || !isNextStrokeValid}
          startIcon={
            confirmMutation.isPending ? (
              <CircularProgress size={18} />
            ) : (
              <CheckCircleIcon />
            )
          }
        >
          Confirm
        </Button>
      </DialogActions>
    </Dialog>
  );
}

// ── Delete Confirmation Dialog ─────────────────────────────────────

function DeleteDialog({
  open,
  onClose,
  entry,
}: {
  open: boolean;
  onClose: () => void;
  entry: PMEntry | null;
}) {
  const deleteMutation = useDeletePMEntry();

  const handleDelete = () => {
    if (!entry) return;
    deleteMutation.mutate(entry.toolId, { onSuccess: () => onClose() });
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="xs"
      fullWidth
      TransitionProps={{ timeout: 0 }}
    >
      <DialogTitle>Delete Tool</DialogTitle>
      <DialogContent>
        <DialogContentText>
          Are you sure you want to remove tool{" "}
          <strong>{entry?.toolNo}</strong> from preventive maintenance tracking?
          This action cannot be undone.
        </DialogContentText>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button
          variant="contained"
          color="error"
          onClick={handleDelete}
          disabled={deleteMutation.isPending}
          startIcon={
            deleteMutation.isPending ? (
              <CircularProgress size={18} />
            ) : (
              <DeleteIcon />
            )
          }
        >
          Delete
        </Button>
      </DialogActions>
    </Dialog>
  );
}

// ── Maintenance History Dialog ─────────────────────────────────────

function MaintenanceHistoryDialog({
  open,
  onClose,
  entry,
}: {
  open: boolean;
  onClose: () => void;
  entry: PMEntry | null;
}) {
  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="md"
      fullWidth
      TransitionProps={{ timeout: 0 }}
    >
      <DialogTitle>
        Maintenance History - {entry?.toolNo}
      </DialogTitle>
      <DialogContent>
        {entry?.maintenanceHistory && entry.maintenanceHistory.length > 0 ? (
          <TableContainer component={Paper} sx={{ mt: 2 }} variant="outlined">
            <Table size="small">
              <TableHead>
                <TableRow sx={{ backgroundColor: "grey.100" }}>
                  <TableCell sx={{ fontWeight: 600 }}>Date</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 600 }}>
                    Current Stroke
                  </TableCell>
                  <TableCell align="right" sx={{ fontWeight: 600 }}>
                    Next Stroke
                  </TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>Attachment</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {entry.maintenanceHistory.map((record) => (
                  <TableRow key={record.id} hover>
                    <TableCell>
                      {new Date(record.date).toLocaleDateString("en-IN", {
                        day: "2-digit",
                        month: "short",
                        year: "numeric",
                      })}
                    </TableCell>
                    <TableCell align="right">{formatIndianNumber(record.currentStroke)}</TableCell>
                    <TableCell align="right">{formatIndianNumber(record.nextStroke)}</TableCell>
                    <TableCell>
                      {record.attachment ? (
                        <Link
                          href={record.attachment}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          View
                        </Link>
                      ) : (
                        <Typography variant="body2" color="text.secondary">
                          —
                        </Typography>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        ) : (
          <Box sx={{ py: 4, display: "flex", justifyContent: "center" }}>
            <Typography color="text.secondary">
              No maintenance history available
            </Typography>
          </Box>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Close</Button>
      </DialogActions>
    </Dialog>
  );
}

// ── PM Row ────────────────────────────────────────────────────────

type ToolRow = {
  tool: AllToolsResult;
  entry: (PMEntry & { totalLifetimeStrokes: number }) | null;
};

type ThresholdFilter = "all" | "safe" | "warning" | "critical";

const PMTableRowView = memo(function PMTableRowView({
  index,
  row,
  onConfigure,
  onEdit,
  onConfirm,
  onDelete,
  onHistory,
}: {
  index: number;
  row: ToolRow;
  onConfigure: (tool: AllToolsResult) => void;
  onEdit: (entry: PMEntry) => void;
  onConfirm: (entry: PMEntry) => void;
  onDelete: (entry: PMEntry) => void;
  onHistory: (entry: PMEntry) => void;
}) {
  const { tool, entry } = row;
  const latestMaintenance =
    entry && entry.maintenanceHistory.length > 0
      ? entry.maintenanceHistory[entry.maintenanceHistory.length - 1]
      : null;

  return (
    <TableRow hover>
      <TableCell align="right" sx={{ fontWeight: 600 }}>{index + 1}</TableCell>
      <TableCell sx={{ fontWeight: 600 }}>{tool.toolNo}</TableCell>
      <TableCell>{tool.partNo || "-"}</TableCell>
      <TableCell align="right">{entry ? formatIndianNumber(entry.toolLife) : "-"}</TableCell>
      <TableCell align="right">{entry ? formatIndianNumber(entry.spm) : "-"}</TableCell>
      <TableCell align="right">{entry ? formatIndianNumber(entry.pmStrokes) : "-"}</TableCell>
      <TableCell align="right">{entry ? formatIndianNumber(entry.totalLifetimeStrokes) : "-"}</TableCell>
      <TableCell align="right">
        {entry ? (latestMaintenance ? formatIndianNumber(latestMaintenance.nextStroke) : "Not set") : "-"}
      </TableCell>
      <TableCell>
        {entry
          ? latestMaintenance
            ? new Date(latestMaintenance.date).toLocaleDateString("en-IN", {
                day: "2-digit",
                month: "short",
                year: "numeric",
              })
            : "No maintenance"
          : "-"}
      </TableCell>
      <TableCell align="right">{entry ? entry.maintenanceHistory.length : "-"}</TableCell>
      <TableCell>
        {entry ? (
          <Box sx={{ display: "flex", alignItems: "center", gap: 0.5, flexWrap: "wrap" }}>
            <Tooltip title="Edit tool settings">
              <span>
                <IconButton size="small" onClick={() => onEdit(entry)}>
                  <EditIcon fontSize="small" />
                </IconButton>
              </span>
            </Tooltip>
            <Tooltip title="Maintenance history">
              <span>
                <IconButton size="small" onClick={() => onHistory(entry)}>
                  <HistoryIcon fontSize="small" />
                </IconButton>
              </span>
            </Tooltip>
            <Tooltip title="Delete tool">
              <span>
                <IconButton size="small" color="error" onClick={() => onDelete(entry)}>
                  <DeleteIcon fontSize="small" />
                </IconButton>
              </span>
            </Tooltip>
            <Tooltip title="Confirm PM">
              <span>
                <IconButton size="small" color="success" onClick={() => onConfirm(entry)}>
                  <CheckCircleIcon fontSize="small" />
                </IconButton>
              </span>
            </Tooltip>
          </Box>
        ) : (
          <Button
            size="small"
            variant="outlined"
            startIcon={<AddIcon />}
            onClick={() => onConfigure(tool)}
          >
            Configure
          </Button>
        )}
      </TableCell>
    </TableRow>
  );
});

// ── Main Page ──────────────────────────────────────────────────────

export default function PreventiveMaintenancePage() {
  const [addOpen, setAddOpen] = useState(false);
  const [addInitialTool, setAddInitialTool] = useState<AllToolsResult | null>(null);
  const [editEntry, setEditEntry] = useState<PMEntry | null>(null);
  const [confirmEntry, setConfirmEntry] = useState<PMEntry | null>(null);
  const [deleteEntry, setDeleteEntry] = useState<PMEntry | null>(null);
  const [historyEntry, setHistoryEntry] = useState<PMEntry | null>(null);
  const [searchFilter, setSearchFilter] = useState("");
  const [thresholdFilter, setThresholdFilter] = useState<ThresholdFilter>("all");
  const deferredSearchFilter = useDeferredValue(searchFilter);

  const { data: entries = [], isLoading: pmLoading } = usePMEntries();
  const { data: allTools = [], isLoading: toolsLoading } = useAllTools();
  const { data: pmStatusAll = [] } = usePMStatusAll();

  const isLoading = pmLoading || toolsLoading;

  // Set of already-added toolIds (for disabling in add dialog)
  const existingToolIds = useMemo(
    () => new Set(entries.map((e) => e.toolId)),
    [entries]
  );

  const entryByToolId = useMemo(
    () => new Map(entries.map((entry) => [entry.toolId, entry])),
    [entries]
  );

  const pmPercentageByToolId = useMemo(
    () => new Map(pmStatusAll.map((status) => [status.toolId, status.pmPercentage])),
    [pmStatusAll]
  );

  const totalLifetimeStrokesByToolId = useMemo(
    () => new Map(pmStatusAll.map((status) => [status.toolId, status.totalLifetimeStrokes])),
    [pmStatusAll]
  );

  // Keep row generation memoized so button clicks only update local dialog state.
  const tableRows = useMemo<ToolRow[]>(() => {
    return allTools.map((tool) => ({
      tool,
      entry: (() => {
        const entry = entryByToolId.get(tool.id);
        if (!entry) return null;
        return {
          ...entry,
          totalLifetimeStrokes: totalLifetimeStrokesByToolId.get(tool.id) ?? 0,
        };
      })(),
    }));
  }, [allTools, entryByToolId, totalLifetimeStrokesByToolId]);

  const filteredRows = useMemo(() => {
    const matchesThreshold = (row: ToolRow) => {
      if (thresholdFilter === "all") return true;
      const pmPct = pmPercentageByToolId.get(row.tool.id);
      if (thresholdFilter === "critical") return (pmPct ?? 0) >= 100;
      if (thresholdFilter === "warning") return (pmPct ?? 0) >= 80 && (pmPct ?? 0) < 100;
      return (pmPct ?? 0) < 80;
    };

    const thresholdRows = tableRows.filter(matchesThreshold);
    if (!deferredSearchFilter.trim()) return thresholdRows;
    const q = deferredSearchFilter.toLowerCase();
    return thresholdRows.filter((row) => {
      return (
        row.tool.toolNo.toLowerCase().includes(q) ||
        row.tool.partNo.toLowerCase().includes(q)
      );
    });
  }, [tableRows, deferredSearchFilter, thresholdFilter, pmPercentageByToolId]);

  const thresholdCounts = useMemo(() => {
    let safe = 0;
    let warning = 0;
    let critical = 0;

    for (const row of tableRows) {
      const pmPct = pmPercentageByToolId.get(row.tool.id) ?? 0;
      if (pmPct >= 100) {
        critical += 1;
      } else if (pmPct >= 80) {
        warning += 1;
      } else {
        safe += 1;
      }
    }

    return { safe, warning, critical };
  }, [tableRows, pmPercentageByToolId]);

  const handleConfigureTool = useCallback((tool: AllToolsResult) => {
    setAddInitialTool(tool);
    setAddOpen(true);
  }, []);

  const handleCloseAddDialog = useCallback(() => {
    setAddOpen(false);
    setAddInitialTool(null);
  }, []);

  return (
    <Box
      sx={{
        p: 3,
        height: "100%",
        overflow: "hidden",
        display: "flex",
        flexDirection: "column",
      }}
    >
      {/* Top bar */}
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          gap: 2,
          mb: 3,
          flexWrap: "wrap",
        }}
      >
        <Typography variant="h5" fontWeight={700} sx={{ flexShrink: 0 }}>
          Preventive Maintenance
        </Typography>

        <TextField
          size="small"
          placeholder="Search tools by tool no or part no..."
          value={searchFilter}
          onChange={(e) => setSearchFilter(e.target.value)}
          sx={{ flexGrow: 1, maxWidth: 400 }}
          slotProps={{
            input: {
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon fontSize="small" />
                </InputAdornment>
              ),
            },
          }}
        />

        <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap" }}>
          <Button
            size="small"
            variant={thresholdFilter === "safe" ? "contained" : "outlined"}
            onClick={() =>
              setThresholdFilter((prev) => (prev === "safe" ? "all" : "safe"))
            }
            sx={{
              borderColor: "#2e7d32",
              color: thresholdFilter === "safe" ? "#fff" : "#2e7d32",
              bgcolor: thresholdFilter === "safe" ? "#2e7d32" : "transparent",
              "&:hover": {
                borderColor: "#1b5e20",
                bgcolor: thresholdFilter === "safe" ? "#1b5e20" : "rgba(46,125,50,0.08)",
              },
            }}
          >
            Safe (&lt;80%) {thresholdCounts.safe}
          </Button>
          <Button
            size="small"
            variant={thresholdFilter === "warning" ? "contained" : "outlined"}
            onClick={() =>
              setThresholdFilter((prev) => (prev === "warning" ? "all" : "warning"))
            }
            sx={{
              borderColor: "#ed6c02",
              color: thresholdFilter === "warning" ? "#fff" : "#ed6c02",
              bgcolor: thresholdFilter === "warning" ? "#ed6c02" : "transparent",
              "&:hover": {
                borderColor: "#e65100",
                bgcolor: thresholdFilter === "warning" ? "#e65100" : "rgba(237,108,2,0.08)",
              },
            }}
          >
            Warning (≥80% &amp; &lt;100%) {thresholdCounts.warning}
          </Button>
          <Button
            size="small"
            variant={thresholdFilter === "critical" ? "contained" : "outlined"}
            onClick={() =>
              setThresholdFilter((prev) => (prev === "critical" ? "all" : "critical"))
            }
            sx={{
              borderColor: "#d32f2f",
              color: thresholdFilter === "critical" ? "#fff" : "#d32f2f",
              bgcolor: thresholdFilter === "critical" ? "#d32f2f" : "transparent",
              "&:hover": {
                borderColor: "#c62828",
                bgcolor: thresholdFilter === "critical" ? "#c62828" : "rgba(211,47,47,0.08)",
              },
            }}
          >
            Critical (≥100%) {thresholdCounts.critical}
          </Button>
        </Box>
      </Box>

      <Box sx={{ flex: 1, minHeight: 0 }}>
        {/* Content */}
        {isLoading ? (
          <Box sx={{ display: "flex", justifyContent: "center", mt: 8 }}>
            <CircularProgress />
          </Box>
        ) : filteredRows.length === 0 ? (
          <Box
            sx={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              mt: 8,
              color: "text.secondary",
            }}
          >
            <Typography variant="h6">
              No tools match your search
            </Typography>
          </Box>
        ) : (
          <TableContainer
            component={Paper}
            variant="outlined"
            sx={{ height: "100%" }}
          >
            <Table size="small" stickyHeader>
            <TableHead>
              <TableRow>
                <TableCell align="right" sx={{ fontWeight: 700 }}>Sl No</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Tool No</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Part No</TableCell>
                <TableCell align="right" sx={{ fontWeight: 700 }}>
                  Tool Life
                </TableCell>
                <TableCell align="right" sx={{ fontWeight: 700 }}>
                  SPM
                </TableCell>
                <TableCell align="right" sx={{ fontWeight: 700 }}>
                  PM Strokes
                </TableCell>
                <TableCell align="right" sx={{ fontWeight: 700 }}>
                  Production Done
                </TableCell>
                <TableCell align="right" sx={{ fontWeight: 700 }}>
                  Next PM Stroke
                </TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Last Maintenance</TableCell>
                <TableCell align="right" sx={{ fontWeight: 700 }}>
                  PM Count
                </TableCell>
                <TableCell sx={{ fontWeight: 700, minWidth: 280 }}>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredRows.map((row, index) => (
                <PMTableRowView
                  key={row.tool.id}
                  index={index}
                  row={row}
                  onConfigure={handleConfigureTool}
                  onEdit={setEditEntry}
                  onConfirm={setConfirmEntry}
                  onDelete={setDeleteEntry}
                  onHistory={setHistoryEntry}
                />
              ))}
            </TableBody>
            </Table>
          </TableContainer>
        )}
      </Box>

      {/* Dialogs */}
      <AddToolDialog
        open={addOpen}
        onClose={handleCloseAddDialog}
        existingToolIds={existingToolIds}
        initialTool={addInitialTool}
      />
      <EditDialog
        open={!!editEntry}
        onClose={() => setEditEntry(null)}
        entry={editEntry}
      />
      <ConfirmMaintenanceDialog
        open={!!confirmEntry}
        onClose={() => setConfirmEntry(null)}
        entry={confirmEntry}
      />
      <DeleteDialog
        open={!!deleteEntry}
        onClose={() => setDeleteEntry(null)}
        entry={deleteEntry}
      />
      <MaintenanceHistoryDialog
        open={!!historyEntry}
        onClose={() => setHistoryEntry(null)}
        entry={historyEntry}
      />
    </Box>
  );
}
