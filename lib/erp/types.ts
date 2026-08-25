export type ErpOrderStatus = "biten" | "bekleyen" | "askida";

export interface ErpOrder {
  id: number;
  ad: string;
  soyad: string;
  tel: string;
  tarih: string;
  bitis: string;
  cat: string;
  tur: string;
  adet: number;
  toplam: number;
  kapora: number;
  tahsilat: number;
  not_icerik: string;
  bilgi: string;
  durum?: ErpOrderStatus;
  created_at: string;
}

export interface ErpExpense {
  id: number;
  tarih: string;
  kat: string;
  /** Alt kategori (örn. Hammadde → Polyester). */
  subkat?: string;
  acik: string;
  tutar: number;
  fatno: string;
  dosya: string | null;
  dosya_url?: string | null;
  /** Tekrarlayan kuraldan otomatik oluşturulduysa kural id. */
  recurringId?: number;
  created_at: string;
}

export type ErpRecurringFreq = "monthly" | "weekly";

export interface ErpRecurringExpense {
  id: number;
  kat: string;
  subkat?: string;
  acik: string;
  tutar: number;
  freq: ErpRecurringFreq;
  /** YYYY-MM-DD */
  startDate: string;
  /** YYYY-MM-DD */
  endDate: string;
  active: boolean;
  created_at: string;
}

export interface ErpSettings {
  orderCats: string[];
  expCats: string[];
  /** Gider kategorisi → alt kategori listesi */
  expSubCats?: Record<string, string[]>;
}

export type ErpTodoStatus = "bekleyen" | "biten";

export interface ErpTodo {
  id: number;
  title: string;
  note: string;
  status: ErpTodoStatus;
  /** Düşük değer = üstte (öncelikli). */
  sortOrder: number;
  createdAt: string;
  completedAt?: string;
  /** Tekrarlayan kuraldan üretildiyse. */
  recurringId?: number;
  /** Dönem anahtarı: recurringId:YYYY-MM veya recurringId:YYYY-MM-DD */
  periodKey?: string;
  /** Vade / dönem tarihi (YYYY-MM-DD), tekrarlayanlarda. */
  dueDate?: string;
}

export type ErpTodoRecurringFreq = "weekly" | "monthly";

export interface ErpTodoRecurring {
  id: number;
  title: string;
  note: string;
  active: boolean;
  freq: ErpTodoRecurringFreq;
  /** Haftalık: 0=Pazar … 5=Cuma … 6=Cumartesi */
  dayOfWeek?: number;
  /** Aylık: ayın 1–31. günü */
  dayOfMonth?: number;
  /** YYYY-MM-DD */
  startDate: string;
  /** YYYY-MM-DD — boşsa süresiz */
  endDate?: string;
  createdAt: string;
}

export interface ErpData {
  orders: ErpOrder[];
  expenses: ErpExpense[];
  settings: ErpSettings;
  recurringExpenses: ErpRecurringExpense[];
  todos: ErpTodo[];
  recurringTodos: ErpTodoRecurring[];
}
