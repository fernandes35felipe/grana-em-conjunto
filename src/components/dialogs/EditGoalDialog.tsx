import { useState, useEffect } from "react";
import { Target } from "@/lib/icons";

import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { sanitizeInput, sanitizeAmount, validateTransactionData, ensureAuthenticated, checkRateLimit } from "@/utils/security";

interface InvestmentGoal {
  id: string;
  name: string;
  target_amount: number;
  current_amount: number;
  color: string;
  description?: string;
  target_date?: string;
  priority: number;
}

interface EditGoalDialogProps {
  goal: InvestmentGoal | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export const EditGoalDialog = ({ goal, isOpen, onClose, onSuccess }: EditGoalDialogProps) => {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    target_amount: "",
    current_amount: "",
    color: "blue",
    description: "",
    target_date: "",
    priority: "5",
  });
  const { toast } = useToast();

  const colors = [
    { value: "blue", label: "Azul" },
    { value: "green", label: "Verde" },
    { value: "purple", label: "Roxo" },
    { value: "orange", label: "Laranja" },
    { value: "red", label: "Vermelho" },
    { value: "pink", label: "Rosa" },
  ];

  useEffect(() => {
    if (goal) {
      setFormData({
        name: goal.name,
        target_amount: goal.target_amount.toString(),
        current_amount: goal.current_amount.toString(),
        color: goal.color || "blue",
        description: goal.description || "",
        target_date: goal.target_date || "",
        priority: (goal.priority || 5).toString(),
      });
    }
  }, [goal]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name || !formData.target_amount || !goal) {
      toast({
        title: "Erro",
        description: "Preencha todos os campos obrigatórios",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    try {
      const targetAmount = parseFloat(formData.target_amount);
      const currentAmount = parseFloat(formData.current_amount);
      const priority = parseInt(formData.priority);

      const { error } = await supabase
        .from("investment_goals")
        .update({
          name: formData.name,
          target_amount: targetAmount,
          current_amount: currentAmount,
          color: formData.color,
          description: formData.description || null,
          target_date: formData.target_date || null,
          priority: priority,
        })
        .eq("id", goal.id);

      if (error) throw error;

      toast({
        title: "Sucesso",
        description: "Meta atualizada com sucesso!",
      });

      onClose();
      onSuccess?.();
    } catch (error) {
      console.error("Erro ao atualizar meta:", error);
      toast({
        title: "Erro",
        description: "Erro ao atualizar a meta. Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Target className="h-5 w-5 text-primary" />
            Editar Meta de Investimento
          </DialogTitle>
          <DialogDescription>Atualize as informações da sua meta financeira.</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="edit-name">Nome da Meta *</Label>
            <Input
              id="edit-name"
              placeholder="Ex: Casa própria, Aposentadoria..."
              value={formData.name}
              onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="edit-target_amount">Valor Alvo *</Label>
              <Input
                id="edit-target_amount"
                type="number"
                step="0.01"
                min="0"
                placeholder="0,00"
                value={formData.target_amount}
                onChange={(e) => setFormData((prev) => ({ ...prev, target_amount: e.target.value }))}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-current_amount">Valor Atual</Label>
              <Input
                id="edit-current_amount"
                type="number"
                step="0.01"
                min="0"
                placeholder="0,00"
                value={formData.current_amount}
                onChange={(e) => setFormData((prev) => ({ ...prev, current_amount: e.target.value }))}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="edit-color">Cor</Label>
              <Select value={formData.color} onValueChange={(value) => setFormData((prev) => ({ ...prev, color: value }))}>
                <SelectTrigger id="edit-color">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {colors.map((color) => (
                    <SelectItem key={color.value} value={color.value}>
                      {color.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-priority">Prioridade *</Label>
              <Select value={formData.priority} onValueChange={(value) => setFormData((prev) => ({ ...prev, priority: value }))}>
                <SelectTrigger id="edit-priority">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">1 - Mais Alta</SelectItem>
                  <SelectItem value="2">2 - Alta</SelectItem>
                  <SelectItem value="3">3 - Média</SelectItem>
                  <SelectItem value="4">4 - Baixa</SelectItem>
                  <SelectItem value="5">5 - Mais Baixa</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="edit-description">Descrição (opcional)</Label>
            <Textarea
              id="edit-description"
              placeholder="Adicione detalhes sobre esta meta..."
              value={formData.description}
              onChange={(e) => setFormData((prev) => ({ ...prev, description: e.target.value }))}
              rows={3}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="edit-target_date">Data Alvo (opcional)</Label>
            <Input
              id="edit-target_date"
              type="date"
              value={formData.target_date}
              onChange={(e) => setFormData((prev) => ({ ...prev, target_date: e.target.value }))}
            />
          </div>

          <div className="flex gap-2 pt-4">
            <Button type="button" variant="outline" className="flex-1" onClick={onClose}>
              Cancelar
            </Button>
            <Button type="submit" className="flex-1" disabled={loading}>
              {loading ? "Salvando..." : "Salvar Alterações"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
