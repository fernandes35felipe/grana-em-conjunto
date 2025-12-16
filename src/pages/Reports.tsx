import { useState, useEffect } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { CategoryChart } from "@/components/reports/CategoryChart";
import { supabase } from "@/integrations/supabase/client";
import { Transaction } from "@/components/transactions/types";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { format, startOfMonth, endOfMonth, startOfYear, endOfYear } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Download, PieChart, BarChart3 } from "lucide-react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import html2canvas from "html2canvas";
import { useToast } from "@/hooks/use-toast";

export default function Reports() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  // Iniciamos com o mês atual por padrão
  const [selectedMonth, setSelectedMonth] = useState<string>(String(new Date().getMonth()));
  const [selectedYear, setSelectedYear] = useState<string>(String(new Date().getFullYear()));
  const [chartType, setChartType] = useState<"bar" | "pie">("bar");
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    fetchTransactions();
  }, [selectedMonth, selectedYear]);

  const fetchTransactions = async () => {
    setLoading(true);
    try {
      let start: string;
      let end: string;

      // Lógica para Ano Inteiro vs Mês Específico
      if (selectedMonth === "all") {
        const date = new Date(Number(selectedYear), 0, 1);
        start = startOfYear(date).toISOString();
        end = endOfYear(date).toISOString();
      } else {
        const date = new Date(Number(selectedYear), Number(selectedMonth), 1);
        start = startOfMonth(date).toISOString();
        end = endOfMonth(date).toISOString();
      }

      const { data, error } = await supabase
        .from("transactions")
        .select("*")
        .gte("date", start)
        .lte("date", end)
        .order("date", { ascending: false });

      if (error) throw error;
      if (data) setTransactions(data as Transaction[]);
    } catch (error) {
      console.error("Erro ao buscar transações:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleExportPDF = async () => {
    try {
      toast({ title: "Gerando PDF...", description: "Aguarde um momento." });

      const doc = new jsPDF();

      // Título dinâmico no PDF
      const periodText =
        selectedMonth === "all"
          ? `Ano de ${selectedYear}`
          : `${format(new Date(Number(selectedYear), Number(selectedMonth)), "MMMM yyyy", { locale: ptBR })}`;

      doc.setFontSize(18);
      doc.text(`Relatório Financeiro - ${periodText}`, 14, 20);

      const tableData = transactions.map((t) => [
        format(new Date(t.date), "dd/MM/yyyy"),
        t.description,
        t.category,
        t.type === "income" ? "Receita" : "Despesa",
        new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(t.amount),
      ]);

      autoTable(doc, {
        startY: 30,
        head: [["Data", "Descrição", "Categoria", "Tipo", "Valor"]],
        body: tableData,
      });

      let finalY = (doc as any).lastAutoTable.finalY || 30;

      if (finalY > 200) {
        doc.addPage();
        finalY = 20;
      } else {
        finalY += 20;
      }

      doc.setFontSize(14);
      doc.text("Análise Gráfica", 14, finalY);
      finalY += 10;

      const addChartToPdf = async (elementId: string, yPos: number) => {
        const element = document.getElementById(elementId);
        if (element) {
          const canvas = await html2canvas(element, { scale: 2 });
          const imgData = canvas.toDataURL("image/png");
          const imgProps = doc.getImageProperties(imgData);
          const pdfWidth = doc.internal.pageSize.getWidth() - 28;
          const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;

          doc.addImage(imgData, "PNG", 14, yPos, pdfWidth, pdfHeight);
          return yPos + pdfHeight + 10;
        }
        return yPos;
      };

      let currentY = await addChartToPdf("chart-income", finalY);

      if (currentY > 250) {
        doc.addPage();
        currentY = 20;
      }

      await addChartToPdf("chart-expense", currentY);

      doc.save(`relatorio_${selectedMonth === "all" ? "ano" : selectedMonth}_${selectedYear}.pdf`);
      toast({ title: "Sucesso!", description: "Relatório baixado com sucesso." });
    } catch (error) {
      console.error(error);
      toast({ title: "Erro", description: "Não foi possível gerar o PDF.", variant: "destructive" });
    }
  };

  // Lista de Meses com a opção "Ano Inteiro" no início
  const months = [
    { value: "all", label: "Ano Inteiro" },
    ...Array.from({ length: 12 }, (_, i) => ({
      value: String(i),
      label: format(new Date(2024, i, 1), "MMMM", { locale: ptBR }),
    })),
  ];

  const years = ["2023", "2024", "2025", "2026"];

  return (
    <DashboardLayout>
      <div className="space-y-6 animate-fade-in p-4 md:p-8">
        <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Relatórios</h1>
            <p className="text-muted-foreground">Análise detalhada das suas finanças por categoria.</p>
          </div>

          <div className="flex flex-col sm:flex-row gap-2 w-full md:w-auto">
            {/* Seletor de Tipo de Gráfico */}
            <div className="flex bg-muted p-1 rounded-md">
              <Button variant={chartType === "bar" ? "secondary" : "ghost"} size="sm" onClick={() => setChartType("bar")} className="h-8">
                <BarChart3 className="w-4 h-4 mr-2" />
                Barras
              </Button>
              <Button variant={chartType === "pie" ? "secondary" : "ghost"} size="sm" onClick={() => setChartType("pie")} className="h-8">
                <PieChart className="w-4 h-4 mr-2" />
                Pizza
              </Button>
            </div>

            {/* Filtros de Data */}
            <Card className="border-0 shadow-none bg-transparent">
              <CardContent className="p-0 flex gap-2">
                <Select value={selectedMonth} onValueChange={setSelectedMonth}>
                  <SelectTrigger className="w-[140px]">
                    <SelectValue placeholder="Período" />
                  </SelectTrigger>
                  <SelectContent>
                    {months.map((month) => (
                      <SelectItem key={month.value} value={month.value} className="capitalize">
                        {month.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Select value={selectedYear} onValueChange={setSelectedYear}>
                  <SelectTrigger className="w-[90px]">
                    <SelectValue placeholder="Ano" />
                  </SelectTrigger>
                  <SelectContent>
                    {years.map((year) => (
                      <SelectItem key={year} value={year}>
                        {year}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </CardContent>
            </Card>

            <Button onClick={handleExportPDF} variant="outline" className="gap-2">
              <Download className="h-4 w-4" />
              Exportar PDF
            </Button>
          </div>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <CategoryChart id="chart-income" transactions={transactions} type="income" title="Receitas por Categoria" chartType={chartType} />
          <CategoryChart
            id="chart-expense"
            transactions={transactions}
            type="expense"
            title="Despesas por Categoria"
            chartType={chartType}
          />
        </div>
      </div>
    </DashboardLayout>
  );
}
