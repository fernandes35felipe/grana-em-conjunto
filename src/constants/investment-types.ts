export const INVESTMENT_TYPES = [
  "Ações",
  "FIIs",
  "Renda Fixa",
  "Tesouro Direto",
  "CDB",
  "LCI/LCA",
  "Criptomoedas",
  "Fundos",
  "Previdência",
  "Outro",
] as const;

export type InvestmentType = (typeof INVESTMENT_TYPES)[number];
