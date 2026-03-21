import { Hono } from "hono";
import { serveStatic } from "hono/bun";
import { corsMiddleware, logger } from "./middleware";
import { healthRoutes, toolsRoutes, pmRoutes, scheduleRoutes, productionRoutes, rmVarianceRoutes } from "./routes";
import { env } from "./env";
import { join } from "path";

const app = new Hono();

// Global middleware
app.use("*", corsMiddleware);
app.use("*", logger);

// ================= API ROUTES =================
app.route("/api/health", healthRoutes);
app.route("/api/tools", toolsRoutes);
app.route("/api/pm", pmRoutes);
app.route("/schedule", scheduleRoutes);
app.route("/api/production", productionRoutes);
app.route("/api/rm-variance", rmVarianceRoutes);

// ================= FRONTEND STATIC =================

// Serve static assets (JS, CSS, images)
app.use(
  "/*",
  serveStatic({
    root: join(process.cwd(), "../frontend/dist"),
  })
);

// SPA fallback (important for React Router)
app.get("*", async (c, next) => {
  return serveStatic({
    path: "index.html",
    root: join(process.cwd(), "../frontend/dist"),
  })(c, next);
});

console.log(`🚀 Server starting on port ${env.PORT}`);

export default {
  port: env.PORT,
  fetch: app.fetch,
};