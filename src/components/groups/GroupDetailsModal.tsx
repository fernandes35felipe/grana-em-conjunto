import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
// CORREÇÃO: Adicionado 'Users' na importação abaixo
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
} from "@/lib/icons";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { AddTransactionDialog } from "@/components/dialogs/AddTransactionDialog";
import { AddInvestmentDialog } from "@/components/dialogs/AddInvestmentDialog";
import { AddEventDialog } from "@/components/dialogs/AddEventDialog";
import { DateFilter, DateRange } from "@/components/filters/DateFilter";
import { startOfMonth, endOfMonth, format } from "@/lib/date";
import { EventDetailsModal } from "@/components/transactions/EventDetailsModal";
import { Separator } from "@/components/ui/separator";

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
}

export const GroupDetailsModal = ({ isOpen, onClose, groupId, groupName }: GroupDetailsModalProps) => {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [investments, setInvestments] = useState<Investment[]>([]);
  const [groupEvents, setGroupEvents] = useState<GroupEvent[]>([]);

  // Métricas Gerais do Grupo
  const [groupMetrics, setGroupMetrics] = useState<Metrics>({
    totalIncome: 0,
    totalExpenses: 0,
    totalInvestments: 0,
    balance: 0,
  });

  // Métricas do Usuário Logado ("Minha Participação")
  const [myMetrics, setMyMetrics] = useState<Metrics>({
    totalIncome: 0,
    totalExpenses: 0,
    totalInvestments: 0,
    balance: 0,
  });

  const [dateRange, setDateRange] = useState<DateRange>({
    from: startOfMonth(new Date()),
    to: endOfMonth(new Date()),
  });

  const [loading, setLoading] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<GroupEvent | null>(null);
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

      // 1. Carregar Transações
      const { data: transactionsData, error: transError } = await supabase
        .from("transactions")
        .select("*")
        .eq("group_id", groupId)
        .gte("date", fromDate)
        .lte("date", toDate)
        .order("date", { ascending: false });

      if (transError) throw transError;

      // 2. Carregar Investimentos
      const { data: investmentsData, error: invError } = await supabase
        .from("investments")
        .select("*")
        .eq("group_id", groupId)
        .gte("created_at", `${fromDate}T00:00:00`)
        .lte("created_at", `${toDate}T23:59:59`)
        .order("created_at", { ascending: false });

      if (invError) throw invError;

      // 3. Carregar Eventos
      const { data: eventsData, error: eventsError } = await supabase
        .from("events" as any)
        .select("*")
        .eq("group_id", groupId)
        .gte("date", fromDate)
        .lte("date", toDate)
        .order("date", { ascending: false });

      if (eventsError) throw eventsError;

      // Calcular totais dos eventos
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

      // --- CÁLCULO DE MÉTRICAS GERAIS ---
      const gIncome = formattedTransactions.filter((t) => t.type === "income").reduce((sum, t) => sum + t.amount, 0);
      const gExpenses = formattedTransactions.filter((t) => t.type === "expense").reduce((sum, t) => sum + t.amount, 0);
      const gInvestments = formattedInvestments.reduce((sum, i) => sum + i.current_value, 0);

      setGroupMetrics({
        totalIncome: gIncome,
        totalExpenses: gExpenses,
        totalInvestments: gInvestments,
        balance: gIncome - gExpenses,
      });

      // --- CÁLCULO DE "MINHA PARTICIPAÇÃO" ---
      if (currentUserId) {
        const myTrans = formattedTransactions.filter((t) => t.user_id === currentUserId);
        const myInvs = formattedInvestments.filter((i) => i.user_id === currentUserId);

        const mIncome = myTrans.filter((t) => t.type === "income").reduce((sum, t) => sum + t.amount, 0);
        const mExpenses = myTrans.filter((t) => t.type === "expense").reduce((sum, t) => sum + t.amount, 0);
        const mInvestments = myInvs.reduce((sum, i) => sum + i.current_value, 0);

        setMyMetrics({
          totalIncome: mIncome,
          totalExpenses: mExpenses,
          totalInvestments: mInvestments,
          balance: mIncome - mExpenses,
        });
      }
    } catch (error) {
      console.error("Erro ao carregar dados do grupo:", error);
      toast({
        variant: "destructive",
        title: "Erro",
        description: "Não foi possível carregar os dados do grupo",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader className="flex flex-col gap-4 pr-8">
          <div className="flex flex-row items-center justify-between">
            <DialogTitle>Detalhes do Grupo: {groupName}</DialogTitle>
          </div>

          <div className="flex justify-end">
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
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-32 bg-muted rounded-lg animate-pulse" />
            ))}
          </div>
        ) : (
          <div className="space-y-8">
            {/* SEÇÃO: MINHA PARTICIPAÇÃO */}
            <div className="space-y-3">
              <h3 className="text-sm font-semibold flex items-center gap-2 text-muted-foreground">
                <User className="h-4 w-4" /> Minha Participação
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
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
                <Card className="bg-primary/5 border-primary/20">
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Meus Investimentos</CardTitle>
                    <PiggyBank className="h-4 w-4 text-accent" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-xl font-bold">
                      {myMetrics.totalInvestments.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
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
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Receitas</CardTitle>
                    <TrendingUp className="h-4 w-4 text-success" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-success">
                      {groupMetrics.totalIncome.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Despesas</CardTitle>
                    <TrendingDown className="h-4 w-4 text-destructive" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-destructive">
                      {groupMetrics.totalExpenses.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Investimentos</CardTitle>
                    <PiggyBank className="h-4 w-4 text-accent" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">
                      {groupMetrics.totalInvestments.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Saldo</CardTitle>
                    <DollarSign className="h-4 w-4 text-primary" />
                  </CardHeader>
                  <CardContent>
                    <div className={cn("text-2xl font-bold", groupMetrics.balance >= 0 ? "text-success" : "text-destructive")}>
                      {groupMetrics.balance.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>

            {/* Abas */}
            <Tabs defaultValue="transactions" className="w-full">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="transactions">Transações</TabsTrigger>
                <TabsTrigger value="events">Eventos</TabsTrigger>
                <TabsTrigger value="investments">Investimentos</TabsTrigger>
              </TabsList>

              <TabsContent value="transactions" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Calendar className="h-5 w-5" />
                      Transações do Grupo
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {transactions.length === 0 ? (
                      <p className="text-center text-muted-foreground py-8">Nenhuma transação encontrada neste período.</p>
                    ) : (
                      <div className="space-y-3">
                        {transactions.map((transaction) => (
                          <div key={transaction.id} className="flex items-center justify-between p-3 rounded-lg border border-border">
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
                                <Badge variant="secondary" className="text-xs mt-1">
                                  {transaction.category}
                                </Badge>
                              </div>
                            </div>
                            <div className="text-right">
                              <p className={cn("font-semibold", transaction.type === "income" ? "text-success" : "text-destructive")}>
                                {transaction.type === "income" ? "+" : ""}
                                {transaction.amount.toLocaleString("pt-BR", {
                                  style: "currency",
                                  currency: "BRL",
                                })}
                              </p>
                              <p className="text-xs text-muted-foreground">{new Date(transaction.date).toLocaleDateString("pt-BR")}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="events" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Layers className="h-5 w-5" />
                      Eventos do Grupo
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {groupEvents.length === 0 ? (
                      <p className="text-center text-muted-foreground py-8">Nenhum evento encontrado neste período.</p>
                    ) : (
                      <div className="space-y-3">
                        {groupEvents.map((ev) => (
                          <div
                            key={ev.id}
                            className="flex items-center justify-between p-4 rounded-lg border bg-accent/5 hover:bg-accent/10 border-l-4 border-l-primary cursor-pointer transition-all"
                            onClick={() => setSelectedEvent(ev)}
                          >
                            <div className="flex items-center gap-4">
                              <div>
                                <div className="flex items-center gap-2">
                                  <p className="font-bold text-primary">{ev.name}</p>
                                </div>
                                <span className="text-xs text-muted-foreground">{new Date(ev.date).toLocaleDateString("pt-BR")}</span>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <p className={cn("font-semibold text-lg", (ev.totalAmount || 0) >= 0 ? "text-success" : "text-destructive")}>
                                {(ev.totalAmount || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="investments" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <PiggyBank className="h-5 w-5" />
                      Investimentos do Grupo
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {investments.length === 0 ? (
                      <p className="text-center text-muted-foreground py-8">Nenhum investimento encontrado neste período.</p>
                    ) : (
                      <div className="space-y-3">
                        {investments.map((investment) => (
                          <div key={investment.id} className="flex items-center justify-between p-3 rounded-lg border border-border">
                            <div>
                              <p className="font-medium">{investment.name}</p>
                              <div className="flex items-center gap-2 mt-1">
                                <Badge variant="secondary" className="text-xs">
                                  {investment.type}
                                </Badge>
                              </div>
                            </div>
                            <div className="text-right">
                              <p className="font-semibold">
                                {investment.current_value.toLocaleString("pt-BR", {
                                  style: "currency",
                                  currency: "BRL",
                                })}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                Aplicado:{" "}
                                {investment.amount.toLocaleString("pt-BR", {
                                  style: "currency",
                                  currency: "BRL",
                                })}
                              </p>
                              <p className="text-xs text-muted-foreground">{new Date(investment.created_at).toLocaleDateString("pt-BR")}</p>
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

        {selectedEvent && (
          <EventDetailsModal
            isOpen={!!selectedEvent}
            onClose={() => setSelectedEvent(null)}
            eventId={selectedEvent.id}
            eventName={selectedEvent.name}
            eventDate={selectedEvent.date}
            groupId={groupId}
            onUpdate={() => {
              loadGroupData();
            }}
          />
        )}
      </DialogContent>
    </Dialog>
  );
};
