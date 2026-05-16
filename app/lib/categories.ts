import type { DRESection } from '../types';

export interface CategorySeed {
  name: string;
  section: DRESection;
  order: number;
}

export const DEFAULT_CATEGORIES: CategorySeed[] = [
  // RECEITA
  { name: 'Pro-labore', section: 'RECEITA', order: 0 },
  { name: 'Salario', section: 'RECEITA', order: 1 },
  { name: 'Renda extra', section: 'RECEITA', order: 2 },
  { name: 'Investimento (Entrada)', section: 'RECEITA', order: 3 },
  { name: 'Outros (Entrada)', section: 'RECEITA', order: 4 },

  // CUSTOS
  { name: 'Lanche', section: 'CUSTOS', order: 5 },
  { name: 'Roupa', section: 'CUSTOS', order: 6 },
  { name: 'Transporte', section: 'CUSTOS', order: 7 },
  { name: 'Igreja', section: 'CUSTOS', order: 8 },
  { name: 'Presentes', section: 'CUSTOS', order: 9 },
  { name: 'Outros (Saida)', section: 'CUSTOS', order: 10 },
  { name: 'Manutencao Casa', section: 'CUSTOS', order: 11 },

  // DESPESAS
  { name: 'Financiamento casa', section: 'DESPESAS', order: 12 },
  { name: 'Agua', section: 'DESPESAS', order: 13 },
  { name: 'Energia', section: 'DESPESAS', order: 14 },
  { name: 'Internet / Recarga', section: 'DESPESAS', order: 15 },
  { name: 'Feira', section: 'DESPESAS', order: 16 },
  { name: 'Farmacia', section: 'DESPESAS', order: 17 },
  { name: 'Exames', section: 'DESPESAS', order: 18 },
  { name: 'Academia', section: 'DESPESAS', order: 19 },
  { name: 'Corte de cabelo', section: 'DESPESAS', order: 20 },
  { name: 'Consorcio moto', section: 'DESPESAS', order: 21 },
  { name: 'Estudos', section: 'DESPESAS', order: 22 },
  { name: 'Investimento (Saida)', section: 'DESPESAS', order: 23 },
];

export const SECTION_LABELS: Record<DRESection, string> = {
  RECEITA: 'Receita',
  CUSTOS: 'Custos',
  DESPESAS: 'Despesas',
};
