import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Users, Plus, Settings, Eye, TrendingUp, TrendingDown } from "lucide-react";

// Dados mockados para grupos
const mockGroups = [
  {
    id: "1",
    name: "Família",
    description: "Despesas compartilhadas da família",
    members: ["João", "Maria", "Ana"],
    totalExpenses: -2450.80,
    totalIncome: 0,
    lastActivity: "2024-01-14",
    color: "bg-blue-500"
  },
  {
    id: "2", 
    name: "Casa",
    description: "Contas e manutenção da casa",
    members: ["João", "Maria"],
    totalExpenses: -1280.50,
    totalIncome: 0,
    lastActivity: "2024-01-11",
    color: "bg-green-500"
  },
  {
    id: "3",
    name: "Viagem Europa",
    description: "Planejamento da viagem para Europa",
    members: ["João", "Pedro", "Carlos", "Ana"],
    totalExpenses: -5200.00,
    totalIncome: 8000.00,
    lastActivity: "2024-01-10",
    color: "bg-purple-500"
  }
];

const Groups = () => {
  return (
    <DashboardLayout>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Grupos</h1>
            <p className="text-muted-foreground">
              Gerencie despesas compartilhadas com outras pessoas
            </p>
          </div>
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            Criar Grupo
          </Button>
        </div>

        {/* Groups Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {mockGroups.map((group) => (
            <Card key={group.id} className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`w-12 h-12 rounded-full ${group.color} flex items-center justify-center`}>
                      <Users className="h-6 w-6 text-white" />
                    </div>
                    <div>
                      <CardTitle className="text-lg">{group.name}</CardTitle>
                      <CardDescription className="text-sm">
                        {group.description}
                      </CardDescription>
                    </div>
                  </div>
                  <Button variant="ghost" size="sm">
                    <Settings className="h-4 w-4" />
                  </Button>
                </div>
              </CardHeader>
              
              <CardContent className="space-y-4">
                {/* Members */}
                <div>
                  <p className="text-sm font-medium text-muted-foreground mb-2">Membros</p>
                  <div className="flex items-center gap-2">
                    <div className="flex -space-x-2">
                      {group.members.slice(0, 3).map((member, index) => (
                        <Avatar key={index} className="w-8 h-8 border-2 border-background">
                          <AvatarFallback className="text-xs">
                            {member.slice(0, 2).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                      ))}
                      {group.members.length > 3 && (
                        <div className="w-8 h-8 rounded-full bg-muted border-2 border-background flex items-center justify-center">
                          <span className="text-xs text-muted-foreground">
                            +{group.members.length - 3}
                          </span>
                        </div>
                      )}
                    </div>
                    <Badge variant="secondary" className="text-xs">
                      {group.members.length} membros
                    </Badge>
                  </div>
                </div>

                {/* Financial Summary */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <TrendingUp className="h-4 w-4 text-success" />
                      <span className="text-sm text-muted-foreground">Receitas</span>
                    </div>
                    <span className="font-medium text-success">
                      {group.totalIncome.toLocaleString('pt-BR', {
                        style: 'currency',
                        currency: 'BRL'
                      })}
                    </span>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <TrendingDown className="h-4 w-4 text-destructive" />
                      <span className="text-sm text-muted-foreground">Despesas</span>
                    </div>
                    <span className="font-medium text-destructive">
                      {group.totalExpenses.toLocaleString('pt-BR', {
                        style: 'currency',
                        currency: 'BRL'
                      })}
                    </span>
                  </div>

                  <div className="border-t pt-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">Saldo do Grupo</span>
                      <span className={`font-semibold ${
                        (group.totalIncome + group.totalExpenses) >= 0 
                          ? "text-success" 
                          : "text-destructive"
                      }`}>
                        {(group.totalIncome + group.totalExpenses).toLocaleString('pt-BR', {
                          style: 'currency',
                          currency: 'BRL'
                        })}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Last Activity */}
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>Última atividade:</span>
                  <span>{new Date(group.lastActivity).toLocaleDateString('pt-BR')}</span>
                </div>

                {/* Actions */}
                <div className="flex gap-2 pt-2">
                  <Button variant="outline" size="sm" className="flex-1">
                    <Eye className="h-4 w-4 mr-2" />
                    Ver Detalhes
                  </Button>
                  <Button size="sm" className="flex-1">
                    <Plus className="h-4 w-4 mr-2" />
                    Novo Lançamento
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Empty State */}
        {mockGroups.length === 0 && (
          <Card className="py-12">
            <CardContent className="text-center">
              <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">Nenhum grupo criado</h3>
              <p className="text-muted-foreground mb-4">
                Crie seu primeiro grupo para começar a compartilhar despesas
              </p>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Criar Primeiro Grupo
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Total de Grupos</p>
                  <p className="text-2xl font-bold">{mockGroups.length}</p>
                </div>
                <Users className="h-8 w-8 text-muted-foreground" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Despesas em Grupos</p>
                  <p className="text-2xl font-bold text-destructive">
                    R$ {Math.abs(mockGroups.reduce((sum, group) => sum + group.totalExpenses, 0))
                      .toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </p>
                </div>
                <TrendingDown className="h-8 w-8 text-destructive" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Receitas em Grupos</p>
                  <p className="text-2xl font-bold text-success">
                    R$ {mockGroups.reduce((sum, group) => sum + group.totalIncome, 0)
                      .toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </p>
                </div>
                <TrendingUp className="h-8 w-8 text-success" />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default Groups;