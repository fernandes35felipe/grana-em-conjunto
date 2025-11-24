import { useState } from "react";
import { Calendar as CalendarIcon } from "lucide-react";

import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { sanitizeInput, ensureAuthenticated } from "@/utils/security";
import { formatDateForInput } from "@/utils/date/dateutils";

interface AddEventDialogProps {
  trigger?: React.ReactNode;
  onSuccess?: () => void;
}

export const AddEventDialog = ({ trigger, onSuccess }: AddEventDialogProps) => {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    date: formatDateForInput(new Date()),
  });
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name) {
      toast({
        title: "Erro",
        description: "O nome do evento é obrigatório",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    try {
      const userId = await ensureAuthenticated();

      const { error } = await supabase.from("events" as any).insert({
        user_id: userId,
        name: sanitizeInput(formData.name),
        description: sanitizeInput(formData.description),
        date: formData.date,
      });

      if (error) throw error;

      toast({
        title: "Sucesso",
        description: "Evento criado com sucesso!",
      });

      setFormData({
        name: "",
        description: "",
        date: formatDateForInput(new Date()),
      });
      setOpen(false);
      onSuccess?.();
    } catch (error) {
      console.error("Erro ao criar evento:", error);
      toast({
        title: "Erro",
        description: "Erro ao criar o evento. Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="outline">
            <CalendarIcon className="h-4 w-4 mr-2" />
            Novo Evento
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Criar Novo Evento</DialogTitle>
          <DialogDescription>Crie um evento para agrupar múltiplos lançamentos (ex: Viagem, Projeto).</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="eventName">Nome do Evento *</Label>
            <Input
              id="eventName"
              placeholder="Ex: Viagem para Praia, Reforma da Casa"
              value={formData.name}
              onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="eventDate">Data de Referência *</Label>
            <Input
              id="eventDate"
              type="date"
              value={formData.date}
              onChange={(e) => setFormData((prev) => ({ ...prev, date: e.target.value }))}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="eventDescription">Descrição</Label>
            <Textarea
              id="eventDescription"
              placeholder="Detalhes sobre este evento..."
              value={formData.description}
              onChange={(e) => setFormData((prev) => ({ ...prev, description: e.target.value }))}
              rows={3}
            />
          </div>

          <div className="flex gap-2 pt-4">
            <Button type="button" variant="outline" className="flex-1" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" className="flex-1" disabled={loading}>
              {loading ? "Criando..." : "Criar Evento"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
