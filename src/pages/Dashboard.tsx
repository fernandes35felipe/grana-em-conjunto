import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { MetricCard } from "@/components/dashboard/MetricCard";
import { TransactionsList } from "@/components/dashboard/TransactionsList";
import { AddTransactionDialog } from "@/components/dialogs/AddTransactionDialog";
import { AddInvestmentDialog } from "@/components/dialogs/AddInvestmentDialog";
import { DateFilter, DateRange } from "@/components/filters/DateFilter";
import { DollarSign, TrendingUp, TrendingDown, PiggyBank, ArrowUpCircle, ArrowDownCircle, FileText } from "@/lib/icons";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { startOfMonth, endOfMonth, format } from "@/lib/date";
import { supabase } from "@/integrations/supabase/client";
import { FixedBalanceCard } from "@/components/dashboard/FixedBalanceCard";
import { PendingSummaryCard } from "@/components/dashboard/PendingSummaryCard";
import { CreditCardSummary } from "@/components/dashboard/CreditCardSummary";

const Dashboard = () => {
  const navigate = useNavigate();
  const [dateRange, setDateRange] = useState<DateRange>({
    from: startOfMonth(new Date()),
    to: endOfMonth(new Date()),
  });
  const [metrics, setMetrics] = useState({
    totalBalance: 0,
    totalIncome: 0,
    totalExpenses: 0,
    totalInvestments: 0,
    pendingIncome: 0,
    pendingExpense: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadMetrics();
  }, [dateRange]);

  useEffect(() => {
    const channel = supabase
      .channel("dashboard-changes")
      .on("postgres_changes", { event: "*", schema: "public", table: "transactions" }, () => loadMetrics())
      .on("postgres_changes", { event: "*", schema: "public", table: "investments" }, () => loadMetrics())
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [dateRange]);

  const loadMetrics = async () => {
    try {
      const { data: transactions, error: transError } = await supabase
        .from("transactions")
        .select("amount, type, date, is_pending")
        .gte("date", format(dateRange.from, "yyyy-MM-dd"))
        .lte("date", format(dateRange.to, "yyyy-MM-dd"))
        .returns<any[]>();

      if (transError) throw transError;

      const { data: investments, error: invError } = await supabase
        .from("investments")
        .select("current_value")
        .returns<any[]>();

      if (invError) throw invError;

      const completedTransactions = transactions?.filter((t) => !t.is_pending) || [];
      const pendingTransactions = transactions?.filter((t) => t.is_pending) || [];

      const income = completedTransactions.filter((t) => t.type === "income").reduce((sum, t) => sum + Number(t.amount), 0);
      const expenses = completedTransactions.filter((t) => t.type === "expense").reduce((sum, t) => sum + Number(t.amount), 0);

      const pendingIncome = pendingTransactions.filter((t) => t.type === "income").reduce((sum, t) => sum + Number(t.amount), 0);
      const pendingExpense = pendingTransactions
        .filter((t) => t.type === "expense")
        .reduce((sum, t) => sum + Math.abs(Number(t.amount)), 0);

      const totalInvestments = investments?.reduce((sum, inv) => sum + Number(inv.current_value), 0) || 0;
      const balance = income + expenses;

      setMetrics({
        totalBalance: balance,
        totalIncome: income,
        totalExpenses: expenses,
        totalInvestments: totalInvestments,
        pendingIncome,
        pendingExpense,
      });
    } catch (error) {
      console.error("Erro ao carregar métricas:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="p-6 space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Dashboard</h1>
            <p className="text-muted-foreground">
              Visão geral das suas finanças em {new Date().toLocaleDateString("pt-BR", { month: "long", year: "numeric" })}
            </p>
          </div>
          <DateFilter dateRange={dateRange} onDateRangeChange={setDateRange} />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          {loading ? (
            [...Array(5)].map((_, i) => <div key={i} className="h-32 bg-muted rounded-lg animate-pulse" />)
          ) : (
            <>
              <MetricCard
                title="Saldo Realizado"
                value={metrics.totalBalance.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                icon={<DollarSign className="h-5 w-5 text-primary" />}
                changeType={metrics.totalBalance >= 0 ? "positive" : "negative"}
              />
              <MetricCard
                title="Receitas"
                value={metrics.totalIncome.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                icon={<TrendingUp className="h-5 w-5 text-success" />}
                changeType="positive"
              />
              <MetricCard
                title="Despesas"
                value={metrics.totalExpenses.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                icon={<TrendingDown className="h-5 w-5 text-destructive" />}
                changeType="negative"
              />
              <CreditCardSummary />
              <PendingSummaryCard pendingIncome={metrics.pendingIncome} pendingExpense={metrics.pendingExpense} isLoading={loading} />
            </>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <FixedBalanceCard />
          <TransactionsList />
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Ações Rápidas</CardTitle>
            <CardDescription>Acesse rapidamente as funcionalidades mais utilizadas</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <AddTransactionDialog
                type="income"
                onSuccess={loadMetrics}
                trigger={
                  <Button variant="outline" className="h-24 flex flex-col gap-2 bg-success/10 hover:bg-success/20 border-success/20">
                    <ArrowUpCircle className="h-8 w-8 text-success" />
                    <span className="text-sm font-medium text-success">Nova Receita</span>
                  </Button>
                }
              />
              <AddTransactionDialog
                type="expense"
                onSuccess={loadMetrics}
                trigger={
                  <Button variant="outline" className="h-24 flex flex-col gap-2 bg-destructive/10 hover:bg-destructive/20 border-destructive/20">
                    <ArrowDownCircle className="h-8 w-8 text-destructive" />
                    <span className="text-sm font-medium text-destructive">Nova Despesa</span>
                  </Button>
                }
              />
              <AddInvestmentDialog
                onSuccess={loadMetrics}
                trigger={
                  <Button variant="outline" className="h-24 flex flex-col gap-2 bg-primary/10 hover:bg-primary/20 border-primary/20">
                    <PiggyBank className="h-8 w-8 text-primary" />
                    <span className="text-sm font-medium text-primary">Novo Investimento</span>
                  </Button>
                }
              />
              <Button
                variant="outline"
                className="h-24 flex flex-col gap-2 bg-orange-500/10 hover:bg-orange-500/20 border-orange-500/20"
                onClick={() => navigate("/reports")}
              >
                <FileText className="h-8 w-8 text-orange-500" />
                <span className="text-sm font-medium text-orange-500">Relatórios</span>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default Dashboard;
