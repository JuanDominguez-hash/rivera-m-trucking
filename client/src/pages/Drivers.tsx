import { trpc } from "@/lib/trpc";
import { cn, formatDate, getDriverStatusColor, getDriverStatusLabel } from "@/lib/utils";
import { zodResolver } from "@hookform/resolvers/zod";
import { Camera, Edit2, Eye, EyeOff, Image, Plus, Search, Trash2, Users } from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod/v4";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";

// Helper: mask SSN showing only last 4 digits
function maskSSN(last4?: string | null): string {
  if (!last4) return "***-**-****";
  return `***-**-${last4}`;
}

const driverSchema = z.object({
  driverCode: z.string().min(1, "Requerido").max(32),
  firstName: z.string().min(1, "Requerido").max(100),
  lastName: z.string().min(1, "Requerido").max(100),
  phone: z.string().optional(),
  email: z.string().optional(),
  address: z.string().optional(),
  ssnLast4: z.string().max(4).optional(),
  password: z.string().optional(),
  status: z.enum(["active", "inactive"]),
});

type DriverForm = z.infer<typeof driverSchema>;

export default function DriversPage() {
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [photosDriverId, setPhotosDriverId] = useState<number | null>(null);
  const utils = trpc.useUtils();

  const { data: drivers, isLoading } = trpc.drivers.list.useQuery();
  const { data: driverPhotos } = trpc.drivers.photos.useQuery(
    { driverId: photosDriverId! },
    { enabled: !!photosDriverId }
  );

  const form = useForm<DriverForm>({
    resolver: zodResolver(driverSchema),
    defaultValues: { status: "active" },
  });

  const createMutation = trpc.drivers.create.useMutation({
    onSuccess: () => {
      toast.success("Driver creado exitosamente");
      utils.drivers.list.invalidate();
      setOpen(false);
      form.reset({ status: "active" });
    },
    onError: (e) => toast.error(e.message),
  });

  const updateMutation = trpc.drivers.update.useMutation({
    onSuccess: () => {
      toast.success("Driver actualizado");
      utils.drivers.list.invalidate();
      setOpen(false);
      setEditId(null);
      form.reset({ status: "active" });
    },
    onError: (e) => toast.error(e.message),
  });

  const deleteMutation = trpc.drivers.delete.useMutation({
    onSuccess: () => {
      toast.success("Driver eliminado");
      utils.drivers.list.invalidate();
    },
    onError: (e) => toast.error(e.message),
  });

  const deletePhotoMutation = trpc.drivers.deletePhoto.useMutation({
    onSuccess: () => {
      toast.success("Foto eliminada");
      utils.drivers.photos.invalidate({ driverId: photosDriverId! });
    },
    onError: (e) => toast.error(e.message),
  });

  const filtered = drivers?.filter(d =>
    `${d.firstName} ${d.lastName} ${d.driverCode}`.toLowerCase().includes(search.toLowerCase())
  ) ?? [];

  function openCreate() {
    setEditId(null);
    form.reset({ status: "active" });
    setShowPassword(false);
    setOpen(true);
  }

  function openEdit(d: any) {
    if (!d) return;
    setEditId(d.id);
    form.reset({
      driverCode: d.driverCode,
      firstName: d.firstName,
      lastName: d.lastName,
      phone: d.phone ?? "",
      email: d.email ?? "",
      address: d.address ?? "",
      ssnLast4: d.ssnLast4 ?? "",
      password: d.password ?? "",
      status: d.status,
    });
    setShowPassword(false);
    setOpen(true);
  }

  function onSubmit(values: DriverForm) {
    if (editId) {
      updateMutation.mutate({ id: editId, ...values });
    } else {
      createMutation.mutate(values);
    }
  }

  const activeCount = drivers?.filter(d => d.status === "active").length ?? 0;
  const inactiveCount = drivers?.filter(d => d.status === "inactive").length ?? 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Users className="h-6 w-6 text-primary" />
            Drivers
          </h1>
          <p className="text-muted-foreground text-sm mt-1">Gestión de conductores registrados</p>
        </div>
        <Button onClick={openCreate} className="gap-2">
          <Plus className="h-4 w-4" />
          <span className="hidden sm:inline">Nuevo Driver</span>
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-card border border-border rounded-xl p-4 text-center">
          <p className="text-2xl font-bold text-foreground">{drivers?.length ?? 0}</p>
          <p className="text-xs text-muted-foreground mt-0.5">Total</p>
        </div>
        <div className="bg-card border border-border rounded-xl p-4 text-center">
          <p className="text-2xl font-bold text-green-600 dark:text-green-400">{activeCount}</p>
          <p className="text-xs text-muted-foreground mt-0.5">Activos</p>
        </div>
        <div className="bg-card border border-border rounded-xl p-4 text-center">
          <p className="text-2xl font-bold text-red-500 dark:text-red-400">{inactiveCount}</p>
          <p className="text-xs text-muted-foreground mt-0.5">Inactivos</p>
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Buscar por nombre o código..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      {/* List */}
      {isLoading ? (
        <div className="space-y-3">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="bg-card border border-border rounded-xl p-4 animate-pulse h-20" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-card border border-border rounded-xl p-12 text-center">
          <Users className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
          <p className="text-muted-foreground font-medium">
            {search ? "No se encontraron drivers" : "No hay drivers registrados"}
          </p>
          {!search && (
            <Button onClick={openCreate} variant="outline" className="mt-4 gap-2">
              <Plus className="h-4 w-4" />
              Crear primer driver
            </Button>
          )}
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map(d => (
            <div
              key={d.id}
              className="bg-card border border-border rounded-xl p-4 flex items-center gap-4 hover:border-primary/30 transition-all"
            >
              <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-sm font-bold text-primary shrink-0">
                {d.firstName.charAt(0)}{d.lastName.charAt(0)}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="font-semibold text-foreground">{d.firstName} {d.lastName}</p>
                  <span className={cn("text-xs px-2 py-0.5 rounded-full font-medium", getDriverStatusColor(d.status))}>
                    {getDriverStatusLabel(d.status)}
                  </span>
                </div>
                <div className="flex items-center gap-3 mt-0.5 flex-wrap">
                  <p className="text-xs text-muted-foreground">
                    ID/DVR: <span className="font-mono font-medium text-foreground">{d.driverCode}</span>
                  </p>
                  {d.ssnLast4 && (
                    <p className="text-xs text-muted-foreground">
                      SSN: <span className="font-mono">{maskSSN(d.ssnLast4)}</span>
                    </p>
                  )}
                  {d.phone && <p className="text-xs text-muted-foreground">{d.phone}</p>}
                  {d.email && <p className="text-xs text-muted-foreground hidden sm:block">{d.email}</p>}
                </div>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-muted-foreground hover:text-blue-500"
                  title="Ver fotos"
                  onClick={() => setPhotosDriverId(d.id)}
                >
                  <Camera className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-muted-foreground hover:text-foreground"
                  onClick={() => openEdit(d)}
                >
                  <Edit2 className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-muted-foreground hover:text-destructive"
                  onClick={() => {
                    if (confirm(`¿Eliminar a ${d.firstName} ${d.lastName}?`)) {
                      deleteMutation.mutate({ id: d.id });
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

      {/* Create/Edit Dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editId ? "Editar Driver" : "Nuevo Driver"}</DialogTitle>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <FormField control={form.control} name="firstName" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nombre</FormLabel>
                    <FormControl><Input placeholder="Juan" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="lastName" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Apellido</FormLabel>
                    <FormControl><Input placeholder="Domínguez" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <FormField control={form.control} name="driverCode" render={({ field }) => (
                  <FormItem>
                    <FormLabel>ID/DVR</FormLabel>
                    <FormControl><Input placeholder="JD-001" {...field} /></FormControl>
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
                        <SelectItem value="active">Activo</SelectItem>
                        <SelectItem value="inactive">Inactivo</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )} />
              </div>
              <FormField control={form.control} name="phone" render={({ field }) => (
                <FormItem>
                  <FormLabel>Teléfono</FormLabel>
                  <FormControl><Input placeholder="+1 (555) 000-0000" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="email" render={({ field }) => (
                <FormItem>
                  <FormLabel>Email</FormLabel>
                  <FormControl><Input placeholder="driver@email.com" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="address" render={({ field }) => (
                <FormItem>
                  <FormLabel>Dirección</FormLabel>
                  <FormControl><Input placeholder="123 Main St, City, State" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <div className="grid grid-cols-2 gap-3">
                <FormField control={form.control} name="ssnLast4" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Últimos 4 del SSN</FormLabel>
                    <FormControl><Input placeholder="1234" maxLength={4} {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="password" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Contraseña del Driver</FormLabel>
                    <div className="relative">
                      <FormControl>
                        <Input
                          type={showPassword ? "text" : "password"}
                          placeholder="Asignar contraseña"
                          className="pr-10"
                          {...field}
                        />
                      </FormControl>
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                      >
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
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
                  className="flex-1"
                  disabled={createMutation.isPending || updateMutation.isPending}
                >
                  {editId ? "Guardar Cambios" : "Crear Driver"}
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Photos Dialog */}
      <Dialog open={!!photosDriverId} onOpenChange={() => setPhotosDriverId(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Camera className="h-5 w-5" />
              Fotos del Driver
            </DialogTitle>
          </DialogHeader>
          {!driverPhotos || driverPhotos.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Image className="h-12 w-12 mx-auto mb-3 opacity-30" />
              <p>Este driver no ha subido fotos aún</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {driverPhotos.map(photo => (
                <div key={photo.id} className="relative group rounded-lg overflow-hidden border border-border">
                  <img
                    src={photo.photoUrl}
                    alt={photo.caption || "Foto del driver"}
                    className="w-full h-32 object-cover"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = "https://placehold.co/200x150?text=Error";
                    }}
                  />
                  <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-2">
                    <div className="flex-1">
                      {photo.caption && <p className="text-white text-xs">{photo.caption}</p>}
                      <p className="text-white/60 text-xs">{new Date(photo.createdAt).toLocaleDateString()}</p>
                    </div>
                    <Button
                      size="icon"
                      variant="destructive"
                      className="h-7 w-7"
                      onClick={() => {
                        if (confirm("¿Eliminar esta foto?")) {
                          deletePhotoMutation.mutate({ id: photo.id });
                        }
                      }}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
