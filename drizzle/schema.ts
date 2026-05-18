import {
  decimal,
  int,
  mysqlEnum,
  mysqlTable,
  text,
  timestamp,
  varchar,
  date,
} from "drizzle-orm/mysql-core";

export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

// Drivers table
export const drivers = mysqlTable("drivers", {
  id: int("id").autoincrement().primaryKey(),
  driverCode: varchar("driverCode", { length: 32 }).notNull().unique(),
  firstName: varchar("firstName", { length: 100 }).notNull(),
  lastName: varchar("lastName", { length: 100 }).notNull(),
  phone: varchar("phone", { length: 32 }),
  email: varchar("email", { length: 320 }),
  address: text("address"),
  ssnLast4: varchar("ssnLast4", { length: 4 }),
  status: mysqlEnum("status", ["active", "inactive"]).default("active").notNull(),
  userId: int("userId"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Driver = typeof drivers.$inferSelect;
export type InsertDriver = typeof drivers.$inferInsert;

// Routes table with configurable rates
export const routes = mysqlTable("routes", {
  id: int("id").autoincrement().primaryKey(),
  routeNumber: varchar("routeNumber", { length: 32 }).notNull().unique(),
  zone: varchar("zone", { length: 100 }),
  description: text("description"),
  ratePerPackage: decimal("ratePerPackage", { precision: 10, scale: 2 }).notNull().default("2.00"),
  ratePerDouble: decimal("ratePerDouble", { precision: 10, scale: 2 }).notNull().default("0.80"),
  status: mysqlEnum("status", ["active", "inactive"]).default("active").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Route = typeof routes.$inferSelect;
export type InsertRoute = typeof routes.$inferInsert;

// Daily activity logs
export const dailyLogs = mysqlTable("dailyLogs", {
  id: int("id").autoincrement().primaryKey(),
  driverId: int("driverId").notNull(),
  routeId: int("routeId").notNull(),
  logDate: date("logDate").notNull(),
  totalPackages: int("totalPackages").notNull().default(0),
  packagesDelivered: int("packagesDelivered").notNull().default(0),
  doublesReturns: int("doublesReturns").notNull().default(0),
  ratePerPackageSnapshot: decimal("ratePerPackageSnapshot", { precision: 10, scale: 2 }).notNull(),
  ratePerDoubleSnapshot: decimal("ratePerDoubleSnapshot", { precision: 10, scale: 2 }).notNull(),
  grossPay: decimal("grossPay", { precision: 10, scale: 2 }).notNull().default("0.00"),
  notes: text("notes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type DailyLog = typeof dailyLogs.$inferSelect;
export type InsertDailyLog = typeof dailyLogs.$inferInsert;

// Penalties / fines
export const penalties = mysqlTable("penalties", {
  id: int("id").autoincrement().primaryKey(),
  driverId: int("driverId").notNull(),
  description: text("description").notNull(),
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  penaltyDate: date("penaltyDate").notNull(),
  payStubId: int("payStubId"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Penalty = typeof penalties.$inferSelect;
export type InsertPenalty = typeof penalties.$inferInsert;

// Weekly pay stubs
export const payStubs = mysqlTable("payStubs", {
  id: int("id").autoincrement().primaryKey(),
  driverId: int("driverId").notNull(),
  weekStart: date("weekStart").notNull(),
  weekEnd: date("weekEnd").notNull(),
  totalPackages: int("totalPackages").notNull().default(0),
  totalDelivered: int("totalDelivered").notNull().default(0),
  totalDoubles: int("totalDoubles").notNull().default(0),
  grossPay: decimal("grossPay", { precision: 10, scale: 2 }).notNull().default("0.00"),
  totalPenalties: decimal("totalPenalties", { precision: 10, scale: 2 }).notNull().default("0.00"),
  totalPay: decimal("totalPay", { precision: 10, scale: 2 }).notNull().default("0.00"),
  status: mysqlEnum("status", ["draft", "sent", "approved", "disputed"]).default("draft").notNull(),
  driverNotes: text("driverNotes"),
  pdfUrl: text("pdfUrl"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type PayStub = typeof payStubs.$inferSelect;
export type InsertPayStub = typeof payStubs.$inferInsert;
