import { trpc } from "@/lib/trpc";
import { cn, formatCurrency } from "@/lib/utils";
import { zodResolver } from "@hookform/resolvers/zod";
import { Edit2, MapPin, Plus, Search, Trash2 } from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod/v4";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const routeSchema = z.object({
  routeNumber: z.string().min(1, "Requerido").max(32),
  zone: z.string().optional(),
  description: z.string().optional(),
  ratePerPackage: z.string().min(1, "Requerido"),
  ratePerDouble: z.string().min(1, "Requerido"),
  status: z.enum(["active", "inactive"]),
});

type RouteForm = z.infer<typeof routeSchema>;

export default function RoutesPage() {
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const utils = trpc.useUtils();

  const { data: routes, isLoading } = trpc.routes.list.useQuery();

  const form = useForm<RouteForm>({
    resolver: zodResolver(routeSchema),
    defaultValues: { status: "active", ratePerPackage: "2.00", ratePerDouble: "0.80" },
  });

  const createMutation = trpc.routes.create.useMutation({
    onSuccess: () => {
      toast.success("Ruta creada exitosamente");
      utils.routes.list.invalidate();
      setOpen(false);
      form.reset({ status: "active", ratePerPackage: "2.00", ratePerDouble: "0.80" });
    },
    onError: (e) => toast.error(e.message),
  });

  const updateMutation = trpc.routes.update.useMutation({
    onSuccess: () => {
      toast.success("Ruta actualizada");
      utils.routes.list.invalidate();
      setOpen(false);
      setEditId(null);
    },
    onError: (e) => toast.error(e.message),
  });

  const deleteMutation = trpc.routes.delete.useMutation({
    onSuccess: () => {
      toast.success("Ruta eliminada");
      utils.routes.list.invalidate();
    },
    onError: (e) => toast.error(e.message),
  });

  const filtered = routes?.filter(r =>
    `${r.routeNumber} ${r.zone ?? ""}`.toLowerCase().includes(search.toLowerCase())
  ) ?? [];

  function openCreate() {
    setEditId(null);
    form.reset({ status: "active", ratePerPackage: "2.00", ratePerDouble: "0.80" });
    setOpen(true);
  }

  function openEdit(r: NonNullable<typeof routes>[number]) {
    setEditId(r.id);
    form.reset({
      routeNumber: r.routeNumber,
      zone: r.zone ?? "",
      description: r.description ?? "",
      ratePerPackage: r.ratePerPackage,
      ratePerDouble: r.ratePerDouble,
      status: r.status,
    });
    setOpen(true);
  }

  function onSubmit(values: RouteForm) {
    if (editId) {
      updateMutation.mutate({ id: editId, ...values });
    } else {
      createMutation.mutate(values);
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <MapPin className="h-6 w-6 text-primary" />
            Rutas
          </h1>
          <p className="text-muted-foreground text-sm mt-1">Gestión de rutas y tarifas por paquete</p>
        </div>
        <Button onClick={openCreate} className="gap-2">
          <Plus className="h-4 w-4" />
          <span className="hidden sm:inline">Nueva Ruta</span>
        </Button>
      </div>

      {/* Info Banner */}
      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-4 flex items-start gap-3">
        <MapPin className="h-4 w-4 text-blue-600 dark:text-blue-400 mt-0.5 shrink-0" />
        <p className="text-sm text-blue-700 dark:text-blue-300">
          Las tarifas por ruta se guardan en el sistema y se aplican automáticamente al registrar actividad diaria. Solo el administrador puede modificarlas.
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-card border border-border rounded-xl p-4 text-center">
          <p className="text-2xl font-bold text-green-600 dark:text-green-400">
            {routes?.filter(r => r.status === "active").length ?? 0}
          </p>
          <p className="text-xs text-muted-foreground mt-0.5">Rutas Activas</p>
        </div>
        <div className="bg-card border border-border rounded-xl p-4 text-center">
          <p className="text-2xl font-bold text-muted-foreground">
            {routes?.filter(r => r.status === "inactive").length ?? 0}
          </p>
          <p className="text-xs text-muted-foreground mt-0.5">Inactivas</p>
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Buscar por número o zona..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      {/* List */}
      {isLoading ? (
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="bg-card border border-border rounded-xl p-4 animate-pulse h-20" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-card border border-border rounded-xl p-12 text-center">
          <MapPin className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
          <p className="text-muted-foreground font-medium">
            {search ? "No se encontraron rutas" : "No hay rutas registradas"}
          </p>
          {!search && (
            <Button onClick={openCreate} variant="outline" className="mt-4 gap-2">
              <Plus className="h-4 w-4" />
              Crear primera ruta
            </Button>
          )}
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map(r => (
            <div
              key={r.id}
              className="bg-card border border-border rounded-xl p-4 flex items-center gap-4 hover:border-primary/30 transition-all"
            >
              <div className="h-10 w-10 rounded-full bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center shrink-0">
                <MapPin className="h-5 w-5 text-purple-600 dark:text-purple-400" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="font-semibold text-foreground font-mono">#{r.routeNumber}</p>
                  {r.zone && <p className="text-sm text-muted-foreground">{r.zone}</p>}
                  <span className={cn(
                    "text-xs px-2 py-0.5 rounded-full font-medium",
                    r.status === "active" ? "badge-success" : "badge-danger"
                  )}>
                    {r.status === "active" ? "Activa" : "Inactiva"}
                  </span>
                </div>
                <div className="flex items-center gap-4 mt-1">
                  <div className="flex items-center gap-1">
                    <span className="text-xs text-muted-foreground">Paquete:</span>
                    <span className="text-xs font-semibold text-green-600 dark:text-green-400">
                      {formatCurrency(r.ratePerPackage)}
                    </span>
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="text-xs text-muted-foreground">Double:</span>
                    <span className="text-xs font-semibold text-blue-600 dark:text-blue-400">
                      {formatCurrency(r.ratePerDouble)}
                    </span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-muted-foreground hover:text-foreground"
                  onClick={() => openEdit(r)}
                >
                  <Edit2 className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-muted-foreground hover:text-destructive"
                  onClick={() => {
                    if (confirm(`¿Eliminar ruta #${r.routeNumber}?`)) {
                      deleteMutation.mutate({ id: r.id });
                    }
                  }}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editId ? "Editar Ruta" : "Nueva Ruta"}</DialogTitle>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <FormField control={form.control} name="routeNumber" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Número de Ruta</FormLabel>
                    <FormControl><Input placeholder="333" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="zone" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Zona</FormLabel>
                    <FormControl><Input placeholder="Philadelphia" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <FormField control={form.control} name="ratePerPackage" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tarifa por Paquete ($)</FormLabel>
                    <FormControl>
                      <Input type="number" step="0.01" min="0" placeholder="2.00" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="ratePerDouble" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tarifa Double/Return ($)</FormLabel>
                    <FormControl>
                      <Input type="number" step="0.01" min="0" placeholder="0.80" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
              </div>
              <FormField control={form.control} name="description" render={({ field }) => (
                <FormItem>
                  <FormLabel>Descripción (opcional)</FormLabel>
                  <FormControl><Input placeholder="Descripción de la ruta..." {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="status" render={({ field }) => (
                <FormItem>
                  <FormLabel>Estado</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="active">Activa</SelectItem>
                      <SelectItem value="inactive">Inactiva</SelectItem>
                    </SelectContent>
                  </Select>
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
                  disabled={createMutation.isPending || updateMutation.isPending}
                >
                  {editId ? "Guardar Cambios" : "Crear Ruta"}
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
