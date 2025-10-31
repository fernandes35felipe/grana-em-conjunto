import { useState, useCallback } from 'react';

import { useToast } from '@/hooks/use-toast';

import { sanitizeObject } from '@/utils/security/sanitize';

import type { SanitizerFunction, ValidatorFunction, ValidationResult } from '@/utils/security/types';

interface UseSanitizedFormOptions<T> {
  initialValues: T;
  sanitizers?: Partial<Record<keyof T, SanitizerFunction>>;
  validators?: Partial<Record<keyof T, ValidatorFunction>>;
  onSubmit: (values: T) => Promise<void> | void;
  validateOnChange?: boolean;
}

interface UseSanitizedFormReturn<T> {
  values: T;
  errors: Partial<Record<keyof T, string>>;
  isSubmitting: boolean;
  handleChange: (field: keyof T, value: any) => void;
  handleSubmit: (e?: React.FormEvent) => Promise<void>;
  setValues: (values: Partial<T>) => void;
  resetForm: () => void;
  validateField: (field: keyof T) => boolean;
  validateAll: () => boolean;
}

export const useSanitizedForm = <T extends Record<string, any>>({
  initialValues,
  sanitizers = {},
  validators = {},
  onSubmit,
  validateOnChange = true,
}: UseSanitizedFormOptions<T>): UseSanitizedFormReturn<T> => {
  const [values, setFormValues] = useState<T>(initialValues);
  const [errors, setErrors] = useState<Partial<Record<keyof T, string>>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  const sanitizeValue = useCallback(
    (field: keyof T, value: any): any => {
      const sanitizer = sanitizers[field];
      return sanitizer ? sanitizer(value) : value;
    },
    [sanitizers]
  );

  const validateField = useCallback(
    (field: keyof T): boolean => {
      const validator = validators[field];
      
      if (!validator) {
        setErrors(prev => {
          const next = { ...prev };
          delete next[field];
          return next;
        });
        return true;
      }

      const result: ValidationResult = validator(values[field]);

      if (!result.isValid) {
        setErrors(prev => ({
          ...prev,
          [field]: result.error || 'Erro de validação',
        }));
        return false;
      }

      setErrors(prev => {
        const next = { ...prev };
        delete next[field];
        return next;
      });
      return true;
    },
    [validators, values]
  );

  const validateAll = useCallback((): boolean => {
    const fields = Object.keys(validators) as (keyof T)[];
    const results = fields.map(field => validateField(field));
    return results.every(result => result);
  }, [validators, validateField]);

  const handleChange = useCallback(
    (field: keyof T, value: any): void => {
      const sanitizedValue = sanitizeValue(field, value);

      setFormValues(prev => ({
        ...prev,
        [field]: sanitizedValue,
      }));

      if (validateOnChange && validators[field]) {
        setTimeout(() => validateField(field), 0);
      }
    },
    [sanitizeValue, validateOnChange, validators, validateField]
  );

  const setValues = useCallback(
    (newValues: Partial<T>): void => {
      const sanitizedValues = sanitizeObject(newValues, sanitizers);
      
      setFormValues(prev => ({
        ...prev,
        ...sanitizedValues,
      }));
    },
    [sanitizers]
  );

  const resetForm = useCallback((): void => {
    setFormValues(initialValues);
    setErrors({});
    setIsSubmitting(false);
  }, [initialValues]);

  const handleSubmit = useCallback(
    async (e?: React.FormEvent): Promise<void> => {
      if (e) {
        e.preventDefault();
      }

      const isValid = validateAll();

      if (!isValid) {
        toast({
          title: 'Erro de validação',
          description: 'Corrija os erros antes de continuar',
          variant: 'destructive',
        });
        return;
      }

      setIsSubmitting(true);

      try {
        await onSubmit(values);
      } catch (error) {
        console.error('Erro ao submeter formulário:', error);
        toast({
          title: 'Erro',
          description: error instanceof Error ? error.message : 'Erro ao processar formulário',
          variant: 'destructive',
        });
      } finally {
        setIsSubmitting(false);
      }
    },
    [validateAll, onSubmit, values, toast]
  );

  return {
    values,
    errors,
    isSubmitting,
    handleChange,
    handleSubmit,
    setValues,
    resetForm,
    validateField,
    validateAll,
  };
};
