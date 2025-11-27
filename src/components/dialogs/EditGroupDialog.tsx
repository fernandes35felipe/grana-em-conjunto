import { useState, useEffect } from "react";
import { Users, UserPlus, UserMinus, Shield, Mail, Trash2, AlertTriangle } from "@/lib/icons";
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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface GroupMember {
  id: string;
  user_id: string;
  is_admin: boolean;
  profiles?: {
    full_name: string | null;
  } | null;
}

interface Invite {
  id: string;
  email: string;
  status: string;
  created_at: string;
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
  const [groupOwnerId, setGroupOwnerId] = useState<string | null>(null); // Novo estado para saber quem é o dono
  const [isGroupAdmin, setIsGroupAdmin] = useState(false);
  const [deleteAlertOpen, setDeleteAlertOpen] = useState(false); // Estado para confirmação de deleção
  
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    color: "blue",
  });
  const [members, setMembers] = useState<GroupMember[]>([]);
  const [pendingInvites, setPendingInvites] = useState<Invite[]>([]);
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

      setGroupOwnerId(groupData.created_by); // Salva o ID do criador
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
      // Usuário é admin se tiver flag is_admin OU se for o criador do grupo
      const isAdmin = currentMember?.is_admin || groupData.created_by === user.id;
      setIsGroupAdmin(isAdmin);

      if (isAdmin) {
        const { data: invites } = await supabase
          .from("group_invites")
          .select("id, email, status, created_at")
          .eq("group_id", groupId)
          .eq("status", "pending");
        
        setPendingInvites(invites || []);
      }

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

  const handleInviteMember = async () => {
    if (!newMemberEmail.trim() || !groupId) return;

    if (!isGroupAdmin) {
      toast({
        title: "Erro",
        description: "Apenas administradores podem convidar membros",
        variant: "destructive",
      });
      return;
    }

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      const { error } = await supabase.from("group_invites").insert({
        group_id: groupId,
        email: newMemberEmail.trim().toLowerCase(),
        invited_by: user?.id,
        status: "pending",
      });

      if (error) throw error;

      toast({
        title: "Sucesso",
        description: `Convite enviado para ${newMemberEmail}`,
      });
      setNewMemberEmail("");
      loadGroupData();
    } catch (error) {
      console.error("Erro ao enviar convite:", error);
      toast({
        title: "Erro",
        description: "Erro ao enviar convite. Verifique se o email é válido ou se já existe um convite.",
        variant: "destructive",
      });
    }
  };

  const handleRemoveMember = async (memberId: string, userId: string) => {
    if (!isGroupAdmin) {
      toast({ title: "Erro", description: "Apenas administradores podem remover membros", variant: "destructive" });
      return;
    }

    if (userId === currentUserId) {
      toast({ title: "Erro", description: "Você não pode remover a si mesmo do grupo", variant: "destructive" });
      return;
    }

    // Proteção extra: Não permitir remover o dono do grupo
    if (userId === groupOwnerId) {
        toast({ title: "Erro", description: "Não é possível remover o dono do grupo", variant: "destructive" });
        return;
    }

    try {
      const { error } = await supabase.from("group_members").delete().eq("id", memberId);
      if (error) throw error;

      toast({ title: "Sucesso", description: "Membro removido com sucesso!" });
      await loadGroupData();
    } catch (error) {
      console.error("Erro ao remover membro:", error);
      toast({ title: "Erro", description: "Erro ao remover membro.", variant: "destructive" });
    }
  };

  const handleToggleAdmin = async (memberId: string, currentIsAdmin: boolean) => {
    if (!isGroupAdmin) return;

    try {
      const { error } = await supabase.from("group_members").update({ is_admin: !currentIsAdmin }).eq("id", memberId);
      if (error) throw error;

      toast({
        title: "Sucesso",
        description: `Permissão ${!currentIsAdmin ? "concedida" : "removida"} com sucesso!`,
      });
      await loadGroupData();
    } catch (error) {
      toast({ title: "Erro", description: "Erro ao alterar permissão.", variant: "destructive" });
    }
  };

  // --- FUNÇÃO DE EXCLUSÃO DE GRUPO ---
  const handleDeleteGroup = async () => {
    if (!groupId) return;
    
    // Verificação adicional de segurança no frontend
    if (currentUserId !== groupOwnerId) {
        toast({ title: "Acesso negado", description: "Apenas o criador do grupo pode excluí-lo.", variant: "destructive" });
        return;
    }

    setLoading(true);
    try {
        // Devido ao CASCADE no banco de dados, deletar o grupo deletará membros, transações e convites associados
        const { error } = await supabase.from("groups").delete().eq("id", groupId);
        if (error) throw error;

        toast({ title: "Grupo excluído", description: "O grupo e todos os seus dados foram removidos." });
        setDeleteAlertOpen(false);
        onClose();
        onSuccess?.();
    } catch (error) {
        console.error("Erro ao excluir grupo:", error);
        toast({ title: "Erro", description: "Não foi possível excluir o grupo.", variant: "destructive" });
    } finally {
        setLoading(false);
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
          <DialogDescription>Gerencie as informações, membros e permissões do grupo.</DialogDescription>
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
              <div className="space-y-3">
                <div className="flex gap-2">
                  <Input
                    placeholder="Email do usuário para convidar..."
                    value={newMemberEmail}
                    onChange={(e) => setNewMemberEmail(e.target.value)}
                    type="email"
                  />
                  <Button type="button" onClick={handleInviteMember} variant="outline">
                    <Mail className="h-4 w-4 mr-2" /> Convidar
                  </Button>
                </div>

                {pendingInvites.length > 0 && (
                  <div className="bg-muted/30 rounded-md p-3 text-sm">
                    <p className="font-semibold mb-2 text-muted-foreground">Convites Pendentes:</p>
                    <div className="space-y-2">
                      {pendingInvites.map(invite => (
                        <div key={invite.id} className="flex justify-between items-center border-b last:border-0 border-border pb-2 last:pb-0">
                          <span>{invite.email}</span>
                          <Badge variant="outline" className="text-[10px]">Pendente</Badge>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
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
                      {member.user_id === groupOwnerId && (
                          <span className="text-[10px] text-muted-foreground ml-2">(Dono)</span>
                      )}
                    </div>
                  </div>

                  {isGroupAdmin && member.user_id !== currentUserId && member.user_id !== groupOwnerId && (
                    <div className="flex items-center gap-2">
                      <Switch 
                        checked={member.is_admin} 
                        onCheckedChange={() => handleToggleAdmin(member.id, member.is_admin)} 
                        title="Alternar Administrador"
                      />
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

          {/* ZONA DE PERIGO - EXCLUSÃO DE GRUPO */}
          {currentUserId === groupOwnerId && (
            <div className="mt-8 pt-6 border-t border-destructive/20">
                <div className="bg-destructive/5 p-4 rounded-md border border-destructive/20">
                    <h4 className="text-destructive font-semibold flex items-center gap-2 mb-2">
                        <AlertTriangle className="h-4 w-4" /> Zona de Perigo
                    </h4>
                    <p className="text-sm text-muted-foreground mb-4">
                        Excluir este grupo apagará permanentemente todas as transações, investimentos e removerá todos os membros associados.
                    </p>
                    <Button 
                        type="button" 
                        variant="destructive" 
                        className="w-full"
                        onClick={() => setDeleteAlertOpen(true)}
                    >
                        <Trash2 className="h-4 w-4 mr-2" /> Excluir Grupo Permanentemente
                    </Button>
                </div>
            </div>
          )}
        </form>

        <AlertDialog open={deleteAlertOpen} onOpenChange={setDeleteAlertOpen}>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>Tem certeza absoluta?</AlertDialogTitle>
                    <AlertDialogDescription>
                        Esta ação não pode ser desfeita. Isso excluirá permanentemente o grupo 
                        <strong> {formData.name} </strong> e todos os dados associados a ele.
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel disabled={loading}>Cancelar</AlertDialogCancel>
                    <AlertDialogAction 
                        onClick={handleDeleteGroup} 
                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        disabled={loading}
                    >
                        {loading ? "Excluindo..." : "Sim, excluir grupo"}
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>

      </DialogContent>
    </Dialog>
  );
};