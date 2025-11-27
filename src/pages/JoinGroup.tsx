import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Users, Check, X, Loader2 } from "@/lib/icons";
import { DashboardLayout } from "@/components/layout/DashboardLayout";

export default function JoinGroup() {
  const { inviteId } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [invite, setInvite] = useState<any>(null);
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    checkInvite();
  }, [inviteId]);

  const checkInvite = async () => {
    try {
      // 1. Verificar autenticação
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        // Salva a URL para redirecionar após login
        sessionStorage.setItem("redirectUrl", window.location.pathname);
        navigate("/auth");
        return;
      }
      setUser(user);

      if (!inviteId) throw new Error("Link inválido");

      // 2. Buscar dados do convite
      const { data, error } = await supabase
        .from("group_invites")
        .select(`
          *,
          groups (name, description, created_by)
        `)
        .eq("id", inviteId)
        .single();

      if (error) throw error;

      if (data.status !== 'pending') {
        toast({ 
            title: "Convite inválido", 
            description: "Este convite já foi aceito, rejeitado ou expirou.", 
            variant: "destructive" 
        });
        navigate("/groups");
        return;
      }

      setInvite(data);
    } catch (error) {
      console.error(error);
      toast({ title: "Erro", description: "Não foi possível carregar o convite.", variant: "destructive" });
      navigate("/dashboard");
    } finally {
      setLoading(false);
    }
  };

  const handleRespond = async (accept: boolean) => {
    if (!user || !invite) return;
    setLoading(true);

    try {
      if (accept) {
        // Verificar se já é membro antes de inserir
        const { data: existingMember } = await supabase
            .from("group_members")
            .select("id")
            .eq("group_id", invite.group_id)
            .eq("user_id", user.id)
            .single();

        if (existingMember) {
            toast({ title: "Aviso", description: "Você já faz parte deste grupo." });
        } else {
            // Entrar no grupo
            const { error: joinError } = await supabase.from("group_members").insert({
                group_id: invite.group_id,
                user_id: user.id,
                is_admin: false // Todo membro entra como comum, apenas o criador/admin promove
            });
            if (joinError) throw joinError;
        }

        // Atualizar status do convite
        await supabase.from("group_invites").update({ status: "accepted" }).eq("id", invite.id);
        
        toast({ title: "Bem-vindo!", description: `Você entrou no grupo ${invite.groups.name}` });
        navigate("/groups");
      } else {
        // Rejeitar
        await supabase.from("group_invites").update({ status: "rejected" }).eq("id", invite.id);
        toast({ title: "Convite recusado" });
        navigate("/dashboard");
      }
    } catch (error) {
      console.error(error);
      toast({ title: "Erro", description: "Falha ao processar solicitação", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
        <div className="min-h-screen flex items-center justify-center bg-background">
            <div className="flex flex-col items-center gap-4">
                <Loader2 className="h-10 w-10 animate-spin text-primary" />
                <p className="text-muted-foreground">Verificando convite...</p>
            </div>
        </div>
    );
  }

  if (!invite) return null;

  return (
    <DashboardLayout>
      <div className="flex items-center justify-center min-h-[80vh] p-4">
        <Card className="w-full max-w-md shadow-lg">
          <CardHeader className="text-center">
            <div className="mx-auto bg-primary/10 p-4 rounded-full w-fit mb-4">
              <Users className="h-8 w-8 text-primary" />
            </div>
            <CardTitle>Convite para Grupo</CardTitle>
            <CardDescription>Você foi convidado para participar de um grupo financeiro.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="bg-muted/30 p-6 rounded-lg text-center border border-border">
              <h3 className="font-bold text-2xl mb-2 text-foreground">{invite.groups.name}</h3>
              {invite.groups.description && <p className="text-sm text-muted-foreground">{invite.groups.description}</p>}
              <div className="mt-4 text-xs text-muted-foreground">
                Convidado por: {invite.email}
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <Button variant="outline" className="flex-1" onClick={() => handleRespond(false)}>
                <X className="mr-2 h-4 w-4" /> Recusar
              </Button>
              <Button className="flex-1" onClick={() => handleRespond(true)}>
                <Check className="mr-2 h-4 w-4" /> Aceitar
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}