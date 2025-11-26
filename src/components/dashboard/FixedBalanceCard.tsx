import { useState, useEffect } from "react";
import { DollarSign, TrendingUp, TrendingDown, ChevronLeft, ChevronRight } from "@/lib/icons";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

interface FixedTransaction {
  id: string;
  description: string;
  amount: number;
  type: "income" | "expense";
  category: string;
  recurrence_id: string;
}

const ITEMS_PER_PAGE = 5;

export const FixedBalanceCard = () => {
  const [fixedIncome, setFixedIncome] = useState<FixedTransaction[]>([]);
  const [fixedExpenses, setFixedExpenses] = useState<FixedTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [incomePage, setIncomePage] = useState(1);
  const [expensePage, setExpensePage] = useState(1);
  const { toast } = useToast();

  useEffect(() => {
    loadFixedTransactions();
  }, []);

  const loadFixedTransactions = async () => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from("transactions")
        .select("id, description, amount, type, category, recurrence_id")
        .eq("user_id", user.id)
        .eq("is_fixed", true)
        .order("description", { ascending: true });

      if (error) throw error;

      const uniqueTransactions = new Map<string, FixedTransaction>();
      data?.forEach((t) => {
        const amount = typeof t.amount === "number" ? t.amount : parseFloat(t.amount || "0");
        if (!uniqueTransactions.has(t.recurrence_id)) {
          uniqueTransactions.set(t.recurrence_id, {
            id: t.id,
            description: t.description,
            amount: amount,
            type: t.type as "income" | "expense",
            category: t.category,
            recurrence_id: t.recurrence_id,
          });
        }
      });

      const uniqueArray = Array.from(uniqueTransactions.values());
      const income = uniqueArray.filter((t) => t.type === "income");
      const expenses = uniqueArray.filter((t) => t.type === "expense");

      setFixedIncome(income);
      setFixedExpenses(expenses);
    } catch (error) {
      console.error("Erro ao carregar lançamentos fixos:", error);
      toast({
        title: "Erro",
        description: "Erro ao carregar balanço fixo",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const totalFixedIncome = fixedIncome.reduce((sum, t) => sum + t.amount, 0);
  const totalFixedExpenses = Math.abs(fixedExpenses.reduce((sum, t) => sum + t.amount, 0));
  const fixedBalance = totalFixedIncome - totalFixedExpenses;

  const totalIncomePages = Math.ceil(fixedIncome.length / ITEMS_PER_PAGE);
  const paginatedIncome = fixedIncome.slice((incomePage - 1) * ITEMS_PER_PAGE, incomePage * ITEMS_PER_PAGE);

  const totalExpensePages = Math.ceil(fixedExpenses.length / ITEMS_PER_PAGE);
  const paginatedExpenses = fixedExpenses.slice((expensePage - 1) * ITEMS_PER_PAGE, expensePage * ITEMS_PER_PAGE);

  const handlePrevIncomePage = () => setIncomePage((prev) => Math.max(prev - 1, 1));
  const handleNextIncomePage = () => setIncomePage((prev) => Math.min(prev + 1, totalIncomePages));
  const handlePrevExpensePage = () => setExpensePage((prev) => Math.max(prev - 1, 1));
  const handleNextExpensePage = () => setExpensePage((prev) => Math.min(prev + 1, totalExpensePages));

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Balanço Fixo Mensal</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-2">
            <div className="h-4 bg-muted rounded"></div>
            <div className="h-4 bg-muted rounded"></div>
            <div className="h-4 bg-muted rounded"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <DollarSign className="h-5 w-5" />
          Balanço Fixo Mensal
        </CardTitle>
        <CardDescription>Receitas e despesas fixas que se repetem todos os meses</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-4">
          {/* Receitas Fixas */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-sm font-semibold flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-success" />
                Receitas Fixas
              </h4>
              <Badge variant="outline" className="text-success">
                {totalFixedIncome.toLocaleString("pt-BR", {
                  style: "currency",
                  currency: "BRL",
                })}
              </Badge>
            </div>
            <div className="space-y-2 min-h-[180px]">
              {" "}
              {paginatedIncome.length === 0 ? (
                <p className="text-xs text-muted-foreground text-center py-2">Nenhuma receita fixa cadastrada</p>
              ) : (
                paginatedIncome.map((transaction) => (
                  <div key={transaction.recurrence_id} className="flex items-center justify-between p-2 rounded-md bg-muted/30">
                    <div className="flex-1 overflow-hidden mr-2">
                      <p className="text-sm font-medium truncate" title={transaction.description}>
                        {transaction.description}
                      </p>
                      <p className="text-xs text-muted-foreground truncate" title={transaction.category}>
                        {transaction.category}
                      </p>
                    </div>
                    <span className="text-sm font-semibold text-success whitespace-nowrap">
                      +
                      {transaction.amount.toLocaleString("pt-BR", {
                        style: "currency",
                        currency: "BRL",
                      })}
                    </span>
                  </div>
                ))
              )}
            </div>
            {totalIncomePages > 1 && (
              <div className="flex items-center justify-end gap-2 mt-3">
                <span className="text-xs text-muted-foreground">
                  Página {incomePage} de {totalIncomePages}
                </span>
                <Button variant="outline" size="icon" className="h-7 w-7" onClick={handlePrevIncomePage} disabled={incomePage === 1}>
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  className="h-7 w-7"
                  onClick={handleNextIncomePage}
                  disabled={incomePage === totalIncomePages}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            )}
          </div>

          <div>
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-sm font-semibold flex items-center gap-2">
                <TrendingDown className="h-4 w-4 text-destructive" />
                Despesas Fixas
              </h4>
              <Badge variant="outline" className="text-destructive">
                -
                {totalFixedExpenses.toLocaleString("pt-BR", {
                  style: "currency",
                  currency: "BRL",
                })}
              </Badge>
            </div>
            <div className="space-y-2 min-h-[180px]">
              {" "}
              {paginatedExpenses.length === 0 ? (
                <p className="text-xs text-muted-foreground text-center py-2">Nenhuma despesa fixa cadastrada</p>
              ) : (
                paginatedExpenses.map((transaction) => (
                  <div key={transaction.recurrence_id} className="flex items-center justify-between p-2 rounded-md bg-muted/30">
                    <div className="flex-1 overflow-hidden mr-2">
                      <p className="text-sm font-medium truncate" title={transaction.description}>
                        {transaction.description}
                      </p>
                      <p className="text-xs text-muted-foreground truncate" title={transaction.category}>
                        {transaction.category}
                      </p>
                    </div>
                    <span className="text-sm font-semibold text-destructive whitespace-nowrap">
                      {Math.abs(transaction.amount).toLocaleString("pt-BR", {
                        style: "currency",
                        currency: "BRL",
                      })}
                    </span>
                  </div>
                ))
              )}
            </div>
            {totalExpensePages > 1 && (
              <div className="flex items-center justify-end gap-2 mt-3">
                <span className="text-xs text-muted-foreground">
                  Página {expensePage} de {totalExpensePages}
                </span>
                <Button variant="outline" size="icon" className="h-7 w-7" onClick={handlePrevExpensePage} disabled={expensePage === 1}>
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  className="h-7 w-7"
                  onClick={handleNextExpensePage}
                  disabled={expensePage === totalExpensePages}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            )}
          </div>
        </div>

        <div className="pt-4 border-t">
          <div className="flex items-center justify-between">
            <h4 className="font-semibold">Balanço Mensal Fixo</h4>
            <span className={cn("text-lg font-bold", fixedBalance >= 0 ? "text-success" : "text-destructive")}>
              {fixedBalance.toLocaleString("pt-BR", {
                style: "currency",
                currency: "BRL",
              })}
            </span>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            {fixedBalance >= 0
              ? "Você terá este valor positivo mensalmente (com base nos lançamentos fixos)"
              : "Você terá este déficit mensalmente (com base nos lançamentos fixos)"}
          </p>
        </div>
      </CardContent>
    </Card>
  );
};
