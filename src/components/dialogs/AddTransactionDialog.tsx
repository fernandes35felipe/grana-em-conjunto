import { useState, useEffect } from "react";
import { addMonths } from "date-fns";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";

import { useToast } from "@/hooks/use-toast";
import { useReminders } from "@/hooks/useReminders";
import { supabase } from "@/integrations/supabase/client";

import {
  sanitizeInput,
  sanitizeAmount,
  sanitizeInteger,
  sanitizeDate,
  sanitizeUUID,
  validateTransactionData,
  ensureAuthenticated,
  checkGroupMembership,
  withRateLimit,
  SECURITY_LIMITS,
  ALLOWED_CATEGORIES,
} from "@/utils/security";
import { formatDateForInput, formatDateForDatabase, formatDateTimeForDatabase } from "@/utils/date/dateutils";

import type { TransactionData } from "@/utils/security/types";
import type { RepeatType } from "@/utils/types/reminder.types";

interface AddTransactionDialogProps {
  type: "income" | "expense";
  trigger?: React.ReactNode;
  onSuccess?: () => void;
  eventId?: string;
  defaultGroupId?: string;
}

interface TransactionFormData {
  description: string;
  amount: number;
  category: string;
  date: string;
  group_id: string;
  is_recurring: boolean;
  is_fixed: boolean;
  recurrence_count: number;
  assigned_to: string;
}

interface ReminderFormData {
  enabled: boolean;
  reminder_date: string;
  repeat_type: RepeatType;
}

export const AddTransactionDialog = ({ type, trigger, onSuccess, eventId, defaultGroupId }: AddTransactionDialogProps) => {
  const [open, setOpen] = useState(false);
  const { toast } = useToast();
  const { createReminder } = useReminders();
  const [values, setValues] = useState<TransactionFormData>({
    description: "",
    amount: 0,
    category: "",
    date: formatDateForInput(new Date()),
    group_id: defaultGroupId || "personal",
    is_recurring: false,
    is_fixed: false,
    recurrence_count: 1,
    assigned_to: "self",
  });
  const [reminderData, setReminderData] = useState<ReminderFormData>({
    enabled: false,
    reminder_date: "",
    repeat_type: "none",
  });
  const [groups, setGroups] = useState<Array<{ id: string; name: string }>>([]);
  const [groupMembers, setGroupMembers] = useState<Array<{ id: string; full_name: string }>>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const resetForm = () => {
    setValues({
      description: "",
      amount: 0,
      category: "",
      date: formatDateForInput(new Date()),
      group_id: defaultGroupId || "personal",
      is_recurring: false,
      is_fixed: false,
      recurrence_count: 1,
      assigned_to: "self",
    });
    setReminderData({
      enabled: false,
      reminder_date: "",
      repeat_type: "none",
    });
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement> | { target: { name: string; value: any } }) => {
    const { name, value } = e.target;
    setValues((prev) => ({ ...prev, [name]: value }));
  };

  useEffect(() => {
    if (open && !eventId && !defaultGroupId) {
      loadGroups();
    } else if (defaultGroupId && open) {
      // Se já temos um grupo definido, carregamos os membros dele imediatamente
      loadGroupMembers(defaultGroupId);
    }
  }, [open, eventId, defaultGroupId]);

  useEffect(() => {
    if (values.group_id && values.group_id !== "personal") {
      loadGroupMembers(values.group_id);
    } else {
      setGroupMembers([]);
    }
  }, [values.group_id]);

  const loadGroups = async () => {
    try {
      const userId = await ensureAuthenticated();
      const { data, error } = await supabase
        .from("groups")
        .select("id, name")
        .or(`created_by.eq.${userId},id.in.(select group_id from group_members where user_id = ${userId})`);
      if (error) throw error;
      setGroups(data || []);
    } catch (error) {
      console.error("Erro ao carregar grupos:", error);
    }
  };

  const loadGroupMembers = async (groupId: string) => {
    try {
      const { data, error } = await supabase.from("group_members").select("user_id, profiles(id, full_name)").eq("group_id", groupId);
      if (error) throw error;

      const members = data
        ?.map((member: any) => ({
          id: member.profiles?.id,
          full_name: member.profiles?.full_name || "Sem nome",
        }))
        .filter((member) => member.id);
      setGroupMembers(members || []);
    } catch (error) {
      console.error("Erro ao carregar membros do grupo:", error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (isSubmitting) return;
    setIsSubmitting(true);
    try {
      const userId = await ensureAuthenticated();
      const amount = sanitizeAmount(values.amount);
      if (amount <= 0) {
        throw new Error("O valor deve ser maior que zero");
      }

      const sanitizedData: TransactionData = {
        description: sanitizeInput(values.description),
        amount,
        category: sanitizeInput(values.category),
        date: sanitizeDate(values.date),
        group_id: values.group_id === "personal" ? null : sanitizeUUID(values.group_id),
        is_recurring: Boolean(values.is_recurring),
        is_fixed: Boolean(values.is_fixed),
        event_id: eventId ? sanitizeUUID(eventId) : null,
      };

      const validationErrors = validateTransactionData(sanitizedData);
      if (validationErrors.length > 0) {
        throw new Error(validationErrors.join(", "));
      }

      if (sanitizedData.group_id) {
        const isMember = await checkGroupMembership(userId, sanitizedData.group_id);
        if (!isMember) {
          throw new Error("Você não tem permissão para adicionar transações a este grupo");
        }
      }

      await withRateLimit(
        `transaction:${userId}`,
        async () => {
          const recurrenceId = values.is_recurring || values.is_fixed ? crypto.randomUUID() : null;
          const recurrenceCount = sanitizeInteger(values.recurrence_count);
          const iterations = values.is_fixed ? 12 : recurrenceCount;
          const transactionsToInsert = [];

          const baseDate = new Date(values.date + "T00:00:00");

          for (let i = 0; i < iterations; i++) {
            const transactionDate = addMonths(baseDate, i);

            transactionsToInsert.push({
              user_id: values.assigned_to === "self" || !values.assigned_to ? userId : values.assigned_to,
              description: sanitizedData.description,
              amount: type === "expense" ? -Math.abs(amount) : Math.abs(amount),
              type,
              category: sanitizedData.category,
              group_id: sanitizedData.group_id,
              date: formatDateForDatabase(transactionDate),
              is_recurring: sanitizedData.is_recurring,
              is_fixed: sanitizedData.is_fixed,
              recurrence_id: recurrenceId,
              recurrence_count: recurrenceCount,
              event_id: sanitizedData.event_id,
            });
          }

          const { data: insertedTransactions, error } = await supabase.from("transactions").insert(transactionsToInsert).select();
          if (error) throw error;

          if (reminderData.enabled && reminderData.reminder_date && insertedTransactions?.[0]) {
            const reminderDateTime = formatDateTimeForDatabase(reminderData.reminder_date);
            await createReminder(
              {
                title: `Lembrete: ${sanitizedData.description}`,
                description: `${type === "income" ? "Receita" : "Despesa"} de ${amount.toLocaleString("pt-BR", {
                  style: "currency",
                  currency: "BRL",
                })}`,
                reminder_date: reminderDateTime,
                repeat_type: reminderData.repeat_type,
              },
              insertedTransactions[0].id
            );
          }
        },
        30
      );
      toast({
        title: "Sucesso",
        description: "Transação adicionada com sucesso!",
      });
      resetForm();
      setOpen(false);
      if (onSuccess) onSuccess();
    } catch (error) {
      console.error("Erro ao criar transação:", error);
      toast({
        title: "Erro",
        description: error instanceof Error ? error.message : "Erro ao criar transação",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger || <Button>{type === "income" ? "Adicionar Receita" : "Adicionar Despesa"}</Button>}</DialogTrigger>
      <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Adicionar {type === "income" ? "Receita" : "Despesa"}</DialogTitle>
          <DialogDescription>
            Preencha os dados {eventId ? "do item do evento" : `da ${type === "income" ? "receita" : "despesa"}`}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="description">Descrição *</Label>
            <Input
              id="description"
              name="description"
              value={values.description}
              onChange={handleInputChange}
              placeholder="Ex: Passagem aérea, Jantar..."
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="amount">Valor *</Label>
              <Input
                id="amount"
                name="amount"
                type="number"
                step="0.01"
                min="0.01"
                value={values.amount || ""}
                onChange={handleInputChange}
                placeholder="0,00"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="date">Data *</Label>
              <Input id="date" name="date" type="date" value={values.date} onChange={handleInputChange} required />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="category">Categoria *</Label>
            <Select
              name="category"
              value={values.category}
              onValueChange={(value) => handleInputChange({ target: { name: "category", value } } as any)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecione a categoria" />
              </SelectTrigger>
              <SelectContent>
                {ALLOWED_CATEGORIES.map((cat) => (
                  <SelectItem key={cat} value={cat}>
                    {cat}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Se NÃO tiver eventId E NÃO tiver defaultGroupId, mostra a seleção de grupo */}
          {!eventId && !defaultGroupId && (
            <div className="space-y-2">
              <Label htmlFor="group_id">Grupo</Label>
              <Select
                name="group_id"
                value={values.group_id}
                onValueChange={(value) => handleInputChange({ target: { name: "group_id", value } } as any)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="personal">Pessoal</SelectItem>
                  {groups.map((group) => (
                    <SelectItem key={group.id} value={group.id}>
                      {group.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {values.group_id !== "personal" && !eventId && groupMembers.length > 0 && (
            <div className="space-y-2">
              <Label htmlFor="assigned_to">Atribuir a</Label>
              <Select
                name="assigned_to"
                value={values.assigned_to}
                onValueChange={(value) => handleInputChange({ target: { name: "assigned_to", value } } as any)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="self">Eu mesmo</SelectItem>
                  {groupMembers.map((member) => (
                    <SelectItem key={member.id} value={member.id}>
                      {member.full_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <Separator />

          {!eventId && (
            <>
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="is_recurring">Transação Recorrente</Label>
                  <p className="text-sm text-muted-foreground">Repetir por um número específico de vezes</p>
                </div>
                <Switch
                  id="is_recurring"
                  name="is_recurring"
                  checked={values.is_recurring}
                  onCheckedChange={(checked) => handleInputChange({ target: { name: "is_recurring", value: checked } } as any)}
                />
              </div>

              {values.is_recurring && (
                <div className="space-y-2">
                  <Label htmlFor="recurrence_count">Número de Repetições</Label>
                  <Input
                    id="recurrence_count"
                    name="recurrence_count"
                    type="number"
                    min="1"
                    max={SECURITY_LIMITS.MAX_RECURRENCE_COUNT}
                    value={values.recurrence_count}
                    onChange={handleInputChange}
                  />
                </div>
              )}

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="is_fixed">Lançamento Fixo</Label>
                  <p className="text-sm text-muted-foreground">Repetir mensalmente por 12 meses</p>
                </div>
                <Switch
                  id="is_fixed"
                  name="is_fixed"
                  checked={values.is_fixed}
                  onCheckedChange={(checked) => handleInputChange({ target: { name: "is_fixed", value: checked } } as any)}
                />
              </div>
              <Separator />
            </>
          )}

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="reminder_enabled">Adicionar Lembrete</Label>
                <p className="text-sm text-muted-foreground">Receber notificação sobre esta transação</p>
              </div>
              <Switch
                id="reminder_enabled"
                checked={reminderData.enabled}
                onCheckedChange={(checked) => setReminderData((prev) => ({ ...prev, enabled: checked }))}
              />
            </div>

            {reminderData.enabled && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="reminder_date">Data e Hora do Lembrete</Label>
                  <Input
                    id="reminder_date"
                    type="datetime-local"
                    value={reminderData.reminder_date}
                    onChange={(e) => setReminderData((prev) => ({ ...prev, reminder_date: e.target.value }))}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="reminder_repeat">Repetir Lembrete</Label>
                  <Select
                    value={reminderData.repeat_type}
                    onValueChange={(value) => setReminderData((prev) => ({ ...prev, repeat_type: value as RepeatType }))}
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
              </>
            )}
          </div>

          <div className="flex gap-2 pt-4">
            <Button type="button" variant="outline" className="flex-1" onClick={() => setOpen(false)} disabled={isSubmitting}>
              Cancelar
            </Button>
            <Button type="submit" className="flex-1" disabled={isSubmitting}>
              {isSubmitting ? "Salvando..." : "Salvar"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};