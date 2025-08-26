import { useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { DollarSign, ArrowLeft } from "lucide-react";

const ForgotPassword = () => {
  const [email, setEmail] = useState("");
  const [isSubmitted, setIsSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Implementar reset de senha com Supabase
    console.log("Reset password for:", email);
    setIsSubmitted(true);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/5 via-background to-accent/5 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <div className="p-3 bg-primary/10 rounded-full">
              <DollarSign className="h-8 w-8 text-primary" />
            </div>
          </div>
          <CardTitle className="text-2xl">
            {isSubmitted ? "Email enviado!" : "Esqueceu sua senha?"}
          </CardTitle>
          <CardDescription>
            {isSubmitted 
              ? "Verifique sua caixa de entrada para redefinir sua senha"
              : "Digite seu email para receber instruções de recuperação"
            }
          </CardDescription>
        </CardHeader>
        <CardContent>
          {!isSubmitted ? (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="seu@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
              
              <Button type="submit" className="w-full">
                Enviar instruções
              </Button>
            </form>
          ) : (
            <div className="space-y-4">
              <div className="text-center text-sm text-muted-foreground">
                Se o email {email} estiver cadastrado, você receberá as instruções em breve.
              </div>
              <Button 
                variant="outline" 
                className="w-full"
                onClick={() => setIsSubmitted(false)}
              >
                Tentar outro email
              </Button>
            </div>
          )}
          
          <div className="mt-4 text-center">
            <Link 
              to="/login" 
              className="inline-flex items-center gap-2 text-sm text-primary hover:underline"
            >
              <ArrowLeft className="h-4 w-4" />
              Voltar para login
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ForgotPassword;