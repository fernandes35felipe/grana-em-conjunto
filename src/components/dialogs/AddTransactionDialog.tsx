import { useState, useEffect } from "react";
import { Plus, TrendingUp, TrendingDown } from "lucide-react";
import { addMonths, format } from "date-fns";

import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface Group {
  id: string;
  name: string;
}

interface User {
  id: string;
  full_name: string | null;
}

interface AddTransactionDialogProps {
  type: "income" | "expense";
  trigger?: React.ReactNode;
  onSuccess?: () => void;
}

export const AddTransactionDialog = ({ type, trigger, onSuccess }: AddTransactionDialogProps) => {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [groups, setGroups] = useState<Group[]>([]);
  const [groupUsers, setGroupUsers] = useState<User[]>([]);
  const [formData, setFormData] = useState({
    description: "",
    amount: "",
    category: "",
    group_id: "personal",
    assigned_to: "self",
    date: format(new Date(), 'yyyy-MM-dd'),
    notes: "",
    is_recurring: false,
    recurrence_count: "1",
    is_fixed: false
  });
  const { toast } = useToast();

  const categories = type === "income" 
    ? ["Salário", "Freelance", "Investimentos", "Vendas", "Outros"]
    : ["Alimentação", "Transporte", "Moradia", "Saúde", "Educação", "Lazer", "Outros"];

  useEffect(() => {
    if (open) {
      loadGroups();
    }
  }, [open]);

  const loadGroups = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: createdGroups, error: createdError } = await supabase
        .from('groups')
        .select('id, name')
        .eq('created_by', user.id);

      if (createdError) throw createdError;

      const { data: memberGroups, error: memberError } = await supabase
        .from('group_members')
        .select(`
          group_id,
          groups!inner (
            id,
            name
          )
        `)
        .eq('user_id', user.id);

      if (memberError) {
        console.log('Erro ao buscar grupos como membro:', memberError);
        setGroups(createdGroups || []);
        return;
      }

      const memberGroupsData = memberGroups?.map(mg => ({
        id: mg.groups.id,
        name: mg.groups.name
      })) || [];

      const allGroups = [...(createdGroups || []), ...memberGroupsData];
      const uniqueGroups = allGroups.filter((group, index, self) => 
        index === self.findIndex(g => g.id === group.id)
      );

      setGroups(uniqueGroups.sort((a, b) => a.name.localeCompare(b.name)));
    } catch (error) {
      console.error('Erro ao carregar grupos:', error);
    }
  };

  const loadGroupUsers = async (groupId: string) => {
    try {
      const { data: membersData, error: membersError } = await supabase
        .from('group_members')
        .select('user_id')
        .eq('group_id', groupId);

      if (membersError) throw membersError;

      if (!membersData || membersData.length === 0) {
        setGroupUsers([]);
        return;
      }

      const userIds = membersData.map(m => m.user_id);
      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select('user_id, full_name')
        .in('user_id', userIds);

      if (profilesError) throw profilesError;
      
      const users = profilesData?.map(profile => ({
        id: profile.user_id,
        full_name: profile.full_name || 'Usuário'
      })) || [];

      setGroupUsers(users);
    } catch (error) {
      console.error('Erro ao carregar usuários do grupo:', error);
      setGroupUsers([]);
    }
  };

  useEffect(() => {
    if (formData.group_id && formData.group_id !== "personal") {
      loadGroupUsers(formData.group_id);
    } else {
      setGroupUsers([]);
      setFormData(prev => ({ ...prev, assigned_to: "self" }));
    }
  }, [formData.group_id]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.description || !formData.amount || !formData.category) {
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
      const recurrenceId = formData.is_recurring ? crypto.randomUUID() : null;
      const recurrenceCount = formData.is_recurring ? parseInt(formData.recurrence_count) : 1;

      const transactionsToInsert = [];

      for (let i = 0; i < recurrenceCount; i++) {
        const transactionDate = addMonths(new Date(formData.date), i);
        
        transactionsToInsert.push({
          user_id: (formData.assigned_to === "self" || !formData.assigned_to) ? user.id : formData.assigned_to,
          description: formData.description,
          amount: type === "expense" ? -Math.abs(amount) : Math.abs(amount),
          type,
          category: formData.category,
          group_id: formData.group_id === "personal" ? null : formData.group_id,
          date: format(transactionDate, 'yyyy-MM-dd'),
          is_recurring: formData.is_recurring,
          is_fixed: formData.is_fixed,
          recurrence_id: recurrenceId,
          recurrence_count: recurrenceCount
        });
      }

      const { error } = await supabase
        .from('transactions')
        .insert(transactionsToInsert);

      if (error) throw error;

      const recurrenceText = formData.is_recurring 
        ? ` (${recurrenceCount} ${recurrenceCount === 1 ? 'mês' : 'meses'})`
        : '';

      const fixedText = formData.is_fixed ? ' fixo' : '';

      toast({
        title: "Sucesso",
        description: `${type === "income" ? "Receita" : "Despesa"}${fixedText} adicionada com sucesso!${recurrenceText}`
      });

      setFormData({
        description: "",
        amount: "",
        category: "",
        group_id: "personal",
        assigned_to: "self",
        date: format(new Date(), 'yyyy-MM-dd'),
        notes: "",
        is_recurring: false,
        recurrence_count: "1",
        is_fixed: false
      });
      setOpen(false);
      onSuccess?.();
    } catch (error) {
      console.error('Erro ao salvar transação:', error);
      toast({
        title: "Erro",
        description: "Erro ao salvar a transação. Tente novamente.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const defaultTrigger = (
    <Button variant="outline" className="h-20 flex flex-col gap-2">
      {type === "income" ? (
        <>
          <TrendingUp className="h-6 w-6 text-success" />
          <span className="text-sm">Receita</span>
        </>
      ) : (
        <>
          <TrendingDown className="h-6 w-6 text-destructive" />
          <span className="text-sm">Despesa</span>
        </>
      )}
    </Button>
  );

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || defaultTrigger}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {type === "income" ? (
              <>
                <TrendingUp className="h-5 w-5 text-success" />
                Nova Receita
              </>
            ) : (
              <>
                <TrendingDown className="h-5 w-5 text-destructive" />
                Nova Despesa
              </>
            )}
          </DialogTitle>
          <DialogDescription>
            Adicione uma nova {type === "income" ? "receita" : "despesa"} à sua carteira.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="description">Descrição *</Label>
            <Input
              id="description"
              placeholder="Ex: Aluguel"
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="amount">Valor *</Label>
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
              <Label htmlFor="date">Data *</Label>
              <Input
                id="date"
                type="date"
                value={formData.date}
                onChange={(e) => setFormData(prev => ({ ...prev, date: e.target.value }))}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="category">Categoria *</Label>
            <Select value={formData.category} onValueChange={(value) => setFormData(prev => ({ ...prev, category: value }))}>
              <SelectTrigger id="category">
                <SelectValue placeholder="Selecione uma categoria" />
              </SelectTrigger>
              <SelectContent>
                {categories.map((cat) => (
                  <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="group">Grupo</Label>
            <Select value={formData.group_id} onValueChange={(value) => setFormData(prev => ({ ...prev, group_id: value }))}>
              <SelectTrigger id="group">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="personal">Pessoal</SelectItem>
                {groups.map((group) => (
                  <SelectItem key={group.id} value={group.id}>{group.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {formData.group_id !== "personal" && groupUsers.length > 0 && (
            <div className="space-y-2">
              <Label htmlFor="assigned_to">Atribuir para</Label>
              <Select value={formData.assigned_to} onValueChange={(value) => setFormData(prev => ({ ...prev, assigned_to: value }))}>
                <SelectTrigger id="assigned_to">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="self">Eu mesmo</SelectItem>
                  {groupUsers.map((user) => (
                    <SelectItem key={user.id} value={user.id}>
                      {user.full_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="space-y-4 pt-4 border-t">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="is_fixed">Lançamento Fixo</Label>
                <p className="text-xs text-muted-foreground">
                  Aparecerá no balanço fixo mensal
                </p>
              </div>
              <Switch
                id="is_fixed"
                checked={formData.is_fixed}
                onCheckedChange={(checked) => setFormData(prev => ({ ...prev, is_fixed: checked }))}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="is_recurring">Lançamento Recorrente</Label>
                <p className="text-xs text-muted-foreground">
                  Repetir por vários meses
                </p>
              </div>
              <Switch
                id="is_recurring"
                checked={formData.is_recurring}
                onCheckedChange={(checked) => setFormData(prev => ({ ...prev, is_recurring: checked }))}
              />
            </div>

            {formData.is_recurring && (
              <div className="space-y-2 pl-4 border-l-2">
                <Label htmlFor="recurrence_count">Repetir por quantos meses? *</Label>
                <Input
                  id="recurrence_count"
                  type="number"
                  min="1"
                  max="60"
                  value={formData.recurrence_count}
                  onChange={(e) => setFormData(prev => ({ ...prev, recurrence_count: e.target.value }))}
                />
                <p className="text-xs text-muted-foreground">
                  Serão criados {formData.recurrence_count} lançamento(s) mensais
                </p>
              </div>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Observações</Label>
            <Textarea
              id="notes"
              placeholder="Adicione observações..."
              value={formData.notes}
              onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
              rows={3}
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