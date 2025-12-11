import { useState, useEffect } from "react";
import { Plus, CreditCard as CardIcon, Edit, Trash2, Calendar, ShoppingCart, List } from "lucide-react";
import { format } from "date-fns";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { AddCreditCardDialog } from "@/components/dialogs/AddCreditCardDialog";
import { supabase } from "@/integrations/supabase/client";
import { CreditCard } from "@/types/credit-card";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

interface PurchaseGroup {
    id: string; // recurrence_id or transaction_id
    description: string;
    category: string;
    totalAmount: number;
    installmentCount: number;
    installmentValue: number;
    firstDate: string;
    isRecurring: boolean;
}

export const CreditCardsTab = () => {
    const [cards, setCards] = useState<CreditCard[]>([]);
    const [deviceType, setDeviceType] = useState<'mobile' | 'desktop'>('desktop');
    const [purchases, setPurchases] = useState<Record<string, PurchaseGroup[]>>({}); // Key: Card ID
    const [loading, setLoading] = useState(true);
    const { toast } = useToast();

    useEffect(() => {
        loadCards();
    }, []);

    const loadCards = async () => {
        setLoading(true);
        try {
            const { data, error } = await supabase.from("credit_cards").select("*").order("name");
            if (error) throw error;
            setCards(data || []);
            // Load purchases for all cards
            if (data) {
                data.forEach(c => loadPurchases(c.id));
            }
        } catch (error) {
            console.error("Error loading cards:", error);
            toast({ title: "Erro", description: "Falha ao carregar cartões", variant: "destructive" });
        } finally {
            setLoading(false);
        }
    };

    const loadPurchases = async (cardId: string) => {
        try {
            const { data, error } = await supabase
                .from("transactions")
                .select("*")
                .eq("credit_card_id", cardId)
                .is("paid_at", null) // Fetch mostly pending ones, or all? User said "ver os lançamentos feitos". Probably all history.
                // Let's fetch ALL for now, or maybe last 6 months? 
                // Requirement: "ver os lançamentos feitos no cartão"
                .order("date", { ascending: false });

            if (error) throw error;

            if (!data) return;

            // Group by recurrence_id (for installments/fixed) or id (single)
            const groups: Record<string, PurchaseGroup> = {};

            (data as any[]).forEach(t => {
                const groupId = t.recurrence_id || t.id;

                if (!groups[groupId]) {
                    groups[groupId] = {
                        id: groupId,
                        description: t.description.replace(/\(\d+\/\d+\)$/, '').trim(), // Remove (1/12) suffix
                        category: t.category,
                        totalAmount: 0,
                        installmentCount: 0,
                        installmentValue: Math.abs(t.amount),
                        firstDate: t.date,
                        isRecurring: t.is_fixed || t.is_recurring || (t.total_installments && t.total_installments > 1) || false
                    };
                }

                const group = groups[groupId];
                group.totalAmount += Math.abs(t.amount);
                group.installmentCount++;
                // Keep earliest date as firstDate
                if (new Date(t.date) < new Date(group.firstDate)) {
                    group.firstDate = t.date;
                }
            });

            setPurchases(prev => ({
                ...prev,
                [cardId]: Object.values(groups).sort((a, b) => new Date(b.firstDate).getTime() - new Date(a.firstDate).getTime())
            }));

        } catch (error) {
            console.error(`Error loading purchases for ${cardId}`, error);
        }
    }

    const deleteCard = async (id: string) => {
        if (!confirm("Excluir este cartão? O histórico pode ser afetado.")) return;
        try {
            await supabase.from("credit_cards").delete().eq("id", id);
            toast({ title: "Cartão removido" });
            loadCards();
        } catch (e) {
            toast({ title: "Erro ao remover", variant: "destructive" });
        }
    }

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-2xl font-bold tracking-tight">Meus Cartões</h2>
                    <p className="text-muted-foreground">Gerencie seus cartões e limites.</p>
                </div>
                <AddCreditCardDialog onSuccess={loadCards} />
            </div>

            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {cards.map(card => (
                    <Card key={card.id} className="flex flex-col h-full border-l-4 border-l-primary">
                        <CardHeader className="pb-2">
                            <div className="flex justify-between items-start">
                                <div className="space-y-1">
                                    <CardTitle className="flex items-center gap-2">
                                        <CardIcon className="h-5 w-5 text-primary" />
                                        {card.name}
                                    </CardTitle>
                                    <CardDescription>{card.description || "Sem descrição"}</CardDescription>
                                </div>
                                <Button variant="ghost" size="icon" onClick={() => deleteCard(card.id)} className="text-destructive hover:bg-destructive/10">
                                    <Trash2 className="h-4 w-4" />
                                </Button>
                            </div>
                        </CardHeader>
                        <CardContent className="flex-1 space-y-4">
                            <div className="grid grid-cols-2 gap-4 text-sm">
                                <div>
                                    <p className="text-muted-foreground">Fechamento</p>
                                    <p className="font-semibold">Dia {card.closing_day}</p>
                                </div>
                                <div>
                                    <p className="text-muted-foreground">Vencimento</p>
                                    <p className="font-semibold">Dia {card.due_day}</p>
                                </div>
                                {card.limit_amount && (
                                    <div className="col-span-2">
                                        <p className="text-muted-foreground">Limite</p>
                                        <p className="font-semibold text-lg">{card.limit_amount.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}</p>
                                    </div>
                                )}
                            </div>

                            <div className="pt-2 border-t">
                                <Accordion type="single" collapsible className="w-full">
                                    <AccordionItem value="purchases" className="border-b-0">
                                        <AccordionTrigger className="hover:no-underline py-2">
                                            <div className="flex items-center gap-2 text-sm font-medium">
                                                <ShoppingCart className="h-4 w-4" />
                                                Ver Compras ({purchases[card.id]?.length || 0})
                                            </div>
                                        </AccordionTrigger>
                                        <AccordionContent>
                                            <ScrollArea className="h-[200px] w-full pr-4">
                                                <div className="space-y-3 pt-2">
                                                    {purchases[card.id]?.map(group => (
                                                        <div key={group.id} className="flex justify-between items-center text-sm p-2 bg-muted/50 rounded-lg">
                                                            <div className="space-y-0.5">
                                                                <p className="font-medium">{group.description}</p>
                                                                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                                                    <Badge variant="outline" className="text-[10px] h-5">{group.category}</Badge>
                                                                    <span>{new Date(group.firstDate).toLocaleDateString("pt-BR")}</span>
                                                                </div>
                                                            </div>
                                                            <div className="text-right">
                                                                <p className="font-bold">{group.totalAmount.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}</p>
                                                                {group.isRecurring && (
                                                                    <p className="text-xs text-muted-foreground">
                                                                        {group.installmentCount}x de {group.installmentValue.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                                                                    </p>
                                                                )}
                                                            </div>
                                                        </div>
                                                    ))}
                                                    {(!purchases[card.id] || purchases[card.id].length === 0) && (
                                                        <p className="text-xs text-center text-muted-foreground py-4">Nenhuma compra registrada.</p>
                                                    )}
                                                </div>
                                            </ScrollArea>
                                        </AccordionContent>
                                    </AccordionItem>
                                </Accordion>
                            </div>
                        </CardContent>
                    </Card>
                ))}

                {cards.length === 0 && !loading && (
                    <div className="col-span-full flex flex-col items-center justify-center p-8 border rounded-lg border-dashed text-center">
                        <CardIcon className="h-10 w-10 text-muted-foreground mb-4" />
                        <h3 className="text-lg font-medium">Nenhum cartão cadastrado</h3>
                        <p className="text-muted-foreground mb-4">Cadastre seus cartões de crédito para gerenciar faturas e acompanhar gastos.</p>
                        <AddCreditCardDialog onSuccess={loadCards} />
                    </div>
                )}
            </div>
        </div>
    );
};
