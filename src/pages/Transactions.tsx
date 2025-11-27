import { useState, useEffect, useMemo } from "react";
import { ArrowUpCircle, ArrowDownCircle, Search, Filter, Plus, Trash2, Layers } from "@/lib/icons";
import { startOfMonth, endOfMonth, format } from "@/lib/date";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { AddTransactionDialog } from "@/components/dialogs/AddTransactionDialog";
import { AddEventDialog } from "@/components/dialogs/AddEventDialog";
import { EventDetailsModal } from "@/components/transactions/EventDetailsModal";
import { DateFilter, DateRange } from "@/components/filters/DateFilter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
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

// ... (Mantenha as interfaces Transaction, Event, DisplayItem iguais ao arquivo original)
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
  created_by_name?: string; // Adicionado para mostrar quem criou
}

interface Event {
  id: string;
  name: string;
  description: string;
  date: string;
  totalAmount?: number;
}

type DisplayItem = { kind: "transaction"; data: Transaction } | { kind: "event"; data: Event };

const Transactions = () => {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);

  // Filtros
  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState("all");
  const [filterCategory, setFilterCategory] = useState("all");
  const [filterGroup, setFilterGroup] = useState("all");
  const [dateRange, setDateRange] = useState<DateRange>({
    from: startOfMonth(new Date()),
    to: endOfMonth(new Date()),
  });

  // Modais
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [transactionToDelete, setTransactionToDelete] = useState<Transaction | null>(null);
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);

  const { toast } = useToast();

  // Carregamento inicial
  useEffect(() => {
    loadData();
  }, [dateRange]);

  // --- REALTIME SUBSCRIPTION ---
  useEffect(() => {
    const channel = supabase
      .channel("transactions-page-changes")
      .on("postgres_changes", { event: "*", schema: "public", table: "transactions" }, () => {
        loadData(false); // false para não mostrar loading spinner
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "events" }, () => {
        loadData(false);
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [dateRange]);

  const loadData = async (showLoading = true) => {
    if (showLoading) setLoading(true);
    try {
      await Promise.all([loadTransactions(), loadEvents()]);
    } finally {
      setLoading(false);
    }
  };

  const loadTransactions = async () => {
    try {
      // Adicionado profiles!user_id (full_name) para pegar o nome de quem criou
      let query = supabase
        .from("transactions")
        .select(`*, groups!left (name), profiles!user_id (full_name)`)
        .order("date", { ascending: false });

      if (dateRange.from) query = query.gte("date", format(dateRange.from, "yyyy-MM-dd"));
      if (dateRange.to) query = query.lte("date", format(dateRange.to, "yyyy-MM-dd"));

      const { data, error } = await query;

      if (error) throw error;

      const formattedData =
        data?.map((t) => ({
          id: t.id,
          description: t.description,
          amount: Number(t.amount),
          type: t.type as "income" | "expense",
          category: t.category,
          date: t.date,
          group_id: t.group_id,
          event_id: t.event_id,
          group_name: t.groups?.name,
          created_by_name: t.profiles?.full_name, // Nome do criador
          is_fixed: t.is_fixed || false,
          is_recurring: t.is_recurring || false,
          recurrence_id: t.recurrence_id,
        })) || [];

      setTransactions(formattedData);
    } catch (error) {
      console.error("Erro ao carregar transações:", error);
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

  // ... (Mantenha handleDeleteClick, handleDeleteConfirm e updateEventTotals iguais)
  const handleDeleteClick = (transaction: Transaction) => {
    setTransactionToDelete(transaction);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!transactionToDelete) return;
    try {
      if (transactionToDelete.is_fixed && transactionToDelete.recurrence_id) {
        await supabase.from("transactions").delete().eq("recurrence_id", transactionToDelete.recurrence_id);
      } else {
        await supabase.from("transactions").delete().eq("id", transactionToDelete.id);
      }
      toast({ title: "Sucesso", description: "Transação removida" });
      // O realtime vai cuidar de atualizar, mas podemos forçar para feedback imediato local
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

  // ... (Mantenha displayList igual)
  const displayList = useMemo(() => {
    const list: DisplayItem[] = [];
    transactions.forEach((t) => {
      if (!t.event_id) list.push({ kind: "transaction", data: t });
    });
    events.forEach((e) => list.push({ kind: "event", data: e }));

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
          return matchesSearch && matchesType && matchesCategory && matchesGroup;
        } else {
          return item.data.name.toLowerCase().includes(searchTerm.toLowerCase());
        }
      })
      .sort((a, b) => {
        const dateA = new Date(a.kind === "transaction" ? a.data.date : a.data.date).getTime();
        const dateB = new Date(b.kind === "transaction" ? b.data.date : b.data.date).getTime();
        return dateB - dateA;
      });
  }, [transactions, events, searchTerm, filterType, filterCategory, filterGroup]);

  // --- CÁLCULO DE TOTAIS (CORRIGIDO PARA SUBTRAIR) ---
  const totalIncome = transactions.reduce((acc, t) => {
    if (t.type === "income") return acc + t.amount;
    return acc;
  }, 0);

  const totalExpense = transactions.reduce((acc, t) => {
    if (t.type === "expense") return acc + Math.abs(t.amount);
    return acc;
  }, 0);

  // Aqui está a correção principal do saldo da tela de Transações
  const balance = totalIncome - totalExpense;

  const categories = Array.from(new Set(transactions.map((t) => t.category))).filter((cat) => cat && cat.trim() !== "");

  const clearFilters = () => {
    setSearchTerm("");
    setFilterType("all");
    setFilterCategory("all");
    setFilterGroup("all");
  };

  return (
    <DashboardLayout>
      <div className="p-6 space-y-6">
        {/* ... (Cabeçalho e Filtros mantidos iguais) ... */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Transações</h1>
            <p className="text-muted-foreground">Gerencie suas entradas, saídas e eventos</p>
          </div>
          <div className="flex flex-wrap gap-2">
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
              <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input placeholder="Buscar..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-10" />
                </div>
                <Select value={filterType} onValueChange={setFilterType}>
                  <SelectTrigger>
                    <SelectValue placeholder="Tipo" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    <SelectItem value="income">Receitas</SelectItem>
                    <SelectItem value="expense">Despesas</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={filterCategory} onValueChange={setFilterCategory}>
                  <SelectTrigger>
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
                <Select value={filterGroup} onValueChange={setFilterGroup}>
                  <SelectTrigger>
                    <SelectValue placeholder="Grupo" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    <SelectItem value="none">Pessoal</SelectItem>
                  </SelectContent>
                </Select>
                <Button variant="outline" onClick={clearFilters}>
                  Limpar
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Cards de Resumo */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
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
              <CardTitle className="text-sm font-medium">Saldo</CardTitle>
            </CardHeader>
            <CardContent>
              <div className={cn("text-2xl font-bold", balance >= 0 ? "text-success" : "text-destructive")}>
                {balance.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Lista */}
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
                            <Layers className="h-5 w-5" />
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
                  } else {
                    const transaction = item.data;
                    return (
                      <div
                        key={transaction.id}
                        className="flex items-center justify-between p-4 rounded-lg border hover:bg-accent/50 transition-colors"
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
                              {transaction.is_fixed && (
                                <Badge variant="outline" className="text-xs">
                                  Fixo
                                </Badge>
                              )}
                              {transaction.is_recurring && !transaction.is_fixed && (
                                <Badge variant="outline" className="text-xs">
                                  Recorrente
                                </Badge>
                              )}
                            </div>
                            <div className="flex items-center gap-2 mt-1">
                              <Badge variant="secondary" className="text-xs">
                                {transaction.category}
                              </Badge>
                              {transaction.group_name && (
                                <Badge variant="outline" className="text-xs">
                                  {transaction.group_name}
                                </Badge>
                              )}
                              <span className="text-xs text-muted-foreground">
                                {new Date(transaction.date).toLocaleDateString("pt-BR")}
                              </span>
                              {transaction.created_by_name && (
                                <span className="text-[10px] text-muted-foreground italic">
                                  • Por: {transaction.created_by_name.split(" ")[0]}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <p className={cn("font-semibold text-lg", transaction.type === "income" ? "text-success" : "text-destructive")}>
                            {transaction.type === "income" ? "+" : "-"}
                            {Math.abs(transaction.amount).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                          </p>
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

        {/* Modais (Delete e Event) mantidos iguais */}
        <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
              <AlertDialogDescription>Tem certeza que deseja remover esta transação?</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction onClick={handleDeleteConfirm} className="bg-destructive hover:bg-destructive/90">
                Remover
              </AlertDialogAction>
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
            onUpdate={() => {
              loadData(false);
              updateEventTotals();
            }}
          />
        )}
      </div>
    </DashboardLayout>
  );
};

export default Transactions;
