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
  acik: string;
  tutar: number;
  fatno: string;
  dosya: string | null;
  dosya_url?: string | null;
  created_at: string;
}

export interface ErpSettings {
  orderCats: string[];
  expCats: string[];
}

export interface ErpData {
  orders: ErpOrder[];
  expenses: ErpExpense[];
  settings: ErpSettings;
}
