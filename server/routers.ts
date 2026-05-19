import { TRPCError } from "@trpc/server";
import { z } from "zod/v4";
import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { protectedProcedure, publicProcedure, router } from "./_core/trpc";
import {
  annualReport,
  createDailyLog,
  createDriver,
  createDriverPhoto,
  createPenalty,
  createRoute,
  deleteDailyLog,
  deleteDriver,
  deleteDriverPhoto,
  deletePenalty,
  deleteRoute,
  generatePayStub,
  generatePayStubsForAll,
  getDriverById,
  getDriverByUserId,
  getPayStubById,
  getUserByOpenId,
  listDailyLogs,
  listDriverPhotos,
  listDrivers,
  listPayStubs,
  listPenalties,
  listRoutes,
  sendPayStubsToAll,
  updateDailyLog,
  updateDriver,
  updatePayStubStatus,
  updateRoute,
  weeklyReport,
} from "./db";

const adminProcedure = protectedProcedure.use(({ ctx, next }) => {
  if (ctx.user.role !== "admin") {
    throw new TRPCError({ code: "FORBIDDEN", message: "Solo administradores pueden realizar esta acción" });
  }
  return next({ ctx });
});

export const appRouter = router({
  system: systemRouter,

  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),
  }),

  // ─── Drivers ──────────────────────────────────────────────────────────────
  drivers: router({
    list: protectedProcedure.query(() => listDrivers()),

    get: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input }) => {
        const driver = await getDriverById(input.id);
        if (!driver) throw new TRPCError({ code: "NOT_FOUND" });
        return driver;
      }),

    myProfile: protectedProcedure.query(async ({ ctx }) => {
      const driver = await getDriverByUserId(ctx.user.id);
      return driver ?? null;
    }),

    create: adminProcedure
      .input(z.object({
        driverCode: z.string().min(1).max(32),
        firstName: z.string().min(1).max(100),
        lastName: z.string().min(1).max(100),
        phone: z.string().optional(),
        email: z.string().optional(),
        address: z.string().optional(),
        ssnLast4: z.string().max(4).optional(),
        password: z.string().optional(),
        status: z.enum(["active", "inactive"]),
      }))
      .mutation(async ({ input }) => {
        await createDriver(input);
        return { success: true };
      }),

    update: adminProcedure
      .input(z.object({
        id: z.number(),
        driverCode: z.string().min(1).max(32).optional(),
        firstName: z.string().min(1).max(100).optional(),
        lastName: z.string().min(1).max(100).optional(),
        phone: z.string().optional(),
        email: z.string().optional(),
        address: z.string().optional(),
        ssnLast4: z.string().max(4).optional(),
        password: z.string().optional(),
        status: z.enum(["active", "inactive"]).optional(),
      }))
      .mutation(async ({ input }) => {
        const { id, ...data } = input;
        await updateDriver(id, data);
        return { success: true };
      }),

    delete: adminProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        await deleteDriver(input.id);
        return { success: true };
      }),

    // Photos
    photos: protectedProcedure
      .input(z.object({ driverId: z.number() }))
      .query(({ input }) => listDriverPhotos(input.driverId)),

    myPhotos: protectedProcedure.query(async ({ ctx }) => {
      const driver = await getDriverByUserId(ctx.user.id);
      if (!driver) return [];
      return listDriverPhotos(driver.id);
    }),

    addPhoto: protectedProcedure
      .input(z.object({
        driverId: z.number(),
        photoUrl: z.string().url(),
        caption: z.string().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        // Driver can only add photos for themselves; admin can add for anyone
        if (ctx.user.role !== "admin") {
          const driver = await getDriverByUserId(ctx.user.id);
          if (!driver || driver.id !== input.driverId) {
            throw new TRPCError({ code: "FORBIDDEN" });
          }
        }
        await createDriverPhoto(input);
        return { success: true };
      }),

    deletePhoto: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        await deleteDriverPhoto(input.id);
        return { success: true };
      }),
  }),

  // ─── Routes ───────────────────────────────────────────────────────────────
  routes: router({
    list: protectedProcedure.query(() => listRoutes()),

    create: adminProcedure
      .input(z.object({
        routeNumber: z.string().min(1).max(32),
        zone: z.string().optional(),
        description: z.string().optional(),
        ratePerPackage: z.string(),
        ratePerDouble: z.string(),
        status: z.enum(["active", "inactive"]),
      }))
      .mutation(async ({ input }) => {
        await createRoute(input);
        return { success: true };
      }),

    update: adminProcedure
      .input(z.object({
        id: z.number(),
        routeNumber: z.string().min(1).max(32).optional(),
        zone: z.string().optional(),
        description: z.string().optional(),
        ratePerPackage: z.string().optional(),
        ratePerDouble: z.string().optional(),
        status: z.enum(["active", "inactive"]).optional(),
      }))
      .mutation(async ({ input }) => {
        const { id, ...data } = input;
        await updateRoute(id, data);
        return { success: true };
      }),

    delete: adminProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        await deleteRoute(input.id);
        return { success: true };
      }),
  }),

  // ─── Daily Logs ───────────────────────────────────────────────────────────
  dailyLogs: router({
    list: adminProcedure
      .input(z.object({
        driverId: z.number().optional(),
        dateFrom: z.string().optional(),
        dateTo: z.string().optional(),
      }).optional())
      .query(({ input }) => listDailyLogs(input ?? {})),

    myLogs: protectedProcedure.query(async ({ ctx }) => {
      const driver = await getDriverByUserId(ctx.user.id);
      if (!driver) return [];
      return listDailyLogs({ driverId: driver.id });
    }),

    create: adminProcedure
      .input(z.object({
        driverId: z.number(),
        routeId: z.number(),
        logDate: z.string(),
        totalPackages: z.number().min(0),
        packagesDelivered: z.number().min(0),
        doublesReturns: z.number().min(0).default(0),
        notes: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        const routes = await listRoutes();
        const route = routes.find(r => r.id === input.routeId);
        if (!route) throw new TRPCError({ code: "NOT_FOUND", message: "Ruta no encontrada" });

        const ratePerPackage = parseFloat(route.ratePerPackage);
        const ratePerDouble = parseFloat(route.ratePerDouble);
        const grossPay = (input.packagesDelivered * ratePerPackage) + (input.doublesReturns * ratePerDouble);

        await createDailyLog({
          ...input,
          logDate: input.logDate as any,
          ratePerPackageSnapshot: route.ratePerPackage,
          ratePerDoubleSnapshot: route.ratePerDouble,
          grossPay: grossPay.toFixed(2),
        });
        return { success: true };
      }),

    update: adminProcedure
      .input(z.object({
        id: z.number(),
        totalPackages: z.number().min(0).optional(),
        packagesDelivered: z.number().min(0).optional(),
        doublesReturns: z.number().min(0).optional(),
        notes: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        const { id, ...data } = input;
        if (data.packagesDelivered !== undefined || data.doublesReturns !== undefined) {
          const logs = await listDailyLogs();
          const existing = logs.find(l => l.log.id === id);
          if (existing) {
            const delivered = data.packagesDelivered ?? existing.log.packagesDelivered;
            const doubles = data.doublesReturns ?? existing.log.doublesReturns;
            const ratePerPackage = parseFloat(String(existing.log.ratePerPackageSnapshot));
            const ratePerDouble = parseFloat(String(existing.log.ratePerDoubleSnapshot));
            const grossPay = (delivered * ratePerPackage) + (doubles * ratePerDouble);
            await updateDailyLog(id, { ...data, grossPay: grossPay.toFixed(2) });
            return { success: true };
          }
        }
        await updateDailyLog(id, data);
        return { success: true };
      }),

    delete: adminProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        await deleteDailyLog(input.id);
        return { success: true };
      }),
  }),

  // ─── Penalties ────────────────────────────────────────────────────────────
  penalties: router({
    list: adminProcedure
      .input(z.object({
        driverId: z.number().optional(),
        dateFrom: z.string().optional(),
        dateTo: z.string().optional(),
      }).optional())
      .query(({ input }) => listPenalties(input ?? {})),

    create: adminProcedure
      .input(z.object({
        driverId: z.number(),
        description: z.string().min(1),
        amount: z.string(),
        penaltyDate: z.string(),
      }))
      .mutation(async ({ input }) => {
        await createPenalty({
          driverId: input.driverId,
          description: input.description,
          amount: input.amount,
          penaltyDate: input.penaltyDate as any,
        });
        return { success: true };
      }),

    delete: adminProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        await deletePenalty(input.id);
        return { success: true };
      }),
  }),

  // ─── Pay Stubs ────────────────────────────────────────────────────────────
  payStubs: router({
    list: adminProcedure
      .input(z.object({
        driverId: z.number().optional(),
        status: z.string().optional(),
      }).optional())
      .query(({ input }) => listPayStubs(input ?? {})),

    myStubs: protectedProcedure.query(async ({ ctx }) => {
      const driver = await getDriverByUserId(ctx.user.id);
      if (!driver) return [];
      const stubs = await listPayStubs({ driverId: driver.id });
      return stubs
        .filter(s => s.stub.status !== "draft")
        .map(s => s.stub);
    }),

    generate: adminProcedure
      .input(z.object({
        driverId: z.number(),
        weekStart: z.string(),
        weekEnd: z.string(),
      }))
      .mutation(async ({ input }) => {
        const result = await generatePayStub(input.driverId, input.weekStart, input.weekEnd);
        return result;
      }),

    generateAll: adminProcedure
      .input(z.object({ weekStart: z.string(), weekEnd: z.string() }))
      .mutation(async ({ input }) => {
        const results = await generatePayStubsForAll(input.weekStart, input.weekEnd);
        return results;
      }),

    send: adminProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        await updatePayStubStatus(input.id, "sent");
        return { success: true };
      }),

    sendAll: adminProcedure
      .input(z.object({ weekStart: z.string(), weekEnd: z.string() }))
      .mutation(async ({ input }) => {
        await sendPayStubsToAll(input.weekStart, input.weekEnd);
        return { success: true };
      }),

    markPaid: adminProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        await updatePayStubStatus(input.id, "paid");
        return { success: true };
      }),

    approve: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input, ctx }) => {
        const stub = await getPayStubById(input.id);
        if (!stub) throw new TRPCError({ code: "NOT_FOUND" });
        const driver = await getDriverByUserId(ctx.user.id);
        if (!driver || driver.id !== stub.driverId) {
          throw new TRPCError({ code: "FORBIDDEN" });
        }
        await updatePayStubStatus(input.id, "approved");
        return { success: true };
      }),

    dispute: protectedProcedure
      .input(z.object({ id: z.number(), note: z.string().min(1) }))
      .mutation(async ({ input, ctx }) => {
        const stub = await getPayStubById(input.id);
        if (!stub) throw new TRPCError({ code: "NOT_FOUND" });
        const driver = await getDriverByUserId(ctx.user.id);
        if (!driver || driver.id !== stub.driverId) {
          throw new TRPCError({ code: "FORBIDDEN" });
        }
        await updatePayStubStatus(input.id, "disputed", input.note);
        return { success: true };
      }),
  }),

  // ─── Reports ──────────────────────────────────────────────────────────────
  reports: router({
    weekly: adminProcedure
      .input(z.object({ weekStart: z.string(), weekEnd: z.string() }))
      .query(({ input }) => weeklyReport(input.weekStart, input.weekEnd)),

    annual: adminProcedure
      .input(z.object({ year: z.number() }))
      .query(({ input }) => annualReport(input.year)),

    dailyLogs: adminProcedure
      .input(z.object({
        driverId: z.number().optional(),
        dateFrom: z.string().optional(),
        dateTo: z.string().optional(),
      }).optional())
      .query(({ input }) => listDailyLogs(input ?? {})),

    penalties: adminProcedure
      .input(z.object({
        driverId: z.number().optional(),
        dateFrom: z.string().optional(),
        dateTo: z.string().optional(),
      }).optional())
      .query(({ input }) => listPenalties(input ?? {})),
  }),

  // ─── Exports ──────────────────────────────────────────────────────────────
  exports: router({
    payStubPdf: adminProcedure
      .input(z.object({ stubId: z.number() }))
      .mutation(async ({ input }) => {
        const stubs = await listPayStubs();
        const found = stubs.find(s => s.stub.id === input.stubId);
        if (!found) throw new TRPCError({ code: "NOT_FOUND" });

        const { stub, driver } = found;
        const html = generatePayStubHtml(stub, driver);
        const { storagePut } = await import("./storage");
        const key = `pay-stubs/stub-${stub.id}-${Date.now()}.html`;
        const { url } = await storagePut(key, html, "text/html");

        return {
          url,
          filename: `PayStub_${driver?.firstName}_${driver?.lastName}_${stub.weekStart}.html`,
        };
      }),

    form1099: adminProcedure
      .input(z.object({ driverId: z.number(), year: z.number() }))
      .mutation(async ({ input }) => {
        const driver = await getDriverById(input.driverId);
        if (!driver) throw new TRPCError({ code: "NOT_FOUND" });

        const report = await annualReport(input.year);
        const driverReport = report.find(r => r.driverCode === driver.driverCode);

        const html = generate1099Html(driver, driverReport, input.year);
        const { storagePut } = await import("./storage");
        const key = `1099/form1099-${driver.driverCode}-${input.year}-${Date.now()}.html`;
        const { url } = await storagePut(key, html, "text/html");

        return {
          url,
          filename: `1099-NEC_${driver.firstName}_${driver.lastName}_${input.year}.html`,
        };
      }),
  }),
});

export type AppRouter = typeof appRouter;

// ─── HTML Generators ──────────────────────────────────────────────────────

function formatCurrency(val: number | string | null | undefined): string {
  const n = typeof val === "string" ? parseFloat(val) : (val ?? 0);
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(n);
}

function generatePayStubHtml(stub: any, driver: any): string {
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Pay Stub</title>
  <style>
    body { font-family: Arial, sans-serif; max-width: 800px; margin: 40px auto; padding: 20px; }
    h1 { color: #1a1a2e; border-bottom: 2px solid #1a1a2e; padding-bottom: 10px; }
    .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin: 20px 0; }
    .info-box { background: #f5f5f5; padding: 15px; border-radius: 8px; }
    .label { font-size: 12px; color: #666; text-transform: uppercase; }
    .value { font-size: 18px; font-weight: bold; color: #1a1a2e; }
    .total { background: #1a1a2e; color: white; padding: 20px; border-radius: 8px; text-align: center; margin-top: 20px; }
    .total .value { color: white; font-size: 28px; }
    .status { display: inline-block; padding: 4px 12px; border-radius: 20px; font-size: 12px; font-weight: bold; background: #e8f5e9; color: #2e7d32; }
  </style>
</head>
<body>
  <h1>Rivera M Trucking — Pay Stub</h1>
  <div class="info-grid">
    <div class="info-box">
      <div class="label">Driver</div>
      <div class="value">${driver?.firstName ?? ""} ${driver?.lastName ?? ""}</div>
    </div>
    <div class="info-box">
      <div class="label">ID/DVR</div>
      <div class="value">${driver?.driverCode ?? ""}</div>
    </div>
    <div class="info-box">
      <div class="label">Week</div>
      <div class="value">${stub.weekStart} – ${stub.weekEnd}</div>
    </div>
    <div class="info-box">
      <div class="label">Status</div>
      <div class="value"><span class="status">${stub.status}</span></div>
    </div>
    <div class="info-box">
      <div class="label">Total Packages</div>
      <div class="value">${stub.totalPackages}</div>
    </div>
    <div class="info-box">
      <div class="label">Delivered</div>
      <div class="value">${stub.totalDelivered}</div>
    </div>
    <div class="info-box">
      <div class="label">Gross Pay</div>
      <div class="value">${formatCurrency(stub.grossPay)}</div>
    </div>
    <div class="info-box">
      <div class="label">Penalties</div>
      <div class="value" style="color:#c62828">${formatCurrency(stub.totalPenalties)}</div>
    </div>
  </div>
  <div class="total">
    <div class="label" style="color:#ccc">NET PAY</div>
    <div class="value">${formatCurrency(stub.totalPay)}</div>
  </div>
  ${stub.driverNotes ? `<div class="info-box" style="margin-top:20px"><div class="label">Driver Notes</div><div>${stub.driverNotes}</div></div>` : ""}
  <p style="color:#999;font-size:12px;margin-top:30px">Generated on ${new Date().toLocaleDateString()}</p>
</body>
</html>`;
}

function generate1099Html(driver: any, report: any, year: number): string {
  const grossPay = parseFloat(String(report?.grossPay ?? "0"));
  const totalPenalties = parseFloat(String(report?.totalPenalties ?? "0"));
  const netPay = Math.max(0, grossPay - totalPenalties);

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Form 1099-NEC ${year}</title>
  <style>
    body { font-family: Arial, sans-serif; max-width: 800px; margin: 40px auto; padding: 20px; }
    h1 { color: #1a1a2e; }
    .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin: 20px 0; }
    .box { border: 1px solid #ccc; padding: 12px; border-radius: 4px; }
    .label { font-size: 11px; color: #666; text-transform: uppercase; margin-bottom: 4px; }
    .value { font-size: 16px; font-weight: bold; }
    .total-box { background: #1a1a2e; color: white; padding: 20px; border-radius: 8px; text-align: center; }
  </style>
</head>
<body>
  <h1>Form 1099-NEC — Tax Year ${year}</h1>
  <p><strong>Rivera M Trucking</strong></p>
  <div class="grid">
    <div class="box"><div class="label">Driver Name</div><div class="value">${driver.firstName} ${driver.lastName}</div></div>
    <div class="box"><div class="label">ID/DVR</div><div class="value">${driver.driverCode}</div></div>
    <div class="box"><div class="label">SSN (last 4)</div><div class="value">***-**-${driver.ssnLast4 ?? "XXXX"}</div></div>
    <div class="box"><div class="label">Tax Year</div><div class="value">${year}</div></div>
    <div class="box"><div class="label">Gross Pay</div><div class="value">${formatCurrency(grossPay)}</div></div>
    <div class="box"><div class="label">Total Penalties</div><div class="value" style="color:#c62828">${formatCurrency(totalPenalties)}</div></div>
  </div>
  <div class="total-box">
    <div class="label" style="color:#ccc">Box 1 — Nonemployee Compensation</div>
    <div class="value" style="font-size:28px">${formatCurrency(netPay)}</div>
  </div>
  <p style="color:#999;font-size:12px;margin-top:30px">This is not an official IRS form. Generated on ${new Date().toLocaleDateString()}</p>
</body>
</html>`;
}
