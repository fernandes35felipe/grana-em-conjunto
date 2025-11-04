export type Transaction = {
  id: string;
  description: string;
  amount: number;
  type: "income" | "expense";
  category: string;
  date: string;
  group_id?: string | null;
  user_id?: string;
  created_at?: string;
  updated_at?: string;
  is_recurring?: boolean;
  is_fixed?: boolean;
  recurrence_id?: string | null;
  recurrence_count?: number | null;
  assigned_to?: string | null;
  [key: string]: any;
};

export type VirtualizedListProps<T> = {
  data: T[];
  height?: number;
  itemHeight?: number;
};
