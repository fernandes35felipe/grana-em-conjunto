import { useState, useEffect, useMemo } from "react";
import {
  TrendingUp,
  TrendingDown,
  PieChart,
  Plus,
  Target,
  DollarSign,
  Trash2,
  Edit,
  ChevronLeft,
  ChevronRight,
  MinusCircle,
} from "lucide-react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { AddInvestmentDialog } from "@/components/dialogs/AddInvestmentDialog";
import { AddGoalDialog } from "@/components/dialogs/AddGoalDialog";
import { EditGoalDialog } from "@/components/dialogs/EditGoalDialog";
import { InvestmentDetailsModal } from "@/components/dialogs/InvestmentDetailsModal";
import { RemoveInvestmentAmountDialog } from "@/components/dialogs/RemoveInvestmentAmountDialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
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
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

interface InvestmentRecord {
  id: string;
  name: string;
  type: string;
  amount: number;
  current_value: number;
  maturity_date?: string;
  created_at: string;
  quantity: number | null;
  unit_price: number | null;
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

  const aggregatedInvestments = useMemo(() => {
    const aggregationMap = new Map<string, AggregatedInvestment>();

    allInvestments.forEach((record) => {
      const existing = aggregationMap.get(record.name);
      const isStockOrFII = record.type === "Ações" || record.type === "FIIs";

      if (existing) {
        existing.totalAmountInvested += record.amount;
        existing.totalCurrentValue += record.current_value;
        existing.recordIds.push(record.id);

        if (isStockOrFII && record.quantity !== null && record.quantity !== 0) {
          existing.totalAmountForAvgPrice = (existing.totalAmountForAvgPrice ?? 0) + record.amount;
          existing.totalQuantity = (existing.totalQuantity ?? 0) + record.quantity;
        }

        if (new Date(record.created_at) < new Date(existing.firstInvestedAt)) {
          existing.firstInvestedAt = record.created_at;
        }
      } else {
        let initialQuantity = null;
        let initialAveragePrice = null;
        let initialAmountForAvg = 0;

        if (isStockOrFII && record.quantity !== null && record.quantity !== 0) {
          initialQuantity = record.quantity;
          initialAmountForAvg = record.amount;
          initialAveragePrice = record.unit_price ?? record.amount / record.quantity;
        }

        aggregationMap.set(record.name, {
          name: record.name,
          type: record.type,
          totalAmountInvested: record.amount,
          totalCurrentValue: record.current_value,
          totalQuantity: initialQuantity,
          averagePrice: initialAveragePrice,
          firstInvestedAt: record.created_at,
          recordIds: [record.id],
          totalAmountForAvgPrice: initialAmountForAvg,
        });
      }
    });

    aggregationMap.forEach((agg) => {
      if (agg.totalQuantity !== null && agg.totalQuantity !== 0 && agg.totalAmountForAvgPrice !== undefined) {
        agg.averagePrice = agg.totalAmountForAvgPrice / agg.totalQuantity;
      } else if (agg.totalQuantity === 0) {
        agg.averagePrice = 0;
      } else {
        agg.averagePrice = null;
      }
    });

    return Array.from(aggregationMap.values());
  }, [allInvestments]);

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

  const handleDeleteClick = (investmentId: string) => {
    setInvestmentToDelete(investmentId);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!investmentToDelete) return;
    try {
      const { error } = await supabase.from("investments").delete().eq("id", investmentToDelete);
      if (error) throw error;

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
            <p className="text-muted-foreground">Acompanhe o desempenho da sua carteira de investimentos</p>
          </div>
          <div className="flex gap-2">
            <AddGoalDialog
              onSuccess={() => {
                loadGoals();
                setGoalPage(0);
              }}
            />
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
                    {totalInvested.toLocaleString("pt-BR", {
                      style: "currency",
                      currency: "BRL",
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
                    {totalCurrentValue.toLocaleString("pt-BR", {
                      style: "currency",
                      currency: "BRL",
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
                  <p className="text-sm font-medium text-muted-foreground">Lucro/Prejuízo</p>
                  <p className={cn("text-2xl font-bold", totalReturn >= 0 ? "text-success" : "text-destructive")}>
                    {(totalCurrentValue - totalInvested).toLocaleString("pt-BR", {
                      style: "currency",
                      currency: "BRL",
                    })}
                  </p>
                </div>
                {totalReturn >= 0 ? <TrendingUp className="h-8 w-8 text-success" /> : <TrendingDown className="h-8 w-8 text-destructive" />}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Rentabilidade</p>
                  <p className={cn("text-2xl font-bold", totalReturn >= 0 ? "text-success" : "text-destructive")}>
                    {totalReturn >= 0 ? "+" : ""}
                    {totalReturn.toFixed(2)}%
                  </p>
                </div>
                <Target className="h-8 w-8 text-primary" />
              </div>
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
                  <CardDescription>Acompanhe o progresso das suas metas</CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="icon" onClick={handlePreviousGoals} disabled={goalPage === 0}>
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <span className="text-sm text-muted-foreground px-2">
                    {goalPage + 1} / {totalGoalPages}
                  </span>
                  <Button variant="outline" size="icon" onClick={handleNextGoals} disabled={goalPage >= totalGoalPages - 1}>
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {paginatedGoals.map((goal) => {
                  const progress = (goal.current_amount / goal.target_amount) * 100;
                  return (
                    <div key={goal.id} className="p-4 border rounded-lg space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="text-xs">
                            Prioridade {goal.priority}
                          </Badge>
                          <h3 className="font-semibold">{goal.name}</h3>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button variant="ghost" size="icon" onClick={() => handleEditGoalClick(goal)}>
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => handleDeleteGoalClick(goal.id)}>
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </div>
                      {goal.description && <p className="text-sm text-muted-foreground">{goal.description}</p>}
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Progresso</span>
                          <span className="font-semibold">{progress.toFixed(1)}%</span>
                        </div>
                        <Progress value={progress} className="h-2" />
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">
                            {goal.current_amount.toLocaleString("pt-BR", {
                              style: "currency",
                              currency: "BRL",
                            })}
                          </span>
                          <span className="font-semibold">
                            {goal.target_amount.toLocaleString("pt-BR", {
                              style: "currency",
                              currency: "BRL",
                            })}
                          </span>
                        </div>
                      </div>
                      {goal.target_date && (
                        <p className="text-xs text-muted-foreground">Meta: {new Date(goal.target_date).toLocaleDateString("pt-BR")}</p>
                      )}
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        )}

        {investmentTypes.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <PieChart className="h-5 w-5" />
                Distribuição por Tipo
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {investmentTypes.map((type) => {
                  const { typeTotal, typePercentage } = getTypeData(type);
                  return (
                    <Card key={type} className="cursor-pointer hover:bg-accent/50 transition-colors" onClick={() => handleTypeClick(type)}>
                      <CardContent className="p-4">
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <h4 className="font-semibold">{type}</h4>
                            <Badge variant="outline">{typePercentage.toFixed(1)}%</Badge>
                          </div>
                          <p className="text-2xl font-bold">
                            {typeTotal.toLocaleString("pt-BR", {
                              style: "currency",
                              currency: "BRL",
                            })}
                          </p>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        )}

        {aggregatedInvestments.length > 0 ? (
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Meus Ativos</CardTitle>
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    <Label htmlFor="items-per-page" className="text-sm">
                      Itens por página:
                    </Label>
                    <Select
                      value={itemsPerPage.toString()}
                      onValueChange={(value) => {
                        setItemsPerPage(parseInt(value));
                        setCurrentPage(1);
                      }}
                    >
                      <SelectTrigger id="items-per-page" className="w-[100px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="5">5</SelectItem>
                        <SelectItem value="10">10</SelectItem>
                        <SelectItem value="20">20</SelectItem>
                        <SelectItem value="50">50</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {paginatedAggregatedInvestments.map((aggInvestment) => {
                  const totalReturnValue = aggInvestment.totalCurrentValue - aggInvestment.totalAmountInvested;
                  const totalReturnPercentage =
                    aggInvestment.totalAmountInvested > 0 ? (totalReturnValue / aggInvestment.totalAmountInvested) * 100 : 0;
                  const isStockOrFII = aggInvestment.type === "Ações" || aggInvestment.type === "FIIs";

                  return (
                    <Card key={aggInvestment.name} className="group">
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-2">
                              <h4 className="font-semibold">{aggInvestment.name}</h4>
                              <Badge variant="secondary">{aggInvestment.type}</Badge>
                            </div>
                            <div className="grid grid-cols-2 md:grid-cols-5 gap-x-4 gap-y-1 text-sm">
                              <div>
                                <p className="text-muted-foreground truncate">Total Investido</p>
                                <p className="font-semibold truncate">
                                  {aggInvestment.totalAmountInvested.toLocaleString("pt-BR", {
                                    style: "currency",
                                    currency: "BRL",
                                  })}
                                </p>
                              </div>

                              {isStockOrFII && (
                                <div>
                                  <p className="text-muted-foreground truncate">Quantidade</p>
                                  <p className="font-semibold truncate">{aggInvestment.totalQuantity}</p>
                                </div>
                              )}

                              {isStockOrFII && aggInvestment.averagePrice !== null && (
                                <div>
                                  <p className="text-muted-foreground truncate">Preço Médio</p>
                                  <p className="font-semibold truncate">
                                    {aggInvestment.averagePrice.toLocaleString("pt-BR", {
                                      style: "currency",
                                      currency: "BRL",
                                    })}
                                  </p>
                                </div>
                              )}

                              {!isStockOrFII && <div className="hidden md:block"></div>}
                              {!isStockOrFII && <div className="hidden md:block"></div>}

                              <div>
                                <p className="text-muted-foreground truncate">Valor Atual</p>
                                <p className="font-semibold truncate">
                                  {aggInvestment.totalCurrentValue.toLocaleString("pt-BR", {
                                    style: "currency",
                                    currency: "BRL",
                                  })}
                                </p>
                              </div>

                              <div>
                                <p className="text-muted-foreground truncate">Rentabilidade</p>
                                <div
                                  className={cn("font-semibold truncate", totalReturnPercentage >= 0 ? "text-success" : "text-destructive")}
                                >
                                  {totalReturnPercentage >= 0 ? "+" : ""}
                                  {totalReturnPercentage.toFixed(2)}%
                                </div>
                              </div>

                              <div>
                                <p className="text-muted-foreground truncate">Lucro/Prejuízo</p>
                                <div className={cn("font-semibold truncate", totalReturnValue >= 0 ? "text-success" : "text-destructive")}>
                                  {totalReturnValue >= 0 ? "+" : ""}
                                  {totalReturnValue.toLocaleString("pt-BR", {
                                    style: "currency",
                                    currency: "BRL",
                                  })}
                                </div>
                              </div>
                            </div>
                          </div>

                          <div className="flex flex-col sm:flex-row items-end sm:items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="text-destructive hover:text-destructive hover:bg-destructive/10 h-8 w-8"
                              onClick={() => setAdjustmentTarget(aggInvestment)}
                              title="Remover valor específico"
                            >
                              <MinusCircle className="h-4 w-4" />
                            </Button>

                            {aggInvestment.recordIds.length > 0 && (
                              <Button
                                variant="ghost"
                                size="icon"
                                className="text-destructive hover:text-destructive hover:bg-destructive/10 h-8 w-8"
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
              <AddInvestmentDialog
                trigger={
                  <Button>
                    {" "}
                    <Plus className="h-4 w-4 mr-2" /> Adicionar Primeiro Investimento{" "}
                  </Button>
                }
                onSuccess={loadInvestments}
              />
            </CardContent>
          </Card>
        )}

        <InvestmentDetailsModal
          open={modalOpen}
          onOpenChange={setModalOpen}
          type={selectedType}
          investments={selectedType ? getTypeData(selectedType).typeInvestments : []}
        />

        <EditGoalDialog goal={goalToEdit} isOpen={editGoalDialogOpen} onClose={handleEditGoalClose} onSuccess={loadGoals} />

        <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Confirmar remoção</AlertDialogTitle>
              <AlertDialogDescription>
                Tem certeza que deseja remover este registro de investimento? Esta ação não pode ser desfeita.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction onClick={handleDeleteConfirm} className="bg-destructive hover:bg-destructive/90">
                Remover
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        <AlertDialog open={deleteGoalDialogOpen} onOpenChange={setDeleteGoalDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Confirmar remoção de meta</AlertDialogTitle>
              <AlertDialogDescription>Tem certeza que deseja remover esta meta? Esta ação não pode ser desfeita.</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction onClick={handleDeleteGoalConfirm} className="bg-destructive hover:bg-destructive/90">
                Remover
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        <RemoveInvestmentAmountDialog
          investment={adjustmentTarget}
          isOpen={!!adjustmentTarget}
          onClose={() => setAdjustmentTarget(null)}
          onSuccess={() => {
            loadInvestments();
            setAdjustmentTarget(null);
          }}
        />
      </div>
    </DashboardLayout>
  );
};

export default Investments;
