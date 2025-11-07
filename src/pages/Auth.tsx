import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Navigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Eye, EyeOff, TrendingUp, Shield, Users, BarChart3 } from "@/lib/icons";

export default function Auth() {
  const { user, signIn, signUp, loading } = useAuth();
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [loginData, setLoginData] = useState({
    email: "",
    password: "",
  });

  const [registerData, setRegisterData] = useState({
    fullName: "",
    email: "",
    password: "",
    confirmPassword: "",
  });

  // Redirect if already authenticated
  if (user) {
    return <Navigate to="/" replace />;
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-primary">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    await signIn(loginData.email, loginData.password);
    setIsSubmitting(false);
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();

    if (registerData.password !== registerData.confirmPassword) {
      return;
    }

    setIsSubmitting(true);
    const { error } = await signUp(registerData.email, registerData.password, registerData.fullName);
    if (!error) {
      // Clear form on successful registration
      setRegisterData({ fullName: "", email: "", password: "", confirmPassword: "" });
    }
    setIsSubmitting(false);
  };

  return (
    <div className="min-h-screen bg-gradient-primary flex items-center justify-center p-4">
      <div className="w-full max-w-6xl grid lg:grid-cols-2 gap-8 items-center">
        <div className="hidden lg:block space-y-8 text-foreground">
          <div className="space-y-4">
            <h1 className="text-4xl font-bold bg-gradient-income bg-clip-text text-transparent">Controle Financeiro Inteligente</h1>
            <p className="text-xl text-muted-foreground">Gerencie suas finanças pessoais e em grupo com facilidade e segurança</p>
          </div>

          <div className="grid grid-cols-2 gap-6">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-income" />
                <h3 className="font-semibold">Controle Completo</h3>
              </div>
              <p className="text-sm text-muted-foreground">Acompanhe receitas, despesas e investimentos</p>
            </div>

            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Users className="h-5 w-5 text-accent" />
                <h3 className="font-semibold">Grupos</h3>
              </div>
              <p className="text-sm text-muted-foreground">Compartilhe despesas com família e amigos</p>
            </div>

            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5 text-investment" />
                <h3 className="font-semibold">Relatórios</h3>
              </div>
              <p className="text-sm text-muted-foreground">Visualize seus dados financeiros</p>
            </div>

            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Shield className="h-5 w-5 text-success" />
                <h3 className="font-semibold">Seguro</h3>
              </div>
              <p className="text-sm text-muted-foreground">Seus dados protegidos e criptografados</p>
            </div>
          </div>
        </div>

        {/* Right side - Auth forms */}
        <Card className="w-full max-w-md mx-auto bg-card/95 backdrop-blur shadow-financial border-0">
          <CardHeader>
            <CardTitle className="text-2xl font-bold text-center">Bem-vindo</CardTitle>
            <CardDescription className="text-center">Entre na sua conta ou crie uma nova</CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="login" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="login">Entrar</TabsTrigger>
                <TabsTrigger value="register">Cadastrar</TabsTrigger>
              </TabsList>

              <TabsContent value="login" className="space-y-4">
                <form onSubmit={handleLogin} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="seu@email.com"
                      value={loginData.email}
                      onChange={(e) => setLoginData((prev) => ({ ...prev, email: e.target.value }))}
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="password">Senha</Label>
                    <div className="relative">
                      <Input
                        id="password"
                        type={showPassword ? "text" : "password"}
                        placeholder="Sua senha"
                        value={loginData.password}
                        autoComplete="off"
                        onChange={(e) => setLoginData((prev) => ({ ...prev, password: e.target.value }))}
                        required
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                        onClick={() => setShowPassword(!showPassword)}
                      >
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </Button>
                    </div>
                  </div>

                  <Button type="submit" className="w-full bg-gradient-income hover:opacity-90 transition-opacity" disabled={isSubmitting}>
                    {isSubmitting ? "Entrando..." : "Entrar"}
                  </Button>
                </form>
              </TabsContent>

              <TabsContent value="register" className="space-y-4">
                <form onSubmit={handleRegister} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="fullName">Nome completo</Label>
                    <Input
                      id="fullName"
                      placeholder="Seu nome completo"
                      value={registerData.fullName}
                      onChange={(e) => setRegisterData((prev) => ({ ...prev, fullName: e.target.value }))}
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="registerEmail">Email</Label>
                    <Input
                      id="registerEmail"
                      type="email"
                      placeholder="seu@email.com"
                      value={registerData.email}
                      onChange={(e) => setRegisterData((prev) => ({ ...prev, email: e.target.value }))}
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="registerPassword">Senha</Label>
                    <div className="relative">
                      <Input
                        id="registerPassword"
                        type={showPassword ? "text" : "password"}
                        placeholder="Crie uma senha"
                        value={registerData.password}
                        autoComplete="off"
                        onChange={(e) => setRegisterData((prev) => ({ ...prev, password: e.target.value }))}
                        required
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                        onClick={() => setShowPassword(!showPassword)}
                      >
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </Button>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="confirmPassword">Confirmar senha</Label>
                    <Input
                      id="confirmPassword"
                      type={showPassword ? "text" : "password"}
                      placeholder="Confirme sua senha"
                      value={registerData.confirmPassword}
                      autoComplete="off"
                      onChange={(e) => setRegisterData((prev) => ({ ...prev, confirmPassword: e.target.value }))}
                      required
                    />
                  </div>

                  <Button
                    type="submit"
                    className="w-full bg-gradient-investment hover:opacity-90 transition-opacity"
                    disabled={isSubmitting || registerData.password !== registerData.confirmPassword}
                  >
                    {isSubmitting ? "Cadastrando..." : "Cadastrar"}
                  </Button>

                  {registerData.password !== registerData.confirmPassword && registerData.confirmPassword && (
                    <p className="text-sm text-expense">As senhas não coincidem</p>
                  )}
                </form>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
