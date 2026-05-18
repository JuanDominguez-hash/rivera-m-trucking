import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(value: number | string | null | undefined): string {
  const num = typeof value === "string" ? parseFloat(value) : (value ?? 0);
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(num);
}

export function formatDate(dateStr: string | Date | null | undefined): string {
  if (!dateStr) return "-";
  const d = dateStr instanceof Date ? dateStr : new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

export function formatDateShort(dateStr: string | Date | null | undefined): string {
  if (!dateStr) return "-";
  const d = dateStr instanceof Date ? dateStr : new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export function getWeekRange(date: Date = new Date()): { weekStart: string; weekEnd: string } {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  const monday = new Date(d.setDate(diff));
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  return {
    weekStart: monday.toISOString().split("T")[0],
    weekEnd: sunday.toISOString().split("T")[0],
  };
}

export function getPayStubStatusColor(status: string): string {
  switch (status) {
    case "approved": return "badge-success";
    case "sent": return "badge-warning";
    case "disputed": return "badge-danger";
    default: return "badge-neutral";
  }
}

export function getPayStubStatusLabel(status: string): string {
  switch (status) {
    case "draft": return "Borrador";
    case "sent": return "Enviado";
    case "approved": return "Aprobado";
    case "disputed": return "En Disputa";
    default: return status;
  }
}

export function getDriverStatusColor(status: string): string {
  return status === "active" ? "badge-success" : "badge-danger";
}

export function getDriverStatusLabel(status: string): string {
  return status === "active" ? "Activo" : "Inactivo";
}

export function todayString(): string {
  return new Date().toISOString().split("T")[0];
}

export function yearStart(year: number): string {
  return `${year}-01-01`;
}

export function yearEnd(year: number): string {
  return `${year}-12-31`;
}
