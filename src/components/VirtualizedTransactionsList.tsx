import { useMemo } from "react";
import { FixedSizeList as List } from "react-window";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowUpCircle, ArrowDownCircle, Calendar, Trash2 } from "@/lib/icons";
import { cn } from "@/lib/utils";

import type { Transaction } from "./transactions/types";

interface VirtualizedTransactionsListProps {
  transactions: Transaction[];
  onDelete: (id: string) => void;
  height?: number;
  itemHeight?: number;
}

export const VirtualizedTransactionsList = ({
  transactions,
  onDelete,
  height = 600,
  itemHeight = 80,
}: VirtualizedTransactionsListProps) => {
  const sortedTransactions = useMemo(
    () => [...transactions].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()),
    [transactions]
  );

  const Row = ({ index, style }: { index: number; style: React.CSSProperties }) => {
    const transaction = sortedTransactions[index];

    return (
      <div style={style} className="px-4">
        <div className="flex items-center justify-between py-4 border-b">
          <div className="flex items-center gap-3 flex-1">
            <div className={cn("p-2 rounded-full", transaction.type === "income" ? "bg-success/10" : "bg-destructive/10")}>
              {transaction.type === "income" ? (
                <ArrowUpCircle className="h-4 w-4 text-success" />
              ) : (
                <ArrowDownCircle className="h-4 w-4 text-destructive" />
              )}
            </div>

            <div className="flex-1 min-w-0">
              <p className="font-medium truncate">{transaction.description}</p>
              <div className="flex items-center gap-2 mt-1">
                <Badge variant="secondary" className="text-xs">
                  {transaction.category}
                </Badge>
                <span className="text-xs text-muted-foreground flex items-center gap-1">
                  <Calendar className="h-3 w-3" />
                  {new Date(transaction.date).toLocaleDateString("pt-BR")}
                </span>
                {transaction.group_id && (
                  <Badge variant="outline" className="text-xs">
                    Grupo
                  </Badge>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <p
              className={cn("font-semibold text-lg whitespace-nowrap", transaction.type === "income" ? "text-success" : "text-destructive")}
            >
              {transaction.type === "income" ? "+" : "-"}
              {Math.abs(transaction.amount).toLocaleString("pt-BR", {
                style: "currency",
                currency: "BRL",
              })}
            </p>

            <Button
              variant="ghost"
              size="icon"
              onClick={() => onDelete(transaction.id)}
              className="text-destructive hover:text-destructive hover:bg-destructive/10"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    );
  };

  if (sortedTransactions.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <p>Nenhuma transação encontrada</p>
      </div>
    );
  }

  return (
    <List height={height} itemCount={sortedTransactions.length} itemSize={itemHeight} width="100%" className="scrollbar-thin">
      {Row}
    </List>
  );
};
