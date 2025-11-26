import { useState, useEffect, useRef } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { User, Lock, Moon, Sun, Laptop, Mail, Camera } from "@/lib/icons";
import { useAuth } from "@/contexts/AuthContext";
import { useTheme } from "@/components/theme-provider";
import { supabase } from "@/integrations/supabase/client";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

const Profile = () => {
  const { user, updateProfile, updatePassword } = useAuth();
  const { theme, setTheme } = useTheme();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [loading, setLoading] = useState(false);
  const [profileData, setProfileData] = useState({
    full_name: "",
    age: "",
    gender: "",
    avatar_url: "",
  });

  const [passwordData, setPasswordData] = useState({
    newPassword: "",
    confirmPassword: "",
  });

  useEffect(() => {
    if (user) {
      fetchProfile();
    }
  }, [user]);

  const fetchProfile = async () => {
    try {
      const { data, error } = await supabase.from("profiles").select("*").eq("user_id", user!.id).single();

      if (error && error.code !== "PGRST116") throw error; // Ignora erro se não encontrar perfil (será criado no upsert)

      if (data) {
        setProfileData({
          full_name: data.full_name || "",
          age: data.age ? data.age.toString() : "",
          gender: data.gender || "",
          avatar_url: data.avatar_url || "",
        });
      }
    } catch (error) {
      console.error("Erro ao carregar perfil:", error);
    }
  };

  // Função para processar a imagem e converter para Base64
  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      // Verifica tamanho (exemplo: max 2MB)
      if (file.size > 2 * 1024 * 1024) {
        alert("A imagem deve ter no máximo 2MB.");
        return;
      }

      const reader = new FileReader();
      reader.onloadend = () => {
        const base64String = reader.result as string;
        setProfileData((prev) => ({ ...prev, avatar_url: base64String }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleProfileUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    await updateProfile({
      full_name: profileData.full_name,
      age: profileData.age ? parseInt(profileData.age) : null,
      gender: profileData.gender,
      avatar_url: profileData.avatar_url,
    });
    setLoading(false);
  };

  const handlePasswordUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (passwordData.newPassword !== passwordData.confirmPassword) return;

    setLoading(true);
    await updatePassword(passwordData.newPassword);
    setPasswordData({ newPassword: "", confirmPassword: "" });
    setLoading(false);
  };

  const triggerFileInput = () => {
    fileInputRef.current?.click();
  };

  return (
    <DashboardLayout>
      <div className="p-6 space-y-6 max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold">Meu Perfil</h1>
        <p className="text-muted-foreground">Gerencie suas informações pessoais e preferências</p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Cartão de Informações Básicas (Esquerda) */}
          <Card className="md:col-span-1">
            <CardContent className="pt-6 flex flex-col items-center text-center">
              <div className="relative mb-4 group cursor-pointer" onClick={triggerFileInput}>
                <Avatar className="h-32 w-32 border-4 border-background shadow-xl">
                  <AvatarImage src={profileData.avatar_url} className="object-cover" />
                  <AvatarFallback className="text-4xl bg-primary/10 text-primary">
                    {profileData.full_name ? profileData.full_name.charAt(0).toUpperCase() : "U"}
                  </AvatarFallback>
                </Avatar>
                <div className="absolute inset-0 flex items-center justify-center bg-black/40 rounded-full opacity-0 group-hover:opacity-100 transition-opacity">
                  <Camera className="text-white h-8 w-8" />
                </div>
                <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleFileChange} />
              </div>

              <Button variant="ghost" size="sm" className="mb-4" onClick={triggerFileInput}>
                Alterar Foto
              </Button>

              <h2 className="text-xl font-bold">{profileData.full_name || "Usuário"}</h2>
              <p className="text-sm text-muted-foreground flex items-center gap-1 mt-1 justify-center">
                <Mail className="h-3 w-3" /> {user?.email}
              </p>
            </CardContent>
          </Card>

          {/* Área de Edição (Direita) */}
          <div className="md:col-span-2 space-y-6">
            {/* Dados Pessoais */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="h-5 w-5" /> Dados Pessoais
                </CardTitle>
                <CardDescription>Atualize suas informações de identificação</CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleProfileUpdate} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="fullName">Nome Completo</Label>
                    <Input
                      id="fullName"
                      value={profileData.full_name}
                      onChange={(e) => setProfileData({ ...profileData, full_name: e.target.value })}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="age">Idade</Label>
                      <Input
                        id="age"
                        type="number"
                        value={profileData.age}
                        onChange={(e) => setProfileData({ ...profileData, age: e.target.value })}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="gender">Identidade de Gênero</Label>
                      <Select value={profileData.gender} onValueChange={(val) => setProfileData({ ...profileData, gender: val })}>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="feminino">Feminino</SelectItem>
                          <SelectItem value="masculino">Masculino</SelectItem>
                          <SelectItem value="nao-binario">Não-binário</SelectItem>
                          <SelectItem value="agenero">Agênero</SelectItem>
                          <SelectItem value="genero-fluido">Gênero Fluido</SelectItem>
                          <SelectItem value="transgenero">Transgênero</SelectItem>
                          <SelectItem value="outro">Outro</SelectItem>
                          <SelectItem value="prefiro-nao-dizer">Prefiro não dizer</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <Button type="submit" disabled={loading}>
                    {loading ? "Salvando..." : "Salvar Alterações"}
                  </Button>
                </form>
              </CardContent>
            </Card>

            {/* Aparência */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Laptop className="h-5 w-5" /> Aparência
                </CardTitle>
                <CardDescription>Escolha o tema da interface</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex gap-4">
                  <Button variant={theme === "light" ? "default" : "outline"} className="flex-1" onClick={() => setTheme("light")}>
                    <Sun className="mr-2 h-4 w-4" /> Claro
                  </Button>
                  <Button variant={theme === "dark" ? "default" : "outline"} className="flex-1" onClick={() => setTheme("dark")}>
                    <Moon className="mr-2 h-4 w-4" /> Escuro
                  </Button>
                  <Button variant={theme === "system" ? "default" : "outline"} className="flex-1" onClick={() => setTheme("system")}>
                    <Laptop className="mr-2 h-4 w-4" /> Sistema
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Segurança */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Lock className="h-5 w-5" /> Segurança
                </CardTitle>
                <CardDescription>Alterar senha de acesso</CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handlePasswordUpdate} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="newPassword">Nova Senha</Label>
                    <Input
                      id="newPassword"
                      type="password"
                      value={passwordData.newPassword}
                      onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="confirmPassword">Confirmar Nova Senha</Label>
                    <Input
                      id="confirmPassword"
                      type="password"
                      value={passwordData.confirmPassword}
                      onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
                    />
                  </div>
                  {passwordData.newPassword && passwordData.newPassword !== passwordData.confirmPassword && (
                    <p className="text-xs text-destructive">As senhas não coincidem</p>
                  )}
                  <Button
                    type="submit"
                    disabled={loading || !passwordData.newPassword || passwordData.newPassword !== passwordData.confirmPassword}
                    variant="secondary"
                  >
                    {loading ? "Atualizando..." : "Atualizar Senha"}
                  </Button>
                </form>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default Profile;
