import { useState, useEffect } from "react";
import { Users, UserPlus, UserMinus, Shield, Mail, Trash2, AlertTriangle, Link as LinkIcon, Copy, Check } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
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
  const [groupOwnerId, setGroupOwnerId] = useState<string | null>(null);
  const [isGroupAdmin, setIsGroupAdmin] = useState(false);
  const [deleteAlertOpen, setDeleteAlertOpen] = useState(false);

  const [formData, setFormData] = useState({
    name: "",
    description: "",
    color: "blue",
  });
  const [members, setMembers] = useState<GroupMember[]>([]);
  const [pendingInvites, setPendingInvites] = useState<Invite[]>([]);
  const [newMemberEmail, setNewMemberEmail] = useState("");

  const [inviteLink, setInviteLink] = useState<string | null>(null);
  const [isCopied, setIsCopied] = useState(false);

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
    if (groupId) {
      fetchGroupData();
      fetchMembers();
      fetchPendingInvites();
    }
  }, [groupId]);

  const fetchGroupData = async () => {
    try {
      const { data: groupData, error: groupError } = await supabase.from("groups").select("*").eq("id", groupId).single();

      if (groupError) throw groupError;

      setFormData({
        name: groupData.name,
        description: groupData.description || "",
        color: groupData.color || "blue",
      });

      setGroupOwnerId(groupData.created_by);

      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user) {
        setCurrentUserId(user.id);
        setIsGroupAdmin(groupData.created_by === user.id);
      }
    } catch (error) {
      console.error("Erro ao buscar dados do grupo:", error);
      toast({ title: "Erro", description: "Não foi possível carregar os dados do grupo.", variant: "destructive" });
    }
  };

  const fetchMembers = async () => {
    if (!groupId) return;

    try {
      const { data, error } = await supabase
        .from("group_members")
        .select(
          `
          id,
          user_id,
          is_admin,
          profiles (
            full_name
          )
        `
        )
        .eq("group_id", groupId);

      if (error) throw error;
      setMembers(data || []);
    } catch (error) {
      console.error("Erro ao buscar membros:", error);
    }
  };

  const fetchPendingInvites = async () => {
    if (!groupId) return;

    try {
      const { data, error } = await supabase.from("group_invites").select("*").eq("group_id", groupId).eq("status", "pending");

      if (error) throw error;
      setPendingInvites(data || []);
    } catch (error) {
      console.error("Erro ao buscar convites:", error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!groupId || !isGroupAdmin) return;

    setLoading(true);
    try {
      const { error } = await supabase
        .from("groups")
        .update({
          name: formData.name,
          description: formData.description,
          color: formData.color,
          updated_at: new Date().toISOString(),
        })
        .eq("id", groupId);

      if (error) throw error;

      toast({ title: "Sucesso", description: "Grupo atualizado com sucesso!" });
      onSuccess?.();
    } catch (error) {
      console.error("Erro ao atualizar grupo:", error);
      toast({ title: "Erro", description: "Não foi possível atualizar o grupo.", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleInviteMember = async () => {
    if (!newMemberEmail.trim()) return;
    setLoading(true);

    try {
      const { data: inviteData, error } = await supabase
        .from("group_invites")
        .insert({
          group_id: groupId,
          email: newMemberEmail.toLowerCase().trim(),
          status: "pending",
        })
        .select()
        .single();

      if (error) throw error;

      const baseUrl = window.location.origin;
      const link = `${baseUrl}/join-group/${inviteData.id}`;
      setInviteLink(link);

      toast({
        title: "Convite criado",
        description: "Link de convite gerado com sucesso!",
      });

      setNewMemberEmail("");
      fetchPendingInvites();
    } catch (error) {
      console.error("Erro ao enviar convite:", error);
      toast({
        title: "Erro",
        description: error.message || "Não foi possível criar o convite.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const copyInviteLink = async () => {
    if (!inviteLink) return;

    try {
      await navigator.clipboard.writeText(inviteLink);
      setIsCopied(true);
      toast({ title: "Copiado!", description: "Link copiado para a área de transferência." });

      setTimeout(() => setIsCopied(false), 2000);
    } catch (error) {
      toast({
        title: "Erro",
        description: "Não foi possível copiar o link",
        variant: "destructive",
      });
    }
  };

  const handleRemoveMember = async (memberUserId: string) => {
    if (memberUserId === groupOwnerId) {
      toast({ title: "Erro", description: "O criador do grupo não pode ser removido.", variant: "destructive" });
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.from("group_members").delete().eq("group_id", groupId).eq("user_id", memberUserId);

      if (error) throw error;

      toast({ title: "Membro removido", description: "O membro foi removido do grupo." });
      fetchMembers();
    } catch (error) {
      console.error("Erro ao remover membro:", error);
      toast({ title: "Erro", description: "Não foi possível remover o membro.", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleToggleAdmin = async (memberUserId: string, currentIsAdmin: boolean) => {
    setLoading(true);
    try {
      const { error } = await supabase
        .from("group_members")
        .update({ is_admin: !currentIsAdmin })
        .eq("group_id", groupId)
        .eq("user_id", memberUserId);

      if (error) throw error;

      toast({
        title: "Sucesso",
        description: !currentIsAdmin ? "Membro promovido a administrador." : "Privilégios de administrador removidos.",
      });
      fetchMembers();
    } catch (error) {
      console.error("Erro ao atualizar privilégios:", error);
      toast({ title: "Erro", description: "Não foi possível atualizar os privilégios.", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleCancelInvite = async (inviteId: string) => {
    setLoading(true);
    try {
      const { error } = await supabase.from("group_invites").delete().eq("id", inviteId);

      if (error) throw error;

      toast({ title: "Convite cancelado", description: "O convite foi cancelado com sucesso." });
      fetchPendingInvites();
    } catch (error) {
      console.error("Erro ao cancelar convite:", error);
      toast({ title: "Erro", description: "Não foi possível cancelar o convite.", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteGroup = async () => {
    if (!groupId) {
      console.error("Erro: ID do grupo não encontrado");
      toast({ title: "Erro", description: "ID do grupo não encontrado.", variant: "destructive" });
      return;
    }

    setLoading(true);
    try {
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
          <DialogDescription>Gerencie as informações, membros e convites do grupo.</DialogDescription>
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
                className="min-h-[80px]"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-group-color">Cor do Grupo</Label>
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
                        <div className={`w-4 h-4 rounded ${color.class}`} />
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
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <UserPlus className="h-5 w-5 text-primary" />
                Membros ({members.length})
              </h3>
            </div>

            <div className="space-y-3 max-h-[200px] overflow-y-auto">
              {members.map((member) => {
                const isOwner = member.user_id === groupOwnerId;
                return (
                  <div key={member.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                    <div className="flex items-center gap-3">
                      <Avatar>
                        <AvatarFallback>{member.profiles?.full_name?.charAt(0)?.toUpperCase() || "?"}</AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-medium">{member.profiles?.full_name || "Usuário sem nome"}</p>
                        <div className="flex items-center gap-2">
                          {isOwner && <Badge variant="secondary">Criador</Badge>}
                          {member.is_admin && !isOwner && <Badge variant="outline">Admin</Badge>}
                        </div>
                      </div>
                    </div>

                    {isGroupAdmin && !isOwner && (
                      <div className="flex items-center gap-2">
                        <div className="flex items-center gap-2">
                          <Label htmlFor={`admin-${member.id}`} className="text-sm">
                            Admin
                          </Label>
                          <Switch
                            id={`admin-${member.id}`}
                            checked={member.is_admin}
                            onCheckedChange={() => handleToggleAdmin(member.user_id, member.is_admin)}
                            disabled={loading}
                          />
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => handleRemoveMember(member.user_id)}
                          disabled={loading}
                        >
                          <UserMinus className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {isGroupAdmin && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <Mail className="h-5 w-5 text-primary" />
                Convidar Membros
              </h3>

              <div className="flex gap-2">
                <Input
                  placeholder="Email do novo membro"
                  type="email"
                  value={newMemberEmail}
                  onChange={(e) => setNewMemberEmail(e.target.value)}
                  onKeyPress={(e) => e.key === "Enter" && (e.preventDefault(), handleInviteMember())}
                />
                <Button type="button" onClick={handleInviteMember} disabled={loading || !newMemberEmail.trim()}>
                  <UserPlus className="h-4 w-4 mr-2" />
                  Gerar Link
                </Button>
              </div>

              {inviteLink && (
                <div className="p-4 bg-muted rounded-lg space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium flex items-center gap-2">
                      <LinkIcon className="h-4 w-4" />
                      Link de Convite
                    </span>
                    <Button type="button" variant="outline" size="sm" onClick={copyInviteLink} className="gap-2">
                      {isCopied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                      {isCopied ? "Copiado!" : "Copiar"}
                    </Button>
                  </div>
                  <code className="text-xs break-all bg-background p-2 rounded block">{inviteLink}</code>
                </div>
              )}

              {pendingInvites.length > 0 && (
                <div className="space-y-2">
                  <Label className="text-sm text-muted-foreground">Convites Pendentes</Label>
                  {pendingInvites.map((invite) => (
                    <div key={invite.id} className="flex items-center justify-between p-2 rounded-md bg-muted/50">
                      <span className="text-sm">{invite.email}</span>
                      <Button type="button" variant="ghost" size="sm" onClick={() => handleCancelInvite(invite.id)} disabled={loading}>
                        Cancelar
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          <div className="flex gap-2">
            <Button type="button" variant="outline" className="flex-1" onClick={onClose}>
              Cancelar
            </Button>
            {isGroupAdmin && (
              <Button type="submit" className="flex-1" disabled={loading || !formData.name}>
                {loading ? "Salvando..." : "Salvar Alterações"}
              </Button>
            )}
          </div>

          {isGroupAdmin && (
            <div className="mt-6 pt-6 border-t border-destructive/20">
              <div className="bg-destructive/5 p-4 rounded-md border border-destructive/20">
                <h4 className="text-destructive font-semibold flex items-center gap-2 mb-2 text-sm">
                  <AlertTriangle className="h-4 w-4" /> Zona de Perigo
                </h4>
                <p className="text-xs text-muted-foreground mb-4">
                  Excluir este grupo apagará permanentemente todas as transações, investimentos e removerá todos os membros.
                </p>
                <Button type="button" variant="destructive" size="sm" className="w-full" onClick={() => setDeleteAlertOpen(true)}>
                  <Trash2 className="h-4 w-4 mr-2" /> Excluir Grupo
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
                <strong> {formData.name} </strong> e todos os dados associados.
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
