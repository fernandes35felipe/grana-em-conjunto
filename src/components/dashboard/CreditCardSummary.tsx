import { useEffect, useState } from "react";
import { CreditCard, AlertCircle, Calendar, CheckCircle2 } from "@/lib/icons";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { format, parseISO } from "@/lib/date";
import { useToast } from "@/hooks/use-toast";
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

export const CreditCardSummary = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [nextInvoiceAmount, setNextInvoiceAmount] = useState(0);
  const [nextDueDate, setNextDueDate] = useState<Date | null>(null);
  const [daysToClose, setDaysToClose] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [isPaying, setIsPaying] = useState(false);

  useEffect(() => {
    if (user) {
      loadCreditCardData();
    }

    // Inscreve-se para atualizações automáticas
    const channel = supabase
      .channel("credit-card-summary")
      .on("postgres_changes", { event: "*", schema: "public", table: "transactions" }, () => loadCreditCardData())
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  const loadCreditCardData = async () => {
    try {
      const today = new Date();

      // Busca transações de cartão marcadas como pendentes e com data de vencimento futura ou igual a hoje
      // Assume-se que 'card_closing_date' é a data de vencimento da fatura
      const { data, error } = await supabase
        .from("transactions")
        .select("amount, card_closing_date")
        .eq("user_id", user?.id)
        .eq("is_credit_card", true)
        .eq("is_pending", true) // Somente pendentes
        .gte("card_closing_date", format(today, "yyyy-MM-dd"))
        .order("card_closing_date", { ascending: true });

      if (error) throw error;

      if (data && data.length > 0) {
        // Pega a data da fatura mais próxima
        const nextDateStr = data[0].card_closing_date;
        if (!nextDateStr) return;

        const nextDate = parseISO(nextDateStr);
        setNextDueDate(nextDate);

        // Soma valores para esta data específica
        const amount = data
          .filter((t) => t.card_closing_date === nextDateStr)
          .reduce((acc, curr) => acc + Math.abs(Number(curr.amount)), 0);

        setNextInvoiceAmount(amount);

        // Calcula dias para fechamento (alerta visual 5 dias antes)
        const diffTime = nextDate.getTime() - today.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        setDaysToClose(diffDays);
      } else {
        setNextInvoiceAmount(0);
        setNextDueDate(null);
      }
    } catch (error) {
      console.error("Erro ao carregar dados do cartão:", error);
    } finally {
      setLoading(false);
    }
  };

  const handlePayInvoice = async () => {
    if (!nextDueDate || !user) return;
    setIsPaying(true);

    try {
      const dateStr = format(nextDueDate, "yyyy-MM-dd");

      // Atualiza todas as transações desta fatura
      const { error } = await supabase
        .from("transactions")
        .update({
          is_pending: false,
          paid_at: new Date().toISOString(),
          pending_type: null,
        })
        .eq("user_id", user.id)
        .eq("is_credit_card", true)
        .eq("is_pending", true)
        .eq("card_closing_date", dateStr);

      if (error) throw error;

      toast({
        title: "Fatura Paga!",
        description: `A fatura de ${nextDueDate.toLocaleDateString("pt-BR")} foi marcada como paga.`,
      });

      // Dados recarregarão via realtime subscription
    } catch (error) {
      console.error("Erro ao pagar fatura:", error);
      toast({
        title: "Erro",
        description: "Não foi possível atualizar a fatura.",
        variant: "destructive",
      });
    } finally {
      setIsPaying(false);
      setIsConfirmOpen(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
            <CreditCard className="h-4 w-4" /> Fatura do Cartão
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-12 bg-muted rounded animate-pulse" />
        </CardContent>
      </Card>
    );
  }

  if (!nextDueDate) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
            <CreditCard className="h-4 w-4" /> Fatura do Cartão
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">Sem faturas pendentes</p>
        </CardContent>
      </Card>
    );
  }

  const isClosingSoon = daysToClose !== null && daysToClose <= 5 && daysToClose >= 0;

  return (
    <>
      <Card className={isClosingSoon ? "border-orange-300 bg-orange-50/30 dark:bg-orange-950/10" : ""}>
        <CardHeader className="pb-2">
          <div className="flex justify-between items-start">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <CreditCard className="h-4 w-4 text-primary" />
              Próxima Fatura
            </CardTitle>
            {isClosingSoon && (
              <div className="flex items-center text-xs font-medium text-orange-600 bg-orange-100 px-2 py-0.5 rounded-full border border-orange-200">
                <AlertCircle className="h-3 w-3 mr-1" />
                Vence em {daysToClose} dias
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent className="pb-2">
          <div className="flex flex-col gap-1">
            <span className="text-2xl font-bold text-destructive">
              {nextInvoiceAmount.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
            </span>
            <span className="text-xs text-muted-foreground flex items-center gap-1">
              <Calendar className="h-3 w-3" />
              Vencimento: {nextDueDate.toLocaleDateString("pt-BR")}
            </span>
          </div>
        </CardContent>
        <CardFooter className="pt-0">
          <Button
            variant="outline"
            size="sm"
            className="w-full text-xs h-8 mt-2 border-primary/20 hover:bg-primary/5 hover:text-primary"
            onClick={() => setIsConfirmOpen(true)}
          >
            <CheckCircle2 className="h-3 w-3 mr-2" />
            Marcar Fatura como Paga
          </Button>
        </CardFooter>
      </Card>

      <AlertDialog open={isConfirmOpen} onOpenChange={setIsConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar Pagamento da Fatura</AlertDialogTitle>
            <AlertDialogDescription>
              Deseja marcar todas as transações desta fatura ({nextDueDate.toLocaleDateString("pt-BR")}) como pagas?
              <br />
              <br />
              Valor Total: <strong>{nextInvoiceAmount.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}</strong>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isPaying}>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handlePayInvoice} disabled={isPaying} className="bg-success hover:bg-success/90">
              {isPaying ? "Processando..." : "Confirmar Pagamento"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};
