import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { format } from "date-fns";

interface Transaction {
    id: string;
    description: string;
    amount: number;
    type: string;
    date: string;
    category: string;
}

interface Investment {
    id: string;
    name: string;
    current_amount: number;
    type: string;
}

interface ReportData {
    transactions: Transaction[];
    investments: Investment[];
    dateRange: {
        from: Date;
        to: Date;
    };
    title?: string;
}

export const generatePDF = async ({ transactions, investments, dateRange, title }: ReportData) => {
    const doc = new jsPDF();

    const startDate = format(dateRange.from, "dd/MM/yyyy");
    const endDate = format(dateRange.to, "dd/MM/yyyy");

    // Title
    doc.setFontSize(20);
    doc.text(title || "Relatório Financeiro - Zeni Wallet", 14, 22);

    doc.setFontSize(10);
    doc.text(`Período: ${startDate} a ${endDate}`, 14, 30);
    doc.text(`Gerado em: ${format(new Date(), "dd/MM/yyyy HH:mm")}`, 14, 35);

    let finalY = 40;

    // Summary
    const totalIncome = transactions.filter(t => t.type === 'income').reduce((acc, curr) => acc + Number(curr.amount), 0);
    const totalExpenses = transactions.filter(t => t.type === 'expense').reduce((acc, curr) => acc + Number(curr.amount), 0);
    const totalInvested = investments.reduce((acc, curr) => acc + Number(curr.current_amount), 0);

    autoTable(doc, {
        startY: finalY,
        head: [['Resumo', 'Valor']],
        body: [
            ['Total Entradas', `R$ ${totalIncome.toFixed(2)}`],
            ['Total Saídas', `R$ ${totalExpenses.toFixed(2)}`],
            ['Saldo do Período', `R$ ${(totalIncome - totalExpenses).toFixed(2)}`],
            ['Total Investido (Atual)', `R$ ${totalInvested.toFixed(2)}`],
        ],
        theme: 'striped',
        headStyles: { fillColor: [63, 81, 181] },
    });

    // @ts-expect-error - jspdf-autotable adds lastAutoTable to doc instance but types are not updated
    finalY = doc.lastAutoTable.finalY + 10;

    // Investments Table
    if (investments.length > 0) {
        // Check if we need a new page
        if (finalY > 250) {
            doc.addPage();
            finalY = 20;
        }

        doc.setFontSize(14);
        doc.text("Investimentos", 14, finalY);

        autoTable(doc, {
            startY: finalY + 5,
            head: [['Nome', 'Tipo', 'Valor Atual']],
            body: investments.map(i => [
                i.name,
                i.type,
                `R$ ${Number(i.current_amount).toFixed(2)}`
            ]),
            theme: 'grid',
            styles: { fontSize: 8 },
            headStyles: { fillColor: [46, 125, 50] },
        });
    }

    // @ts-expect-error - jspdf-autotable adds lastAutoTable to doc instance but types are not updated
    finalY = doc.lastAutoTable.finalY + 10;

    // Investments Table
    if (investments.length > 0) {
        // Check if we need a new page
        if (finalY > 250) {
            doc.addPage();
            finalY = 20;
        }

        doc.setFontSize(14);
        doc.text("Investimentos", 14, finalY);

        autoTable(doc, {
            startY: finalY + 5,
            head: [['Nome', 'Tipo', 'Valor Atual']],
            body: investments.map(i => [
                i.name,
                i.type,
                `R$ ${Number(i.current_amount).toFixed(2)}`
            ]),
            theme: 'grid',
            styles: { fontSize: 8 },
            headStyles: { fillColor: [46, 125, 50] },
        });
    }

    // Footer for IR
    const pageCount = doc.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.text('Este documento serve para simples conferência e auxílio na declaração de imposto de renda.', 14, 285);
        doc.text(`Página ${i} de ${pageCount}`, 190, 285, { align: 'right' });
    }

    doc.save(`relatorio_${format(new Date(), "yyyyMMdd")}.pdf`);
};
