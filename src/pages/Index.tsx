import { Link, Navigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { DollarSign, TrendingUp, Users, Shield, BarChart3, PiggyBank, ArrowRight } from "@/lib/icons";

const Index = () => {
  const { user } = useAuth();

  // Redirect if already authenticated
  if (user) {
    return <Navigate to="/dashboard" replace />;
  }
  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-accent/5">
      {/* Hero Section */}
      <section className="container mx-auto px-4 py-20">
        <div className="text-center max-w-4xl mx-auto">
          <div className="flex justify-center mb-8">
            <div className="p-4 bg-primary/10 rounded-full">
              <DollarSign className="h-16 w-16 text-primary" />
            </div>
          </div>

          <h1 className="text-5xl font-bold text-foreground mb-6">
            Seu Agente Financeiro
            <span className="block text-primary mt-2">Inteligente</span>
          </h1>

          <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
            Gerencie suas finanças pessoais e em grupo com inteligência. Controle investimentos, despesas compartilhadas e alcance seus
            objetivos financeiros.
          </p>

          <div className="flex gap-4 justify-center">
            <Button asChild size="lg" className="bg-gradient-income hover:opacity-90">
              <Link to="/auth">
                Começar Agora
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="container mx-auto px-4 py-20">
        <div className="text-center mb-16">
          <h2 className="text-3xl font-bold text-foreground mb-4">Tudo que você precisa para gerenciar suas finanças</h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">Uma plataforma completa para controle financeiro pessoal e em grupo</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          <div className="text-center p-6 rounded-lg bg-card border border-border">
            <div className="p-3 bg-primary/10 rounded-full w-fit mx-auto mb-4">
              <BarChart3 className="h-8 w-8 text-primary" />
            </div>
            <h3 className="text-xl font-semibold mb-2">Dashboard Intuitivo</h3>
            <p className="text-muted-foreground">Visualize todas suas finanças em um painel claro e organizado</p>
          </div>

          <div className="text-center p-6 rounded-lg bg-card border border-border">
            <div className="p-3 bg-success/10 rounded-full w-fit mx-auto mb-4">
              <PiggyBank className="h-8 w-8 text-success" />
            </div>
            <h3 className="text-xl font-semibold mb-2">Controle de Investimentos</h3>
            <p className="text-muted-foreground">Acompanhe a performance da sua carteira e defina metas</p>
          </div>

          <div className="text-center p-6 rounded-lg bg-card border border-border">
            <div className="p-3 bg-accent/10 rounded-full w-fit mx-auto mb-4">
              <Users className="h-8 w-8 text-accent" />
            </div>
            <h3 className="text-xl font-semibold mb-2">Despesas em Grupo</h3>
            <p className="text-muted-foreground">Compartilhe gastos com família e amigos de forma transparente</p>
          </div>

          <div className="text-center p-6 rounded-lg bg-card border border-border">
            <div className="p-3 bg-warning/10 rounded-full w-fit mx-auto mb-4">
              <TrendingUp className="h-8 w-8 text-warning" />
            </div>
            <h3 className="text-xl font-semibold mb-2">Análises Detalhadas</h3>
            <p className="text-muted-foreground">Relatórios completos sobre seus hábitos financeiros</p>
          </div>

          <div className="text-center p-6 rounded-lg bg-card border border-border">
            <div className="p-3 bg-destructive/10 rounded-full w-fit mx-auto mb-4">
              <Shield className="h-8 w-8 text-destructive" />
            </div>
            <h3 className="text-xl font-semibold mb-2">Segurança Total</h3>
            <p className="text-muted-foreground">Seus dados financeiros protegidos com criptografia avançada</p>
          </div>

          <div className="text-center p-6 rounded-lg bg-card border border-border">
            <div className="p-3 bg-primary/10 rounded-full w-fit mx-auto mb-4">
              <DollarSign className="h-8 w-8 text-primary" />
            </div>
            <h3 className="text-xl font-semibold mb-2">Categorização Automática</h3>
            <p className="text-muted-foreground">IA que aprende seus padrões e categoriza transações automaticamente</p>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="container mx-auto px-4 py-20">
        <div className="bg-primary/5 rounded-2xl p-12 text-center">
          <h2 className="text-3xl font-bold text-foreground mb-4">Pronto para transformar suas finanças?</h2>
          <p className="text-muted-foreground mb-8 max-w-xl mx-auto">
            Junte-se a milhares de usuários que já conquistaram o controle financeiro
          </p>
          <Button size="lg" asChild className="bg-gradient-investment hover:opacity-90">
            <Link to="/auth">Criar Conta Gratuita</Link>
          </Button>
        </div>
      </section>
    </div>
  );
};

export default Index;
