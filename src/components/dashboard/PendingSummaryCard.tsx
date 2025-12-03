import { ArrowUpCircle, ArrowDownCircle, Clock } from "@/lib/icons";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface PendingSummaryCardProps {
  pendingIncome: number;
  pendingExpense: number;
  isLoading?: boolean;
}

export const PendingSummaryCard = ({ pendingIncome, pendingExpense, isLoading }: PendingSummaryCardProps) => {
  if (isLoading) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
            <Clock className="h-4 w-4" /> Contas Pendentes
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-12 bg-muted rounded animate-pulse" />
        </CardContent>
      </Card>
    );
  }

  const netPending = pendingIncome - pendingExpense;

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
          <Clock className="h-4 w-4 text-orange-500" />
          Contas a Pagar / Receber
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex justify-between items-center mb-2">
          <div className="flex items-center gap-2">
            <ArrowUpCircle className="h-4 w-4 text-success opacity-70" />
            <span className="text-sm font-medium text-success">
              {pendingIncome.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <ArrowDownCircle className="h-4 w-4 text-destructive opacity-70" />
            <span className="text-sm font-medium text-destructive">
              {pendingExpense.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
            </span>
          </div>
        </div>
        <div className="pt-2 border-t mt-2 flex justify-between items-center">
          <span className="text-xs text-muted-foreground">Saldo Previsto</span>
          <span className={cn("font-bold text-sm", netPending >= 0 ? "text-success" : "text-destructive")}>
            {netPending > 0 ? "+" : ""}
            {netPending.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
          </span>
        </div>
      </CardContent>
    </Card>
  );
};
