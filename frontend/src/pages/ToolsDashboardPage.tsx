import { useRef, useEffect, useState, useCallback, useMemo } from "react";
import Typography from "@mui/material/Typography";
import Box from "@mui/material/Box";
import LinearProgress from "@mui/material/LinearProgress";
import Chip from "@mui/material/Chip";
import IconButton from "@mui/material/IconButton";
import { keyframes } from "@mui/system";
import CalendarTodayIcon from "@mui/icons-material/CalendarToday";
import EventIcon from "@mui/icons-material/Event";
import WarningAmberIcon from "@mui/icons-material/WarningAmber";
import ArrowBackIosNewIcon from "@mui/icons-material/ArrowBackIosNew";
import ArrowForwardIosIcon from "@mui/icons-material/ArrowForwardIos";

import { useToolsToday, useToolsForDate, usePMStatus } from "@/api";
import type { ToolWithMachines, PMStatusEntry } from "@/api";

// ── Helpers ────────────────────────────────────────────────────────

function formatNumber(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}

function formatDate(d: string): string {
  return new Date(d + "T00:00:00").toLocaleDateString("en-IN", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

function formatShortDate(d: string): string {
  return new Date(d + "T00:00:00").toLocaleDateString("en-IN", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

/** Return YYYY-MM-DD for today + N days */
function dateOffset(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

/** Friendly label for an offset */
function offsetLabel(offset: number): string {
  if (offset === 1) return "Tomorrow";
  if (offset === 2) return "Day After Tomorrow";
  return formatShortDate(dateOffset(offset));
}

// ── Sub-components ─────────────────────────────────────────────────

function StatCardCustom({
  icon,
  label,
  value,
  bgColor,
}: {
  icon: React.ReactNode;
  label: string;
  value: number | string;
  bgColor: string;
}) {
  return (
    <Box
      sx={{
        flex: 1,
        display: "flex",
        alignItems: "center",
        gap: 2,
        bgcolor: "#fff",
        borderRadius: 2,
        px: 2.5,
        py: 2,
        boxShadow: "0 1px 4px rgba(0,0,0,0.06)",
      }}
    >
      <Box
        sx={{
          width: 44,
          height: 44,
          borderRadius: 1.5,
          bgcolor: bgColor,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "#fff",
          flexShrink: 0,
        }}
      >
        {icon}
      </Box>
      <Box>
        <Typography
          variant="caption"
          fontWeight={600}
          color="text.secondary"
          sx={{ textTransform: "uppercase", letterSpacing: 0.5, fontSize: 11 }}
        >
          {label}
        </Typography>
        <Typography variant="h5" fontWeight={700} lineHeight={1.2}>
          {value}
        </Typography>
      </Box>
    </Box>
  );
}

function ToolCard({ tool }: { tool: ToolWithMachines }) {
  return (
    <Box
      sx={{
        border: "1px solid",
        borderColor: "grey.200",
        borderRadius: 2,
        p: 2,
        mb: 1.5,
        bgcolor: "#fff",
      }}
    >
      <Box
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          mb: 0.5,
        }}
      >
        <Typography variant="subtitle2" fontWeight={700}>
          {tool.toolNo}
        </Typography>
        {tool.machineCount > 1 && (
          <Chip
            label={`${tool.machineCount} machines`}
            size="small"
            color="primary"
            variant="outlined"
            sx={{ height: 22, fontSize: 11 }}
          />
        )}
      </Box>
      <Typography variant="body2" color="text.secondary" noWrap>
        {tool.partName}
      </Typography>
      <Typography
        variant="caption"
        color="text.disabled"
        sx={{ display: "block", mb: 1 }}
      >
        {tool.partNo}
      </Typography>

      {/* Machines */}
      {tool.machines.map((m) => (
        <Box
          key={m.machineId}
          sx={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            py: 0.5,
            px: 1,
            my: 0.5,
            bgcolor: "grey.50",
            borderRadius: 1,
          }}
        >
          <Typography variant="caption" fontWeight={600}>
            {m.machineName}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            {formatNumber(m.scheduledQty)} pcs
          </Typography>
        </Box>
      ))}

      <Box sx={{ display: "flex", justifyContent: "flex-end", mt: 1 }}>
        <Typography variant="caption" fontWeight={600} color="primary">
          Total: {formatNumber(tool.totalScheduledQty)} pcs
        </Typography>
      </Box>
    </Box>
  );
}

function MaintenanceCard({ entry }: { entry: PMStatusEntry }) {
  const isCritical = entry.pmPercentage >= 100;
  const barColor = isCritical ? "#d32f2f" : "#ed6c02";
  const lifePercentage =
    entry.toolLife > 0
      ? Math.min(Math.round((entry.totalLifetimeStrokes / entry.toolLife) * 100), 100)
      : 0;
  const lifeBarColor = lifePercentage >= 80 ? "#d32f2f" : lifePercentage >= 50 ? "#ed6c02" : "#2e7d32";

  return (
    <Box
      sx={{
        border: "1px solid",
        borderColor: "grey.200",
        borderRadius: 2,
        p: 2,
        mb: 1.5,
        bgcolor: "#fff",
      }}
    >
      <Box
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          mb: 0.5,
        }}
      >
        <Typography variant="subtitle2" fontWeight={700} sx={{ fontSize: 12 }}>
          {entry.toolNo}
        </Typography>
        <Chip
          label={isCritical ? "Critical" : "Warning"}
          size="small"
          sx={{
            height: 22,
            fontSize: 11,
            fontWeight: 600,
            bgcolor: isCritical ? "#fce4ec" : "#fff3e0",
            color: isCritical ? "#d32f2f" : "#e65100",
          }}
        />
      </Box>

      {/* PM Strokes progress */}
      <Box sx={{ mt: 1.5 }}>
        <Box sx={{ display: "flex", justifyContent: "space-between", mb: 0.5 }}>
          <Typography variant="caption" color="text.secondary">
            PM Strokes
          </Typography>
          <Typography variant="caption" fontWeight={600}>
            {formatNumber(entry.strokesSinceLastPM)} / {formatNumber(entry.pmStrokes)} ({entry.pmPercentage}%)
          </Typography>
        </Box>
        <Box sx={{ height: 6, borderRadius: 3, bgcolor: "grey.200", overflow: "hidden" }}>
          <Box
            sx={{
              height: "100%",
              width: `${Math.min(entry.pmPercentage, 100)}%`,
              bgcolor: barColor,
              borderRadius: 3,
            }}
          />
        </Box>
      </Box>

      {/* Tool Life progress */}
      <Box sx={{ mt: 1.5 }}>
        <Box sx={{ display: "flex", justifyContent: "space-between", mb: 0.5 }}>
          <Typography variant="caption" color="text.secondary">
            Tool Life
          </Typography>
          <Typography variant="caption" fontWeight={600}>
            {formatNumber(entry.totalLifetimeStrokes)} / {formatNumber(entry.toolLife)} ({lifePercentage}%)
          </Typography>
        </Box>
        <Box sx={{ height: 6, borderRadius: 3, bgcolor: "grey.200", overflow: "hidden" }}>
          <Box
            sx={{
              height: "100%",
              width: `${lifePercentage}%`,
              bgcolor: lifeBarColor,
              borderRadius: 3,
            }}
          />
        </Box>
      </Box>

      {entry.maintenanceCount > 0 && (
        <Typography variant="caption" color="text.disabled" sx={{ display: "block", mt: 1 }}>
          Maintained {entry.maintenanceCount} time{entry.maintenanceCount > 1 ? "s" : ""}
        </Typography>
      )}
    </Box>
  );
}

// ── Auto-scroll wrapper ────────────────────────────────────────────

function AutoScrollColumn({
  children,
  itemCount,
}: {
  children: React.ReactNode;
  itemCount: number;
}) {
  const outerRef = useRef<HTMLDivElement>(null);
  const innerRef = useRef<HTMLDivElement>(null);
  const [needsScroll, setNeedsScroll] = useState(false);
  const [contentHeight, setContentHeight] = useState(0);
  const [duration, setDuration] = useState(20);

  const measure = useCallback(() => {
    const outer = outerRef.current;
    const inner = innerRef.current;
    if (!outer || !inner) return;
    const ch = inner.scrollHeight;
    const oh = outer.clientHeight;
    setContentHeight(ch);
    setNeedsScroll(ch > oh);
    // speed: ~40px/s so more content = longer duration
    setDuration(Math.max(10, ch / 40));
  }, []);

  useEffect(() => {
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, [measure, itemCount]);

  const scrollUp = needsScroll
    ? keyframes`
        0%   { transform: translateY(0); }
        100% { transform: translateY(-${contentHeight}px); }
      `
    : undefined;

  return (
    <Box
      ref={outerRef}
      sx={{
        flex: 1,
        overflow: "hidden",
        p: 1.5,
        position: "relative",
        /* fade-out masks at top & bottom so cards don't clip harshly */
        ...(needsScroll && {
          maskImage:
            "linear-gradient(to bottom, transparent 0%, black 4%, black 96%, transparent 100%)",
          WebkitMaskImage:
            "linear-gradient(to bottom, transparent 0%, black 4%, black 96%, transparent 100%)",
        }),
        "&:hover .scroll-track": {
          animationPlayState: "paused",
        },
      }}
    >
      {needsScroll ? (
        <Box
          className="scroll-track"
          sx={{
            display: "flex",
            flexDirection: "column",
            animation: `${scrollUp} ${duration}s linear infinite`,
          }}
        >
          {/* Original */}
          <Box ref={innerRef}>{children}</Box>
          {/* Duplicate for seamless loop */}
          <Box aria-hidden>{children}</Box>
        </Box>
      ) : (
        <Box ref={innerRef}>{children}</Box>
      )}
    </Box>
  );
}

// ── Main Component ─────────────────────────────────────────────────

export default function ToolsDashboardPage() {
  const [futureOffset, setFutureOffset] = useState(1); // 1 = tomorrow

  const futureDate = useMemo(() => dateOffset(futureOffset), [futureOffset]);

  const { data: todayData, isLoading: todayLoading } = useToolsToday();
  const { data: futureData, isLoading: futureLoading } =
    useToolsForDate(futureDate);
  const { data: pmStatus = [], isLoading: pmLoading } = usePMStatus();

  const isLoading = todayLoading || futureLoading || pmLoading;

  return (
    <Box
      sx={{
        display: "flex",
        flexDirection: "column",
        height: "100%",
        overflow: "hidden",
        p: 3,
      }}
    >
      {/* ── Header ────────────────────────────────────────────── */}
      <Box sx={{ flexShrink: 0, mb: 2 }}>
        <Typography variant="h5" fontWeight={700}>
          Tool Management Dashboard
        </Typography>
        <Typography variant="body2" color="text.secondary">
          {todayData?.date ? formatDate(todayData.date) : "Loading..."}
        </Typography>
      </Box>

      {isLoading && (
        <LinearProgress sx={{ flexShrink: 0, mb: 1, borderRadius: 1 }} />
      )}

      {/* ── Stat Cards Row ────────────────────────────────────── */}
      <Box
        sx={{
          display: "flex",
          gap: 2,
          mb: 2,
          flexShrink: 0,
        }}
      >
        <StatCardCustom
          icon={<CalendarTodayIcon fontSize="small" />}
          label="Today's Tools"
          value={todayData?.count ?? "—"}
          bgColor="#1565c0"
        />
        <StatCardCustom
          icon={<EventIcon fontSize="small" />}
          label="Tomorrow's Tools"
          value={futureData?.count ?? "—"}
          bgColor="#2e7d32"
        />
        <StatCardCustom
          icon={<WarningAmberIcon fontSize="small" />}
          label="Maintenance"
          value={pmStatus.length}
          bgColor="#e65100"
        />
      </Box>

      {/* ── 3-Column Section ──────────────────────────────────── */}
      <Box
        sx={{
          display: "flex",
          gap: 2,
          flex: 1,
          minHeight: 0, // critical for nested scroll to work
        }}
      >
        {/* TODAY column */}
        <Box
          sx={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            borderRadius: 2,
            overflow: "hidden",
            bgcolor: "#f5f7fa",
          }}
        >
          <Box
            sx={{
              px: 2.5,
              py: 1.5,
              bgcolor: "#1565c0",
              flexShrink: 0,
            }}
          >
            <Typography
              variant="subtitle1"
              fontWeight={700}
              color="#fff"
              sx={{ textTransform: "uppercase", letterSpacing: 1 }}
            >
              Today
            </Typography>
          </Box>
          <AutoScrollColumn itemCount={todayData?.tools?.length ?? 0}>
            {!todayData?.tools?.length && !isLoading && (
              <Typography
                variant="body2"
                color="text.secondary"
                textAlign="center"
                py={4}
              >
                No tools scheduled for today.
              </Typography>
            )}
            {todayData?.tools?.map((tool) => (
              <ToolCard key={tool.toolId} tool={tool} />
            ))}
          </AutoScrollColumn>
        </Box>

        {/* TOMORROW / FUTURE column */}
        <Box
          sx={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            borderRadius: 2,
            overflow: "hidden",
            bgcolor: "#f5f7fa",
          }}
        >
          <Box
            sx={{
              px: 1.5,
              py: 1,
              bgcolor: "#2e7d32",
              flexShrink: 0,
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <IconButton
              size="small"
              onClick={() => setFutureOffset((o) => Math.max(1, o - 1))}
              disabled={futureOffset <= 1}
              sx={{ color: "#fff", opacity: futureOffset <= 1 ? 0.3 : 1, p: 0.5 }}
            >
              <ArrowBackIosNewIcon sx={{ fontSize: 16 }} />
            </IconButton>
            <Box sx={{ textAlign: "center", minWidth: 0 }}>
              <Typography
                variant="subtitle2"
                fontWeight={700}
                color="#fff"
                sx={{ textTransform: "uppercase", letterSpacing: 1, lineHeight: 1.2 }}
              >
                {offsetLabel(futureOffset)}
              </Typography>
              {futureData?.date && (
                <Typography variant="caption" sx={{ color: "rgba(255,255,255,0.75)", fontSize: 10 }}>
                  {formatShortDate(futureData.date)}
                </Typography>
              )}
            </Box>
            <IconButton
              size="small"
              onClick={() => setFutureOffset((o) => o + 1)}
              sx={{ color: "#fff", p: 0.5 }}
            >
              <ArrowForwardIosIcon sx={{ fontSize: 16 }} />
            </IconButton>
          </Box>
          <AutoScrollColumn itemCount={futureData?.tools?.length ?? 0}>
            {!futureData?.tools?.length && !isLoading && (
              <Typography
                variant="body2"
                color="text.secondary"
                textAlign="center"
                py={4}
              >
                No tools scheduled for {offsetLabel(futureOffset).toLowerCase()}.
              </Typography>
            )}
            {futureData?.tools?.map((tool) => (
              <ToolCard key={tool.toolId} tool={tool} />
            ))}
          </AutoScrollColumn>
        </Box>

        {/* MAINTENANCE ALERT column */}
        <Box
          sx={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            borderRadius: 2,
            overflow: "hidden",
            bgcolor: "#fffbf5",
          }}
        >
          <Box
            sx={{
              px: 2.5,
              py: 1.5,
              bgcolor: "#e65100",
              flexShrink: 0,
            }}
          >
            <Typography
              variant="subtitle1"
              fontWeight={700}
              color="#fff"
              sx={{ textTransform: "uppercase", letterSpacing: 1 }}
            >
              Maintenance Alert
            </Typography>
          </Box>
          <AutoScrollColumn itemCount={pmStatus.length}>
            {pmStatus.length === 0 && !isLoading && (
              <Typography
                variant="body2"
                color="text.secondary"
                textAlign="center"
                py={4}
              >
                No tools require maintenance.
              </Typography>
            )}
            {pmStatus.map((entry) => (
              <MaintenanceCard key={entry.id} entry={entry} />
            ))}
          </AutoScrollColumn>
        </Box>
      </Box>
    </Box>
  );
}
