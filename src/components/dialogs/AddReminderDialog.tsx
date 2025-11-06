import { useState } from "react";
import { Bell } from "lucide-react";

import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

import { useReminders } from "@/hooks/useReminders";

import { formatDateTimeForDatabase } from "@/utils/date/dateutils";

import type { ReminderFormData, RepeatType } from "@/utils/types/reminder.types";

interface AddReminderDialogProps {
  trigger?: React.ReactNode;
  transactionId?: string;
  defaultTitle?: string;
  onSuccess?: () => void;
}

export const AddReminderDialog = ({ trigger, transactionId, defaultTitle, onSuccess }: AddReminderDialogProps) => {
  const [open, setOpen] = useState(false);
  const [formData, setFormData] = useState<ReminderFormData>({
    title: defaultTitle || "",
    description: "",
    reminder_date: "",
    repeat_type: "none",
  });

  const { createReminder } = useReminders();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const reminderDataToSave = {
        ...formData,
        reminder_date: formatDateTimeForDatabase(formData.reminder_date),
      };

      await createReminder(reminderDataToSave, transactionId);
      setOpen(false);
      setFormData({
        title: "",
        description: "",
        reminder_date: "",
        repeat_type: "none",
      });
      if (onSuccess) onSuccess();
    } catch (error) {
      console.error("Erro ao criar lembrete:", error);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="outline" size="sm">
            <Bell className="h-4 w-4 mr-2" />
            Adicionar Lembrete
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Adicionar Lembrete</DialogTitle>
          <DialogDescription>Configure um lembrete para não esquecer compromissos financeiros</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title">Título *</Label>
            <Input
              id="title"
              value={formData.title}
              onChange={(e) => setFormData((prev) => ({ ...prev, title: e.target.value }))}
              placeholder="Ex: Pagar conta de luz"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Descrição</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData((prev) => ({ ...prev, description: e.target.value }))}
              placeholder="Informações adicionais sobre o lembrete"
              rows={3}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="reminder_date">Data e Hora do Lembrete *</Label>
            <Input
              id="reminder_date"
              type="datetime-local"
              value={formData.reminder_date}
              onChange={(e) => setFormData((prev) => ({ ...prev, reminder_date: e.target.value }))}
              required
            />
            <p className="text-xs text-muted-foreground">Você pode agendar lembretes para qualquer data e horário</p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="repeat_type">Repetir</Label>
            <Select
              value={formData.repeat_type}
              onValueChange={(value) => setFormData((prev) => ({ ...prev, repeat_type: value as RepeatType }))}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Não repetir</SelectItem>
                <SelectItem value="daily">Diariamente</SelectItem>
                <SelectItem value="weekly">Semanalmente</SelectItem>
                <SelectItem value="monthly">Mensalmente</SelectItem>
                <SelectItem value="yearly">Anualmente</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex gap-2 pt-4">
            <Button type="button" variant="outline" className="flex-1" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" className="flex-1">
              Criar Lembrete
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
