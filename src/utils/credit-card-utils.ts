import { CreditCard } from "@/types/credit-card";
import { addMonths, setDate, isAfter, startOfDay, isBefore } from "date-fns";

export const getNextClosingDate = (card: CreditCard, fromDate: Date = new Date()): Date => {
    const currentMonthClosing = setDate(startOfDay(fromDate), card.closing_day);

    if (isAfter(startOfDay(fromDate), currentMonthClosing)) {
        return setDate(addMonths(startOfDay(fromDate), 1), card.closing_day);
    }

    return currentMonthClosing;
};

export const getNextDueDate = (card: CreditCard, closingDate: Date): Date => {
    const due = setDate(closingDate, card.due_day);

    // If due day is smaller than closing day, it usually means next month
    // E.g. Closing 25th, Due 5th (of next month)
    if (card.due_day < card.closing_day) {
        return addMonths(due, 1);
    }

    // Even if due day > closing day, it might be next month if the window is small? 
    // But usually if Closing is 10 and Due is 20, it's same month.
    // Let's assume strict logic based on days. 
    // Ideally we would compare full dates, but here we just constructed 'due' from 'closingDate' month.

    // However, specifically: 
    // If Closing is Jan 25, Due is Feb 5.
    // setDate(Jan 25, 5) -> Jan 5. (Wrong, logic above fixes this by adding month if due < closing)

    // If Closing is Jan 10, Due is Jan 20.
    // setDate(Jan 10, 20) -> Jan 20. Correct.

    return due;
};

export const getInvoiceStatus = (closingDate: Date, paidAt?: string | null): 'open' | 'closed' | 'paid' => {
    if (paidAt) return 'paid';
    const today = startOfDay(new Date());
    if (isBefore(today, closingDate)) return 'open';
    return 'closed';
};
