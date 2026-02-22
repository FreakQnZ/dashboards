import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ThemeProvider } from "@mui/material/styles";
import CssBaseline from "@mui/material/CssBaseline";
import { theme } from "./theme";
import { DashboardLayout } from "./layouts";
import {
  DashboardPage,
  LandingPage,
  ToolsDashboardPage,
  PreventiveMaintenancePage,
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
              path="/dashboards/:dashboardId"
              element={
                <DashboardLayout>
                  <DashboardPage />
                </DashboardLayout>
              }
            />
          </Routes>
        </ThemeProvider>
      </BrowserRouter>
    </QueryClientProvider>
  );
}
