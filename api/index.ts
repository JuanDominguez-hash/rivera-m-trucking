import "dotenv/config";
import express from "express";
import { createExpressMiddleware } from "@trpc/server/adapters/express";

const app = express();
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));

// Health check endpoint
app.get("/api/health", (_req, res) => {
  res.status(200).json({ status: "ok", time: new Date().toISOString() });
});

// Dynamic imports to avoid ERR_MODULE_NOT_FOUND on startup
const setupRoutes = async () => {
  try {
    const { registerOAuthRoutes, seedDemoUsers } = await import("../server/_core/oauth");
    const { registerStorageProxy } = await import("../server/_core/storageProxy");
    const { appRouter } = await import("../server/routers");
    const { createContext } = await import("../server/_core/context");

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
          await seedDemoUsers();
        } catch (e) {
          console.warn("[Seed] Error:", String(e));
        }
      }
      next();
    });
  } catch (err) {
    console.error(">>> Failed to setup routes:", err);
  }
};

setupRoutes();

// Global error handler
app.use((err: any, _req: any, res: any, _next: any) => {
  console.error(">>> Global Server Error:", err);
  res.status(500).json({ error: "Internal Server Error", message: String(err) });
});

export default app;
