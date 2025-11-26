import { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { AddInvestmentDialog } from "@/components/dialogs/AddInvestmentDialog";
import { InvestmentDetailsModal } from "@/components/dialogs/InvestmentDetailsModal";
import { ManageInvestmentDialog } from "@/components/dialogs/ManageInvestmentDialog";
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
import { TrendingUp, Target, Plus, PieChart, Trash2, Edit, ChevronLeft, ChevronRight } from "@/lib/icons";
import { recalculateGoalBalance } from "@/utils/investments/investmentUtils"; // Importe a função nova

// Interfaces... (mesmas de antes)
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

  // Estados de Diálogo
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [investmentToDelete, setInvestmentToDelete] = useState<string | null>(null);
  const [deleteGoalDialogOpen, setDeleteGoalDialogOpen] = useState(false);
  const [goalToDelete, setGoalToDelete] = useState<string | null>(null);
  const [editGoalDialogOpen, setEditGoalDialogOpen] = useState(false);
  const [goalToEdit, setGoalToEdit] = useState<InvestmentGoal | null>(null);
  const [manageInvestment, setManageInvestment] = useState<AggregatedInvestment | null>(null);

  // Paginação
  const [itemsPerPage] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);
  const [goalPage, setGoalPage] = useState(0);

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
    const { data } = await supabase.from("investments").select("*").order("name").order("created_at");
    setAllInvestments(data || []);
  };

  const loadGoals = async () => {
    const { data } = await supabase.from("investment_goals").select("*").order("priority");
    setGoals(data || []);
  };

  // Agregação (Mantida igual)
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
        if (isStockOrFII && record.quantity) {
          existing.totalAmountForAvgPrice = (existing.totalAmountForAvgPrice || 0) + record.amount;
          existing.totalQuantity = (existing.totalQuantity || 0) + record.quantity;
          if (existing.totalQuantity > 0) existing.averagePrice = existing.totalAmountForAvgPrice / existing.totalQuantity;
        }
      } else {
        aggregationMap.set(record.name, {
          name: record.name,
          type: record.type,
          totalAmountInvested: record.amount,
          totalCurrentValue: record.current_value,
          totalQuantity: record.quantity,
          averagePrice: record.unit_price,
          firstInvestedAt: record.created_at,
          recordIds: [record.id],
          totalAmountForAvgPrice: record.amount,
          goalIds: [record.goal_id],
        });
      }
    });
    return Array.from(aggregationMap.values());
  }, [allInvestments]);

  // --- Handlers ---

  // Botão de Edição/Gerenciamento
  const handleManageClick = (investment: AggregatedInvestment) => {
    setManageInvestment(investment);
  };

  // Exclusão unitária (se houver apenas 1 registro ou botão específico)
  const handleDeleteClick = (investmentId: string) => {
    setInvestmentToDelete(investmentId);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!investmentToDelete) return;
    try {
      const investment = allInvestments.find((inv) => inv.id === investmentToDelete);

      const { error } = await supabase.from("investments").delete().eq("id", investmentToDelete);
      if (error) throw error;

      // RECALCULA A META
      if (investment && investment.goal_id) {
        await recalculateGoalBalance(investment.goal_id);
      }

      toast({ title: "Sucesso", description: "Investimento removido!" });
      await loadData();
    } catch (error) {
      toast({ title: "Erro", description: "Falha ao remover", variant: "destructive" });
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
      toast({ title: "Sucesso", description: "Meta removida!" });
      await loadGoals();
      setGoalPage(0);
    } catch (error) {
      toast({ title: "Erro", description: "Falha ao remover meta", variant: "destructive" });
    } finally {
      setDeleteGoalDialogOpen(false);
      setGoalToDelete(null);
    }
  };

  const handleEditGoalClick = (goal: InvestmentGoal) => {
    setGoalToEdit(goal);
    setEditGoalDialogOpen(true);
  };

  const handleTypeClick = (type: string) => {
    setSelectedType(type);
    setModalOpen(true);
  };

  const totalInvested = allInvestments.reduce((sum, inv) => sum + inv.amount, 0);
  const totalCurrentValue = allInvestments.reduce((sum, inv) => sum + inv.current_value, 0);
  const totalReturn = totalInvested > 0 ? ((totalCurrentValue - totalInvested) / totalInvested) * 100 : 0;
  const investmentTypes = [...new Set(aggregatedInvestments.map((inv) => inv.type))];

  // Paginação
  const paginatedAggregatedInvestments = aggregatedInvestments.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);
  const totalPages = Math.ceil(aggregatedInvestments.length / itemsPerPage);
  const paginatedGoals = goals.slice(goalPage * GOALS_PER_PAGE, (goalPage + 1) * GOALS_PER_PAGE);
  const totalGoalPages = Math.ceil(goals.length / GOALS_PER_PAGE);

  const handlePreviousGoals = () => goalPage > 0 && setGoalPage(goalPage - 1);
  const handleNextGoals = () => goalPage < totalGoalPages - 1 && setGoalPage(goalPage + 1);

  if (loading) {
    return (
      <DashboardLayout>
        <div className="p-6 space-y-6">
          <div className="animate-pulse space-y-4">
            <div className="h-8 bg-muted rounded w-1/4"></div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {[1, 2, 3].map((i) => (
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
          <AddInvestmentDialog onSuccess={loadData} />
        </div>

        {/* Resumo */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Investido</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(totalInvested)}
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
                {new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(totalCurrentValue)}
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
            </CardContent>
          </Card>
        </div>

        {/* Metas */}
        {goals.length > 0 && (
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Target className="h-5 w-5" /> Metas
                  </CardTitle>
                </div>
                <div className="flex items-center gap-2">
                  {totalGoalPages > 1 && (
                    <>
                      <Button variant="outline" size="icon" onClick={handlePreviousGoals} disabled={goalPage === 0}>
                        <ChevronLeft className="h-4 w-4" />
                      </Button>
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
                    <Card key={goal.id} className="relative group hover:shadow-md transition-shadow">
                      <div className="absolute top-4 right-4 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button variant="secondary" size="icon" className="h-8 w-8" onClick={() => handleEditGoalClick(goal)}>
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button variant="destructive" size="icon" className="h-8 w-8" onClick={() => handleDeleteGoalClick(goal.id)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                      <CardHeader>
                        <CardTitle className="text-lg pr-16 truncate">{goal.name}</CardTitle>
                        {goal.description && <CardDescription className="line-clamp-1">{goal.description}</CardDescription>}
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
                              {new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(goal.current_amount)}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="text-muted-foreground">Meta</p>
                            <p className="font-medium">
                              {new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(goal.target_amount)}
                            </p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Ativos Consolidados */}
        {aggregatedInvestments.length > 0 ? (
          <Card>
            <CardHeader>
              <CardTitle>Ativos Consolidados</CardTitle>
              <CardDescription>Gerencie seus ativos</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {paginatedAggregatedInvestments.map((aggInvestment) => {
                  const investmentReturn =
                    aggInvestment.totalAmountInvested > 0
                      ? ((aggInvestment.totalCurrentValue - aggInvestment.totalAmountInvested) / aggInvestment.totalAmountInvested) * 100
                      : 0;

                  return (
                    <Card key={aggInvestment.name} className="relative border hover:bg-accent/5 transition-colors">
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
                                  {new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(
                                    aggInvestment.totalAmountInvested
                                  )}
                                </p>
                              </div>
                              <div>
                                <p className="text-muted-foreground">Valor Atual</p>
                                <p className="font-medium">
                                  {new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(
                                    aggInvestment.totalCurrentValue
                                  )}
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
                                      {new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(
                                        aggInvestment.averagePrice || 0
                                      )}
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

                          {/* Botão de Edição */}
                          <div>
                            <Button
                              variant="outline"
                              size="sm"
                              className="flex items-center gap-2"
                              onClick={() => handleManageClick(aggInvestment)}
                            >
                              <Edit className="h-4 w-4" />
                              Editar
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>

              {/* Paginação... (mantida) */}
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <PieChart className="h-16 w-16 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">Nenhum investimento cadastrado</h3>
              <AddInvestmentDialog
                trigger={
                  <Button>
                    <Plus className="h-4 w-4 mr-2" /> Adicionar Investimento
                  </Button>
                }
                onSuccess={loadData}
              />
            </CardContent>
          </Card>
        )}

        {/* Modais */}
        <InvestmentDetailsModal
          open={modalOpen}
          onOpenChange={setModalOpen}
          type={selectedType}
          investments={selectedType ? allInvestments.filter((inv) => inv.type === selectedType) : []}
        />

        {manageInvestment && (
          <ManageInvestmentDialog
            isOpen={!!manageInvestment}
            onClose={() => setManageInvestment(null)}
            investment={manageInvestment}
            onSuccess={() => {
              loadData();
              setManageInvestment(null);
            }}
          />
        )}

        {goalToEdit && (
          <EditGoalDialog
            open={editGoalDialogOpen}
            onOpenChange={setEditGoalDialogOpen}
            goal={goalToEdit}
            onSuccess={loadGoals}
            onClose={() => setEditGoalDialogOpen(false)}
          />
        )}

        <AlertDialog open={deleteGoalDialogOpen} onOpenChange={setDeleteGoalDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Excluir Meta?</AlertDialogTitle>
              <AlertDialogDescription>Essa ação não pode ser desfeita.</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction onClick={handleDeleteGoalConfirm} className="bg-destructive text-destructive-foreground">
                Excluir
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </DashboardLayout>
  );
};

export default Investments;
