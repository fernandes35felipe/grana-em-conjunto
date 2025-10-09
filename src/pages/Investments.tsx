import { useState, useEffect } from "react";
import { TrendingUp, TrendingDown, PieChart, Plus, Target, DollarSign, Trash2, Edit } from "lucide-react";

import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { AddInvestmentDialog } from "@/components/dialogs/AddInvestmentDialog";
import { AddGoalDialog } from "@/components/dialogs/AddGoalDialog";
import { EditGoalDialog } from "@/components/dialogs/EditGoalDialog";
import { InvestmentDetailsModal } from "@/components/dialogs/InvestmentDetailsModal";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
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
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [investmentToDelete, setInvestmentToDelete] = useState<string | null>(null);
  const [deleteGoalDialogOpen, setDeleteGoalDialogOpen] = useState(false);
  const [goalToDelete, setGoalToDelete] = useState<string | null>(null);
  const [editGoalDialogOpen, setEditGoalDialogOpen] = useState(false);
  const [goalToEdit, setGoalToEdit] = useState<InvestmentGoal | null>(null);
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

  const handleDeleteClick = (investmentId: string) => {
    setInvestmentToDelete(investmentId);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!investmentToDelete) return;

    try {
      const { error } = await supabase
        .from('investments')
        .delete()
        .eq('id', investmentToDelete);

      if (error) throw error;

      toast({
        title: "Sucesso",
        description: "Investimento removido com sucesso!"
      });

      await loadInvestments();
    } catch (error) {
      console.error('Erro ao remover investimento:', error);
      toast({
        title: "Erro",
        description: "Erro ao remover o investimento. Tente novamente.",
        variant: "destructive"
      });
    } finally {
      setDeleteDialogOpen(false);
      setInvestmentToDelete(null);
    }
  };

  const handleDeleteGoalClick = (goalId: string) => {
    setGoalToDelete(goalId);
    setDeleteGoalDialogOpen(true);
  };

  const handleDeleteGoalConfirm = async () => {
    if (!goalToDelete) return;

    try {
      const { error } = await supabase
        .from('investment_goals')
        .delete()
        .eq('id', goalToDelete);

      if (error) throw error;

      toast({
        title: "Sucesso",
        description: "Meta removida com sucesso!"
      });

      await loadGoals();
    } catch (error) {
      console.error('Erro ao remover meta:', error);
      toast({
        title: "Erro",
        description: "Erro ao remover a meta. Tente novamente.",
        variant: "destructive"
      });
    } finally {
      setDeleteGoalDialogOpen(false);
      setGoalToDelete(null);
    }
  };

  const handleEditGoalClick = (goal: InvestmentGoal) => {
    setGoalToEdit(goal);
    setEditGoalDialogOpen(true);
  };

  const handleEditGoalClose = () => {
    setEditGoalDialogOpen(false);
    setGoalToEdit(null);
  };

  const totalInvested = investments.reduce((sum, inv) => sum + inv.amount, 0);
  const totalCurrentValue = investments.reduce((sum, inv) => sum + inv.current_value, 0);
  const totalReturn = totalInvested > 0 ? ((totalCurrentValue - totalInvested) / totalInvested) * 100 : 0;

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
                  <p className="text-2xl font-bold">
                    {totalCurrentValue.toLocaleString('pt-BR', {
                      style: 'currency',
                      currency: 'BRL'
                    })}
                  </p>
                </div>
                <TrendingUp className="h-8 w-8 text-success" />
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
                    {totalReturn >= 0 ? '+' : ''}{totalReturn.toFixed(2)}%
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
                    totalCurrentValue - totalInvested >= 0 ? "text-success" : "text-destructive"
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

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Distribuição por Tipo</CardTitle>
              <CardDescription>
                Composição da sua carteira de investimentos
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
              <CardTitle>Metas de Investimento</CardTitle>
              <CardDescription>
                Progresso das suas metas financeiras
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {goals.length > 0 ? (
                  goals.map((goal) => {
                    const progress = (goal.current_amount / goal.target_amount) * 100;
                    
                    return (
                      <div key={goal.id} className="space-y-2 p-3 rounded-lg border border-border hover:bg-muted/50 transition-colors group">
                        <div className="flex justify-between items-center">
                          <div className="flex items-center gap-2">
                            <div 
                              className="w-3 h-3 rounded-full" 
                              style={{ backgroundColor: goal.color || '#3b82f6' }}
                            />
                            <span className="font-medium">{goal.name}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-sm text-muted-foreground">
                              {goal.current_amount.toLocaleString('pt-BR', {
                                style: 'currency',
                                currency: 'BRL'
                              })} / {goal.target_amount.toLocaleString('pt-BR', {
                                style: 'currency',
                                currency: 'BRL'
                              })}
                            </span>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
                              onClick={() => handleEditGoalClick(goal)}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
                              onClick={() => handleDeleteGoalClick(goal.id)}
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </div>
                        </div>
                        <Progress value={progress} className="h-2" />
                        <p className="text-xs text-muted-foreground">
                          {progress.toFixed(1)}% concluído
                        </p>
                      </div>
                    );
                  })
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <Target className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>Nenhuma meta cadastrada ainda.</p>
                    <p className="text-sm">Crie sua primeira meta de investimento.</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Todos os Investimentos</CardTitle>
            <CardDescription>
              Lista completa dos seus investimentos
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {investments.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <TrendingUp className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <h3 className="text-lg font-semibold mb-2">Nenhum investimento cadastrado</h3>
                  <p className="mb-4">
                    Comece a construir sua carteira de investimentos adicionando seu primeiro investimento.
                  </p>
                  <AddInvestmentDialog onSuccess={loadInvestments} />
                </div>
              ) : (
                investments.map((investment) => {
                  const returnValue = investment.current_value - investment.amount;
                  const returnPercentage = (returnValue / investment.amount) * 100;

                  return (
                    <div
                      key={investment.id}
                      className="flex items-center justify-between p-4 rounded-lg border border-border hover:bg-muted/50 transition-colors group"
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="font-medium">{investment.name}</h3>
                          <Badge variant="outline">{investment.type}</Badge>
                        </div>
                        <div className="flex items-center gap-4 text-sm text-muted-foreground">
                          <span>
                            Investido: {investment.amount.toLocaleString('pt-BR', {
                              style: 'currency',
                              currency: 'BRL'
                            })}
                          </span>
                          <span>•</span>
                          <span>
                            Atual: {investment.current_value.toLocaleString('pt-BR', {
                              style: 'currency',
                              currency: 'BRL'
                            })}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <div className={cn(
                            "text-lg font-bold",
                            returnValue >= 0 ? "text-success" : "text-destructive"
                          )}>
                            {returnValue >= 0 ? '+' : ''}
                            {returnValue.toLocaleString('pt-BR', {
                              style: 'currency',
                              currency: 'BRL'
                            })}
                          </div>
                          <div className={cn(
                            "text-sm",
                            returnValue >= 0 ? "text-success" : "text-destructive"
                          )}>
                            {returnPercentage >= 0 ? '+' : ''}{returnPercentage.toFixed(2)}%
                          </div>
                        </div>

                        <Button
                          variant="ghost"
                          size="icon"
                          className="opacity-0 group-hover:opacity-100 transition-opacity"
                          onClick={() => handleDeleteClick(investment.id)}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      <InvestmentDetailsModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        investments={investments.filter(inv => inv.type === selectedType)} type={""}      />

      <EditGoalDialog
        goal={goalToEdit}
        isOpen={editGoalDialogOpen}
        onClose={handleEditGoalClose}
        onSuccess={loadGoals}
      />

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar remoção</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja remover este investimento? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              className="bg-destructive hover:bg-destructive/90"
            >
              Remover
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={deleteGoalDialogOpen} onOpenChange={setDeleteGoalDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar remoção de meta</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja remover esta meta? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteGoalConfirm}
              className="bg-destructive hover:bg-destructive/90"
            >
              Remover
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </DashboardLayout>
  );
};

export default Investments;