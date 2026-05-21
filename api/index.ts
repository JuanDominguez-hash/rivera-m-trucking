import "dotenv/config";
import express from "express";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { registerOAuthRoutes, seedDemoUsers } from "../server/_core/oauth.js";
import { registerStorageProxy } from "../server/_core/storageProxy.js";
import { appRouter } from "../server/routers.js";
import { createContext } from "../server/_core/context.js";

const app = express();

app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));

// Health check endpoint
app.get("/api/health", (_req, res) => {
  res.status(200).json({ status: "ok", time: new Date().toISOString() });
});

registerStorageProxy(app);
registerOAuthRoutes(app);

app.use(
  "/api/trpc",
  createExpressMiddleware({ 
    router: appRouter, 
    createContext,
    onError({ error, path }) {
      console.error(`>>> tRPC Error on path "${path}":`, error);
    }
  })
);

// Seed demo users middleware
let seeded = false;
app.use(async (req, _res, next) => {
  if (!seeded && req.path.startsWith("/api/")) {
    seeded = true;
    try {
      console.log("[Seed] Attempting to seed demo users...");
      await seedDemoUsers();
      console.log("[Seed] Success");
    } catch (e) {
      console.warn("[Seed] Demo users may already exist or DB error:", String(e));
    }
  }
  next();
});

// Global error handler
app.use((err: any, _req: any, res: any, _next: any) => {
  console.error(">>> Global Server Error:", err);
  res.status(500).json({ error: "Internal Server Error", message: String(err) });
});

export default app;
