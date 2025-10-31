export interface ValidationResult {
  isValid: boolean;
  error: string | null;
}

export interface TransactionData {
  description: string;
  amount: number;
  type: 'income' | 'expense';
  category: string;
  date: string;
  group_id?: string | null;
  user_id?: string | null;
  is_recurring?: boolean;
  is_fixed?: boolean;
  recurrence_count?: number | null;
  recurrence_id?: string | null;
}

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
