import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowUpCircle, ArrowDownCircle, Calendar, Clock } from "@/lib/icons";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";

interface Transaction {
  id: string;
  description: string;
  amount: number;
  type: "income" | "expense";
  category: string;
  date: string;
  is_pending: boolean; // Adicionado para diferenciar visulamente
  group?: {
    name: string;
  };
}

export const TransactionsList = () => {
  const { user } = useAuth();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const loadTransactions = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from("transactions")
        .select(
          `
          id,
          description,
          amount,
          type,
          category,
          date,
          is_pending,
          group_id,
          groups!left (
            name
          )
        `
        )
        .eq("user_id", user.id) // Garante filtro por usuário explicitamente
        .order("date", { ascending: false })
        .limit(5);

      if (error) throw error;

      const formattedTransactions =
        data?.map((transaction) => ({
          id: transaction.id,
          description: transaction.description,
          amount: Number(transaction.amount),
          type: transaction.type as "income" | "expense",
          category: transaction.category,
          date: transaction.date,
          is_pending: transaction.is_pending,
          group: transaction.groups ? { name: transaction.groups.name } : undefined,
        })) || [];

      setTransactions(formattedTransactions);
    } catch (error) {
      console.error("Erro ao carregar transações:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!user) return;

    // Carregamento inicial
    loadTransactions();

    // Configuração do Realtime com filtro específico para o usuário
    const channel = supabase
      .channel(`recent-transactions-${user.id}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "transactions",
          filter: `user_id=eq.${user.id}`, // Escuta apenas alterações deste usuário
        },
        () => {
          loadTransactions(); // Recarrega a lista ao detectar mudança
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]); // Recria a subscrição se o usuário mudar

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Transações Recentes
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="flex items-center justify-between p-3 rounded-lg border border-border">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-muted rounded-full animate-pulse" />
                  <div>
                    <div className="w-32 h-4 bg-muted rounded animate-pulse mb-2" />
                    <div className="w-20 h-3 bg-muted rounded animate-pulse" />
                  </div>
                </div>
                <div className="text-right">
                  <div className="w-20 h-4 bg-muted rounded animate-pulse mb-2" />
                  <div className="w-16 h-3 bg-muted rounded animate-pulse" />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calendar className="h-5 w-5" />
          Transações Recentes
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {transactions.length === 0 ? (
            <p className="text-center text-muted-foreground py-4">Nenhuma transação encontrada</p>
          ) : (
            transactions.map((transaction) => (
              <div
                key={transaction.id}
                className={cn(
                  "flex items-center justify-between p-3 rounded-lg border transition-colors",
                  transaction.is_pending ? "bg-orange-50/50 border-orange-200 hover:bg-orange-50" : "border-border hover:bg-muted/50"
                )}
              >
                <div className="flex items-center gap-3">
                  <div
                    className={cn(
                      "p-2 rounded-full",
                      transaction.type === "income" ? "bg-success/10 text-success" : "bg-destructive/10 text-destructive"
                    )}
                  >
                    {transaction.type === "income" ? <ArrowUpCircle className="h-4 w-4" /> : <ArrowDownCircle className="h-4 w-4" />}
                  </div>
                  <div>
                    <p className="font-medium">{transaction.description}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge variant="secondary" className="text-xs">
                        {transaction.category}
                      </Badge>
                      {transaction.is_pending && (
                        <Badge variant="outline" className="text-[10px] text-orange-600 border-orange-200 bg-orange-100">
                          <Clock className="w-3 h-3 mr-1" />
                          Pendente
                        </Badge>
                      )}
                      {transaction.group && (
                        <Badge variant="outline" className="text-xs">
                          Grupo: {transaction.group.name}
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <p
                    className={cn(
                      "font-semibold",
                      transaction.type === "income" ? "text-success" : "text-destructive",
                      transaction.is_pending && "opacity-60"
                    )}
                  >
                    {transaction.type === "income" ? "+" : ""}
                    {transaction.amount.toLocaleString("pt-BR", {
                      style: "currency",
                      currency: "BRL",
                    })}
                  </p>
                  <p className="text-xs text-muted-foreground">{new Date(transaction.date).toLocaleDateString("pt-BR")}</p>
                </div>
              </div>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );
};
