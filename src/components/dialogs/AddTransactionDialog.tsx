import { useState, useEffect } from "react";
import { addMonths } from "date-fns";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";

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
  payer_id: string;
  is_recurring: boolean;
  is_fixed: boolean;
  is_pending: boolean;
  recurrence_count: number;
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
  const [currentUserId, setCurrentUserId] = useState<string>("");

  const [values, setValues] = useState<TransactionFormData>({
    description: "",
    amount: 0,
    category: "",
    date: formatDateForInput(new Date()),
    group_id: defaultGroupId || "personal",
    payer_id: "",
    is_recurring: false,
    is_fixed: false,
    is_pending: false,
    recurrence_count: 1,
  });

  const [reminderData, setReminderData] = useState<ReminderFormData>({
    enabled: false,
    reminder_date: "",
    repeat_type: "none",
  });

  const [groups, setGroups] = useState<Array<{ id: string; name: string }>>([]);
  const [groupMembers, setGroupMembers] = useState<Array<{ id: string; full_name: string }>>([]);
  const [selectedMembers, setSelectedMembers] = useState<string[]>([]);

  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) {
        setCurrentUserId(data.user.id);
        setValues((prev) => ({ ...prev, payer_id: data.user.id }));
      }
    });
  }, []);

  const resetForm = () => {
    setValues({
      description: "",
      amount: 0,
      category: "",
      date: formatDateForInput(new Date()),
      group_id: defaultGroupId || "personal",
      payer_id: currentUserId,
      is_recurring: false,
      is_fixed: false,
      is_pending: false,
      recurrence_count: 1,
    });
    setReminderData({ enabled: false, reminder_date: "", repeat_type: "none" });
    setSelectedMembers([]);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement> | { target: { name: string; value: any } }) => {
    const { name, value } = e.target;
    setValues((prev) => ({ ...prev, [name]: value }));
  };

  useEffect(() => {
    if (open && !eventId && !defaultGroupId) {
      loadGroups();
    } else if (defaultGroupId && open) {
      loadGroupMembers(defaultGroupId);
    }
  }, [open, eventId, defaultGroupId]);

  useEffect(() => {
    if (values.group_id && values.group_id !== "personal") {
      loadGroupMembers(values.group_id);
    } else {
      setGroupMembers([]);
      setSelectedMembers([]);
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
      const userId = await ensureAuthenticated();
      const { data, error } = await supabase.from("group_members").select("user_id, profiles(id, full_name)").eq("group_id", groupId);
      if (error) throw error;

      const members = data
        ?.map((member: any) => ({
          id: member.user_id,
          full_name: member.profiles?.full_name || "Sem nome",
        }))
        .filter((member) => member.id);

      setGroupMembers(members || []);
      if (members) {
        setSelectedMembers(members.map((m) => m.id));
      }
    } catch (error) {
      console.error("Erro ao carregar membros do grupo:", error);
    }
  };

  const toggleMember = (memberId: string) => {
    setSelectedMembers((prev) => (prev.includes(memberId) ? prev.filter((id) => id !== memberId) : [...prev, memberId]));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;
    setIsSubmitting(true);

    try {
      const userId = await ensureAuthenticated();
      const amount = sanitizeAmount(values.amount);

      if (amount <= 0) throw new Error("O valor deve ser maior que zero");

      if (values.group_id !== "personal" && selectedMembers.length === 0) {
        throw new Error("Selecione pelo menos um membro para dividir.");
      }

      // Configuração dos campos novos
      const pendingType = values.is_pending ? (type === "income" ? "receivable" : "payable") : null;
      // Se não for pendente, assumimos pago na data do lançamento (ou agora, se preferir data de criação, mas data de ref. é melhor)
      const paidAt = values.is_pending ? null : formatDateTimeForDatabase(values.date + "T12:00:00");

      const sanitizedData: TransactionData = {
        description: sanitizeInput(values.description),
        amount,
        category: sanitizeInput(values.category),
        date: sanitizeDate(values.date),
        group_id: values.group_id === "personal" ? null : sanitizeUUID(values.group_id),
        is_recurring: Boolean(values.is_recurring),
        is_fixed: Boolean(values.is_fixed),
        is_pending: Boolean(values.is_pending),
        pending_type: pendingType,
        paid_at: paidAt,
        event_id: eventId ? sanitizeUUID(eventId) : null,
      };

      const validationErrors = validateTransactionData(sanitizedData);
      if (validationErrors.length > 0) throw new Error(validationErrors.join(", "));

      await withRateLimit(
        `transaction:${userId}`,
        async () => {
          const recurrenceId = values.is_recurring || values.is_fixed ? crypto.randomUUID() : null;
          const recurrenceCount = sanitizeInteger(values.recurrence_count);
          const iterations = values.is_fixed ? 12 : recurrenceCount;

          const baseDate = new Date(values.date + "T00:00:00");

          for (let i = 0; i < iterations; i++) {
            const transactionDate = addMonths(baseDate, i);
            const formattedDate = formatDateForDatabase(transactionDate);

            // Ajuste data de pagamento para recorrência se não for pendente
            const currentPaidAt = sanitizedData.is_pending ? null : new Date(transactionDate.setHours(12)).toISOString();

            const { data: transData, error: transError } = await supabase
              .from("transactions")
              .insert({
                user_id: userId,
                payer_id: values.payer_id || userId,
                description: sanitizedData.description,
                amount: type === "expense" ? -Math.abs(amount) : Math.abs(amount),
                type,
                category: sanitizedData.category,
                group_id: sanitizedData.group_id,
                date: formattedDate,
                is_recurring: sanitizedData.is_recurring,
                is_fixed: sanitizedData.is_fixed,
                is_pending: sanitizedData.is_pending,
                pending_type: sanitizedData.pending_type,
                paid_at: currentPaidAt,
                recurrence_id: recurrenceId,
                recurrence_count: recurrenceCount,
                event_id: sanitizedData.event_id,
              })
              .select()
              .single();

            if (transError) throw transError;

            if (sanitizedData.group_id && selectedMembers.length > 0 && transData) {
              const splitAmount = amount / selectedMembers.length;
              const splitsToInsert = selectedMembers.map((memberId) => ({
                transaction_id: transData.id,
                user_id: memberId,
                amount: splitAmount,
              }));

              const { error: splitError } = await supabase.from("transaction_splits").insert(splitsToInsert);
              if (splitError) throw splitError;
            }

            if (i === 0 && reminderData.enabled && reminderData.reminder_date && transData) {
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
                transData.id
              );
            }
          }
        },
        30
      );

      toast({ title: "Sucesso", description: "Transação salva com sucesso!" });
      resetForm();
      setOpen(false);
      if (onSuccess) onSuccess();
    } catch (error) {
      console.error("Erro ao criar transação:", error);
      toast({ title: "Erro", description: error instanceof Error ? error.message : "Erro desconhecido", variant: "destructive" });
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
          <DialogDescription>Detalhes do lançamento.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="description">Descrição *</Label>
            <Input
              id="description"
              name="description"
              value={values.description}
              onChange={handleInputChange}
              placeholder="Ex: Jantar, Aluguel..."
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="amount">Valor Total *</Label>
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

          {values.group_id !== "personal" && groupMembers.length > 0 && (
            <div className="space-y-2">
              <Label htmlFor="payer_id">Quem pagou?</Label>
              <Select value={values.payer_id} onValueChange={(value) => handleInputChange({ target: { name: "payer_id", value } } as any)}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione quem pagou" />
                </SelectTrigger>
                <SelectContent>
                  {groupMembers.map((member) => (
                    <SelectItem key={member.id} value={member.id}>
                      {member.id === currentUserId ? "Eu" : member.full_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {values.group_id !== "personal" && !eventId && groupMembers.length > 0 && (
            <div className="space-y-2 border rounded-md p-3 bg-muted/20">
              <div className="flex justify-between items-center mb-2">
                <Label className="text-sm font-semibold">Dividir com:</Label>
                <span className="text-xs text-muted-foreground">{selectedMembers.length} selecionado(s)</span>
              </div>
              <ScrollArea className="h-[120px] w-full rounded-md border p-2 bg-background">
                <div className="space-y-2">
                  {groupMembers.map((member) => (
                    <div key={member.id} className="flex items-center space-x-2">
                      <Checkbox
                        id={`member-${member.id}`}
                        checked={selectedMembers.includes(member.id)}
                        onCheckedChange={() => toggleMember(member.id)}
                      />
                      <label htmlFor={`member-${member.id}`} className="text-sm font-medium flex-1 cursor-pointer">
                        {member.full_name}
                      </label>
                      {selectedMembers.length > 0 && selectedMembers.includes(member.id) && (
                        <span className="text-xs text-muted-foreground">
                          {(values.amount / selectedMembers.length).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </div>
          )}

          <Separator />

          <div className="flex items-center justify-between py-2">
            <div className="space-y-0.5">
              <Label htmlFor="is_pending">Status Pendente</Label>
              <p className="text-xs text-muted-foreground">{type === "income" ? "A Receber" : "A Pagar"}</p>
            </div>
            <Switch
              id="is_pending"
              name="is_pending"
              checked={values.is_pending}
              onCheckedChange={(checked) => handleInputChange({ target: { name: "is_pending", value: checked } } as any)}
            />
          </div>

          <Separator />

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
