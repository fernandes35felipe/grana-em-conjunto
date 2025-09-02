import { useState, useEffect } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { AddGroupDialog } from "@/components/dialogs/AddGroupDialog";
import { AddTransactionDialog } from "@/components/dialogs/AddTransactionDialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Users, Plus, Settings, Eye, TrendingUp, TrendingDown } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface Group {
  id: string;
  name: string;
  description: string | null;
  color: string;
  created_by: string;
  created_at: string;
  updated_at: string;
  members: Array<{
    user_id: string;
    joined_at: string;
    profiles?: {
      full_name: string | null;
    } | null;
  }>;
  totalExpenses: number;
  totalIncome: number;
  lastActivity: string | null;
}

const Groups = () => {
  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const { toast } = useToast();

  const fetchGroups = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      
      setCurrentUserId(user.id);

      // Buscar grupos onde o usuário é criador
      const { data: createdGroups, error: createdError } = await supabase
        .from('groups')
        .select('*')
        .eq('created_by', user.id);

      if (createdError) throw createdError;

      // Buscar grupos onde o usuário é membro
      const { data: memberGroups, error: memberError } = await supabase
        .from('group_members')
        .select(`
          groups (*)
        `)
        .eq('user_id', user.id);

      if (memberError) throw memberError;

      // Combinar grupos
      const allGroups = [
        ...(createdGroups || []),
        ...(memberGroups?.map(mg => mg.groups).filter(Boolean) || [])
      ];

      // Remover duplicatas
      const uniqueGroups = allGroups.filter((group, index, arr) => 
        arr.findIndex(g => g.id === group.id) === index
      );

      // Para cada grupo, buscar membros e transações
      const groupsWithStats = await Promise.all(
        uniqueGroups.map(async (group) => {
          // Buscar membros do grupo (simples, sem join)
          const { data: members, error: membersError } = await supabase
            .from('group_members')
            .select('user_id, joined_at')
            .eq('group_id', group.id);

          if (membersError) throw membersError;

          // Buscar perfis dos membros separadamente
          const membersWithProfiles = await Promise.all(
            (members || []).map(async (member) => {
              const { data: profile } = await supabase
                .from('profiles')
                .select('full_name')
                .eq('user_id', member.user_id)
                .maybeSingle();

              return {
                ...member,
                profiles: profile
              };
            })
          );

          // Buscar transações do grupo
          const { data: transactions, error: transError } = await supabase
            .from('transactions')
            .select('amount, type')
            .eq('group_id', group.id);

          if (transError) throw transError;

          const totalIncome = transactions
            ?.filter(t => t.type === 'income')
            .reduce((sum, t) => sum + Number(t.amount), 0) || 0;

          const totalExpenses = transactions
            ?.filter(t => t.type === 'expense')
            .reduce((sum, t) => sum + Number(t.amount), 0) || 0;

          // Buscar última atividade
          const { data: lastTransaction } = await supabase
            .from('transactions')
            .select('created_at')
            .eq('group_id', group.id)
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle();

          return {
            ...group,
            totalIncome,
            totalExpenses: -Math.abs(totalExpenses),
            lastActivity: lastTransaction?.created_at || group.created_at,
            members: membersWithProfiles
          };
        })
      );

      setGroups(groupsWithStats);
    } catch (error) {
      console.error('Erro ao buscar grupos:', error);
      toast({
        title: "Erro",
        description: "Erro ao carregar grupos. Tente novamente.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchGroups();
  }, []);

  const getColorClass = (color: string) => {
    const colorMap: Record<string, string> = {
      blue: "bg-blue-500",
      green: "bg-green-500",
      purple: "bg-purple-500",
      red: "bg-red-500",
      yellow: "bg-yellow-500",
      pink: "bg-pink-500",
      orange: "bg-orange-500",
      indigo: "bg-indigo-500"
    };
    return colorMap[color] || "bg-blue-500";
  };

  const isGroupAdmin = (group: Group, currentUserId: string) => {
    return group.created_by === currentUserId;
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="p-6 space-y-6">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-foreground">Grupos</h1>
              <p className="text-muted-foreground">
                Gerencie despesas compartilhadas com outras pessoas
              </p>
            </div>
          <AddGroupDialog onGroupCreated={fetchGroups} />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map((i) => (
              <Card key={i} className="animate-pulse">
                <CardContent className="p-6">
                  <div className="h-20 bg-muted rounded"></div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </DashboardLayout>
    );
  }
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
          <AddGroupDialog onGroupCreated={fetchGroups} />
        </div>

        {/* Groups Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {groups.map((group) => {
            const isAdmin = currentUserId ? isGroupAdmin(group, currentUserId) : false;
            
            return (
              <Card key={group.id} className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`w-12 h-12 rounded-full ${getColorClass(group.color)} flex items-center justify-center`}>
                        <Users className="h-6 w-6 text-white" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <CardTitle className="text-lg">{group.name}</CardTitle>
                          {isAdmin && (
                            <Badge variant="outline" className="text-xs">Admin</Badge>
                          )}
                        </div>
                        <CardDescription className="text-sm">
                          {group.description || "Sem descrição"}
                        </CardDescription>
                      </div>
                    </div>
                    {isAdmin && (
                      <Button variant="ghost" size="sm">
                        <Settings className="h-4 w-4" />
                      </Button>
                    )}
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
                              {member.profiles?.full_name 
                                ? member.profiles.full_name.slice(0, 2).toUpperCase()
                                : "??"}
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
                        {group.members.length} membro{group.members.length !== 1 ? 's' : ''}
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
                        {Math.abs(group.totalExpenses).toLocaleString('pt-BR', {
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
                    <span>{new Date(group.lastActivity || group.created_at).toLocaleDateString('pt-BR')}</span>
                  </div>

                  {/* Actions */}
                  <div className="flex gap-2 pt-2">
                    <Button variant="outline" size="sm" className="flex-1">
                      <Eye className="h-4 w-4 mr-2" />
                      Ver Detalhes
                    </Button>
                    <AddTransactionDialog 
                      type="expense" 
                      trigger={
                        <Button size="sm" className="flex-1">
                          <Plus className="h-4 w-4 mr-2" />
                          Novo Lançamento
                        </Button>
                      } 
                    />
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Empty State */}
        {groups.length === 0 && (
          <Card className="py-12">
            <CardContent className="text-center">
              <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">Nenhum grupo criado</h3>
              <p className="text-muted-foreground mb-4">
                Crie seu primeiro grupo para começar a compartilhar despesas
              </p>
              <AddGroupDialog 
                onGroupCreated={fetchGroups}
                trigger={
                  <Button>
                    <Plus className="h-4 w-4 mr-2" />
                    Criar Primeiro Grupo
                  </Button>
                } 
              />
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
                  <p className="text-2xl font-bold">{groups.length}</p>
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
                    R$ {Math.abs(groups.reduce((sum, group) => sum + group.totalExpenses, 0))
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
                    R$ {groups.reduce((sum, group) => sum + group.totalIncome, 0)
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