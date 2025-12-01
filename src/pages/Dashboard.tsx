import { useState, useEffect } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { MetricCard } from "@/components/dashboard/MetricCard";
import { TransactionsList } from "@/components/dashboard/TransactionsList";
import { AddTransactionDialog } from "@/components/dialogs/AddTransactionDialog";
import { AddInvestmentDialog } from "@/components/dialogs/AddInvestmentDialog";
import { DateFilter, DateRange } from "@/components/filters/DateFilter";
import { DollarSign, TrendingUp, TrendingDown, PiggyBank, Filter } from "@/lib/icons";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
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
  });
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  // Carrega dados iniciais e sempre que a data mudar
  useEffect(() => {
    loadMetrics();
  }, [dateRange]);

  // CONFIGURAÇÃO DO REALTIME (TEMPO REAL)
  useEffect(() => {
    // Inscreve-se para ouvir mudanças nas tabelas
    const channel = supabase
      .channel("dashboard-changes")
      .on("postgres_changes", { event: "*", schema: "public", table: "transactions" }, (payload) => {
        console.log("Mudança detectada em transações:", payload);
        loadMetrics(); // Recarrega os dados quando houver mudança
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "investments" }, () => {
        loadMetrics();
      })
      .subscribe();

    // Limpeza ao sair da página
    return () => {
      supabase.removeChannel(channel);
    };
  }, [dateRange]); // Dependência dateRange garante que o reload use as datas certas

  const loadMetrics = async () => {
    try {
      // Não ativamos o setLoading(true) aqui para evitar "piscar" a tela em atualizações automáticas
      // Apenas na primeira carga ou mudança de data manual pode ser interessante,
      // mas para realtime é melhor ser silencioso.

      const { data: transactions, error: transError } = await supabase
        .from("transactions")
        .select("amount, type, date")
        .gte("date", format(dateRange.from, "yyyy-MM-dd"))
        .lte("date", format(dateRange.to, "yyyy-MM-dd"));

      if (transError) throw transError;

      const { data: investments, error: invError } = await supabase.from("investments").select("current_value, amount, created_at");

      if (invError) throw invError;

      // Cálculos
      const income = transactions?.filter((t) => t.type === "income").reduce((sum, t) => sum + Number(t.amount), 0) || 0;

      const expenses = transactions?.filter((t) => t.type === "expense").reduce((sum, t) => sum + Number(t.amount), 0) || 0;

      const totalInvestments = investments?.reduce((sum, inv) => sum + Number(inv.current_value), 0) || 0;

      //O valor do saldo é receita - despesa. Como as despesas são negativas, somamos os valores (saldo = receita + despesa negativa)
      const balance = income + expenses;

      setMetrics({
        totalBalance: balance,
        totalIncome: income,
        totalExpenses: expenses,
        totalInvestments: totalInvestments,
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
                title="Saldo do Período"
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
              <MetricCard
                title="Patrimônio Investido"
                value={metrics.totalInvestments.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                icon={<PiggyBank className="h-5 w-5 text-accent" />}
                changeType="positive"
              />
            </>
          )}
        </div>

        {/* Charts and Recent Transactions */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <FixedBalanceCard />
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
              <AddTransactionDialog type="income" onSuccess={loadMetrics} />
              <AddTransactionDialog type="expense" onSuccess={loadMetrics} />
              <AddInvestmentDialog onSuccess={loadMetrics} />
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
