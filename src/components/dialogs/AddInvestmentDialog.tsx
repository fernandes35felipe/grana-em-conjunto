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
import { recalculateGoalBalance } from "@/utils/investments/investmentUtils";

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
  defaultGroupId?: string; // NOVO PROP
}

export const AddInvestmentDialog = ({ trigger, onSuccess, defaultGroupId }: AddInvestmentDialogProps) => {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [groups, setGroups] = useState<Group[]>([]);
  const [investmentGoals, setInvestmentGoals] = useState<InvestmentGoal[]>([]);
  const [formData, setFormData] = useState({
    name: "",
    type: "",
    amount: "",
    quantity: "",
    unit_price: "",
    group_id: defaultGroupId || "none", // Usa default se houver
    goal_id: "none",
    maturity_date: "",
  });
  const { toast } = useToast();

  const showQuantityPriceFields = formData.type === "Ações" || formData.type === "FIIs";

  useEffect(() => {
    if (open) {
      if (!defaultGroupId) {
        loadGroups();
      }
      loadInvestmentGoals();
    }
  }, [open, defaultGroupId]);

  const loadGroups = async () => {
    try {
      const { data } = await supabase.from("groups").select("id, name").order("name");
      setGroups(data || []);
    } catch (error) {
      console.error("Erro grupos:", error);
    }
  };

  const loadInvestmentGoals = async () => {
    try {
      const { data } = await supabase.from("investment_goals").select("id, name, target_amount, current_amount").order("name");
      setInvestmentGoals(data || []);
    } catch (error) {
      console.error("Erro metas:", error);
    }
  };

  const handleNameBlur = async () => {
    if (!formData.name) return;
    try {
      const { data } = await supabase
        .from("investments")
        .select("type, group_id, goal_id")
        .ilike("name", formData.name)
        .limit(1)
        .maybeSingle();

      if (data) {
        setFormData(prev => ({
          ...prev,
          type: prev.type || data.type,
          // Mantém defaultGroupId se existir, senão usa o do histórico
          group_id: defaultGroupId ? defaultGroupId : (prev.group_id === "none" && data.group_id ? data.group_id : prev.group_id),
          goal_id: prev.goal_id === "none" && data.goal_id ? data.goal_id : prev.goal_id,
        }));
      }
    } catch (error) {
      // Silently fail
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuário não autenticado");

      let calculatedAmount = 0;
      let quantity = null;
      let unitPrice = null;

      if (showQuantityPriceFields) {
        if (!formData.quantity || !formData.unit_price) {
          toast({ title: "Erro", description: "Preencha quantidade e preço", variant: "destructive" });
          setLoading(false);
          return;
        }
        quantity = parseFloat(formData.quantity);
        unitPrice = parseFloat(formData.unit_price);
        calculatedAmount = quantity * unitPrice;
      } else {
        if (!formData.amount) {
          toast({ title: "Erro", description: "Preencha o valor", variant: "destructive" });
          setLoading(false);
          return;
        }
        calculatedAmount = parseFloat(formData.amount);
      }

      const investmentData: any = {
        user_id: user.id,
        name: formData.name,
        type: formData.type,
        amount: calculatedAmount,
        current_value: calculatedAmount,
        quantity,
        unit_price: unitPrice,
        group_id: formData.group_id === "none" ? null : formData.group_id,
        goal_id: formData.goal_id === "none" ? null : formData.goal_id,
        maturity_date: formData.maturity_date || null,
      };

      const { error: insertError } = await supabase.from("investments").insert(investmentData);
      if (insertError) throw insertError;

      if (investmentData.goal_id) {
        await recalculateGoalBalance(investmentData.goal_id);
      }

      toast({ title: "Sucesso", description: "Aporte realizado com sucesso!" });
      
      setFormData({
        name: "",
        type: "",
        amount: "",
        quantity: "",
        unit_price: "",
        group_id: defaultGroupId || "none", // Reseta mantendo o default
        goal_id: "none",
        maturity_date: "",
      });
      setOpen(false);
      onSuccess?.();
    } catch (error) {
      console.error("Erro:", error);
      toast({ title: "Erro", description: "Falha ao salvar", variant: "destructive" });
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
          <DialogDescription>Adicione um novo aporte.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Nome do Ativo *</Label>
            <Input
              id="name"
              placeholder="Ex: PETR4, CDB Banco X..."
              value={formData.name}
              onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
              onBlur={handleNameBlur}
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
                  <SelectItem key={type} value={type}>{type}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {showQuantityPriceFields ? (
            <>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="quantity">Quantidade</Label>
                  <Input
                    id="quantity"
                    type="number"
                    step="1"
                    value={formData.quantity}
                    onChange={(e) => setFormData((prev) => ({ ...prev, quantity: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="unit_price">Preço Unitário</Label>
                  <Input
                    id="unit_price"
                    type="number"
                    step="0.01"
                    value={formData.unit_price}
                    onChange={(e) => setFormData((prev) => ({ ...prev, unit_price: e.target.value }))}
                  />
                </div>
              </div>
              {formData.quantity && formData.unit_price && (
                <div className="text-sm text-muted-foreground text-right">
                  Total: R$ {(parseFloat(formData.quantity) * parseFloat(formData.unit_price)).toFixed(2)}
                </div>
              )}
            </>
          ) : (
            <div className="space-y-2">
              <Label htmlFor="amount">Valor do Aporte *</Label>
              <Input
                id="amount"
                type="number"
                step="0.01"
                value={formData.amount}
                onChange={(e) => setFormData((prev) => ({ ...prev, amount: e.target.value }))}
              />
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="goal">Vincular a uma Meta</Label>
            <Select value={formData.goal_id} onValueChange={(value) => setFormData((prev) => ({ ...prev, goal_id: value }))}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Nenhuma meta</SelectItem>
                {investmentGoals.map((goal) => (
                  <SelectItem key={goal.id} value={goal.id}>
                    {goal.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {!defaultGroupId && (
            <div className="space-y-2">
              <Label htmlFor="group">Grupo</Label>
              <Select value={formData.group_id} onValueChange={(value) => setFormData((prev) => ({ ...prev, group_id: value }))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Pessoal</SelectItem>
                  {groups.map((group) => (
                    <SelectItem key={group.id} value={group.id}>{group.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="maturity_date">Vencimento (opcional)</Label>
            <Input
              id="maturity_date"
              type="date"
              value={formData.maturity_date}
              onChange={(e) => setFormData((prev) => ({ ...prev, maturity_date: e.target.value }))}
            />
          </div>

          <div className="flex gap-2 mt-4">
            <Button type="button" variant="outline" className="flex-1" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" className="flex-1" disabled={loading}>
              {loading ? "Salvando..." : "Adicionar Aporte"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};