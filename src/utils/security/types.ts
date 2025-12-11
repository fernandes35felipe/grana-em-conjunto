export interface ValidationResult {
  isValid: boolean;
  error: string | null;
}

export interface TransactionData {
  description: string;
  amount: number;
  type: "income" | "expense";
  category: string;
  date: string;
  group_id?: string | null;
  user_id?: string | null;
  is_recurring?: boolean;
  is_fixed?: boolean;
  is_pending?: boolean;
  pending_type?: "payable" | "receivable" | null;
  paid_at?: string | null;
  recurrence_count?: number | null;
  recurrence_id?: string | null;
  event_id?: string | null;
  is_credit_card?: boolean;
  card_closing_date?: string | null;
  credit_card_id?: string | null;
  installment_number?: number | null;
  total_installments?: number | null;
}

export interface UserTag {
  id: string;
  name: string;
  color?: string;
  user_id: string;
}

// ... (Mantenha as outras interfaces existentes InvestmentData, GroupData, etc.)
export interface InvestmentData {
  name: string;
  type: string;
  amount: number;
  current_value?: number;
  quantity?: number | null;
  unit_price?: number | null;
  group_id?: string | null;
  user_id?: string | null;
  maturity_date?: string | null;
}

export interface GroupData {
  name: string;
  description?: string | null;
  color?: string | null;
  created_by?: string | null;
}

export interface EventData {
  name: string;
  description?: string | null;
  date: string;
}

export interface RateLimitEntry {
  count: number;
  firstRequest: number;
  lastRequest: number;
}

export interface PermissionContext {
  userId: string;
  groupId?: string | null;
  resourceOwnerId?: string | null;
  isGroupAdmin?: boolean;
}

export interface SanitizeConfig {
  maxLength?: number;
  allowHTML?: boolean;
  trim?: boolean;
}

export type SanitizerFunction<T = any> = (value: T) => T;

export type ValidatorFunction<T = any> = (value: T) => ValidationResult;
