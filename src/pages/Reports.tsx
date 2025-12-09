import { useState } from "react";
import { format } from "date-fns";
import { Calendar as CalendarIcon, Download } from "lucide-react";
import { DateRange } from "react-day-picker";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { useToast } from "@/hooks/use-toast";
import { generatePDF } from "@/utils/reports/pdfGenerator";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export default function Reports() {
    const { toast } = useToast();
    const [date, setDate] = useState<DateRange | undefined>({
        from: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
        to: new Date(),
    });

    const { data: transactions } = useQuery({
        queryKey: ["reports_transactions", date?.from, date?.to],
        queryFn: async () => {
            if (!date?.from || !date?.to) return [];

            const { data, error } = await supabase
                .from("transactions")
                .select("*")
                .gte("date", date.from.toISOString())
                .lte("date", date.to.toISOString());

            if (error) throw error;
            return data;
        },
        enabled: !!date?.from && !!date?.to,
    });

    const { data: investments } = useQuery({
        queryKey: ["reports_investments"],
        queryFn: async () => {
            const { data, error } = await supabase
                .from("investments")
                .select("*");

            if (error) throw error;
            return data;
        },
    });

    const handleExportPDF = async () => {
        if (!transactions || !investments || !date?.from || !date?.to) {
            toast({
                title: "Erro ao gerar relatório",
                description: "Aguarde os dados serem carregados.",
                variant: "destructive",
            });
            return;
        }

        try {
            await generatePDF({
                transactions,
                investments,
                dateRange: {
                    from: date.from,
                    to: date.to,
                },
            });

            toast({
                title: "Sucesso!",
                description: "Relatório gerado com sucesso.",
            });
        } catch (error) {
            console.error(error);
            toast({
                title: "Erro",
                description: "Falha ao gerar o PDF.",
                variant: "destructive",
            });
        }
    };

    const totalExpenses = transactions?.filter(t => t.type === 'expense').reduce((acc, curr) => acc + Number(curr.amount), 0) || 0;
    const totalIncome = transactions?.filter(t => t.type === 'income').reduce((acc, curr) => acc + Number(curr.amount), 0) || 0;
    const totalInvested = investments?.reduce((acc, curr) => acc + Number(curr.current_amount), 0) || 0;

    return (
        <DashboardLayout>
            <div className="p-4 md:p-6 space-y-6 animate-fade-in">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <h1 className="text-3xl font-bold tracking-tight">Relatórios</h1>

                    <div className="flex gap-2">
                        <Popover>
                            <PopoverTrigger asChild>
                                <Button
                                    id="date"
                                    variant={"outline"}
                                    className={cn(
                                        "w-[300px] justify-start text-left font-normal",
                                        !date && "text-muted-foreground"
                                    )}
                                >
                                    <CalendarIcon className="mr-2 h-4 w-4" />
                                    {date?.from ? (
                                        date.to ? (
                                            <>
                                                {format(date.from, "LLL dd, y")} -{" "}
                                                {format(date.to, "LLL dd, y")}
                                            </>
                                        ) : (
                                            format(date.from, "LLL dd, y")
                                        )
                                    ) : (
                                        <span>Selecione o período</span>
                                    )}
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0" align="end">
                                <Calendar
                                    initialFocus
                                    mode="range"
                                    defaultMonth={date?.from}
                                    selected={date}
                                    onSelect={setDate}
                                    numberOfMonths={2}
                                />
                            </PopoverContent>
                        </Popover>

                        <Button onClick={handleExportPDF}>
                            <Download className="mr-2 h-4 w-4" />
                            Exportar PDF
                        </Button>
                    </div>
                </div>

                <div className="grid gap-4 md:grid-cols-3">
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Entradas</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold text-green-600">
                                {new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(totalIncome)}
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Saídas</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold text-red-600">
                                {new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(totalExpenses)}
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Total Investido</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold text-blue-600">
                                {new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(totalInvested)}
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Detailed tables or additional charts can go here */}
                <div className="grid gap-4 md:grid-cols-2">
                    <Card className="col-span-2">
                        <CardHeader>
                            <CardTitle>Resumo de Transações</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-4">
                                {transactions?.slice(0, 5).map((t) => (
                                    <div key={t.id} className="flex items-center justify-between border-b pb-2 last:border-0 last:pb-0">
                                        <div>
                                            <p className="font-medium">{t.description}</p>
                                            <p className="text-sm text-muted-foreground">{format(new Date(t.date), "dd/MM/yyyy")}</p>
                                        </div>
                                        <span className={cn(
                                            "font-bold",
                                            t.type === 'income' ? "text-green-600" : "text-red-600"
                                        )}>
                                            {t.type === 'income' ? '+' : ''}{new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(Number(t.amount))}
                                        </span>
                                    </div>
                                ))}
                                {(!transactions || transactions.length === 0) && (
                                    <p className="text-center text-muted-foreground py-4">Nenhuma transação no período.</p>
                                )}
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </DashboardLayout>
    );
}
