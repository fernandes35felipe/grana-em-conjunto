import { useState, useEffect } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { AddTransactionDialog } from "@/components/dialogs/AddTransactionDialog";
import { DateFilter, DateRange } from "@/components/filters/DateFilter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { ArrowUpCircle, ArrowDownCircle, Search, Filter, Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { startOfMonth, endOfMonth } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface Transaction {
  id: string;
  description: string;
  amount: number;
  type: 'income' | 'expense';
  category: string;
  date: string;
  group_id: string | null;
  group_name?: string;
  user_id: string;
}

interface Group {
  id: string;
  name: string;
}

const Transactions = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState("all");
  const [filterCategory, setFilterCategory] = useState("all");
  const [filterGroup, setFilterGroup] = useState("all");
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState<DateRange>({
    from: startOfMonth(new Date()),
    to: endOfMonth(new Date())
  });
  const { toast } = useToast();

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      await Promise.all([loadTransactions(), loadGroups()]);
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
      toast({
        title: "Erro",
        description: "Erro ao carregar transações",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const loadTransactions = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data, error } = await supabase
      .from('transactions')
      .select('*')
      .eq('user_id', user.id)
      .order('date', { ascending: false });

    if (error) throw error;

    // Carregar nomes dos grupos separadamente para evitar recursão
    const groupIds = [...new Set(data?.filter(t => t.group_id).map(t => t.group_id))];
    let groupsMap: Record<string, string> = {};
    
    if (groupIds.length > 0) {
      const { data: groupsData } = await supabase
        .from('groups')
        .select('id, name')
        .in('id', groupIds);
      
      groupsMap = groupsData?.reduce((acc, group) => ({
        ...acc,
        [group.id]: group.name
      }), {}) || {};
    }

    const formattedTransactions: Transaction[] = data?.map(t => ({
      id: t.id,
      description: t.description,
      amount: t.amount,
      type: t.type as 'income' | 'expense',
      category: t.category,
      date: t.date,
      group_id: t.group_id,
      group_name: t.group_id ? groupsMap[t.group_id] || null : null,
      user_id: t.user_id
    })) || [];

    setTransactions(formattedTransactions);
  };

  const loadGroups = async () => {
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
      // Se há erro, usar apenas grupos criados
      setGroups(createdGroups || []);
      return;
    }

    // Combinar grupos criados e grupos onde é membro, removendo duplicatas
    const memberGroupsData = memberGroups?.map(mg => ({
      id: mg.groups.id,
      name: mg.groups.name
    })) || [];

    const allGroups = [...(createdGroups || []), ...memberGroupsData];
    const uniqueGroups = allGroups.filter((group, index, self) => 
      index === self.findIndex(g => g.id === group.id)
    );

    setGroups(uniqueGroups.sort((a, b) => a.name.localeCompare(b.name)));
  };

  const filteredTransactions = transactions.filter(transaction => {
    const matchesSearch = transaction.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = filterType === "all" || transaction.type === filterType;
    const matchesCategory = filterCategory === "all" || transaction.category === filterCategory;
    const matchesGroup = filterGroup === "all" || 
      (filterGroup === "personal" && !transaction.group_id) ||
      (filterGroup === transaction.group_id);
    
    return matchesSearch && matchesType && matchesCategory && matchesGroup;
  });

  const categories = Array.from(new Set(transactions.map(t => t.category)));

  const clearFilters = () => {
    setSearchTerm("");
    setFilterType("all");
    setFilterCategory("all");
    setFilterGroup("all");
  };

  return (
    <DashboardLayout>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Transações</h1>
            <p className="text-muted-foreground">
              Gerencie todas as suas entradas e saídas
            </p>
          </div>
          <div className="flex gap-2">
            <AddTransactionDialog 
              type="income" 
              onSuccess={loadTransactions}
              trigger={
                <Button variant="outline">
                  <Plus className="h-4 w-4 mr-2" />
                  Nova Receita
                </Button>
              } 
            />
            <AddTransactionDialog 
              type="expense" 
              onSuccess={loadTransactions}
              trigger={
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Nova Despesa
                </Button>
              } 
            />
          </div>
        </div>

        {/* Filters */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Filter className="h-5 w-5" />
              Filtros
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <DateFilter
                dateRange={dateRange}
                onDateRangeChange={setDateRange}
              />
              
              <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                  <Input
                    placeholder="Buscar transações..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
                
                <Select value={filterType} onValueChange={setFilterType}>
                  <SelectTrigger>
                    <SelectValue placeholder="Tipo" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos os tipos</SelectItem>
                    <SelectItem value="income">Receitas</SelectItem>
                    <SelectItem value="expense">Despesas</SelectItem>
                  </SelectContent>
                </Select>

                <Select value={filterCategory} onValueChange={setFilterCategory}>
                  <SelectTrigger>
                    <SelectValue placeholder="Categoria" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas as categorias</SelectItem>
                    {categories.map(category => (
                      <SelectItem key={category} value={category}>
                        {category}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Select value={filterGroup} onValueChange={setFilterGroup}>
                  <SelectTrigger>
                    <SelectValue placeholder="Grupo" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos os grupos</SelectItem>
                    <SelectItem value="personal">Pessoal</SelectItem>
                    {groups.map(group => (
                      <SelectItem key={group.id} value={group.id}>
                        {group.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Button variant="outline" onClick={clearFilters}>
                  Limpar Filtros
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Total de Receitas</p>
                  <p className="text-2xl font-bold text-success">
                    R$ {filteredTransactions
                      .filter(t => t.type === "income")
                      .reduce((sum, t) => sum + t.amount, 0)
                      .toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </p>
                </div>
                <ArrowUpCircle className="h-8 w-8 text-success" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Total de Despesas</p>
                  <p className="text-2xl font-bold text-destructive">
                    R$ {Math.abs(filteredTransactions
                      .filter(t => t.type === "expense")
                      .reduce((sum, t) => sum + t.amount, 0))
                      .toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </p>
                </div>
                <ArrowDownCircle className="h-8 w-8 text-destructive" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Saldo Líquido</p>
                  <p className={cn(
                    "text-2xl font-bold",
                    filteredTransactions.reduce((sum, t) => sum + t.amount, 0) >= 0 
                      ? "text-success" 
                      : "text-destructive"
                  )}>
                    R$ {filteredTransactions
                      .reduce((sum, t) => sum + t.amount, 0)
                      .toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Transactions List */}
        <Card>
          <CardHeader>
            <CardTitle>
              Transações ({filteredTransactions.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {filteredTransactions.map((transaction) => (
                <div
                  key={transaction.id}
                  className="flex items-center justify-between p-4 rounded-lg border border-border hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-center gap-4">
                    <div className={cn(
                      "p-3 rounded-full",
                      transaction.type === "income" 
                        ? "bg-success/10 text-success" 
                        : "bg-destructive/10 text-destructive"
                    )}>
                      {transaction.type === "income" ? (
                        <ArrowUpCircle className="h-5 w-5" />
                      ) : (
                        <ArrowDownCircle className="h-5 w-5" />
                      )}
                    </div>
                    <div>
                      <p className="font-medium text-foreground">{transaction.description}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge variant="secondary" className="text-xs">
                          {transaction.category}
                        </Badge>
                        {transaction.group_name ? (
                          <Badge variant="outline" className="text-xs">
                            {transaction.group_name}
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-xs text-muted-foreground">
                            Pessoal
                          </Badge>
                        )}
                        <span className="text-xs text-muted-foreground">
                          {new Date(transaction.date).toLocaleDateString('pt-BR')}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className={cn(
                      "text-lg font-semibold",
                      transaction.type === "income" ? "text-success" : "text-destructive"
                    )}>
                      {transaction.type === "income" ? "+" : ""}
                      {transaction.amount.toLocaleString('pt-BR', {
                        style: 'currency',
                        currency: 'BRL'
                      })}
                    </p>
                  </div>
                </div>
              ))}
              
              {filteredTransactions.length === 0 && (
                <div className="text-center py-8">
                  <p className="text-muted-foreground">Nenhuma transação encontrada</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default Transactions;