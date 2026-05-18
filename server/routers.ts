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
  createPenalty,
  createRoute,
  deleteDailyLog,
  deleteDriver,
  deletePenalty,
  deleteRoute,
  generatePayStub,
  getDriverByUserId,
  getPayStubById,
  getUserByOpenId,
  listDailyLogs,
  listDrivers,
  listPayStubs,
  listPenalties,
  listRoutes,
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

    create: adminProcedure
      .input(z.object({
        driverCode: z.string().min(1).max(32),
        firstName: z.string().min(1).max(100),
        lastName: z.string().min(1).max(100),
        phone: z.string().optional(),
        email: z.string().optional(),
        address: z.string().optional(),
        ssnLast4: z.string().max(4).optional(),
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
          logDate: input.logDate as unknown as Date,
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
        // Recalculate grossPay if delivered or doubles changed
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
          ...input,
          penaltyDate: input.penaltyDate as unknown as Date,
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
      // Only return sent/approved/disputed stubs to drivers
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

    send: adminProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        await updatePayStubStatus(input.id, "sent");
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
        const driver = await import("./db").then(m => m.getDriverById(input.driverId));
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
  <title>Pay Stub - ${driver?.firstName} ${driver?.lastName}</title>
  <style>
    body { font-family: Arial, sans-serif; max-width: 700px; margin: 40px auto; padding: 20px; color: #1a1a2e; }
    .header { background: #1a237e; color: white; padding: 24px; border-radius: 8px; margin-bottom: 24px; }
    .header h1 { margin: 0; font-size: 22px; }
    .header p { margin: 4px 0 0; opacity: 0.8; font-size: 13px; }
    .section { background: #f8f9fa; border-radius: 8px; padding: 16px; margin-bottom: 16px; }
    .section h2 { margin: 0 0 12px; font-size: 14px; text-transform: uppercase; letter-spacing: 0.05em; color: #555; }
    .row { display: flex; justify-content: space-between; padding: 6px 0; border-bottom: 1px solid #e0e0e0; font-size: 14px; }
    .row:last-child { border-bottom: none; }
    .total-row { display: flex; justify-content: space-between; padding: 10px 0; font-size: 18px; font-weight: bold; border-top: 2px solid #1a237e; margin-top: 8px; }
    .penalty { color: #c62828; }
    .gross { color: #2e7d32; }
    .badge { display: inline-block; padding: 4px 10px; border-radius: 20px; font-size: 12px; font-weight: bold; background: #e8f5e9; color: #2e7d32; }
    .footer { text-align: center; font-size: 11px; color: #999; margin-top: 32px; }
  </style>
</head>
<body>
  <div class="header">
    <h1>Rivera M Trucking Inc.</h1>
    <p>Driver Pay Stub — Weekly Payment Summary</p>
  </div>

  <div class="section">
    <h2>Driver Information</h2>
    <div class="row"><span>Name</span><span><strong>${driver?.firstName} ${driver?.lastName}</strong></span></div>
    <div class="row"><span>Driver ID</span><span>${driver?.driverCode}</span></div>
    <div class="row"><span>Pay Period</span><span>${stub.weekStart} — ${stub.weekEnd}</span></div>
    <div class="row"><span>Status</span><span><span class="badge">${stub.status.toUpperCase()}</span></span></div>
  </div>

  <div class="section">
    <h2>Activity Summary</h2>
    <div class="row"><span>Total Packages</span><span>${stub.totalPackages}</span></div>
    <div class="row"><span>Packages Delivered</span><span class="gross">${stub.totalDelivered}</span></div>
    <div class="row"><span>Double / Returns</span><span>${stub.totalDoubles}</span></div>
  </div>

  <div class="section">
    <h2>Payment Breakdown</h2>
    <div class="row"><span>Gross Pay</span><span class="gross">${formatCurrency(stub.grossPay)}</span></div>
    <div class="row"><span>Penalties / Deductions</span><span class="penalty">-${formatCurrency(stub.totalPenalties)}</span></div>
    <div class="total-row"><span>NET PAY</span><span>${formatCurrency(stub.totalPay)}</span></div>
  </div>

  ${stub.driverNotes ? `<div class="section"><h2>Driver Notes</h2><p style="font-size:14px;margin:0;">${stub.driverNotes}</p></div>` : ""}

  <div class="footer">
    <p>Rivera M Trucking Inc. &nbsp;|&nbsp; Generated on ${new Date().toLocaleDateString("en-US")}</p>
    <p>This document is for informational purposes only.</p>
  </div>
</body>
</html>`;
}

function generate1099Html(driver: any, report: any, year: number): string {
  const totalPay = parseFloat(String(report?.totalPay ?? "0"));
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>1099-NEC ${year} - ${driver.firstName} ${driver.lastName}</title>
  <style>
    body { font-family: Arial, sans-serif; max-width: 700px; margin: 40px auto; padding: 20px; color: #1a1a2e; }
    .header { background: #1a237e; color: white; padding: 24px; border-radius: 8px; margin-bottom: 24px; }
    .header h1 { margin: 0; font-size: 22px; }
    .header p { margin: 4px 0 0; opacity: 0.8; font-size: 13px; }
    .form-box { border: 2px solid #1a237e; border-radius: 8px; padding: 20px; margin-bottom: 20px; }
    .form-title { font-size: 20px; font-weight: bold; color: #1a237e; margin-bottom: 16px; }
    .field { margin-bottom: 12px; }
    .field label { display: block; font-size: 11px; text-transform: uppercase; color: #666; margin-bottom: 2px; }
    .field .value { font-size: 16px; font-weight: bold; border-bottom: 1px solid #ccc; padding-bottom: 4px; }
    .amount { font-size: 28px; color: #2e7d32; font-weight: bold; }
    .disclaimer { background: #fff8e1; border: 1px solid #f9a825; border-radius: 8px; padding: 16px; font-size: 12px; color: #555; }
    .footer { text-align: center; font-size: 11px; color: #999; margin-top: 32px; }
  </style>
</head>
<body>
  <div class="header">
    <h1>Rivera M Trucking Inc.</h1>
    <p>Payer: Rivera M Trucking Inc.</p>
  </div>

  <div class="form-box">
    <div class="form-title">Form 1099-NEC — Nonemployee Compensation — Tax Year ${year}</div>

    <div class="field">
      <label>Payer's Name</label>
      <div class="value">Rivera M Trucking Inc.</div>
    </div>
    <div class="field">
      <label>Recipient's Name</label>
      <div class="value">${driver.firstName} ${driver.lastName}</div>
    </div>
    <div class="field">
      <label>Driver ID</label>
      <div class="value">${driver.driverCode}</div>
    </div>
    ${driver.address ? `<div class="field"><label>Address</label><div class="value">${driver.address}</div></div>` : ""}
    ${driver.ssnLast4 ? `<div class="field"><label>SSN (last 4)</label><div class="value">XXX-XX-${driver.ssnLast4}</div></div>` : ""}
    <div class="field">
      <label>Box 1 — Nonemployee Compensation</label>
      <div class="value amount">${formatCurrency(totalPay)}</div>
    </div>
  </div>

  <div class="disclaimer">
    <strong>Important:</strong> This document summarizes nonemployee compensation paid during tax year ${year}. 
    The recipient is responsible for reporting this income on their federal and state tax returns. 
    Please consult a tax professional for guidance on self-employment taxes.
  </div>

  <div class="footer">
    <p>Rivera M Trucking Inc. &nbsp;|&nbsp; Generated on ${new Date().toLocaleDateString("en-US")}</p>
    <p>This is a summary document. Official IRS forms must be filed separately.</p>
  </div>
</body>
</html>`;
}
