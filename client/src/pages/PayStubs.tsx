import { trpc } from "@/lib/trpc";
import { cn, formatCurrency, formatDate, getPayStubStatusColor, getPayStubStatusLabel, getWeekRange } from "@/lib/utils";
import { zodResolver } from "@hookform/resolvers/zod";
import { CheckCircle, ChevronDown, ChevronUp, DollarSign, Plus, Receipt, Send, XCircle } from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod/v4";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const generateSchema = z.object({
  driverId: z.string().min(1, "Selecciona un driver"),
  weekStart: z.string().min(1, "Requerido"),
  weekEnd: z.string().min(1, "Requerido"),
});

type GenerateForm = z.infer<typeof generateSchema>;

export default function PayStubsPage() {
  const [open, setOpen] = useState(false);
  const [filterDriver, setFilterDriver] = useState<string>("all");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const utils = trpc.useUtils();

  const { weekStart, weekEnd } = getWeekRange();
  const { data: drivers } = trpc.drivers.list.useQuery();
  const { data: payStubs, isLoading } = trpc.payStubs.list.useQuery({
    driverId: filterDriver !== "all" ? parseInt(filterDriver) : undefined,
    status: filterStatus !== "all" ? filterStatus : undefined,
  });

  const form = useForm<GenerateForm>({
    resolver: zodResolver(generateSchema),
    defaultValues: { weekStart, weekEnd },
  });

  const generateMutation = trpc.payStubs.generate.useMutation({
    onSuccess: (data) => {
      toast.success(`Pay stub generado: ${formatCurrency(data.totalPay)} neto`);
      utils.payStubs.list.invalidate();
      setOpen(false);
    },
    onError: (e) => toast.error(e.message),
  });

  const sendMutation = trpc.payStubs.send.useMutation({
    onSuccess: () => {
      toast.success("Pay stub enviado al driver");
      utils.payStubs.list.invalidate();
    },
    onError: (e) => toast.error(e.message),
  });

  const filtered = payStubs ?? [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Receipt className="h-6 w-6 text-primary" />
            Pay Stubs
          </h1>
          <p className="text-muted-foreground text-sm mt-1">Comprobantes de pago semanales</p>
        </div>
        <Button onClick={() => setOpen(true)} className="gap-2">
          <Plus className="h-4 w-4" />
          <span className="hidden sm:inline">Generar Pay Stub</span>
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {["draft", "sent", "approved", "disputed"].map(status => {
          const count = payStubs?.filter(p => p.stub.status === status).length ?? 0;
          const colorMap: Record<string, string> = {
            draft: "text-muted-foreground",
            sent: "text-yellow-600 dark:text-yellow-400",
            approved: "text-green-600 dark:text-green-400",
            disputed: "text-red-500 dark:text-red-400",
          };
          return (
            <div key={status} className="bg-card border border-border rounded-xl p-4 text-center">
              <p className={`text-2xl font-bold ${colorMap[status]}`}>{count}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{getPayStubStatusLabel(status)}</p>
            </div>
          );
        })}
      </div>

      {/* Filters */}
      <div className="flex gap-3 flex-wrap">
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
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Todos los estados" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            <SelectItem value="draft">Borrador</SelectItem>
            <SelectItem value="sent">Enviado</SelectItem>
            <SelectItem value="approved">Aprobado</SelectItem>
            <SelectItem value="disputed">En Disputa</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* List */}
      {isLoading ? (
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="bg-card border border-border rounded-xl p-4 animate-pulse h-28" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-card border border-border rounded-xl p-12 text-center">
          <Receipt className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
          <p className="text-muted-foreground font-medium">Sin pay stubs generados</p>
          <Button onClick={() => setOpen(true)} variant="outline" className="mt-4 gap-2">
            <Plus className="h-4 w-4" />
            Generar primer pay stub
          </Button>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(({ stub, driver }) => {
            const isExpanded = expandedId === stub.id;
            return (
              <div
                key={stub.id}
                className={cn(
                  "bg-card border rounded-xl overflow-hidden transition-all",
                  stub.status === "disputed" ? "border-red-300 dark:border-red-800" :
                  stub.status === "approved" ? "border-green-300 dark:border-green-800" :
                  "border-border"
                )}
              >
                <div
                  className="p-4 flex items-center gap-4 cursor-pointer hover:bg-muted/20"
                  onClick={() => setExpandedId(isExpanded ? null : stub.id)}
                >
                  <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary shrink-0">
                    {driver?.firstName?.charAt(0)}{driver?.lastName?.charAt(0)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-semibold text-foreground text-sm">
                        {driver?.firstName} {driver?.lastName}
                      </p>
                      <span className={cn("text-xs px-2 py-0.5 rounded-full font-medium", getPayStubStatusColor(stub.status))}>
                        {getPayStubStatusLabel(stub.status)}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {formatDate(stub.weekStart)} — {formatDate(stub.weekEnd)}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-lg font-bold text-foreground">{formatCurrency(stub.totalPay)}</p>
                    <p className="text-xs text-muted-foreground">neto</p>
                  </div>
                  {isExpanded ? <ChevronUp className="h-4 w-4 text-muted-foreground shrink-0" /> : <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />}
                </div>

                {isExpanded && (
                  <div className="border-t border-border bg-muted/10 p-4 space-y-4">
                    {/* Details */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      <div className="text-center">
                        <p className="text-xs text-muted-foreground">Total Pkgs</p>
                        <p className="text-sm font-bold text-foreground">{stub.totalPackages}</p>
                      </div>
                      <div className="text-center">
                        <p className="text-xs text-muted-foreground">Entregados</p>
                        <p className="text-sm font-bold text-green-600 dark:text-green-400">{stub.totalDelivered}</p>
                      </div>
                      <div className="text-center">
                        <p className="text-xs text-muted-foreground">Doubles</p>
                        <p className="text-sm font-bold text-blue-600 dark:text-blue-400">{stub.totalDoubles}</p>
                      </div>
                      <div className="text-center">
                        <p className="text-xs text-muted-foreground">Penalidades</p>
                        <p className="text-sm font-bold text-red-500 dark:text-red-400">-{formatCurrency(stub.totalPenalties)}</p>
                      </div>
                    </div>

                    {/* Pay breakdown */}
                    <div className="bg-card border border-border rounded-lg p-3 space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Pago Bruto</span>
                        <span className="font-medium text-foreground">{formatCurrency(stub.grossPay)}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-red-500">Penalidades</span>
                        <span className="font-medium text-red-500">-{formatCurrency(stub.totalPenalties)}</span>
                      </div>
                      <div className="border-t border-border pt-2 flex justify-between">
                        <span className="font-semibold text-foreground">Total Neto</span>
                        <span className="font-bold text-lg text-foreground">{formatCurrency(stub.totalPay)}</span>
                      </div>
                    </div>

                    {stub.driverNotes && (
                      <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-3">
                        <p className="text-xs font-medium text-yellow-700 dark:text-yellow-400 mb-1">Nota del Driver:</p>
                        <p className="text-sm text-yellow-700 dark:text-yellow-300">{stub.driverNotes}</p>
                      </div>
                    )}

                    {/* Actions */}
                    <div className="flex gap-2 flex-wrap">
                      {stub.status === "draft" && (
                        <Button
                          size="sm"
                          onClick={() => sendMutation.mutate({ id: stub.id })}
                          disabled={sendMutation.isPending}
                          className="gap-2"
                        >
                          <Send className="h-3.5 w-3.5" />
                          Enviar al Driver
                        </Button>
                      )}
                      {stub.status === "disputed" && (
                        <div className="flex items-center gap-2 text-sm text-red-600 dark:text-red-400">
                          <XCircle className="h-4 w-4" />
                          Driver en desacuerdo — contactar para resolver
                        </div>
                      )}
                      {stub.status === "approved" && (
                        <div className="flex items-center gap-2 text-sm text-green-600 dark:text-green-400">
                          <CheckCircle className="h-4 w-4" />
                          Aprobado por el driver
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Generate Dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Generar Pay Stub Semanal</DialogTitle>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(v => generateMutation.mutate({ ...v, driverId: parseInt(v.driverId) }))} className="space-y-4">
              <FormField control={form.control} name="driverId" render={({ field }) => (
                <FormItem>
                  <FormLabel>Driver</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger><SelectValue placeholder="Seleccionar driver..." /></SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {drivers?.filter(d => d.status === "active").map(d => (
                        <SelectItem key={d.id} value={d.id.toString()}>
                          {d.firstName} {d.lastName}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )} />
              <div className="grid grid-cols-2 gap-3">
                <FormField control={form.control} name="weekStart" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Inicio de Semana</FormLabel>
                    <FormControl><Input type="date" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="weekEnd" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Fin de Semana</FormLabel>
                    <FormControl><Input type="date" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
              </div>
              <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-3 text-sm text-blue-700 dark:text-blue-300">
                El sistema calculará automáticamente: paquetes entregados, doubles, pago bruto y penalidades del período seleccionado.
              </div>
              <div className="flex gap-3 pt-2">
                <Button type="button" variant="outline" className="flex-1" onClick={() => setOpen(false)}>
                  Cancelar
                </Button>
                <Button type="submit" className="flex-1" disabled={generateMutation.isPending}>
                  {generateMutation.isPending ? "Calculando..." : "Generar Pay Stub"}
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
