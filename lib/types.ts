export interface Category {
  id: string;
  name: string;
  type: 'income' | 'expense';
  color: string;
}

export interface BudgetItem {
  id: string;
  title: string;
  categoryId: string;
  amount: number;
  isCompleted: boolean; // Ödendi mi / Tahsil edildi mi?
  installment?: string; // Örn: "3/15", "1/12" veya boş
  note?: string;
}

export interface MonthData {
  id: string; // URL formatında: "2026-06", "2027-11"
  year: number;
  month: number; // 1 - 12
  incomes: BudgetItem[];
  expenses: BudgetItem[];
}

export type InvestmentKind = 'gold' | 'crypto' | 'stock' | 'fund' | 'currency' | 'other';

export interface Investment {
  id: string;
  name: string; // "Gram Altın", "Bitcoin"
  kind: InvestmentKind;
  quantity: number; // kaç gram / adet
  unit: string; // "gram", "BTC", "adet", "pay" — TL yazmak zorunda değilsin
  buyPrice?: number; // birim alış fiyatı (opsiyonel, TL)
  currentPrice?: number; // güncel birim fiyat (opsiyonel, TL)
  date?: string; // "2026-09" opsiyonel
  note?: string;
}

export interface AppBudgetState {
  settings: {
    currency: string; // "TL" veya "₺"
    initialBalance: number; // Kenardaki başlangıç nakiti/rezerv
  };
  categories: Category[];
  months: MonthData[];
  investments: Investment[]; // nakit/bütçeden ayrı tutulur, kasaya dahil edilmez
}
