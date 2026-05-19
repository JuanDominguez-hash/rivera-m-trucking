import { and, desc, eq, gte, lte, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import {
  InsertUser,
  dailyLogs,
  drivers,
  driverPhotos,
  localAuth,
  payStubs,
  penalties,
  routes,
  users,
} from "../drizzle/schema";
import { ENV } from "./_core/env";

let _db: ReturnType<typeof drizzle> | null = null;

export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      const client = postgres(process.env.DATABASE_URL, { max: 1 });
      _db = drizzle(client);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

// Helper: convert Date or string to YYYY-MM-DD string
function toDateString(val: Date | string | null | undefined): string {
  if (!val) return new Date().toISOString().slice(0, 10);
  if (typeof val === "string") return val.slice(0, 10);
  return val.toISOString().slice(0, 10);
}

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) throw new Error("User openId is required for upsert");
  const db = await getDb();
  if (!db) return;

  const values: InsertUser = { openId: user.openId };
  const updateSet: Record<string, unknown> = {};

  const textFields = ["name", "email", "loginMethod"] as const;
  textFields.forEach(field => {
    const value = user[field];
    if (value === undefined) return;
    const normalized = value ?? null;
    values[field] = normalized;
    updateSet[field] = normalized;
  });

  if (user.lastSignedIn !== undefined) {
    values.lastSignedIn = user.lastSignedIn;
    updateSet.lastSignedIn = user.lastSignedIn;
  }
  if (user.role !== undefined) {
    values.role = user.role;
    updateSet.role = user.role;
  } else if (user.openId === ENV.ownerOpenId) {
    values.role = "admin";
    updateSet.role = "admin";
  }

  if (!values.lastSignedIn) values.lastSignedIn = new Date();
  if (Object.keys(updateSet).length === 0) updateSet.lastSignedIn = new Date();

  await db
    .insert(users)
    .values(values)
    .onConflictDoUpdate({ target: users.openId, set: updateSet });
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
  return result[0];
}

// ─── Local Auth ─────────────────────────────────────────────────────────────

export async function getLocalAuthByEmail(email: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(localAuth).where(eq(localAuth.email, email)).limit(1);
  return result[0];
}

export async function createLocalAuth(data: typeof localAuth.$inferInsert) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.insert(localAuth).values(data).onConflictDoNothing();
}

// ─── Drivers ────────────────────────────────────────────────────────────────

export async function listDrivers() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(drivers).orderBy(drivers.firstName);
}

export async function getDriverById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(drivers).where(eq(drivers.id, id)).limit(1);
  return result[0];
}

export async function getDriverByUserId(userId: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(drivers).where(eq(drivers.userId, userId)).limit(1);
  return result[0];
}

export async function createDriver(data: typeof drivers.$inferInsert) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.insert(drivers).values(data);
}

export async function updateDriver(id: number, data: Partial<typeof drivers.$inferInsert>) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.update(drivers).set({ ...data, updatedAt: new Date() }).where(eq(drivers.id, id));
}

export async function deleteDriver(id: number) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.delete(drivers).where(eq(drivers.id, id));
}

// ─── Routes ─────────────────────────────────────────────────────────────────

export async function listRoutes() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(routes).orderBy(routes.routeNumber);
}

export async function getRouteById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(routes).where(eq(routes.id, id)).limit(1);
  return result[0];
}

export async function createRoute(data: typeof routes.$inferInsert) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.insert(routes).values(data);
}

export async function updateRoute(id: number, data: Partial<typeof routes.$inferInsert>) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.update(routes).set({ ...data, updatedAt: new Date() }).where(eq(routes.id, id));
}

export async function deleteRoute(id: number) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.delete(routes).where(eq(routes.id, id));
}

// ─── Daily Logs ─────────────────────────────────────────────────────────────

export async function listDailyLogs(opts?: { driverId?: number; dateFrom?: string; dateTo?: string }) {
  const db = await getDb();
  if (!db) return [];

  const conditions = [];
  if (opts?.driverId) conditions.push(eq(dailyLogs.driverId, opts.driverId));
  if (opts?.dateFrom) conditions.push(gte(dailyLogs.logDate, opts.dateFrom));
  if (opts?.dateTo) conditions.push(lte(dailyLogs.logDate, opts.dateTo));

  const logs = await db
    .select()
    .from(dailyLogs)
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(desc(dailyLogs.logDate));

  const result = await Promise.all(
    logs.map(async (log) => {
      const driver = await getDriverById(log.driverId);
      const route = await getRouteById(log.routeId);
      return { log, driver, route };
    })
  );
  return result;
}

export async function createDailyLog(data: typeof dailyLogs.$inferInsert) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  const insertData = {
    ...data,
    logDate: toDateString(data.logDate as any),
  };
  await db.insert(dailyLogs).values(insertData as any);
}

export async function updateDailyLog(id: number, data: Partial<typeof dailyLogs.$inferInsert>) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  const updateData: any = { ...data, updatedAt: new Date() };
  if (data.logDate) updateData.logDate = toDateString(data.logDate as any);
  await db.update(dailyLogs).set(updateData).where(eq(dailyLogs.id, id));
}

export async function deleteDailyLog(id: number) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.delete(dailyLogs).where(eq(dailyLogs.id, id));
}

// ─── Penalties ──────────────────────────────────────────────────────────────

export async function listPenalties(opts?: { driverId?: number; dateFrom?: string; dateTo?: string }) {
  const db = await getDb();
  if (!db) return [];

  const conditions = [];
  if (opts?.driverId) conditions.push(eq(penalties.driverId, opts.driverId));
  if (opts?.dateFrom) conditions.push(gte(penalties.penaltyDate, opts.dateFrom));
  if (opts?.dateTo) conditions.push(lte(penalties.penaltyDate, opts.dateTo));

  const rows = await db
    .select()
    .from(penalties)
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(desc(penalties.penaltyDate));

  return Promise.all(rows.map(async (penalty) => {
    const driver = await getDriverById(penalty.driverId);
    return { penalty, driver };
  }));
}

export async function createPenalty(data: typeof penalties.$inferInsert) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  const insertData = {
    ...data,
    penaltyDate: toDateString(data.penaltyDate as any),
  };
  await db.insert(penalties).values(insertData as any);
}

export async function deletePenalty(id: number) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.delete(penalties).where(eq(penalties.id, id));
}

// ─── Pay Stubs ──────────────────────────────────────────────────────────────

export async function listPayStubs(opts?: { driverId?: number; status?: string }) {
  const db = await getDb();
  if (!db) return [];

  const conditions = [];
  if (opts?.driverId) conditions.push(eq(payStubs.driverId, opts.driverId));
  if (opts?.status) conditions.push(eq(payStubs.status, opts.status as any));

  const stubs = await db
    .select()
    .from(payStubs)
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(desc(payStubs.weekStart));

  return Promise.all(stubs.map(async (stub) => {
    const driver = await getDriverById(stub.driverId);
    return { stub, driver };
  }));
}

export async function getPayStubById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(payStubs).where(eq(payStubs.id, id)).limit(1);
  return result[0];
}

export async function generatePayStub(driverId: number, weekStart: string, weekEnd: string) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");

  const wsDate = toDateString(weekStart);
  const weDate = toDateString(weekEnd);

  const logs = await db
    .select()
    .from(dailyLogs)
    .where(
      and(
        eq(dailyLogs.driverId, driverId),
        gte(dailyLogs.logDate, wsDate),
        lte(dailyLogs.logDate, weDate)
      )
    );

  const penaltyRows = await db
    .select()
    .from(penalties)
    .where(
      and(
        eq(penalties.driverId, driverId),
        gte(penalties.penaltyDate, wsDate),
        lte(penalties.penaltyDate, weDate)
      )
    );

  const totalPackages = logs.reduce((s, l) => s + l.totalPackages, 0);
  const totalDelivered = logs.reduce((s, l) => s + l.packagesDelivered, 0);
  const totalDoubles = logs.reduce((s, l) => s + l.doublesReturns, 0);
  const grossPay = logs.reduce((s, l) => s + parseFloat(String(l.grossPay ?? "0")), 0);
  const totalPenalties = penaltyRows.reduce((s, p) => s + parseFloat(String(p.amount ?? "0")), 0);
  const totalPay = Math.max(0, grossPay - totalPenalties);

  const existing = await db
    .select()
    .from(payStubs)
    .where(
      and(
        eq(payStubs.driverId, driverId),
        eq(payStubs.weekStart, wsDate),
        eq(payStubs.weekEnd, weDate)
      )
    )
    .limit(1);

  if (existing.length > 0) {
    await db.update(payStubs).set({
      totalPackages,
      totalDelivered,
      totalDoubles,
      grossPay: grossPay.toFixed(2),
      totalPenalties: totalPenalties.toFixed(2),
      totalPay: totalPay.toFixed(2),
      status: "draft",
      updatedAt: new Date(),
    }).where(eq(payStubs.id, existing[0].id));

    if (penaltyRows.length > 0) {
      await db.update(penalties).set({ payStubId: existing[0].id }).where(
        and(
          eq(penalties.driverId, driverId),
          gte(penalties.penaltyDate, wsDate),
          lte(penalties.penaltyDate, weDate)
        )
      );
    }

    return { id: existing[0].id, totalPay };
  }

  await db.insert(payStubs).values({
    driverId,
    weekStart: wsDate,
    weekEnd: weDate,
    totalPackages,
    totalDelivered,
    totalDoubles,
    grossPay: grossPay.toFixed(2),
    totalPenalties: totalPenalties.toFixed(2),
    totalPay: totalPay.toFixed(2),
    status: "draft",
  } as any);

  const inserted = await db
    .select()
    .from(payStubs)
    .where(
      and(
        eq(payStubs.driverId, driverId),
        eq(payStubs.weekStart, wsDate),
        eq(payStubs.weekEnd, weDate)
      )
    )
    .limit(1);

  if (inserted.length > 0 && penaltyRows.length > 0) {
    await db.update(penalties).set({ payStubId: inserted[0].id }).where(
      and(
        eq(penalties.driverId, driverId),
        gte(penalties.penaltyDate, wsDate),
        lte(penalties.penaltyDate, weDate)
      )
    );
  }

  return { id: inserted[0]?.id ?? 0, totalPay };
}

export async function generatePayStubsForAll(weekStart: string, weekEnd: string) {
  const allDrivers = await listDrivers();
  const results = [];
  for (const driver of allDrivers) {
    try {
      const result = await generatePayStub(driver.id, weekStart, weekEnd);
      results.push({ driverId: driver.id, ...result });
    } catch (e) {
      results.push({ driverId: driver.id, error: String(e) });
    }
  }
  return results;
}

export async function sendPayStubsToAll(weekStart: string, weekEnd: string) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  const wsDate = toDateString(weekStart);
  const weDate = toDateString(weekEnd);
  await db.update(payStubs)
    .set({ status: "sent", updatedAt: new Date() })
    .where(
      and(
        gte(payStubs.weekStart, wsDate),
        lte(payStubs.weekEnd, weDate),
        eq(payStubs.status, "draft")
      )
    );
}

export async function updatePayStubStatus(
  id: number,
  status: "draft" | "sent" | "approved" | "disputed" | "paid",
  driverNotes?: string
) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  const updateData: any = {
    status,
    ...(driverNotes !== undefined ? { driverNotes } : {}),
    updatedAt: new Date(),
  };
  if (status === "paid") {
    updateData.paidAt = new Date();
  }
  await db.update(payStubs).set(updateData).where(eq(payStubs.id, id));
}

// ─── Driver Photos ───────────────────────────────────────────────────────────

export async function listDriverPhotos(driverId: number) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(driverPhotos)
    .where(eq(driverPhotos.driverId, driverId))
    .orderBy(desc(driverPhotos.createdAt));
}

export async function createDriverPhoto(data: typeof driverPhotos.$inferInsert) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.insert(driverPhotos).values(data);
}

export async function deleteDriverPhoto(id: number) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.delete(driverPhotos).where(eq(driverPhotos.id, id));
}

// ─── Reports ────────────────────────────────────────────────────────────────

export async function weeklyReport(weekStart: string, weekEnd: string) {
  const db = await getDb();
  if (!db) return [];

  const wsDate = toDateString(weekStart);
  const weDate = toDateString(weekEnd);

  const rows = await db
    .select({
      driverId: dailyLogs.driverId,
      totalPackages: sql<number>`SUM(${dailyLogs.totalPackages})`,
      totalDelivered: sql<number>`SUM(${dailyLogs.packagesDelivered})`,
      totalDoubles: sql<number>`SUM(${dailyLogs.doublesReturns})`,
      grossPay: sql<number>`SUM(${dailyLogs.grossPay})`,
    })
    .from(dailyLogs)
    .where(
      and(
        gte(dailyLogs.logDate, wsDate),
        lte(dailyLogs.logDate, weDate)
      )
    )
    .groupBy(dailyLogs.driverId);

  return Promise.all(rows.map(async (r) => {
    const driver = await getDriverById(r.driverId);
    return {
      ...r,
      driverCode: driver?.driverCode,
      driverFirstName: driver?.firstName,
      driverLastName: driver?.lastName,
    };
  }));
}

export async function annualReport(year: number) {
  const db = await getDb();
  if (!db) return [];

  const yearStart = `${year}-01-01`;
  const yearEnd = `${year}-12-31`;

  const logRows = await db
    .select({
      driverId: dailyLogs.driverId,
      totalPackages: sql<number>`SUM(${dailyLogs.totalPackages})`,
      totalDelivered: sql<number>`SUM(${dailyLogs.packagesDelivered})`,
      totalDoubles: sql<number>`SUM(${dailyLogs.doublesReturns})`,
      grossPay: sql<number>`SUM(${dailyLogs.grossPay})`,
    })
    .from(dailyLogs)
    .where(and(gte(dailyLogs.logDate, yearStart), lte(dailyLogs.logDate, yearEnd)))
    .groupBy(dailyLogs.driverId);

  return Promise.all(logRows.map(async (r) => {
    const driver = await getDriverById(r.driverId);
    const penaltyRows = await db!
      .select({ total: sql<number>`SUM(${penalties.amount})` })
      .from(penalties)
      .where(
        and(
          eq(penalties.driverId, r.driverId),
          gte(penalties.penaltyDate, yearStart),
          lte(penalties.penaltyDate, yearEnd)
        )
      );

    const totalPenalties = parseFloat(String(penaltyRows[0]?.total ?? "0"));
    const grossPay = parseFloat(String(r.grossPay ?? "0"));

    return {
      ...r,
      driverCode: driver?.driverCode,
      driverFirstName: driver?.firstName,
      driverLastName: driver?.lastName,
      totalPenalties,
      netPay: Math.max(0, grossPay - totalPenalties),
    };
  }));
}
