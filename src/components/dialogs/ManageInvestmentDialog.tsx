import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Settings, Trash2, MinusCircle } from "lucide-react";
import { format } from "@/lib/date";
import { recalculateGoalBalance } from "@/utils/investments/investmentUtils"; // Importe a função nova

interface AggregatedInvestment {
  name: string;
  type: string;
  totalAmountInvested: number;
  totalCurrentValue: number;
  recordIds: string[];
  goalIds: (string | null)[];
}

interface ManageInvestmentDialogProps {
  investment: AggregatedInvestment | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export const ManageInvestmentDialog = ({ investment, isOpen, onClose, onSuccess }: ManageInvestmentDialogProps) => {
  const [loading, setLoading] = useState(false);
  const [amountToRemove, setAmountToRemove] = useState("");
  const [removalDate, setRemovalDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [deleteAlertOpen, setDeleteAlertOpen] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (isOpen) {
      setAmountToRemove("");
      setRemovalDate(format(new Date(), "yyyy-MM-dd"));
    }
  }, [isOpen, investment]);

  // Ação 1: Retirada Parcial
  const handlePartialRemoval = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!investment || !amountToRemove) return;

    const removalVal = parseFloat(amountToRemove);
    if (isNaN(removalVal) || removalVal <= 0 || removalVal > investment.totalCurrentValue) {
      toast({ title: "Erro", description: "Valor inválido", variant: "destructive" });
      return;
    }

    setLoading(true);
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuário não logado");

      const associatedGoalId = investment.goalIds.find((id) => id !== null) || null;

      // Insere registro negativo (Retirada)
      const { error } = await supabase.from("investments").insert({
        user_id: user.id,
        name: investment.name,
        type: investment.type,
        amount: -removalVal,
        current_value: -removalVal,
        created_at: new Date(removalDate + "T00:00:00").toISOString(),
        goal_id: associatedGoalId,
      });

      if (error) throw error;

      // RECALCULA A META
      if (associatedGoalId) {
        await recalculateGoalBalance(associatedGoalId);
      }

      toast({ title: "Sucesso", description: "Resgate realizado!" });
      onClose();
      onSuccess?.();
    } catch (error) {
      toast({ title: "Erro", description: "Falha ao realizar resgate", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  // Ação 2: Exclusão Total
  const handleTotalDeletion = async () => {
    if (!investment) return;
    setLoading(true);
    try {
      const associatedGoalId = investment.goalIds.find((id) => id !== null);

      // Deleta todos os registros
      const { error } = await supabase.from("investments").delete().in("id", investment.recordIds);
      if (error) throw error;

      // RECALCULA A META (agora que os registros sumiram, a soma será atualizada corretamente)
      if (associatedGoalId) {
        await recalculateGoalBalance(associatedGoalId);
      }

      toast({ title: "Sucesso", description: "Investimento excluído!" });
      setDeleteAlertOpen(false);
      onClose();
      onSuccess?.();
    } catch (error) {
      toast({ title: "Erro", description: "Falha ao excluir", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  if (!investment) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5 text-primary" />
            Gerenciar: {investment.name}
          </DialogTitle>
          <DialogDescription>
            Saldo Atual: {investment.totalCurrentValue.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="partial" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="partial">Resgate Parcial</TabsTrigger>
            <TabsTrigger value="delete" className="text-destructive data-[state=active]:text-destructive">
              Exclusão Total
            </TabsTrigger>
          </TabsList>

          <TabsContent value="partial" className="space-y-4 py-4">
            <div className="space-y-4 border rounded-md p-4 bg-muted/20">
              <div className="flex items-start gap-3">
                <MinusCircle className="h-5 w-5 text-orange-500 mt-1" />
                <div className="text-sm text-muted-foreground">Registrar saque ou venda parcial.</div>
              </div>

              <form onSubmit={handlePartialRemoval} className="space-y-3">
                <div className="space-y-2">
                  <Label>Valor do Resgate</Label>
                  <Input type="number" step="0.01" value={amountToRemove} onChange={(e) => setAmountToRemove(e.target.value)} required />
                </div>
                <div className="space-y-2">
                  <Label>Data</Label>
                  <Input type="date" value={removalDate} onChange={(e) => setRemovalDate(e.target.value)} required />
                </div>
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? "Processando..." : "Confirmar Resgate"}
                </Button>
              </form>
            </div>
          </TabsContent>

          <TabsContent value="delete" className="space-y-4 py-4">
            <div className="space-y-4 border border-destructive/30 rounded-md p-4 bg-destructive/5">
              <div className="flex items-start gap-3">
                <Trash2 className="h-5 w-5 text-destructive mt-1" />
                <div className="text-sm text-destructive">
                  Isso apagará <strong>todo o histórico</strong> deste investimento.
                </div>
              </div>
              <Button variant="destructive" className="w-full" onClick={() => setDeleteAlertOpen(true)} disabled={loading}>
                Excluir Investimento Permanentemente
              </Button>
            </div>
          </TabsContent>
        </Tabs>

        <AlertDialog open={deleteAlertOpen} onOpenChange={setDeleteAlertOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Tem certeza absoluta?</AlertDialogTitle>
              <AlertDialogDescription>Ação irreversível. O saldo da meta será ajustado.</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={loading}>Cancelar</AlertDialogCancel>
              <AlertDialogAction onClick={handleTotalDeletion} className="bg-destructive hover:bg-destructive/90" disabled={loading}>
                {loading ? "Excluindo..." : "Sim, excluir tudo"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </DialogContent>
    </Dialog>
  );
};
