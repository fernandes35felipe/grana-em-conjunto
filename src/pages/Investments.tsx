import { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { AddInvestmentDialog } from "@/components/dialogs/AddInvestmentDialog";
import { InvestmentDetailsModal } from "@/components/dialogs/InvestmentDetailsModal";
import { InvestmentAdjustmentDialog } from "@/components/dialogs/InvestmentAdjustmentDialog";
import { AddGoalDialog } from "@/components/dialogs/AddGoalDialog";
import { EditGoalDialog } from "@/components/dialogs/EditGoalDialog";
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
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { TrendingUp, Target, Plus, PieChart, Trash2, Edit, ChevronLeft, ChevronRight, Settings } from "@/lib/icons";

interface InvestmentRecord {
  id: string;
  name: string;
  type: string;
  amount: number;
  current_value: number;
  group_id: string | null;
  maturity_date: string | null;
  user_id: string;
  created_at: string;
  quantity: number | null;
  unit_price: number | null;
  goal_id: string | null;
}

interface AggregatedInvestment {
  name: string;
  type: string;
  totalAmountInvested: number;
  totalCurrentValue: number;
  totalQuantity: number | null;
  averagePrice: number | null;
  firstInvestedAt: string;
  recordIds: string[];
  totalAmountForAvgPrice?: number;
  goalIds: (string | null)[];
}

interface InvestmentGoal {
  id: string;
  name: string;
  target_amount: number;
  current_amount: number;
  color: string;
  description?: string;
  target_date?: string;
  priority: number;
}

const Investments = () => {
  const [allInvestments, setAllInvestments] = useState<InvestmentRecord[]>([]);
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
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);
  const [goalPage, setGoalPage] = useState(0);
  const [adjustmentTarget, setAdjustmentTarget] = useState<AggregatedInvestment | null>(null);
  const { toast } = useToast();

  const GOALS_PER_PAGE = 3;
  useEffect(() => {
    loadData();
  }, []);
  const loadData = async () => {
    setLoading(true);
    await Promise.all([loadInvestments(), loadGoals()]);
    setLoading(false);
  };
  const loadInvestments = async () => {
    try {
      const { data, error } = await supabase
        .from("investments")
        .select("*")
        .order("name", { ascending: true })
        .order("created_at", { ascending: true });
      if (error) throw error;
      setAllInvestments(data || []);
    } catch (error) {
      console.error("Erro ao carregar investimentos:", error);
      toast({
        title: "Erro",
        description: "Erro ao carregar investimentos",
        variant: "destructive",
      });
    }
  };

  const loadGoals = async () => {
    try {
      const { data, error } = await supabase
        .from("investment_goals")
        .select("*")
        .order("priority", { ascending: true })
        .order("created_at", { ascending: false });
      if (error) throw error;
      setGoals(data || []);
    } catch (error) {
      console.error("Erro ao carregar metas:", error);
      toast({
        title: "Erro",
        description: "Erro ao carregar metas de investimento",
        variant: "destructive",
      });
    }
  };

  /**
   * CORREÇÃO: Esta função agora soma 'current_value' em vez de 'amount'
   * para refletir o valor atualizado dos investimentos na meta.
   */
  const recalculateGoalAmount = async (goalId: string) => {
    try {
      const { data: investments, error: investmentsError } = await supabase
        .from("investments")
        .select("current_value") // Corrigido de "amount" para "current_value"
        .eq("goal_id", goalId);
      if (investmentsError) throw investmentsError;

      const totalAmount = investments?.reduce((sum, inv) => sum + inv.current_value, 0) || 0; // Corrigido de inv.amount
      const { error: updateError } = await supabase.from("investment_goals").update({ current_amount: totalAmount }).eq("id", goalId);

      if (updateError) throw updateError;

      await loadGoals();
    } catch (error) {
      console.error("Erro ao recalcular valor da meta:", error);
    }
  };

  // NOVA FUNÇÃO: Handler para o onSuccess do AddInvestmentDialog
  const handleAddInvestmentSuccess = async (addedInvestment: { goal_id: string | null }) => {
    if (addedInvestment.goal_id) {
      await recalculateGoalAmount(addedInvestment.goal_id);
    }
    await loadInvestments(); // Recarrega a lista de investimentos
  };

  const aggregatedInvestments = useMemo(() => {
    const aggregationMap = new Map<string, AggregatedInvestment>();

    allInvestments.forEach((record) => {
      const existing = aggregationMap.get(record.name);
      const isStockOrFII = record.type === "Ações" || record.type === "FIIs";

      if (existing) {
        existing.totalAmountInvested += record.amount;
        existing.totalCurrentValue += record.current_value;
        existing.recordIds.push(record.id);
        existing.goalIds.push(record.goal_id);

        if (isStockOrFII && record.quantity !== null && record.quantity !== 0) {
          existing.totalAmountForAvgPrice = (existing.totalAmountForAvgPrice || 0) + record.amount;
          existing.totalQuantity = (existing.totalQuantity || 0) + record.quantity;

          if (existing.totalQuantity > 0) {
            existing.averagePrice = existing.totalAmountForAvgPrice / existing.totalQuantity;
          }
        }
      } else {
        aggregationMap.set(record.name, {
          name: record.name,
          type: record.type,
          totalAmountInvested: record.amount,
          totalCurrentValue: record.current_value,
          totalQuantity: isStockOrFII && record.quantity !== null ? record.quantity : null,
          averagePrice: isStockOrFII && record.unit_price !== null ? record.unit_price : null,
          firstInvestedAt: record.created_at,
          recordIds: [record.id],
          totalAmountForAvgPrice: isStockOrFII && record.quantity !== null && record.quantity !== 0 ? record.amount : undefined,
          goalIds: [record.goal_id],
        });
      }
    });

    return Array.from(aggregationMap.values());
  }, [allInvestments]);

  const handleDeleteClick = (investmentId: string) => {
    setInvestmentToDelete(investmentId);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!investmentToDelete) return;
    try {
      const investmentToRemove = allInvestments.find((inv) => inv.id === investmentToDelete);
      const goalId = investmentToRemove?.goal_id;
      const { error } = await supabase.from("investments").delete().eq("id", investmentToDelete);
      if (error) throw error;
      if (goalId) {
        await recalculateGoalAmount(goalId);
      }

      toast({
        title: "Sucesso",
        description: "Registro de investimento removido com sucesso!",
      });
      await loadInvestments();
    } catch (error) {
      console.error("Erro ao remover investimento:", error);
      toast({
        title: "Erro",
        description: "Erro ao remover o registro. Tente novamente.",
        variant: "destructive",
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
      const { error } = await supabase.from("investment_goals").delete().eq("id", goalToDelete);
      if (error) throw error;
      toast({
        title: "Sucesso",
        description: "Meta removida com sucesso!",
      });
      await loadGoals();
      setGoalPage(0);
    } catch (error) {
      console.error("Erro ao remover meta:", error);
      toast({
        title: "Erro",
        description: "Erro ao remover a meta. Tente novamente.",
        variant: "destructive",
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
  const handleAdjustmentClick = (investment: AggregatedInvestment) => {
    setAdjustmentTarget(investment);
  };
  const handleAdjustmentSuccess = async () => {
    const uniqueGoalIds = [...new Set(adjustmentTarget?.goalIds.filter((id) => id !== null))];
    for (const goalId of uniqueGoalIds) {
      if (goalId) {
        await recalculateGoalAmount(goalId);
      }
    }

    await loadInvestments();
    setAdjustmentTarget(null);
  };
  const totalInvested = allInvestments.reduce((sum, inv) => sum + inv.amount, 0);
  const totalCurrentValue = allInvestments.reduce((sum, inv) => sum + inv.current_value, 0);
  const totalReturn = totalInvested > 0 ? ((totalCurrentValue - totalInvested) / totalInvested) * 100 : 0;
  const investmentTypes = [...new Set(aggregatedInvestments.map((inv) => inv.type))];

  const getTypeData = (type: string) => {
    const typeInvestmentsRaw = allInvestments.filter((inv) => inv.type === type);
    const typeTotal = aggregatedInvestments.filter((inv) => inv.type === type).reduce((sum, inv) => sum + inv.totalCurrentValue, 0);
    const typePercentage = totalCurrentValue > 0 ? (typeTotal / totalCurrentValue) * 100 : 0;
    return { typeInvestments: typeInvestmentsRaw, typeTotal, typePercentage };
  };

  const handleTypeClick = (type: string) => {
    setSelectedType(type);
    setModalOpen(true);
  };

  const paginatedAggregatedInvestments = aggregatedInvestments.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);
  const totalPages = Math.ceil(aggregatedInvestments.length / itemsPerPage);
  const paginatedGoals = goals.slice(goalPage * GOALS_PER_PAGE, (goalPage + 1) * GOALS_PER_PAGE);
  const totalGoalPages = Math.ceil(goals.length / GOALS_PER_PAGE);
  const handlePreviousGoals = () => {
    if (goalPage > 0) setGoalPage(goalPage - 1);
  };
  const handleNextGoals = () => {
    if (goalPage < totalGoalPages - 1) setGoalPage(goalPage + 1);
  };
  if (loading) {
    return (
      <DashboardLayout>
        <div className="p-6 space-y-6">
          <div className="animate-pulse space-y-4">
            <div className="h-8 bg-muted rounded w-1/4"></div>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              {[1, 2, 3, 4].map((i) => (
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
            <p className="text-muted-foreground">Acompanhe e gerencie seu portfólio</p>
          </div>
          {/* MODIFICADO: Passando goals e usando o novo handler */}
          <AddInvestmentDialog onSuccess={handleAddInvestmentSuccess} goals={goals} />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Investido</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {new Intl.NumberFormat("pt-BR", {
                  style: "currency",
                  currency: "BRL",
                }).format(totalInvested)}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Valor Atual</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {new Intl.NumberFormat("pt-BR", {
                  style: "currency",
                  currency: "BRL",
                }).format(totalCurrentValue)}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Rentabilidade</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className={`text-2xl font-bold ${totalReturn >= 0 ? "text-success" : "text-destructive"}`}>
                {totalReturn >= 0 ? "+" : ""}
                {totalReturn.toFixed(2)}%
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {totalReturn >= 0 ? "+" : ""}
                {new Intl.NumberFormat("pt-BR", {
                  style: "currency",
                  currency: "BRL",
                }).format(totalCurrentValue - totalInvested)}
              </p>
            </CardContent>
          </Card>
        </div>

        {goals.length > 0 && (
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Target className="h-5 w-5" />
                    Metas de Investimento
                  </CardTitle>
                  <CardDescription>Acompanhe o progresso das suas metas financeiras</CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  {totalGoalPages > 1 && (
                    <>
                      <Button variant="outline" size="icon" onClick={handlePreviousGoals} disabled={goalPage === 0}>
                        <ChevronLeft className="h-4 w-4" />
                      </Button>
                      <span className="text-sm text-muted-foreground">
                        {goalPage + 1} / {totalGoalPages}
                      </span>
                      <Button variant="outline" size="icon" onClick={handleNextGoals} disabled={goalPage >= totalGoalPages - 1}>
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                    </>
                  )}
                  <AddGoalDialog onSuccess={loadGoals} />
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {paginatedGoals.map((goal) => {
                  const progress = goal.target_amount > 0 ? (goal.current_amount / goal.target_amount) * 100 : 0;
                  return (
                    <Card key={goal.id} className="relative">
                      <div className="absolute top-4 right-4 flex gap-2">
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleEditGoalClick(goal)}>
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive"
                          onClick={() => handleDeleteGoalClick(goal.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                      <CardHeader>
                        <CardTitle className="text-lg pr-16">{goal.name}</CardTitle>
                        {goal.description && <CardDescription>{goal.description}</CardDescription>}
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div className="space-y-2">
                          <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">Progresso</span>
                            <span className="font-medium">{Math.min(progress, 100).toFixed(1)}%</span>
                          </div>
                          <Progress value={Math.min(progress, 100)} className="h-2" />
                        </div>
                        <div className="flex justify-between text-sm">
                          <div>
                            <p className="text-muted-foreground">Atual</p>
                            <p className="font-medium">
                              {new Intl.NumberFormat("pt-BR", {
                                style: "currency",
                                currency: "BRL",
                              }).format(goal.current_amount)}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="text-muted-foreground">Meta</p>
                            <p className="font-medium">
                              {new Intl.NumberFormat("pt-BR", {
                                style: "currency",
                                currency: "BRL",
                              }).format(goal.target_amount)}
                            </p>
                          </div>
                        </div>
                        {goal.target_date && (
                          <p className="text-xs text-muted-foreground">Prazo: {new Date(goal.target_date).toLocaleDateString("pt-BR")}</p>
                        )}
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        )}

        {investmentTypes.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Distribuição por Tipo</CardTitle>
              <CardDescription>Composição do seu portfólio</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {investmentTypes.map((type) => {
                  const { typeTotal, typePercentage } = getTypeData(type);
                  return (
                    <div
                      key={type}
                      className="space-y-2 cursor-pointer hover:bg-muted/50 p-3 rounded-lg transition-colors"
                      onClick={() => handleTypeClick(type)}
                    >
                      <div className="flex justify-between items-center">
                        <span className="font-medium">{type}</span>
                        <div className="text-right">
                          <p className="font-medium">
                            {new Intl.NumberFormat("pt-BR", {
                              style: "currency",
                              currency: "BRL",
                            }).format(typeTotal)}
                          </p>
                          <p className="text-sm text-muted-foreground">{typePercentage.toFixed(1)}%</p>
                        </div>
                      </div>
                      <Progress value={typePercentage} className="h-2" />
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        )}

        {aggregatedInvestments.length > 0 ? (
          <Card>
            <CardHeader>
              <CardTitle>Ativos Consolidados</CardTitle>
              <CardDescription>Visão agregada dos seus investimentos</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {paginatedAggregatedInvestments.map((aggInvestment) => {
                  const investmentReturn =
                    aggInvestment.totalAmountInvested > 0
                      ? ((aggInvestment.totalCurrentValue - aggInvestment.totalAmountInvested) / aggInvestment.totalAmountInvested) * 100
                      : 0;

                  return (
                    <Card key={aggInvestment.name} className="relative">
                      <CardContent className="pt-6">
                        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <h3 className="text-lg font-semibold">{aggInvestment.name}</h3>
                              <span className="text-xs px-2 py-1 bg-muted rounded-full">{aggInvestment.type}</span>
                            </div>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                              <div>
                                <p className="text-muted-foreground">Investido</p>
                                <p className="font-medium">
                                  {new Intl.NumberFormat("pt-BR", {
                                    style: "currency",
                                    currency: "BRL",
                                  }).format(aggInvestment.totalAmountInvested)}
                                </p>
                              </div>
                              <div>
                                <p className="text-muted-foreground">Valor Atual</p>
                                <p className="font-medium">
                                  {new Intl.NumberFormat("pt-BR", {
                                    style: "currency",
                                    currency: "BRL",
                                  }).format(aggInvestment.totalCurrentValue)}
                                </p>
                              </div>
                              {aggInvestment.totalQuantity !== null && (
                                <>
                                  <div>
                                    <p className="text-muted-foreground">Quantidade</p>
                                    <p className="font-medium">{aggInvestment.totalQuantity}</p>
                                  </div>
                                  <div>
                                    <p className="text-muted-foreground">Preço Médio</p>
                                    <p className="font-medium">
                                      {new Intl.NumberFormat("pt-BR", {
                                        style: "currency",
                                        currency: "BRL",
                                      }).format(aggInvestment.averagePrice || 0)}
                                    </p>
                                  </div>
                                </>
                              )}
                              <div>
                                <p className="text-muted-foreground">Rentabilidade</p>
                                <p className={`font-medium ${investmentReturn >= 0 ? "text-success" : "text-destructive"}`}>
                                  {investmentReturn >= 0 ? "+" : ""}
                                  {investmentReturn.toFixed(2)}%
                                </p>
                              </div>
                            </div>
                          </div>
                          <div className="flex gap-2">
                            <Button
                              variant="outline"
                              size="icon"
                              onClick={() => handleAdjustmentClick(aggInvestment)}
                              title="Ajustar investimento"
                            >
                              <Settings className="h-4 w-4" />
                            </Button>
                            {aggInvestment.recordIds.length === 1 && (
                              <Button
                                variant="outline"
                                size="icon"
                                className="text-destructive"
                                onClick={() => handleDeleteClick(aggInvestment.recordIds[0])}
                                title="Remover investimento"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            )}
                            {aggInvestment.recordIds.length > 1 && (
                              <Button
                                variant="outline"
                                size="icon"
                                className="text-destructive"
                                onClick={() => handleDeleteClick(aggInvestment.recordIds[aggInvestment.recordIds.length - 1])}
                                title="Remover último registro adicionado"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>

              {totalPages > 1 && (
                <div className="flex items-center justify-between mt-6">
                  <p className="text-sm text-muted-foreground">
                    Mostrando {(currentPage - 1) * itemsPerPage + 1} a {Math.min(currentPage * itemsPerPage, aggregatedInvestments.length)}{" "}
                    de {aggregatedInvestments.length} ativos
                  </p>
                  <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" onClick={() => setCurrentPage(currentPage - 1)} disabled={currentPage === 1}>
                      Anterior
                    </Button>
                    <span className="text-sm px-4">
                      Página {currentPage} de {totalPages}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(currentPage + 1)}
                      disabled={currentPage >= totalPages}
                    >
                      Próxima
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <PieChart className="h-16 w-16 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">Nenhum investimento cadastrado</h3>
              <p className="text-muted-foreground mb-4 text-center">Comece a acompanhar seus investimentos agora</p>
              {/* MODIFICADO: Passando goals e usando o novo handler */}
              <AddInvestmentDialog
                trigger={
                  <Button>
                    <Plus className="h-4 w-4 mr-2" /> Adicionar Primeiro Investimento
                  </Button>
                }
                onSuccess={handleAddInvestmentSuccess}
                goals={goals}
              />
            </CardContent>
          </Card>
        )}

        <InvestmentDetailsModal
          open={modalOpen}
          onOpenChange={setModalOpen}
          type={selectedType}
          investments={selectedType ? allInvestments.filter((inv) => inv.type === selectedType) : []}
        />

        {adjustmentTarget && (
          <InvestmentAdjustmentDialog
            open={!!adjustmentTarget}
            onOpenChange={(open) => !open && setAdjustmentTarget(null)}
            investment={adjustmentTarget}
            onSuccess={handleAdjustmentSuccess}
          />
        )}

        {goalToEdit && (
          <EditGoalDialog
            open={editGoalDialogOpen}
            onOpenChange={setEditGoalDialogOpen}
            goal={goalToEdit}
            onSuccess={loadGoals}
            onClose={handleEditGoalClose}
          />
        )}

        <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
              <AlertDialogDescription>
                Tem certeza que deseja remover este registro de investimento? Esta ação não pode ser desfeita e atualizará automaticamente
                os valores das metas associadas.
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

        <AlertDialog open={deleteGoalDialogOpen} onOpenChange={setDeleteGoalDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
              <AlertDialogDescription>
                Tem certeza que deseja remover esta meta de investimento? Esta ação não pode ser desfeita.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDeleteGoalConfirm}
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

export default Investments;
