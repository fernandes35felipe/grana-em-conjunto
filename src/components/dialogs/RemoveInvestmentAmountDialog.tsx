// src/components/dialogs/RemoveInvestmentAmountDialog.tsx
import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea"; // Adicionado
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { MinusCircle } from "@/lib/icons";
import { format } from "@/lib/date";
import { sanitizeInput, sanitizeAmount, validateTransactionData, ensureAuthenticated, checkRateLimit } from "@/utils/security";

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
  const [removalDate, setRemovalDate] = useState(format(new Date(), "yyyy-MM-dd")); // Novo
  const { toast } = useToast();

  // Reset form when dialog opens or investment changes
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

      // Criar um NOVO registro com valor NEGATIVO
      const { error } = await supabase.from("investments").insert({
        user_id: user.id,
        name: investment.name, // Mesmo nome
        type: investment.type, // Mesmo tipo
        amount: -removalAmount, // Valor negativo
        current_value: -removalAmount, // Valor atual negativo também
        quantity: null, // Quantidade nula para simples remoção de valor
        unit_price: null, // Preço unitário nulo
        created_at: new Date(removalDate + "T00:00:00").toISOString(), // Usa a data selecionada
        // maturity_date e group_id podem ser nulos aqui
      });

      if (error) throw error;

      toast({
        title: "Sucesso",
        description: `Valor de ${removalAmount.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })} removido de ${
          investment.name
        }!`,
      });
      onClose(); // Fecha o modal
      onSuccess?.(); // Recarrega os dados na página
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
          <DialogDescription>Remova um valor específico de "{investment.name}". Isso criará um registro negativo.</DialogDescription>
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
            <Button
              type="submit"
              variant="destructive" // Usar variante destrutiva para ação de remoção
              className="flex-1"
              disabled={loading}
            >
              {loading ? "Removendo..." : "Confirmar Remoção"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
