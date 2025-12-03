import { SECURITY_LIMITS, ALLOWED_TRANSACTION_TYPES, ALLOWED_INVESTMENT_TYPES, ALLOWED_CATEGORIES, REGEX_PATTERNS } from "./constants";

import type { ValidationResult, TransactionData, InvestmentData, GroupData } from "./types";

export const createValidationResult = (isValid: boolean, error?: string): ValidationResult => ({
  isValid,
  error: error || null,
});

export const validateString = (
  value: string,
  fieldName: string,
  minLength: number = 1,
  maxLength: number = SECURITY_LIMITS.MAX_STRING_LENGTH
): ValidationResult => {
  if (typeof value !== "string") {
    return createValidationResult(false, `${fieldName} deve ser uma string`);
  }

  const trimmed = value.trim();

  if (trimmed.length < minLength) {
    return createValidationResult(false, `${fieldName} deve ter no mínimo ${minLength} caracteres`);
  }

  if (trimmed.length > maxLength) {
    return createValidationResult(false, `${fieldName} deve ter no máximo ${maxLength} caracteres`);
  }

  return createValidationResult(true);
};

export const validateNumber = (value: number, fieldName: string, min?: number, max?: number): ValidationResult => {
  if (typeof value !== "number" || isNaN(value) || !isFinite(value)) {
    return createValidationResult(false, `${fieldName} deve ser um número válido`);
  }

  if (min !== undefined && value < min) {
    return createValidationResult(false, `${fieldName} deve ser no mínimo ${min}`);
  }

  if (max !== undefined && value > max) {
    return createValidationResult(false, `${fieldName} deve ser no máximo ${max}`);
  }

  return createValidationResult(true);
};

export const validateAmount = (amount: number): ValidationResult => {
  return validateNumber(amount, "Valor", SECURITY_LIMITS.MIN_AMOUNT, SECURITY_LIMITS.MAX_AMOUNT);
};

export const validateUUID = (uuid: string, fieldName: string = "ID"): ValidationResult => {
  if (!REGEX_PATTERNS.UUID.test(uuid)) {
    return createValidationResult(false, `${fieldName} inválido`);
  }

  return createValidationResult(true);
};

export const validateDate = (date: string, fieldName: string = "Data"): ValidationResult => {
  if (!REGEX_PATTERNS.DATE.test(date)) {
    return createValidationResult(false, `${fieldName} deve estar no formato YYYY-MM-DD`);
  }

  const parsedDate = new Date(date);
  if (isNaN(parsedDate.getTime())) {
    return createValidationResult(false, `${fieldName} inválida`);
  }

  const year = parsedDate.getFullYear();
  if (year < 1900 || year > 2100) {
    return createValidationResult(false, `${fieldName} fora do intervalo permitido (1900-2100)`);
  }

  return createValidationResult(true);
};

export const validateEmail = (email: string): ValidationResult => {
  if (!REGEX_PATTERNS.EMAIL.test(email)) {
    return createValidationResult(false, "Email inválido");
  }

  return createValidationResult(true);
};

export const validateEnum = <T extends readonly string[]>(value: string, allowedValues: T, fieldName: string): ValidationResult => {
  if (!allowedValues.includes(value as T[number])) {
    return createValidationResult(false, `${fieldName} inválido`);
  }

  return createValidationResult(true);
};

export const validateTransactionType = (type: string): ValidationResult => {
  return validateEnum(type, ALLOWED_TRANSACTION_TYPES, "Tipo de transação");
};

export const validateInvestmentType = (type: string): ValidationResult => {
  return validateEnum(type, ALLOWED_INVESTMENT_TYPES, "Tipo de investimento");
};

export const validateCategory = (category: string): ValidationResult => {
  return validateEnum(category, ALLOWED_CATEGORIES, "Categoria");
};

export const validateBoolean = (value: any, fieldName: string): ValidationResult => {
  if (typeof value !== "boolean") {
    return createValidationResult(false, `${fieldName} deve ser verdadeiro ou falso`);
  }

  return createValidationResult(true);
};

export const validateOptionalUUID = (uuid: string | null | undefined, fieldName: string = "ID"): ValidationResult => {
  if (!uuid) {
    return createValidationResult(true);
  }

  return validateUUID(uuid, fieldName);
};

export const validateOptionalNumber = (
  value: number | null | undefined,
  fieldName: string,
  min?: number,
  max?: number
): ValidationResult => {
  if (value === null || value === undefined) {
    return createValidationResult(true);
  }

  return validateNumber(value, fieldName, min, max);
};

export const validateTransactionData = (data: Partial<TransactionData>): ValidationResult => {
  const validations = [
    validateString(data.description || "", "Descrição", 1, SECURITY_LIMITS.MAX_DESCRIPTION_LENGTH),
    validateAmount(data.amount || 0),
    validateTransactionType(data.type || ""),
    validateCategory(data.category || ""),
    validateDate(data.date || ""),
    validateOptionalUUID(data.group_id, "ID do grupo"),
    validateOptionalUUID(data.user_id, "ID do usuário"),
  ];

  if (data.is_recurring !== undefined) {
    validations.push(validateBoolean(data.is_recurring, "É recorrente"));
  }

  if (data.is_fixed !== undefined) {
    validations.push(validateBoolean(data.is_fixed, "É fixo"));
  }

  if (data.is_credit_card !== undefined) {
    validations.push(validateBoolean(data.is_credit_card, "É cartão de crédito"));
  }

  if (data.is_credit_card && data.card_closing_date) {
    validations.push(validateDate(data.card_closing_date, "Vencimento da Fatura"));
  }

  if (data.recurrence_count !== undefined && data.recurrence_count !== null) {
    validations.push(
      validateNumber(
        data.recurrence_count,
        "Quantidade de recorrência",
        SECURITY_LIMITS.MIN_RECURRENCE_COUNT,
        SECURITY_LIMITS.MAX_RECURRENCE_COUNT
      )
    );
  }

  const failed = validations.find((v) => !v.isValid);
  return failed || createValidationResult(true);
};

export const validateInvestmentData = (data: Partial<InvestmentData>): ValidationResult => {
  const validations = [
    validateString(data.name || "", "Nome", 1, SECURITY_LIMITS.MAX_NAME_LENGTH),
    validateInvestmentType(data.type || ""),
    validateAmount(data.amount || 0),
    validateOptionalUUID(data.group_id, "ID do grupo"),
    validateOptionalUUID(data.user_id, "ID do usuário"),
  ];

  if (data.quantity !== undefined && data.quantity !== null) {
    validations.push(validateNumber(data.quantity, "Quantidade", SECURITY_LIMITS.MIN_QUANTITY, SECURITY_LIMITS.MAX_QUANTITY));
  }

  if (data.unit_price !== undefined && data.unit_price !== null) {
    validations.push(validateAmount(data.unit_price));
  }

  if (data.maturity_date !== undefined && data.maturity_date !== null) {
    validations.push(validateDate(data.maturity_date, "Data de vencimento"));
  }

  const failed = validations.find((v) => !v.isValid);
  return failed || createValidationResult(true);
};

export const validateGroupData = (data: Partial<GroupData>): ValidationResult => {
  const validations = [
    validateString(data.name || "", "Nome", 1, SECURITY_LIMITS.MAX_NAME_LENGTH),
    validateOptionalUUID(data.created_by, "ID do criador"),
  ];

  if (data.description !== undefined && data.description !== null && data.description !== "") {
    validations.push(validateString(data.description, "Descrição", 0, SECURITY_LIMITS.MAX_DESCRIPTION_LENGTH));
  }

  if (data.color !== undefined && data.color !== null) {
    if (!REGEX_PATTERNS.HEX_COLOR.test(data.color)) {
      return createValidationResult(false, "Cor inválida (use formato hexadecimal #RRGGBB)");
    }
  }

  const failed = validations.find((v) => !v.isValid);
  return failed || createValidationResult(true);
};

export const validateBatch = (results: ValidationResult[]): ValidationResult => {
  const failed = results.find((v) => !v.isValid);
  return failed || createValidationResult(true);
};
