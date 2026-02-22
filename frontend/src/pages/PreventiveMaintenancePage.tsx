import { useState, useMemo } from "react";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import Button from "@mui/material/Button";
import TextField from "@mui/material/TextField";
import Grid from "@mui/material/Grid";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import CardActions from "@mui/material/CardActions";
import Dialog from "@mui/material/Dialog";
import DialogTitle from "@mui/material/DialogTitle";
import DialogContent from "@mui/material/DialogContent";
import DialogContentText from "@mui/material/DialogContentText";
import DialogActions from "@mui/material/DialogActions";
import Autocomplete from "@mui/material/Autocomplete";
import CircularProgress from "@mui/material/CircularProgress";
import IconButton from "@mui/material/IconButton";
import Chip from "@mui/material/Chip";
import Divider from "@mui/material/Divider";
import InputAdornment from "@mui/material/InputAdornment";
import Snackbar from "@mui/material/Snackbar";
import Alert from "@mui/material/Alert";
import AddIcon from "@mui/icons-material/Add";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import SearchIcon from "@mui/icons-material/Search";
import BuildIcon from "@mui/icons-material/Build";
import {
  useToolSearch,
  usePMEntries,
  useAddPMEntry,
  useUpdatePMEntry,
  useConfirmMaintenance,
  useDeletePMEntry,
} from "../api";
import type { ToolSearchResult, PMEntry } from "../api";

// ── Add Tool Dialog ────────────────────────────────────────────────

function AddToolDialog({
  open,
  onClose,
  existingToolIds,
}: {
  open: boolean;
  onClose: () => void;
  existingToolIds: Set<number>;
}) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTool, setSelectedTool] = useState<ToolSearchResult | null>(
    null
  );
  const [toolLife, setToolLife] = useState<string>("");
  const [pmStrokes, setPmStrokes] = useState<string>("");
  const [snackbar, setSnackbar] = useState<string | null>(null);

  const { data: searchResults = [], isLoading: searching } =
    useToolSearch(searchQuery);
  const addMutation = useAddPMEntry();

  const handleAdd = () => {
    if (!selectedTool || !toolLife || !pmStrokes) return;

    addMutation.mutate(
      {
        toolId: selectedTool.id,
        toolNo: selectedTool.toolNo,
        toolLife: Number(toolLife),
        pmStrokes: Number(pmStrokes),
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
    setSelectedTool(null);
    setToolLife("");
    setPmStrokes("");
    setSnackbar(null);
    onClose();
  };

  return (
    <>
      <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
        <DialogTitle>Add Tool for Preventive Maintenance</DialogTitle>
        <DialogContent sx={{ display: "flex", flexDirection: "column", gap: 3, pt: 2 }}>
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
            value={selectedTool}
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
            label="PM Strokes"
            type="number"
            value={pmStrokes}
            onChange={(e) => setPmStrokes(e.target.value)}
            placeholder="e.g. 50000"
            fullWidth
            slotProps={{ htmlInput: { min: 1 } }}
          />
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={handleClose}>Cancel</Button>
          <Button
            variant="contained"
            onClick={handleAdd}
            disabled={
              !selectedTool ||
              !toolLife ||
              !pmStrokes ||
              Number(toolLife) <= 0 ||
              Number(pmStrokes) <= 0 ||
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
  const [pmStrokes, setPmStrokes] = useState<string>("");
  const updateMutation = useUpdatePMEntry();

  // Sync initial values when dialog opens
  const handleEnter = () => {
    if (entry) {
      setToolLife(String(entry.toolLife));
      setPmStrokes(String(entry.pmStrokes));
    }
  };

  const handleSave = () => {
    if (!entry || !toolLife || !pmStrokes) return;
    updateMutation.mutate(
      {
        entryId: entry.id,
        toolLife: Number(toolLife),
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
      TransitionProps={{ onEnter: handleEnter }}
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
            !pmStrokes ||
            Number(toolLife) <= 0 ||
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

  const handleConfirm = () => {
    if (!entry) return;
    confirmMutation.mutate(entry.id, { onSuccess: () => onClose() });
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle>Confirm Maintenance</DialogTitle>
      <DialogContent>
        <DialogContentText>
          Do you want to confirm maintenance has been done for tool{" "}
          <strong>{entry?.toolNo}</strong>?
        </DialogContentText>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button
          variant="contained"
          color="success"
          onClick={handleConfirm}
          disabled={confirmMutation.isPending}
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
    deleteMutation.mutate(entry.id, { onSuccess: () => onClose() });
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
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

// ── PM Entry Card ──────────────────────────────────────────────────

function PMCard({
  entry,
  onEdit,
  onConfirm,
  onDelete,
}: {
  entry: PMEntry;
  onEdit: (entry: PMEntry) => void;
  onConfirm: (entry: PMEntry) => void;
  onDelete: (entry: PMEntry) => void;
}) {
  const lastMaintenance =
    entry.maintenanceHistory.length > 0
      ? entry.maintenanceHistory[entry.maintenanceHistory.length - 1]
      : null;

  const formatDate = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  return (
    <Card
      sx={{
        height: "100%",
        display: "flex",
        flexDirection: "column",
        transition: "box-shadow 0.15s",
        "&:hover": { boxShadow: 4 },
      }}
    >
      <CardContent sx={{ flexGrow: 1 }}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1.5 }}>
          <BuildIcon color="primary" fontSize="small" />
          <Typography variant="h6" fontWeight={700}>
            {entry.toolNo}
          </Typography>
        </Box>

        <Divider sx={{ mb: 1.5 }} />

        <Box sx={{ display: "flex", flexDirection: "column", gap: 0.75 }}>
          <Box sx={{ display: "flex", justifyContent: "space-between" }}>
            <Typography variant="body2" color="text.secondary">
              Tool Life
            </Typography>
            <Typography variant="body2" fontWeight={600}>
              {entry.toolLife.toLocaleString()} strokes
            </Typography>
          </Box>

          <Box sx={{ display: "flex", justifyContent: "space-between" }}>
            <Typography variant="body2" color="text.secondary">
              PM Strokes
            </Typography>
            <Typography variant="body2" fontWeight={600}>
              {entry.pmStrokes.toLocaleString()}
            </Typography>
          </Box>

          <Box sx={{ display: "flex", justifyContent: "space-between" }}>
            <Typography variant="body2" color="text.secondary">
              Last Maintenance
            </Typography>
            <Typography variant="body2" fontWeight={600}>
              {lastMaintenance ? formatDate(lastMaintenance.date) : "Never"}
            </Typography>
          </Box>

          <Box sx={{ display: "flex", justifyContent: "space-between" }}>
            <Typography variant="body2" color="text.secondary">
              Total Maintenances
            </Typography>
            <Chip
              label={entry.maintenanceHistory.length}
              size="small"
              color={entry.maintenanceHistory.length > 0 ? "success" : "default"}
            />
          </Box>
        </Box>
      </CardContent>

      <CardActions sx={{ justifyContent: "flex-end", px: 2, pb: 1.5 }}>
        <IconButton
          size="small"
          onClick={() => onDelete(entry)}
          title="Delete tool"
          color="error"
        >
          <DeleteIcon fontSize="small" />
        </IconButton>
        <IconButton
          size="small"
          onClick={() => onEdit(entry)}
          title="Edit tool settings"
        >
          <EditIcon fontSize="small" />
        </IconButton>
        <Button
          size="small"
          variant="outlined"
          color="success"
          startIcon={<CheckCircleIcon />}
          onClick={() => onConfirm(entry)}
        >
          Confirm Maintenance
        </Button>
      </CardActions>
    </Card>
  );
}

// ── Main Page ──────────────────────────────────────────────────────

export default function PreventiveMaintenancePage() {
  const [addOpen, setAddOpen] = useState(false);
  const [editEntry, setEditEntry] = useState<PMEntry | null>(null);
  const [confirmEntry, setConfirmEntry] = useState<PMEntry | null>(null);
  const [deleteEntry, setDeleteEntry] = useState<PMEntry | null>(null);
  const [searchFilter, setSearchFilter] = useState("");

  const { data: entries = [], isLoading } = usePMEntries();

  // Set of already-added toolIds (for disabling in add dialog)
  const existingToolIds = useMemo(
    () => new Set(entries.map((e) => e.toolId)),
    [entries]
  );

  // Filter displayed cards by search text
  const filteredEntries = useMemo(() => {
    if (!searchFilter.trim()) return entries;
    const q = searchFilter.toLowerCase();
    return entries.filter((e) => e.toolNo.toLowerCase().includes(q));
  }, [entries, searchFilter]);

  return (
    <Box sx={{ p: 3, height: "100%", overflow: "auto" }}>
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
          placeholder="Search added tools..."
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

        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => setAddOpen(true)}
        >
          Add Tool
        </Button>
      </Box>

      {/* Content */}
      {isLoading ? (
        <Box sx={{ display: "flex", justifyContent: "center", mt: 8 }}>
          <CircularProgress />
        </Box>
      ) : filteredEntries.length === 0 ? (
        <Box
          sx={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            mt: 8,
            color: "text.secondary",
          }}
        >
          <BuildIcon sx={{ fontSize: 64, mb: 2, opacity: 0.3 }} />
          <Typography variant="h6">
            {searchFilter
              ? "No tools match your search"
              : "No tools added yet"}
          </Typography>
          {!searchFilter && (
            <Typography variant="body2" sx={{ mt: 1 }}>
              Click "Add Tool" to start tracking preventive maintenance.
            </Typography>
          )}
        </Box>
      ) : (
        <Grid container spacing={2}>
          {filteredEntries.map((entry) => (
            <Grid key={entry.id} size={{ xs: 12, sm: 6, md: 4, lg: 3 }}>
              <PMCard
                entry={entry}
                onEdit={setEditEntry}
                onConfirm={setConfirmEntry}
                onDelete={setDeleteEntry}
              />
            </Grid>
          ))}
        </Grid>
      )}

      {/* Dialogs */}
      <AddToolDialog
        open={addOpen}
        onClose={() => setAddOpen(false)}
        existingToolIds={existingToolIds}
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
    </Box>
  );
}
