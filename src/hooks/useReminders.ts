import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";

import { reminderService } from "@/utils/services/reminderService";
import { pushNotificationService } from "@/utils/services/pushNotificationService";

import type { Reminder, ReminderFormData } from "@/utils/types/reminder";

export const useReminders = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [notificationPermission, setNotificationPermission] = useState<NotificationPermission>("default");

  const loadReminders = useCallback(async () => {
    if (!user) return;

    try {
      setLoading(true);
      const data = await reminderService.getUserReminders(user.id);
      setReminders(data);
    } catch (error) {
      console.error("Erro ao carregar lembretes:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar os lembretes",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [user, toast]);

  const checkNotificationStatus = useCallback(async () => {
    const permission = await pushNotificationService.getPermissionState();
    setNotificationPermission(permission);

    const subscribed = await pushNotificationService.isSubscribed();
    setIsSubscribed(subscribed);
  }, []);

  useEffect(() => {
    loadReminders();
    checkNotificationStatus();
  }, [loadReminders, checkNotificationStatus]);

  // REMOVA ESTE 'useEffect' COMPLETAMENTE.
  // A verificação não será mais feita pelo cliente.
  /*
  useEffect(() => {
    if (!user) return;

    const interval = setInterval(async () => {
      await reminderService.checkPendingReminders(user.id);
    }, 15000); 

    return () => clearInterval(interval);
  }, [user]);
  */

  const createReminder = async (data: ReminderFormData, transactionId?: string) => {
    if (!user) {
      toast({
        title: "Erro",
        description: "Usuário não autenticado",
        variant: "destructive",
      });
      return;
    }

    try {
      await reminderService.createReminder(user.id, data, transactionId);
      await loadReminders();
      toast({
        title: "Sucesso",
        description: "Lembrete criado com sucesso",
      });
    } catch (error) {
      console.error("Erro ao criar lembrete:", error);
      toast({
        title: "Erro",
        description: "Não foi possível criar o lembrete",
        variant: "destructive",
      });
      throw error;
    }
  };

  const updateReminder = async (id: string, data: Partial<ReminderFormData>) => {
    try {
      await reminderService.updateReminder(id, data);
      await loadReminders();

      toast({
        title: "Sucesso",
        description: "Lembrete atualizado com sucesso",
      });
    } catch (error) {
      console.error("Erro ao atualizar lembrete:", error);
      toast({
        title: "Erro",
        description: "Não foi possível atualizar o lembrete",
        variant: "destructive",
      });
      throw error;
    }
  };

  const deleteReminder = async (id: string) => {
    try {
      await reminderService.deleteReminder(id);
      await loadReminders();

      toast({
        title: "Sucesso",
        description: "Lembrete removido com sucesso",
      });
    } catch (error) {
      console.error("Erro ao remover lembrete:", error);
      toast({
        title: "Erro",
        description: "Não foi possível remover o lembrete",
        variant: "destructive",
      });
      throw error;
    }
  };

  const completeReminder = async (id: string) => {
    try {
      await reminderService.markAsCompleted(id);
      await loadReminders();

      toast({
        title: "Sucesso",
        description: "Lembrete marcado como concluído",
      });
    } catch (error) {
      console.error("Erro ao completar lembrete:", error);
      toast({
        title: "Erro",
        description: "Não foi possível marcar o lembrete como concluído",
        variant: "destructive",
      });
      throw error;
    }
  };

  const enableNotifications = async () => {
    if (!user) return;
    try {
      await pushNotificationService.initialize();
      await pushNotificationService.subscribe(user.id);

      setIsSubscribed(true);
      setNotificationPermission("granted");
      toast({
        title: "Sucesso",
        description: "Notificações ativadas com sucesso",
      });
    } catch (error) {
      console.error("Erro ao ativar notificações:", error);
      toast({
        title: "Erro",
        description: "Não foi possível ativar as notificações",
        variant: "destructive",
      });
    }
  };

  const disableNotifications = async () => {
    if (!user) return;
    try {
      await pushNotificationService.unsubscribe(user.id);

      setIsSubscribed(false);
      toast({
        title: "Sucesso",
        description: "Notificações desativadas com sucesso",
      });
    } catch (error) {
      console.error("Erro ao desativar notificações:", error);
      toast({
        title: "Erro",
        description: "Não foi possível desativar as notificações",
        variant: "destructive",
      });
    }
  };

  return {
    reminders,
    loading,
    isSubscribed,
    notificationPermission,
    createReminder,
    updateReminder,
    deleteReminder,
    completeReminder,
    enableNotifications,
    disableNotifications,
    refreshReminders: loadReminders,
  };
};
