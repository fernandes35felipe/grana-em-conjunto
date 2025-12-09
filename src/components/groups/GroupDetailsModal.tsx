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
  Layers,
  User,
  Users,
  CheckCircle2,
  XCircle,
  Clock,
  Edit,
} from "@/lib/icons";
import { Download } from "lucide-react";
import { generatePDF } from "@/utils/reports/pdfGenerator";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { AddTransactionDialog } from "@/components/dialogs/AddTransactionDialog";
import { EditTransactionDialog } from "@/components/dialogs/EditTransactionDialog";
import { AddInvestmentDialog } from "@/components/dialogs/AddInvestmentDialog";
import { AddEventDialog } from "@/components/dialogs/AddEventDialog";
import { DateFilter, DateRange } from "@/components/filters/DateFilter";
import { startOfMonth, endOfMonth, format } from "@/lib/date";
import { EventDetailsModal } from "@/components/transactions/EventDetailsModal";
import { Separator } from "@/components/ui/separator";
import { Toggle } from "@/components/ui/toggle";
import { Bell } from "@/lib/icons";
import { AddReminderDialog } from "@/components/dialogs/AddReminderDialog";

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
  user_id: string;
  is_pending: boolean;
}

interface Investment {
  id: string;
  name: string;
  type: string;
  amount: number;
  current_value: number;
  created_at: string;
  user_id: string;
}

interface GroupEvent {
  id: string;
  name: string;
  description: string;
  date: string;
  totalAmount?: number;
}

interface Metrics {
  totalIncome: number;
  totalExpenses: number;
  totalInvestments: number;
  balance: number;
  pendingIncome: number;
  pendingExpense: number;
}

export const GroupDetailsModal = ({ isOpen, onClose, groupId, groupName }: GroupDetailsModalProps) => {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [investments, setInvestments] = useState<Investment[]>([]);
  const [groupEvents, setGroupEvents] = useState<GroupEvent[]>([]);
  const [showPending, setShowPending] = useState(false);

  const [groupMetrics, setGroupMetrics] = useState<Metrics>({
    totalIncome: 0,
    totalExpenses: 0,
    totalInvestments: 0,
    balance: 0,
    pendingIncome: 0,
    pendingExpense: 0,
  });

  const [myMetrics, setMyMetrics] = useState<Metrics>({
    totalIncome: 0,
    totalExpenses: 0,
    totalInvestments: 0,
    balance: 0,
    pendingIncome: 0,
    pendingExpense: 0,
  });

  const [dateRange, setDateRange] = useState<DateRange>({
    from: startOfMonth(new Date()),
    to: endOfMonth(new Date()),
  });

  const [loading, setLoading] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<GroupEvent | null>(null);
  const [transactionToEdit, setTransactionToEdit] = useState<Transaction | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (isOpen && groupId) {
      loadGroupData();
    }
  }, [isOpen, groupId, dateRange]);

  const loadGroupData = async () => {
    try {
      setLoading(true);

      const {
        data: { user },
      } = await supabase.auth.getUser();
      const currentUserId = user?.id;

      const fromDate = format(dateRange.from, "yyyy-MM-dd");
      const toDate = format(dateRange.to, "yyyy-MM-dd");

      const { data: transactionsData, error: transError } = await supabase
        .from("transactions")
        .select("*")
        .eq("group_id", groupId)
        .gte("date", fromDate)
        .lte("date", toDate)
        .order("date", { ascending: false });

      if (transError) throw transError;

      const { data: investmentsData, error: invError } = await supabase
        .from("investments")
        .select("*")
        .eq("group_id", groupId)
        .gte("created_at", `${fromDate}T00:00:00`)
        .lte("created_at", `${toDate}T23:59:59`)
        .order("created_at", { ascending: false });

      if (invError) throw invError;

      const { data: eventsData, error: eventsError } = await supabase
        .from("events" as any)
        .select("*")
        .eq("group_id", groupId)
        .gte("date", fromDate)
        .lte("date", toDate)
        .order("date", { ascending: false });

      if (eventsError) throw eventsError;

      let eventsWithTotals: GroupEvent[] = [];
      if (eventsData && eventsData.length > 0) {
        const eventIds = eventsData.map((e) => e.id);
        const { data: eventTrans } = await supabase.from("transactions").select("event_id, amount, type").in("event_id", eventIds);

        eventsWithTotals = eventsData.map((ev) => {
          const evT = eventTrans?.filter((t) => t.event_id === ev.id) || [];
          const total = evT.reduce((acc, t) => acc + (t.type === "income" ? t.amount : -Math.abs(t.amount)), 0);
          return {
            id: ev.id,
            name: ev.name,
            description: ev.description,
            date: ev.date,
            totalAmount: total,
          };
        });
      }

      const formattedTransactions =
        transactionsData?.map((t) => ({
          id: t.id,
          description: t.description,
          amount: Number(t.amount),
          type: t.type as "income" | "expense",
          category: t.category,
          date: t.date,
          user_id: t.user_id,
          is_pending: t.is_pending || false,
        })) || [];

      const formattedInvestments =
        investmentsData?.map((i) => ({
          id: i.id,
          name: i.name,
          type: i.type,
          amount: Number(i.amount),
          current_value: Number(i.current_value),
          created_at: i.created_at,
          user_id: i.user_id,
        })) || [];

      setTransactions(formattedTransactions);
      setInvestments(formattedInvestments);
      setGroupEvents(eventsWithTotals);

      // Métricas do Grupo (Separando pendentes de realizados)
      const gRealized = formattedTransactions.filter((t) => !t.is_pending);
      const gPending = formattedTransactions.filter((t) => t.is_pending);

      const gIncome = gRealized.filter((t) => t.type === "income").reduce((sum, t) => sum + t.amount, 0);
      const gExpenses = gRealized.filter((t) => t.type === "expense").reduce((sum, t) => sum + t.amount, 0);
      const gInvestments = formattedInvestments.reduce((sum, i) => sum + i.current_value, 0);

      const gPendingIncome = gPending.filter((t) => t.type === "income").reduce((sum, t) => sum + t.amount, 0);
      const gPendingExpense = gPending.filter((t) => t.type === "expense").reduce((sum, t) => sum + Math.abs(t.amount), 0);

      setGroupMetrics({
        totalIncome: gIncome,
        totalExpenses: gExpenses,
        totalInvestments: gInvestments,
        balance: gIncome + gExpenses,
        pendingIncome: gPendingIncome,
        pendingExpense: gPendingExpense,
      });

      // Métricas do Usuário (Separando pendentes de realizados)
      if (currentUserId) {
        const myTrans = formattedTransactions.filter((t) => t.user_id === currentUserId && !t.is_pending);
        const myPendingTrans = formattedTransactions.filter((t) => t.user_id === currentUserId && t.is_pending);
        const myInvs = formattedInvestments.filter((i) => i.user_id === currentUserId);

        const mIncome = myTrans.filter((t) => t.type === "income").reduce((sum, t) => sum + t.amount, 0);
        const mExpenses = myTrans.filter((t) => t.type === "expense").reduce((sum, t) => sum + t.amount, 0); // amount é negativo
        const mInvestments = myInvs.reduce((sum, i) => sum + i.current_value, 0);

        const mPendingIncome = myPendingTrans.filter((t) => t.type === "income").reduce((sum, t) => sum + t.amount, 0);
        const mPendingExpense = myPendingTrans.filter((t) => t.type === "expense").reduce((sum, t) => sum + Math.abs(t.amount), 0);

        setMyMetrics({
          totalIncome: mIncome,
          totalExpenses: mExpenses,
          totalInvestments: mInvestments,
          balance: mIncome + mExpenses,
          pendingIncome: mPendingIncome,
          pendingExpense: mPendingExpense,
        });
      }
    } catch (error) {
      console.error(error);
      toast({
        variant: "destructive",
        title: "Erro",
        description: "Não foi possível carregar os dados do grupo",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleToggleStatus = async (transaction: Transaction) => {
    try {
      const newIsPending = !transaction.is_pending;
      const updates: any = { is_pending: newIsPending };

      if (newIsPending) {
        updates.paid_at = null;
        updates.pending_type = transaction.type === "income" ? "receivable" : "payable";
      } else {
        updates.paid_at = new Date().toISOString();
        updates.pending_type = null;
      }

      const { error } = await supabase.from("transactions").update(updates).eq("id", transaction.id);

      if (error) throw error;
      toast({ title: "Atualizado", description: "Status alterado com sucesso" });
      loadGroupData();
    } catch {
      toast({ title: "Erro", description: "Falha ao atualizar", variant: "destructive" });
    }
  };

  const handleExportPDF = async () => {
    try {
      await generatePDF({
        transactions: transactions,
        investments: investments.map(i => ({
          id: i.id,
          name: i.name,
          type: i.type,
          current_amount: i.current_value
        })),
        dateRange: {
          from: dateRange.from,
          to: dateRange.to
        } as any,
        title: `Relatório do Grupo: ${groupName}`
      });
      toast({
        title: "Sucesso!",
        description: "Relatório gerado com sucesso.",
      });
    } catch (error) {
      console.error(error);
      toast({
        title: "Erro",
        description: "Falha ao gerar o PDF.",
        variant: "destructive",
      });
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader className="flex flex-col gap-4 pr-8">
          <div className="flex flex-row items-center justify-between">
            <DialogTitle>Detalhes do Grupo: {groupName}</DialogTitle>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" size="icon" onClick={handleExportPDF} title="Exportar Relatório">
              <Download className="h-4 w-4" />
            </Button>
            <DateFilter dateRange={dateRange} onDateRangeChange={setDateRange} />
          </div>
        </DialogHeader>

        <div className="flex gap-2 mb-4 flex-wrap">
          <AddTransactionDialog
            type="expense"
            defaultGroupId={groupId}
            onSuccess={loadGroupData}
            trigger={
              <Button variant="destructive" size="sm">
                <Plus className="h-4 w-4 mr-2" /> Nova Despesa
              </Button>
            }
          />
          <AddTransactionDialog
            type="income"
            defaultGroupId={groupId}
            onSuccess={loadGroupData}
            trigger={
              <Button variant="default" size="sm" className="bg-success hover:bg-success/90">
                <Plus className="h-4 w-4 mr-2" /> Nova Receita
              </Button>
            }
          />
          <AddInvestmentDialog
            defaultGroupId={groupId}
            onSuccess={loadGroupData}
            trigger={
              <Button variant="outline" size="sm">
                <PiggyBank className="h-4 w-4 mr-2" /> Novo Investimento
              </Button>
            }
          />
          <AddEventDialog
            defaultGroupId={groupId}
            onSuccess={loadGroupData}
            trigger={
              <Button variant="outline" size="sm">
                <Calendar className="h-4 w-4 mr-2" /> Novo Evento
              </Button>
            }
          />
        </div>

        {loading ? (
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-32 bg-muted rounded animate-pulse" />
            ))}
          </div>
        ) : (
          <div className="space-y-8">
            {/* SEÇÃO: MINHA PARTICIPAÇÃO */}
            <div className="space-y-3">
              <h3 className="text-sm font-semibold flex items-center gap-2 text-muted-foreground">
                <User className="h-4 w-4" /> Minha Participação
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Card className="bg-primary/5 border-primary/20">
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Minhas Receitas</CardTitle>
                    <TrendingUp className="h-4 w-4 text-success" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-xl font-bold text-success">
                      {myMetrics.totalIncome.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                    </div>
                  </CardContent>
                </Card>
                <Card className="bg-primary/5 border-primary/20">
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Minhas Despesas</CardTitle>
                    <TrendingDown className="h-4 w-4 text-destructive" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-xl font-bold text-destructive">
                      {myMetrics.totalExpenses.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                    </div>
                  </CardContent>
                </Card>
                <Card className="bg-orange-50/80 dark:bg-orange-950/20 border-orange-200/80">
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium text-orange-700 dark:text-orange-400">Meus Pendentes</CardTitle>
                    <Clock className="h-4 w-4 text-orange-500" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-sm font-medium text-orange-600">
                      Receber: {myMetrics.pendingIncome.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                    </div>
                    <div className="text-sm font-medium text-destructive/80">
                      Pagar: {myMetrics.pendingExpense.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                    </div>
                  </CardContent>
                </Card>
                <Card className="bg-primary/5 border-primary/20">
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Meu Saldo</CardTitle>
                    <DollarSign className="h-4 w-4 text-primary" />
                  </CardHeader>
                  <CardContent>
                    <div className={cn("text-xl font-bold", myMetrics.balance >= 0 ? "text-success" : "text-destructive")}>
                      {myMetrics.balance.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>

            <Separator />

            {/* SEÇÃO: TOTAL DO GRUPO */}
            <div className="space-y-3">
              <h3 className="text-sm font-semibold flex items-center gap-2 text-muted-foreground">
                <Users className="h-4 w-4" /> Total do Grupo
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium">Receitas (Realizado)</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-success">
                      {groupMetrics.totalIncome.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium">Despesas (Pago)</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-destructive">
                      {groupMetrics.totalExpenses.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                    </div>
                  </CardContent>
                </Card>
                <Card className="bg-orange-50 dark:bg-orange-950/20 border-orange-200">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-orange-700 dark:text-orange-400">A Pagar/Receber</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-sm font-medium text-orange-600">
                      Receber: {groupMetrics.pendingIncome.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                    </div>
                    <div className="text-sm font-medium text-destructive/80">
                      Pagar: {groupMetrics.pendingExpense.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium">Saldo Final</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className={cn("text-2xl font-bold", groupMetrics.balance >= 0 ? "text-success" : "text-destructive")}>
                      {groupMetrics.balance.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>

            <Separator />

            <Tabs defaultValue="transactions" className="w-full">
              <div className="flex justify-between items-center mb-4">
                <TabsList>
                  <TabsTrigger value="transactions">Transações</TabsTrigger>
                  <TabsTrigger value="events">Eventos</TabsTrigger>
                  <TabsTrigger value="investments">Investimentos</TabsTrigger>
                </TabsList>
                <div className="flex items-center space-x-2">
                  <span className="text-xs text-muted-foreground">Mostrar Pendentes</span>
                  <Toggle
                    pressed={showPending}
                    onPressedChange={setShowPending}
                    variant="outline"
                    size="sm"
                    className="data-[state=on]:bg-orange-100 data-[state=on]:text-orange-900"
                  >
                    <Clock className="h-4 w-4" />
                  </Toggle>
                </div>
              </div>

              <TabsContent value="transactions" className="space-y-4">
                {transactions.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">Nenhuma transação encontrada.</p>
                ) : (
                  <div className="space-y-3">
                    {transactions
                      .filter((t) => showPending || !t.is_pending)
                      .map((transaction) => (
                        <div
                          key={transaction.id}
                          className={cn(
                            "flex items-center justify-between p-3 rounded-lg border",
                            transaction.is_pending ? "bg-orange-50/50 border-orange-200" : "border-border"
                          )}
                        >
                          <div className="flex items-center gap-3">
                            <div
                              className={cn(
                                "p-2 rounded-full",
                                transaction.type === "income" ? "bg-success/10 text-success" : "bg-destructive/10 text-destructive"
                              )}
                            >
                              {transaction.type === "income" ? (
                                <ArrowUpCircle className="h-4 w-4" />
                              ) : (
                                <ArrowDownCircle className="h-4 w-4" />
                              )}
                            </div>
                            <div>
                              <p className="font-medium">{transaction.description}</p>
                              <div className="flex items-center gap-2">
                                <Badge variant="secondary" className="text-xs mt-1">
                                  {transaction.category}
                                </Badge>
                                {transaction.is_pending && (
                                  <Badge variant="outline" className="text-xs mt-1 text-orange-600 bg-orange-100 border-orange-200">
                                    Pendente
                                  </Badge>
                                )}
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-3">
                            <p
                              className={cn(
                                "font-semibold",
                                transaction.type === "income" ? "text-success" : "text-destructive",
                                transaction.is_pending && "opacity-60"
                              )}
                            >
                              {transaction.type === "income" ? "+" : ""}
                              {Math.abs(transaction.amount).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                            </p>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleToggleStatus(transaction)}
                              className={
                                transaction.is_pending ? "text-orange-500 hover:text-orange-600" : "text-success hover:text-success/80"
                              }
                            >
                              {transaction.is_pending ? <CheckCircle2 className="h-4 w-4" /> : <XCircle className="h-4 w-4" />}
                            </Button>

                            {transaction.is_pending && (
                              <AddReminderDialog
                                transactionId={transaction.id}
                                defaultTitle={transaction.description}
                                trigger={
                                  <Button variant="ghost" size="icon" title="Criar lembrete">
                                    <Bell className="h-4 w-4 text-orange-500" />
                                  </Button>
                                }
                              />
                            )}

                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => {
                                setTransactionToEdit(transaction);
                                setEditDialogOpen(true);
                              }}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      ))}
                  </div>
                )}
              </TabsContent>

              <TabsContent value="events" className="space-y-4">
                {groupEvents.map((ev) => (
                  <div
                    key={ev.id}
                    onClick={() => setSelectedEvent(ev)}
                    className="flex items-center justify-between p-4 rounded-lg border bg-accent/5 hover:bg-accent/10 cursor-pointer"
                  >
                    <div className="flex items-center gap-4">
                      <Layers className="h-5 w-5 text-primary" />
                      <div>
                        <p className="font-bold">{ev.name}</p>
                        <span className="text-xs text-muted-foreground">{new Date(ev.date).toLocaleDateString("pt-BR")}</span>
                      </div>
                    </div>
                    <p className="font-semibold">{(ev.totalAmount || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}</p>
                  </div>
                ))}
              </TabsContent>

              <TabsContent value="investments" className="space-y-4">
                {investments.map((inv) => (
                  <div key={inv.id} className="flex justify-between p-3 border rounded-lg">
                    <span>{inv.name}</span>
                    <span className="font-bold">{inv.current_value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}</span>
                  </div>
                ))}
              </TabsContent>
            </Tabs>
          </div>
        )}

        {selectedEvent && (
          <EventDetailsModal
            isOpen={!!selectedEvent}
            onClose={() => setSelectedEvent(null)}
            eventId={selectedEvent.id}
            eventName={selectedEvent.name}
            eventDate={selectedEvent.date}
            groupId={groupId}
            onUpdate={loadGroupData}
          />
        )}

        <EditTransactionDialog
          transaction={transactionToEdit}
          isOpen={editDialogOpen}
          onClose={() => {
            setEditDialogOpen(false);
            setTransactionToEdit(null);
          }}
          onSuccess={loadGroupData}
        />
      </DialogContent>
    </Dialog>
  );
};
