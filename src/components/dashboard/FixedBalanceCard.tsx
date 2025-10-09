import { useState, useEffect } from "react";
import { TrendingUp, TrendingDown, DollarSign } from "lucide-react";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

interface FixedTransaction {
  id: string;
  description: string;
  amount: number;
  type: 'income' | 'expense';
  category: string;
}

export const FixedBalanceCard = () => {
  const [fixedIncome, setFixedIncome] = useState<FixedTransaction[]>([]);
  const [fixedExpenses, setFixedExpenses] = useState<FixedTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    loadFixedTransactions();
  }, []);

  const loadFixedTransactions = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('transactions')
        .select('id, description, amount, type, category')
        .eq('user_id', user.id)
        .eq('is_fixed', true)
        .order('amount', { ascending: false });

      if (error) throw error;

      const income = data?.filter(t => t.type === 'income') || [];
      const expenses = data?.filter(t => t.type === 'expense') || [];

      setFixedIncome(income);
      setFixedExpenses(expenses);
    } catch (error) {
      console.error('Erro ao carregar lançamentos fixos:', error);
      toast({
        title: "Erro",
        description: "Erro ao carregar balanço fixo",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const totalFixedIncome = fixedIncome.reduce((sum, t) => sum + t.amount, 0);
  const totalFixedExpenses = Math.abs(fixedExpenses.reduce((sum, t) => sum + t.amount, 0));
  const fixedBalance = totalFixedIncome - totalFixedExpenses;

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Balanço Fixo Mensal</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-2">
            <div className="h-4 bg-muted rounded"></div>
            <div className="h-4 bg-muted rounded"></div>
            <div className="h-4 bg-muted rounded"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <DollarSign className="h-5 w-5" />
          Balanço Fixo Mensal
        </CardTitle>
        <CardDescription>
          Receitas e despesas fixas que se repetem mensalmente
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-4">
          <div>
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-sm font-semibold flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-success" />
                Receitas Fixas
              </h4>
              <Badge variant="outline" className="text-success">
                {totalFixedIncome.toLocaleString('pt-BR', {
                  style: 'currency',
                  currency: 'BRL'
                })}
              </Badge>
            </div>
            <div className="space-y-2">
              {fixedIncome.length === 0 ? (
                <p className="text-xs text-muted-foreground text-center py-2">
                  Nenhuma receita fixa cadastrada
                </p>
              ) : (
                fixedIncome.map((transaction) => (
                  <div
                    key={transaction.id}
                    className="flex items-center justify-between p-2 rounded-md bg-muted/30"
                  >
                    <div className="flex-1">
                      <p className="text-sm font-medium">{transaction.description}</p>
                      <p className="text-xs text-muted-foreground">{transaction.category}</p>
                    </div>
                    <span className="text-sm font-semibold text-success">
                      +{transaction.amount.toLocaleString('pt-BR', {
                        style: 'currency',
                        currency: 'BRL'
                      })}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-sm font-semibold flex items-center gap-2">
                <TrendingDown className="h-4 w-4 text-destructive" />
                Despesas Fixas
              </h4>
              <Badge variant="outline" className="text-destructive">
                -{totalFixedExpenses.toLocaleString('pt-BR', {
                  style: 'currency',
                  currency: 'BRL'
                })}
              </Badge>
            </div>
            <div className="space-y-2">
              {fixedExpenses.length === 0 ? (
                <p className="text-xs text-muted-foreground text-center py-2">
                  Nenhuma despesa fixa cadastrada
                </p>
              ) : (
                fixedExpenses.map((transaction) => (
                  <div
                    key={transaction.id}
                    className="flex items-center justify-between p-2 rounded-md bg-muted/30"
                  >
                    <div className="flex-1">
                      <p className="text-sm font-medium">{transaction.description}</p>
                      <p className="text-xs text-muted-foreground">{transaction.category}</p>
                    </div>
                    <span className="text-sm font-semibold text-destructive">
                      {transaction.amount.toLocaleString('pt-BR', {
                        style: 'currency',
                        currency: 'BRL'
                      })}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        <div className="pt-4 border-t">
          <div className="flex items-center justify-between">
            <h4 className="font-semibold">Balanço Mensal Fixo</h4>
            <span className={cn(
              "text-lg font-bold",
              fixedBalance >= 0 ? "text-success" : "text-destructive"
            )}>
              {fixedBalance.toLocaleString('pt-BR', {
                style: 'currency',
                currency: 'BRL'
              })}
            </span>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            {fixedBalance >= 0 
              ? "Você terá este valor positivo mensalmente"
              : "Você terá este déficit mensalmente"
            }
          </p>
        </div>
      </CardContent>
    </Card>
  );
};