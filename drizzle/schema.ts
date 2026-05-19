import {
  decimal,
  integer,
  pgEnum,
  pgTable,
  text,
  timestamp,
  varchar,
  date,
  serial,
  boolean,
} from "drizzle-orm/pg-core";

export const userRoleEnum = pgEnum("user_role", ["user", "admin"]);
export const driverStatusEnum = pgEnum("driver_status", ["active", "inactive"]);
export const routeStatusEnum = pgEnum("route_status", ["active", "inactive"]);
export const payStubStatusEnum = pgEnum("pay_stub_status", ["draft", "sent", "approved", "disputed", "paid"]);

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: userRoleEnum("role").default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

// Drivers table
export const drivers = pgTable("drivers", {
  id: serial("id").primaryKey(),
  driverCode: varchar("driverCode", { length: 32 }).notNull().unique(),
  firstName: varchar("firstName", { length: 100 }).notNull(),
  lastName: varchar("lastName", { length: 100 }).notNull(),
  phone: varchar("phone", { length: 32 }),
  email: varchar("email", { length: 320 }),
  address: text("address"),
  ssnLast4: varchar("ssnLast4", { length: 4 }),
  password: varchar("password", { length: 255 }),
  status: driverStatusEnum("status").default("active").notNull(),
  userId: integer("userId"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});

export type Driver = typeof drivers.$inferSelect;
export type InsertDriver = typeof drivers.$inferInsert;

// Routes table with configurable rates
export const routes = pgTable("routes", {
  id: serial("id").primaryKey(),
  routeNumber: varchar("routeNumber", { length: 32 }).notNull().unique(),
  zone: varchar("zone", { length: 100 }),
  description: text("description"),
  ratePerPackage: decimal("ratePerPackage", { precision: 10, scale: 2 }).notNull().default("2.00"),
  ratePerDouble: decimal("ratePerDouble", { precision: 10, scale: 2 }).notNull().default("0.80"),
  status: routeStatusEnum("status").default("active").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});

export type Route = typeof routes.$inferSelect;
export type InsertRoute = typeof routes.$inferInsert;

// Daily activity logs
export const dailyLogs = pgTable("dailyLogs", {
  id: serial("id").primaryKey(),
  driverId: integer("driverId").notNull(),
  routeId: integer("routeId").notNull(),
  logDate: date("logDate").notNull(),
  totalPackages: integer("totalPackages").notNull().default(0),
  packagesDelivered: integer("packagesDelivered").notNull().default(0),
  doublesReturns: integer("doublesReturns").notNull().default(0),
  ratePerPackageSnapshot: decimal("ratePerPackageSnapshot", { precision: 10, scale: 2 }).notNull(),
  ratePerDoubleSnapshot: decimal("ratePerDoubleSnapshot", { precision: 10, scale: 2 }).notNull(),
  grossPay: decimal("grossPay", { precision: 10, scale: 2 }).notNull().default("0.00"),
  notes: text("notes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});

export type DailyLog = typeof dailyLogs.$inferSelect;
export type InsertDailyLog = typeof dailyLogs.$inferInsert;

// Penalties / fines
export const penalties = pgTable("penalties", {
  id: serial("id").primaryKey(),
  driverId: integer("driverId").notNull(),
  description: text("description").notNull(),
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  penaltyDate: date("penaltyDate").notNull(),
  payStubId: integer("payStubId"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Penalty = typeof penalties.$inferSelect;
export type InsertPenalty = typeof penalties.$inferInsert;

// Weekly pay stubs
export const payStubs = pgTable("payStubs", {
  id: serial("id").primaryKey(),
  driverId: integer("driverId").notNull(),
  weekStart: date("weekStart").notNull(),
  weekEnd: date("weekEnd").notNull(),
  totalPackages: integer("totalPackages").notNull().default(0),
  totalDelivered: integer("totalDelivered").notNull().default(0),
  totalDoubles: integer("totalDoubles").notNull().default(0),
  grossPay: decimal("grossPay", { precision: 10, scale: 2 }).notNull().default("0.00"),
  totalPenalties: decimal("totalPenalties", { precision: 10, scale: 2 }).notNull().default("0.00"),
  totalPay: decimal("totalPay", { precision: 10, scale: 2 }).notNull().default("0.00"),
  status: payStubStatusEnum("status").default("draft").notNull(),
  driverNotes: text("driverNotes"),
  pdfUrl: text("pdfUrl"),
  paidAt: timestamp("paidAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});

export type PayStub = typeof payStubs.$inferSelect;
export type InsertPayStub = typeof payStubs.$inferInsert;

// Driver photos
export const driverPhotos = pgTable("driverPhotos", {
  id: serial("id").primaryKey(),
  driverId: integer("driverId").notNull(),
  photoUrl: text("photoUrl").notNull(),
  caption: text("caption"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type DriverPhoto = typeof driverPhotos.$inferSelect;
export type InsertDriverPhoto = typeof driverPhotos.$inferInsert;

// Local auth users (for demo login with email/password)
export const localAuth = pgTable("localAuth", {
  id: serial("id").primaryKey(),
  email: varchar("email", { length: 320 }).notNull().unique(),
  passwordHash: varchar("passwordHash", { length: 255 }).notNull(),
  role: userRoleEnum("role").default("user").notNull(),
  driverId: integer("driverId"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type LocalAuth = typeof localAuth.$inferSelect;
export type InsertLocalAuth = typeof localAuth.$inferInsert;
