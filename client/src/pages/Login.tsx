import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod/v4";
import { toast } from "sonner";
import { Truck, Eye, EyeOff, LogIn } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { trpc } from "@/lib/trpc";

const APP_NAME = import.meta.env.VITE_APP_NAME || "Rivera M Trucking";

const loginSchema = z.object({
  email: z.string().email("Email inválido"),
  password: z.string().min(1, "Contraseña requerida"),
});

type LoginForm = z.infer<typeof loginSchema>;

export default function Login() {
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const { register, handleSubmit, setValue, formState: { errors } } = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = async (data: LoginForm) => {
    setLoading(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(data),
      });

      if (!res.ok) {
        const err = await res.json();
        toast.error(err.error || "Credenciales inválidas");
        return;
      }

      toast.success("Sesión iniciada correctamente");
      window.location.href = "/";
    } catch (e) {
      toast.error("Error de conexión. Intenta de nuevo.");
    } finally {
      setLoading(false);
    }
  };

  const fillDemo = (role: "admin" | "driver") => {
    if (role === "admin") {
      setValue("email", "admin@rivera.com");
      setValue("password", "admin123");
    } else {
      setValue("email", "driver1@rivera.com");
      setValue("password", "driver123");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 to-slate-800 p-4">
      <div className="w-full max-w-md space-y-6">
        {/* Logo / Header */}
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-blue-600 mb-4">
            <Truck className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-white">{APP_NAME}</h1>
          <p className="text-slate-400 mt-1">Sistema de gestión de conductores</p>
        </div>

        {/* Login Card */}
        <Card className="border-slate-700 bg-slate-800/50 backdrop-blur">
          <CardHeader>
            <CardTitle className="text-white">Iniciar Sesión</CardTitle>
            <CardDescription className="text-slate-400">
              Ingresa tus credenciales para acceder
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email" className="text-slate-200">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="correo@ejemplo.com"
                  className="bg-slate-700 border-slate-600 text-white placeholder:text-slate-400"
                  {...register("email")}
                />
                {errors.email && (
                  <p className="text-red-400 text-sm">{errors.email.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="password" className="text-slate-200">Contraseña</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="••••••••"
                    className="bg-slate-700 border-slate-600 text-white placeholder:text-slate-400 pr-10"
                    {...register("password")}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {errors.password && (
                  <p className="text-red-400 text-sm">{errors.password.message}</p>
                )}
              </div>

              <Button
                type="submit"
                className="w-full bg-blue-600 hover:bg-blue-700"
                disabled={loading}
              >
                {loading ? (
                  <span className="flex items-center gap-2">
                    <span className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full" />
                    Ingresando...
                  </span>
                ) : (
                  <span className="flex items-center gap-2">
                    <LogIn className="w-4 h-4" />
                    Ingresar
                  </span>
                )}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Demo credentials */}
        <Card className="border-slate-600 bg-slate-800/30">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-slate-300">Credenciales de demostración</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex items-center justify-between bg-slate-700/50 rounded-lg p-3">
              <div>
                <p className="text-xs text-slate-400 uppercase font-semibold">Admin</p>
                <p className="text-sm text-white font-mono">admin@rivera.com</p>
                <p className="text-xs text-slate-400 font-mono">admin123</p>
              </div>
              <Button
                size="sm"
                variant="outline"
                className="border-slate-500 text-slate-200 hover:bg-slate-600"
                onClick={() => fillDemo("admin")}
              >
                Usar
              </Button>
            </div>
            <div className="flex items-center justify-between bg-slate-700/50 rounded-lg p-3">
              <div>
                <p className="text-xs text-slate-400 uppercase font-semibold">Driver</p>
                <p className="text-sm text-white font-mono">driver1@rivera.com</p>
                <p className="text-xs text-slate-400 font-mono">driver123</p>
              </div>
              <Button
                size="sm"
                variant="outline"
                className="border-slate-500 text-slate-200 hover:bg-slate-600"
                onClick={() => fillDemo("driver")}
              >
                Usar
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
