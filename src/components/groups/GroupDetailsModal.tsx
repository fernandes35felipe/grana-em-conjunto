import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  DollarSign,
  TrendingUp,
  TrendingDown,
  PiggyBank,
  Calendar,
  ArrowUpCircle,
  ArrowDownCircle,
  Plus,
  User,
  Users,
  Trash2,
  Scale,
} from "@/lib/icons";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { AddTransactionDialog } from "@/components/dialogs/AddTransactionDialog";
import { AddInvestmentDialog } from "@/components/dialogs/AddInvestmentDialog";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
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

interface GroupDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  groupId: string;
  groupName: string;
}

interface Transaction {
  id: string;
  description: string;
  amount: number;
  type: "income" | "expense";
  category: string;
  date: string;
  user_id: string; // Criador
  payer_id: string; // Pagador
  profiles: { full_name: string | null } | null; // Perfil do criador
  payer_profile: { full_name: string | null } | null; // Perfil do pagador
  transaction_splits: {
    user_id: string;
    amount: number;
    profiles: { full_name: string | null } | null;
  }[];
}

interface Investment {
  id: string;
  name: string;
  type: string;
  amount: number;
  current_value: number;
  created_at: string;
}

interface Balance {
  userId: string;
  userName: string;
  amount: number; // Positivo = A receber, Negativo = Deve
}

interface GroupMetrics {
  totalIncome: number;
  totalExpenses: number;
  totalInvestments: number;
  balance: number;
  myIncome: number;
  myExpenses: number;
  myBalance: number;
}

export const GroupDetailsModal = ({ isOpen, onClose, groupId, groupName }: GroupDetailsModalProps) => {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [investments, setInvestments] = useState<Investment[]>([]);
  const [balances, setBalances] = useState<Balance[]>([]);
  const [metrics, setMetrics] = useState<GroupMetrics>({
    totalIncome: 0,
    totalExpenses: 0,
    totalInvestments: 0,
    balance: 0,
    myIncome: 0,
    myExpenses: 0,
    myBalance: 0,
  });
  const [loading, setLoading] = useState(false);
  const [currentUser, setCurrentUser] = useState<string | null>(null);

  const [deleteAlertOpen, setDeleteAlertOpen] = useState(false);
  const [transactionToDelete, setTransactionToDelete] = useState<string | null>(null);

  const { toast } = useToast();

  useEffect(() => {
    if (isOpen && groupId) loadGroupData();
  }, [isOpen, groupId]);

  // Realtime update
  useEffect(() => {
    if (!isOpen || !groupId) return;

    const channel = supabase
      .channel(`group-details-${groupId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "transactions", filter: `group_id=eq.${groupId}` }, () =>
        loadGroupData()
      )
      .on("postgres_changes", { event: "*", schema: "public", table: "transaction_splits" }, () => loadGroupData())
      .on("postgres_changes", { event: "*", schema: "public", table: "investments", filter: `group_id=eq.${groupId}` }, () =>
        loadGroupData()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [isOpen, groupId]);

  const loadGroupData = async () => {
    try {
      setLoading(true);
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;
      setCurrentUser(user.id);

      // 1. Transactions - Query com nomes EXPLICITOS de constraints
      const { data: transactionsData, error: transError } = await supabase
        .from("transactions")
        .select(
          `
          *,
          profiles:profiles!transactions_user_id_fkey (full_name),
          payer_profile:profiles!transactions_payer_id_fkey (full_name),
          transaction_splits (
            user_id,
            amount,
            profiles:profiles!transaction_splits_user_id_fkey (full_name)
          )
        `
        )
        .eq("group_id", groupId)
        .order("date", { ascending: false });

      if (transError) throw transError;

      // 2. Investments
      const { data: investmentsData, error: invError } = await supabase
        .from("investments")
        .select("*")
        .eq("group_id", groupId)
        .order("created_at", { ascending: false });

      if (invError) throw invError;

      // Format Data
      const formattedTransactions: Transaction[] = (transactionsData || []).map((t: any) => ({
        id: t.id,
        description: t.description,
        amount: Number(t.amount),
        type: t.type,
        category: t.category,
        date: t.date,
        user_id: t.user_id,
        payer_id: t.payer_id || t.user_id, // Fallback vital se payer_id for null
        profiles: t.profiles,
        payer_profile: t.payer_profile || t.profiles, // Fallback vital para o perfil
        transaction_splits: t.transaction_splits || [],
      }));

      const formattedInvestments: Investment[] = (investmentsData || []).map((i: any) => ({
        id: i.id,
        name: i.name,
        type: i.type,
        amount: Number(i.amount),
        current_value: Number(i.current_value),
        created_at: i.created_at,
      }));

      setTransactions(formattedTransactions);
      setInvestments(formattedInvestments);

      // --- CÁLCULO DE SALDOS (NET BALANCES) ---
      const balancesMap = new Map<string, { name: string; amount: number }>();

      formattedTransactions.forEach((t) => {
        if (t.type === "expense") {
          const amount = Math.abs(t.amount);

          // Quem pagou recebe crédito (+)
          const payerId = t.payer_id;
          const payerName = t.payer_profile?.full_name || "Desconhecido";

          if (!balancesMap.has(payerId)) balancesMap.set(payerId, { name: payerName, amount: 0 });
          balancesMap.get(payerId)!.amount += amount;

          // Quem dividiu recebe débito (-)
          if (t.transaction_splits.length > 0) {
            t.transaction_splits.forEach((split) => {
              const consumerId = split.user_id;
              const consumerName = split.profiles?.full_name || "Desconhecido";

              if (!balancesMap.has(consumerId)) balancesMap.set(consumerId, { name: consumerName, amount: 0 });
              balancesMap.get(consumerId)!.amount -= split.amount;
            });
          } else {
            // Sem split explícito = despesa pessoal do pagador (anula efeito no saldo do grupo)
            balancesMap.get(payerId)!.amount -= amount;
          }
        }
      });

      const balancesArray = Array.from(balancesMap.entries())
        .map(([userId, data]) => ({
          userId,
          userName: data.name,
          amount: data.amount,
        }))
        .filter((b) => Math.abs(b.amount) > 0.01) // Filtra saldos zerados
        .sort((a, b) => b.amount - a.amount);

      setBalances(balancesArray);

      // --- CÁLCULOS DE MÉTRICAS ---
      const income = formattedTransactions.filter((t) => t.type === "income").reduce((sum, t) => sum + t.amount, 0);
      const expenses = formattedTransactions.filter((t) => t.type === "expense").reduce((sum, t) => sum + Math.abs(t.amount), 0);
      const totalInvestments = formattedInvestments.reduce((sum, i) => sum + i.current_value, 0);

      let myIncome = 0;
      let myExpenses = 0;

      formattedTransactions.forEach((t) => {
        const mySplit = t.transaction_splits.find((split) => split.user_id === user.id);

        if (mySplit) {
          // Se estou nos splits, uso o valor do meu split
          if (t.type === "income") myIncome += mySplit.amount;
          else myExpenses += mySplit.amount;
        } else if (t.transaction_splits.length === 0 && t.user_id === user.id) {
          // Se não tem splits e fui eu que criei, considero meu
          if (t.type === "income") myIncome += t.amount;
          else myExpenses += Math.abs(t.amount);
        }
      });

      setMetrics({
        totalIncome: income,
        totalExpenses: expenses,
        totalInvestments,
        balance: income - expenses,
        myIncome,
        myExpenses,
        myBalance: myIncome - myExpenses,
      });
    } catch (error) {
      console.error("Erro ao carregar dados do grupo:", error);
      toast({ variant: "destructive", title: "Erro", description: "Erro ao carregar dados do grupo." });
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!transactionToDelete) return;
    try {
      const { error } = await supabase.from("transactions").delete().eq("id", transactionToDelete);
      if (error) throw error;
      toast({ title: "Removido", description: "Lançamento removido." });
      loadGroupData();
    } catch {
      toast({ variant: "destructive", title: "Erro", description: "Erro ao remover." });
    } finally {
      setDeleteAlertOpen(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Grupo: {groupName}</DialogTitle>
        </DialogHeader>

        <div className="flex gap-2 mb-4 flex-wrap">
          <AddTransactionDialog
            type="expense"
            defaultGroupId={groupId}
            onSuccess={loadGroupData}
            trigger={
              <Button variant="destructive" size="sm">
                <Plus className="h-4 w-4 mr-2" /> Despesa
              </Button>
            }
          />
          <AddTransactionDialog
            type="income"
            defaultGroupId={groupId}
            onSuccess={loadGroupData}
            trigger={
              <Button variant="default" size="sm" className="bg-success hover:bg-success/90">
                <Plus className="h-4 w-4 mr-2" /> Receita
              </Button>
            }
          />
          <AddInvestmentDialog
            defaultGroupId={groupId}
            onSuccess={loadGroupData}
            trigger={
              <Button variant="outline" size="sm">
                <PiggyBank className="h-4 w-4 mr-2" /> Investir
              </Button>
            }
          />
        </div>

        {loading ? (
          <div className="text-center py-10">Carregando...</div>
        ) : (
          <div className="space-y-6">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Total Despesas</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-xl font-bold text-destructive">
                    {metrics.totalExpenses.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Minha Parte</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-xl font-bold text-destructive">
                    {metrics.myExpenses.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Investimentos</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-xl font-bold text-accent">
                    {metrics.totalInvestments.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Saldo Líquido</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className={cn("text-xl font-bold", metrics.balance >= 0 ? "text-success" : "text-destructive")}>
                    {metrics.balance.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                  </div>
                </CardContent>
              </Card>
            </div>

            <Tabs defaultValue="transactions" className="w-full">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="transactions">Transações</TabsTrigger>
                <TabsTrigger value="balances">Saldos & Dívidas</TabsTrigger>
                <TabsTrigger value="investments">Investimentos</TabsTrigger>
              </TabsList>

              {/* ABA TRANSAÇÕES */}
              <TabsContent value="transactions" className="space-y-4">
                {transactions.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">Sem lançamentos.</p>
                ) : (
                  <div className="space-y-3">
                    {transactions.map((t) => {
                      const isPayer = t.payer_id === currentUser;
                      const mySplit = t.transaction_splits.find((s) => s.user_id === currentUser);

                      return (
                        <div key={t.id} className="flex flex-col gap-2 p-4 rounded-lg border bg-card hover:bg-accent/5 transition-colors">
                          <div className="flex justify-between items-start">
                            <div className="flex gap-3">
                              <div
                                className={cn(
                                  "p-2 rounded-full h-fit",
                                  t.type === "income" ? "bg-success/10 text-success" : "bg-destructive/10 text-destructive"
                                )}
                              >
                                {t.type === "income" ? <ArrowUpCircle className="h-5 w-5" /> : <ArrowDownCircle className="h-5 w-5" />}
                              </div>
                              <div>
                                <p className="font-medium">{t.description}</p>
                                <div className="text-xs text-muted-foreground flex flex-col gap-1">
                                  <span>
                                    {new Date(t.date).toLocaleDateString("pt-BR")} • {t.category}
                                  </span>
                                  <span className="text-foreground/80">
                                    Pago por <strong>{isPayer ? "Você" : t.payer_profile?.full_name?.split(" ")[0]}</strong>
                                  </span>
                                </div>
                              </div>
                            </div>
                            <div className="text-right">
                              <p className="font-bold">{t.amount.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}</p>
                              {mySplit && (
                                <p className="text-xs text-muted-foreground">
                                  Sua parte:{" "}
                                  <span className="text-destructive">
                                    {mySplit.amount.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                                  </span>
                                </p>
                              )}
                            </div>
                          </div>

                          <div className="flex justify-between items-center pt-2 border-t mt-1">
                            <div className="flex -space-x-2">
                              {t.transaction_splits.length > 0 ? (
                                t.transaction_splits.map((split, i) => (
                                  <TooltipProvider key={i}>
                                    <Tooltip>
                                      <TooltipTrigger>
                                        <Avatar className="h-6 w-6 border-2 border-background">
                                          <AvatarFallback className="text-[9px] bg-primary/20">
                                            {split.profiles?.full_name?.charAt(0)}
                                          </AvatarFallback>
                                        </Avatar>
                                      </TooltipTrigger>
                                      <TooltipContent>
                                        <p className="text-xs">
                                          {split.profiles?.full_name}:{" "}
                                          {split.amount.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                                        </p>
                                      </TooltipContent>
                                    </Tooltip>
                                  </TooltipProvider>
                                ))
                              ) : (
                                <span className="text-xs text-muted-foreground italic pl-1">Sem divisões (individual)</span>
                              )}
                            </div>
                            {(isPayer || currentUser === t.user_id) && (
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7 text-destructive hover:bg-destructive/10"
                                onClick={() => {
                                  setTransactionToDelete(t.id);
                                  setDeleteAlertOpen(true);
                                }}
                              >
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </TabsContent>

              {/* ABA SALDOS (NET BALANCES) */}
              <TabsContent value="balances" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Scale className="h-5 w-5" /> Saldos Líquidos
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {balances.length === 0 ? (
                      <p className="text-center text-muted-foreground">Todos estão quites.</p>
                    ) : (
                      <div className="space-y-4">
                        {balances.map((balance) => {
                          const isMe = balance.userId === currentUser;
                          const statusColor =
                            balance.amount > 0 ? "text-success" : balance.amount < 0 ? "text-destructive" : "text-muted-foreground";
                          const statusText = balance.amount > 0 ? "deve receber" : balance.amount < 0 ? "deve" : "está quite";

                          return (
                            <div key={balance.userId} className="flex items-center justify-between p-3 border-b last:border-0">
                              <div className="flex items-center gap-3">
                                <Avatar>
                                  <AvatarFallback>{balance.userName?.charAt(0) || "?"}</AvatarFallback>
                                </Avatar>
                                <div>
                                  <p className="font-medium text-sm">{isMe ? "Você" : balance.userName}</p>
                                  <p className={cn("text-xs font-bold", statusColor)}>
                                    {statusText}{" "}
                                    {balance.amount !== 0 &&
                                      Math.abs(balance.amount).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                                  </p>
                                </div>
                              </div>
                              {balance.amount !== 0 && (
                                <Badge
                                  variant={balance.amount > 0 ? "outline" : "destructive"}
                                  className={balance.amount > 0 ? "text-success border-success" : ""}
                                >
                                  {balance.amount > 0 ? "+" : "-"}
                                  {Math.abs(balance.amount).toFixed(2)}
                                </Badge>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              {/* ABA INVESTIMENTOS */}
              <TabsContent value="investments" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <PiggyBank className="h-5 w-5" /> Investimentos do Grupo
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {investments.length === 0 ? (
                      <p className="text-center text-muted-foreground py-8">Nenhum investimento encontrado</p>
                    ) : (
                      <div className="space-y-3">
                        {investments.map((investment) => (
                          <div
                            key={investment.id}
                            className="flex items-center justify-between p-3 rounded-lg border border-border bg-card"
                          >
                            <div className="flex items-center gap-3">
                              <div className="p-2 rounded-full bg-accent/10 text-accent">
                                <TrendingUp className="h-4 w-4" />
                              </div>
                              <div>
                                <p className="font-medium">{investment.name}</p>
                                <div className="flex items-center gap-2 mt-1">
                                  <Badge variant="secondary" className="text-xs">
                                    {investment.type}
                                  </Badge>
                                  <span className="text-xs text-muted-foreground">
                                    {new Date(investment.created_at).toLocaleDateString("pt-BR")}
                                  </span>
                                </div>
                              </div>
                            </div>
                            <div className="text-right">
                              <p className="font-semibold text-foreground">
                                {investment.current_value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                Aplicado: {investment.amount.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>
        )}

        <AlertDialog open={deleteAlertOpen} onOpenChange={setDeleteAlertOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Excluir?</AlertDialogTitle>
              <AlertDialogDescription>Ação irreversível.</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction onClick={handleDeleteConfirm}>Excluir</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </DialogContent>
    </Dialog>
  );
};
