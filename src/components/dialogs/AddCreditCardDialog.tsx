import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { ensureAuthenticated, sanitizeInput, sanitizeInteger } from "@/utils/security";

interface AddCreditCardDialogProps {
    onSuccess?: () => void;
    trigger?: React.ReactNode;
}

export const AddCreditCardDialog = ({ onSuccess, trigger }: AddCreditCardDialogProps) => {
    const [open, setOpen] = useState(false);
    const { toast } = useToast();
    const [isSubmitting, setIsSubmitting] = useState(false);

    const [formData, setFormData] = useState({
        name: "",
        description: "",
        closing_day: 1,
        due_day: 10,
        limit_amount: "",
    });

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setFormData((prev) => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (isSubmitting) return;

        try {
            setIsSubmitting(true);
            const userId = await ensureAuthenticated();

            const name = sanitizeInput(formData.name);
            if (!name) throw new Error("Nome é obrigatório");

            const closingDay = sanitizeInteger(formData.closing_day);
            const dueDay = sanitizeInteger(formData.due_day);

            if (closingDay < 1 || closingDay > 31) throw new Error("Dia de fechamento inválido");
            if (dueDay < 1 || dueDay > 31) throw new Error("Dia de vencimento inválido");

            const { error } = await supabase.from("credit_cards").insert({
                user_id: userId,
                name,
                description: sanitizeInput(formData.description),
                closing_day: closingDay,
                due_day: dueDay,
                limit_amount: formData.limit_amount ? parseFloat(formData.limit_amount) : null,
            });

            if (error) throw error;

            toast({ title: "Sucesso", description: "Cartão de crédito adicionado!" });
            setOpen(false);
            setFormData({
                name: "",
                description: "",
                closing_day: 1,
                due_day: 10,
                limit_amount: "",
            });
            onSuccess?.();
        } catch (error) {
            console.error("Erro ao adicionar cartão:", error);
            toast({
                title: "Erro",
                description: error instanceof Error ? error.message : "Erro desconhecido",
                variant: "destructive",
            });
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                {trigger || <Button variant="outline">Adicionar Cartão</Button>}
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>Novo Cartão de Crédito</DialogTitle>
                    <DialogDescription>Cadastre um novo cartão para gerenciar suas faturas.</DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="name">Nome do Cartão *</Label>
                        <Input
                            id="name"
                            name="name"
                            value={formData.name}
                            onChange={handleChange}
                            placeholder="Ex: Nubank, Visa XP"
                            required
                        />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="description">Descrição</Label>
                        <Input
                            id="description"
                            name="description"
                            value={formData.description}
                            onChange={handleChange}
                            placeholder="Opcional"
                        />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="closing_day">Dia Fechamento *</Label>
                            <Input
                                id="closing_day"
                                name="closing_day"
                                type="number"
                                min="1"
                                max="31"
                                value={formData.closing_day}
                                onChange={handleChange}
                                required
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="due_day">Dia Vencimento *</Label>
                            <Input
                                id="due_day"
                                name="due_day"
                                type="number"
                                min="1"
                                max="31"
                                value={formData.due_day}
                                onChange={handleChange}
                                required
                            />
                        </div>
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="limit_amount">Limite (R$)</Label>
                        <Input
                            id="limit_amount"
                            name="limit_amount"
                            type="number"
                            step="0.01"
                            value={formData.limit_amount}
                            onChange={handleChange}
                            placeholder="0,00"
                        />
                    </div>
                    <div className="flex justify-end gap-2 pt-4">
                        <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                            Cancelar
                        </Button>
                        <Button type="submit" disabled={isSubmitting}>
                            {isSubmitting ? "Salvando..." : "Salvar"}
                        </Button>
                    </div>
                </form>
            </DialogContent>
        </Dialog>
    );
};
