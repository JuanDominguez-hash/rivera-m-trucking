import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { formatCurrency, getWeekRange } from "@/lib/utils";
import {
  AlertTriangle,
  CalendarDays,
  Camera,
  DollarSign,
  Eye,
  EyeOff,
  MapPin,
  Package,
  Receipt,
  TrendingUp,
  Truck,
  Users,
} from "lucide-react";
import { useMemo, useState } from "react";
import { useLocation } from "wouter";

const APP_NAME = import.meta.env.VITE_APP_NAME || "Rivera M Trucking";

function StatCard({
  icon: Icon,
  label,
  value,
  sub,
  color = "blue",
  onClick,
}: {
  icon: React.ElementType;
  label: string;
  value: string | number;
  sub?: string;
  color?: "blue" | "green" | "yellow" | "red" | "purple";
  onClick?: () => void;
}) {
  const colorMap = {
    blue: "bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400",
    green: "bg-green-50 text-green-600 dark:bg-green-900/20 dark:text-green-400",
    yellow: "bg-yellow-50 text-yellow-600 dark:bg-yellow-900/20 dark:text-yellow-400",
    red: "bg-red-50 text-red-600 dark:bg-red-900/20 dark:text-red-400",
    purple: "bg-purple-50 text-purple-600 dark:bg-purple-900/20 dark:text-purple-400",
  };

  return (
    <div
      className={`bg-card rounded-xl border border-border p-5 flex items-start gap-4 shadow-sm hover:shadow-md transition-all ${onClick ? "cursor-pointer hover:border-primary/40" : ""}`}
      onClick={onClick}
    >
      <div className={`rounded-lg p-2.5 ${colorMap[color]} shrink-0`}>
        <Icon className="h-5 w-5" />
      </div>
      <div className="min-w-0">
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{label}</p>
        <p className="text-2xl font-bold text-foreground mt-0.5">{value}</p>
        {sub && <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>}
      </div>
    </div>
  );
}

function DriverDashboard({ userName }: { userName: string }) {
  const [, setLocation] = useLocation();
  const [showPassword, setShowPassword] = useState(false);
  const { data: driver } = trpc.drivers.myProfile.useQuery();
  const { data: myStubs } = trpc.payStubs.myStubs.useQuery();
  const { data: myLogs } = trpc.dailyLogs.myLogs.useQuery();

  const totalEarned = myStubs?.reduce((s, stub) => s + parseFloat(String(stub.totalPay ?? "0")), 0) ?? 0;
  const pendingStubs = myStubs?.filter(s => s.status === "sent").length ?? 0;
  const totalDelivered = myLogs?.reduce((s, l) => s + (l.log.packagesDelivered ?? 0), 0) ?? 0;

  return (
    <div className="space-y-6">
      {/* Welcome */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">
          Bienvenido, {userName.split(" ")[0]}
        </h1>
        <p className="text-muted-foreground text-sm mt-1">{APP_NAME} — Driver Portal</p>
      </div>

      {/* Driver ID Card */}
      {driver && (
        <div className="bg-gradient-to-r from-slate-800 to-slate-900 rounded-2xl p-5 text-white shadow-lg">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs text-white/50 uppercase tracking-wider mb-1">Driver Card</p>
              <p className="text-xl font-bold">{driver.firstName} {driver.lastName}</p>
            </div>
            <div className="bg-yellow-500 rounded-lg p-2">
              <Truck className="h-6 w-6 text-white" />
            </div>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-4">
            <div>
              <p className="text-xs text-white/50">ID/DVR</p>
              <p className="text-lg font-mono font-bold text-yellow-400">{driver.driverCode}</p>
            </div>
            <div>
              <p className="text-xs text-white/50">Contraseña</p>
              <div className="flex items-center gap-2">
                <p className="text-lg font-mono font-bold text-yellow-400">
                  {showPassword ? (driver.password || "—") : "••••••••"}
                </p>
                <button
                  onClick={() => setShowPassword(!showPassword)}
                  className="text-white/50 hover:text-white transition-colors"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
            <div>
              <p className="text-xs text-white/50">Estado</p>
              <span className={`text-sm font-medium ${driver.status === "active" ? "text-green-400" : "text-red-400"}`}>
                {driver.status === "active" ? "Activo" : "Inactivo"}
              </span>
            </div>
            {driver.phone && (
              <div>
                <p className="text-xs text-white/50">Teléfono</p>
                <p className="text-sm text-white/80">{driver.phone}</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <StatCard
          icon={Package}
          label="Paquetes entregados"
          value={totalDelivered.toLocaleString()}
          sub="total histórico"
          color="green"
          onClick={() => setLocation("/my-activity")}
        />
        <StatCard
          icon={DollarSign}
          label="Total ganado"
          value={formatCurrency(totalEarned)}
          sub="neto acumulado"
          color="blue"
          onClick={() => setLocation("/my-pay-stubs")}
        />
        <StatCard
          icon={Receipt}
          label="Pay Stubs pendientes"
          value={pendingStubs}
          sub="por confirmar"
          color={pendingStubs > 0 ? "yellow" : "green"}
          onClick={() => setLocation("/my-pay-stubs")}
        />
      </div>

      {/* Quick actions */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div
          className="bg-card border border-border rounded-xl p-4 flex items-center gap-3 cursor-pointer hover:border-primary/40 transition-all"
          onClick={() => setLocation("/my-activity")}
        >
          <div className="h-10 w-10 rounded-lg bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center">
            <CalendarDays className="h-5 w-5 text-blue-600 dark:text-blue-400" />
          </div>
          <div>
            <p className="font-medium text-foreground text-sm">Mi Actividad</p>
            <p className="text-xs text-muted-foreground">Ver registros diarios</p>
          </div>
        </div>
        <div
          className="bg-card border border-border rounded-xl p-4 flex items-center gap-3 cursor-pointer hover:border-primary/40 transition-all"
          onClick={() => setLocation("/my-pay-stubs")}
        >
          <div className="h-10 w-10 rounded-lg bg-green-50 dark:bg-green-900/20 flex items-center justify-center">
            <Receipt className="h-5 w-5 text-green-600 dark:text-green-400" />
          </div>
          <div>
            <p className="font-medium text-foreground text-sm">Mis Pay Stubs</p>
            <p className="text-xs text-muted-foreground">Ver y confirmar pagos</p>
          </div>
        </div>
        <div
          className="bg-card border border-border rounded-xl p-4 flex items-center gap-3 cursor-pointer hover:border-primary/40 transition-all"
          onClick={() => setLocation("/my-photos")}
        >
          <div className="h-10 w-10 rounded-lg bg-purple-50 dark:bg-purple-900/20 flex items-center justify-center">
            <Camera className="h-5 w-5 text-purple-600 dark:text-purple-400" />
          </div>
          <div>
            <p className="font-medium text-foreground text-sm">Mis Fotos</p>
            <p className="text-xs text-muted-foreground">Subir fotos de entrega</p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function Dashboard() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const isAdmin = user?.role === "admin";
  const { weekStart, weekEnd } = useMemo(() => getWeekRange(), []);
  const currentYear = new Date().getFullYear();

  const { data: drivers } = trpc.drivers.list.useQuery(undefined, { enabled: isAdmin });
  const { data: routes } = trpc.routes.list.useQuery(undefined, { enabled: isAdmin });
  const { data: weeklyReport } = trpc.reports.weekly.useQuery(
    { weekStart, weekEnd },
    { enabled: isAdmin }
  );
  const { data: annualReport } = trpc.reports.annual.useQuery(
    { year: currentYear },
    { enabled: isAdmin }
  );
  const { data: penalties } = trpc.penalties.list.useQuery(
    { dateFrom: weekStart, dateTo: weekEnd },
    { enabled: isAdmin }
  );
  const { data: payStubs } = trpc.payStubs.list.useQuery(
    { status: "disputed" },
    { enabled: isAdmin }
  );

  if (!isAdmin) {
    return <DriverDashboard userName={user?.name || "Driver"} />;
  }

  const activeDrivers = drivers?.filter(d => d.status === "active").length ?? 0;
  const activeRoutes = routes?.filter(r => r.status === "active").length ?? 0;
  const weeklyGross = weeklyReport?.reduce((s, r) => s + Number(r.grossPay ?? 0), 0) ?? 0;
  const weeklyPackages = weeklyReport?.reduce((s, r) => s + Number(r.totalDelivered ?? 0), 0) ?? 0;
  const yearlyTotal = annualReport?.reduce((s, r) => s + Number(r.totalPay ?? 0), 0) ?? 0;
  const weeklyPenalties = penalties?.reduce((s, p) => s + parseFloat(p.penalty.amount ?? "0"), 0) ?? 0;
  const disputedCount = payStubs?.length ?? 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Truck className="h-6 w-6 text-primary" />
            Dashboard
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Semana: {weekStart} — {weekEnd}
          </p>
        </div>
        <div className="text-right hidden sm:block">
          <p className="text-xs text-muted-foreground">Año fiscal</p>
          <p className="text-sm font-semibold text-foreground">{currentYear}</p>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
        <StatCard
          icon={Users}
          label="Drivers Activos"
          value={activeDrivers}
          sub={`${drivers?.length ?? 0} total`}
          color="blue"
          onClick={() => setLocation("/drivers")}
        />
        <StatCard
          icon={MapPin}
          label="Rutas Activas"
          value={activeRoutes}
          sub={`${routes?.length ?? 0} total`}
          color="purple"
          onClick={() => setLocation("/routes")}
        />
        <StatCard
          icon={Package}
          label="Paquetes esta semana"
          value={weeklyPackages.toLocaleString()}
          sub="entregados"
          color="green"
        />
        <StatCard
          icon={DollarSign}
          label="Pago bruto semanal"
          value={formatCurrency(weeklyGross)}
          sub="esta semana"
          color="green"
        />
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4">
        <StatCard
          icon={TrendingUp}
          label="Total pagado (año)"
          value={formatCurrency(yearlyTotal)}
          sub={`${currentYear}`}
          color="blue"
        />
        <StatCard
          icon={AlertTriangle}
          label="Penalidades esta semana"
          value={formatCurrency(weeklyPenalties)}
          sub="descontadas"
          color="red"
          onClick={() => setLocation("/penalties")}
        />
        <StatCard
          icon={Receipt}
          label="Pay Stubs en disputa"
          value={disputedCount}
          sub="requieren atención"
          color={disputedCount > 0 ? "yellow" : "green"}
          onClick={() => setLocation("/pay-stubs")}
        />
      </div>

      {/* Weekly Summary Table */}
      {weeklyReport && weeklyReport.length > 0 && (
        <div className="bg-card rounded-xl border border-border shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-border">
            <h2 className="font-semibold text-foreground">Resumen Semanal por Driver</h2>
            <p className="text-xs text-muted-foreground mt-0.5">{weekStart} — {weekEnd}</p>
          </div>
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
                {weeklyReport.map((row, i) => (
                  <tr key={i} className="border-b border-border/50 hover:bg-muted/20 transition-colors">
                    <td className="px-5 py-3 font-medium text-foreground">
                      <div className="flex items-center gap-2">
                        <div className="h-7 w-7 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary">
                          {row.driverFirstName?.charAt(0)}{row.driverLastName?.charAt(0)}
                        </div>
                        <div>
                          <p className="font-medium">{row.driverFirstName} {row.driverLastName}</p>
                          <p className="text-xs text-muted-foreground font-mono">ID/DVR: {row.driverCode}</p>
                        </div>
                      </div>
                    </td>
                    <td className="text-right px-4 py-3 text-muted-foreground">{Number(row.totalPackages ?? 0).toLocaleString()}</td>
                    <td className="text-right px-4 py-3 text-green-600 dark:text-green-400 font-medium">{Number(row.totalDelivered ?? 0).toLocaleString()}</td>
                    <td className="text-right px-4 py-3 text-muted-foreground">{Number(row.totalDoubles ?? 0).toLocaleString()}</td>
                    <td className="text-right px-5 py-3 font-semibold text-foreground">{formatCurrency(Number(row.grossPay ?? 0))}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {(!weeklyReport || weeklyReport.length === 0) && (
        <div className="bg-card rounded-xl border border-border p-10 text-center">
          <CalendarDays className="h-10 w-10 text-muted-foreground/40 mx-auto mb-3" />
          <p className="text-muted-foreground font-medium">Sin actividad registrada esta semana</p>
          <p className="text-sm text-muted-foreground/70 mt-1">Agrega registros diarios para ver el resumen</p>
        </div>
      )}
    </div>
  );
}
