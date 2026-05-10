import type { LeadOption } from '../types';

export const DEFAULT_LEAD_STATUSES: Omit<LeadOption, 'id' | 'userId'>[] = [
  { field: 'status', value: 'Novo', color: '#3b82f6', order: 0, isDefault: true },
  { field: 'status', value: 'Em contato', color: '#f59e0b', order: 1, isDefault: true },
  { field: 'status', value: 'Proposta enviada', color: '#8b5cf6', order: 2, isDefault: true },
  { field: 'status', value: 'Em negociação', color: '#ec4899', order: 3, isDefault: true },
  { field: 'status', value: 'Fechado (Ganho)', color: '#10b981', order: 4, isDefault: true },
  { field: 'status', value: 'Fechado (Perdido)', color: '#ef4444', order: 5, isDefault: true },
];

export const DEFAULT_LEAD_SOURCES: Omit<LeadOption, 'id' | 'userId'>[] = [
  { field: 'source', value: 'Site', order: 0, isDefault: true },
  { field: 'source', value: 'Instagram', order: 1, isDefault: true },
  { field: 'source', value: 'LinkedIn', order: 2, isDefault: true },
  { field: 'source', value: 'Indicação', order: 3, isDefault: true },
  { field: 'source', value: 'WhatsApp', order: 4, isDefault: true },
  { field: 'source', value: 'Telefone', order: 5, isDefault: true },
  { field: 'source', value: 'E-mail', order: 6, isDefault: true },
  { field: 'source', value: 'Google', order: 7, isDefault: true },
];

export const DEFAULT_LEAD_SERVICES: Omit<LeadOption, 'id' | 'userId'>[] = [
  { field: 'service', value: 'Desenvolvimento Web', order: 0, isDefault: true },
  { field: 'service', value: 'Desenvolvimento Mobile', order: 1, isDefault: true },
  { field: 'service', value: 'Consultoria', order: 2, isDefault: true },
  { field: 'service', value: 'Design', order: 3, isDefault: true },
  { field: 'service', value: 'Marketing Digital', order: 4, isDefault: true },
  { field: 'service', value: 'Tráfego Pago', order: 5, isDefault: true },
  { field: 'service', value: 'SEO', order: 6, isDefault: true },
];

export const ALL_DEFAULT_LEAD_OPTIONS = [
  ...DEFAULT_LEAD_STATUSES,
  ...DEFAULT_LEAD_SOURCES,
  ...DEFAULT_LEAD_SERVICES,
];
