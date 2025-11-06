import { useState } from "react";
import { Bell, BellOff, Check, Trash2, Clock, RefreshCw } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

import { useReminders } from "@/hooks/useReminders";
import { AddReminderDialog } from "@/components/dialogs/AddReminderDialog";

import { cn } from "@/lib/utils";

import type { Reminder } from "@/utils/types/reminder";

const REPEAT_TYPE_LABELS = {
  none: "Não repete",
  daily: "Diariamente",
  weekly: "Semanalmente",
  monthly: "Mensalmente",
  yearly: "Anualmente",
};

export const RemindersList = () => {
  const {
    reminders,
    loading,
    isSubscribed,
    notificationPermission,
    completeReminder,
    deleteReminder,
    enableNotifications,
    disableNotifications,
  } = useReminders();

  const [reminderToDelete, setReminderToDelete] = useState<Reminder | null>(null);

  const handleComplete = async (id: string) => {
    await completeReminder(id);
  };

  const handleDelete = async () => {
    if (!reminderToDelete) return;
    await deleteReminder(reminderToDelete.id);
    setReminderToDelete(null);
  };

  const formatReminderDate = (dateString: string) => {
    const date = new Date(dateString);
    return format(date, "dd/MM/yyyy 'às' HH:mm", { locale: ptBR });
  };

  const isOverdue = (dateString: string) => {
    const reminderDate = new Date(dateString);
    const now = new Date();
    return reminderDate.getTime() < now.getTime();
  };

  const sortedReminders = [...reminders].sort((a, b) => {
    if (a.is_completed !== b.is_completed) {
      return a.is_completed ? 1 : -1;
    }
    return new Date(a.reminder_date).getTime() - new Date(b.reminder_date).getTime();
  });

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Notificações Push</CardTitle>
              <CardDescription>Receba lembretes mesmo quando não estiver usando o aplicativo</CardDescription>
            </div>
            <div className="flex items-center space-x-2">
              <Switch
                id="notifications"
                checked={isSubscribed}
                onCheckedChange={(checked) => {
                  if (checked) {
                    enableNotifications();
                  } else {
                    disableNotifications();
                  }
                }}
                disabled={notificationPermission === "denied"}
              />
              <Label htmlFor="notifications" className="cursor-pointer">
                {isSubscribed ? <Bell className="h-5 w-5" /> : <BellOff className="h-5 w-5" />}
              </Label>
            </div>
          </div>
          {notificationPermission === "denied" && (
            <p className="text-sm text-destructive mt-2">
              As notificações foram bloqueadas. Altere as configurações do navegador para habilitar.
            </p>
          )}
          {notificationPermission === "default" && !isSubscribed && (
            <p className="text-sm text-muted-foreground mt-2">Ative as notificações para receber lembretes no desktop</p>
          )}
        </CardHeader>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Meus Lembretes</CardTitle>
              <CardDescription>
                {reminders.length === 0
                  ? "Nenhum lembrete cadastrado"
                  : `${reminders.filter((r) => !r.is_completed).length} lembretes ativos`}
              </CardDescription>
            </div>
            <AddReminderDialog />
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : sortedReminders.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Bell className="h-12 w-12 mx-auto mb-2 opacity-20" />
              <p>Nenhum lembrete cadastrado</p>
              <p className="text-sm mt-1">Adicione lembretes para não esquecer seus compromissos financeiros</p>
            </div>
          ) : (
            <div className="space-y-3">
              {sortedReminders.map((reminder) => {
                const overdueStatus = !reminder.is_completed && isOverdue(reminder.reminder_date);

                return (
                  <div
                    key={reminder.id}
                    className={cn(
                      "flex items-start gap-3 p-4 rounded-lg border transition-colors",
                      reminder.is_completed
                        ? "bg-muted/50 opacity-60"
                        : overdueStatus
                        ? "bg-destructive/5 border-destructive/20"
                        : "bg-card hover:bg-accent/5"
                    )}
                  >
                    <div className="flex-1 space-y-1">
                      <div className="flex items-start justify-between gap-2">
                        <h4 className={cn("font-medium", reminder.is_completed && "line-through text-muted-foreground")}>
                          {reminder.title}
                        </h4>
                        <div className="flex items-center gap-1">
                          {!reminder.is_completed && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-success hover:text-success hover:bg-success/10"
                              onClick={() => handleComplete(reminder.id)}
                              title="Marcar como concluído"
                            >
                              <Check className="h-4 w-4" />
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                            onClick={() => setReminderToDelete(reminder)}
                            title="Excluir lembrete"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                      {reminder.description && <p className="text-sm text-muted-foreground">{reminder.description}</p>}
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge
                          variant={reminder.is_completed ? "secondary" : overdueStatus ? "destructive" : "default"}
                          className="text-xs"
                        >
                          <Clock className="h-3 w-3 mr-1" />
                          {formatReminderDate(reminder.reminder_date)}
                        </Badge>
                        {reminder.repeat_type && reminder.repeat_type !== "none" && (
                          <Badge variant="outline" className="text-xs">
                            <RefreshCw className="h-3 w-3 mr-1" />
                            {REPEAT_TYPE_LABELS[reminder.repeat_type]}
                          </Badge>
                        )}
                        {reminder.is_completed && (
                          <Badge variant="secondary" className="text-xs">
                            Concluído
                          </Badge>
                        )}
                        {overdueStatus && (
                          <Badge variant="destructive" className="text-xs">
                            Atrasado
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <AlertDialog open={!!reminderToDelete} onOpenChange={() => setReminderToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover Lembrete</AlertDialogTitle>
            <AlertDialogDescription>Tem certeza que deseja remover este lembrete? Esta ação não pode ser desfeita.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Remover
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};
