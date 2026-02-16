import { useState } from "react";
import Grid from "@mui/material/Grid";
import Typography from "@mui/material/Typography";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import Box from "@mui/material/Box";
import Chip from "@mui/material/Chip";
import ToggleButton from "@mui/material/ToggleButton";
import ToggleButtonGroup from "@mui/material/ToggleButtonGroup";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableContainer from "@mui/material/TableContainer";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";
import Paper from "@mui/material/Paper";
import LinearProgress from "@mui/material/LinearProgress";
import Alert from "@mui/material/Alert";
import Tooltip from "@mui/material/Tooltip";
import type { EChartsOption } from "echarts";

import { StatCard } from "@/components";
import { Chart } from "@/charts";
import {
  useToolsSummary,
  useWeeklySchedule,
  useTodayByMachine,
  useMaintenanceTools,
  useTopUsedTools,
  useToolLifecycle,
  useAvailableDates,
} from "@/api";

// ── Helpers ────────────────────────────────────────────────────────

function formatNumber(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}

function formatDate(d: string): string {
  return new Date(d + "T00:00:00").toLocaleDateString("en-IN", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

function getScrapColor(rate: number): "success" | "warning" | "error" {
  if (rate < 0.5) return "success";
  if (rate < 2) return "warning";
  return "error";
}

// ── Component ──────────────────────────────────────────────────────

export default function ToolsDashboardPage() {
  const [weekOffset, setWeekOffset] = useState(0);

  const { data: dates } = useAvailableDates();
  const refDate = dates?.latest;

  const { data: summary, isLoading: summaryLoading } =
    useToolsSummary(refDate);
  const { data: weekly, isLoading: weeklyLoading } = useWeeklySchedule(
    refDate,
    weekOffset
  );
  const { data: todayData, isLoading: todayLoading } =
    useTodayByMachine(refDate);
  const { data: maintenance } = useMaintenanceTools(50);
  const { data: topUsed } = useTopUsedTools(10);
  const { data: lifecycle } = useToolLifecycle();

  // ── Charts ───────────────────────────────────────────────────────

  const topUsedChartOption: EChartsOption = {
    tooltip: {
      trigger: "axis",
      axisPointer: { type: "shadow" },
      formatter: (params: any) => {
        const d = params[0];
        return `${d.name}<br/>Total Produced: <b>${formatNumber(d.value)}</b>`;
      },
    },
    grid: { left: 140, right: 20, top: 10, bottom: 30 },
    xAxis: { type: "value", axisLabel: { formatter: (v: number) => formatNumber(v) } },
    yAxis: {
      type: "category",
      data: [...(topUsed?.tools ?? [])].reverse().map((t) =>
        t.toolNo.length > 20 ? t.toolNo.slice(0, 18) + "…" : t.toolNo
      ),
      axisLabel: { fontSize: 11 },
    },
    series: [
      {
        type: "bar",
        data: [...(topUsed?.tools ?? [])].reverse().map((t) => t.totalProduced),
        itemStyle: {
          borderRadius: [0, 4, 4, 0],
          color: "#1565c0",
        },
        barMaxWidth: 24,
      },
    ],
  };

  const lifecycleChartOption: EChartsOption = {
    tooltip: {
      formatter: (params: any) => {
        const d = params.data;
        return `<b>${d[3]}</b><br/>Days: ${d[0]}<br/>Strokes: ${formatNumber(d[1])}<br/>Scrap: ${d[2]}%`;
      },
    },
    grid: { left: 70, right: 20, top: 20, bottom: 40 },
    xAxis: {
      type: "value",
      name: "Days in Service",
      nameLocation: "center",
      nameGap: 25,
    },
    yAxis: {
      type: "value",
      name: "Total Strokes",
      axisLabel: { formatter: (v: number) => formatNumber(v) },
    },
    series: [
      {
        type: "scatter",
        symbolSize: (val: number[]) => Math.min(Math.max(val[2] * 6, 5), 40),
        data: (lifecycle?.tools ?? []).map((t) => [
          t.daysInService,
          t.totalStrokes,
          t.scrapRate,
          t.toolNo,
        ]),
        itemStyle: {
          color: (params: any) => {
            const scrap = params.data[2];
            if (scrap >= 2) return "#d32f2f";
            if (scrap >= 0.5) return "#ed6c02";
            return "#2e7d32";
          },
        },
      },
    ],
  };

  // ── Render ───────────────────────────────────────────────────────

  const isLoading = summaryLoading || weeklyLoading || todayLoading;

  return (
    <>
      <Typography variant="h4" sx={{ mb: 1 }}>
        Tools Dashboard
      </Typography>
      {refDate && (
        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
          Reference date: {formatDate(refDate)}
        </Typography>
      )}

      {isLoading && <LinearProgress sx={{ mb: 2 }} />}

      {/* ── Stat Cards ──────────────────────────────────────────── */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <StatCard
            title="Tools Today"
            value={summary?.toolsToday ?? "—"}
            subtitle={`${summary?.machinesToday ?? 0} machines`}
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <StatCard
            title="Scheduled Qty Today"
            value={formatNumber(summary?.scheduledQtyToday ?? 0)}
            subtitle="pieces planned"
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <StatCard
            title="Tools This Week"
            value={summary?.toolsThisWeek ?? "—"}
            subtitle={`${summary?.machinesThisWeek ?? 0} machines`}
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <StatCard
            title="Maintenance Alert"
            value={summary?.toolsNeedingMaintenance ?? "—"}
            subtitle="high-usage tools (400+ runs)"
            sx={{
              borderLeft: 4,
              borderColor: "warning.main",
            }}
          />
        </Grid>
      </Grid>

      {/* ── Today's Tools by Machine ────────────────────────────── */}
      <Typography variant="h6" sx={{ mb: 2 }}>
        Today's Tools by Machine
      </Typography>
      {todayData?.machines.length === 0 && (
        <Alert severity="info" sx={{ mb: 3 }}>
          No tools scheduled for this date.
        </Alert>
      )}
      <Grid container spacing={2} sx={{ mb: 4 }}>
        {todayData?.machines.map((m) => (
          <Grid key={m.machineId} size={{ xs: 12, sm: 6, md: 4, lg: 3 }}>
            <Card
              sx={{
                height: "100%",
                borderTop: 3,
                borderColor: "primary.main",
              }}
            >
              <CardContent>
                <Typography variant="subtitle2" fontWeight={700} noWrap>
                  {m.machineName}
                </Typography>
                <Typography
                  variant="caption"
                  color="text.secondary"
                  display="block"
                  sx={{ mb: 1.5 }}
                >
                  {m.machineCapacity}
                  {m.machineMake ? ` · ${m.machineMake}` : ""}
                </Typography>
                {m.tools.map((t) => (
                  <Box
                    key={t.toolId}
                    sx={{
                      mb: 1,
                      p: 1,
                      borderRadius: 1,
                      bgcolor: "grey.50",
                    }}
                  >
                    <Typography variant="body2" fontWeight={600} noWrap>
                      {t.toolNo}
                    </Typography>
                    <Typography variant="caption" color="text.secondary" noWrap>
                      {t.partName} ({t.partNo})
                    </Typography>
                    <Box
                      sx={{
                        display: "flex",
                        gap: 0.5,
                        mt: 0.5,
                        flexWrap: "wrap",
                      }}
                    >
                      <Chip
                        label={`${formatNumber(t.scheduledQty)} pcs`}
                        size="small"
                        color="primary"
                        variant="outlined"
                      />
                      <Chip
                        label={`${t.cavities} cav`}
                        size="small"
                        variant="outlined"
                      />
                      <Chip
                        label={`${t.operations} op`}
                        size="small"
                        variant="outlined"
                      />
                    </Box>
                  </Box>
                ))}
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* ── Weekly Schedule ──────────────────────────────────────── */}
      <Box
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          mb: 2,
        }}
      >
        <Typography variant="h6">Weekly Schedule</Typography>
        <ToggleButtonGroup
          value={weekOffset}
          exclusive
          onChange={(_, v) => v !== null && setWeekOffset(v)}
          size="small"
        >
          <ToggleButton value={0}>This Week</ToggleButton>
          <ToggleButton value={1}>Next Week</ToggleButton>
        </ToggleButtonGroup>
      </Box>
      <Card sx={{ mb: 4 }}>
        <TableContainer>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell sx={{ fontWeight: 700 }}>Date</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Tool</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Component</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Machine</TableCell>
                <TableCell align="right" sx={{ fontWeight: 700 }}>
                  Qty
                </TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {weekly?.days.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} align="center">
                    <Typography variant="body2" color="text.secondary" py={2}>
                      No schedule data for this week.
                    </Typography>
                  </TableCell>
                </TableRow>
              )}
              {weekly?.days.map((day) =>
                day.tools.map((tool, idx) => (
                  <TableRow
                    key={`${day.date}-${tool.toolId}-${idx}`}
                    sx={{
                      bgcolor: idx === 0 ? "grey.50" : "inherit",
                    }}
                  >
                    <TableCell>
                      {idx === 0 ? (
                        <Box>
                          <Typography variant="body2" fontWeight={600}>
                            {formatDate(day.date)}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {day.uniqueTools} tools · {day.uniqueMachines}{" "}
                            machines
                          </Typography>
                        </Box>
                      ) : (
                        ""
                      )}
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">{tool.toolNo}</Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" noWrap>
                        {tool.partName}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {tool.partNo}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" noWrap>
                        {tool.machineName}
                      </Typography>
                    </TableCell>
                    <TableCell align="right">
                      {formatNumber(tool.scheduledQty)}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Card>

      {/* ── Charts Row ──────────────────────────────────────────── */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid size={{ xs: 12, md: 6 }}>
          <Card>
            <CardContent>
              <Typography variant="h6" sx={{ mb: 1 }}>
                Top 10 Most-Used Tools
              </Typography>
              <Typography variant="caption" color="text.secondary">
                By total pieces produced (all time)
              </Typography>
              <Chart option={topUsedChartOption} height={380} />
            </CardContent>
          </Card>
        </Grid>
        <Grid size={{ xs: 12, md: 6 }}>
          <Card>
            <CardContent>
              <Typography variant="h6" sx={{ mb: 1 }}>
                Tool Lifecycle
              </Typography>
              <Typography variant="caption" color="text.secondary">
                X: Days in service · Y: Total strokes · Size & color: Scrap
                rate (
                <Box component="span" sx={{ color: "success.main" }}>
                  ●
                </Box>{" "}
                &lt;0.5%{" "}
                <Box component="span" sx={{ color: "warning.main" }}>
                  ●
                </Box>{" "}
                0.5–2%{" "}
                <Box component="span" sx={{ color: "error.main" }}>
                  ●
                </Box>{" "}
                &gt;2%)
              </Typography>
              <Chart option={lifecycleChartOption} height={380} />
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* ── Maintenance Table ───────────────────────────────────── */}
      <Typography variant="h6" sx={{ mb: 2 }}>
        Tool Maintenance Overview
      </Typography>
      <Card>
        <TableContainer component={Paper} variant="outlined">
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell sx={{ fontWeight: 700 }}>Tool No</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Component</TableCell>
                <TableCell align="right" sx={{ fontWeight: 700 }}>
                  Runs
                </TableCell>
                <TableCell align="right" sx={{ fontWeight: 700 }}>
                  Total Strokes
                </TableCell>
                <TableCell align="right" sx={{ fontWeight: 700 }}>
                  Scrap Rate
                </TableCell>
                <TableCell align="right" sx={{ fontWeight: 700 }}>
                  Days in Service
                </TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Last Used</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {maintenance?.tools.map((t) => (
                <TableRow key={t.toolId}>
                  <TableCell>
                    <Tooltip title={t.drawingNo || ""} arrow>
                      <Typography variant="body2" fontWeight={500} noWrap>
                        {t.toolNo}
                      </Typography>
                    </Tooltip>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" noWrap>
                      {t.partName}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {t.partNo}
                    </Typography>
                  </TableCell>
                  <TableCell align="right">{t.usageCount}</TableCell>
                  <TableCell align="right">
                    {formatNumber(t.totalStrokes)}
                  </TableCell>
                  <TableCell align="right">
                    <Chip
                      label={`${t.scrapRate}%`}
                      size="small"
                      color={getScrapColor(t.scrapRate)}
                      variant="outlined"
                    />
                  </TableCell>
                  <TableCell align="right">{t.daysInService}</TableCell>
                  <TableCell>
                    {t.lastUsed
                      ? formatDate(t.lastUsed.split("T")[0] ?? t.lastUsed)
                      : "—"}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Card>
    </>
  );
}
