import { trpc } from "@/lib/trpc";
import { Camera, Image, Plus, Trash2, Upload } from "lucide-react";
import { useRef, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

async function uploadToSupabase(file: File, driverId: number): Promise<string> {
  const ext = file.name.split(".").pop() || "jpg";
  const filename = `driver-${driverId}/${Date.now()}.${ext}`;

  const res = await fetch(
    `${SUPABASE_URL}/storage/v1/object/driver-photos/${filename}`,
    {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${SUPABASE_ANON_KEY}`,
        "Content-Type": file.type,
        "x-upsert": "true",
      },
      body: file,
    }
  );

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Upload failed: ${err}`);
  }

  return `${SUPABASE_URL}/storage/v1/object/public/driver-photos/${filename}`;
}

export default function MyPhotosPage() {
  const [open, setOpen] = useState(false);
  const [caption, setCaption] = useState("");
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const utils = trpc.useUtils();

  const { data: driver } = trpc.drivers.myProfile.useQuery();
  const { data: photos, isLoading } = trpc.drivers.myPhotos.useQuery();

  const addPhotoMutation = trpc.drivers.addPhoto.useMutation({
    onSuccess: () => {
      toast.success("Foto subida exitosamente");
      utils.drivers.myPhotos.invalidate();
      setOpen(false);
      setCaption("");
      setPreview(null);
      setFile(null);
    },
    onError: (e) => toast.error(e.message),
  });

  const deletePhotoMutation = trpc.drivers.deletePhoto.useMutation({
    onSuccess: () => {
      toast.success("Foto eliminada");
      utils.drivers.myPhotos.invalidate();
    },
    onError: (e) => toast.error(e.message),
  });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    if (!f.type.startsWith("image/")) {
      toast.error("Solo se permiten imágenes");
      return;
    }
    if (f.size > 5 * 1024 * 1024) {
      toast.error("La imagen no puede superar 5MB");
      return;
    }
    setFile(f);
    const reader = new FileReader();
    reader.onload = (ev) => setPreview(ev.target?.result as string);
    reader.readAsDataURL(f);
  };

  const handleUpload = async () => {
    if (!file || !driver) {
      toast.error("Selecciona una imagen primero");
      return;
    }
    setUploading(true);
    try {
      const url = await uploadToSupabase(file, driver.id);
      await addPhotoMutation.mutateAsync({
        driverId: driver.id,
        photoUrl: url,
        caption: caption || undefined,
      });
    } catch (e: any) {
      toast.error(e.message || "Error al subir la foto");
    } finally {
      setUploading(false);
    }
  };

  if (!driver) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center text-muted-foreground">
          <Camera className="h-12 w-12 mx-auto mb-3 opacity-30" />
          <p>No se encontró perfil de driver asociado a tu cuenta.</p>
          <p className="text-sm mt-1">Contacta al administrador.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Camera className="h-6 w-6 text-primary" />
            Mis Fotos
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Sube y gestiona tus fotos de entrega
          </p>
        </div>
        <Button onClick={() => setOpen(true)} className="gap-2">
          <Plus className="h-4 w-4" />
          <span className="hidden sm:inline">Subir Foto</span>
        </Button>
      </div>

      {/* Stats */}
      <div className="bg-card border border-border rounded-xl p-4 flex items-center gap-4">
        <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
          <Camera className="h-6 w-6 text-primary" />
        </div>
        <div>
          <p className="font-semibold text-foreground">{driver.firstName} {driver.lastName}</p>
          <p className="text-sm text-muted-foreground">
            ID/DVR: <span className="font-mono font-medium">{driver.driverCode}</span>
            {" · "}
            <span>{photos?.length ?? 0} fotos subidas</span>
          </p>
        </div>
      </div>

      {/* Photos Grid */}
      {isLoading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="rounded-xl bg-muted animate-pulse aspect-square" />
          ))}
        </div>
      ) : !photos || photos.length === 0 ? (
        <div className="bg-card border border-border rounded-xl p-12 text-center">
          <Image className="h-12 w-12 text-muted-foreground/30 mx-auto mb-3" />
          <p className="text-muted-foreground font-medium">No has subido fotos aún</p>
          <p className="text-sm text-muted-foreground mt-1">
            Sube fotos de tus entregas para documentar tu trabajo
          </p>
          <Button onClick={() => setOpen(true)} variant="outline" className="mt-4 gap-2">
            <Upload className="h-4 w-4" />
            Subir primera foto
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
          {photos.map(photo => (
            <div
              key={photo.id}
              className="relative group rounded-xl overflow-hidden border border-border bg-card aspect-square"
            >
              <img
                src={photo.photoUrl}
                alt={photo.caption || "Foto de entrega"}
                className="w-full h-full object-cover"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = "https://placehold.co/200x200?text=Error";
                }}
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-end p-2">
                {photo.caption && (
                  <p className="text-white text-xs font-medium truncate">{photo.caption}</p>
                )}
                <p className="text-white/60 text-xs">
                  {new Date(photo.createdAt).toLocaleDateString()}
                </p>
                <Button
                  size="icon"
                  variant="destructive"
                  className="absolute top-2 right-2 h-7 w-7 opacity-0 group-hover:opacity-100"
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

      {/* Upload Dialog */}
      <Dialog open={open} onOpenChange={(v) => {
        setOpen(v);
        if (!v) {
          setPreview(null);
          setFile(null);
          setCaption("");
        }
      }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Upload className="h-5 w-5" />
              Subir Foto
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {/* Preview */}
            <div
              className="border-2 border-dashed border-border rounded-xl p-4 text-center cursor-pointer hover:border-primary/50 transition-colors"
              onClick={() => fileRef.current?.click()}
            >
              {preview ? (
                <img
                  src={preview}
                  alt="Preview"
                  className="max-h-48 mx-auto rounded-lg object-contain"
                />
              ) : (
                <div className="py-8">
                  <Camera className="h-10 w-10 text-muted-foreground/30 mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">
                    Haz clic para seleccionar una imagen
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">JPG, PNG, WEBP — máx. 5MB</p>
                </div>
              )}
            </div>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleFileChange}
            />

            {/* Caption */}
            <div className="space-y-2">
              <Label>Descripción (opcional)</Label>
              <Input
                placeholder="Ej: Entrega completada en 123 Main St"
                value={caption}
                onChange={e => setCaption(e.target.value)}
              />
            </div>

            <div className="flex gap-3">
              <Button
                type="button"
                variant="outline"
                className="flex-1"
                onClick={() => setOpen(false)}
              >
                Cancelar
              </Button>
              <Button
                className="flex-1 gap-2"
                onClick={handleUpload}
                disabled={!file || uploading}
              >
                {uploading ? (
                  <>
                    <span className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full" />
                    Subiendo...
                  </>
                ) : (
                  <>
                    <Upload className="h-4 w-4" />
                    Subir Foto
                  </>
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
