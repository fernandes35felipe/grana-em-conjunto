import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowUpCircle, ArrowDownCircle, Calendar, Trash2, Plus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { AddTransactionDialog } from "@/components/dialogs/AddTransactionDialog";

interface EventDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  eventId: string;
  eventName: string;
  eventDate: string;
  groupId?: string; // NOVO: Permite passar o grupo ao qual o evento pertence
  onUpdate?: () => void;
}

interface Transaction {
  id: string;
  description: string;
  amount: number;
  type: "income" | "expense";
  category: string;
  date: string;
}

export const EventDetailsModal = ({ isOpen, onClose, eventId, eventName, eventDate, groupId, onUpdate }: EventDetailsModalProps) => {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const loadEventTransactions = async () => {
    if (!eventId) return;
    setLoading(true);
    try {
      const { data, error } = await supabase.from("transactions").select("*").eq("event_id", eventId).order("date", { ascending: false });
      if (error) throw error;

      setTransactions(
        data?.map((t) => ({
          id: t.id,
          description: t.description,
          amount: Number(t.amount),
          type: t.type as "income" | "expense",
          category: t.category,
          date: t.date,
        })) || []
      );
    } catch (error) {
      console.error("Erro ao carregar transações do evento:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar os itens do evento",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadEventTransactions();
    }
  }, [isOpen, eventId]);

  const handleDeleteTransaction = async (id: string) => {
    try {
      const { error } = await supabase.from("transactions").delete().eq("id", id);
      if (error) throw error;

      toast({ title: "Sucesso", description: "Item removido do evento" });
      loadEventTransactions();
      if (onUpdate) onUpdate();
    } catch (error) {
      console.error("Erro ao deletar:", error);
      toast({ title: "Erro", description: "Falha ao remover item", variant: "destructive" });
    }
  };

  const handleDeleteEvent = async () => {
    if (!confirm("Tem certeza? Isso apagará o evento e TODAS as transações dentro dele.")) return;
    try {
      const { error } = await supabase
        .from("events" as any)
        .delete()
        .eq("id", eventId);
      if (error) throw error;

      toast({ title: "Sucesso", description: "Evento removido com sucesso" });
      onClose();
      if (onUpdate) onUpdate();
    } catch (error) {
      toast({ title: "Erro", description: "Falha ao remover evento", variant: "destructive" });
    }
  };

  const totalAmount = transactions.reduce((acc, t) => acc + (t.type === "income" ? t.amount : -Math.abs(t.amount)), 0);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between pr-8">
            <DialogTitle className="text-2xl">{eventName}</DialogTitle>
            <Button variant="ghost" size="icon" onClick={handleDeleteEvent} className="text-destructive">
              <Trash2 className="h-5 w-5" />
            </Button>
          </div>
          <DialogDescription>
            {new Date(eventDate).toLocaleDateString("pt-BR")} • Total:{" "}
            <span className={cn("font-bold", totalAmount >= 0 ? "text-success" : "text-destructive")}>
              {totalAmount.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
            </span>
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 mt-4">
          <div className="flex gap-2">
            <AddTransactionDialog
              type="expense"
              eventId={eventId}
              defaultGroupId={groupId} // Passa o ID do grupo para vincular a transação
              onSuccess={() => {
                loadEventTransactions();
                if (onUpdate) onUpdate();
              }}
              trigger={
                <Button className="flex-1" variant="outline">
                  <Plus className="h-4 w-4 mr-2" /> Adicionar Despesa
                </Button>
              }
            />
            <AddTransactionDialog
              type="income"
              eventId={eventId}
              defaultGroupId={groupId} // Passa o ID do grupo para vincular a transação
              onSuccess={() => {
                loadEventTransactions();
                if (onUpdate) onUpdate();
              }}
              trigger={
                <Button className="flex-1" variant="outline">
                  <Plus className="h-4 w-4 mr-2" /> Adicionar Receita
                </Button>
              }
            />
          </div>

          <div className="space-y-2">
            {loading ? (
              <p className="text-center text-muted-foreground">Carregando...</p>
            ) : transactions.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">Nenhum lançamento neste evento.</p>
            ) : (
              transactions.map((t) => (
                <Card key={t.id} className="border border-border">
                  <CardContent className="p-3 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={cn("p-2 rounded-full", t.type === "income" ? "bg-success/10" : "bg-destructive/10")}>
                        {t.type === "income" ? (
                          <ArrowUpCircle className="h-4 w-4 text-success" />
                        ) : (
                          <ArrowDownCircle className="h-4 w-4 text-destructive" />
                        )}
                      </div>
                      <div>
                        <p className="font-medium text-sm">{t.description}</p>
                        <div className="flex items-center gap-2">
                          <Badge variant="secondary" className="text-[10px]">
                            {t.category}
                          </Badge>
                          <span className="text-[10px] text-muted-foreground">{new Date(t.date).toLocaleDateString("pt-BR")}</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className={cn("font-semibold text-sm", t.type === "income" ? "text-success" : "text-destructive")}>
                        {t.amount.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                      </span>
                      <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => handleDeleteTransaction(t.id)}>
                        <Trash2 className="h-3 w-3 text-muted-foreground" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
