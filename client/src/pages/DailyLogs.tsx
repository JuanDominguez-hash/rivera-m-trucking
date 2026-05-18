import { trpc } from "@/lib/trpc";
import { cn, formatCurrency, formatDate, todayString } from "@/lib/utils";
import { zodResolver } from "@hookform/resolvers/zod";
import { CalendarDays, Edit2, Package, Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod/v4";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const logSchema = z.object({
  driverId: z.string().min(1, "Selecciona un driver"),
  routeId: z.string().min(1, "Selecciona una ruta"),
  logDate: z.string().min(1, "Requerido"),
  totalPackages: z.string().min(1, "Requerido"),
  packagesDelivered: z.string().min(1, "Requerido"),
  doublesReturns: z.string(),
  notes: z.string().optional(),
});

type LogForm = z.infer<typeof logSchema>;

export default function DailyLogsPage() {
  const [open, setOpen] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [filterDriver, setFilterDriver] = useState<string>("all");
  const [filterDate, setFilterDate] = useState<string>("");
  const utils = trpc.useUtils();

  const { data: drivers } = trpc.drivers.list.useQuery();
  const { data: routes } = trpc.routes.list.useQuery();
  const { data: logs, isLoading } = trpc.dailyLogs.list.useQuery({
    driverId: filterDriver !== "all" ? parseInt(filterDriver) : undefined,
    dateFrom: filterDate || undefined,
    dateTo: filterDate || undefined,
  });

  const form = useForm<LogForm>({
    resolver: zodResolver(logSchema),
    defaultValues: { logDate: todayString(), doublesReturns: "0" },
  });

  const selectedRouteId = form.watch("routeId");
  const selectedRoute = routes?.find(r => r.id === parseInt(selectedRouteId ?? "0"));
  const delivered = parseInt(form.watch("packagesDelivered") ?? "0") || 0;
  const doubles = parseInt(form.watch("doublesReturns") ?? "0") || 0;
  const estimatedPay = selectedRoute
    ? delivered * parseFloat(selectedRoute.ratePerPackage) + doubles * parseFloat(selectedRoute.ratePerDouble)
    : 0;

  const createMutation = trpc.dailyLogs.create.useMutation({
    onSuccess: () => {
      toast.success("Actividad registrada exitosamente");
      utils.dailyLogs.list.invalidate();
      setOpen(false);
      form.reset({ logDate: todayString(), doublesReturns: "0" });
    },
    onError: (e) => toast.error(e.message),
  });

  const updateMutation = trpc.dailyLogs.update.useMutation({
    onSuccess: () => {
      toast.success("Registro actualizado");
      utils.dailyLogs.list.invalidate();
      setOpen(false);
      setEditId(null);
    },
    onError: (e) => toast.error(e.message),
  });

  const deleteMutation = trpc.dailyLogs.delete.useMutation({
    onSuccess: () => {
      toast.success("Registro eliminado");
      utils.dailyLogs.list.invalidate();
    },
    onError: (e) => toast.error(e.message),
  });

  function openCreate() {
    setEditId(null);
    form.reset({ logDate: todayString(), doublesReturns: "0" });
    setOpen(true);
  }

  function onSubmit(values: LogForm) {
    if (editId) {
      updateMutation.mutate({
        id: editId,
        totalPackages: parseInt(values.totalPackages),
        packagesDelivered: parseInt(values.packagesDelivered),
        doublesReturns: parseInt(values.doublesReturns ?? "0"),
        notes: values.notes,
      });
    } else {
      createMutation.mutate({
        driverId: parseInt(values.driverId),
        routeId: parseInt(values.routeId),
        logDate: values.logDate,
        totalPackages: parseInt(values.totalPackages),
        packagesDelivered: parseInt(values.packagesDelivered),
        doublesReturns: parseInt(values.doublesReturns ?? "0"),
        notes: values.notes,
      });
    }
  }

  const activeDrivers = drivers?.filter(d => d.status === "active") ?? [];
  const activeRoutes = routes?.filter(r => r.status === "active") ?? [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <CalendarDays className="h-6 w-6 text-primary" />
            Actividad Diaria
          </h1>
          <p className="text-muted-foreground text-sm mt-1">Registro de paquetes y rutas por día</p>
        </div>
        <Button onClick={openCreate} className="gap-2">
          <Plus className="h-4 w-4" />
          <span className="hidden sm:inline">Nuevo Registro</span>
        </Button>
      </div>

      {/* Filters */}
      <div className="flex gap-3 flex-wrap">
        <Select value={filterDriver} onValueChange={setFilterDriver}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Todos los drivers" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos los drivers</SelectItem>
            {activeDrivers.map(d => (
              <SelectItem key={d.id} value={d.id.toString()}>
                {d.firstName} {d.lastName}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Input
          type="date"
          value={filterDate}
          onChange={e => setFilterDate(e.target.value)}
          className="w-44"
          placeholder="Filtrar por fecha"
        />
        {filterDate && (
          <Button variant="outline" size="sm" onClick={() => setFilterDate("")}>
            Limpiar
          </Button>
        )}
      </div>

      {/* List */}
      {isLoading ? (
        <div className="space-y-3">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="bg-card border border-border rounded-xl p-4 animate-pulse h-24" />
          ))}
        </div>
      ) : !logs || logs.length === 0 ? (
        <div className="bg-card border border-border rounded-xl p-12 text-center">
          <Package className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
          <p className="text-muted-foreground font-medium">Sin registros de actividad</p>
          <Button onClick={openCreate} variant="outline" className="mt-4 gap-2">
            <Plus className="h-4 w-4" />
            Agregar primer registro
          </Button>
        </div>
      ) : (
        <div className="space-y-2">
          {logs.map(({ log, driver, route }) => (
            <div
              key={log.id}
              className="bg-card border border-border rounded-xl p-4 hover:border-primary/30 transition-all"
            >
              <div className="flex items-start gap-3">
                <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary shrink-0">
                  {driver?.firstName?.charAt(0)}{driver?.lastName?.charAt(0)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <div>
                      <p className="font-semibold text-foreground text-sm">
                        {driver?.firstName} {driver?.lastName}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Ruta #{route?.routeNumber} · {formatDate(log.logDate)}
                      </p>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-muted-foreground hover:text-destructive"
                        onClick={() => {
                          if (confirm("¿Eliminar este registro?")) {
                            deleteMutation.mutate({ id: log.id });
                          }
                        }}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-3">
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
                    <div className="bg-yellow-50 dark:bg-yellow-900/20 rounded-lg p-2 text-center">
                      <p className="text-xs text-muted-foreground">Pago Bruto</p>
                      <p className="text-sm font-bold text-yellow-700 dark:text-yellow-400">{formatCurrency(log.grossPay)}</p>
                    </div>
                  </div>
                  {log.notes && (
                    <p className="text-xs text-muted-foreground mt-2 italic">{log.notes}</p>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Nuevo Registro Diario</DialogTitle>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <FormField control={form.control} name="driverId" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Driver</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger><SelectValue placeholder="Seleccionar..." /></SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {activeDrivers.map(d => (
                          <SelectItem key={d.id} value={d.id.toString()}>
                            {d.firstName} {d.lastName}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="routeId" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Ruta</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger><SelectValue placeholder="Seleccionar..." /></SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {activeRoutes.map(r => (
                          <SelectItem key={r.id} value={r.id.toString()}>
                            #{r.routeNumber} {r.zone ? `· ${r.zone}` : ""}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )} />
              </div>

              {selectedRoute && (
                <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-3 text-xs text-blue-700 dark:text-blue-300 flex gap-4">
                  <span>Tarifa paquete: <strong>{formatCurrency(selectedRoute.ratePerPackage)}</strong></span>
                  <span>Tarifa double: <strong>{formatCurrency(selectedRoute.ratePerDouble)}</strong></span>
                </div>
              )}

              <FormField control={form.control} name="logDate" render={({ field }) => (
                <FormItem>
                  <FormLabel>Fecha</FormLabel>
                  <FormControl><Input type="date" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />

              <div className="grid grid-cols-3 gap-3">
                <FormField control={form.control} name="totalPackages" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Total Pkgs</FormLabel>
                    <FormControl><Input type="number" min="0" placeholder="0" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="packagesDelivered" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Entregados</FormLabel>
                    <FormControl><Input type="number" min="0" placeholder="0" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="doublesReturns" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Doubles</FormLabel>
                    <FormControl><Input type="number" min="0" placeholder="0" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
              </div>

              {estimatedPay > 0 && (
                <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-3 flex items-center justify-between">
                  <span className="text-sm text-green-700 dark:text-green-300 font-medium">Pago estimado:</span>
                  <span className="text-lg font-bold text-green-700 dark:text-green-300">{formatCurrency(estimatedPay)}</span>
                </div>
              )}

              <FormField control={form.control} name="notes" render={({ field }) => (
                <FormItem>
                  <FormLabel>Notas (opcional)</FormLabel>
                  <FormControl><Input placeholder="Observaciones del día..." {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />

              <div className="flex gap-3 pt-2">
                <Button type="button" variant="outline" className="flex-1" onClick={() => setOpen(false)}>
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  className="flex-1"
                  disabled={createMutation.isPending}
                >
                  Guardar Registro
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
