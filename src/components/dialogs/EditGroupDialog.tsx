import { useState, useEffect } from "react";
import { Users, UserPlus, UserMinus, Shield, X } from "@/lib/icons";

import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { sanitizeInput, sanitizeAmount, validateTransactionData, ensureAuthenticated, checkRateLimit } from "@/utils/security";

interface GroupMember {
  id: string;
  user_id: string;
  is_admin: boolean;
  profiles?: {
    full_name: string | null;
  } | null;
}

interface EditGroupDialogProps {
  groupId: string | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export const EditGroupDialog = ({ groupId, isOpen, onClose, onSuccess }: EditGroupDialogProps) => {
  const [loading, setLoading] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [isGroupAdmin, setIsGroupAdmin] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    color: "blue",
  });
  const [members, setMembers] = useState<GroupMember[]>([]);
  const [newMemberEmail, setNewMemberEmail] = useState("");
  const { toast } = useToast();

  const colors = [
    { value: "blue", label: "Azul", class: "bg-blue-500" },
    { value: "green", label: "Verde", class: "bg-green-500" },
    { value: "purple", label: "Roxo", class: "bg-purple-500" },
    { value: "red", label: "Vermelho", class: "bg-red-500" },
    { value: "yellow", label: "Amarelo", class: "bg-yellow-500" },
    { value: "pink", label: "Rosa", class: "bg-pink-500" },
    { value: "orange", label: "Laranja", class: "bg-orange-500" },
    { value: "indigo", label: "Índigo", class: "bg-indigo-500" },
  ];

  useEffect(() => {
    if (groupId && isOpen) {
      loadGroupData();
    }
  }, [groupId, isOpen]);

  const loadGroupData = async () => {
    if (!groupId) return;

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      setCurrentUserId(user.id);

      const { data: groupData, error: groupError } = await supabase.from("groups").select("*").eq("id", groupId).single();

      if (groupError) throw groupError;

      setFormData({
        name: groupData.name,
        description: groupData.description || "",
        color: groupData.color || "blue",
      });

      const { data: membersData, error: membersError } = await supabase
        .from("group_members")
        .select("id, user_id, is_admin")
        .eq("group_id", groupId);

      if (membersError) throw membersError;

      const membersWithProfiles = await Promise.all(
        (membersData || []).map(async (member) => {
          const { data: profile } = await supabase.from("profiles").select("full_name").eq("user_id", member.user_id).maybeSingle();

          return {
            ...member,
            profiles: profile,
          };
        })
      );

      setMembers(membersWithProfiles);

      const currentMember = membersData?.find((m) => m.user_id === user.id);
      setIsGroupAdmin(currentMember?.is_admin || groupData.created_by === user.id);
    } catch (error) {
      console.error("Erro ao carregar dados do grupo:", error);
      toast({
        title: "Erro",
        description: "Erro ao carregar dados do grupo",
        variant: "destructive",
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name || !groupId) {
      toast({
        title: "Erro",
        description: "O nome do grupo é obrigatório",
        variant: "destructive",
      });
      return;
    }

    if (!isGroupAdmin) {
      toast({
        title: "Erro",
        description: "Apenas administradores podem editar o grupo",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    try {
      const { error } = await supabase
        .from("groups")
        .update({
          name: formData.name,
          description: formData.description || null,
          color: formData.color,
        })
        .eq("id", groupId);

      if (error) throw error;

      toast({
        title: "Sucesso",
        description: "Grupo atualizado com sucesso!",
      });

      onClose();
      onSuccess?.();
    } catch (error) {
      console.error("Erro ao atualizar grupo:", error);
      toast({
        title: "Erro",
        description: "Erro ao atualizar o grupo. Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleAddMember = async () => {
    if (!newMemberEmail.trim() || !groupId) return;

    if (!isGroupAdmin) {
      toast({
        title: "Erro",
        description: "Apenas administradores podem adicionar membros",
        variant: "destructive",
      });
      return;
    }

    try {
      const { data: profileData, error: profileError } = await supabase
        .from("profiles")
        .select("user_id, full_name")
        .ilike("full_name", `%${newMemberEmail}%`)
        .limit(1)
        .maybeSingle();

      if (profileError || !profileData) {
        toast({
          title: "Erro",
          description: "Usuário não encontrado",
          variant: "destructive",
        });
        return;
      }

      const memberExists = members.some((m) => m.user_id === profileData.user_id);
      if (memberExists) {
        toast({
          title: "Erro",
          description: "Este usuário já é membro do grupo",
          variant: "destructive",
        });
        return;
      }

      const { error: insertError } = await supabase.from("group_members").insert({
        group_id: groupId,
        user_id: profileData.user_id,
        is_admin: false,
      });

      if (insertError) throw insertError;

      toast({
        title: "Sucesso",
        description: "Membro adicionado com sucesso!",
      });

      setNewMemberEmail("");
      await loadGroupData();
    } catch (error) {
      console.error("Erro ao adicionar membro:", error);
      toast({
        title: "Erro",
        description: "Erro ao adicionar membro. Tente novamente.",
        variant: "destructive",
      });
    }
  };

  const handleRemoveMember = async (memberId: string, userId: string) => {
    if (!isGroupAdmin) {
      toast({
        title: "Erro",
        description: "Apenas administradores podem remover membros",
        variant: "destructive",
      });
      return;
    }

    if (userId === currentUserId) {
      toast({
        title: "Erro",
        description: "Você não pode remover a si mesmo do grupo",
        variant: "destructive",
      });
      return;
    }

    try {
      const { error } = await supabase.from("group_members").delete().eq("id", memberId);

      if (error) throw error;

      toast({
        title: "Sucesso",
        description: "Membro removido com sucesso!",
      });

      await loadGroupData();
    } catch (error) {
      console.error("Erro ao remover membro:", error);
      toast({
        title: "Erro",
        description: "Erro ao remover membro. Tente novamente.",
        variant: "destructive",
      });
    }
  };

  const handleToggleAdmin = async (memberId: string, currentIsAdmin: boolean) => {
    if (!isGroupAdmin) {
      toast({
        title: "Erro",
        description: "Apenas administradores podem alterar permissões",
        variant: "destructive",
      });
      return;
    }

    try {
      const { error } = await supabase.from("group_members").update({ is_admin: !currentIsAdmin }).eq("id", memberId);

      if (error) throw error;

      toast({
        title: "Sucesso",
        description: `Permissão ${!currentIsAdmin ? "concedida" : "removida"} com sucesso!`,
      });

      await loadGroupData();
    } catch (error) {
      console.error("Erro ao alterar permissão:", error);
      toast({
        title: "Erro",
        description: "Erro ao alterar permissão. Tente novamente.",
        variant: "destructive",
      });
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="h-5 w-5 text-primary" />
            Editar Grupo
          </DialogTitle>
          <DialogDescription>Gerencie as informações e membros do grupo.</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="edit-group-name">Nome do Grupo *</Label>
              <Input
                id="edit-group-name"
                placeholder="Ex: Família"
                value={formData.name}
                onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
                disabled={!isGroupAdmin}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-group-description">Descrição</Label>
              <Textarea
                id="edit-group-description"
                placeholder="Adicione uma descrição para o grupo..."
                value={formData.description}
                onChange={(e) => setFormData((prev) => ({ ...prev, description: e.target.value }))}
                disabled={!isGroupAdmin}
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-group-color">Cor</Label>
              <Select
                value={formData.color}
                onValueChange={(value) => setFormData((prev) => ({ ...prev, color: value }))}
                disabled={!isGroupAdmin}
              >
                <SelectTrigger id="edit-group-color">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {colors.map((color) => (
                    <SelectItem key={color.value} value={color.value}>
                      <div className="flex items-center gap-2">
                        <div className={`w-4 h-4 rounded-full ${color.class}`} />
                        {color.label}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label>Membros do Grupo</Label>
              <Badge variant="secondary">{members.length} membros</Badge>
            </div>

            {isGroupAdmin && (
              <div className="flex gap-2">
                <Input
                  placeholder="Buscar usuário por nome..."
                  value={newMemberEmail}
                  onChange={(e) => setNewMemberEmail(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), handleAddMember())}
                />
                <Button type="button" onClick={handleAddMember} variant="outline">
                  <UserPlus className="h-4 w-4" />
                </Button>
              </div>
            )}

            <div className="space-y-2 max-h-[300px] overflow-y-auto">
              {members.map((member) => (
                <div key={member.id} className="flex items-center justify-between p-3 rounded-lg border border-border">
                  <div className="flex items-center gap-3">
                    <Avatar>
                      <AvatarFallback>{(member.profiles?.full_name || "U").charAt(0).toUpperCase()}</AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-medium">{member.profiles?.full_name || "Usuário"}</p>
                      {member.is_admin && (
                        <Badge variant="outline" className="text-xs">
                          <Shield className="h-3 w-3 mr-1" />
                          Administrador
                        </Badge>
                      )}
                    </div>
                  </div>

                  {isGroupAdmin && member.user_id !== currentUserId && (
                    <div className="flex items-center gap-2">
                      <Switch checked={member.is_admin} onCheckedChange={() => handleToggleAdmin(member.id, member.is_admin)} />
                      <Button type="button" variant="ghost" size="icon" onClick={() => handleRemoveMember(member.id, member.user_id)}>
                        <UserMinus className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div className="flex gap-2 pt-4">
            <Button type="button" variant="outline" className="flex-1" onClick={onClose}>
              Cancelar
            </Button>
            <Button type="submit" className="flex-1" disabled={loading || !isGroupAdmin}>
              {loading ? "Salvando..." : "Salvar Alterações"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
