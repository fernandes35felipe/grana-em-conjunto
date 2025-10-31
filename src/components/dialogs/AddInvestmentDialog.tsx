import { useState, useEffect } from "react";

import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

import { useToast } from "@/hooks/use-toast";
import { useSanitizedForm } from "@/hooks/useSanitizedForm";

import { supabase } from "@/integrations/supabase/client";

import {
  sanitizeInput,
  sanitizeAmount,
  sanitizeInteger,
  sanitizeDate,
  sanitizeUUID,
  validateInvestmentData,
  ensureAuthenticated,
  checkGroupMembership,
  withRateLimit,
  SECURITY_LIMITS,
  ALLOWED_INVESTMENT_TYPES,
} from "@/utils/security";

import type { InvestmentData } from "@/utils/security/types";

interface AddInvestmentDialogProps {
  trigger?: React.ReactNode;
  onSuccess?: () => void;
}

interface FormData extends Partial<InvestmentData> {
  goal_id?: string;
}

interface Group {
  id: string;
  name: string;
}

interface InvestmentGoal {
  id: string;
  name: string;
  target_amount: number;
  current_amount: number;
}

export const AddInvestmentDialog = ({ trigger, onSuccess }: AddInvestmentDialogProps) => {
  const [open, setOpen] = useState(false);
  const [groups, setGroups] = useState<Group[]>([]);
  const [investmentGoals, setInvestmentGoals] = useState<InvestmentGoal[]>([]);
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
      name: "",
      type: "",
      amount: 0,
      quantity: null,
      unit_price: null,
      group_id: "none",
      goal_id: "none",
      maturity_date: null,
    },
    sanitizers: {
      name: (v) => sanitizeInput(v, SECURITY_LIMITS.MAX_NAME_LENGTH),
      type: (v) => sanitizeInput(v, SECURITY_LIMITS.MAX_NAME_LENGTH),
      amount: (v) => sanitizeAmount(v),
      quantity: (v) => (v ? sanitizeInteger(v, SECURITY_LIMITS.MIN_QUANTITY, SECURITY_LIMITS.MAX_QUANTITY) : null),
      unit_price: (v) => (v ? sanitizeAmount(v) : null),
      group_id: (v) => (v === "none" ? v : sanitizeUUID(v) || "none"),
      goal_id: (v) => (v === "none" ? v : sanitizeUUID(v) || "none"),
      maturity_date: (v) => (v ? sanitizeDate(v) : null),
    },
    validators: {
      name: (v) => ({
        isValid: v.length > 0 && v.length <= SECURITY_LIMITS.MAX_NAME_LENGTH,
        error: v.length === 0 ? "Nome obrigatório" : null,
      }),
      type: (v) => ({
        isValid: ALLOWED_INVESTMENT_TYPES.includes(v as any),
        error: !ALLOWED_INVESTMENT_TYPES.includes(v as any) ? "Tipo de investimento inválido" : null,
      }),
      amount: (v) => ({
        isValid: v > 0,
        error: v <= 0 ? "Valor deve ser maior que zero" : null,
      }),
    },
    onSubmit: async (values) => {
      await submitInvestment(values);
    },
  });

  const showQuantityPriceFields = formData.type === "Ações" || formData.type === "FIIs";

  useEffect(() => {
    if (open) {
      loadGroups();
      loadInvestmentGoals();
    }
  }, [open]);

  const loadGroups = async () => {
    try {
      const { data, error } = await supabase.from("groups").select("id, name").order("name");
      if (error) throw error;
      setGroups(data || []);
    } catch (error) {
      console.error("Erro ao carregar grupos:", error);
    }
  };

  const loadInvestmentGoals = async () => {
    try {
      const { data, error } = await supabase.from("investment_goals").select("id, name, target_amount, current_amount").order("name");
      if (error) throw error;
      setInvestmentGoals(data || []);
    } catch (error) {
      console.error("Erro ao carregar metas:", error);
    }
  };

  const submitInvestment = async (values: FormData) => {
    try {
      const userId = await ensureAuthenticated();

      if (values.group_id && values.group_id !== "none") {
        const hasAccess = await checkGroupMembership(userId, values.group_id);
        if (!hasAccess) {
          throw new Error("Sem permissão para adicionar investimentos neste grupo");
        }
      }

      let calculatedAmount = 0;
      let quantity = null;
      let unitPrice = null;

      if (showQuantityPriceFields) {
        if (!values.quantity || !values.unit_price) {
          throw new Error("Preencha Quantidade e Valor Unitário para Ações/FIIs");
        }
        quantity = values.quantity;
        unitPrice = values.unit_price;
        calculatedAmount = quantity * unitPrice;
      } else {
        if (!values.amount || values.amount <= 0) {
          throw new Error("Preencha o Valor Investido");
        }
        calculatedAmount = values.amount;
      }

      const validationResult = validateInvestmentData({
        name: values.name!,
        type: values.type!,
        amount: calculatedAmount,
        quantity,
        unit_price: unitPrice,
        group_id: values.group_id === "none" ? null : values.group_id,
        maturity_date: values.maturity_date,
      });

      if (!validationResult.isValid) {
        throw new Error(validationResult.error || "Dados inválidos");
      }

      await withRateLimit(
        `investment:${userId}`,
        async () => {
          const { error } = await supabase.from("investments").insert({
            user_id: userId,
            name: values.name,
            type: values.type,
            amount: calculatedAmount,
            current_value: calculatedAmount,
            quantity,
            unit_price: unitPrice,
            group_id: values.group_id === "none" ? null : values.group_id,
            maturity_date: values.maturity_date,
          });

          if (error) throw error;

          if (values.goal_id && values.goal_id !== "none") {
            const { data: goalData, error: fetchError } = await supabase
              .from("investment_goals")
              .select("current_amount")
              .eq("id", values.goal_id)
              .single();

            if (!fetchError && goalData) {
              await supabase
                .from("investment_goals")
                .update({
                  current_amount: goalData.current_amount + calculatedAmount,
                })
                .eq("id", values.goal_id);
            }
          }
        },
        30
      );

      toast({
        title: "Sucesso",
        description: "Investimento adicionado com sucesso!",
      });

      resetForm();
      setOpen(false);
      if (onSuccess) onSuccess();
    } catch (error) {
      console.error("Erro ao criar investimento:", error);
      toast({
        title: "Erro",
        description: error instanceof Error ? error.message : "Erro ao criar investimento",
        variant: "destructive",
      });
      throw error;
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger || <Button>Adicionar Investimento</Button>}</DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Adicionar Investimento</DialogTitle>
          <DialogDescription>Preencha os dados do seu investimento</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="name">Nome</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => handleChange("name", e.target.value)}
              maxLength={SECURITY_LIMITS.MAX_NAME_LENGTH}
              placeholder="Ex: PETR4, MXRF11..."
            />
            {errors.name && <p className="text-sm text-destructive mt-1">{errors.name}</p>}
          </div>

          <div>
            <Label htmlFor="type">Tipo</Label>
            <Select value={formData.type} onValueChange={(value) => handleChange("type", value)}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione" />
              </SelectTrigger>
              <SelectContent>
                {ALLOWED_INVESTMENT_TYPES.map((type) => (
                  <SelectItem key={type} value={type}>
                    {type}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.type && <p className="text-sm text-destructive mt-1">{errors.type}</p>}
          </div>

          {showQuantityPriceFields ? (
            <>
              <div>
                <Label htmlFor="quantity">Quantidade</Label>
                <Input
                  id="quantity"
                  type="number"
                  min="0"
                  max={SECURITY_LIMITS.MAX_QUANTITY}
                  value={formData.quantity || ""}
                  onChange={(e) => handleChange("quantity", e.target.value)}
                  placeholder="Ex: 100"
                />
              </div>

              <div>
                <Label htmlFor="unit_price">Valor Unitário</Label>
                <Input
                  id="unit_price"
                  type="number"
                  step="0.01"
                  min="0"
                  max={SECURITY_LIMITS.MAX_AMOUNT}
                  value={formData.unit_price || ""}
                  onChange={(e) => handleChange("unit_price", e.target.value)}
                  placeholder="Ex: 25.50"
                />
              </div>

              {formData.quantity && formData.unit_price && (
                <div className="p-3 bg-muted rounded-md">
                  <p className="text-sm text-muted-foreground">Valor Total</p>
                  <p className="text-lg font-semibold">
                    {(formData.quantity * formData.unit_price).toLocaleString("pt-BR", {
                      style: "currency",
                      currency: "BRL",
                    })}
                  </p>
                </div>
              )}
            </>
          ) : (
            <div>
              <Label htmlFor="amount">Valor Investido</Label>
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
          )}

          <div>
            <Label htmlFor="group">Grupo (opcional)</Label>
            <Select value={formData.group_id} onValueChange={(value) => handleChange("group_id", value)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Nenhum grupo</SelectItem>
                {groups.map((group) => (
                  <SelectItem key={group.id} value={group.id}>
                    {group.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="goal">Meta (opcional)</Label>
            <Select value={formData.goal_id} onValueChange={(value) => handleChange("goal_id", value)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Nenhuma meta</SelectItem>
                {investmentGoals.map((goal) => (
                  <SelectItem key={goal.id} value={goal.id}>
                    {goal.name} ({((goal.current_amount / goal.target_amount) * 100).toFixed(1)}% completo)
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="maturity_date">Data de Vencimento (opcional)</Label>
            <Input
              id="maturity_date"
              type="date"
              value={formData.maturity_date || ""}
              onChange={(e) => handleChange("maturity_date", e.target.value)}
            />
          </div>

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
