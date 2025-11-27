import React, { useState, useEffect } from "react";
import { Users, Wallet, TrendingDown, TrendingUp, Clock, CheckCircle, XCircle, AlertCircle } from "lucide-react";

import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { AddGroupDialog } from "@/components/dialogs/AddGroupDialog";
import { EditGroupDialog } from "@/components/dialogs/EditGroupDialog";
import { GroupDetailsModal } from "@/components/groups/GroupDetailsModal";

interface Group {
  id: string;
  name: string;
  description: string;
  color: string;
  created_by: string;
  memberCount: number;
  members: Array<{
    user_id: string;
    joined_at: string;
    profiles: {
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
    created_by: string;
  } | null;
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

  // --- REALTIME: ATUALIZAÇÃO AUTOMÁTICA ---
  useEffect(() => {
    // Escuta mudanças em transações, grupos e membros para atualizar a tela sem F5
    const channel = supabase
      .channel("groups-page-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "transactions" }, () => fetchGroups())
      .on("postgres_changes", { event: "*", schema: "public", table: "groups" }, () => fetchGroups())
      .on("postgres_changes", { event: "*", schema: "public", table: "group_members" }, () => fetchGroups())
      .on("postgres_changes", { event: "*", schema: "public", table: "group_invites" }, () => fetchInvites())
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

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

          const { data: transactions } = await supabase.from("transactions").select("amount, type, created_at").eq("group_id", group.id);

          let totalExpenses = 0;
          let totalIncome = 0;
          let lastActivity = null;

          if (transactions) {
            transactions.forEach((t) => {
              // CORREÇÃO DE SALDO AQUI:
              // Usamos Math.abs() porque no banco a despesa é salva como negativo (ex: -100).
              // Queremos somar a magnitude da despesa (100) para mostrar no card de "Despesas"
              // e para subtrair corretamente do saldo depois.
              if (t.type === "expense") {
                totalExpenses += Math.abs(t.amount);
              } else {
                totalIncome += t.amount;
              }

              if (!lastActivity || new Date(t.created_at) > new Date(lastActivity)) {
                lastActivity = t.created_at;
              }
            });
          }

          if (members && members.length > 0) {
            members.forEach((m) => {
              if (!lastActivity || new Date(m.joined_at) > new Date(lastActivity)) {
                lastActivity = m.joined_at;
              }
            });
          }

          return {
            ...group,
            memberCount: members?.length || 0,
            members: membersWithProfiles,
            totalExpenses,
            totalIncome,
            lastActivity,
          };
        })
      );

      setGroups(groupsWithStats);
    } catch (error) {
      console.error("Erro ao buscar grupos:", error);
      toast({
        title: "Erro ao carregar grupos",
        description: "Não foi possível carregar seus grupos. Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchInvites = async () => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const userEmail = user.email;
      if (userEmail) {
        const { data, error } = await supabase
          .from("group_invites")
          .select(
            `
            id,
            group_id,
            status,
            groups (
              name,
              description,
              created_by
            )
          `
          )
          .eq("email", userEmail)
          .eq("status", "pending");

        if (error) throw error;

        const formattedInvites: Invite[] = (data || []).map((item) => ({
          id: item.id,
          group_id: item.group_id,
          status: item.status,
          groups: item.groups
            ? {
                name: item.groups.name,
                description: item.groups.description || "",
                created_by: item.groups.created_by,
              }
            : null,
        }));

        setInvites(formattedInvites);
      }
    } catch (error) {
      console.error("Erro ao buscar convites:", error);
    }
  };

  useEffect(() => {
    fetchGroups();
    fetchInvites();
  }, []);

  const handleInviteResponse = async (invite: Invite, accept: boolean) => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      if (accept) {
        const { data: existingMember } = await supabase
          .from("group_members")
          .select("id")
          .eq("group_id", invite.group_id)
          .eq("user_id", user.id)
          .single();

        if (!existingMember) {
          const { error: memberError } = await supabase.from("group_members").insert({
            group_id: invite.group_id,
            user_id: user.id,
            is_admin: false,
          });
          if (memberError) throw memberError;
        }

        await supabase.from("group_invites").update({ status: "accepted" }).eq("id", invite.id);
        toast({
          title: "Sucesso",
          description: `Você entrou no grupo ${invite.groups?.name || "do convite"}`,
        });
      } else {
        await supabase.from("group_invites").update({ status: "rejected" }).eq("id", invite.id);
        toast({
          title: "Convite rejeitado",
        });
      }

      fetchInvites();
      fetchGroups();
    } catch (error) {
      console.error(error);
      toast({
        title: "Erro",
        description: "Erro ao processar convite",
        variant: "destructive",
      });
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

          {invites.length > 0 && (
            <div className="space-y-4">
              <h2 className="text-lg font-semibold flex items-center gap-2">
                <Clock className="h-5 w-5 text-yellow-500" />
                Convites Pendentes
              </h2>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {invites.map((invite) => (
                  <Card key={invite.id} className="border-yellow-200 bg-yellow-50 dark:bg-yellow-900/20">
                    <CardHeader>
                      <CardTitle className="flex items-center justify-between">
                        <span className="text-lg">{invite.groups?.name || "Grupo Indisponível"}</span>
                        <Badge variant="outline" className="bg-yellow-100 dark:bg-yellow-800">
                          Pendente
                        </Badge>
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      {invite.groups ? (
                        <>
                          {invite.groups.description && <p className="text-sm text-muted-foreground mb-4">{invite.groups.description}</p>}
                          <div className="flex gap-2">
                            <Button size="sm" variant="outline" className="flex-1" onClick={() => handleInviteResponse(invite, false)}>
                              <XCircle className="h-4 w-4 mr-1" />
                              Recusar
                            </Button>
                            <Button size="sm" className="flex-1" onClick={() => handleInviteResponse(invite, true)}>
                              <CheckCircle className="h-4 w-4 mr-1" />
                              Aceitar
                            </Button>
                          </div>
                        </>
                      ) : (
                        <div className="flex flex-col gap-2">
                          <p className="text-sm text-destructive flex items-center gap-2">
                            <AlertCircle className="h-4 w-4" />
                            Detalhes do grupo não disponíveis.
                          </p>
                          <Button size="sm" variant="outline" className="w-full" onClick={() => handleInviteResponse(invite, false)}>
                            Remover Convite
                          </Button>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}

          <div className="grid gap-4 md:gap-6 md:grid-cols-2 lg:grid-cols-3">
            {groups.length === 0 ? (
              <Card className="md:col-span-2 lg:col-span-3 border-2 border-dashed">
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <Users className="h-12 w-12 text-muted-foreground mb-4" />
                  <p className="text-lg font-medium text-muted-foreground mb-2">Nenhum grupo encontrado</p>
                  <p className="text-sm text-muted-foreground mb-4">Crie seu primeiro grupo para começar a compartilhar despesas</p>
                  <AddGroupDialog onGroupCreated={fetchGroups} />
                </CardContent>
              </Card>
            ) : (
              groups.map((group) => {
                const getColorClasses = (color: string) => {
                  const colorMap: Record<string, string> = {
                    blue: "bg-blue-500",
                    green: "bg-green-500",
                    purple: "bg-purple-500",
                    red: "bg-red-500",
                    yellow: "bg-yellow-500",
                    pink: "bg-pink-500",
                    orange: "bg-orange-500",
                    indigo: "bg-indigo-500",
                  };
                  return colorMap[color] || "bg-blue-500";
                };

                // Agora que totalExpenses é positivo, a subtração funciona como esperado (Receita - Despesa)
                const balance = group.totalIncome - group.totalExpenses;
                const isCreator = group.created_by === currentUserId;

                return (
                  <Card
                    key={group.id}
                    className="relative overflow-hidden hover:shadow-lg transition-all duration-200 cursor-pointer"
                    onClick={() => setSelectedGroup({ id: group.id, name: group.name })}
                  >
                    <div
                      className={`absolute top-0 right-0 w-32 h-32 ${getColorClasses(group.color)} opacity-10 rounded-full -mr-16 -mt-16`}
                    />
                    <CardHeader className="pb-4">
                      <div className="flex justify-between items-start">
                        <CardTitle className="text-xl">{group.name}</CardTitle>
                        <div className="flex flex-col items-end gap-1">
                          <Badge variant={isCreator ? "default" : "secondary"} className="text-xs">
                            {isCreator ? "Criador" : "Membro"}
                          </Badge>
                          <Badge variant="outline" className="text-xs">
                            <Users className="w-3 h-3 mr-1" />
                            {group.memberCount} {group.memberCount === 1 ? "membro" : "membros"}
                          </Badge>
                        </div>
                      </div>
                      {group.description && <p className="text-sm text-muted-foreground mt-2">{group.description}</p>}
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <p className="text-sm text-muted-foreground">Receitas</p>
                          <p className="text-lg font-semibold text-green-600 dark:text-green-400 flex items-center gap-1">
                            <TrendingUp className="w-4 h-4" />
                            R$ {group.totalIncome.toFixed(2)}
                          </p>
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">Despesas</p>
                          <p className="text-lg font-semibold text-red-600 dark:text-red-400 flex items-center gap-1">
                            <TrendingDown className="w-4 h-4" />
                            {/* Mostra despesas como valor positivo no card, pois já está na seção "Despesas" */}
                            R$ {group.totalExpenses.toFixed(2)}
                          </p>
                        </div>
                      </div>

                      <div>
                        <p className="text-sm text-muted-foreground">Saldo</p>
                        <div className="flex items-center justify-between">
                          <p
                            className={`text-xl font-bold flex items-center gap-1 ${
                              balance >= 0 ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"
                            }`}
                          >
                            <Wallet className="w-5 h-5" />
                            R$ {Math.abs(balance).toFixed(2)}
                            {balance < 0 && " (negativo)"}
                          </p>
                        </div>
                      </div>

                      <div className="pt-2 flex justify-between items-center">
                        <p className="text-xs text-muted-foreground">
                          {group.lastActivity
                            ? `Última atividade: ${new Date(group.lastActivity).toLocaleDateString("pt-BR")}`
                            : "Sem atividades"}
                        </p>
                        {isCreator && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleEditGroup(group.id);
                            }}
                          >
                            Editar
                          </Button>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                );
              })
            )}
          </div>

          <EditGroupDialog groupId={editGroupId} isOpen={editDialogOpen} onClose={handleEditClose} onSuccess={fetchGroups} />

          {selectedGroup && (
            <GroupDetailsModal
              isOpen={!!selectedGroup}
              onClose={() => setSelectedGroup(null)}
              groupId={selectedGroup.id}
              groupName={selectedGroup.name}
            />
          )}
        </div>
      </div>
    </DashboardLayout>
  );
};

export default Groups;
