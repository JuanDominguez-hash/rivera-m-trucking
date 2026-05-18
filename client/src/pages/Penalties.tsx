import { trpc } from "@/lib/trpc";
import { formatCurrency, formatDate, todayString } from "@/lib/utils";
import { zodResolver } from "@hookform/resolvers/zod";
import { AlertTriangle, Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod/v4";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const penaltySchema = z.object({
  driverId: z.string().min(1, "Selecciona un driver"),
  description: z.string().min(1, "Requerido").max(500),
  amount: z.string().min(1, "Requerido"),
  penaltyDate: z.string().min(1, "Requerido"),
});

type PenaltyForm = z.infer<typeof penaltySchema>;

export default function PenaltiesPage() {
  const [open, setOpen] = useState(false);
  const [filterDriver, setFilterDriver] = useState<string>("all");
  const utils = trpc.useUtils();

  const { data: drivers } = trpc.drivers.list.useQuery();
  const { data: penalties, isLoading } = trpc.penalties.list.useQuery(
    filterDriver !== "all" ? { driverId: parseInt(filterDriver) } : {}
  );

  const form = useForm<PenaltyForm>({
    resolver: zodResolver(penaltySchema),
    defaultValues: { amount: "100.00", penaltyDate: todayString() },
  });

  const createMutation = trpc.penalties.create.useMutation({
    onSuccess: () => {
      toast.success("Penalidad registrada");
      utils.penalties.list.invalidate();
      setOpen(false);
      form.reset({ amount: "100.00", penaltyDate: todayString() });
    },
    onError: (e) => toast.error(e.message),
  });

  const deleteMutation = trpc.penalties.delete.useMutation({
    onSuccess: () => {
      toast.success("Penalidad eliminada");
      utils.penalties.list.invalidate();
    },
    onError: (e) => toast.error(e.message),
  });

  const totalPenalties = penalties?.reduce((s, p) => s + parseFloat(p.penalty.amount ?? "0"), 0) ?? 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <AlertTriangle className="h-6 w-6 text-red-500" />
            Penalidades
          </h1>
          <p className="text-muted-foreground text-sm mt-1">Multas y deducciones por driver</p>
        </div>
        <Button onClick={() => setOpen(true)} variant="destructive" className="gap-2">
          <Plus className="h-4 w-4" />
          <span className="hidden sm:inline">Nueva Penalidad</span>
        </Button>
      </div>

      {/* Info Banner */}
      <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-4 flex items-start gap-3">
        <AlertTriangle className="h-4 w-4 text-red-600 dark:text-red-400 mt-0.5 shrink-0" />
        <p className="text-sm text-red-700 dark:text-red-300">
          Las penalidades se descuentan automáticamente del pago total al generar el pay stub semanal. La penalidad estándar por paquete perdido es <strong>$100.00</strong>.
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-card border border-border rounded-xl p-4 text-center">
          <p className="text-2xl font-bold text-red-500 dark:text-red-400">{penalties?.length ?? 0}</p>
          <p className="text-xs text-muted-foreground mt-0.5">Total Penalidades</p>
        </div>
        <div className="bg-card border border-border rounded-xl p-4 text-center">
          <p className="text-2xl font-bold text-red-500 dark:text-red-400">{formatCurrency(totalPenalties)}</p>
          <p className="text-xs text-muted-foreground mt-0.5">Monto Total</p>
        </div>
      </div>

      {/* Filter */}
      <Select value={filterDriver} onValueChange={setFilterDriver}>
        <SelectTrigger className="w-56">
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

      {/* List */}
      {isLoading ? (
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="bg-card border border-border rounded-xl p-4 animate-pulse h-20" />
          ))}
        </div>
      ) : !penalties || penalties.length === 0 ? (
        <div className="bg-card border border-border rounded-xl p-12 text-center">
          <AlertTriangle className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
          <p className="text-muted-foreground font-medium">Sin penalidades registradas</p>
        </div>
      ) : (
        <div className="space-y-2">
          {penalties.map(({ penalty, driver }) => (
            <div
              key={penalty.id}
              className="bg-card border border-red-200 dark:border-red-900/40 rounded-xl p-4 flex items-center gap-4 hover:border-red-300 transition-all"
            >
              <div className="h-10 w-10 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center shrink-0">
                <AlertTriangle className="h-5 w-5 text-red-500 dark:text-red-400" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <p className="font-semibold text-foreground text-sm">
                      {driver?.firstName} {driver?.lastName}
                    </p>
                    <p className="text-xs text-muted-foreground">{formatDate(penalty.penaltyDate)}</p>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <span className="text-lg font-bold text-red-600 dark:text-red-400">
                      -{formatCurrency(penalty.amount)}
                    </span>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-muted-foreground hover:text-destructive"
                      onClick={() => {
                        if (confirm("¿Eliminar esta penalidad?")) {
                          deleteMutation.mutate({ id: penalty.id });
                        }
                      }}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
                <p className="text-sm text-muted-foreground mt-1">{penalty.description}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Nueva Penalidad</DialogTitle>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(v => createMutation.mutate({ ...v, driverId: parseInt(v.driverId) }))} className="space-y-4">
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
              <FormField control={form.control} name="description" render={({ field }) => (
                <FormItem>
                  <FormLabel>Descripción</FormLabel>
                  <FormControl>
                    <Input placeholder="Ej: Paquete perdido sin screenshot" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <div className="grid grid-cols-2 gap-3">
                <FormField control={form.control} name="amount" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Monto ($)</FormLabel>
                    <FormControl>
                      <Input type="number" step="0.01" min="0" placeholder="100.00" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="penaltyDate" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Fecha</FormLabel>
                    <FormControl><Input type="date" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
              </div>
              <div className="flex gap-3 pt-2">
                <Button type="button" variant="outline" className="flex-1" onClick={() => setOpen(false)}>
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  variant="destructive"
                  className="flex-1"
                  disabled={createMutation.isPending}
                >
                  Registrar Penalidad
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
