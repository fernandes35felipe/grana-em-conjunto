import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DollarSign, TrendingUp, TrendingDown, PiggyBank, Calendar, ArrowUpCircle, ArrowDownCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

interface GroupDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  groupId: string;
  groupName: string;
}

interface Transaction {
  id: string;
  description: string;
  amount: number;
  type: "income" | "expense";
  category: string;
  date: string;
}

interface Investment {
  id: string;
  name: string;
  type: string;
  amount: number;
  current_value: number;
  created_at: string;
}

interface GroupMetrics {
  totalIncome: number;
  totalExpenses: number;
  totalInvestments: number;
  balance: number;
}

export const GroupDetailsModal = ({ isOpen, onClose, groupId, groupName }: GroupDetailsModalProps) => {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [investments, setInvestments] = useState<Investment[]>([]);
  const [metrics, setMetrics] = useState<GroupMetrics>({
    totalIncome: 0,
    totalExpenses: 0,
    totalInvestments: 0,
    balance: 0
  });
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (isOpen && groupId) {
      loadGroupData();
    }
  }, [isOpen, groupId]);

  const loadGroupData = async () => {
    try {
      setLoading(true);

      // Load transactions
      const { data: transactionsData, error: transError } = await supabase
        .from('transactions')
        .select('*')
        .eq('group_id', groupId)
        .order('date', { ascending: false });

      if (transError) throw transError;

      // Load investments
      const { data: investmentsData, error: invError } = await supabase
        .from('investments')
        .select('*')
        .eq('group_id', groupId)
        .order('created_at', { ascending: false });

      if (invError) throw invError;

      const formattedTransactions = transactionsData?.map(t => ({
        id: t.id,
        description: t.description,
        amount: Number(t.amount),
        type: t.type as "income" | "expense",
        category: t.category,
        date: t.date
      })) || [];

      const formattedInvestments = investmentsData?.map(i => ({
        id: i.id,
        name: i.name,
        type: i.type,
        amount: Number(i.amount),
        current_value: Number(i.current_value),
        created_at: i.created_at
      })) || [];

      setTransactions(formattedTransactions);
      setInvestments(formattedInvestments);

      // Calculate metrics
      const income = formattedTransactions.filter(t => t.type === 'income').reduce((sum, t) => sum + t.amount, 0);
      const expenses = formattedTransactions.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0);
      const totalInvestments = formattedInvestments.reduce((sum, i) => sum + i.current_value, 0);

      setMetrics({
        totalIncome: income,
        totalExpenses: expenses,
        totalInvestments: totalInvestments,
        balance: income - expenses
      });

    } catch (error) {
      console.error('Erro ao carregar dados do grupo:', error);
      toast({
        variant: "destructive",
        title: "Erro",
        description: "Não foi possível carregar os dados do grupo"
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Detalhes do Grupo: {groupName}</DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="space-y-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-32 bg-muted rounded-lg animate-pulse" />
            ))}
          </div>
        ) : (
          <div className="space-y-6">
            {/* Metrics Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Receitas</CardTitle>
                  <TrendingUp className="h-4 w-4 text-success" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-success">
                    {metrics.totalIncome.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Despesas</CardTitle>
                  <TrendingDown className="h-4 w-4 text-destructive" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-destructive">
                    {metrics.totalExpenses.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Investimentos</CardTitle>
                  <PiggyBank className="h-4 w-4 text-accent" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {metrics.totalInvestments.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Saldo</CardTitle>
                  <DollarSign className="h-4 w-4 text-primary" />
                </CardHeader>
                <CardContent>
                  <div className={cn(
                    "text-2xl font-bold",
                    metrics.balance >= 0 ? "text-success" : "text-destructive"
                  )}>
                    {metrics.balance.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Tabs for detailed data */}
            <Tabs defaultValue="transactions" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="transactions">Transações</TabsTrigger>
                <TabsTrigger value="investments">Investimentos</TabsTrigger>
              </TabsList>

              <TabsContent value="transactions" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Calendar className="h-5 w-5" />
                      Transações do Grupo
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {transactions.length === 0 ? (
                      <p className="text-center text-muted-foreground py-8">
                        Nenhuma transação encontrada para este grupo
                      </p>
                    ) : (
                      <div className="space-y-3">
                        {transactions.map((transaction) => (
                          <div
                            key={transaction.id}
                            className="flex items-center justify-between p-3 rounded-lg border border-border"
                          >
                            <div className="flex items-center gap-3">
                              <div className={cn(
                                "p-2 rounded-full",
                                transaction.type === "income" 
                                  ? "bg-success/10 text-success" 
                                  : "bg-destructive/10 text-destructive"
                              )}>
                                {transaction.type === "income" ? (
                                  <ArrowUpCircle className="h-4 w-4" />
                                ) : (
                                  <ArrowDownCircle className="h-4 w-4" />
                                )}
                              </div>
                              <div>
                                <p className="font-medium">{transaction.description}</p>
                                <Badge variant="secondary" className="text-xs mt-1">
                                  {transaction.category}
                                </Badge>
                              </div>
                            </div>
                            <div className="text-right">
                              <p className={cn(
                                "font-semibold",
                                transaction.type === "income" ? "text-success" : "text-destructive"
                              )}>
                                {transaction.type === "income" ? "+" : ""}
                                {transaction.amount.toLocaleString('pt-BR', {
                                  style: 'currency',
                                  currency: 'BRL'
                                })}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {new Date(transaction.date).toLocaleDateString('pt-BR')}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="investments" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <PiggyBank className="h-5 w-5" />
                      Investimentos do Grupo
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {investments.length === 0 ? (
                      <p className="text-center text-muted-foreground py-8">
                        Nenhum investimento encontrado para este grupo
                      </p>
                    ) : (
                      <div className="space-y-3">
                        {investments.map((investment) => (
                          <div
                            key={investment.id}
                            className="flex items-center justify-between p-3 rounded-lg border border-border"
                          >
                            <div>
                              <p className="font-medium">{investment.name}</p>
                              <div className="flex items-center gap-2 mt-1">
                                <Badge variant="secondary" className="text-xs">
                                  {investment.type}
                                </Badge>
                              </div>
                            </div>
                            <div className="text-right">
                              <p className="font-semibold">
                                {investment.current_value.toLocaleString('pt-BR', {
                                  style: 'currency',
                                  currency: 'BRL'
                                })}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                Aplicado: {investment.amount.toLocaleString('pt-BR', {
                                  style: 'currency',
                                  currency: 'BRL'
                                })}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {new Date(investment.created_at).toLocaleDateString('pt-BR')}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};