import { useState, useEffect } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { AddTransactionDialog } from "@/components/dialogs/AddTransactionDialog";
import { DateFilter, DateRange } from "@/components/filters/DateFilter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { ArrowUpCircle, ArrowDownCircle, Search, Filter, Plus, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { startOfMonth, endOfMonth } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface Transaction {
  id: string;
  description: string;
  amount: number;
  type: 'income' | 'expense';
  category: string;
  date: string;
  group_id: string | null;
  group_name?: string;
}

const Transactions = () => {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState("all");
  const [filterCategory, setFilterCategory] = useState("all");
  const [filterGroup, setFilterGroup] = useState("all");
  const [dateRange, setDateRange] = useState<DateRange>({
    from: startOfMonth(new Date()),
    to: endOfMonth(new Date())
  });
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [transactionToDelete, setTransactionToDelete] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    loadTransactions();
  }, [dateRange]);

  const loadTransactions = async () => {
    try {
      setLoading(true);

      let query = supabase
        .from('transactions')
        .select(`
          *,
          groups!left (
            name
          )
        `)
        .order('date', { ascending: false });

      if (dateRange.from) {
        query = query.gte('date', dateRange.from.toISOString().split('T')[0]);
      }
      if (dateRange.to) {
        query = query.lte('date', dateRange.to.toISOString().split('T')[0]);
      }

      const { data, error } = await query;

      if (error) throw error;

      const formattedData = data?.map(t => ({
        id: t.id,
        description: t.description,
        amount: Number(t.amount),
        type: t.type as 'income' | 'expense',
        category: t.category,
        date: t.date,
        group_id: t.group_id,
        group_name: t.groups?.name
      })) || [];

      setTransactions(formattedData);
    } catch (error) {
      console.error('Erro ao carregar transações:', error);
      toast({
        title: "Erro",
        description: "Erro ao carregar transações",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteClick = (id: string) => {
    setTransactionToDelete(id);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!transactionToDelete) return;

    try {
      const { error } = await supabase
        .from('transactions')
        .delete()
        .eq('id', transactionToDelete);

      if (error) throw error;

      toast({
        title: "Sucesso",
        description: "Transação removida com sucesso",
      });

      loadTransactions();
    } catch (error) {
      console.error('Erro ao remover transação:', error);
      toast({
        title: "Erro",
        description: "Erro ao remover transação",
        variant: "destructive"
      });
    } finally {
      setDeleteDialogOpen(false);
      setTransactionToDelete(null);
    }
  };

  const filteredTransactions = transactions.filter(transaction => {
    const matchesSearch = transaction.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         transaction.category.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = filterType === "all" || transaction.type === filterType;
    const matchesCategory = filterCategory === "all" || transaction.category === filterCategory;
    const matchesGroup = filterGroup === "all" || 
                        (filterGroup === "none" && !transaction.group_id) ||
                        transaction.group_id === filterGroup;

    return matchesSearch && matchesType && matchesCategory && matchesGroup;
  });

  const totalIncome = filteredTransactions
    .filter(t => t.type === 'income')
    .reduce((sum, t) => sum + t.amount, 0);

  const totalExpense = filteredTransactions
    .filter(t => t.type === 'expense')
    .reduce((sum, t) => sum + t.amount, 0);

  const balance = totalIncome - totalExpense;

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
                    <SelectItem value="all">Todas categorias</SelectItem>
                    {categories.map(cat => (
                      <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Select value={filterGroup} onValueChange={setFilterGroup}>
                  <SelectTrigger>
                    <SelectValue placeholder="Grupo" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos os grupos</SelectItem>
                    <SelectItem value="none">Sem grupo</SelectItem>
                  </SelectContent>
                </Select>

                <Button variant="outline" onClick={clearFilters}>
                  Limpar Filtros
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Receitas</p>
                  <p className="text-2xl font-bold text-success">
                    {totalIncome.toLocaleString('pt-BR', {
                      style: 'currency',
                      currency: 'BRL'
                    })}
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
                  <p className="text-sm font-medium text-muted-foreground">Despesas</p>
                  <p className="text-2xl font-bold text-destructive">
                    {totalExpense.toLocaleString('pt-BR', {
                      style: 'currency',
                      currency: 'BRL'
                    })}
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
                  <p className="text-sm font-medium text-muted-foreground">Saldo</p>
                  <p className={cn(
                    "text-2xl font-bold",
                    balance >= 0 ? "text-success" : "text-destructive"
                  )}>
                    {balance.toLocaleString('pt-BR', {
                      style: 'currency',
                      currency: 'BRL'
                    })}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>
              Transações ({filteredTransactions.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-8 text-muted-foreground">
                Carregando transações...
              </div>
            ) : filteredTransactions.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                Nenhuma transação encontrada
              </div>
            ) : (
              <div className="space-y-3">
                {filteredTransactions.map((transaction) => (
                  <div
                    key={transaction.id}
                    className="flex items-center justify-between p-4 rounded-lg border border-border hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-center gap-4 flex-1">
                      <div className={cn(
                        "p-2 rounded-full",
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
                      
                      <div className="flex-1">
                        <p className="font-medium">{transaction.description}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge variant="secondary" className="text-xs">
                            {transaction.category}
                          </Badge>
                          {transaction.group_name && (
                            <Badge variant="outline" className="text-xs">
                              {transaction.group_name}
                            </Badge>
                          )}
                          <span className="text-xs text-muted-foreground">
                            {new Date(transaction.date).toLocaleDateString('pt-BR')}
                          </span>
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-4">
                      <p className={cn(
                        "text-lg font-semibold",
                        transaction.type === "income" ? "text-success" : "text-destructive"
                      )}>
                        {transaction.type === "income" ? "+" : "-"}
                        {transaction.amount.toLocaleString('pt-BR', {
                          style: 'currency',
                          currency: 'BRL'
                        })}
                      </p>
                      
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDeleteClick(transaction.id)}
                        className="text-destructive hover:text-destructive hover:bg-destructive/10"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
              <AlertDialogDescription>
                Tem certeza que deseja remover esta transação? Esta ação não pode ser desfeita.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDeleteConfirm}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                Remover
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </DashboardLayout>
  );
};

export default Transactions;