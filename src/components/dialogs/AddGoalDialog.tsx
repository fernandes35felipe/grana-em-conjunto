import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Target } from "lucide-react";

interface AddGoalDialogProps {
  trigger?: React.ReactNode;
  onSuccess?: () => void;
}

export const AddGoalDialog = ({ trigger, onSuccess }: AddGoalDialogProps) => {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    target_amount: "",
    current_amount: "",
    color: "blue",
    description: "",
    target_date: ""
  });
  const { toast } = useToast();

  const colors = [
    { value: "blue", label: "Azul" },
    { value: "green", label: "Verde" },
    { value: "purple", label: "Roxo" },
    { value: "orange", label: "Laranja" },
    { value: "red", label: "Vermelho" },
    { value: "pink", label: "Rosa" }
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name || !formData.target_amount) {
      toast({
        title: "Erro",
        description: "Preencha todos os campos obrigatórios",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuário não autenticado");

      const targetAmount = parseFloat(formData.target_amount);
      const currentAmount = formData.current_amount ? parseFloat(formData.current_amount) : 0;

      const { error } = await supabase
        .from('investment_goals')
        .insert({
          user_id: user.id,
          name: formData.name,
          target_amount: targetAmount,
          current_amount: currentAmount,
          color: formData.color,
          description: formData.description || null,
          target_date: formData.target_date || null
        });

      if (error) throw error;

      toast({
        title: "Sucesso",
        description: "Meta de investimento criada com sucesso!"
      });

      setFormData({
        name: "",
        target_amount: "",
        current_amount: "",
        color: "blue",
        description: "",
        target_date: ""
      });
      setOpen(false);
      onSuccess?.();
    } catch (error) {
      console.error('Erro ao salvar meta:', error);
      toast({
        title: "Erro",
        description: "Erro ao criar a meta. Tente novamente.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const defaultTrigger = (
    <Button variant="outline">
      <Target className="h-4 w-4 mr-2" />
      Nova Meta
    </Button>
  );

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || defaultTrigger}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Target className="h-5 w-5 text-primary" />
            Nova Meta de Investimento
          </DialogTitle>
          <DialogDescription>
            Crie uma nova meta para acompanhar seus objetivos financeiros.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Nome da Meta *</Label>
            <Input
              id="name"
              placeholder="Ex: Casa Própria"
              value={formData.name}
              onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="target_amount">Valor Alvo *</Label>
            <Input
              id="target_amount"
              type="number"
              step="0.01"
              placeholder="0,00"
              value={formData.target_amount}
              onChange={(e) => setFormData(prev => ({ ...prev, target_amount: e.target.value }))}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="current_amount">Valor Atual (opcional)</Label>
            <Input
              id="current_amount"
              type="number"
              step="0.01"
              placeholder="0,00"
              value={formData.current_amount}
              onChange={(e) => setFormData(prev => ({ ...prev, current_amount: e.target.value }))}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="color">Cor</Label>
            <Select value={formData.color} onValueChange={(value) => setFormData(prev => ({ ...prev, color: value }))}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione uma cor" />
              </SelectTrigger>
              <SelectContent>
                {colors.map((color) => (
                  <SelectItem key={color.value} value={color.value}>
                    <div className="flex items-center gap-2">
                      <div className={`w-3 h-3 rounded-full bg-${color.value}-500`} />
                      {color.label}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="target_date">Data Alvo (opcional)</Label>
            <Input
              id="target_date"
              type="date"
              value={formData.target_date}
              onChange={(e) => setFormData(prev => ({ ...prev, target_date: e.target.value }))}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Descrição (opcional)</Label>
            <Textarea
              id="description"
              placeholder="Descrição da meta..."
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
            />
          </div>

          <div className="flex gap-2 pt-4">
            <Button
              type="button"
              variant="outline"
              className="flex-1"
              onClick={() => setOpen(false)}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              className="flex-1"
              disabled={loading}
            >
              {loading ? "Salvando..." : "Salvar"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};