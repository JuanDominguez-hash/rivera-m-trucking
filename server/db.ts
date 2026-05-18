import { and, between, desc, eq, gte, lte, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { InsertUser, dailyLogs, drivers, payStubs, penalties, routes, users } from "../drizzle/schema";
import { ENV } from "./_core/env";

let _db: ReturnType<typeof drizzle> | null = null;

export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
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

  await db.insert(users).values(values).onDuplicateKeyUpdate({ set: updateSet });
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
  return result[0];
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
  if (opts?.dateFrom) conditions.push(gte(dailyLogs.logDate, new Date(opts.dateFrom + 'T00:00:00')));
  if (opts?.dateTo) conditions.push(lte(dailyLogs.logDate, new Date(opts.dateTo + 'T00:00:00')));

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
  await db.insert(dailyLogs).values(data);
}

export async function updateDailyLog(id: number, data: Partial<typeof dailyLogs.$inferInsert>) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.update(dailyLogs).set({ ...data, updatedAt: new Date() }).where(eq(dailyLogs.id, id));
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
  if (opts?.dateFrom) conditions.push(gte(penalties.penaltyDate, new Date(opts.dateFrom + 'T00:00:00')));
  if (opts?.dateTo) conditions.push(lte(penalties.penaltyDate, new Date(opts.dateTo + 'T00:00:00')));

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
  await db.insert(penalties).values(data);
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

  // Get all daily logs for this driver in this week
  const logs = await db
    .select()
    .from(dailyLogs)
    .where(
      and(
        eq(dailyLogs.driverId, driverId),
        sql`${dailyLogs.logDate} >= ${weekStart}`,
        sql`${dailyLogs.logDate} <= ${weekEnd}`
      )
    );

  // Get penalties for this driver in this week
  const penaltyRows = await db
    .select()
    .from(penalties)
    .where(
      and(
        eq(penalties.driverId, driverId),
        gte(penalties.penaltyDate, new Date(weekStart + 'T00:00:00')),
        lte(penalties.penaltyDate, new Date(weekEnd + 'T00:00:00'))
      )
    );

  const totalPackages = logs.reduce((s, l) => s + l.totalPackages, 0);
  const totalDelivered = logs.reduce((s, l) => s + l.packagesDelivered, 0);
  const totalDoubles = logs.reduce((s, l) => s + l.doublesReturns, 0);
  const grossPay = logs.reduce((s, l) => s + parseFloat(String(l.grossPay ?? "0")), 0);
  const totalPenalties = penaltyRows.reduce((s, p) => s + parseFloat(String(p.amount ?? "0")), 0);
  const totalPay = Math.max(0, grossPay - totalPenalties);

  // Check if stub already exists for this driver+week
  const existing = await db
    .select()
    .from(payStubs)
    .where(
      and(
        eq(payStubs.driverId, driverId),
        eq(payStubs.weekStart, new Date(weekStart + 'T00:00:00')),
        eq(payStubs.weekEnd, new Date(weekEnd + 'T00:00:00'))
      )
    )
    .limit(1);

  if (existing.length > 0) {
    // Update existing
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

    // Link penalties to this stub
    if (penaltyRows.length > 0) {
      await db.update(penalties).set({ payStubId: existing[0].id }).where(
        and(
          eq(penalties.driverId, driverId),
          gte(penalties.penaltyDate, new Date(weekStart + 'T00:00:00')),
          lte(penalties.penaltyDate, new Date(weekEnd + 'T00:00:00'))
        )
      );
    }

    return { id: existing[0].id, totalPay };
  }

  // Insert new
  await db.insert(payStubs).values({
    driverId,
    weekStart: new Date(weekStart + 'T00:00:00'),
    weekEnd: new Date(weekEnd + 'T00:00:00'),
    totalPackages,
    totalDelivered,
    totalDoubles,
    grossPay: grossPay.toFixed(2),
    totalPenalties: totalPenalties.toFixed(2),
    totalPay: totalPay.toFixed(2),
    status: "draft",
  });

  const inserted = await db
    .select()
    .from(payStubs)
    .where(
      and(
        eq(payStubs.driverId, driverId),
        eq(payStubs.weekStart, new Date(weekStart + 'T00:00:00')),
        eq(payStubs.weekEnd, new Date(weekEnd + 'T00:00:00'))
      )
    )
    .limit(1);

  if (inserted.length > 0 && penaltyRows.length > 0) {
    await db.update(penalties).set({ payStubId: inserted[0].id }).where(
      and(
        eq(penalties.driverId, driverId),
        gte(penalties.penaltyDate, new Date(weekStart + 'T00:00:00')),
        lte(penalties.penaltyDate, new Date(weekEnd + 'T00:00:00'))
      )
    );
  }

  return { id: inserted[0]?.id ?? 0, totalPay };
}

export async function updatePayStubStatus(
  id: number,
  status: "draft" | "sent" | "approved" | "disputed",
  driverNotes?: string
) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.update(payStubs).set({
    status,
    ...(driverNotes !== undefined ? { driverNotes } : {}),
    updatedAt: new Date(),
  }).where(eq(payStubs.id, id));
}

// ─── Reports ────────────────────────────────────────────────────────────────

export async function weeklyReport(weekStart: string, weekEnd: string) {
  const db = await getDb();
  if (!db) return [];

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
        gte(dailyLogs.logDate, new Date(weekStart + 'T00:00:00')),
        lte(dailyLogs.logDate, new Date(weekEnd + 'T00:00:00'))
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
    .where(and(gte(dailyLogs.logDate, new Date(yearStart + 'T00:00:00')), lte(dailyLogs.logDate, new Date(yearEnd + 'T00:00:00'))))
    .groupBy(dailyLogs.driverId);

  return Promise.all(logRows.map(async (r) => {
    const driver = await getDriverById(r.driverId);
    const penaltyRows = await db!
      .select({ total: sql<number>`SUM(${penalties.amount})` })
      .from(penalties)
      .where(
        and(
          eq(penalties.driverId, r.driverId),
          gte(penalties.penaltyDate, new Date(yearStart + 'T00:00:00')),
          lte(penalties.penaltyDate, new Date(yearEnd + 'T00:00:00'))
        )
      );

    const totalPenalties = parseFloat(String(penaltyRows[0]?.total ?? "0")) || 0;
    const grossPay = parseFloat(String(r.grossPay ?? "0"));
    const totalPay = Math.max(0, grossPay - totalPenalties);

    return {
      ...r,
      driverCode: driver?.driverCode,
      driverFirstName: driver?.firstName,
      driverLastName: driver?.lastName,
      ssnLast4: driver?.ssnLast4,
      totalPenalties,
      totalPay,
    };
  }));
}
