import { useState, useEffect, useMemo } from "react";
import { ArrowUpCircle, ArrowDownCircle, Search, Filter, Plus, Trash2, Layers, CheckCircle2, XCircle, Edit, CreditCard, Bell } from "@/lib/icons";
import { startOfMonth, endOfMonth, format } from "@/lib/date";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { AddTransactionDialog } from "@/components/dialogs/AddTransactionDialog";
import { AddReminderDialog } from "@/components/dialogs/AddReminderDialog";
import { AddEventDialog } from "@/components/dialogs/AddEventDialog";
import { EventDetailsModal } from "@/components/transactions/EventDetailsModal";
import { EditTransactionDialog } from "@/components/dialogs/EditTransactionDialog";
import { PendingSummaryCard } from "@/components/dashboard/PendingSummaryCard";
import { CreditCardSummary } from "@/components/dashboard/CreditCardSummary";
import { DateFilter, DateRange } from "@/components/filters/DateFilter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Toggle } from "@/components/ui/toggle";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CreditCardDetailsModal } from "@/components/transactions/CreditCardDetailsModal";
import { CreditCardsTab } from "@/components/transactions/CreditCardsTab";
import { AddCreditCardDialog } from "@/components/dialogs/AddCreditCardDialog";
import { CreditCard as ICreditCard } from "@/types/credit-card";
import { getNextClosingDate, getNextDueDate } from "@/utils/credit-card-utils";
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
import { cn } from "@/lib/utils";

interface Transaction {
  id: string;
  description: string;
  amount: number;
  type: "income" | "expense";
  category: string;
  date: string;
  group_id: string | null;
  event_id: string | null;
  group_name?: string;
  is_fixed: boolean;
  is_recurring: boolean;
  recurrence_id: string | null;
  is_pending: boolean;
  pending_type?: "payable" | "receivable" | null;
  paid_at?: string | null;
  is_credit_card: boolean;
  credit_card_id?: string | null;
  card_closing_date?: string | null;
}

interface Event {
  id: string;
  name: string;
  description: string;
  date: string;
  totalAmount?: number;
}

type DisplayItem =
  | { kind: "transaction"; data: Transaction }
  | { kind: "event"; data: Event }
  | { kind: "credit_card"; data: ICreditCard & { currentInvoiceAmount: number; nextClosingDate: Date } };

const Transactions = () => {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [events, setEvents] = useState<Event[]>([]);
  const [creditCards, setCreditCards] = useState<ICreditCard[]>([]);
  const [loading, setLoading] = useState(true);

  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState("all");
  const [filterCategory, setFilterCategory] = useState("all");
  const [filterGroup, setFilterGroup] = useState("all");
  const [onlyPending, setOnlyPending] = useState(false);
  const [onlyCreditCard, setOnlyCreditCard] = useState(false);
  const [dateRange, setDateRange] = useState<DateRange>({
    from: startOfMonth(new Date()),
    to: endOfMonth(new Date()),
  });

  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [transactionToDelete, setTransactionToDelete] = useState<Transaction | null>(null);
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const [selectedCard, setSelectedCard] = useState<ICreditCard | null>(null);
  const [transactionToEdit, setTransactionToEdit] = useState<Transaction | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);

  const { toast } = useToast();

  useEffect(() => {
    loadData();
  }, [dateRange]);

  useEffect(() => {
    const channel = supabase
      .channel("transactions-page-changes")
      .on("postgres_changes", { event: "*", schema: "public", table: "transactions" }, () => loadData(false))
      .on("postgres_changes", { event: "*", schema: "public", table: "events" }, () => loadData(false))
      .on("postgres_changes", { event: "*", schema: "public", table: "credit_cards" }, () => loadCreditCards())
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [dateRange]);

  const loadData = async (showLoading = true) => {
    if (showLoading) setLoading(true);
    try {
      await Promise.all([loadTransactions(), loadEvents(), loadCreditCards()]);
    } finally {
      setLoading(false);
    }
  };

  const loadTransactions = async () => {
    try {
      // CORREÇÃO: Removido o join com 'profiles' que causava erro se a FK não existisse ou tivesse outro nome.
      // O nome do usuário não estava sendo usado na listagem, então é seguro remover para garantir robustez.
      let query = supabase
        .from("transactions")
        .select(`*, groups!left (name)`)
        .order("date", { ascending: false });

      if (dateRange.from) query = query.gte("date", format(dateRange.from, "yyyy-MM-dd"));
      if (dateRange.to) query = query.lte("date", format(dateRange.to, "yyyy-MM-dd"));

      const { data, error } = await query;

      if (error) throw error;

      const formattedData: Transaction[] = (data as any[]).map((t) => ({
        id: t.id,
        description: t.description,
        amount: Number(t.amount),
        type: t.type as "income" | "expense",
        category: t.category,
        date: t.date,
        group_id: t.group_id,
        event_id: t.event_id,
        group_name: t.groups?.name,
        is_fixed: t.is_fixed || false,
        is_recurring: t.is_recurring || false,
        recurrence_id: t.recurrence_id,
        is_pending: t.is_pending || false,
        pending_type: t.pending_type as "payable" | "receivable" | null,
        paid_at: t.paid_at,
        is_credit_card: t.is_credit_card || false,
        credit_card_id: t.credit_card_id,
        card_closing_date: t.card_closing_date,
      })) || [];

      setTransactions(formattedData);
    } catch (error) {
      console.error("Erro ao carregar transações:", error);
      toast({ title: "Erro", description: "Falha ao carregar lista de transações", variant: "destructive" });
    }
  };

  const loadEvents = async () => {
    try {
      let query = supabase
        .from("events" as any)
        .select("*")
        .order("date", { ascending: false });

      if (dateRange.from) query = query.gte("date", format(dateRange.from, "yyyy-MM-dd"));
      if (dateRange.to) query = query.lte("date", format(dateRange.to, "yyyy-MM-dd"));

      const { data, error } = await query;
      if (error) throw error;

      setEvents(data || []);
    } catch (error) {
      console.error("Erro ao carregar eventos:", error);
    }
  };

  const loadCreditCards = async () => {
    try {
      const { data, error } = await supabase.from("credit_cards").select("*").order("name");
      if (error) throw error;
      setCreditCards(data || []);
    } catch (error) {
      console.error("Erro ao carregar cartões:", error);
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

      const { error } = await supabase
        .from("transactions")
        .update(updates)
        .eq("id", transaction.id);

      if (error) throw error;

      toast({
        title: "Status atualizado",
        description: `Transação marcada como ${newIsPending ? "pendente" : "concluída"}`,
      });
      loadTransactions();
    } catch (error) {
      toast({ title: "Erro", description: "Falha ao atualizar status", variant: "destructive" });
    }
  };

  const handleDeleteClick = (transaction: Transaction) => {
    setTransactionToDelete(transaction);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!transactionToDelete) return;
    try {
      if (
        transactionToDelete.recurrence_id &&
        (transactionToDelete.is_fixed || transactionToDelete.is_recurring || transactionToDelete.is_credit_card)
      ) {
        await supabase.from("transactions").delete().eq("recurrence_id", transactionToDelete.recurrence_id);
      } else {
        await supabase.from("transactions").delete().eq("id", transactionToDelete.id);
      }
      toast({ title: "Sucesso", description: "Transação removida" });
      loadTransactions();
    } catch (error) {
      toast({ title: "Erro", description: "Erro ao remover", variant: "destructive" });
    } finally {
      setDeleteDialogOpen(false);
      setTransactionToDelete(null);
    }
  };

  useEffect(() => {
    if (events.length > 0) {
      updateEventTotals();
    }
  }, [events.length]);

  const updateEventTotals = async () => {
    const eventIds = events.map((e) => e.id);
    if (eventIds.length === 0) return;

    const { data } = await supabase.from("transactions").select("event_id, amount, type").in("event_id", eventIds);

    if (data) {
      setEvents((prev) =>
        prev.map((ev) => {
          const evTrans = data.filter((t) => t.event_id === ev.id);
          const total = evTrans.reduce((acc, t) => acc + (t.type === "income" ? t.amount : -Math.abs(t.amount)), 0);
          return { ...ev, totalAmount: total };
        })
      );
    }
  };

  const displayList = useMemo(() => {
    const list: DisplayItem[] = [];

    transactions.forEach((t) => {
      // Hide transactions that are part of an event (legacy logic) OR part of a credit card (new logic)
      // They are shown inside their respective modals
      if (!t.event_id && !t.is_credit_card) {
        list.push({ kind: "transaction", data: t });
      }
    });

    if (!onlyPending && !onlyCreditCard) {
      events.forEach((e) => {
        list.push({ kind: "event", data: e });
      });

      // Calculate totals for each card invoice in the current view
      // We need to show an invoice card for EACH month that has a closing date within the current view or near it
      // Actually, standard behavior is: Show 'Invoice Card' with the date set to the closing date.
      // So if I filter 'January', I see the invoice closing in January.

      creditCards.forEach((card) => {
        // Find transactions for this card that are pending
        const cardTransactions = transactions.filter(t =>
          t.is_credit_card &&
          t.credit_card_id === card.id &&
          t.is_pending
        );

        if (cardTransactions.length === 0) return;

        // Group by closing date
        const invoicesByDate: Record<string, number> = {};

        cardTransactions.forEach(t => {
          if (t.card_closing_date) {
            invoicesByDate[t.card_closing_date] = (invoicesByDate[t.card_closing_date] || 0) + Math.abs(t.amount);
          }
        });

        // Create a DisplayItem for each invoice date found that falls within the current filter range (if any)
        // Or just show all if no date filter? usually displayList is already filtered by date if 'dateRange' is set?
        // Wait, 'transactions' state contains ALL transactions or just filtered?
        // loadTransactions fetches ALL.
        // But the list generation below doesn't seem to apply date filtering explicitly for transactions,
        // it relies on the `transactions` array being what we want to show?
        // Actually `transactions` has EVERYTHING.
        // We need to check if the closing date matches the current filter if strict filtering is needed.
        // However, the `list` is usually sorted and filtered later?
        // No, `loadTransactions` creates `transactions`. `loadTransactions` filters by date!
        // So `transactions` ONLY contains items in the current range.

        // So, if we found transactions, they are in the range.
        // AND their closing date should be in the range too (mostly).

        Object.entries(invoicesByDate).forEach(([dateStr, amount]) => {
          const closingDate = new Date(dateStr + "T00:00:00"); // Ensure correct timezone handling or use parseISO
          list.push({
            kind: "credit_card",
            data: {
              ...card,
              currentInvoiceAmount: amount,
              nextClosingDate: closingDate
            }
          });
        });
      });
    }

    return list
      .filter((item) => {
        if (item.kind === "transaction") {
          const matchesSearch =
            item.data.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
            item.data.category.toLowerCase().includes(searchTerm.toLowerCase());
          const matchesType = filterType === "all" || item.data.type === filterType;
          const matchesCategory = filterCategory === "all" || item.data.category === filterCategory;
          const matchesGroup =
            filterGroup === "all" || (filterGroup === "none" && !item.data.group_id) || item.data.group_id === filterGroup;
          const matchesPending = !onlyPending || item.data.is_pending;
          const matchesCreditCard = !onlyCreditCard || item.data.is_credit_card;

          return matchesSearch && matchesType && matchesCategory && matchesGroup && matchesPending && matchesCreditCard;
        } else {
          return item.data.name.toLowerCase().includes(searchTerm.toLowerCase());
        }
      })
      .sort((a, b) => {
        const getDate = (item: DisplayItem) => {
          if (item.kind === 'transaction') return item.data.date;
          if (item.kind === 'event') return item.data.date;
          if (item.kind === 'credit_card') return format(item.data.nextClosingDate, 'yyyy-MM-dd'); // Sort cards by closing date
          return '';
        };
        const dateA = new Date(getDate(a)).getTime();
        const dateB = new Date(getDate(b)).getTime();
        return dateB - dateA;
      });
  }, [transactions, events, creditCards, searchTerm, filterType, filterCategory, filterGroup, onlyPending, onlyCreditCard]);

  // Exclude is_credit_card=true from global totals to avoid double counting (they are paid via 'Expense' transactions)
  const completedTransactions = transactions.filter(t => !t.is_pending && !t.is_credit_card);

  const totalIncome = completedTransactions.reduce((acc, t) => (t.type === "income" ? acc + t.amount : acc), 0);
  const totalExpense = completedTransactions.reduce((acc, t) => (t.type === "expense" ? acc + Math.abs(t.amount) : acc), 0);
  const balance = totalIncome - totalExpense;

  const pendingIncome = transactions.filter(t => t.is_pending && t.type === "income" && !t.is_credit_card).reduce((acc, t) => acc + t.amount, 0);
  const pendingExpense = transactions.filter(t => t.is_pending && t.type === "expense" && !t.is_credit_card).reduce((acc, t) => acc + Math.abs(t.amount), 0);

  const categories = Array.from(new Set(transactions.map((t) => t.category))).filter((cat) => cat && cat.trim() !== "");

  const clearFilters = () => {
    setSearchTerm("");
    setFilterType("all");
    setFilterCategory("all");
    setFilterGroup("all");
    setOnlyPending(false);
    setOnlyCreditCard(false);
  };

  return (
    <DashboardLayout>
      <div className="flex flex-col gap-6 p-4 md:p-8 max-w-7xl mx-auto w-full">
        <Tabs defaultValue="transactions" className="w-full">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-6">
            <div className="space-y-1">
              <h1 className="text-3xl font-bold tracking-tight">Transações</h1>
              <p className="text-muted-foreground">Gerencie suas entradas, saídas e cartões</p>
            </div>
            <TabsList>
              <TabsTrigger value="transactions">Transações</TabsTrigger>
              <TabsTrigger value="cards">Meus Cartões</TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="transactions" className="space-y-6">
            <div className="flex flex-wrap gap-2 justify-end mb-4">
              <AddCreditCardDialog onSuccess={() => loadData()} />
              <AddEventDialog onSuccess={() => loadData()} />
              <AddTransactionDialog
                type="income"
                onSuccess={() => loadData()}
                trigger={
                  <Button variant="outline">
                    <Plus className="h-4 w-4 mr-2" /> Receita
                  </Button>
                }
              />
              <AddTransactionDialog
                type="expense"
                onSuccess={() => loadData()}
                trigger={
                  <Button>
                    <Plus className="h-4 w-4 mr-2" /> Despesa
                  </Button>
                }
              />
            </div>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Filter className="h-5 w-5" /> Filtros
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <DateFilter dateRange={dateRange} onDateRangeChange={setDateRange} />
                  <div className="flex flex-col md:flex-row gap-4 flex-wrap">
                    <div className="relative flex-1 min-w-[200px]">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input placeholder="Buscar..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-10" />
                    </div>
                    <Select value={filterType} onValueChange={setFilterType}>
                      <SelectTrigger className="w-[140px]">
                        <SelectValue placeholder="Tipo" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Todos</SelectItem>
                        <SelectItem value="income">Receitas</SelectItem>
                        <SelectItem value="expense">Despesas</SelectItem>
                      </SelectContent>
                    </Select>
                    <Select value={filterCategory} onValueChange={setFilterCategory}>
                      <SelectTrigger className="w-[160px]">
                        <SelectValue placeholder="Categoria" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Todas</SelectItem>
                        {categories.map((cat) => (
                          <SelectItem key={cat} value={cat}>
                            {cat}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <div className="flex items-center space-x-2 border rounded-md px-3 h-10 bg-background">
                      <Toggle
                        pressed={onlyPending}
                        onPressedChange={setOnlyPending}
                        size="sm"
                        className="w-full h-full data-[state=on]:bg-orange-100 data-[state=on]:text-orange-900"
                      >
                        Pendentes
                      </Toggle>
                    </div>
                    <div className="flex items-center space-x-2 border rounded-md px-3 h-10 bg-background">
                      <Toggle
                        pressed={onlyCreditCard}
                        onPressedChange={setOnlyCreditCard}
                        size="sm"
                        className="w-full h-full data-[state=on]:bg-primary/10 data-[state=on]:text-primary"
                      >
                        <CreditCard className="h-4 w-4 mr-2" />
                        Cartão
                      </Toggle>
                    </div>
                    <Button variant="outline" onClick={clearFilters}>
                      Limpar
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium">Total Receitas</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-success">
                    {totalIncome.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium">Total Despesas</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-destructive">
                    {totalExpense.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium">Saldo Realizado</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className={cn("text-2xl font-bold", balance >= 0 ? "text-success" : "text-destructive")}>
                    {balance.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                  </div>
                </CardContent>
              </Card>
              <CreditCardSummary />
              <PendingSummaryCard pendingIncome={pendingIncome} pendingExpense={pendingExpense} isLoading={loading} />
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Lançamentos</CardTitle>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="flex justify-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                  </div>
                ) : displayList.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">Nenhum lançamento encontrado</div>
                ) : (
                  <div className="space-y-4">
                    {displayList.map((item) => {
                      if (item.kind === "event") {
                        const ev = item.data;
                        const total = ev.totalAmount || 0;
                        return (
                          <div
                            key={`event-${ev.id}`}
                            onClick={() => setSelectedEvent(ev)}
                            className="flex items-center justify-between p-4 rounded-lg border bg-accent/5 hover:bg-accent/10 border-l-4 border-l-primary cursor-pointer transition-all"
                          >
                            <div className="flex items-center gap-4">
                              <div className="p-2 rounded-full bg-primary/20 text-primary">
                                <Layers className="h-5 w-5 text-primary" />
                              </div>
                              <div>
                                <div className="flex items-center gap-2">
                                  <p className="font-bold text-primary">{ev.name}</p>
                                  <Badge className="bg-primary text-primary-foreground hover:bg-primary/90 text-[10px]">Evento</Badge>
                                </div>
                                <span className="text-xs text-muted-foreground">
                                  {new Date(ev.date).toLocaleDateString("pt-BR")} • Clique para ver detalhes
                                </span>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <p className={cn("font-semibold text-lg", total >= 0 ? "text-success" : "text-destructive")}>
                                {total.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                              </p>
                            </div>
                          </div>
                        );
                      } else if (item.kind === "credit_card") {
                        const card = item.data;
                        return (
                          <div
                            key={`card-${card.id}-${format(card.nextClosingDate, 'yyyy-MM-dd')}`}
                            onClick={() => setSelectedCard(card)}
                            className="flex items-center justify-between p-4 rounded-lg border bg-accent/5 hover:bg-accent/10 border-l-4 border-l-purple-500 cursor-pointer transition-all"
                          >
                            <div className="flex items-center gap-4">
                              <div className="p-2 rounded-full bg-purple-100 text-purple-600 dark:bg-purple-900/20">
                                <CreditCard className="h-5 w-5" />
                              </div>
                              <div>
                                <div className="flex items-center gap-2">
                                  <p className="font-bold text-purple-700 dark:text-purple-300">{card.name}</p>
                                  <Badge variant="outline" className="border-purple-200 text-purple-700 dark:border-purple-800 dark:text-purple-300 text-[10px]">Fatura</Badge>
                                </div>
                                <span className="text-xs text-muted-foreground">
                                  Fecha em {format(card.nextClosingDate, 'dd/MM/yyyy')} • Vence em {format(getNextDueDate(card, card.nextClosingDate), 'dd/MM')}
                                </span>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <div className="text-right">
                                <p className="text-xs text-muted-foreground">Total da Fatura</p>
                                <p className="font-semibold text-lg text-destructive">
                                  {card.currentInvoiceAmount.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                                </p>
                              </div>
                            </div>
                          </div>
                        );
                      } else {
                        const transaction = item.data;
                        return (
                          <div
                            key={transaction.id}
                            className={cn(
                              "flex items-center justify-between p-4 rounded-lg border transition-colors",
                              transaction.is_pending ? "bg-orange-50 border-orange-200 dark:bg-orange-950/20 dark:border-orange-800" : "hover:bg-accent/50"
                            )}
                          >
                            <div className="flex items-center gap-4">
                              <div
                                className={cn(
                                  "p-2 rounded-full",
                                  transaction.type === "income" ? "bg-success/10 text-success" : "bg-destructive/10 text-destructive"
                                )}
                              >
                                {transaction.type === "income" ? (
                                  <ArrowUpCircle className="h-5 w-5" />
                                ) : (
                                  <ArrowDownCircle className="h-5 w-5" />
                                )}
                              </div>
                              <div>
                                <div className="flex items-center gap-2">
                                  <p className="font-medium">{transaction.description}</p>
                                  {transaction.is_pending && (
                                    <Badge variant="outline" className="text-orange-600 border-orange-200 bg-orange-100 text-[10px]">
                                      Pendente
                                    </Badge>
                                  )}
                                  {transaction.is_credit_card && (
                                    <Badge variant="secondary" className="text-xs">
                                      <CreditCard className="h-3 w-3 mr-1" />
                                      Cartão
                                    </Badge>
                                  )}
                                  {transaction.is_fixed && <Badge variant="outline" className="text-xs">Fixo</Badge>}
                                  {transaction.is_recurring && !transaction.is_fixed && <Badge variant="outline" className="text-xs">Recorrente</Badge>}
                                </div>
                                <div className="flex items-center gap-2 mt-1">
                                  <Badge variant="secondary" className="text-xs">{transaction.category}</Badge>
                                  {transaction.group_name && <Badge variant="outline" className="text-xs">{transaction.group_name}</Badge>}
                                  <span className="text-xs text-muted-foreground">{new Date(transaction.date).toLocaleDateString("pt-BR")}</span>
                                </div>
                              </div>
                            </div>
                            <div className="flex items-center gap-3">
                              <p className={cn("font-semibold text-lg", transaction.type === "income" ? "text-success" : "text-destructive", transaction.is_pending && "opacity-60")}>
                                {transaction.type === "income" ? "+" : "-"}
                                {Math.abs(transaction.amount).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                              </p>

                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleToggleStatus(transaction)}
                                title={transaction.is_pending ? "Marcar como pago/recebido" : "Marcar como pendente"}
                                className={transaction.is_pending ? "text-orange-500 hover:text-orange-600" : "text-success hover:text-success/80"}
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

                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleDeleteClick(transaction)}
                                className="text-destructive hover:bg-destructive/10"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        );
                      }
                    })}
                  </div>
                )}
              </CardContent>
            </Card>

            <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
                  <AlertDialogDescription>
                    Tem certeza que deseja remover esta transação?
                    {(transactionToDelete?.recurrence_id) && " Isto removerá todas as parcelas/ocorrências associadas."}
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                  <AlertDialogAction onClick={handleDeleteConfirm} className="bg-destructive hover:bg-destructive/90">Remover</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>

            {selectedEvent && (
              <EventDetailsModal
                isOpen={!!selectedEvent}
                onClose={() => setSelectedEvent(null)}
                eventId={selectedEvent.id}
                eventName={selectedEvent.name}
                eventDate={selectedEvent.date}
                groupId={(selectedEvent as any).group_id}
                onUpdate={() => {
                  loadData(false);
                  updateEventTotals();
                }}
              />
            )}

            {selectedCard && (
              <CreditCardDetailsModal
                isOpen={!!selectedCard}
                onClose={() => setSelectedCard(null)}
                card={selectedCard}
                onUpdate={() => {
                  loadData(false);
                  loadCreditCards();
                }}
              />
            )}

            <EditTransactionDialog
              transaction={transactionToEdit}
              isOpen={editDialogOpen}
              onClose={() => {
                setEditDialogOpen(false);
                setTransactionToEdit(null);
              }}
              onSuccess={() => loadData(false)}
            />
          </TabsContent>

          <TabsContent value="cards">
            <CreditCardsTab />
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
};

export default Transactions;