import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { PiggyBank } from "lucide-react";

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
    group_id: "none",
    goal_id: "none",
    maturity_date: ""
  });
  const { toast } = useToast();

  const investmentTypes = ["Renda Fixa", "Ações", "FIIs", "Cripto", "Outros"];

  useEffect(() => {
    if (open) {
      loadGroups();
      loadInvestmentGoals();
    }
  }, [open]);

  const loadGroups = async () => {
    try {
      const { data, error } = await supabase
        .from('groups')
        .select('id, name')
        .order('name');

      if (error) throw error;
      setGroups(data || []);
    } catch (error) {
      console.error('Erro ao carregar grupos:', error);
    }
  };

  const loadInvestmentGoals = async () => {
    try {
      const { data, error } = await supabase
        .from('investment_goals')
        .select('id, name, target_amount, current_amount')
        .order('name');

      if (error) throw error;
      setInvestmentGoals(data || []);
    } catch (error) {
      console.error('Erro ao carregar metas:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name || !formData.type || !formData.amount) {
      toast({
        title: "Erro",
        description: "Preencha todos os campos obrigatórios",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuário não autenticado");

      const amount = parseFloat(formData.amount);
      const currentValue = formData.current_value ? parseFloat(formData.current_value) : amount;

      const { error } = await supabase
        .from('investments')
        .insert({
          user_id: user.id,
          name: formData.name,
          type: formData.type,
          amount,
          current_value: currentValue,
          group_id: formData.group_id === "none" ? null : formData.group_id,
          maturity_date: formData.maturity_date || null
        });

      if (error) throw error;

      // Update investment goal if selected
      if (formData.goal_id !== "none") {
        // First get the current goal data
        const { data: goalData, error: fetchError } = await supabase
          .from('investment_goals')
          .select('current_amount')
          .eq('id', formData.goal_id)
          .single();

        if (fetchError) {
          console.error('Erro ao buscar meta:', fetchError);
        } else {
          const { error: goalError } = await supabase
            .from('investment_goals')
            .update({
              current_amount: goalData.current_amount + amount
            })
            .eq('id', formData.goal_id);

          if (goalError) {
            console.error('Erro ao atualizar meta:', goalError);
          }
        }
      }

      toast({
        title: "Sucesso",
        description: "Investimento adicionado com sucesso!"
      });

      setFormData({
        name: "",
        type: "",
        amount: "",
        current_value: "",
        group_id: "none",
        goal_id: "none",
        maturity_date: ""
      });
      setOpen(false);
      onSuccess?.();
    } catch (error) {
      console.error('Erro ao salvar investimento:', error);
      toast({
        title: "Erro",
        description: "Erro ao salvar o investimento. Tente novamente.",
        variant: "destructive"
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
      <DialogTrigger asChild>
        {trigger || defaultTrigger}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <PiggyBank className="h-5 w-5 text-primary" />
            Novo Investimento
          </DialogTitle>
          <DialogDescription>
            Adicione um novo investimento ao seu portfólio.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Nome do Investimento *</Label>
            <Input
              id="name"
              placeholder="Ex: Tesouro Selic 2029"
              value={formData.name}
              onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="type">Tipo *</Label>
            <Select value={formData.type} onValueChange={(value) => setFormData(prev => ({ ...prev, type: value }))}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione o tipo" />
              </SelectTrigger>
              <SelectContent>
                {investmentTypes.map((type) => (
                  <SelectItem key={type} value={type}>
                    {type}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="amount">Valor Investido *</Label>
            <Input
              id="amount"
              type="number"
              step="0.01"
              placeholder="0,00"
              value={formData.amount}
              onChange={(e) => setFormData(prev => ({ ...prev, amount: e.target.value }))}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="current_value">Valor Atual (opcional)</Label>
            <Input
              id="current_value"
              type="number"
              step="0.01"
              placeholder="Se não preenchido, será igual ao valor investido"
              value={formData.current_value}
              onChange={(e) => setFormData(prev => ({ ...prev, current_value: e.target.value }))}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="group">Grupo (opcional)</Label>
            <Select value={formData.group_id} onValueChange={(value) => setFormData(prev => ({ ...prev, group_id: value }))}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione um grupo (opcional)" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Nenhum grupo</SelectItem>
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
            <Select value={formData.goal_id} onValueChange={(value) => setFormData(prev => ({ ...prev, goal_id: value }))}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione uma meta (opcional)" />
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
              onChange={(e) => setFormData(prev => ({ ...prev, maturity_date: e.target.value }))}
            />
          </div>

          <div className="flex gap-2 pt-4">
            <Button
              type="button"
              variant="outline"
              className="flex-1"
              onClick={() => setOpen(false)}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              className="flex-1"
              disabled={loading}
            >
              {loading ? "Salvando..." : "Salvar"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};