import { trpc } from "@/lib/trpc";
import { formatCurrency } from "@/lib/utils";
import { Download, FileText, Loader2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function Form1099Page() {
  const currentYear = new Date().getFullYear();
  const [year, setYear] = useState(currentYear);
  const [downloading, setDownloading] = useState<number | null>(null);

  const { data: annualData, isLoading } = trpc.reports.annual.useQuery({ year });
  const { data: drivers } = trpc.drivers.list.useQuery();

  const exportPdfMutation = trpc.exports.payStubPdf.useMutation({
    onSuccess: (data) => {
      const link = document.createElement("a");
      link.href = data.url;
      link.download = data.filename;
      link.click();
      toast.success("PDF generado exitosamente");
      setDownloading(null);
    },
    onError: (e) => {
      toast.error(e.message);
      setDownloading(null);
    },
  });

  const export1099Mutation = trpc.exports.form1099.useMutation({
    onSuccess: (data) => {
      const link = document.createElement("a");
      link.href = data.url;
      link.download = data.filename;
      link.click();
      toast.success("Formulario 1099 generado");
      setDownloading(null);
    },
    onError: (e) => {
      toast.error(e.message);
      setDownloading(null);
    },
  });

  const totalPaid = annualData?.reduce((s, r) => s + Number(r.totalPay ?? 0), 0) ?? 0;
  const qualifiedDrivers = annualData?.filter(r => Number(r.totalPay ?? 0) >= 600) ?? [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <FileText className="h-6 w-6 text-primary" />
            Formularios 1099
          </h1>
          <p className="text-muted-foreground text-sm mt-1">Documentos fiscales anuales por conductor</p>
        </div>
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

      {/* Info Banner */}
      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-4">
        <h3 className="font-semibold text-blue-800 dark:text-blue-300 mb-1">Sobre el Formulario 1099-NEC</h3>
        <p className="text-sm text-blue-700 dark:text-blue-400">
          Los conductores independientes que recibieron <strong>$600 o más</strong> durante el año fiscal deben recibir un formulario 1099-NEC para declarar sus ingresos ante el IRS. Los conductores con menos de $600 no califican para este formulario.
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-card border border-border rounded-xl p-4 text-center">
          <p className="text-2xl font-bold text-foreground">{annualData?.length ?? 0}</p>
          <p className="text-xs text-muted-foreground mt-0.5">Drivers con actividad</p>
        </div>
        <div className="bg-card border border-border rounded-xl p-4 text-center">
          <p className="text-2xl font-bold text-green-600 dark:text-green-400">{qualifiedDrivers.length}</p>
          <p className="text-xs text-muted-foreground mt-0.5">Califican 1099</p>
        </div>
        <div className="bg-card border border-border rounded-xl p-4 text-center">
          <p className="text-xl font-bold text-foreground">{formatCurrency(totalPaid)}</p>
          <p className="text-xs text-muted-foreground mt-0.5">Total pagado {year}</p>
        </div>
      </div>

      {/* Driver List */}
      {isLoading ? (
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="bg-card border border-border rounded-xl p-4 animate-pulse h-24" />
          ))}
        </div>
      ) : !annualData || annualData.length === 0 ? (
        <div className="bg-card border border-border rounded-xl p-12 text-center">
          <FileText className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
          <p className="text-muted-foreground font-medium">Sin datos para {year}</p>
          <p className="text-sm text-muted-foreground/70 mt-1">Registra actividad diaria para generar reportes anuales</p>
        </div>
      ) : (
        <div className="space-y-3">
          {annualData.map((r) => {
            const totalPay = Number(r.totalPay ?? 0);
            const qualifies = totalPay >= 600;
            const driver = drivers?.find(d => d.driverCode === r.driverCode);
            const driverId = driver?.id ?? 0;

            return (
              <div
                key={r.driverCode}
                className={`bg-card border rounded-xl p-4 ${
                  qualifies
                    ? "border-green-200 dark:border-green-900/40"
                    : "border-border opacity-70"
                }`}
              >
                <div className="flex items-center gap-4">
                  <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center text-sm font-bold text-primary shrink-0">
                    {r.driverFirstName?.charAt(0)}{r.driverLastName?.charAt(0)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-semibold text-foreground">
                        {r.driverFirstName} {r.driverLastName}
                      </p>
                      <span className="text-xs font-mono text-muted-foreground">{r.driverCode}</span>
                      {qualifies ? (
                        <span className="text-xs px-2 py-0.5 rounded-full font-medium badge-success">
                          Califica 1099
                        </span>
                      ) : (
                        <span className="text-xs px-2 py-0.5 rounded-full font-medium badge-neutral">
                          Menos de $600
                        </span>
                      )}
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-3">
                      <div>
                        <p className="text-xs text-muted-foreground">Pago Bruto</p>
                        <p className="text-sm font-semibold text-foreground">{formatCurrency(Number(r.grossPay ?? 0))}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Penalidades</p>
                        <p className="text-sm font-semibold text-red-500">-{formatCurrency(Number(r.totalPenalties ?? 0))}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Total Neto</p>
                        <p className="text-sm font-bold text-green-600 dark:text-green-400">{formatCurrency(totalPay)}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Pkgs Entregados</p>
                        <p className="text-sm font-semibold text-foreground">{Number(r.totalDelivered ?? 0).toLocaleString()}</p>
                      </div>
                    </div>
                  </div>
                  <div className="flex flex-col gap-2 shrink-0">
                    {qualifies && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="gap-2 text-xs"
                        disabled={downloading === driverId}
                        onClick={() => {
                          setDownloading(driverId);
                          export1099Mutation.mutate({ driverId, year });
                        }}
                      >
                        {downloading === driverId ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <Download className="h-3.5 w-3.5" />
                        )}
                        1099-NEC
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Download All */}
      {qualifiedDrivers.length > 0 && (
        <div className="bg-card border border-border rounded-xl p-4 flex items-center justify-between">
          <div>
            <p className="font-semibold text-foreground">Descargar todos los 1099 — {year}</p>
            <p className="text-sm text-muted-foreground">{qualifiedDrivers.length} drivers califican</p>
          </div>
          <Button
            variant="outline"
            className="gap-2"
            onClick={() => {
              toast.info("Generando todos los formularios 1099...");
              qualifiedDrivers.forEach(r => {
                const driver = drivers?.find(d => d.driverCode === r.driverCode);
                if (driver) {
                  export1099Mutation.mutate({ driverId: driver.id, year });
                }
              });
            }}
          >
            <Download className="h-4 w-4" />
            Descargar Todos
          </Button>
        </div>
      )}
    </div>
  );
}
