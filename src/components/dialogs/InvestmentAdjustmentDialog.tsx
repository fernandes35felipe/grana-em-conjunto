import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Settings } from "lucide-react";

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

interface InvestmentAdjustmentDialogProps {
  investment: AggregatedInvestment | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export const InvestmentAdjustmentDialog = ({ investment, open, onOpenChange, onSuccess }: InvestmentAdjustmentDialogProps) => {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    newCurrentValue: "",
    notes: "",
  });
  const { toast } = useToast();

  useEffect(() => {
    if (investment) {
      setFormData({
        newCurrentValue: investment.totalCurrentValue.toString(),
        notes: "",
      });
    }
  }, [investment]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!investment) return;

    setLoading(true);
    try {
      const newValue = parseFloat(formData.newCurrentValue);

      if (isNaN(newValue) || newValue < 0) {
        toast({
          title: "Erro",
          description: "Valor inválido",
          variant: "destructive",
        });
        return;
      }

      const lastRecordId = investment.recordIds[investment.recordIds.length - 1];

      const { error } = await supabase
        .from("investments")
        .update({
          current_value: newValue,
          quantity: null,
          unit_price: null,
        })
        .eq("id", lastRecordId);

      if (error) throw error;

      toast({
        title: "Sucesso",
        description: "Valor atualizado com sucesso!",
      });

      setFormData({
        newCurrentValue: "",
        notes: "",
      });

      onOpenChange(false);
      onSuccess?.();
    } catch (error) {
      console.error("Erro ao atualizar investimento:", error);
      toast({
        title: "Erro",
        description: "Erro ao atualizar o investimento. Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  if (!investment) return null;

  const currentReturn =
    investment.totalAmountInvested > 0
      ? ((investment.totalCurrentValue - investment.totalAmountInvested) / investment.totalAmountInvested) * 100
      : 0;

  const newValue = parseFloat(formData.newCurrentValue) || 0;
  const newReturn =
    investment.totalAmountInvested > 0 ? ((newValue - investment.totalAmountInvested) / investment.totalAmountInvested) * 100 : 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5 text-primary" />
            Ajustar Investimento
          </DialogTitle>
          <DialogDescription>Atualize o valor atual de {investment.name}</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-4 p-4 bg-muted rounded-lg">
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Valor Investido</span>
              <span className="font-medium">
                {new Intl.NumberFormat("pt-BR", {
                  style: "currency",
                  currency: "BRL",
                }).format(investment.totalAmountInvested)}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Valor Atual</span>
              <span className="font-medium">
                {new Intl.NumberFormat("pt-BR", {
                  style: "currency",
                  currency: "BRL",
                }).format(investment.totalCurrentValue)}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Rentabilidade Atual</span>
              <span className={`font-medium ${currentReturn >= 0 ? "text-success" : "text-destructive"}`}>
                {currentReturn >= 0 ? "+" : ""}
                {currentReturn.toFixed(2)}%
              </span>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="newCurrentValue">Novo Valor Atual *</Label>
            <Input
              id="newCurrentValue"
              type="number"
              step="0.01"
              placeholder="0,00"
              value={formData.newCurrentValue}
              onChange={(e) => setFormData((prev) => ({ ...prev, newCurrentValue: e.target.value }))}
              required
            />
          </div>

          {newValue > 0 && newValue !== investment.totalCurrentValue && (
            <div className="space-y-2 p-4 bg-primary/10 rounded-lg">
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Nova Rentabilidade</span>
                <span className={`font-medium ${newReturn >= 0 ? "text-success" : "text-destructive"}`}>
                  {newReturn >= 0 ? "+" : ""}
                  {newReturn.toFixed(2)}%
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Variação</span>
                <span className={`font-medium ${newValue - investment.totalCurrentValue >= 0 ? "text-success" : "text-destructive"}`}>
                  {new Intl.NumberFormat("pt-BR", {
                    style: "currency",
                    currency: "BRL",
                  }).format(newValue - investment.totalCurrentValue)}
                </span>
              </div>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="notes">Observações (opcional)</Label>
            <Textarea
              id="notes"
              placeholder="Adicione observações sobre este ajuste..."
              value={formData.notes}
              onChange={(e) => setFormData((prev) => ({ ...prev, notes: e.target.value }))}
              rows={3}
            />
          </div>

          <div className="flex gap-2 pt-4">
            <Button type="button" variant="outline" className="flex-1" onClick={() => onOpenChange(false)} disabled={loading}>
              Cancelar
            </Button>
            <Button type="submit" className="flex-1" disabled={loading}>
              {loading ? "Salvando..." : "Salvar Ajuste"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
