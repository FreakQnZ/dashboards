import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ThemeProvider } from "@mui/material/styles";
import CssBaseline from "@mui/material/CssBaseline";
import { theme } from "./theme";
import { DashboardLayout } from "./layouts";
import {
  LandingPage,
  ToolsDashboardPage,
  PreventiveMaintenancePage,
  LifeReportPage,
  ProductionDashboardPage,
  RMVariancePage,
  ReportsPage,
  RunReportPage,
} from "./pages";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      retry: 1,
    },
  },
});

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <ThemeProvider theme={theme}>
          <CssBaseline />
          <Routes>
            <Route path="/" element={<LandingPage />} />
            <Route
              path="/dashboards/tools"
              element={
                <DashboardLayout>
                  <ToolsDashboardPage />
                </DashboardLayout>
              }
            />
            <Route
              path="/preventive-maintenance"
              element={
                <DashboardLayout>
                  <PreventiveMaintenancePage />
                </DashboardLayout>
              }
            />
            <Route
              path="/life-report"
              element={
                <DashboardLayout>
                  <LifeReportPage />
                </DashboardLayout>
              }
            />
            <Route
              path="/production"
              element={
                <DashboardLayout>
                  <ProductionDashboardPage />
                </DashboardLayout>
              }
            />
            <Route
              path="/rm-variance"
              element={
                <DashboardLayout>
                  <RMVariancePage />
                </DashboardLayout>
              }
            />
            <Route
              path="/reports"
              element={
                <DashboardLayout>
                  <ReportsPage />
                </DashboardLayout>
              }
            />
            <Route
              path="/reports/run"
              element={
                <DashboardLayout>
                  <RunReportPage />
                </DashboardLayout>
              }
            />
          </Routes>
        </ThemeProvider>
      </BrowserRouter>
    </QueryClientProvider>
  );
}
