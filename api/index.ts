import "dotenv/config";
import express from "express";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { registerOAuthRoutes, seedDemoUsers } from "../server/_core/oauth";
import { registerStorageProxy } from "../server/_core/storageProxy";
import { appRouter } from "../server/routers";
import { createContext } from "../server/_core/context";

const app = express();

app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));

registerStorageProxy(app);
registerOAuthRoutes(app);

app.use(
  "/api/trpc",
  createExpressMiddleware({ router: appRouter, createContext })
);

// Seed demo users on first request
let seeded = false;
app.use(async (_req, _res, next) => {
  if (!seeded) {
    seeded = true;
    try {
      await seedDemoUsers();
    } catch (e) {
      console.warn("[Seed] Demo users may already exist:", String(e).slice(0, 100));
    }
  }
  next();
});

export default app;
