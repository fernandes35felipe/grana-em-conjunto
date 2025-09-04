import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { TrendingUp, TrendingDown, Calendar, DollarSign } from "lucide-react";
import { cn } from "@/lib/utils";

interface Investment {
  id: string;
  name: string;
  type: string;
  amount: number;
  current_value: number;
  maturity_date?: string;
  created_at: string;
}

interface InvestmentDetailsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  type: string;
  investments: Investment[];
}

export const InvestmentDetailsModal = ({ 
  open, 
  onOpenChange, 
  type, 
  investments 
}: InvestmentDetailsModalProps) => {
  const totalInvested = investments.reduce((sum, inv) => sum + inv.amount, 0);
  const totalCurrent = investments.reduce((sum, inv) => sum + inv.current_value, 0);
  const totalReturn = totalInvested > 0 ? ((totalCurrent - totalInvested) / totalInvested) * 100 : 0;
  const averageReturn = investments.length > 0 ? totalReturn / investments.length : 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-primary" />
            Investimentos em {type}
          </DialogTitle>
          <DialogDescription>
            Detalhamento de todos os seus investimentos do tipo {type}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Total Investido</p>
                    <p className="text-xl font-bold">
                      {totalInvested.toLocaleString('pt-BR', {
                        style: 'currency',
                        currency: 'BRL'
                      })}
                    </p>
                  </div>
                  <DollarSign className="h-6 w-6 text-muted-foreground" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Valor Atual</p>
                    <p className="text-xl font-bold text-primary">
                      {totalCurrent.toLocaleString('pt-BR', {
                        style: 'currency',
                        currency: 'BRL'
                      })}
                    </p>
                  </div>
                  <TrendingUp className="h-6 w-6 text-primary" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Rentabilidade</p>
                    <p className={cn(
                      "text-xl font-bold",
                      totalReturn >= 0 ? "text-success" : "text-destructive"
                    )}>
                      {totalReturn >= 0 ? "+" : ""}{totalReturn.toFixed(2)}%
                    </p>
                  </div>
                  {totalReturn >= 0 ? (
                    <TrendingUp className="h-6 w-6 text-success" />
                  ) : (
                    <TrendingDown className="h-6 w-6 text-destructive" />
                  )}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Quantidade</p>
                    <p className="text-xl font-bold">
                      {investments.length}
                    </p>
                  </div>
                  <Badge variant="secondary" className="text-lg">
                    {investments.length}
                  </Badge>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Investments List */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Detalhamento dos Investimentos</h3>
            {investments.map((investment) => {
              const investmentReturn = investment.amount > 0 
                ? ((investment.current_value - investment.amount) / investment.amount) * 100 
                : 0;
              
              return (
                <Card key={investment.id}>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="p-3 bg-primary/10 rounded-full">
                          <TrendingUp className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                          <p className="font-medium text-foreground">{investment.name}</p>
                          <div className="flex items-center gap-2 mt-1">
                            <Badge variant="secondary" className="text-xs">
                              {investment.type}
                            </Badge>
                            {investment.maturity_date && (
                              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                <Calendar className="h-3 w-3" />
                                Venc: {new Date(investment.maturity_date).toLocaleDateString('pt-BR')}
                              </div>
                            )}
                            <div className="flex items-center gap-1 text-xs text-muted-foreground">
                              <Calendar className="h-3 w-3" />
                              Criado: {new Date(investment.created_at).toLocaleDateString('pt-BR')}
                            </div>
                          </div>
                        </div>
                      </div>
                      
                      <div className="text-right">
                        <div className="flex items-center gap-6">
                          <div>
                            <p className="text-sm text-muted-foreground">Investido</p>
                            <p className="font-medium">
                              {investment.amount.toLocaleString('pt-BR', {
                                style: 'currency',
                                currency: 'BRL'
                              })}
                            </p>
                          </div>
                          <div>
                            <p className="text-sm text-muted-foreground">Atual</p>
                            <p className="font-medium">
                              {investment.current_value.toLocaleString('pt-BR', {
                                style: 'currency',
                                currency: 'BRL'
                              })}
                            </p>
                          </div>
                          <div>
                            <p className="text-sm text-muted-foreground">Retorno</p>
                            <p className={cn(
                              "font-semibold",
                              investmentReturn >= 0 ? "text-success" : "text-destructive"
                            )}>
                              {investmentReturn >= 0 ? "+" : ""}{investmentReturn.toFixed(2)}%
                            </p>
                          </div>
                          <div>
                            <p className="text-sm text-muted-foreground">Lucro/Prejuízo</p>
                            <p className={cn(
                              "font-semibold",
                              investmentReturn >= 0 ? "text-success" : "text-destructive"
                            )}>
                              {(investment.current_value - investment.amount).toLocaleString('pt-BR', {
                                style: 'currency',
                                currency: 'BRL'
                              })}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {investments.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              <TrendingUp className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Nenhum investimento do tipo {type} encontrado.</p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};