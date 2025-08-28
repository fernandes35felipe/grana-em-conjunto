import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Users, Plus } from "lucide-react";

interface AddGroupDialogProps {
  trigger?: React.ReactNode;
}

export const AddGroupDialog = ({ trigger }: AddGroupDialogProps) => {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    color: "blue"
  });
  const { toast } = useToast();

  const colors = [
    { value: "blue", label: "Azul", class: "bg-blue-500" },
    { value: "green", label: "Verde", class: "bg-green-500" },
    { value: "purple", label: "Roxo", class: "bg-purple-500" },
    { value: "red", label: "Vermelho", class: "bg-red-500" },
    { value: "yellow", label: "Amarelo", class: "bg-yellow-500" },
    { value: "pink", label: "Rosa", class: "bg-pink-500" },
    { value: "orange", label: "Laranja", class: "bg-orange-500" },
    { value: "indigo", label: "Índigo", class: "bg-indigo-500" }
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name) {
      toast({
        title: "Erro",
        description: "O nome do grupo é obrigatório",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuário não autenticado");

      const { error } = await supabase
        .from('groups')
        .insert({
          name: formData.name,
          description: formData.description,
          color: formData.color,
          created_by: user.id
        });

      if (error) throw error;

      toast({
        title: "Sucesso",
        description: "Grupo criado com sucesso!"
      });

      setFormData({
        name: "",
        description: "",
        color: "blue"
      });
      setOpen(false);
    } catch (error) {
      console.error('Erro ao criar grupo:', error);
      toast({
        title: "Erro",
        description: "Erro ao criar o grupo. Tente novamente.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const defaultTrigger = (
    <Button>
      <Plus className="h-4 w-4 mr-2" />
      Criar Grupo
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
            <Users className="h-5 w-5 text-primary" />
            Criar Novo Grupo
          </DialogTitle>
          <DialogDescription>
            Crie um grupo para compartilhar despesas com outras pessoas.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Nome do Grupo *</Label>
            <Input
              id="name"
              placeholder="Ex: Família, Casa, Viagem..."
              value={formData.name}
              onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Descrição (opcional)</Label>
            <Textarea
              id="description"
              placeholder="Descreva o propósito deste grupo..."
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              rows={3}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="color">Cor do Grupo</Label>
            <Select value={formData.color} onValueChange={(value) => setFormData(prev => ({ ...prev, color: value }))}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione uma cor" />
              </SelectTrigger>
              <SelectContent>
                {colors.map((color) => (
                  <SelectItem key={color.value} value={color.value}>
                    <div className="flex items-center gap-2">
                      <div className={`w-4 h-4 rounded-full ${color.class}`}></div>
                      {color.label}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
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
              {loading ? "Criando..." : "Criar Grupo"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};