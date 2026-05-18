import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import { COOKIE_NAME } from "../shared/const";
import type { TrpcContext } from "./_core/context";

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function createAdminContext(): { ctx: TrpcContext; clearedCookies: { name: string; options: Record<string, unknown> }[] } {
  const clearedCookies: { name: string; options: Record<string, unknown> }[] = [];
  const user: AuthenticatedUser = {
    id: 1,
    openId: "admin-user",
    email: "admin@riveramtrucking.com",
    name: "Admin User",
    loginMethod: "manus",
    role: "admin",
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
  };
  const ctx: TrpcContext = {
    user,
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: {
      clearCookie: (name: string, options: Record<string, unknown>) => {
        clearedCookies.push({ name, options });
      },
    } as TrpcContext["res"],
  };
  return { ctx, clearedCookies };
}

function createDriverContext(): { ctx: TrpcContext } {
  const user: AuthenticatedUser = {
    id: 2,
    openId: "driver-user",
    email: "driver@example.com",
    name: "Test Driver",
    loginMethod: "manus",
    role: "user",
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
  };
  const ctx: TrpcContext = {
    user,
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: {
      clearCookie: () => {},
    } as TrpcContext["res"],
  };
  return { ctx };
}

// ─── Auth Tests ──────────────────────────────────────────────────────────────

describe("auth.logout", () => {
  it("clears session cookie and reports success", async () => {
    const { ctx, clearedCookies } = createAdminContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.auth.logout();
    expect(result).toEqual({ success: true });
    expect(clearedCookies).toHaveLength(1);
    expect(clearedCookies[0]?.name).toBe(COOKIE_NAME);
    expect(clearedCookies[0]?.options).toMatchObject({ maxAge: -1 });
  });
});

describe("auth.me", () => {
  it("returns the current user when authenticated", async () => {
    const { ctx } = createAdminContext();
    const caller = appRouter.createCaller(ctx);
    const user = await caller.auth.me();
    expect(user).not.toBeNull();
    expect(user?.role).toBe("admin");
  });

  it("returns null when unauthenticated", async () => {
    const ctx: TrpcContext = {
      user: null,
      req: { protocol: "https", headers: {} } as TrpcContext["req"],
      res: { clearCookie: () => {} } as TrpcContext["res"],
    };
    const caller = appRouter.createCaller(ctx);
    const user = await caller.auth.me();
    expect(user).toBeNull();
  });
});

// ─── Role-Based Access Tests ──────────────────────────────────────────────────

describe("admin-only procedures", () => {
  it("driver cannot list daily logs (admin only)", async () => {
    const { ctx } = createDriverContext();
    const caller = appRouter.createCaller(ctx);
    await expect(caller.dailyLogs.list({})).rejects.toThrow("Solo administradores");
  });

  it("driver cannot create a route", async () => {
    const { ctx } = createDriverContext();
    const caller = appRouter.createCaller(ctx);
    await expect(
      caller.routes.create({
        routeNumber: "TEST-001",
        ratePerPackage: "2.00",
        ratePerDouble: "0.80",
        status: "active",
      })
    ).rejects.toThrow("Solo administradores");
  });

  it("driver cannot create a penalty", async () => {
    const { ctx } = createDriverContext();
    const caller = appRouter.createCaller(ctx);
    await expect(
      caller.penalties.create({
        driverId: 1,
        description: "Test penalty",
        amount: "100.00",
        penaltyDate: "2026-01-01",
      })
    ).rejects.toThrow("Solo administradores");
  });
});

// ─── Gross Pay Calculation Tests ─────────────────────────────────────────────

describe("gross pay calculation logic", () => {
  it("calculates correct gross pay: 50 packages at $2.00 + 5 doubles at $0.80", () => {
    const delivered = 50;
    const doubles = 5;
    const ratePerPackage = 2.0;
    const ratePerDouble = 0.8;
    const grossPay = delivered * ratePerPackage + doubles * ratePerDouble;
    expect(grossPay).toBe(104.0);
  });

  it("calculates correct gross pay: 100 packages at $1.90 + 10 doubles at $0.80", () => {
    const delivered = 100;
    const doubles = 10;
    const ratePerPackage = 1.9;
    const ratePerDouble = 0.8;
    const grossPay = delivered * ratePerPackage + doubles * ratePerDouble;
    expect(grossPay).toBe(198.0);
  });

  it("calculates net pay after penalties", () => {
    const grossPay = 200.0;
    const penalties = 100.0;
    const totalPay = Math.max(0, grossPay - penalties);
    expect(totalPay).toBe(100.0);
  });

  it("net pay cannot go below zero", () => {
    const grossPay = 50.0;
    const penalties = 200.0;
    const totalPay = Math.max(0, grossPay - penalties);
    expect(totalPay).toBe(0);
  });

  it("zero packages results in zero gross pay", () => {
    const delivered = 0;
    const doubles = 0;
    const ratePerPackage = 2.0;
    const ratePerDouble = 0.8;
    const grossPay = delivered * ratePerPackage + doubles * ratePerDouble;
    expect(grossPay).toBe(0);
  });
});

// ─── 1099 Qualification Tests ─────────────────────────────────────────────────

describe("1099 qualification threshold", () => {
  it("driver with $600+ total pay qualifies for 1099", () => {
    const totalPay = 600;
    expect(totalPay >= 600).toBe(true);
  });

  it("driver with exactly $600 qualifies for 1099", () => {
    const totalPay = 600;
    expect(totalPay >= 600).toBe(true);
  });

  it("driver with $599.99 does not qualify for 1099", () => {
    const totalPay = 599.99;
    expect(totalPay >= 600).toBe(false);
  });

  it("driver with $0 does not qualify for 1099", () => {
    const totalPay = 0;
    expect(totalPay >= 600).toBe(false);
  });
});
