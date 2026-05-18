import { trpc } from "@/lib/trpc";
import { formatCurrency, formatDate, getWeekRange } from "@/lib/utils";
import { BarChart3, Calendar, Download, TrendingUp } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";

type ReportMode = "weekly" | "annual" | "logs" | "penalties";

export default function ReportsPage() {
  const [mode, setMode] = useState<ReportMode>("weekly");
  const currentYear = new Date().getFullYear();
  const [year, setYear] = useState(currentYear);
  const { weekStart: defaultWeekStart, weekEnd: defaultWeekEnd } = getWeekRange();
  const [weekStart, setWeekStart] = useState(defaultWeekStart);
  const [weekEnd, setWeekEnd] = useState(defaultWeekEnd);
  const [filterDriver, setFilterDriver] = useState<string>("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  const { data: drivers } = trpc.drivers.list.useQuery();

  const { data: weeklyData, isLoading: weeklyLoading } = trpc.reports.weekly.useQuery(
    { weekStart, weekEnd },
    { enabled: mode === "weekly" }
  );

  const { data: annualData, isLoading: annualLoading } = trpc.reports.annual.useQuery(
    { year },
    { enabled: mode === "annual" }
  );

  const { data: logsData, isLoading: logsLoading } = trpc.reports.dailyLogs.useQuery(
    {
      driverId: filterDriver !== "all" ? parseInt(filterDriver) : undefined,
      dateFrom: dateFrom || undefined,
      dateTo: dateTo || undefined,
    },
    { enabled: mode === "logs" }
  );

  const { data: penaltiesData, isLoading: penaltiesLoading } = trpc.reports.penalties.useQuery(
    {
      driverId: filterDriver !== "all" ? parseInt(filterDriver) : undefined,
      dateFrom: dateFrom || undefined,
      dateTo: dateTo || undefined,
    },
    { enabled: mode === "penalties" }
  );

  const isLoading = weeklyLoading || annualLoading || logsLoading || penaltiesLoading;

  // Chart data for annual
  const annualChartData = annualData?.map(r => ({
    name: `${r.driverFirstName} ${r.driverLastName?.charAt(0)}.`,
    "Pago Neto": parseFloat(String(r.totalPay ?? 0)),
    "Penalidades": parseFloat(String(r.totalPenalties ?? 0)),
  })) ?? [];

  const weeklyChartData = weeklyData?.map(r => ({
    name: `${r.driverFirstName} ${r.driverLastName?.charAt(0)}.`,
    "Pago Bruto": parseFloat(String(r.grossPay ?? 0)),
    "Paquetes": Number(r.totalDelivered ?? 0),
  })) ?? [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <BarChart3 className="h-6 w-6 text-primary" />
            Reportes
          </h1>
          <p className="text-muted-foreground text-sm mt-1">Análisis de pagos, rutas y penalidades</p>
        </div>
      </div>

      {/* Mode Tabs */}
      <div className="flex gap-2 flex-wrap">
        {[
          { key: "weekly", label: "Semanal" },
          { key: "annual", label: "Anual" },
          { key: "logs", label: "Actividad" },
          { key: "penalties", label: "Penalidades" },
        ].map(tab => (
          <button
            key={tab.key}
            onClick={() => setMode(tab.key as ReportMode)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              mode === tab.key
                ? "bg-primary text-primary-foreground shadow-sm"
                : "bg-card border border-border text-muted-foreground hover:text-foreground hover:border-primary/40"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Filters */}
      <div className="flex gap-3 flex-wrap items-center">
        {mode === "weekly" && (
          <>
            <div className="flex items-center gap-2">
              <label className="text-sm text-muted-foreground">Desde:</label>
              <Input type="date" value={weekStart} onChange={e => setWeekStart(e.target.value)} className="w-40" />
            </div>
            <div className="flex items-center gap-2">
              <label className="text-sm text-muted-foreground">Hasta:</label>
              <Input type="date" value={weekEnd} onChange={e => setWeekEnd(e.target.value)} className="w-40" />
            </div>
          </>
        )}
        {mode === "annual" && (
          <div className="flex items-center gap-2">
            <label className="text-sm text-muted-foreground">Año:</label>
            <Select value={year.toString()} onValueChange={v => setYear(parseInt(v))}>
              <SelectTrigger className="w-28">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {[currentYear, currentYear - 1, currentYear - 2].map(y => (
                  <SelectItem key={y} value={y.toString()}>{y}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
        {(mode === "logs" || mode === "penalties") && (
          <>
            <Select value={filterDriver} onValueChange={setFilterDriver}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Todos los drivers" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los drivers</SelectItem>
                {drivers?.map(d => (
                  <SelectItem key={d.id} value={d.id.toString()}>
                    {d.firstName} {d.lastName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className="w-40" placeholder="Desde" />
            <Input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} className="w-40" placeholder="Hasta" />
          </>
        )}
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="bg-card border border-border rounded-xl p-12 text-center">
          <div className="animate-spin h-8 w-8 border-2 border-primary border-t-transparent rounded-full mx-auto" />
          <p className="text-muted-foreground mt-3">Cargando reporte...</p>
        </div>
      ) : (
        <>
          {/* Weekly Report */}
          {mode === "weekly" && (
            <div className="space-y-4">
              {weeklyData && weeklyData.length > 0 && (
                <div className="bg-card border border-border rounded-xl p-4">
                  <h3 className="font-semibold text-foreground mb-4">Pago Bruto por Driver</h3>
                  <ResponsiveContainer width="100%" height={250}>
                    <BarChart data={weeklyChartData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                      <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                      <YAxis tick={{ fontSize: 12 }} />
                      <Tooltip formatter={(v: number) => formatCurrency(v)} />
                      <Bar dataKey="Pago Bruto" fill="var(--color-primary)" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
              <div className="bg-card border border-border rounded-xl overflow-hidden">
                <div className="px-5 py-4 border-b border-border">
                  <h3 className="font-semibold text-foreground">Detalle Semanal</h3>
                  <p className="text-xs text-muted-foreground">{weekStart} — {weekEnd}</p>
                </div>
                {!weeklyData || weeklyData.length === 0 ? (
                  <div className="p-10 text-center text-muted-foreground">Sin datos para este período</div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-border bg-muted/40">
                          <th className="text-left px-5 py-3 font-medium text-muted-foreground">Driver</th>
                          <th className="text-right px-4 py-3 font-medium text-muted-foreground">Pkgs</th>
                          <th className="text-right px-4 py-3 font-medium text-muted-foreground">Entregados</th>
                          <th className="text-right px-4 py-3 font-medium text-muted-foreground">Doubles</th>
                          <th className="text-right px-5 py-3 font-medium text-muted-foreground">Pago Bruto</th>
                        </tr>
                      </thead>
                      <tbody>
                        {weeklyData.map((r, i) => (
                          <tr key={i} className="border-b border-border/50 hover:bg-muted/20">
                            <td className="px-5 py-3 font-medium">{r.driverFirstName} {r.driverLastName} <span className="text-xs text-muted-foreground">({r.driverCode})</span></td>
                            <td className="text-right px-4 py-3 text-muted-foreground">{Number(r.totalPackages ?? 0)}</td>
                            <td className="text-right px-4 py-3 text-green-600 dark:text-green-400 font-medium">{Number(r.totalDelivered ?? 0)}</td>
                            <td className="text-right px-4 py-3 text-muted-foreground">{Number(r.totalDoubles ?? 0)}</td>
                            <td className="text-right px-5 py-3 font-semibold">{formatCurrency(Number(r.grossPay ?? 0))}</td>
                          </tr>
                        ))}
                        <tr className="bg-muted/30 font-semibold">
                          <td className="px-5 py-3">TOTAL</td>
                          <td className="text-right px-4 py-3">{weeklyData.reduce((s, r) => s + Number(r.totalPackages ?? 0), 0)}</td>
                          <td className="text-right px-4 py-3 text-green-600 dark:text-green-400">{weeklyData.reduce((s, r) => s + Number(r.totalDelivered ?? 0), 0)}</td>
                          <td className="text-right px-4 py-3">{weeklyData.reduce((s, r) => s + Number(r.totalDoubles ?? 0), 0)}</td>
                          <td className="text-right px-5 py-3">{formatCurrency(weeklyData.reduce((s, r) => s + Number(r.grossPay ?? 0), 0))}</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Annual Report */}
          {mode === "annual" && (
            <div className="space-y-4">
              {annualData && annualData.length > 0 && (
                <div className="bg-card border border-border rounded-xl p-4">
                  <h3 className="font-semibold text-foreground mb-4">Pago Neto Anual por Driver — {year}</h3>
                  <ResponsiveContainer width="100%" height={250}>
                    <BarChart data={annualChartData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                      <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                      <YAxis tick={{ fontSize: 12 }} />
                      <Tooltip formatter={(v: number) => formatCurrency(v)} />
                      <Legend />
                      <Bar dataKey="Pago Neto" fill="#22c55e" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="Penalidades" fill="#ef4444" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
              <div className="bg-card border border-border rounded-xl overflow-hidden">
                <div className="px-5 py-4 border-b border-border">
                  <h3 className="font-semibold text-foreground">Resumen Anual {year}</h3>
                </div>
                {!annualData || annualData.length === 0 ? (
                  <div className="p-10 text-center text-muted-foreground">Sin datos para {year}</div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-border bg-muted/40">
                          <th className="text-left px-5 py-3 font-medium text-muted-foreground">Driver</th>
                          <th className="text-right px-4 py-3 font-medium text-muted-foreground">Pkgs Entregados</th>
                          <th className="text-right px-4 py-3 font-medium text-muted-foreground">Pago Bruto</th>
                          <th className="text-right px-4 py-3 font-medium text-muted-foreground">Penalidades</th>
                          <th className="text-right px-5 py-3 font-medium text-muted-foreground">Total Neto</th>
                        </tr>
                      </thead>
                      <tbody>
                        {annualData.map((r, i) => (
                          <tr key={i} className="border-b border-border/50 hover:bg-muted/20">
                            <td className="px-5 py-3 font-medium">{r.driverFirstName} {r.driverLastName} <span className="text-xs text-muted-foreground">({r.driverCode})</span></td>
                            <td className="text-right px-4 py-3 text-green-600 dark:text-green-400 font-medium">{Number(r.totalDelivered ?? 0).toLocaleString()}</td>
                            <td className="text-right px-4 py-3">{formatCurrency(Number(r.grossPay ?? 0))}</td>
                            <td className="text-right px-4 py-3 text-red-500">-{formatCurrency(Number(r.totalPenalties ?? 0))}</td>
                            <td className="text-right px-5 py-3 font-bold text-foreground">{formatCurrency(Number(r.totalPay ?? 0))}</td>
                          </tr>
                        ))}
                        <tr className="bg-muted/30 font-semibold">
                          <td className="px-5 py-3">TOTAL</td>
                          <td className="text-right px-4 py-3 text-green-600 dark:text-green-400">{annualData.reduce((s, r) => s + Number(r.totalDelivered ?? 0), 0).toLocaleString()}</td>
                          <td className="text-right px-4 py-3">{formatCurrency(annualData.reduce((s, r) => s + Number(r.grossPay ?? 0), 0))}</td>
                          <td className="text-right px-4 py-3 text-red-500">-{formatCurrency(annualData.reduce((s, r) => s + Number(r.totalPenalties ?? 0), 0))}</td>
                          <td className="text-right px-5 py-3">{formatCurrency(annualData.reduce((s, r) => s + Number(r.totalPay ?? 0), 0))}</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Activity Logs */}
          {mode === "logs" && (
            <div className="bg-card border border-border rounded-xl overflow-hidden">
              <div className="px-5 py-4 border-b border-border">
                <h3 className="font-semibold text-foreground">Registro de Actividad</h3>
              </div>
              {!logsData || logsData.length === 0 ? (
                <div className="p-10 text-center text-muted-foreground">Sin registros para los filtros seleccionados</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border bg-muted/40">
                        <th className="text-left px-5 py-3 font-medium text-muted-foreground">Fecha</th>
                        <th className="text-left px-4 py-3 font-medium text-muted-foreground">Driver</th>
                        <th className="text-left px-4 py-3 font-medium text-muted-foreground">Ruta</th>
                        <th className="text-right px-4 py-3 font-medium text-muted-foreground">Entregados</th>
                        <th className="text-right px-4 py-3 font-medium text-muted-foreground">Doubles</th>
                        <th className="text-right px-5 py-3 font-medium text-muted-foreground">Pago</th>
                      </tr>
                    </thead>
                    <tbody>
                      {logsData.map(({ log, driver, route }) => (
                        <tr key={log.id} className="border-b border-border/50 hover:bg-muted/20">
                          <td className="px-5 py-3 text-muted-foreground">{formatDate(log.logDate)}</td>
                          <td className="px-4 py-3 font-medium">{driver?.firstName} {driver?.lastName}</td>
                          <td className="px-4 py-3 font-mono text-muted-foreground">#{route?.routeNumber}</td>
                          <td className="text-right px-4 py-3 text-green-600 dark:text-green-400 font-medium">{log.packagesDelivered}</td>
                          <td className="text-right px-4 py-3 text-blue-600 dark:text-blue-400">{log.doublesReturns}</td>
                          <td className="text-right px-5 py-3 font-semibold">{formatCurrency(log.grossPay)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* Penalties Report */}
          {mode === "penalties" && (
            <div className="bg-card border border-border rounded-xl overflow-hidden">
              <div className="px-5 py-4 border-b border-border flex items-center justify-between">
                <h3 className="font-semibold text-foreground">Reporte de Penalidades</h3>
                {penaltiesData && penaltiesData.length > 0 && (
                  <span className="text-sm font-bold text-red-500">
                    Total: -{formatCurrency(penaltiesData.reduce((s, p) => s + parseFloat(p.penalty.amount ?? "0"), 0))}
                  </span>
                )}
              </div>
              {!penaltiesData || penaltiesData.length === 0 ? (
                <div className="p-10 text-center text-muted-foreground">Sin penalidades para los filtros seleccionados</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border bg-muted/40">
                        <th className="text-left px-5 py-3 font-medium text-muted-foreground">Fecha</th>
                        <th className="text-left px-4 py-3 font-medium text-muted-foreground">Driver</th>
                        <th className="text-left px-4 py-3 font-medium text-muted-foreground">Descripción</th>
                        <th className="text-right px-5 py-3 font-medium text-muted-foreground">Monto</th>
                      </tr>
                    </thead>
                    <tbody>
                      {penaltiesData.map(({ penalty, driver }) => (
                        <tr key={penalty.id} className="border-b border-border/50 hover:bg-muted/20">
                          <td className="px-5 py-3 text-muted-foreground">{formatDate(penalty.penaltyDate)}</td>
                          <td className="px-4 py-3 font-medium">{driver?.firstName} {driver?.lastName}</td>
                          <td className="px-4 py-3 text-muted-foreground">{penalty.description}</td>
                          <td className="text-right px-5 py-3 font-bold text-red-500">-{formatCurrency(penalty.amount)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
