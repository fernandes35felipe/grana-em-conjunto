import { useState, useEffect } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { AddInvestmentDialog } from "@/components/dialogs/AddInvestmentDialog";
import { AddGoalDialog } from "@/components/dialogs/AddGoalDialog";
import { InvestmentDetailsModal } from "@/components/dialogs/InvestmentDetailsModal";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { TrendingUp, TrendingDown, PieChart, Plus, Target, DollarSign } from "lucide-react";
import { cn } from "@/lib/utils";

interface Investment {
  id: string;
  name: string;
  type: string;
  amount: number;
  current_value: number;
  maturity_date?: string;
  created_at: string;
}

interface InvestmentGoal {
  id: string;
  name: string;
  target_amount: number;
  current_amount: number;
  color: string;
  description?: string;
  target_date?: string;
}

const Investments = () => {
  const [investments, setInvestments] = useState<Investment[]>([]);
  const [goals, setGoals] = useState<InvestmentGoal[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedType, setSelectedType] = useState("");
  const { toast } = useToast();

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    await Promise.all([loadInvestments(), loadGoals()]);
    setLoading(false);
  };

  const loadInvestments = async () => {
    try {
      const { data, error } = await supabase
        .from('investments')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setInvestments(data || []);
    } catch (error) {
      console.error('Erro ao carregar investimentos:', error);
      toast({
        title: "Erro",
        description: "Erro ao carregar investimentos",
        variant: "destructive"
      });
    }
  };

  const loadGoals = async () => {
    try {
      const { data, error } = await supabase
        .from('investment_goals')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setGoals(data || []);
    } catch (error) {
      console.error('Erro ao carregar metas:', error);
      toast({
        title: "Erro",
        description: "Erro ao carregar metas de investimento",
        variant: "destructive"
      });
    }
  };

  const totalInvested = investments.reduce((sum, inv) => sum + inv.amount, 0);
  const totalCurrentValue = investments.reduce((sum, inv) => sum + inv.current_value, 0);
  const totalReturn = totalInvested > 0 ? ((totalCurrentValue - totalInvested) / totalInvested) * 100 : 0;

  // Get unique investment types and their data
  const investmentTypes = [...new Set(investments.map(inv => inv.type))];
  
  const getTypeData = (type: string) => {
    const typeInvestments = investments.filter(inv => inv.type === type);
    const typeTotal = typeInvestments.reduce((sum, inv) => sum + inv.current_value, 0);
    const typePercentage = totalCurrentValue > 0 ? (typeTotal / totalCurrentValue) * 100 : 0;
    return { typeInvestments, typeTotal, typePercentage };
  };

  const handleTypeClick = (type: string) => {
    setSelectedType(type);
    setModalOpen(true);
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="p-6 space-y-6">
          <div className="animate-pulse space-y-4">
            <div className="h-8 bg-muted rounded w-1/4"></div>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              {[1,2,3,4].map(i => (
                <div key={i} className="h-24 bg-muted rounded"></div>
              ))}
            </div>
          </div>
        </div>
      </DashboardLayout>
    );
  }

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
          <div className="flex gap-2">
            <AddGoalDialog onSuccess={loadGoals} />
            <AddInvestmentDialog 
              trigger={
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Novo Investimento
                </Button>
              }
              onSuccess={loadInvestments}
            />
          </div>
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
        {investments.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Minha Carteira</CardTitle>
              <CardDescription>
                Detalhamento dos seus investimentos atuais
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {investments.map((investment) => {
                  const investmentReturn = investment.amount > 0 
                    ? ((investment.current_value - investment.amount) / investment.amount) * 100 
                    : 0;
                  const allocation = totalCurrentValue > 0 
                    ? (investment.current_value / totalCurrentValue) * 100 
                    : 0;

                  return (
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
                              {allocation.toFixed(1)}% da carteira
                            </span>
                            {investment.maturity_date && (
                              <span className="text-xs text-muted-foreground">
                                Venc: {new Date(investment.maturity_date).toLocaleDateString('pt-BR')}
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
                              {investment.current_value.toLocaleString('pt-BR', {
                                style: 'currency',
                                currency: 'BRL'
                              })}
                            </p>
                          </div>
                          <div>
                            <p className="text-sm text-muted-foreground">Retorno</p>
                            <p className={cn(
                              "font-semibold",
                              investmentReturn >= 0 ? "text-success" : "text-destructive"
                            )}>
                              {investmentReturn >= 0 ? "+" : ""}{investmentReturn.toFixed(2)}%
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Investment Goals */}
        {goals.length > 0 && (
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
                {goals.map((goal) => {
                  const progress = goal.target_amount > 0 
                    ? (goal.current_amount / goal.target_amount) * 100 
                    : 0;

                  return (
                    <div key={goal.id} className="space-y-4">
                      <div className="flex items-center justify-between">
                        <h4 className="font-medium">{goal.name}</h4>
                        <Badge variant="outline" className="text-xs">
                          {progress.toFixed(1)}%
                        </Badge>
                      </div>
                      
                      <Progress value={progress} className="h-2" />
                      
                      <div className="flex justify-between text-sm text-muted-foreground">
                        <span>
                          {goal.current_amount.toLocaleString('pt-BR', {
                            style: 'currency',
                            currency: 'BRL'
                          })}
                        </span>
                        <span>
                          {goal.target_amount.toLocaleString('pt-BR', {
                            style: 'currency',
                            currency: 'BRL'
                          })}
                        </span>
                      </div>
                      
                      <div className="text-xs text-muted-foreground">
                        Faltam {(goal.target_amount - goal.current_amount).toLocaleString('pt-BR', {
                          style: 'currency',
                          currency: 'BRL'
                        })} para atingir a meta
                      </div>

                      {goal.target_date && (
                        <div className="text-xs text-muted-foreground">
                          Meta para: {new Date(goal.target_date).toLocaleDateString('pt-BR')}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Asset Allocation */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Distribuição por Tipo</CardTitle>
              <CardDescription>
                Como seus investimentos estão distribuídos (clique para ver detalhes)
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {investmentTypes.length > 0 ? (
                  investmentTypes.map((type) => {
                    const { typeTotal, typePercentage } = getTypeData(type);
                    
                    return (
                      <div 
                        key={type} 
                        className="space-y-2 cursor-pointer hover:bg-muted/50 p-2 rounded transition-colors"
                        onClick={() => handleTypeClick(type)}
                      >
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
                  })
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <PieChart className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>Nenhum investimento cadastrado ainda.</p>
                    <p className="text-sm">Adicione seu primeiro investimento para ver a distribuição.</p>
                  </div>
                )}
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

        {/* Empty State */}
        {investments.length === 0 && (
          <Card>
            <CardContent className="p-12 text-center">
              <TrendingUp className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
              <h3 className="text-lg font-semibold mb-2">Nenhum investimento cadastrado</h3>
              <p className="text-muted-foreground mb-4">
                Comece a construir sua carteira de investimentos adicionando seu primeiro investimento.
              </p>
              <AddInvestmentDialog 
                trigger={
                  <Button>
                    <Plus className="h-4 w-4 mr-2" />
                    Adicionar Primeiro Investimento
                  </Button>
                }
                onSuccess={loadInvestments}
              />
            </CardContent>
          </Card>
        )}

        {/* Investment Details Modal */}
        <InvestmentDetailsModal
          open={modalOpen}
          onOpenChange={setModalOpen}
          type={selectedType}
          investments={selectedType ? getTypeData(selectedType).typeInvestments : []}
        />
      </div>
    </DashboardLayout>
  );
};

export default Investments;