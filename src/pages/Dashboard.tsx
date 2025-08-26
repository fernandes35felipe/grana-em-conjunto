import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { MetricCard } from "@/components/dashboard/MetricCard";
import { TransactionsList } from "@/components/dashboard/TransactionsList";
import { 
  DollarSign, 
  TrendingUp, 
  TrendingDown, 
  PiggyBank,
  Calendar,
  Filter
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

const Dashboard = () => {
  return (
    <DashboardLayout>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Dashboard</h1>
            <p className="text-muted-foreground">
              Visão geral das suas finanças em {new Date().toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm">
              <Filter className="h-4 w-4 mr-2" />
              Filtros
            </Button>
            <Button variant="outline" size="sm">
              <Calendar className="h-4 w-4 mr-2" />
              Este mês
            </Button>
          </div>
        </div>

        {/* Metrics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <MetricCard
            title="Saldo Total"
            value="R$ 15.847,32"
            icon={<DollarSign className="h-5 w-5 text-primary" />}
            change="+12.5% em relação ao mês anterior"
            changeType="positive"
          />
          <MetricCard
            title="Receitas"
            value="R$ 9.700,00"
            icon={<TrendingUp className="h-5 w-5 text-success" />}
            change="+8.2% este mês"
            changeType="positive"
          />
          <MetricCard
            title="Despesas"
            value="R$ 3.452,68"
            icon={<TrendingDown className="h-5 w-5 text-destructive" />}
            change="-5.1% este mês"
            changeType="positive"
          />
          <MetricCard
            title="Investimentos"
            value="R$ 45.230,12"
            icon={<PiggyBank className="h-5 w-5 text-accent" />}
            change="+15.8% este ano"
            changeType="positive"
          />
        </div>

        {/* Charts and Recent Transactions */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Chart Placeholder */}
          <Card>
            <CardHeader>
              <CardTitle>Resumo Mensal</CardTitle>
              <CardDescription>
                Evolução das receitas e despesas nos últimos 6 meses
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[300px] flex items-center justify-center bg-muted/30 rounded-lg">
                <p className="text-muted-foreground">Gráfico será implementado em breve</p>
              </div>
            </CardContent>
          </Card>

          {/* Recent Transactions */}
          <TransactionsList />
        </div>

        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle>Ações Rápidas</CardTitle>
            <CardDescription>
              Acesse rapidamente as funcionalidades mais utilizadas
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <Button variant="outline" className="h-20 flex flex-col gap-2">
                <TrendingUp className="h-6 w-6" />
                <span className="text-sm">Nova Receita</span>
              </Button>
              <Button variant="outline" className="h-20 flex flex-col gap-2">
                <TrendingDown className="h-6 w-6" />
                <span className="text-sm">Nova Despesa</span>
              </Button>
              <Button variant="outline" className="h-20 flex flex-col gap-2">
                <PiggyBank className="h-6 w-6" />
                <span className="text-sm">Investir</span>
              </Button>
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