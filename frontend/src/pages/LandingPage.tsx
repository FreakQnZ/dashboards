import { Link as RouterLink } from "react-router-dom";
import Grid from "@mui/material/Grid";
import Card from "@mui/material/Card";
import CardActionArea from "@mui/material/CardActionArea";
import CardContent from "@mui/material/CardContent";
import Typography from "@mui/material/Typography";
import Box from "@mui/material/Box";
import BuildIcon from "@mui/icons-material/Build";
import HandymanIcon from "@mui/icons-material/Handyman";
import AssessmentIcon from "@mui/icons-material/Assessment";
import FactoryIcon from "@mui/icons-material/Factory";
import CompareArrowsIcon from "@mui/icons-material/CompareArrows";

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
    title: "Life Report",
    description: "Tool life tracking, stroke analysis & lifecycle reporting",
    path: "/life-report",
    icon: <AssessmentIcon sx={{ fontSize: 48 }} />,
    color: "#1976d2",
  },
  {
    title: "Production",
    description: "Daily production tracking, schedule variance & raw material analysis",
    path: "/production",
    icon: <FactoryIcon sx={{ fontSize: 48 }} />,
    color: "#7b1fa2",
  },
  {
    title: "RM Variance",
    description: "Raw material variance analysis — scheduled vs actual consumption by plant",
    path: "/rm-variance",
    icon: <CompareArrowsIcon sx={{ fontSize: 48 }} />,
    color: "#e65100",
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
