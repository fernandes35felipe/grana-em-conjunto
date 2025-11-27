import { useState, useEffect } from "react";
import { Users, Plus, Settings, Eye, TrendingUp, TrendingDown, Mail, Check, X } from "@/lib/icons";

import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { AddGroupDialog } from "@/components/dialogs/AddGroupDialog";
import { EditGroupDialog } from "@/components/dialogs/EditGroupDialog";
import { AddTransactionDialog } from "@/components/dialogs/AddTransactionDialog";
import { GroupDetailsModal } from "@/components/groups/GroupDetailsModal";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
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

interface Invite {
  id: string;
  group_id: string;
  status: string;
  groups: {
    name: string;
    description: string;
  };
}

const Groups = () => {
  const [groups, setGroups] = useState<Group[]>([]);
  const [invites, setInvites] = useState<Invite[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [selectedGroup, setSelectedGroup] = useState<{ id: string; name: string } | null>(null);
  const [editGroupId, setEditGroupId] = useState<string | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const { toast } = useToast();

  const fetchGroups = async () => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) return;

      setCurrentUserId(user.id);

      const { data: createdGroups, error: createdError } = await supabase.from("groups").select("*").eq("created_by", user.id);

      if (createdError) throw createdError;

      const { data: memberGroups, error: memberError } = await supabase
        .from("group_members")
        .select(
          `
          groups (*)
        `
        )
        .eq("user_id", user.id);

      if (memberError) throw memberError;

      const allGroups = [...(createdGroups || []), ...(memberGroups?.map((mg) => mg.groups).filter(Boolean) || [])];
      const uniqueGroups = allGroups.filter((group, index, arr) => arr.findIndex((g) => g.id === group.id) === index);

      const groupsWithStats = await Promise.all(
        uniqueGroups.map(async (group) => {
          const { data: members, error: membersError } = await supabase
            .from("group_members")
            .select("user_id, joined_at")
            .eq("group_id", group.id);

          if (membersError) throw membersError;

          const membersWithProfiles = await Promise.all(
            (members || []).map(async (member) => {
              const { data: profile } = await supabase.from("profiles").select("full_name").eq("user_id", member.user_id).maybeSingle();

              return {
                ...member,
                profiles: profile,
              };
            })
          );

          const { data: transactions, error: transError } = await supabase
            .from("transactions")
            .select("amount, type")
            .eq("group_id", group.id);

          if (transError) throw transError;

          const totalIncome = transactions?.filter((t) => t.type === "income").reduce((sum, t) => sum + Number(t.amount), 0) || 0;
          const totalExpenses = transactions?.filter((t) => t.type === "expense").reduce((sum, t) => sum + Number(t.amount), 0) || 0;

          const { data: lastTransaction } = await supabase
            .from("transactions")
            .select("created_at")
            .eq("group_id", group.id)
            .order("created_at", { ascending: false })
            .limit(1)
            .maybeSingle();

          return {
            ...group,
            totalIncome,
            totalExpenses: -Math.abs(totalExpenses),
            lastActivity: lastTransaction?.created_at || group.created_at,
            members: membersWithProfiles,
          };
        })
      );

      setGroups(groupsWithStats);
    } catch (error) {
      console.error("Erro ao buscar grupos:", error);
      toast({
        title: "Erro",
        description: "Erro ao carregar grupos. Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchInvites = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user || !user.email) return;

    const { data } = await supabase
      .from("group_invites")
      .select(`
        id, 
        group_id, 
        status,
        groups (name, description)
      `)
      .eq("email", user.email)
      .eq("status", "pending");
    
    setInvites(data as any || []);
  };

  useEffect(() => {
    fetchGroups();
    fetchInvites();
  }, []);

  const handleRespondInvite = async (invite: Invite, accept: boolean) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      if (accept) {
        // 1. Adiciona como membro
        const { error: memberError } = await supabase.from("group_members").insert({
          group_id: invite.group_id,
          user_id: user.id,
          is_admin: false
        });
        if (memberError) throw memberError;

        // 2. Atualiza convite
        await supabase.from("group_invites").update({ status: "accepted" }).eq("id", invite.id);
        
        toast({ title: "Sucesso", description: `Você entrou no grupo ${invite.groups.name}` });
      } else {
        // Rejeita
        await supabase.from("group_invites").update({ status: "rejected" }).eq("id", invite.id);
        toast({ title: "Convite rejeitado" });
      }

      fetchInvites();
      fetchGroups();
    } catch (error) {
      console.error(error);
      toast({ title: "Erro", description: "Erro ao processar convite", variant: "destructive" });
    }
  };

  const handleEditGroup = (groupId: string) => {
    setEditGroupId(groupId);
    setEditDialogOpen(true);
  };

  const handleEditClose = () => {
    setEditDialogOpen(false);
    setEditGroupId(null);
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="p-6 space-y-6">
          <div className="animate-pulse space-y-4">
            <div className="h-8 bg-muted rounded w-1/4"></div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-48 bg-muted rounded"></div>
              ))}
            </div>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="h-full overflow-y-auto">
        <div className="container max-w-7xl mx-auto p-4 md:p-6 space-y-4 md:space-y-6">
          <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4">
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-foreground">Grupos</h1>
              <p className="text-sm md:text-base text-muted-foreground">Gerencie e compartilhe despesas com seus grupos</p>
            </div>
            <AddGroupDialog onGroupCreated={fetchGroups} />
          </div>

          {/* SEÇÃO DE CONVITES */}
          {invites.length > 0 && (
            <Card className="border-l-4 border-l-primary bg-primary/5">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Mail className="h-5 w-5" /> Convites Pendentes
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {invites.map(invite => (
                    <div key={invite.id} className="flex items-center justify-between bg-background p-3 rounded border">
                      <div>
                        <p className="font-bold">Grupo: {invite.groups.name}</p>
                        <p className="text-xs text-muted-foreground">{invite.groups.description}</p>
                      </div>
                      <div className="flex gap-2">
                        <Button size="sm" variant="outline" className="text-destructive hover:bg-destructive/10" onClick={() => handleRespondInvite(invite, false)}>
                          <X className="h-4 w-4 mr-1" /> Recusar
                        </Button>
                        <Button size="sm" className="bg-success hover:bg-success/90" onClick={() => handleRespondInvite(invite, true)}>
                          <Check className="h-4 w-4 mr-1" /> Aceitar
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
            {groups.map((group) => {
              const balance = group.totalIncome + group.totalExpenses;

              return (
                <Card key={group.id} className="hover:shadow-lg transition-shadow">
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div
                          className="w-12 h-12 rounded-full flex items-center justify-center"
                          style={{ backgroundColor: group.color || "#3b82f6" }}
                        >
                          <Users className="h-6 w-6 text-white" />
                        </div>
                        <div>
                          <CardTitle className="text-lg">{group.name}</CardTitle>
                          {group.description && <CardDescription className="text-xs mt-1">{group.description}</CardDescription>}
                        </div>
                      </div>
                      <Button variant="ghost" size="icon" onClick={() => handleEditGroup(group.id)}>
                        <Settings className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Membros</span>
                      <div className="flex -space-x-2">
                        {group.members.slice(0, 3).map((member, idx) => (
                          <Avatar key={idx} className="h-8 w-8 border-2 border-background">
                            <AvatarFallback className="text-xs">
                              {(member.profiles?.full_name || "U").charAt(0).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                        ))}
                        {group.members.length > 3 && (
                          <div className="h-8 w-8 rounded-full bg-muted border-2 border-background flex items-center justify-center">
                            <span className="text-xs font-medium">+{group.members.length - 3}</span>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground flex items-center gap-1">
                          <TrendingUp className="h-4 w-4 text-success" />
                          Receitas
                        </span>
                        <span className="font-medium text-success">
                          {group.totalIncome.toLocaleString("pt-BR", {
                            style: "currency",
                            currency: "BRL",
                          })}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground flex items-center gap-1">
                          <TrendingDown className="h-4 w-4 text-destructive" />
                          Despesas
                        </span>
                        <span className="font-medium text-destructive">
                          {group.totalExpenses.toLocaleString("pt-BR", {
                            style: "currency",
                            currency: "BRL",
                          })}
                        </span>
                      </div>
                      <div className="flex items-center justify-between pt-2 border-t">
                        <span className="text-sm font-medium">Saldo</span>
                        <span className={`font-bold ${balance >= 0 ? "text-success" : "text-destructive"}`}>
                          {balance.toLocaleString("pt-BR", {
                            style: "currency",
                            currency: "BRL",
                          })}
                        </span>
                      </div>
                    </div>

                    <div className="flex gap-2">
                      <Button variant="outline" className="flex-1" onClick={() => setSelectedGroup({ id: group.id, name: group.name })}>
                        <Eye className="h-4 w-4 mr-2" />
                        Detalhes
                      </Button>
                      {/* Botão de despesa rápida no card, usando o novo dialog adaptado */}
                      <AddTransactionDialog
                        type="expense"
                        defaultGroupId={group.id}
                        onSuccess={fetchGroups} // Recarrega lista ao salvar
                        trigger={
                          <Button variant="outline" className="flex-1">
                            <Plus className="h-4 w-4 mr-2" />
                            Despesa
                          </Button>
                        }
                      />
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {groups.length === 0 && (
            <Card className="py-12">
              <CardContent className="text-center">
                <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">Nenhum grupo criado</h3>
                <p className="text-muted-foreground mb-4">Crie seu primeiro grupo para começar a compartilhar despesas</p>
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

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">
            <Card>
              <CardContent className="p-4 md:p-6">
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
              <CardContent className="p-4 md:p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Total de Membros</p>
                    <p className="text-2xl font-bold">{groups.reduce((sum, g) => sum + g.members.length, 0)}</p>
                  </div>
                  <Users className="h-8 w-8 text-muted-foreground" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4 md:p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Saldo Total</p>
                    <p className="text-2xl font-bold">
                      {groups
                        .reduce((sum, g) => sum + g.totalIncome + g.totalExpenses, 0)
                        .toLocaleString("pt-BR", {
                          style: "currency",
                          currency: "BRL",
                        })}
                    </p>
                  </div>
                  <TrendingUp className="h-8 w-8 text-muted-foreground" />
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      <GroupDetailsModal
        isOpen={!!selectedGroup}
        onClose={() => setSelectedGroup(null)}
        groupId={selectedGroup?.id || ""}
        groupName={selectedGroup?.name || ""}
      />

      <EditGroupDialog groupId={editGroupId} isOpen={editDialogOpen} onClose={handleEditClose} onSuccess={fetchGroups} />
    </DashboardLayout>
  );
};

export default Groups;