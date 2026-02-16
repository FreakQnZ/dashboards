import { useParams } from "react-router-dom";
import Grid from "@mui/material/Grid";
import Typography from "@mui/material/Typography";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import Chip from "@mui/material/Chip";
import type { EChartsOption } from "echarts";
import { useHealthCheck } from "@/api";
import { Chart } from "@/charts";
import { StatCard } from "@/components";

const dashboardTitles: Record<string, string> = {
  production: "Production Overview",
  quality: "Quality Metrics",
  downtime: "Downtime Analysis",
  inventory: "Inventory Status",
};

/** Sample chart option — replace with real data queries */
const sampleLineOption: EChartsOption = {
  tooltip: { trigger: "axis" },
  xAxis: {
    type: "category",
    data: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"],
  },
  yAxis: { type: "value" },
  series: [
    {
      name: "Output",
      type: "line",
      smooth: true,
      data: [820, 932, 901, 1034, 1290, 1330, 1320],
    },
  ],
};

const sampleBarOption: EChartsOption = {
  tooltip: { trigger: "axis" },
  xAxis: {
    type: "category",
    data: ["Line A", "Line B", "Line C", "Line D"],
  },
  yAxis: { type: "value" },
  series: [
    {
      type: "bar",
      data: [85, 72, 91, 68],
      itemStyle: { borderRadius: [4, 4, 0, 0] },
    },
  ],
};

export default function DashboardPage() {
  const { dashboardId } = useParams<{ dashboardId: string }>();
  const { data: health } = useHealthCheck();
  const title = dashboardTitles[dashboardId ?? ""] ?? "Dashboard";

  return (
    <>
      <Typography variant="h4" sx={{ mb: 3 }}>
        {title}
      </Typography>

      {/* KPI cards */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <StatCard title="Total Output" value="12,450" subtitle="units today" />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <StatCard title="Yield Rate" value="94.2%" subtitle="+1.3% vs yesterday" />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <StatCard title="Downtime" value="23 min" subtitle="3 incidents" />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <StatCard
            title="API Status"
            value={
              <Chip
                label={health?.status === "ok" ? "Connected" : "Checking…"}
                color={health?.status === "ok" ? "success" : "default"}
                size="small"
              />
            }
          />
        </Grid>
      </Grid>

      {/* Charts */}
      <Grid container spacing={3}>
        <Grid size={{ xs: 12, md: 8 }}>
          <Card>
            <CardContent>
              <Typography variant="h6" sx={{ mb: 2 }}>
                Weekly Production Output
              </Typography>
              <Chart option={sampleLineOption} />
            </CardContent>
          </Card>
        </Grid>
        <Grid size={{ xs: 12, md: 4 }}>
          <Card>
            <CardContent>
              <Typography variant="h6" sx={{ mb: 2 }}>
                Line Efficiency (%)
              </Typography>
              <Chart option={sampleBarOption} />
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </>
  );
}
