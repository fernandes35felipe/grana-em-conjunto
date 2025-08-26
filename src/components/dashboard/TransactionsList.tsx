import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowUpCircle, ArrowDownCircle, Calendar } from "lucide-react";
import { cn } from "@/lib/utils";

interface Transaction {
  id: string;
  description: string;
  amount: number;
  type: "income" | "expense";
  category: string;
  date: string;
  group?: string;
}

// Dados mockados para demonstração
const mockTransactions: Transaction[] = [
  {
    id: "1",
    description: "Salário mensal",
    amount: 8500.00,
    type: "income",
    category: "Salário",
    date: "2024-01-15"
  },
  {
    id: "2",
    description: "Supermercado",
    amount: -450.00,
    type: "expense",
    category: "Alimentação",
    date: "2024-01-14",
    group: "Família"
  },
  {
    id: "3",
    description: "Investimento CDB",
    amount: -2000.00,
    type: "expense",
    category: "Investimentos",
    date: "2024-01-13"
  },
  {
    id: "4",
    description: "Freelance",
    amount: 1200.00,
    type: "income",
    category: "Renda Extra",
    date: "2024-01-12"
  }
];

export const TransactionsList = () => {
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
          {mockTransactions.map((transaction) => (
            <div
              key={transaction.id}
              className="flex items-center justify-between p-3 rounded-lg border border-border hover:bg-muted/50 transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className={cn(
                  "p-2 rounded-full",
                  transaction.type === "income" 
                    ? "bg-success/10 text-success" 
                    : "bg-destructive/10 text-destructive"
                )}>
                  {transaction.type === "income" ? (
                    <ArrowUpCircle className="h-4 w-4" />
                  ) : (
                    <ArrowDownCircle className="h-4 w-4" />
                  )}
                </div>
                <div>
                  <p className="font-medium">{transaction.description}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <Badge variant="secondary" className="text-xs">
                      {transaction.category}
                    </Badge>
                    {transaction.group && (
                      <Badge variant="outline" className="text-xs">
                        Grupo: {transaction.group}
                      </Badge>
                    )}
                  </div>
                </div>
              </div>
              <div className="text-right">
                <p className={cn(
                  "font-semibold",
                  transaction.type === "income" ? "text-success" : "text-destructive"
                )}>
                  {transaction.type === "income" ? "+" : ""}
                  {transaction.amount.toLocaleString('pt-BR', {
                    style: 'currency',
                    currency: 'BRL'
                  })}
                </p>
                <p className="text-xs text-muted-foreground">
                  {new Date(transaction.date).toLocaleDateString('pt-BR')}
                </p>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};