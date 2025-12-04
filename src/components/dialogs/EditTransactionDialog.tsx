import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { sanitizeInput, sanitizeAmount, sanitizeDate } from "@/utils/security";

interface Transaction {
  id: string;
  description: string;
  amount: number;
  category: string;
  date: string;
  type: "income" | "expense";
  is_pending?: boolean;
}

interface EditTransactionDialogProps {
  transaction: Transaction | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const EditTransactionDialog = ({ transaction, isOpen, onClose, onSuccess }: EditTransactionDialogProps) => {
  const [loading, setLoading] = useState(false);
  const [customTags, setCustomTags] = useState<string[]>([]);
  const [formData, setFormData] = useState({
    description: "",
    amount: "",
    category: "",
    date: "",
    is_pending: false,
  });
  const { toast } = useToast();

  useEffect(() => {
    if (transaction) {
      setFormData({
        description: transaction.description,
        amount: Math.abs(transaction.amount).toString(),
        category: transaction.category,
        date: transaction.date,
        is_pending: transaction.is_pending || false,
      });

      supabase.auth.getUser().then(({ data }) => {
        if (data.user) fetchCustomTags(data.user.id);
      });
    }
  }, [transaction]);

  const fetchCustomTags = async (userId: string) => {
    const { data } = await supabase.from("user_tags").select("name").order("name");
    if (data) {
      setCustomTags(data.map((t) => t.name));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!transaction) return;

    setLoading(true);
    try {
      const amount = sanitizeAmount(formData.amount);
      if (amount <= 0) throw new Error("O valor deve ser positivo");

      const finalAmount = transaction.amount < 0 ? -amount : amount;

      const pendingType = formData.is_pending ? (transaction.type === "income" ? "receivable" : "payable") : null;

      const updateData: any = {
        description: sanitizeInput(formData.description),
        amount: finalAmount,
        category: formData.category,
        date: sanitizeDate(formData.date),
        is_pending: formData.is_pending,
        pending_type: pendingType,
      };

      if (formData.is_pending) {
        updateData.paid_at = null;
      } else if (!formData.is_pending && transaction.is_pending) {
        updateData.paid_at = new Date().toISOString();
      }

      const { error } = await supabase.from("transactions").update(updateData).eq("id", transaction.id);

      if (error) throw error;

      toast({ title: "Sucesso", description: "Transação atualizada!" });
      onSuccess();
      onClose();
    } catch (error) {
      console.error(error);
      toast({ title: "Erro", description: "Falha ao atualizar transação", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Editar Transação</DialogTitle>
          <DialogDescription>Atualize os detalhes do lançamento.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="edit-desc">Descrição</Label>
            <Input
              id="edit-desc"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              required
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="edit-amount">Valor</Label>
              <Input
                id="edit-amount"
                type="number"
                step="0.01"
                value={formData.amount}
                onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-date">Data</Label>
              <Input
                id="edit-date"
                type="date"
                value={formData.date}
                onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                required
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="edit-cat">Categoria</Label>
            <Select value={formData.category} onValueChange={(val) => setFormData({ ...formData, category: val })}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {customTags.map((cat) => (
                  <SelectItem key={cat} value={cat}>
                    {cat}
                  </SelectItem>
                ))}
                {customTags.length === 0 && <div className="p-2 text-sm text-muted-foreground text-center">Sem categorias</div>}
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center justify-between border p-3 rounded-md">
            <div className="space-y-0.5">
              <Label className="text-base">Pendente</Label>
              <p className="text-xs text-muted-foreground">Marcar como {transaction?.type === "income" ? "a receber" : "a pagar"}</p>
            </div>
            <Switch checked={formData.is_pending} onCheckedChange={(checked) => setFormData({ ...formData, is_pending: checked })} />
          </div>
          <div className="flex gap-2 pt-4">
            <Button type="button" variant="outline" className="flex-1" onClick={onClose}>
              Cancelar
            </Button>
            <Button type="submit" className="flex-1" disabled={loading}>
              {loading ? "Salvando..." : "Salvar"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
