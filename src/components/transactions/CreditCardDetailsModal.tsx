import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowUpCircle, ArrowDownCircle, Trash2, CheckCircle2, AlertCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { CreditCard } from "@/types/credit-card";
import { getNextClosingDate, getNextDueDate } from "@/utils/credit-card-utils";

interface CreditCardDetailsModalProps {
    isOpen: boolean;
    onClose: () => void;
    card: CreditCard;
    onUpdate?: () => void;
}

interface Transaction {
    id: string;
    description: string;
    amount: number;
    type: "income" | "expense";
    category: string;
    date: string;
    is_pending: boolean;
    card_closing_date?: string;
}

export const CreditCardDetailsModal = ({ isOpen, onClose, card, onUpdate }: CreditCardDetailsModalProps) => {
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [loading, setLoading] = useState(false);
    const [paying, setPaying] = useState(false);
    const { toast } = useToast();

    const [closingDate, setClosingDate] = useState<Date>(new Date());
    const [dueDate, setDueDate] = useState<Date>(new Date());

    useEffect(() => {
        if (isOpen && card) {
            // Determine the current "Active" invoice closing date
            // For simplicity, we look for the next closing date relative to today
            const nextClosing = getNextClosingDate(card);
            setClosingDate(nextClosing);
            setDueDate(getNextDueDate(card, nextClosing));
            loadCardTransactions(nextClosing);
        }
    }, [isOpen, card]);

    const loadCardTransactions = async (closeDate: Date) => {
        setLoading(true);
        try {
            // Find transactions that are credit card, belong to this card, are pending,
            // and have a closing date equal to the calculated closing date OR are effectively "open" (legacy logic might differ, but let's stick to closing_date column if populated)
            // Actually, my AddTransactionDialog populates 'card_closing_date'. 
            // We should filter by that.

            const closeDateStr = format(closeDate, 'yyyy-MM-dd');

            const { data, error } = await supabase
                .from("transactions")
                .select("*")
                .eq("credit_card_id", card.id)
                .eq("is_credit_card", true)
                .eq("is_pending", true) // Show only pending (unpaid) items for the invoice
                .lte("card_closing_date", closeDateStr) // Include any overdue/past pending items too? or strict equality?
                // Strict equality is safer for simple buckets, but user might have missed a previous month.
                // For now, strict match to current invoice bucket.
                .order("date", { ascending: false });

            if (error) throw error;

            setTransactions(
                data?.map((t) => ({
                    id: t.id,
                    description: t.description,
                    amount: Number(t.amount),
                    type: t.type as "income" | "expense",
                    category: t.category,
                    date: t.date,
                    is_pending: t.is_pending,
                    card_closing_date: t.card_closing_date
                })) || []
            );
        } catch (error) {
            console.error("Erro ao carregar fatura:", error);
            toast({
                title: "Erro",
                description: "Não foi possível carregar a fatura",
                variant: "destructive",
            });
        } finally {
            setLoading(false);
        }
    };

    const handlePayInvoice = async () => {
        if (transactions.length === 0) return;
        if (!confirm(`Confirma o pagamento desta fatura no valor de ${totalAmount.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}?`)) return;

        setPaying(true);
        try {
            const totalAbs = Math.abs(totalAmount);

            // 1. Create the Payment Transaction (Expense)
            const { error: payError } = await supabase.from("transactions").insert({
                user_id: card.user_id, // Assuming we have access to user_id (it's in card)
                description: `Fatura ${card.name} (${format(closingDate, 'MM/yyyy')})`,
                amount: -totalAbs,
                type: 'expense',
                category: 'Pagamentos', // Or 'Cartão de Crédito'
                date: format(new Date(), 'yyyy-MM-dd'),
                is_pending: false, // Paid immediately
                paid_at: new Date().toISOString(),
                is_credit_card: false, // This is a "Cash" payment
            });

            if (payError) throw payError;

            // 2. Mark items as paid (settled)
            const idsToUpdate = transactions.map(t => t.id);
            const { error: updateError } = await supabase
                .from("transactions")
                .update({
                    is_pending: false, // No longer pending
                    // paid_at: new Date().toISOString(), // Optional: mark when they were settled
                })
                .in("id", idsToUpdate);

            if (updateError) throw updateError;

            toast({ title: "Fatura Paga", description: "O pagamento foi registrado com sucesso." });
            onClose();
            onUpdate?.();

        } catch (error) {
            console.error("Erro ao pagar fatura:", error);
            toast({ title: "Erro", description: "Falha ao processar pagamento", variant: "destructive" });
        } finally {
            setPaying(false);
        }
    };

    const handleDeleteTransaction = async (id: string) => {
        if (!confirm("Remover este item da fatura?")) return;
        try {
            await supabase.from("transactions").delete().eq("id", id);
            toast({ title: "Item removido" });
            loadCardTransactions(closingDate);
            onUpdate?.();
        } catch (error) {
            toast({ title: "Erro", variant: "destructive" });
        }
    }

    const totalAmount = transactions.reduce((acc, t) => acc + (t.type === "income" ? t.amount : -Math.abs(t.amount)), 0);

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <div className="flex items-center justify-between">
                        <DialogTitle className="text-2xl flex items-center gap-2">
                            {card.name}
                            <Badge variant="outline" className="text-xs font-normal">Fatura {format(closingDate, 'dd/MM')}</Badge>
                        </DialogTitle>
                    </div>
                    <DialogDescription className="space-y-1">
                        <div className="flex items-center gap-4 text-sm mt-2">
                            <div className="flex flex-col">
                                <span className="text-muted-foreground">Vencimento</span>
                                <span className="font-semibold text-foreground">{format(dueDate, 'dd/MM/yyyy')}</span>
                            </div>
                            <div className="flex flex-col">
                                <span className="text-muted-foreground">Valor Total</span>
                                <span className={cn("font-bold text-lg", totalAmount < 0 ? "text-destructive" : "text-success")}>
                                    {Math.abs(totalAmount).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                                </span>
                            </div>
                        </div>
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4 mt-2">
                    <div className="space-y-2">
                        {loading ? (
                            <p className="text-center text-muted-foreground py-4">Carregando...</p>
                        ) : transactions.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-8 text-center bg-muted/20 rounded-lg">
                                <CheckCircle2 className="h-10 w-10 text-muted-foreground mb-2 opacity-20" />
                                <p className="text-muted-foreground">Nenhuma despesa pendente nesta fatura.</p>
                            </div>
                        ) : (
                            transactions.map((t) => (
                                <Card key={t.id} className="border-none shadow-sm bg-muted/10">
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
                                                {Math.abs(t.amount).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                                            </span>
                                            <Button variant="ghost" size="icon" className="h-6 w-6 opacity-50 hover:opacity-100" onClick={() => handleDeleteTransaction(t.id)}>
                                                <Trash2 className="h-3 w-3 text-destructive" />
                                            </Button>
                                        </div>
                                    </CardContent>
                                </Card>
                            ))
                        )}
                    </div>
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={onClose}>Fechar</Button>
                    <Button
                        onClick={handlePayInvoice}
                        className="bg-primary"
                        disabled={transactions.length === 0 || paying}
                    >
                        {paying ? "Processando..." : "Pagar Fatura"}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};
