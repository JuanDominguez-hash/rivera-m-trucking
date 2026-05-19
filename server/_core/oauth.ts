import { COOKIE_NAME, ONE_YEAR_MS } from "@shared/const";
import type { Express, Request, Response } from "express";
import * as db from "../db";
import { getSessionCookieOptions } from "./cookies";
import { sdk, LOCAL_AUTH_PREFIX } from "./sdk";
import { createHash } from "crypto";

function getQueryParam(req: Request, key: string): string | undefined {
  const value = req.query[key];
  return typeof value === "string" ? value : undefined;
}

function hashPassword(password: string): string {
  return createHash("sha256").update(password + "rivera-salt").digest("hex");
}

export function registerOAuthRoutes(app: Express) {
  // ─── OAuth callback (Manus OAuth) ──────────────────────────────────────────
  app.get("/api/oauth/callback", async (req: Request, res: Response) => {
    const code = getQueryParam(req, "code");
    const state = getQueryParam(req, "state");

    if (!code || !state) {
      res.status(400).json({ error: "code and state are required" });
      return;
    }

    try {
      const tokenResponse = await sdk.exchangeCodeForToken(code, state);
      const userInfo = await sdk.getUserInfo(tokenResponse.accessToken);

      if (!userInfo.openId) {
        res.status(400).json({ error: "openId missing from user info" });
        return;
      }

      await db.upsertUser({
        openId: userInfo.openId,
        name: userInfo.name || null,
        email: userInfo.email ?? null,
        loginMethod: userInfo.loginMethod ?? userInfo.platform ?? null,
        lastSignedIn: new Date(),
      });

      const sessionToken = await sdk.createSessionToken(userInfo.openId, {
        name: userInfo.name || "",
        expiresInMs: ONE_YEAR_MS,
      });

      const cookieOptions = getSessionCookieOptions(req);
      res.cookie(COOKIE_NAME, sessionToken, { ...cookieOptions, maxAge: ONE_YEAR_MS });
      res.redirect(302, "/");
    } catch (error) {
      console.error("[OAuth] Callback failed", error);
      res.status(500).json({ error: "OAuth callback failed" });
    }
  });

  // ─── Local login (email + password) ────────────────────────────────────────
  app.post("/api/auth/login", async (req: Request, res: Response) => {
    const { email, password } = req.body as { email?: string; password?: string };

    if (!email || !password) {
      res.status(400).json({ error: "email and password are required" });
      return;
    }

    try {
      const localUser = await db.getLocalAuthByEmail(email.toLowerCase().trim());

      if (!localUser) {
        res.status(401).json({ error: "Invalid credentials" });
        return;
      }

      const passwordHash = hashPassword(password);
      if (localUser.passwordHash !== passwordHash) {
        res.status(401).json({ error: "Invalid credentials" });
        return;
      }

      // Get or create the users table entry
      const openId = `${LOCAL_AUTH_PREFIX}${localUser.id}`;
      let user = await db.getUserByOpenId(openId);

      if (!user) {
        await db.upsertUser({
          openId,
          name: email,
          email: email,
          loginMethod: "local",
          role: localUser.role,
          lastSignedIn: new Date(),
        });
        user = await db.getUserByOpenId(openId);
      } else {
        await db.upsertUser({ openId, lastSignedIn: new Date() });
      }

      if (!user) {
        res.status(500).json({ error: "Failed to create user session" });
        return;
      }

      const sessionToken = await sdk.createSessionToken(openId, {
        name: email,
        expiresInMs: ONE_YEAR_MS,
      });

      const cookieOptions = getSessionCookieOptions(req);
      res.cookie(COOKIE_NAME, sessionToken, { ...cookieOptions, maxAge: ONE_YEAR_MS });
      res.json({ success: true, role: user.role, driverId: localUser.driverId });
    } catch (error) {
      console.error("[LocalAuth] Login failed", error);
      res.status(500).json({ error: "Login failed" });
    }
  });

  // ─── Seed demo users (called once on startup) ──────────────────────────────
  app.post("/api/auth/seed-demo", async (_req: Request, res: Response) => {
    try {
      await seedDemoUsers();
      res.json({ success: true });
    } catch (error) {
      console.error("[Seed] Failed to seed demo users:", error);
      res.status(500).json({ error: "Failed to seed demo users" });
    }
  });
}

export async function seedDemoUsers() {
  const { createHash } = await import("crypto");
  const hash = (p: string) => createHash("sha256").update(p + "rivera-salt").digest("hex");

  // Admin user
  await db.createLocalAuth({
    email: "admin@rivera.com",
    passwordHash: hash("admin123"),
    role: "admin",
    driverId: null,
  });

  // Driver user
  await db.createLocalAuth({
    email: "driver1@rivera.com",
    passwordHash: hash("driver123"),
    role: "user",
    driverId: null,
  });
}
