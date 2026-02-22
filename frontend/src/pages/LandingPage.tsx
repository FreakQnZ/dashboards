import { Link as RouterLink } from "react-router-dom";
import Grid from "@mui/material/Grid";
import Card from "@mui/material/Card";
import CardActionArea from "@mui/material/CardActionArea";
import CardContent from "@mui/material/CardContent";
import Typography from "@mui/material/Typography";
import Box from "@mui/material/Box";
import DashboardIcon from "@mui/icons-material/Dashboard";
import BarChartIcon from "@mui/icons-material/BarChart";
import ShowChartIcon from "@mui/icons-material/ShowChart";
import InventoryIcon from "@mui/icons-material/Inventory";
import BuildIcon from "@mui/icons-material/Build";
import HandymanIcon from "@mui/icons-material/Handyman";

const dashboards = [
  {
    title: "Tools",
    description: "Tool scheduling, machine assignments, usage analytics & maintenance planning",
    path: "/dashboards/tools",
    icon: <BuildIcon sx={{ fontSize: 48 }} />,
    color: "#d84315",
  },
  {
    title: "Preventive Maintenance",
    description: "Track tool maintenance schedules, stroke thresholds & maintenance history",
    path: "/preventive-maintenance",
    icon: <HandymanIcon sx={{ fontSize: 48 }} />,
    color: "#00796b",
  },
  {
    title: "Production Overview",
    description: "Key production KPIs, weekly output, and line efficiency",
    path: "/dashboards/production",
    icon: <DashboardIcon sx={{ fontSize: 48 }} />,
    color: "#1976d2",
  },
  {
    title: "Quality Metrics",
    description: "Yield rates, defect tracking, and quality trends",
    path: "/dashboards/quality",
    icon: <BarChartIcon sx={{ fontSize: 48 }} />,
    color: "#2e7d32",
  },
  {
    title: "Downtime Analysis",
    description: "Equipment downtime, incidents, and root cause analysis",
    path: "/dashboards/downtime",
    icon: <ShowChartIcon sx={{ fontSize: 48 }} />,
    color: "#ed6c02",
  },
  {
    title: "Inventory Status",
    description: "Raw materials, WIP levels, and finished goods",
    path: "/dashboards/inventory",
    icon: <InventoryIcon sx={{ fontSize: 48 }} />,
    color: "#9c27b0",
  },
];

export default function LandingPage() {
  return (
    <Box sx={{ maxWidth: 1200, mx: "auto", py: 4, px: 3 }}>
      <Typography variant="h3" fontWeight={700} gutterBottom>
        Dashboards
      </Typography>
      <Typography variant="body1" color="text.secondary" sx={{ mb: 5 }}>
        Select a dashboard or tool to get started.
      </Typography>

      <Grid container spacing={3}>
        {dashboards.map((d) => (
          <Grid key={d.path} size={{ xs: 12, sm: 6, md: 4, lg: 3 }}>
            <Card
              sx={{
                height: "100%",
                transition: "transform 0.15s, box-shadow 0.15s",
                "&:hover": {
                  transform: "translateY(-4px)",
                  boxShadow: 6,
                },
              }}
            >
              <CardActionArea
                component={RouterLink}
                to={d.path}
                sx={{ height: "100%" }}
              >
                <CardContent
                  sx={{
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    textAlign: "center",
                    py: 4,
                    gap: 2,
                  }}
                >
                  <Box sx={{ color: d.color }}>{d.icon}</Box>
                  <Typography variant="h6" fontWeight={600}>
                    {d.title}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {d.description}
                  </Typography>
                </CardContent>
              </CardActionArea>
            </Card>
          </Grid>
        ))}
      </Grid>
    </Box>
  );
}
