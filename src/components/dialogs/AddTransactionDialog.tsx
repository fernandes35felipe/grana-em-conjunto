import { useState, useEffect } from "react";
import { addMonths } from "date-fns";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Checkbox } from "@/components/ui/checkbox"; // Importando Checkbox
import { ScrollArea } from "@/components/ui/scroll-area"; // Para lista de membros

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
  // assigned_to removido em favor de split_with
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
  });

  // Estado para controlar quem está envolvido na transação (Lista de IDs)
  // Inicializado vazio (false) conforme solicitado
  const [splitWith, setSplitWith] = useState<string[]>([]);

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
    });
    setSplitWith([]); // Reseta para vazio
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
    if (open) {
      if (!defaultGroupId && !eventId) {
        loadGroups();
      }
      if (defaultGroupId) {
        loadGroupMembers(defaultGroupId);
      }
    }
  }, [open, eventId, defaultGroupId]);

  useEffect(() => {
    if (values.group_id && values.group_id !== "personal" && values.group_id !== "none") {
      loadGroupMembers(values.group_id);
    } else {
      setGroupMembers([]);
      setSplitWith([]);
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
      // 1. Busca os IDs dos membros
      const { data: members, error: membersError } = await supabase.from("group_members").select("user_id").eq("group_id", groupId);

      if (membersError) throw membersError;

      if (!members || members.length === 0) {
        setGroupMembers([]);
        return;
      }

      // 2. Busca os perfis
      const userIds = members.map((m) => m.user_id);
      const { data: profiles, error: profilesError } = await supabase
        .from("profiles")
        .select("id, full_name, user_id") // user_id para mapeamento correto
        .in("user_id", userIds);

      if (profilesError) throw profilesError;

      const formattedMembers =
        profiles?.map((profile) => ({
          id: profile.user_id,
          full_name: profile.full_name || "Sem nome",
        })) || [];

      setGroupMembers(formattedMembers);

      // IMPORTANTE: Inicializamos vazio conforme solicitado ("normalmente false")
      setSplitWith([]);
    } catch (error) {
      console.error("Erro ao carregar membros do grupo:", error);
    }
  };

  // Função para alternar seleção de membros
  const toggleMemberSelection = (memberId: string) => {
    setSplitWith(
      (prev) =>
        prev.includes(memberId)
          ? prev.filter((id) => id !== memberId) // Desmarcar
          : [...prev, memberId] // Marcar
    );
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

      // Validação de grupo
      if (values.group_id && values.group_id !== "personal" && values.group_id !== "none") {
        if (splitWith.length === 0) {
          throw new Error("Selecione pelo menos um membro envolvido na transação.");
        }
      }

      const sanitizedData: TransactionData = {
        description: sanitizeInput(values.description),
        amount,
        category: sanitizeInput(values.category),
        date: sanitizeDate(values.date),
        group_id: values.group_id && values.group_id !== "personal" && values.group_id !== "none" ? sanitizeUUID(values.group_id) : null,
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

          // Lógica de Divisão (Simplificada para criação de registros)
          // Se for grupo, cria a transação principal.
          // Nota: Como o banco atual não tem tabela de "splits", vamos atribuir ao criador (userId)
          // mas idealmente salvaríamos os IDs de 'splitWith' em algum lugar.
          // Para este exemplo, manteremos o fluxo padrão de criação.

          for (let i = 0; i < iterations; i++) {
            const transactionDate = addMonths(baseDate, i);

            transactionsToInsert.push({
              user_id: userId, // Criador da transação
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
              // Futuramente: salvar splitWith em uma coluna metadata ou tabela relacionada
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

          {/* NOVA ÁREA DE SELEÇÃO MÚLTIPLA DE MEMBROS */}
          {values.group_id !== "personal" && values.group_id !== "none" && groupMembers.length > 0 && (
            <div className="space-y-2">
              <Label>Quem está envolvido? (Dividir com)</Label>
              <ScrollArea className="h-32 rounded-md border p-2">
                <div className="space-y-2">
                  {groupMembers.map((member) => (
                    <div key={member.id} className="flex items-center space-x-2">
                      <Checkbox
                        id={`member-${member.id}`}
                        checked={splitWith.includes(member.id)}
                        onCheckedChange={() => toggleMemberSelection(member.id)}
                      />
                      <label
                        htmlFor={`member-${member.id}`}
                        className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                      >
                        {member.full_name}
                      </label>
                    </div>
                  ))}
                </div>
              </ScrollArea>
              <p className="text-xs text-muted-foreground">Selecione quem participa desta despesa.</p>
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
