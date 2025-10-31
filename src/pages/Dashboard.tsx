import { useState, useEffect } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { MetricCard } from "@/components/dashboard/MetricCard";
import { TransactionsList } from "@/components/dashboard/TransactionsList";
import { AddTransactionDialog } from "@/components/dialogs/AddTransactionDialog";
import { AddInvestmentDialog } from "@/components/dialogs/AddInvestmentDialog";
import { DateFilter, DateRange } from "@/components/filters/DateFilter";
import { DollarSign, TrendingUp, TrendingDown, PiggyBank, Calendar, Filter } from "@/lib/icons";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { startOfMonth, endOfMonth, format } from "@/lib/date";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { FixedBalanceCard } from "@/components/dashboard/FixedBalanceCard";
const Dashboard = () => {
  const [dateRange, setDateRange] = useState<DateRange>({
    from: startOfMonth(new Date()),
    to: endOfMonth(new Date()),
  });
  const [metrics, setMetrics] = useState({
    totalBalance: 0,
    totalIncome: 0,
    totalExpenses: 0,
    totalInvestments: 0,
    incomeChange: 0,
    expenseChange: 0,
    investmentChange: 0,
  });
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();
  useEffect(() => {
    loadMetrics();
  }, [dateRange]);
  const loadMetrics = async () => {
    try {
      setLoading(true);
      // Get transactions for the selected period
      const { data: transactions, error: transError } = await supabase
        .from("transactions")
        .select("amount, type, date")
        .gte("date", format(dateRange.from, "yyyy-MM-dd"))
        .lte("date", format(dateRange.to, "yyyy-MM-dd"));
      if (transError) throw transError;

      // Get investments
      const { data: investments, error: invError } = await supabase.from("investments").select("current_value, amount, created_at");
      if (invError) throw invError;

      // Calculate metrics
      const income = transactions?.filter((t) => t.type === "income").reduce((sum, t) => sum + Number(t.amount), 0) || 0;
      const expenses = transactions?.filter((t) => t.type === "expense").reduce((sum, t) => sum + Number(t.amount), 0) || 0;
      const totalInvestments = investments?.reduce((sum, inv) => sum + Number(inv.current_value), 0) || 0;
      const balance = income + expenses - totalInvestments;
      setMetrics({
        totalBalance: balance,
        totalIncome: income,
        totalExpenses: expenses,
        totalInvestments: totalInvestments,
        incomeChange: 8.2, // Placeholder - can be calculated with previous period data
        expenseChange: -5.1, // Placeholder
        investmentChange: 15.8, // Placeholder
      });
    } catch (error) {
      console.error("Erro ao carregar métricas:", error);
      toast({
        variant: "destructive",
        title: "Erro",
        description: "Não foi possível carregar as métricas",
      });
    } finally {
      setLoading(false);
    }
  };
  return (
    <DashboardLayout>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Dashboard</h1>
            <p className="text-muted-foreground">
              Visão geral das suas finanças em {new Date().toLocaleDateString("pt-BR", { month: "long", year: "numeric" })}
            </p>
          </div>
          <DateFilter dateRange={dateRange} onDateRangeChange={setDateRange} />
        </div>

        {/* Metrics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {loading ? (
            [...Array(4)].map((_, i) => <div key={i} className="h-32 bg-muted rounded-lg animate-pulse" />)
          ) : (
            <>
              <MetricCard
                title="Saldo Total"
                value={metrics.totalBalance.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                icon={<DollarSign className="h-5 w-5 text-primary" />}
                change="+12.5% em relação ao mês anterior"
                changeType="positive"
              />
              <MetricCard
                title="Receitas"
                value={metrics.totalIncome.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                icon={<TrendingUp className="h-5 w-5 text-success" />}
                change={`+${metrics.incomeChange}% este mês`}
                changeType="positive"
              />
              <MetricCard
                title="Despesas"
                value={metrics.totalExpenses.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                icon={<TrendingDown className="h-5 w-5 text-destructive" />}
                change={`${metrics.expenseChange}% este mês`}
                changeType="positive"
              />

              <MetricCard
                title="Investimentos"
                value={metrics.totalInvestments.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                icon={<PiggyBank className="h-5 w-5 text-accent" />}
                change={`+${metrics.investmentChange}% este ano`}
                changeType="positive"
              />
            </>
          )}
        </div>

        {/* Charts and Recent Transactions */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Chart Placeholder */}
          <FixedBalanceCard />

          {/* Recent Transactions */}

          <TransactionsList />
        </div>

        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle>Ações Rápidas</CardTitle>
            <CardDescription>Acesse rapidamente as funcionalidades mais utilizadas</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <AddTransactionDialog type="income" />
              <AddTransactionDialog type="expense" />
              <AddInvestmentDialog />
              <Button variant="outline" className="h-20 flex flex-col gap-2">
                <DollarSign className="h-6 w-6" />

                <span className="text-sm">Ver Relatórios</span>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default Dashboard;
