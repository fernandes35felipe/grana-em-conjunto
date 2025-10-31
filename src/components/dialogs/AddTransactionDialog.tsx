import { useState, useEffect } from "react";
import { format, addMonths } from "date-fns";

import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";

import { useToast } from "@/hooks/use-toast";
import { useSanitizedForm } from "@/hooks/useSanitizedForm";

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

import type { TransactionData } from "@/utils/security/types";

interface AddTransactionDialogProps {
  type: "income" | "expense";
  trigger?: React.ReactNode;
  onSuccess?: () => void;
}

interface FormData extends Partial<TransactionData> {
  assigned_to?: string;
}

interface Group {
  id: string;
  name: string;
}

interface User {
  id: string;
  full_name: string;
}

export const AddTransactionDialog = ({ type, trigger, onSuccess }: AddTransactionDialogProps) => {
  const [open, setOpen] = useState(false);
  const [groups, setGroups] = useState<Group[]>([]);
  const [groupUsers, setGroupUsers] = useState<User[]>([]);
  const { toast } = useToast();

  const {
    values: formData,
    errors,
    isSubmitting,
    handleChange,
    handleSubmit,
    resetForm,
  } = useSanitizedForm<FormData>({
    initialValues: {
      description: "",
      amount: 0,
      type,
      category: "",
      date: format(new Date(), "yyyy-MM-dd"),
      group_id: "personal",
      assigned_to: "self",
      is_recurring: false,
      is_fixed: false,
      recurrence_count: null,
    },
    sanitizers: {
      description: (v) => sanitizeInput(v, SECURITY_LIMITS.MAX_DESCRIPTION_LENGTH),
      amount: (v) => sanitizeAmount(v),
      category: (v) => sanitizeInput(v, SECURITY_LIMITS.MAX_NAME_LENGTH),
      date: (v) => sanitizeDate(v) || format(new Date(), "yyyy-MM-dd"),
      group_id: (v) => (v === "personal" ? v : sanitizeUUID(v) || "personal"),
      assigned_to: (v) => (v === "self" ? v : sanitizeUUID(v) || "self"),
      recurrence_count: (v) => (v ? sanitizeInteger(v, SECURITY_LIMITS.MIN_RECURRENCE_COUNT, SECURITY_LIMITS.MAX_RECURRENCE_COUNT) : null),
    },
    validators: {
      description: (v) => ({
        isValid: v.length > 0 && v.length <= SECURITY_LIMITS.MAX_DESCRIPTION_LENGTH,
        error: v.length === 0 ? "Descrição obrigatória" : null,
      }),
      amount: (v) => ({
        isValid: v > 0,
        error: v <= 0 ? "Valor deve ser maior que zero" : null,
      }),
      category: (v) => ({
        isValid: ALLOWED_CATEGORIES.includes(v as any),
        error: !ALLOWED_CATEGORIES.includes(v as any) ? "Categoria inválida" : null,
      }),
    },
    onSubmit: async (values) => {
      await submitTransaction(values);
    },
  });

  useEffect(() => {
    if (open) {
      loadGroups();
    }
  }, [open]);

  useEffect(() => {
    if (formData.group_id && formData.group_id !== "personal") {
      loadGroupUsers(formData.group_id);
    } else {
      setGroupUsers([]);
      handleChange("assigned_to", "self");
    }
  }, [formData.group_id]);

  useEffect(() => {
    if (!formData.is_recurring) {
      handleChange("recurrence_count", null);
      handleChange("is_fixed", false);
    }
  }, [formData.is_recurring]);

  const loadGroups = async () => {
    try {
      const userId = await ensureAuthenticated();

      const { data: createdGroups, error: createdError } = await supabase.from("groups").select("id, name").eq("created_by", userId);

      if (createdError) throw createdError;

      const { data: memberGroups, error: memberError } = await supabase
        .from("group_members")
        .select("groups(id, name)")
        .eq("user_id", userId);

      if (memberError) throw memberError;

      const memberGroupsData =
        memberGroups?.map((mg: any) => ({
          id: mg.groups.id,
          name: mg.groups.name,
        })) || [];

      const allGroups = [...(createdGroups || []), ...memberGroupsData];
      const uniqueGroups = allGroups.filter((group, index, self) => index === self.findIndex((g) => g.id === group.id));

      setGroups(uniqueGroups.sort((a, b) => a.name.localeCompare(b.name)));
    } catch (error) {
      console.error("Erro ao carregar grupos:", error);
    }
  };

  const loadGroupUsers = async (groupId: string) => {
    try {
      const { data: membersData, error: membersError } = await supabase.from("group_members").select("user_id").eq("group_id", groupId);

      if (membersError) throw membersError;

      if (!membersData || membersData.length === 0) {
        setGroupUsers([]);
        return;
      }

      const userIds = membersData.map((m) => m.user_id);
      const { data: profilesData, error: profilesError } = await supabase
        .from("profiles")
        .select("user_id, full_name")
        .in("user_id", userIds);

      if (profilesError) throw profilesError;

      const users =
        profilesData?.map((profile) => ({
          id: profile.user_id,
          full_name: profile.full_name || "Usuário",
        })) || [];

      setGroupUsers(users);
    } catch (error) {
      console.error("Erro ao carregar usuários do grupo:", error);
      setGroupUsers([]);
    }
  };

  const submitTransaction = async (values: FormData) => {
    try {
      const userId = await ensureAuthenticated();

      if (values.group_id && values.group_id !== "personal") {
        const hasAccess = await checkGroupMembership(userId, values.group_id);
        if (!hasAccess) {
          throw new Error("Sem permissão para adicionar transações neste grupo");
        }
      }

      const validationResult = validateTransactionData({
        description: values.description!,
        amount: values.amount!,
        type: values.type!,
        category: values.category!,
        date: values.date!,
        group_id: values.group_id === "personal" ? null : values.group_id,
        is_recurring: values.is_recurring,
        is_fixed: values.is_fixed,
        recurrence_count: values.recurrence_count,
      });

      if (!validationResult.isValid) {
        throw new Error(validationResult.error || "Dados inválidos");
      }

      await withRateLimit(
        `transaction:${userId}`,
        async () => {
          const amount = values.amount!;

          let recurrenceId = null;
          let recurrenceCount = 1;

          if (values.is_fixed) {
            recurrenceId = crypto.randomUUID();
            recurrenceCount = 60;
          } else if (values.is_recurring && values.recurrence_count) {
            recurrenceId = crypto.randomUUID();
            recurrenceCount = values.recurrence_count;
          }

          const transactionsToInsert = [];

          for (let i = 0; i < recurrenceCount; i++) {
            const transactionDate = addMonths(new Date(values.date!), i);

            transactionsToInsert.push({
              user_id: values.assigned_to === "self" || !values.assigned_to ? userId : values.assigned_to,
              description: values.description,
              amount: type === "expense" ? -Math.abs(amount) : Math.abs(amount),
              type,
              category: values.category,
              group_id: values.group_id === "personal" ? null : values.group_id,
              date: format(transactionDate, "yyyy-MM-dd"),
              is_recurring: values.is_recurring,
              is_fixed: values.is_fixed,
              recurrence_id: recurrenceId,
              recurrence_count: recurrenceCount,
            });
          }

          const { error } = await supabase.from("transactions").insert(transactionsToInsert);

          if (error) throw error;
        },
        30
      );

      let successMessage = "";
      if (values.is_fixed) {
        successMessage = `${type === "income" ? "Receita" : "Despesa"} fixa adicionada com sucesso!`;
      } else if (values.is_recurring) {
        successMessage = `${type === "income" ? "Receita" : "Despesa"} recorrente adicionada com sucesso!`;
      } else {
        successMessage = `${type === "income" ? "Receita" : "Despesa"} adicionada com sucesso!`;
      }

      toast({
        title: "Sucesso",
        description: successMessage,
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
      throw error;
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger || <Button>{type === "income" ? "Adicionar Receita" : "Adicionar Despesa"}</Button>}</DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Adicionar {type === "income" ? "Receita" : "Despesa"}</DialogTitle>
          <DialogDescription>Preencha os dados da {type === "income" ? "receita" : "despesa"}</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="description">Descrição</Label>
            <Input
              id="description"
              value={formData.description}
              onChange={(e) => handleChange("description", e.target.value)}
              maxLength={SECURITY_LIMITS.MAX_DESCRIPTION_LENGTH}
              placeholder="Ex: Salário, Aluguel..."
            />
            {errors.description && <p className="text-sm text-destructive mt-1">{errors.description}</p>}
          </div>

          <div>
            <Label htmlFor="amount">Valor</Label>
            <Input
              id="amount"
              type="number"
              step="0.01"
              min="0"
              max={SECURITY_LIMITS.MAX_AMOUNT}
              value={formData.amount}
              onChange={(e) => handleChange("amount", e.target.value)}
              placeholder="0.00"
            />
            {errors.amount && <p className="text-sm text-destructive mt-1">{errors.amount}</p>}
          </div>

          <div>
            <Label htmlFor="category">Categoria</Label>
            <Select value={formData.category} onValueChange={(value) => handleChange("category", value)}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione" />
              </SelectTrigger>
              <SelectContent>
                {ALLOWED_CATEGORIES.map((cat) => (
                  <SelectItem key={cat} value={cat}>
                    {cat}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.category && <p className="text-sm text-destructive mt-1">{errors.category}</p>}
          </div>

          <div>
            <Label htmlFor="date">Data</Label>
            <Input id="date" type="date" value={formData.date} onChange={(e) => handleChange("date", e.target.value)} />
          </div>

          <div>
            <Label htmlFor="group">Grupo</Label>
            <Select value={formData.group_id} onValueChange={(value) => handleChange("group_id", value)}>
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

          {formData.group_id !== "personal" && groupUsers.length > 0 && (
            <div>
              <Label htmlFor="assigned_to">Atribuir a</Label>
              <Select value={formData.assigned_to} onValueChange={(value) => handleChange("assigned_to", value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="self">Eu mesmo</SelectItem>
                  {groupUsers.map((user) => (
                    <SelectItem key={user.id} value={user.id}>
                      {user.full_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="flex items-center justify-between">
            <Label htmlFor="is_recurring">Lançamento Recorrente</Label>
            <Switch
              id="is_recurring"
              checked={formData.is_recurring}
              onCheckedChange={(checked) => handleChange("is_recurring", checked)}
            />
          </div>

          {formData.is_recurring && (
            <>
              <div>
                <Label htmlFor="recurrence_count">Quantidade de Meses</Label>
                <Input
                  id="recurrence_count"
                  type="number"
                  min={SECURITY_LIMITS.MIN_RECURRENCE_COUNT}
                  max={SECURITY_LIMITS.MAX_RECURRENCE_COUNT}
                  value={formData.recurrence_count || ""}
                  onChange={(e) => handleChange("recurrence_count", e.target.value)}
                  placeholder="Ex: 12"
                />
              </div>

              <div className="flex items-center justify-between">
                <Label htmlFor="is_fixed">Lançamento Fixo (60 meses)</Label>
                <Switch id="is_fixed" checked={formData.is_fixed} onCheckedChange={(checked) => handleChange("is_fixed", checked)} />
              </div>
            </>
          )}

          <div className="flex gap-2">
            <Button type="button" variant="outline" className="flex-1" onClick={() => setOpen(false)}>
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
