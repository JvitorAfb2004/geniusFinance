export interface SubscriptionItem {
  planId: string;
  abacateProductId?: string;
  quantity: number;
  unitPrice: number;
}

export interface PricingResult {
  items: SubscriptionItem[];
  total: number;
}

export function calculateSubscriptionPrice(
  planTypes: ('PERSONAL' | 'BUSINESS')[],
  extraBusinesses: number,
  totalMembers: number
): PricingResult {
  const items: SubscriptionItem[] = [];

  // Pessoal (grátis se tiver empresa)
  if (!planTypes.includes('BUSINESS') && planTypes.includes('PERSONAL')) {
    items.push({ planId: 'plan_personal', quantity: 1, unitPrice: 1990 });
  }

  // Empresa principal
  if (planTypes.includes('BUSINESS')) {
    items.push({ planId: 'plan_business', quantity: 1, unitPrice: 3990 });
  }

  // Empresas adicionais
  if (extraBusinesses > 0) {
    items.push({ planId: 'plan_extra_business', quantity: extraBusinesses, unitPrice: 1990 });
  }

  // Membros extras (além do 1 grátis por empresa)
  const totalCompanies = (planTypes.includes('BUSINESS') ? 1 : 0) + extraBusinesses;
  const freeMembers = totalCompanies;
  const extraMembers = Math.max(0, totalMembers - freeMembers);
  if (extraMembers > 0) {
    items.push({ planId: 'plan_extra_member', quantity: extraMembers, unitPrice: 490 });
  }

  const total = items.reduce((sum, i) => sum + i.quantity * i.unitPrice, 0);
  return { items, total };
}

export function formatPrice(cents: number): string {
  return `R$ ${(cents / 100).toFixed(2).replace('.', ',')}`;
}

export function formatPriceFromCents(cents: number | undefined | null): string {
  if (!cents) return 'R$ 0,00';
  return formatPrice(cents);
}
