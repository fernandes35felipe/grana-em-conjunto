import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { User, Session } from "@supabase/supabase-js";

import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signUp: (email: string, password: string, fullName?: string) => Promise<{ error: any }>;
  signIn: (email: string, password: string) => Promise<{ error: any }>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<{ error: any }>;
  updatePassword: (password: string) => Promise<{ error: any }>;
  // Atualizado para aceitar avatar_url
  updateProfile: (data: {
    full_name?: string;
    age?: number | null;
    gender?: string;
    avatar_url?: string | null;
  }) => Promise<{ error: any }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider = ({ children }: AuthProviderProps) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);

      if (event === "USER_UPDATED") {
        toast({
          title: "Perfil atualizado!",
          description: "Suas informações foram atualizadas.",
        });
      }

      if (event === "PASSWORD_RECOVERY") {
        toast({
          title: "Recuperação de senha",
          description: "Você entrou em modo de recuperação. Vá em 'Meu Perfil' para definir uma nova senha.",
        });
      }
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, [toast]);

  const signUp = async (email: string, password: string, fullName?: string) => {
    try {
      const redirectUrl = `${window.location.origin}/auth`;

      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: redirectUrl,
          data: {
            full_name: fullName,
          },
        },
      });

      if (error) {
        toast({
          title: "Erro no cadastro",
          description: error.message,
          variant: "destructive",
        });
        return { error };
      }

      if (data?.user?.identities?.length === 0) {
        toast({
          title: "Email já cadastrado",
          description: "Este email já possui uma conta. Faça login ou recupere sua senha.",
          variant: "destructive",
        });
        return { error: { message: "Email já cadastrado" } };
      }

      toast({
        title: "Cadastro realizado!",
        description: "Se o envio de email estiver ativo, verifique sua caixa de entrada para confirmar.",
      });

      return { error: null };
    } catch (error) {
      toast({
        title: "Erro no cadastro",
        description: "Ocorreu um erro ao processar seu cadastro. Tente novamente.",
        variant: "destructive",
      });
      return { error };
    }
  };

  const signIn = async (email: string, password: string) => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        if (error.message.includes("Email not confirmed")) {
          toast({
            title: "Email não confirmado",
            description: "Por favor, confirme seu email antes de fazer login. Verifique sua caixa de entrada.",
            variant: "destructive",
          });
        } else if (error.message.includes("Invalid login credentials")) {
          toast({
            title: "Credenciais inválidas",
            description: "Email ou senha incorretos. Tente novamente.",
            variant: "destructive",
          });
        } else {
          toast({
            title: "Erro no login",
            description: error.message,
            variant: "destructive",
          });
        }
        return { error };
      }

      toast({
        title: "Login realizado!",
        description: "Bem-vindo ao sistema.",
      });

      return { error: null };
    } catch (error) {
      toast({
        title: "Erro no login",
        description: "Ocorreu um erro ao fazer login. Tente novamente.",
        variant: "destructive",
      });
      return { error };
    }
  };

  const signOut = async () => {
    try {
      await supabase.auth.signOut();
      setUser(null);
      setSession(null);
      toast({
        title: "Logout realizado",
        description: "Até logo!",
      });
    } catch (error) {
      toast({
        title: "Erro no logout",
        description: "Ocorreu um erro ao fazer logout.",
        variant: "destructive",
      });
    }
  };

  const resetPassword = async (email: string) => {
    try {
      const redirectTo = `${window.location.origin}/profile`;
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo,
      });

      if (error) throw error;

      toast({
        title: "Email enviado",
        description: "Verifique seu email para o link de recuperação de senha.",
      });
      return { error: null };
    } catch (error: any) {
      toast({
        title: "Erro ao recuperar",
        description: error.message || "Não foi possível enviar o email.",
        variant: "destructive",
      });
      return { error };
    }
  };

  const updatePassword = async (password: string) => {
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;

      toast({
        title: "Sucesso",
        description: "Sua senha foi alterada com sucesso.",
      });
      return { error: null };
    } catch (error: any) {
      toast({
        title: "Erro",
        description: error.message,
        variant: "destructive",
      });
      return { error };
    }
  };

  // Função corrigida para usar UPSERT e garantir que o perfil seja salvo
  const updateProfile = async (data: { full_name?: string; age?: number | null; gender?: string; avatar_url?: string | null }) => {
    if (!user) return { error: "Usuário não logado" };

    try {
      const updates = {
        user_id: user.id,
        ...data,
        updated_at: new Date().toISOString(),
      };

      // Upsert: Cria se não existir, Atualiza se existir
      // A opção { onConflict: 'user_id' } instrui o Supabase a usar o campo user_id para resolver conflitos
      const { error } = await supabase.from("profiles").upsert(updates, { onConflict: "user_id" });

      if (error) throw error;

      toast({ title: "Perfil salvo", description: "Seus dados foram atualizados." });

      return { error: null };
    } catch (error: any) {
      console.error(error);
      toast({
        title: "Erro ao atualizar",
        description: "Não foi possível salvar os dados.",
        variant: "destructive",
      });
      return { error };
    }
  };

  const value = {
    user,
    session,
    loading,
    signUp,
    signIn,
    signOut,
    resetPassword,
    updatePassword,
    updateProfile,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
