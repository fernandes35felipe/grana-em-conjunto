import { useState } from "react";

import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

import { useToast } from "@/hooks/use-toast";
import { useSanitizedForm } from "@/hooks/useSanitizedForm";

import { supabase } from "@/integrations/supabase/client";

import { sanitizeInput, sanitizeColor, validateGroupData, ensureAuthenticated, withRateLimit, SECURITY_LIMITS } from "@/utils/security";

import type { GroupData } from "@/utils/security/types";

interface AddGroupDialogProps {
  trigger?: React.ReactNode;
  onGroupCreated?: () => void;
}

interface FormData extends Partial<GroupData> {
  color?: string;
}

const colors = [
  { value: "blue", label: "Azul", class: "bg-blue-500" },
  { value: "green", label: "Verde", class: "bg-green-500" },
  { value: "red", label: "Vermelho", class: "bg-red-500" },
  { value: "yellow", label: "Amarelo", class: "bg-yellow-500" },
  { value: "purple", label: "Roxo", class: "bg-purple-500" },
  { value: "pink", label: "Rosa", class: "bg-pink-500" },
  { value: "orange", label: "Laranja", class: "bg-orange-500" },
  { value: "teal", label: "Azul-verde", class: "bg-teal-500" },
];

const colorToHex: Record<string, string> = {
  blue: "#3B82F6",
  green: "#10B981",
  red: "#EF4444",
  yellow: "#F59E0B",
  purple: "#8B5CF6",
  pink: "#EC4899",
  orange: "#F97316",
  teal: "#14B8A6",
};

export const AddGroupDialog = ({ trigger, onGroupCreated }: AddGroupDialogProps) => {
  const [open, setOpen] = useState(false);
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
      description: "",
      color: "blue",
    },
    sanitizers: {
      name: (v) => sanitizeInput(v, SECURITY_LIMITS.MAX_NAME_LENGTH),
      description: (v) => sanitizeInput(v, SECURITY_LIMITS.MAX_DESCRIPTION_LENGTH),
      color: (v) => v,
    },
    validators: {
      name: (v) => ({
        isValid: v.length > 0 && v.length <= SECURITY_LIMITS.MAX_NAME_LENGTH,
        error: v.length === 0 ? "Nome obrigatório" : null,
      }),
      description: (v) => ({
        isValid: v.length <= SECURITY_LIMITS.MAX_DESCRIPTION_LENGTH,
        error: v.length > SECURITY_LIMITS.MAX_DESCRIPTION_LENGTH ? "Descrição muito longa" : null,
      }),
    },
    onSubmit: async (values) => {
      await submitGroup(values);
    },
  });

  const submitGroup = async (values: FormData) => {
    try {
      const userId = await ensureAuthenticated();

      const hexColor = colorToHex[values.color || "blue"];
      const sanitizedColor = sanitizeColor(hexColor);

      if (!sanitizedColor) {
        throw new Error("Cor inválida");
      }

      const validationResult = validateGroupData({
        name: values.name!,
        description: values.description || null,
        color: sanitizedColor,
        created_by: userId,
      });

      if (!validationResult.isValid) {
        throw new Error(validationResult.error || "Dados inválidos");
      }

      await withRateLimit(
        `group:${userId}`,
        async () => {
          const { data, error } = await supabase
            .from("groups")
            .insert({
              name: values.name,
              description: values.description || null,
              color: sanitizedColor,
              created_by: userId,
            })
            .select()
            .single();

          if (error) throw error;

          await supabase.from("group_members").insert({
            group_id: data.id,
            user_id: userId,
            is_admin: true,
          });
        },
        10
      );

      toast({
        title: "Sucesso",
        description: "Grupo criado com sucesso!",
      });

      resetForm();
      setOpen(false);
      if (onGroupCreated) onGroupCreated();
    } catch (error) {
      console.error("Erro ao criar grupo:", error);
      toast({
        title: "Erro",
        description: error instanceof Error ? error.message : "Erro ao criar grupo",
        variant: "destructive",
      });
      throw error;
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger || <Button>Criar Grupo</Button>}</DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Criar Novo Grupo</DialogTitle>
          <DialogDescription>Crie um grupo para compartilhar despesas com outras pessoas</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="name">Nome do Grupo *</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => handleChange("name", e.target.value)}
              maxLength={SECURITY_LIMITS.MAX_NAME_LENGTH}
              placeholder="Ex: Família, Casa, Viagem..."
            />
            {errors.name && <p className="text-sm text-destructive mt-1">{errors.name}</p>}
          </div>

          <div>
            <Label htmlFor="description">Descrição (opcional)</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => handleChange("description", e.target.value)}
              maxLength={SECURITY_LIMITS.MAX_DESCRIPTION_LENGTH}
              placeholder="Descreva o propósito deste grupo..."
              rows={3}
            />
            {errors.description && <p className="text-sm text-destructive mt-1">{errors.description}</p>}
          </div>

          <div>
            <Label htmlFor="color">Cor do Grupo</Label>
            <Select value={formData.color} onValueChange={(value) => handleChange("color", value)}>
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

          <div className="flex gap-2">
            <Button type="button" variant="outline" className="flex-1" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" className="flex-1" disabled={isSubmitting}>
              {isSubmitting ? "Criando..." : "Criar Grupo"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
