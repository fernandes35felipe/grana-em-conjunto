import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PiggyBank } from "lucide-react";

import { INVESTMENT_TYPES } from "@/constants/investment-types";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface Group {
  id: string;
  name: string;
}

interface InvestmentGoal {
  id: string;
  name: string;
  target_amount: number;
  current_amount: number;
}

interface AddInvestmentDialogProps {
  trigger?: React.ReactNode;
  onSuccess?: () => void;
}

export const AddInvestmentDialog = ({ trigger, onSuccess }: AddInvestmentDialogProps) => {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [groups, setGroups] = useState<Group[]>([]);
  const [investmentGoals, setInvestmentGoals] = useState<InvestmentGoal[]>([]);
  const [formData, setFormData] = useState({
    name: "",
    type: "",
    amount: "",
    current_value: "",
    quantity: "",
    unit_price: "",
    group_id: "none",
    goal_id: "none",
    maturity_date: "",
  });
  const { toast } = useToast();

  const showQuantityPriceFields = formData.type === "Ações" || formData.type === "FIIs";

  useEffect(() => {
    if (open) {
      loadGroups();
      loadInvestmentGoals();
    }
  }, [open]);

  const loadGroups = async () => {
    try {
      const { data, error } = await supabase.from("groups").select("id, name").order("name");
      if (error) throw error;
      setGroups(data || []);
    } catch (error) {
      console.error("Erro ao carregar grupos:", error);
    }
  };

  const loadInvestmentGoals = async () => {
    try {
      const { data, error } = await supabase.from("investment_goals").select("id, name, target_amount, current_amount").order("name");
      if (error) throw error;
      setInvestmentGoals(data || []);
    } catch (error) {
      console.error("Erro ao carregar metas:", error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuário não autenticado");

      let calculatedAmount = 0;
      let currentValue = 0;
      let quantity = null;
      let unitPrice = null;

      if (showQuantityPriceFields) {
        if (!formData.quantity || !formData.unit_price) {
          toast({
            title: "Erro",
            description: "Preencha Quantidade e Valor Unitário para Ações/FIIs",
            variant: "destructive",
          });
          return;
        }
        quantity = parseFloat(formData.quantity);
        unitPrice = parseFloat(formData.unit_price);
        calculatedAmount = quantity * unitPrice;
        currentValue = formData.current_value ? parseFloat(formData.current_value) : calculatedAmount;
      } else {
        if (!formData.amount) {
          toast({
            title: "Erro",
            description: "Preencha o Valor Investido",
            variant: "destructive",
          });
          return;
        }
        calculatedAmount = parseFloat(formData.amount);
        currentValue = formData.current_value ? parseFloat(formData.current_value) : calculatedAmount;
      }

      const investmentData: any = {
        user_id: user.id,
        name: formData.name,
        type: formData.type,
        amount: calculatedAmount,
        current_value: currentValue,
        quantity,
        unit_price: unitPrice,
        group_id: formData.group_id === "none" ? null : formData.group_id,
        goal_id: formData.goal_id === "none" ? null : formData.goal_id,
        maturity_date: formData.maturity_date || null,
      };

      const { error: insertError } = await supabase.from("investments").insert(investmentData);

      if (insertError) throw insertError;

      toast({
        title: "Sucesso",
        description: "Investimento adicionado com sucesso!",
      });

      setFormData({
        name: "",
        type: "",
        amount: "",
        current_value: "",
        quantity: "",
        unit_price: "",
        group_id: "none",
        goal_id: "none",
        maturity_date: "",
      });
      setOpen(false);
      onSuccess?.();
    } catch (error) {
      console.error("Erro ao salvar investimento:", error);
      toast({
        title: "Erro",
        description: "Erro ao salvar o investimento. Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const defaultTrigger = (
    <Button variant="outline" className="h-20 flex flex-col gap-2">
      <PiggyBank className="h-6 w-6" />
      <span className="text-sm">Investir</span>
    </Button>
  );

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger || defaultTrigger}</DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <PiggyBank className="h-5 w-5 text-primary" />
            Novo Investimento
          </DialogTitle>
          <DialogDescription>Adicione um novo investimento ao seu portfólio.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Nome *</Label>
            <Input
              id="name"
              placeholder="Ex: PETR4, MXRF11..."
              value={formData.name}
              onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="type">Tipo *</Label>
            <Select value={formData.type} onValueChange={(value) => setFormData((prev) => ({ ...prev, type: value }))}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione o tipo" />
              </SelectTrigger>
              <SelectContent>
                {INVESTMENT_TYPES.map((type) => (
                  <SelectItem key={type} value={type}>
                    {type}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {showQuantityPriceFields ? (
            <>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="quantity">Quantidade *</Label>
                  <Input
                    id="quantity"
                    type="number"
                    step="1"
                    placeholder="0"
                    value={formData.quantity}
                    onChange={(e) => setFormData((prev) => ({ ...prev, quantity: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="unit_price">Valor Unitário *</Label>
                  <Input
                    id="unit_price"
                    type="number"
                    step="0.01"
                    placeholder="0,00"
                    value={formData.unit_price}
                    onChange={(e) => setFormData((prev) => ({ ...prev, unit_price: e.target.value }))}
                  />
                </div>
              </div>
              {formData.quantity && formData.unit_price && (
                <div className="text-sm text-muted-foreground">
                  Valor Total: R$ {(parseFloat(formData.quantity) * parseFloat(formData.unit_price)).toFixed(2)}
                </div>
              )}
            </>
          ) : (
            <div className="space-y-2">
              <Label htmlFor="amount">Valor Investido *</Label>
              <Input
                id="amount"
                type="number"
                step="0.01"
                placeholder="0,00"
                value={formData.amount}
                onChange={(e) => setFormData((prev) => ({ ...prev, amount: e.target.value }))}
              />
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="current_value">Valor Atual (opcional)</Label>
            <Input
              id="current_value"
              type="number"
              step="0.01"
              placeholder="0,00"
              value={formData.current_value}
              onChange={(e) => setFormData((prev) => ({ ...prev, current_value: e.target.value }))}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="group">Grupo (opcional)</Label>
            <Select value={formData.group_id} onValueChange={(value) => setFormData((prev) => ({ ...prev, group_id: value }))}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Pessoal</SelectItem>
                {groups.map((group) => (
                  <SelectItem key={group.id} value={group.id}>
                    {group.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="goal">Meta de Investimento (opcional)</Label>
            <Select value={formData.goal_id} onValueChange={(value) => setFormData((prev) => ({ ...prev, goal_id: value }))}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione uma meta" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Nenhuma meta</SelectItem>
                {investmentGoals.map((goal) => (
                  <SelectItem key={goal.id} value={goal.id}>
                    {goal.name} ({((goal.current_amount / goal.target_amount) * 100).toFixed(1)}% completo)
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="maturity_date">Data de Vencimento (opcional)</Label>
            <Input
              id="maturity_date"
              type="date"
              value={formData.maturity_date}
              onChange={(e) => setFormData((prev) => ({ ...prev, maturity_date: e.target.value }))}
            />
          </div>

          <div className="flex gap-2">
            <Button type="button" variant="outline" className="flex-1" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" className="flex-1" disabled={loading}>
              {loading ? "Salvando..." : "Salvar"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
