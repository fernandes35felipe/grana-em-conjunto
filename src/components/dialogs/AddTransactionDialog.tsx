import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Plus, TrendingUp, TrendingDown } from "lucide-react";

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
    date: new Date().toISOString().split('T')[0]
  });
  const { toast } = useToast();

  const categories = type === "income" 
    ? ["Salário", "Renda Extra", "Dividendos", "Vendas", "Outros"]
    : ["Alimentação", "Transporte", "Saúde", "Educação", "Lazer", "Casa", "Vestuário", "Outros"];

  useEffect(() => {
    if (open) {
      loadGroups();
    }
  }, [open]);

  const loadGroups = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Buscar grupos criados pelo usuário
      const { data: createdGroups, error: createdError } = await supabase
        .from('groups')
        .select('id, name')
        .eq('created_by', user.id);

      if (createdError) throw createdError;

      // Buscar grupos onde o usuário é membro
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

      // Combinar grupos
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
      // Primeiro buscar os membros do grupo
      const { data: membersData, error: membersError } = await supabase
        .from('group_members')
        .select('user_id')
        .eq('group_id', groupId);

      if (membersError) throw membersError;

      if (!membersData || membersData.length === 0) {
        setGroupUsers([]);
        return;
      }

      // Depois buscar os perfis dos usuários
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
      const { error } = await supabase
        .from('transactions')
        .insert({
          user_id: (formData.assigned_to === "self" || !formData.assigned_to) ? user.id : formData.assigned_to,
          description: formData.description,
          amount: type === "expense" ? -Math.abs(amount) : Math.abs(amount),
          type,
          category: formData.category,
          group_id: formData.group_id === "personal" ? null : formData.group_id,
          date: formData.date
        });

      if (error) throw error;

      toast({
        title: "Sucesso",
        description: `${type === "income" ? "Receita" : "Despesa"} adicionada com sucesso!`
      });

      setFormData({
        description: "",
        amount: "",
        category: "",
        group_id: "personal",
        assigned_to: "self",
        date: new Date().toISOString().split('T')[0]
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
        <TrendingUp className="h-6 w-6" />
      ) : (
        <TrendingDown className="h-6 w-6" />
      )}
      <span className="text-sm">
        {type === "income" ? "Nova Receita" : "Nova Despesa"}
      </span>
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
            {type === "income" ? (
              <TrendingUp className="h-5 w-5 text-success" />
            ) : (
              <TrendingDown className="h-5 w-5 text-destructive" />
            )}
            {type === "income" ? "Nova Receita" : "Nova Despesa"}
          </DialogTitle>
          <DialogDescription>
            Adicione uma nova {type === "income" ? "receita" : "despesa"} ao seu controle financeiro.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="description">Descrição *</Label>
            <Input
              id="description"
              placeholder="Digite a descrição..."
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
            />
          </div>

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
            <Label htmlFor="category">Categoria *</Label>
            <Select value={formData.category} onValueChange={(value) => setFormData(prev => ({ ...prev, category: value }))}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione uma categoria" />
              </SelectTrigger>
              <SelectContent>
                {categories.map((category) => (
                  <SelectItem key={category} value={category}>
                    {category}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="group">Grupo (opcional)</Label>
            <Select value={formData.group_id} onValueChange={(value) => setFormData(prev => ({ ...prev, group_id: value }))}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione um grupo (opcional)" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="personal">Pessoal</SelectItem>
                {groups.map((group) => (
                  <SelectItem key={group.id} value={group.id}>
                    {group.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {formData.group_id && groupUsers.length > 0 && (
            <div className="space-y-2">
              <Label htmlFor="assigned_to">Atribuir a usuário (opcional)</Label>
              <Select value={formData.assigned_to} onValueChange={(value) => setFormData(prev => ({ ...prev, assigned_to: value }))}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione um usuário (opcional)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="self">Eu mesmo</SelectItem>
                  {groupUsers.map((user) => (
                    <SelectItem key={user.id} value={user.id}>
                      {user.full_name || 'Usuário'}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="date">Data</Label>
            <Input
              id="date"
              type="date"
              value={formData.date}
              onChange={(e) => setFormData(prev => ({ ...prev, date: e.target.value }))}
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