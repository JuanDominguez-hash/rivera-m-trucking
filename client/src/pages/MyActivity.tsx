import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { formatCurrency, formatDate } from "@/lib/utils";
import { CalendarDays, Package } from "lucide-react";

export default function MyActivityPage() {
  const { user } = useAuth();
  const { data: logs, isLoading } = trpc.dailyLogs.myLogs.useQuery();

  const totalDelivered = logs?.reduce((s, { log }) => s + log.packagesDelivered, 0) ?? 0;
  const totalGross = logs?.reduce((s, { log }) => s + parseFloat(String(log.grossPay ?? "0")), 0) ?? 0;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
          <CalendarDays className="h-6 w-6 text-primary" />
          Mi Actividad
        </h1>
        <p className="text-muted-foreground text-sm mt-1">Historial de rutas y paquetes entregados</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-card border border-border rounded-xl p-4 text-center">
          <p className="text-2xl font-bold text-green-600 dark:text-green-400">{totalDelivered.toLocaleString()}</p>
          <p className="text-xs text-muted-foreground mt-0.5">Paquetes Entregados</p>
        </div>
        <div className="bg-card border border-border rounded-xl p-4 text-center">
          <p className="text-xl font-bold text-foreground">{formatCurrency(totalGross)}</p>
          <p className="text-xs text-muted-foreground mt-0.5">Pago Bruto Total</p>
        </div>
      </div>

      {/* Log List */}
      {isLoading ? (
        <div className="space-y-3">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="bg-card border border-border rounded-xl p-4 animate-pulse h-24" />
          ))}
        </div>
      ) : !logs || logs.length === 0 ? (
        <div className="bg-card border border-border rounded-xl p-12 text-center">
          <Package className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
          <p className="text-muted-foreground font-medium">Sin actividad registrada</p>
        </div>
      ) : (
        <div className="space-y-2">
          {logs.map(({ log, route }) => (
            <div key={log.id} className="bg-card border border-border rounded-xl p-4 hover:border-primary/30 transition-all">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <p className="font-semibold text-foreground text-sm">Ruta #{route?.routeNumber}</p>
                  <p className="text-xs text-muted-foreground">{formatDate(log.logDate)}</p>
                </div>
                <span className="text-base font-bold text-yellow-700 dark:text-yellow-400">{formatCurrency(log.grossPay)}</span>
              </div>
              <div className="grid grid-cols-3 gap-2">
                <div className="bg-muted/40 rounded-lg p-2 text-center">
                  <p className="text-xs text-muted-foreground">Total Pkgs</p>
                  <p className="text-sm font-bold text-foreground">{log.totalPackages}</p>
                </div>
                <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-2 text-center">
                  <p className="text-xs text-muted-foreground">Entregados</p>
                  <p className="text-sm font-bold text-green-600 dark:text-green-400">{log.packagesDelivered}</p>
                </div>
                <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-2 text-center">
                  <p className="text-xs text-muted-foreground">Doubles</p>
                  <p className="text-sm font-bold text-blue-600 dark:text-blue-400">{log.doublesReturns}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
