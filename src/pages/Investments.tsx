import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { AddInvestmentDialog } from "@/components/dialogs/AddInvestmentDialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { TrendingUp, TrendingDown, PieChart, Plus, Target, DollarSign } from "lucide-react";
import { cn } from "@/lib/utils";

// Dados mockados para investimentos
const mockInvestments = [
  {
    id: "1",
    name: "Tesouro Selic 2029",
    type: "Renda Fixa",
    amount: 15000.00,
    currentValue: 15850.32,
    return: 5.67,
    returnType: "positive" as const,
    allocation: 35.2,
    maturityDate: "2029-01-15"
  },
  {
    id: "2",
    name: "ITUB4",
    type: "Ações",
    amount: 8000.00,
    currentValue: 9200.50,
    return: 15.01,
    returnType: "positive" as const,
    allocation: 20.4,
    maturityDate: null
  },
  {
    id: "3",
    name: "CDB Banco XYZ",
    type: "Renda Fixa",
    amount: 12000.00,
    currentValue: 12480.20,
    return: 4.00,
    returnType: "positive" as const,
    allocation: 27.7,
    maturityDate: "2025-06-30"
  },
  {
    id: "4",
    name: "PETR4",
    type: "Ações",
    amount: 5000.00,
    currentValue: 4650.80,
    return: -6.98,
    returnType: "negative" as const,
    allocation: 10.3,
    maturityDate: null
  },
  {
    id: "5",
    name: "Fundo Imobiliário HGLG11",
    type: "FIIs",
    amount: 3000.00,
    currentValue: 3180.75,
    return: 6.03,
    returnType: "positive" as const,
    allocation: 7.1,
    maturityDate: null
  }
];

const totalInvested = mockInvestments.reduce((sum, inv) => sum + inv.amount, 0);
const totalCurrentValue = mockInvestments.reduce((sum, inv) => sum + inv.currentValue, 0);
const totalReturn = ((totalCurrentValue - totalInvested) / totalInvested) * 100;

const investmentGoals = [
  {
    id: "1",
    name: "Reserva de Emergência",
    target: 50000,
    current: 35000,
    progress: 70,
    color: "bg-blue-500"
  },
  {
    id: "2", 
    name: "Casa Própria",
    target: 200000,
    current: 85000,
    progress: 42.5,
    color: "bg-green-500"
  },
  {
    id: "3",
    name: "Aposentadoria",
    target: 1000000,
    current: 120000,
    progress: 12,
    color: "bg-purple-500"
  }
];

const Investments = () => {
  return (
    <DashboardLayout>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Investimentos</h1>
            <p className="text-muted-foreground">
              Acompanhe o desempenho da sua carteira de investimentos
            </p>
          </div>
          <AddInvestmentDialog 
            trigger={
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Novo Investimento
              </Button>
            } 
          />
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Total Investido</p>
                  <p className="text-2xl font-bold">
                    {totalInvested.toLocaleString('pt-BR', {
                      style: 'currency',
                      currency: 'BRL'
                    })}
                  </p>
                </div>
                <DollarSign className="h-8 w-8 text-muted-foreground" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Valor Atual</p>
                  <p className="text-2xl font-bold text-primary">
                    {totalCurrentValue.toLocaleString('pt-BR', {
                      style: 'currency',
                      currency: 'BRL'
                    })}
                  </p>
                </div>
                <PieChart className="h-8 w-8 text-primary" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Rentabilidade</p>
                  <p className={cn(
                    "text-2xl font-bold",
                    totalReturn >= 0 ? "text-success" : "text-destructive"
                  )}>
                    {totalReturn >= 0 ? "+" : ""}{totalReturn.toFixed(2)}%
                  </p>
                </div>
                {totalReturn >= 0 ? (
                  <TrendingUp className="h-8 w-8 text-success" />
                ) : (
                  <TrendingDown className="h-8 w-8 text-destructive" />
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Lucro/Prejuízo</p>
                  <p className={cn(
                    "text-2xl font-bold",
                    totalReturn >= 0 ? "text-success" : "text-destructive"
                  )}>
                    {(totalCurrentValue - totalInvested).toLocaleString('pt-BR', {
                      style: 'currency',
                      currency: 'BRL'
                    })}
                  </p>
                </div>
                <Target className="h-8 w-8 text-muted-foreground" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Investments List */}
        <Card>
          <CardHeader>
            <CardTitle>Minha Carteira</CardTitle>
            <CardDescription>
              Detalhamento dos seus investimentos atuais
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {mockInvestments.map((investment) => (
                <div
                  key={investment.id}
                  className="flex items-center justify-between p-4 rounded-lg border border-border hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-center gap-4">
                    <div className="p-3 bg-primary/10 rounded-full">
                      <TrendingUp className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <p className="font-medium text-foreground">{investment.name}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge variant="secondary" className="text-xs">
                          {investment.type}
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          {investment.allocation.toFixed(1)}% da carteira
                        </span>
                        {investment.maturityDate && (
                          <span className="text-xs text-muted-foreground">
                            Venc: {new Date(investment.maturityDate).toLocaleDateString('pt-BR')}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  <div className="text-right">
                    <div className="flex items-center gap-4">
                      <div>
                        <p className="text-sm text-muted-foreground">Investido</p>
                        <p className="font-medium">
                          {investment.amount.toLocaleString('pt-BR', {
                            style: 'currency',
                            currency: 'BRL'
                          })}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Atual</p>
                        <p className="font-medium">
                          {investment.currentValue.toLocaleString('pt-BR', {
                            style: 'currency',
                            currency: 'BRL'
                          })}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Retorno</p>
                        <p className={cn(
                          "font-semibold",
                          investment.returnType === "positive" ? "text-success" : "text-destructive"
                        )}>
                          {investment.return >= 0 ? "+" : ""}{investment.return.toFixed(2)}%
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Investment Goals */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="h-5 w-5" />
              Metas de Investimento
            </CardTitle>
            <CardDescription>
              Acompanhe o progresso das suas metas financeiras
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {investmentGoals.map((goal) => (
                <div key={goal.id} className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h4 className="font-medium">{goal.name}</h4>
                    <Badge variant="outline" className="text-xs">
                      {goal.progress.toFixed(1)}%
                    </Badge>
                  </div>
                  
                  <Progress value={goal.progress} className="h-2" />
                  
                  <div className="flex justify-between text-sm text-muted-foreground">
                    <span>
                      {goal.current.toLocaleString('pt-BR', {
                        style: 'currency',
                        currency: 'BRL'
                      })}
                    </span>
                    <span>
                      {goal.target.toLocaleString('pt-BR', {
                        style: 'currency',
                        currency: 'BRL'
                      })}
                    </span>
                  </div>
                  
                  <div className="text-xs text-muted-foreground">
                    Faltam {(goal.target - goal.current).toLocaleString('pt-BR', {
                      style: 'currency',
                      currency: 'BRL'
                    })} para atingir a meta
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Asset Allocation */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Distribuição por Tipo</CardTitle>
              <CardDescription>
                Como seus investimentos estão distribuídos
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {['Renda Fixa', 'Ações', 'FIIs'].map((type) => {
                  const typeInvestments = mockInvestments.filter(inv => inv.type === type);
                  const typeTotal = typeInvestments.reduce((sum, inv) => sum + inv.currentValue, 0);
                  const typePercentage = (typeTotal / totalCurrentValue) * 100;
                  
                  return (
                    <div key={type} className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="font-medium">{type}</span>
                        <span className="text-muted-foreground">
                          {typePercentage.toFixed(1)}% • {typeTotal.toLocaleString('pt-BR', {
                            style: 'currency',
                            currency: 'BRL'
                          })}
                        </span>
                      </div>
                      <Progress value={typePercentage} className="h-2" />
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Performance Mensal</CardTitle>
              <CardDescription>
                Evolução da carteira nos últimos meses
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[200px] flex items-center justify-center bg-muted/30 rounded-lg">
                <p className="text-muted-foreground">Gráfico de performance será implementado</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default Investments;