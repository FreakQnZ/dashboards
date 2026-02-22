import { Hono } from "hono";
import { corsMiddleware, logger } from "./middleware";
import { healthRoutes, toolsRoutes, pmRoutes } from "./routes";
import { env } from "./env";

const app = new Hono();

// Global middleware
app.use("*", corsMiddleware);
app.use("*", logger);

// Routes
app.route("/api/health", healthRoutes);
app.route("/api/tools", toolsRoutes);
app.route("/api/pm", pmRoutes);

// Root
app.get("/", (c) => {
  return c.json({ message: "Manufacturing Dashboard API", version: "0.1.0" });
});

console.log(`🚀 Server starting on port ${env.PORT}`);

export default {
  port: env.PORT,
  fetch: app.fetch,
};
