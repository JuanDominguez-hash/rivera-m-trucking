import { trpc } from "@/lib/trpc";
import { cn, formatCurrency, formatDate, getPayStubStatusColor, getPayStubStatusLabel } from "@/lib/utils";
import { CheckCircle, ChevronDown, ChevronUp, Receipt, XCircle } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function MyPayStubsPage() {
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [disputeId, setDisputeId] = useState<number | null>(null);
  const [disputeNote, setDisputeNote] = useState("");
  const utils = trpc.useUtils();

  const { data: payStubs, isLoading } = trpc.payStubs.myStubs.useQuery();

  const approveMutation = trpc.payStubs.approve.useMutation({
    onSuccess: () => {
      toast.success("Pay stub aprobado");
      utils.payStubs.myStubs.invalidate();
    },
    onError: (e) => toast.error(e.message),
  });

  const disputeMutation = trpc.payStubs.dispute.useMutation({
    onSuccess: () => {
      toast.success("Disputa enviada al administrador");
      utils.payStubs.myStubs.invalidate();
      setDisputeId(null);
      setDisputeNote("");
    },
    onError: (e) => toast.error(e.message),
  });

  const totalNet = payStubs?.filter(p => p.status === "approved").reduce((s, p) => s + parseFloat(String(p.totalPay ?? "0")), 0) ?? 0;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
          <Receipt className="h-6 w-6 text-primary" />
          Mis Pay Stubs
        </h1>
        <p className="text-muted-foreground text-sm mt-1">Comprobantes de pago semanales</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-card border border-border rounded-xl p-4 text-center">
          <p className="text-2xl font-bold text-foreground">{payStubs?.length ?? 0}</p>
          <p className="text-xs text-muted-foreground mt-0.5">Total Pay Stubs</p>
        </div>
        <div className="bg-card border border-border rounded-xl p-4 text-center">
          <p className="text-xl font-bold text-green-600 dark:text-green-400">{formatCurrency(totalNet)}</p>
          <p className="text-xs text-muted-foreground mt-0.5">Total Aprobado</p>
        </div>
      </div>

      {/* List */}
      {isLoading ? (
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="bg-card border border-border rounded-xl p-4 animate-pulse h-24" />
          ))}
        </div>
      ) : !payStubs || payStubs.length === 0 ? (
        <div className="bg-card border border-border rounded-xl p-12 text-center">
          <Receipt className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
          <p className="text-muted-foreground font-medium">Sin pay stubs disponibles</p>
          <p className="text-sm text-muted-foreground/70 mt-1">El administrador generará tu pay stub al final de la semana</p>
        </div>
      ) : (
        <div className="space-y-3">
          {payStubs.map(stub => {
            const isExpanded = expandedId === stub.id;
            return (
              <div
                key={stub.id}
                className={cn(
                  "bg-card border rounded-xl overflow-hidden transition-all",
                  stub.status === "disputed" ? "border-red-300 dark:border-red-800" :
                  stub.status === "approved" ? "border-green-300 dark:border-green-800" :
                  stub.status === "sent" ? "border-yellow-300 dark:border-yellow-800" :
                  "border-border"
                )}
              >
                <div
                  className="p-4 flex items-center gap-4 cursor-pointer hover:bg-muted/20"
                  onClick={() => setExpandedId(isExpanded ? null : stub.id)}
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-semibold text-foreground text-sm">
                        Semana: {formatDate(stub.weekStart)} — {formatDate(stub.weekEnd)}
                      </p>
                      <span className={cn("text-xs px-2 py-0.5 rounded-full font-medium", getPayStubStatusColor(stub.status))}>
                        {getPayStubStatusLabel(stub.status)}
                      </span>
                    </div>
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
                        <p className="text-sm font-bold text-red-500">-{formatCurrency(stub.totalPenalties)}</p>
                      </div>
                    </div>

                    {/* Pay breakdown */}
                    <div className="bg-card border border-border rounded-lg p-3 space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Pago Bruto</span>
                        <span className="font-medium">{formatCurrency(stub.grossPay)}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-red-500">Penalidades</span>
                        <span className="font-medium text-red-500">-{formatCurrency(stub.totalPenalties)}</span>
                      </div>
                      <div className="border-t border-border pt-2 flex justify-between">
                        <span className="font-semibold">Total Neto</span>
                        <span className="font-bold text-lg">{formatCurrency(stub.totalPay)}</span>
                      </div>
                    </div>

                    {/* Actions for sent stubs */}
                    {stub.status === "sent" && (
                      <div className="flex gap-3">
                        <Button
                          size="sm"
                          className="flex-1 gap-2 bg-green-600 hover:bg-green-700 text-white"
                          onClick={() => approveMutation.mutate({ id: stub.id })}
                          disabled={approveMutation.isPending}
                        >
                          <CheckCircle className="h-4 w-4" />
                          Aprobar Pago
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="flex-1 gap-2 border-red-300 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
                          onClick={() => setDisputeId(stub.id)}
                        >
                          <XCircle className="h-4 w-4" />
                          Disputar
                        </Button>
                      </div>
                    )}

                    {stub.status === "approved" && (
                      <div className="flex items-center gap-2 text-sm text-green-600 dark:text-green-400">
                        <CheckCircle className="h-4 w-4" />
                        Has aprobado este pago
                      </div>
                    )}

                    {stub.status === "disputed" && stub.driverNotes && (
                      <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3">
                        <p className="text-xs font-medium text-red-700 dark:text-red-400 mb-1">Tu nota de disputa:</p>
                        <p className="text-sm text-red-700 dark:text-red-300">{stub.driverNotes}</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Dispute Dialog */}
      <Dialog open={disputeId !== null} onOpenChange={() => { setDisputeId(null); setDisputeNote(""); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Disputar Pay Stub</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Explica por qué no estás de acuerdo con este pago. El administrador recibirá tu nota y se pondrá en contacto contigo.
            </p>
            <div className="space-y-2">
              <Label>Motivo de la disputa</Label>
              <Input
                placeholder="Ej: Los paquetes entregados no coinciden con mi registro..."
                value={disputeNote}
                onChange={e => setDisputeNote(e.target.value)}
              />
            </div>
            <div className="flex gap-3">
              <Button variant="outline" className="flex-1" onClick={() => { setDisputeId(null); setDisputeNote(""); }}>
                Cancelar
              </Button>
              <Button
                variant="destructive"
                className="flex-1"
                disabled={!disputeNote.trim() || disputeMutation.isPending}
                onClick={() => {
                  if (disputeId) {
                    disputeMutation.mutate({ id: disputeId, note: disputeNote });
                  }
                }}
              >
                Enviar Disputa
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
