export const SECURITY_LIMITS = {
  MAX_STRING_LENGTH: 5000,
  MAX_DESCRIPTION_LENGTH: 1000,
  MAX_NAME_LENGTH: 255,
  MAX_AMOUNT: 999999999.99,
  MIN_AMOUNT: -999999999.99,
  MAX_QUANTITY: 999999999,
  MIN_QUANTITY: 0,
  MAX_RECURRENCE_COUNT: 120,
  MIN_RECURRENCE_COUNT: 1,
} as const;

export const ALLOWED_TRANSACTION_TYPES = ["income", "expense"] as const;

export const ALLOWED_INVESTMENT_TYPES = [
  "Ações",
  "FIIs",
  "Renda Fixa",
  "Tesouro Direto",
  "CDB",
  "LCI/LCA",
  "Criptomoedas",
  "Outro",
] as const;

// Alterado de ALLOWED para SUGGESTED para indicar que não são obrigatórias
export const SUGGESTED_CATEGORIES = [
  "Alimentação",
  "Transporte",
  "Moradia",
  "Saúde",
  "Educação",
  "Lazer",
  "Compras",
  "Serviços",
  "Investimentos",
  "Outros",
] as const;

export const REGEX_PATTERNS = {
  EMAIL: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  UUID: /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
  DATE: /^\d{4}-\d{2}-\d{2}$/,
  NUMERIC: /^-?\d+\.?\d*$/,
  ALPHANUMERIC: /^[a-zA-Z0-9\s\-_]+$/,
  HEX_COLOR: /^#[0-9A-Fa-f]{6}$/,
} as const;

export const SQL_INJECTION_PATTERNS = [
  /(\bSELECT\b|\bINSERT\b|\bUPDATE\b|\bDELETE\b|\bDROP\b|\bCREATE\b|\bALTER\b)/i,
  /(--|\|\|)/,
  /(\bOR\b|\bAND\b)\s+[\d'"]+=[\d'"]+/i,
  /\bEXEC\b|\bEXECUTE\b/i,
  /;.*DROP/i,
] as const;

export const XSS_PATTERNS = [/<script[^>]*>.*?<\/script>/gi, /javascript:/gi, /on\w+\s*=/gi, /<iframe/gi, /<object/gi, /<embed/gi] as const;

export const RATE_LIMIT_CONFIG = {
  MAX_REQUESTS_PER_MINUTE: 60,
  MAX_REQUESTS_PER_HOUR: 1000,
  WINDOW_MS: 60000,
} as const;
