export interface CreditCard {
  id: string;
  user_id: string;
  name: string;
  description?: string;
  closing_day: number;
  due_day: number;
  limit_amount?: number;
  created_at?: string;
  updated_at?: string;
}

export interface CreditCardInvoice {
  card_id: string;
  closingDate: Date;
  dueDate: Date;
  amount: number;
  status: 'open' | 'closed' | 'paid';
}
