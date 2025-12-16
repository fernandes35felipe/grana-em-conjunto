import { useMemo } from "react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, PieChart, Pie, Legend } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Transaction } from "@/components/transactions/types";

interface CategoryChartProps {
  id: string;
  transactions: Transaction[];
  type: "income" | "expense";
  title: string;
  chartType: "bar" | "pie";
}

const COLORS = ["#10b981", "#3b82f6", "#f59e0b", "#ef4444", "#8b5cf6", "#ec4899", "#6366f1", "#14b8a6"];

export function CategoryChart({ transactions, type, title, chartType, id }: CategoryChartProps) {
  const data = useMemo(() => {
    // 1. Filtra pelo tipo (receita ou despesa)
    const filtered = transactions.filter((t) => t.type === type);

    // 2. Agrupa por categoria e soma os valores
    const grouped = filtered.reduce((acc, curr) => {
      const category = curr.category || "Outros";
      if (!acc[category]) acc[category] = 0;

      // CORREÇÃO: Usamos Math.abs para garantir que despesas (negativas) virem positivas para o gráfico
      acc[category] += Math.abs(Number(curr.amount));

      return acc;
    }, {} as Record<string, number>);

    // 3. Formata para o Recharts e ordena
    return Object.entries(grouped)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value); // Ordena maior para menor
  }, [transactions, type]);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);
  };

  const barColor = type === "income" ? "#10b981" : "#ef4444";

  return (
    <Card className="w-full h-[450px]" id={id}>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent className="h-[350px]">
        {data.length > 0 ? (
          <ResponsiveContainer width="100%" height="100%">
            {chartType === "bar" ? (
              <BarChart data={data} layout="vertical" margin={{ top: 5, right: 30, left: 40, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} />
                <XAxis type="number" hide />
                <YAxis dataKey="name" type="category" width={100} tick={{ fontSize: 12 }} />
                <Tooltip formatter={(value: number) => [formatCurrency(value), "Valor"]} cursor={{ fill: "transparent" }} />
                <Bar dataKey="value" fill={barColor} radius={[0, 4, 4, 0]}>
                  {data.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={chartType === "pie" ? COLORS[index % COLORS.length] : barColor} />
                  ))}
                </Bar>
              </BarChart>
            ) : (
              <PieChart>
                <Pie
                  data={data}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={2}
                  dataKey="value"
                  nameKey="name" // Importante para o tooltip mostrar o nome da categoria
                >
                  {data.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(value: number) => [formatCurrency(value), "Valor"]} />
                <Legend layout="vertical" verticalAlign="middle" align="right" wrapperStyle={{ fontSize: "12px" }} />
              </PieChart>
            )}
          </ResponsiveContainer>
        ) : (
          <div className="flex h-full items-center justify-center text-muted-foreground">Sem dados para este período</div>
        )}
      </CardContent>
    </Card>
  );
}
