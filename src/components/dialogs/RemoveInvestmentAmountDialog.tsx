import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { MinusCircle } from "@/lib/icons";
import { format } from "@/lib/date";

// Usaremos a interface AggregatedInvestment para tipar o investimento alvo
interface AggregatedInvestment {
  name: string;
  type: string;
  totalAmountInvested: number;
  totalCurrentValue: number;
  totalQuantity: number | null;
  averagePrice: number | null;
  firstInvestedAt: string;
  recordIds: string[];
  goalIds: (string | null)[]; // Adicionado para saber quais metas estão vinculadas
}

interface RemoveInvestmentAmountDialogProps {
  investment: AggregatedInvestment | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export const RemoveInvestmentAmountDialog = ({ investment, isOpen, onClose, onSuccess }: RemoveInvestmentAmountDialogProps) => {
  const [loading, setLoading] = useState(false);
  const [amountToRemove, setAmountToRemove] = useState("");
  const [removalDate, setRemovalDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const { toast } = useToast();

  useEffect(() => {
    if (isOpen) {
      setAmountToRemove("");
      setRemovalDate(format(new Date(), "yyyy-MM-dd"));
    }
  }, [isOpen, investment]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!investment || !amountToRemove) {
      toast({
        title: "Erro",
        description: "Informe o valor a ser removido",
        variant: "destructive",
      });
      return;
    }

    const removalAmount = parseFloat(amountToRemove);
    if (isNaN(removalAmount) || removalAmount <= 0) {
      toast({
        title: "Erro",
        description: "O valor a ser removido deve ser positivo",
        variant: "destructive",
      });
      return;
    }

    if (removalAmount > investment.totalCurrentValue) {
      toast({
        title: "Atenção",
        description: "O valor a remover é maior que o valor atual do investimento.",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) throw new Error("Usuário não autenticado");

      // Tenta encontrar o goal_id mais recente associado a este grupo de investimentos
      // Assume-se que a retirada afeta a meta associada ao último aporte, ou a mais comum
      const associatedGoalId = investment.goalIds.find((id) => id !== null) || null;

      // Criar um NOVO registro com valor NEGATIVO
      const { error } = await supabase.from("investments").insert({
        user_id: user.id,
        name: investment.name,
        type: investment.type,
        amount: -removalAmount, // Valor negativo
        current_value: -removalAmount, // Valor atual negativo também
        quantity: null,
        unit_price: null,
        created_at: new Date(removalDate + "T00:00:00").toISOString(),
        goal_id: associatedGoalId, // Mantém o vínculo com a meta para histórico
      });

      if (error) throw error;

      // Atualizar a Meta (subtrair valor)
      if (associatedGoalId) {
        const { data: goalData } = await supabase.from("investment_goals").select("current_amount").eq("id", associatedGoalId).single();

        if (goalData) {
          const newGoalAmount = (goalData.current_amount || 0) - removalAmount;
          await supabase.from("investment_goals").update({ current_amount: newGoalAmount }).eq("id", associatedGoalId);
        }
      }

      toast({
        title: "Sucesso",
        description: `Valor de ${removalAmount.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })} removido de ${
          investment.name
        }!`,
      });

      onClose();
      onSuccess?.();
    } catch (error) {
      console.error("Erro ao remover valor do investimento:", error);
      toast({
        title: "Erro",
        description: "Erro ao remover valor. Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  if (!investment) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MinusCircle className="h-5 w-5 text-destructive" />
            Remover Valor do Investimento
          </DialogTitle>
          <DialogDescription>Remova um valor específico de "{investment.name}". Isso criará um registro de saída.</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1">
            <p className="text-sm font-medium">Investimento:</p>
            <p className="text-sm text-muted-foreground">
              {investment.name} ({investment.type})
            </p>
            <p className="text-sm text-muted-foreground">
              Valor Atual: {investment.totalCurrentValue.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="amountToRemove">Valor a Remover *</Label>
            <Input
              id="amountToRemove"
              type="number"
              step="0.01"
              min="0.01"
              placeholder="0,00"
              value={amountToRemove}
              onChange={(e) => setAmountToRemove(e.target.value)}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="removalDate">Data da Remoção *</Label>
            <Input id="removalDate" type="date" value={removalDate} onChange={(e) => setRemovalDate(e.target.value)} required />
          </div>

          <div className="flex gap-2 pt-4">
            <Button type="button" variant="outline" className="flex-1" onClick={onClose}>
              Cancelar
            </Button>
            <Button type="submit" variant="destructive" className="flex-1" disabled={loading}>
              {loading ? "Removendo..." : "Confirmar Remoção"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
