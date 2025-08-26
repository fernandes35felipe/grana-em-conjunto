import { useState } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { ArrowUpCircle, ArrowDownCircle, Search, Filter, Plus } from "lucide-react";
import { cn } from "@/lib/utils";

// Dados mockados expandidos
const mockTransactions = [
  {
    id: "1",
    description: "Salário mensal",
    amount: 8500.00,
    type: "income" as const,
    category: "Salário",
    date: "2024-01-15",
    group: null
  },
  {
    id: "2",
    description: "Supermercado Pão de Açúcar",
    amount: -450.00,
    type: "expense" as const,
    category: "Alimentação",
    date: "2024-01-14",
    group: "Família"
  },
  {
    id: "3",
    description: "Investimento CDB",
    amount: -2000.00,
    type: "expense" as const,
    category: "Investimentos",
    date: "2024-01-13",
    group: null
  },
  {
    id: "4",
    description: "Freelance Design",
    amount: 1200.00,
    type: "income" as const,
    category: "Renda Extra",
    date: "2024-01-12",
    group: null
  },
  {
    id: "5",
    description: "Conta de luz",
    amount: -280.50,
    type: "expense" as const,
    category: "Utilidades",
    date: "2024-01-11",
    group: "Casa"
  },
  {
    id: "6",
    description: "Dividendos ITUB4",
    amount: 125.80,
    type: "income" as const,
    category: "Dividendos",
    date: "2024-01-10",
    group: null
  }
];

const Transactions = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState("all");
  const [filterCategory, setFilterCategory] = useState("all");

  const filteredTransactions = mockTransactions.filter(transaction => {
    const matchesSearch = transaction.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = filterType === "all" || transaction.type === filterType;
    const matchesCategory = filterCategory === "all" || transaction.category === filterCategory;
    
    return matchesSearch && matchesType && matchesCategory;
  });

  const categories = Array.from(new Set(mockTransactions.map(t => t.category)));

  return (
    <DashboardLayout>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Transações</h1>
            <p className="text-muted-foreground">
              Gerencie todas as suas entradas e saídas
            </p>
          </div>
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            Nova Transação
          </Button>
        </div>

        {/* Filters */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Filter className="h-5 w-5" />
              Filtros
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                <Input
                  placeholder="Buscar transações..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              
              <Select value={filterType} onValueChange={setFilterType}>
                <SelectTrigger>
                  <SelectValue placeholder="Tipo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os tipos</SelectItem>
                  <SelectItem value="income">Receitas</SelectItem>
                  <SelectItem value="expense">Despesas</SelectItem>
                </SelectContent>
              </Select>

              <Select value={filterCategory} onValueChange={setFilterCategory}>
                <SelectTrigger>
                  <SelectValue placeholder="Categoria" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas as categorias</SelectItem>
                  {categories.map(category => (
                    <SelectItem key={category} value={category}>
                      {category}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Button variant="outline">
                Limpar Filtros
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Total de Receitas</p>
                  <p className="text-2xl font-bold text-success">
                    R$ {filteredTransactions
                      .filter(t => t.type === "income")
                      .reduce((sum, t) => sum + t.amount, 0)
                      .toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </p>
                </div>
                <ArrowUpCircle className="h-8 w-8 text-success" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Total de Despesas</p>
                  <p className="text-2xl font-bold text-destructive">
                    R$ {Math.abs(filteredTransactions
                      .filter(t => t.type === "expense")
                      .reduce((sum, t) => sum + t.amount, 0))
                      .toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </p>
                </div>
                <ArrowDownCircle className="h-8 w-8 text-destructive" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Saldo Líquido</p>
                  <p className={cn(
                    "text-2xl font-bold",
                    filteredTransactions.reduce((sum, t) => sum + t.amount, 0) >= 0 
                      ? "text-success" 
                      : "text-destructive"
                  )}>
                    R$ {filteredTransactions
                      .reduce((sum, t) => sum + t.amount, 0)
                      .toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Transactions List */}
        <Card>
          <CardHeader>
            <CardTitle>
              Transações ({filteredTransactions.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {filteredTransactions.map((transaction) => (
                <div
                  key={transaction.id}
                  className="flex items-center justify-between p-4 rounded-lg border border-border hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-center gap-4">
                    <div className={cn(
                      "p-3 rounded-full",
                      transaction.type === "income" 
                        ? "bg-success/10 text-success" 
                        : "bg-destructive/10 text-destructive"
                    )}>
                      {transaction.type === "income" ? (
                        <ArrowUpCircle className="h-5 w-5" />
                      ) : (
                        <ArrowDownCircle className="h-5 w-5" />
                      )}
                    </div>
                    <div>
                      <p className="font-medium text-foreground">{transaction.description}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge variant="secondary" className="text-xs">
                          {transaction.category}
                        </Badge>
                        {transaction.group && (
                          <Badge variant="outline" className="text-xs">
                            Grupo: {transaction.group}
                          </Badge>
                        )}
                        <span className="text-xs text-muted-foreground">
                          {new Date(transaction.date).toLocaleDateString('pt-BR')}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className={cn(
                      "text-lg font-semibold",
                      transaction.type === "income" ? "text-success" : "text-destructive"
                    )}>
                      {transaction.type === "income" ? "+" : ""}
                      {transaction.amount.toLocaleString('pt-BR', {
                        style: 'currency',
                        currency: 'BRL'
                      })}
                    </p>
                  </div>
                </div>
              ))}
              
              {filteredTransactions.length === 0 && (
                <div className="text-center py-8">
                  <p className="text-muted-foreground">Nenhuma transação encontrada</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default Transactions;