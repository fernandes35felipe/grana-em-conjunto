import DOMPurify from 'dompurify';

import { SECURITY_LIMITS, SQL_INJECTION_PATTERNS, XSS_PATTERNS } from './constants';

export const sanitizeString = (input: string, maxLength: number = SECURITY_LIMITS.MAX_STRING_LENGTH): string => {
  if (typeof input !== 'string') {
    return '';
  }

  let sanitized = input.trim();
  
  sanitized = sanitized.slice(0, maxLength);
  
  sanitized = sanitized.replace(/[\x00-\x08\x0B-\x0C\x0E-\x1F\x7F]/g, '');
  
  return sanitized;
};

export const sanitizeHTML = (input: string): string => {
  if (typeof input !== 'string') {
    return '';
  }

  return DOMPurify.sanitize(input, {
    ALLOWED_TAGS: [],
    ALLOWED_ATTR: [],
    KEEP_CONTENT: true,
  });
};

export const sanitizeNumber = (input: string | number): number => {
  const parsed = typeof input === 'string' ? parseFloat(input) : input;
  
  if (isNaN(parsed) || !isFinite(parsed)) {
    return 0;
  }

  return parsed;
};

export const sanitizeAmount = (input: string | number): number => {
  const amount = sanitizeNumber(input);
  
  if (amount > SECURITY_LIMITS.MAX_AMOUNT) {
    return SECURITY_LIMITS.MAX_AMOUNT;
  }
  
  if (amount < SECURITY_LIMITS.MIN_AMOUNT) {
    return SECURITY_LIMITS.MIN_AMOUNT;
  }

  return Math.round(amount * 100) / 100;
};

export const sanitizeInteger = (input: string | number, min: number = 0, max: number = Number.MAX_SAFE_INTEGER): number => {
  const parsed = typeof input === 'string' ? parseInt(input, 10) : Math.floor(input);
  
  if (isNaN(parsed) || !isFinite(parsed)) {
    return min;
  }

  if (parsed < min) {
    return min;
  }

  if (parsed > max) {
    return max;
  }

  return parsed;
};

export const detectSQLInjection = (input: string): boolean => {
  return SQL_INJECTION_PATTERNS.some(pattern => pattern.test(input));
};

export const detectXSS = (input: string): boolean => {
  return XSS_PATTERNS.some(pattern => pattern.test(input));
};

export const sanitizeInput = (input: string, maxLength?: number): string => {
  const cleaned = sanitizeString(input, maxLength);
  const htmlSafe = sanitizeHTML(cleaned);
  
  if (detectSQLInjection(htmlSafe) || detectXSS(htmlSafe)) {
    return '';
  }

  return htmlSafe;
};

export const sanitizeObject = <T extends Record<string, any>>(
  obj: T,
  sanitizers: Partial<Record<keyof T, (value: any) => any>>
): T => {
  const sanitized = { ...obj };

  for (const key in sanitizers) {
    if (key in sanitized) {
      const sanitizer = sanitizers[key];
      if (sanitizer) {
        sanitized[key] = sanitizer(sanitized[key]);
      }
    }
  }

  return sanitized;
};

export const sanitizeArray = <T>(
  arr: T[],
  itemSanitizer: (item: T) => T,
  maxLength: number = 1000
): T[] => {
  if (!Array.isArray(arr)) {
    return [];
  }

  return arr.slice(0, maxLength).map(itemSanitizer);
};

export const sanitizeUUID = (input: string): string | null => {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  
  if (typeof input === 'string' && uuidRegex.test(input.trim())) {
    return input.trim().toLowerCase();
  }

  return null;
};

export const sanitizeDate = (input: string | Date): string | null => {
  try {
    const date = typeof input === 'string' ? new Date(input) : input;
    
    if (isNaN(date.getTime())) {
      return null;
    }

    const year = date.getFullYear();
    if (year < 1900 || year > 2100) {
      return null;
    }

    return date.toISOString().split('T')[0];
  } catch {
    return null;
  }
};

export const sanitizeEmail = (email: string): string | null => {
  const cleaned = sanitizeString(email, 320).toLowerCase();
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  if (emailRegex.test(cleaned)) {
    return cleaned;
  }

  return null;
};

export const sanitizeColor = (color: string): string | null => {
  const cleaned = sanitizeString(color, 7);
  const hexRegex = /^#[0-9A-Fa-f]{6}$/;

  if (hexRegex.test(cleaned)) {
    return cleaned.toUpperCase();
  }

  return null;
};

export const escapeRegExp = (string: string): string => {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
};

export const sanitizeSearchTerm = (term: string): string => {
  const cleaned = sanitizeString(term, 255);
  return escapeRegExp(cleaned);
};
