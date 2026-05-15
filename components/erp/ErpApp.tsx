"use client";

import Link from "next/link";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
  type DragEvent,
  type ReactNode,
} from "react";
import {
  createErpExpense,
  createErpOrder,
  deleteErpExpense,
  deleteErpOrder,
  fetchErpData,
  saveErpSettings,
  toggleErpOrderDone,
  updateErpExpense,
  updateErpOrder,
} from "@/components/erp/api";
import { ErpImportPanel } from "@/components/erp/ErpImportPanel";
import type { ErpExpense, ErpOrder, ErpSettings } from "@/lib/erp/types";
import {
  addWorkdays,
  assignOrderNums,
  daysLeft,
  fmtDate,
  fmtM,
  fmtMK,
  fmtPct,
  compareOrders,
  compareExpenses,
  computeAlacak,
  computeTahsilat,
  computeToplamCiro,
  getOrderStatus,
  isOrderDueTracked,
  dateMonthKey,
  isInMonth,
  monthStr,
  orderKalan,
  toInputDateValue,
  type ExpenseSortKey,
  type OrderSortKey,
  STATUS_COLORS,
  STATUS_LABELS,
  todayStr,
} from "@/lib/erp/utils";

const COLS = [
  "#60a5fa",
  "#4ade80",
  "#fbbf24",
  "#a78bfa",
  "#f87171",
  "#34d399",
  "#fb923c",
  "#f472b6",
];

const TITLES: Record<Tab, string> = {
  dashboard: "Dashboard",
  siparisler: "Siparişler",
  giderler: "Giderler",
  raporlar: "Raporlar",
  tanimlamalar: "Tanımlamalar",
};

type Tab = "dashboard" | "siparisler" | "giderler" | "raporlar" | "tanimlamalar";

type OrderForm = {
  ad: string;
  soyad: string;
  tel: string;
  tarih: string;
  cat: string;
  tur: string;
  adet: number;
  toplam: string;
  kapora: string;
  tahsilat: string;
  not_icerik: string;
  bilgi: string;
};

type ExpenseForm = {
  tarih: string;
  kat: string;
  acik: string;
  tutar: string;
  fatno: string;
};

const emptyOrderForm = (): OrderForm => ({
  ad: "",
  soyad: "",
  tel: "",
  tarih: todayStr(),
  cat: "",
  tur: "PLX",
  adet: 1,
  toplam: "",
  kapora: "",
  tahsilat: "",
  not_icerik: "",
  bilgi: "",
});

function escHtml(s: string): string {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function filterByPeriod<T extends { tarih?: string }>(
  list: T[],
  period: string,
  year: string
): T[] {
  const thisM = monthStr(0);
  const lastM = monthStr(-1);
  if (period === "all") return list;
  if (period === "thismonth") return list.filter((o) => isInMonth(o.tarih, thisM));
  if (period === "lastmonth") return list.filter((o) => isInMonth(o.tarih, lastM));
  const q: Record<string, string[]> = {
    q1: ["01", "02", "03"],
    q2: ["04", "05", "06"],
    q3: ["07", "08", "09"],
    q4: ["10", "11", "12"],
  };
  if (q[period]) {
    return list.filter((o) => {
      const key = dateMonthKey(o.tarih);
      return key.startsWith(year) && q[period].includes(key.slice(5, 7));
    });
  }
  return list;
}

function renderBarChart(
  entries: [string, number][],
  opts?: { maxItems?: number; labelFn?: (k: string) => string }
): ReactNode {
  if (!entries.length) return <div className="empty">Gider yok</div>;
  const sorted = [...entries].sort((a, b) => b[1] - a[1]);
  const slice = opts?.maxItems ? sorted.slice(0, opts.maxItems) : sorted;
  const max = Math.max(...slice.map(([, v]) => v), 1);
  const labelFn = opts?.labelFn ?? ((k: string) => k.split("/")[0].trim());
  return slice.map(([k, v], i) => {
    const pct = Math.round((v / max) * 100);
    return (
      <div className="bar-row" key={k + i}>
        <div className="bar-label">{labelFn(k)}</div>
        <div className="bar-track">
          <div
            className="bar-fill"
            style={{
              width: `${pct}%`,
              background: COLS[i % COLS.length],
            }}
          >
            {pct > 18 ? fmtM(v) : ""}
          </div>
        </div>
        <div className="bar-val">{fmtM(v)}</div>
      </div>
    );
  });
}

function MonthBox({
  ms,
  orders,
  expenses,
}: {
  ms: string;
  orders: ErpOrder[];
  expenses: ErpExpense[];
}) {
  const ord = orders.filter((o) => isInMonth(o.tarih, ms));
  const exp = expenses.filter((e) => isInMonth(e.tarih, ms));
  const tah = computeTahsilat(ord);
  const gid = exp.reduce((s, e) => s + (+e.tutar || 0), 0);
  const net = tah - gid;
  return (
    <div style={{ display: "grid", gap: 6 }}>
      {[
        ["Sipariş", `${ord.length} adet`, undefined],
        ["Tahsilat", fmtM(tah), "var(--green)"],
        ["Gider", fmtM(gid), "var(--red)"],
        ["Net", fmtM(net), net >= 0 ? "var(--blue)" : "var(--red)"],
      ].map(([label, val, color], i, arr) => (
        <div
          key={String(label)}
          style={{
            display: "flex",
            justifyContent: "space-between",
            fontSize: 13,
            padding: "5px 0",
            borderBottom:
              i < arr.length - 1 ? "1px solid var(--border)" : undefined,
          }}
        >
          <span style={{ color: "var(--text2)" }}>{label}</span>
          <span style={{ fontWeight: i === arr.length - 1 ? 600 : 500, color }}>
            {val}
          </span>
        </div>
      ))}
    </div>
  );
}

export default function ErpApp() {
  const [orders, setOrders] = useState<ErpOrder[]>([]);
  const [expenses, setExpenses] = useState<ErpExpense[]>([]);
  const [settings, setSettings] = useState<ErpSettings>({
    orderCats: [],
    expCats: [],
  });
  const [tab, setTab] = useState<Tab>("dashboard");
  const [loading, setLoading] = useState(true);
  const [loadingMsg, setLoadingMsg] = useState("Yükleniyor...");
  const [syncOk, setSyncOk] = useState<boolean | null>(null);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  const [orderModalOpen, setOrderModalOpen] = useState(false);
  const [expModalOpen, setExpModalOpen] = useState(false);
  const [expEditId, setExpEditId] = useState<number | null>(null);
  const [emailModalOpen, setEmailModalOpen] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [orderForm, setOrderForm] = useState<OrderForm>(emptyOrderForm);
  const [expForm, setExpForm] = useState<ExpenseForm>({
    tarih: todayStr(),
    kat: "",
    acik: "",
    tutar: "",
    fatno: "",
  });
  const [expFile, setExpFile] = useState<File | null>(null);
  const [fileLabel, setFileLabel] = useState("Tıkla veya sürükle (PDF, JPG, PNG)");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [sSearch, setSSearch] = useState("");
  const [sStatus, setSStatus] = useState("");
  const [sCat, setSCat] = useState("");
  const [orderSort, setOrderSort] = useState<{ key: OrderSortKey; asc: boolean }>({
    key: "tarih",
    asc: false,
  });
  const [expenseSort, setExpenseSort] = useState<{ key: ExpenseSortKey; asc: boolean }>({
    key: "tarih",
    asc: false,
  });

  const [rYear, setRYear] = useState(String(new Date().getFullYear()));
  const [rPeriod, setRPeriod] = useState("all");

  const [newOrderCat, setNewOrderCat] = useState("");
  const [newExpCat, setNewExpCat] = useState("");
  const [emailBody, setEmailBody] = useState("");

  const topbarDate = useMemo(
    () =>
      new Date().toLocaleDateString("tr-TR", {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
      }),
    []
  );

  const orderNums = useMemo(() => assignOrderNums(orders), [orders]);

  const getNum = useCallback(
    (id: number) => orderNums.get(id) ?? "",
    [orderNums]
  );

  const showLoading = useCallback((msg = "Yükleniyor...") => {
    setLoadingMsg(msg);
    setLoading(true);
  }, []);

  const hideLoading = useCallback(() => setLoading(false), []);

  const applyErpData = useCallback((data: { orders: ErpOrder[]; expenses: ErpExpense[]; settings: ErpSettings }) => {
    setOrders(data.orders);
    setExpenses(data.expenses);
    setSettings(data.settings);
    setSyncOk(true);
  }, []);

  const loadData = useCallback(async () => {
    showLoading("Veriler yükleniyor...");
    try {
      const data = await fetchErpData();
      applyErpData(data);
    } catch (e) {
      console.error(e);
      setSyncOk(false);
      alert(
        "Veritabanı bağlantı hatası: " +
          (e instanceof Error ? e.message : "Bilinmeyen hata")
      );
    } finally {
      hideLoading();
    }
  }, [showLoading, hideLoading, applyErpData]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const goTab = useCallback((name: Tab) => {
    setTab(name);
    setMobileNavOpen(false);
  }, []);

  const catFilterOptions = useMemo(() => {
    return Array.from(new Set(orders.map((o) => o.cat).filter(Boolean))).sort();
  }, [orders]);

  const filteredOrders = useMemo(() => {
    const q = sSearch.toLowerCase();
    return orders.filter((o) => {
      if (
        q &&
        !(o.ad + " " + o.soyad + " " + (o.not_icerik || "") + " " + (o.bilgi || ""))
          .toLowerCase()
          .includes(q)
      )
        return false;
      if (sStatus && getOrderStatus(o) !== sStatus) return false;
      if (sCat && o.cat !== sCat) return false;
      return true;
    });
  }, [orders, sSearch, sStatus, sCat]);

  const sortedOrders = useMemo(() => {
    const list = [...filteredOrders];
    const num = (id: number) => Number(getNum(id)) || id;
    list.sort((a, b) => {
      const cmp = compareOrders(a, b, orderSort.key, num);
      return orderSort.asc ? cmp : -cmp;
    });
    return list;
  }, [filteredOrders, orderSort, getNum]);

  const toggleOrderSort = useCallback((key: OrderSortKey) => {
    setOrderSort((prev) =>
      prev.key === key ? { key, asc: !prev.asc } : { key, asc: true }
    );
  }, []);

  const sortIndicator = (key: OrderSortKey) => {
    if (orderSort.key !== key) return "";
    return orderSort.asc ? " ↑" : " ↓";
  };

  const sortedExpenses = useMemo(() => {
    const list = [...expenses];
    list.sort((a, b) => {
      const cmp = compareExpenses(a, b, expenseSort.key);
      return expenseSort.asc ? cmp : -cmp;
    });
    return list;
  }, [expenses, expenseSort]);

  const toggleExpenseSort = useCallback((key: ExpenseSortKey) => {
    setExpenseSort((prev) =>
      prev.key === key ? { key, asc: !prev.asc } : { key, asc: true }
    );
  }, []);

  const expSortIndicator = (key: ExpenseSortKey) => {
    if (expenseSort.key !== key) return "";
    return expenseSort.asc ? " ↑" : " ↓";
  };

  const bitisHint = useMemo(() => {
    if (!orderForm.tarih) return "";
    const b = addWorkdays(orderForm.tarih, 25);
    return "📅 Tahmini bitiş: " + b.toLocaleDateString("tr-TR") + " (25 iş günü)";
  }, [orderForm.tarih]);

  const openOrderModal = useCallback(() => {
    setEditId(null);
    const cats = settings.orderCats;
    setOrderForm({
      ...emptyOrderForm(),
      cat: cats[0] ?? "",
    });
    setOrderModalOpen(true);
  }, [settings.orderCats]);

  const editOrder = useCallback(
    (id: number) => {
      const o = orders.find((x) => x.id === id);
      if (!o) return;
      setEditId(id);
      setOrderForm({
        ad: o.ad,
        soyad: o.soyad,
        tel: o.tel || "",
        tarih: o.tarih || "",
        cat: o.cat || settings.orderCats[0] || "",
        tur: o.tur || "PLX",
        adet: o.adet || 1,
        toplam: o.toplam ? String(o.toplam) : "",
        kapora: o.kapora ? String(o.kapora) : "",
        tahsilat: o.tahsilat ? String(o.tahsilat) : "",
        not_icerik: o.not_icerik || "",
        bilgi: o.bilgi || "",
      });
      setOrderModalOpen(true);
    },
    [orders, settings.orderCats]
  );

  const saveOrder = useCallback(async () => {
    const ad = orderForm.ad.trim();
    const soyad = orderForm.soyad.trim();
    if (!ad || !soyad) {
      alert("Ad ve soyad zorunlu!");
      return;
    }
    if (!orderForm.tarih) {
      alert("Sipariş tarihi zorunlu!");
      return;
    }
    const bitis = addWorkdays(orderForm.tarih, 25).toISOString().slice(0, 10);
    const kapora = +orderForm.kapora || 0;
    const tahsilat = orderForm.tahsilat ? +orderForm.tahsilat : kapora;
    const payload = {
      ad,
      soyad,
      tel: orderForm.tel.trim(),
      tarih: orderForm.tarih,
      bitis,
      cat: orderForm.cat,
      tur: orderForm.tur,
      adet: +orderForm.adet || 1,
      toplam: +orderForm.toplam || 0,
      kapora,
      tahsilat,
      not_icerik: orderForm.not_icerik.trim(),
      bilgi: orderForm.bilgi.trim(),
    };
    showLoading("Kaydediliyor...");
    try {
      if (editId != null) {
        const updated = await updateErpOrder(editId, payload);
        setOrders((prev) =>
          prev.map((o) => (o.id === editId ? { ...o, ...updated } : o))
        );
      } else {
        const created = await createErpOrder(payload);
        setOrders((prev) => [created, ...prev]);
      }
      setOrderModalOpen(false);
    } catch (e) {
      alert("Hata: " + (e instanceof Error ? e.message : "Bilinmeyen hata"));
    } finally {
      hideLoading();
    }
  }, [orderForm, editId, showLoading, hideLoading]);

  const toggleDone = useCallback(
    async (id: number) => {
      showLoading("Güncelleniyor...");
      try {
        const updated = await toggleErpOrderDone(id);
        setOrders((prev) => prev.map((o) => (o.id === id ? updated : o)));
      } catch (e) {
        alert("Hata: " + (e instanceof Error ? e.message : "Bilinmeyen hata"));
      } finally {
        hideLoading();
      }
    },
    [showLoading, hideLoading]
  );

  const setAskida = useCallback(
    async (id: number) => {
      const o = orders.find((x) => x.id === id);
      if (!o) return;
      const nextDurum = o.durum === "askida" ? "bekleyen" : "askida";
      showLoading("Güncelleniyor...");
      try {
        const updated = await updateErpOrder(id, { durum: nextDurum });
        setOrders((prev) => prev.map((x) => (x.id === id ? updated : x)));
      } catch (e) {
        alert("Hata: " + (e instanceof Error ? e.message : "Bilinmeyen hata"));
      } finally {
        hideLoading();
      }
    },
    [orders, showLoading, hideLoading]
  );

  const delOrder = useCallback(
    async (id: number) => {
      if (!confirm("Bu siparişi silmek istediğinizden emin misiniz?")) return;
      showLoading("Siliniyor...");
      try {
        await deleteErpOrder(id);
        setOrders((prev) => prev.filter((o) => o.id !== id));
      } catch (e) {
        alert("Hata: " + (e instanceof Error ? e.message : "Bilinmeyen hata"));
      } finally {
        hideLoading();
      }
    },
    [showLoading, hideLoading]
  );

  const openExpModal = useCallback(() => {
    setExpEditId(null);
    setExpForm({
      tarih: todayStr(),
      kat: settings.expCats[0] ?? "",
      acik: "",
      tutar: "",
      fatno: "",
    });
    setExpFile(null);
    setFileLabel("Tıkla veya sürükle (PDF, JPG, PNG)");
    if (fileInputRef.current) fileInputRef.current.value = "";
    setExpModalOpen(true);
  }, [settings.expCats]);

  const closeExpModal = useCallback(() => {
    setExpModalOpen(false);
    setExpEditId(null);
    setExpFile(null);
    setFileLabel("Tıkla veya sürükle (PDF, JPG, PNG)");
    if (fileInputRef.current) fileInputRef.current.value = "";
  }, []);

  const openEditExpense = useCallback(
    (e: ErpExpense) => {
      setExpEditId(e.id);
      setExpForm({
        tarih: toInputDateValue(e.tarih) || todayStr(),
        kat: e.kat || settings.expCats[0] || "",
        acik: e.acik || "",
        tutar: e.tutar ? String(e.tutar) : "",
        fatno: e.fatno || "",
      });
      setExpFile(null);
      setFileLabel(
        e.dosya
          ? `Mevcut: ${e.dosya} — değiştirmek için yeni dosya seçin`
          : "Tıkla veya sürükle (PDF, JPG, PNG)"
      );
      if (fileInputRef.current) fileInputRef.current.value = "";
      setExpModalOpen(true);
    },
    [settings.expCats]
  );

  const handleFilePick = (e: ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) {
      setExpFile(f);
      setFileLabel("📎 " + f.name);
    }
  };

  const handleDrop = (ev: DragEvent) => {
    ev.preventDefault();
    const f = ev.dataTransfer.files[0];
    if (f) {
      setExpFile(f);
      setFileLabel("📎 " + f.name);
      if (fileInputRef.current) {
        const dt = new DataTransfer();
        dt.items.add(f);
        fileInputRef.current.files = dt.files;
      }
    }
  };

  const saveExpense = useCallback(async () => {
    const { tarih, kat, acik, tutar, fatno } = expForm;
    if (!tarih || !+tutar || !acik.trim()) {
      alert("Tarih, açıklama ve tutar zorunlu!");
      return;
    }
    const form = new FormData();
    form.append("tarih", tarih);
    form.append("kat", kat);
    form.append("acik", acik.trim());
    form.append("tutar", String(+tutar));
    form.append("fatno", fatno.trim());
    if (expFile) form.append("file", expFile);
    showLoading(expEditId != null ? "Güncelleniyor..." : "Kaydediliyor...");
    try {
      if (expEditId != null) {
        const updated = await updateErpExpense(expEditId, form);
        setExpenses((prev) => prev.map((x) => (x.id === expEditId ? { ...x, ...updated } : x)));
      } else {
        const created = await createErpExpense(form);
        setExpenses((prev) => [created, ...prev]);
      }
      closeExpModal();
    } catch (e) {
      alert("Hata: " + (e instanceof Error ? e.message : "Bilinmeyen hata"));
    } finally {
      hideLoading();
    }
  }, [expForm, expFile, expEditId, showLoading, hideLoading, closeExpModal]);

  const delExpense = useCallback(
    async (id: number) => {
      if (!confirm("Bu gideri silmek istediğinizden emin misiniz?")) return;
      showLoading("Siliniyor...");
      try {
        await deleteErpExpense(id);
        setExpenses((prev) => prev.filter((e) => e.id !== id));
      } catch (e) {
        alert("Hata: " + (e instanceof Error ? e.message : "Bilinmeyen hata"));
      } finally {
        hideLoading();
      }
    },
    [showLoading, hideLoading]
  );

  const persistSettings = useCallback(
    async (next: ErpSettings) => {
      try {
        const saved = await saveErpSettings(next);
        setSettings(saved);
      } catch (e) {
        alert("Hata: " + (e instanceof Error ? e.message : "Bilinmeyen hata"));
      }
    },
    []
  );

  const addOrderCat = useCallback(() => {
    const v = newOrderCat.trim();
    if (!v || settings.orderCats.includes(v)) {
      setNewOrderCat("");
      return;
    }
    const next = { ...settings, orderCats: [...settings.orderCats, v] };
    setNewOrderCat("");
    void persistSettings(next);
  }, [newOrderCat, settings, persistSettings]);

  const delOrderCat = useCallback(
    (idx: number) => {
      if (settings.orderCats.length <= 1) return;
      const orderCats = settings.orderCats.filter((_, i) => i !== idx);
      void persistSettings({ ...settings, orderCats });
    },
    [settings, persistSettings]
  );

  const addExpCat = useCallback(() => {
    const v = newExpCat.trim();
    if (!v || settings.expCats.includes(v)) {
      setNewExpCat("");
      return;
    }
    const next = { ...settings, expCats: [...settings.expCats, v] };
    setNewExpCat("");
    void persistSettings(next);
  }, [newExpCat, settings, persistSettings]);

  const delExpCat = useCallback(
    (idx: number) => {
      if (settings.expCats.length <= 1) return;
      const expCats = settings.expCats.filter((_, i) => i !== idx);
      void persistSettings({ ...settings, expCats });
    },
    [settings, persistSettings]
  );

  const exportCSV = useCallback(() => {
    const rows: (string | number)[][] = [
      [
        "#",
        "Ad",
        "Soyad",
        "Tel",
        "Kategori",
        "Malzeme",
        "Adet",
        "Sipariş Tarihi",
        "Bitiş",
        "Toplam",
        "Kapora",
        "Tahsilat",
        "Kalan",
        "Durum",
        "İçerik",
        "Özel Not",
      ],
    ];
    orders.forEach((o) =>
      rows.push([
        getNum(o.id),
        o.ad,
        o.soyad,
        o.tel,
        o.cat,
        o.tur,
        o.adet,
        o.tarih,
        o.bitis,
        o.toplam,
        o.kapora,
        o.tahsilat,
        orderKalan(o),
        getOrderStatus(o),
        o.not_icerik,
        o.bilgi,
      ])
    );
    const csv = rows
      .map((r) =>
        r.map((v) => '"' + String(v ?? "").replace(/"/g, '""') + '"').join(",")
      )
      .join("\n");
    const a = document.createElement("a");
    a.href = "data:text/csv;charset=utf-8,\uFEFF" + encodeURIComponent(csv);
    a.download = "siparisler_" + todayStr() + ".csv";
    a.click();
  }, [orders, getNum]);

  const prepareEmail = useCallback(() => {
    const thisM = monthStr(0);
    const ay = expenses.filter((e) => isInMonth(e.tarih, thisM));
    const allGider = expenses.reduce((s, e) => s + (+e.tutar || 0), 0);
    const tahsilEdilen = computeTahsilat(orders);
    const cats: Record<string, number> = {};
    ay.forEach((e) => {
      cats[e.kat] = (cats[e.kat] || 0) + (+e.tutar || 0);
    });
    const fatList = ay.filter((e) => e.fatno);
    const dosyaList = ay.filter((e) => e.dosya);
    const body = `Konu: ${thisM} Dönemi Mali Özet

Sayın Muhasebeci,

${thisM} dönemine ait mali özet bilgileri aşağıda yer almaktadır.

─────────────────────────────────────
SİPARİŞ & TAHSİLAT
─────────────────────────────────────
Aktif sipariş        : ${orders.filter((o) => isOrderDueTracked(o)).length}
Toplam tahsilat      : ${fmtM(computeTahsilat(orders))}
Alacak         : ${fmtM(computeAlacak(orders))}

─────────────────────────────────────
BU AY GİDERLER (${thisM})
─────────────────────────────────────
Toplam               : ${fmtM(ay.reduce((s, e) => s + (+e.tutar || 0), 0))}
Gider kalemi         : ${ay.length}
Faturalı             : ${fatList.length}
Dosya eklenenler     : ${dosyaList.length}

Kategoriler:
${Object.entries(cats)
  .map(([k, v]) => `  ${k}: ${fmtM(v)}`)
  .join("\n") || "  (kayıt yok)"}

Fatura numaraları    : ${fatList.map((e) => e.fatno).join(", ") || "—"}
Fatura dosyaları     : ${dosyaList.map((e) => e.dosya).join(", ") || "—"}

─────────────────────────────────────
GENEL MALİ DURUM
─────────────────────────────────────
Toplam gider         : ${fmtM(allGider)}
Net kar              : ${fmtM(tahsilEdilen - allGider)}

Saygılarımla`;
    setEmailBody(body);
    setEmailModalOpen(true);
  }, [orders, expenses]);

  const copyEmail = useCallback(() => {
    navigator.clipboard
      .writeText(emailBody)
      .then(() => alert("Panoya kopyalandı!"))
      .catch(() => alert("Lütfen metni elle kopyalayın."));
  }, [emailBody]);

  const daysLeftBadge = (o: ErpOrder) => {
    const st = getOrderStatus(o);
    if (st === "biten")
      return (
        <span className="badge green" style={{ fontSize: 10 }}>
          ✓
        </span>
      );
    if (st === "askida")
      return (
        <span className="badge purple" style={{ fontSize: 10 }}>
          Askıda
        </span>
      );
    const dl = daysLeft(o.bitis);
    if (dl < 0)
      return (
        <span className="badge red" style={{ fontSize: 10 }}>
          {Math.abs(dl)}g geçti
        </span>
      );
    if (dl === 0)
      return (
        <span className="badge red" style={{ fontSize: 10 }}>
          Bugün!
        </span>
      );
    if (dl <= 3)
      return (
        <span className="badge amber" style={{ fontSize: 10 }}>
          {dl} gün
        </span>
      );
    return <span style={{ fontSize: 12, color: "var(--text2)" }}>{dl} gün</span>;
  };

  const buildCatOptions = (arr: string[], selected: string) => {
    const list = selected && !arr.includes(selected) ? [selected, ...arr] : arr;
    return list.map((c) => (
      <option key={c} value={c}>
        {c}
      </option>
    ));
  };

  /* ─── Dashboard computed ─── */
  const dashboard = useMemo(() => {
    const biten = orders.filter((o) => getOrderStatus(o) === "biten");
    const bekleyen = orders.filter((o) => getOrderStatus(o) === "bekleyen");
    const geciken = orders.filter((o) => getOrderStatus(o) === "geciken");
    const askida = orders.filter((o) => getOrderStatus(o) === "askida");
    const topCiro = computeToplamCiro(orders);
    const topTah = computeTahsilat(orders);
    const bitenAdet = orders
      .filter((o) => o.durum === "biten")
      .reduce((s, o) => s + (+o.adet || 0), 0);
    const bekleyenAdet = orders
      .filter((o) => isOrderDueTracked(o))
      .reduce((s, o) => s + (+o.adet || 0), 0);
    const toplamAdet = bitenAdet + bekleyenAdet;
    const topKalan = computeAlacak(orders);
    const topGider = expenses.reduce((s, e) => s + (+e.tutar || 0), 0);

    const alerts: ReactNode[] = [];
    if (geciken.length)
      alerts.push(
        <div className="alert err" key="geciken">
          ⚠ {geciken.length} sipariş teslim süresini geçti!
        </div>
      );
    const soon = orders.filter(
      (o) =>
        isOrderDueTracked(o) &&
        getOrderStatus(o) === "bekleyen" &&
        daysLeft(o.bitis) >= 0 &&
        daysLeft(o.bitis) <= 3
    );
    if (soon.length)
      alerts.push(
        <div className="alert warn" key="soon">
          🕐 {soon.length} sipariş 3 gün içinde teslim tarihi dolacak.
        </div>
      );

    const upcoming = orders
      .filter((o) => isOrderDueTracked(o))
      .sort((a, b) => daysLeft(a.bitis) - daysLeft(b.bitis));

    const expCats: Record<string, number> = {};
    expenses.forEach((e) => {
      expCats[e.kat] = (expCats[e.kat] || 0) + (+e.tutar || 0);
    });
    const expCatEntries = (Object.entries(expCats) as [string, number][]).filter(
      ([k]) => k.trim().localeCompare("Diğer", "tr", { sensitivity: "base" }) !== 0
    );

    const prodCats: Record<string, number> = {};
    orders.forEach((o) => {
      if (o.cat) prodCats[o.cat] = (prodCats[o.cat] || 0) + (+o.toplam || 0);
    });

    return {
      metrics: {
        bekleyen,
        biten,
        geciken,
        askida,
        toplamAdet,
        topTah,
        topKalan,
        topGider,
        topCiro,
      },
      alerts,
      upcoming,
      expCatEntries,
      prodCatEntries: Object.entries(prodCats) as [string, number][],
    };
  }, [orders, expenses]);

  /* ─── Expenses computed ─── */
  const expenseView = useMemo(() => {
    const total = expenses.reduce((s, e) => s + (+e.tutar || 0), 0);
    const thisM = monthStr(0);
    const aylik = expenses
      .filter((e) => isInMonth(e.tarih, thisM))
      .reduce((s, e) => s + (+e.tutar || 0), 0);
    const faturali = expenses.filter((e) => e.fatno || e.dosya).length;
    const cats: Record<string, number> = {};
    expenses.forEach((e) => {
      cats[e.kat] = (cats[e.kat] || 0) + (+e.tutar || 0);
    });
    const months: Record<string, number> = {};
    expenses.forEach((e) => {
      const m = dateMonthKey(e.tarih);
      if (m) months[m] = (months[m] || 0) + (+e.tutar || 0);
    });
    const monthEntries = Object.entries(months).sort().slice(-6) as [string, number][];
    const mMax = Math.max(...monthEntries.map(([, v]) => v), 1);
    return { total, aylik, faturali, catEntries: Object.entries(cats) as [string, number][], monthEntries, mMax };
  }, [expenses]);

  /* ─── Reports computed ─── */
  const reports = useMemo(() => {
    const ord = filterByPeriod(orders, rPeriod, rYear);
    const exp = filterByPeriod(expenses, rPeriod, rYear);
    const topToplam = computeToplamCiro(ord);
    const topTah = computeTahsilat(ord);
    const topGider = exp.reduce((s, e) => s + (+e.tutar || 0), 0);
    const topAdet = ord.reduce((s, o) => s + (+o.adet || 0), 0);
    const sipAdet = ord.length;
    const plxOrd = ord.filter((o) => o.tur === "PLX");
    const polyOrd = ord.filter((o) => o.tur === "Poly");
    const plxAdet = plxOrd.reduce((s, o) => s + (+o.adet || 0), 0);
    const polyAdet = polyOrd.reduce((s, o) => s + (+o.adet || 0), 0);
    const reklam = exp
      .filter((e) => e.kat?.includes("Reklam"))
      .reduce((s, e) => s + (+e.tutar || 0), 0);
    const maas = exp
      .filter((e) => e.kat?.includes("Maaş") || e.kat?.includes("Personel"))
      .reduce((s, e) => s + (+e.tutar || 0), 0);
    const nakliye = exp
      .filter((e) => e.kat?.includes("Kargo") || e.kat?.includes("Nakliye"))
      .reduce((s, e) => s + (+e.tutar || 0), 0);
    const safe = (n: number) => (isFinite(n) && !isNaN(n) ? n : 0);
    const pct = (a: number, b: number) => (b ? fmtPct(safe(a / b) * 100) : "—");
    const avg = (a: number, b: number) => (b ? fmtM(safe(a / b)) : "—");

    const week = orders
      .filter(
        (o) =>
          isOrderDueTracked(o) &&
          daysLeft(o.bitis) >= 0 &&
          daysLeft(o.bitis) <= 7
      )
      .sort((a, b) => daysLeft(a.bitis) - daysLeft(b.bitis));

    const allToplam = computeToplamCiro(orders);
    const allTah = computeTahsilat(orders);
    const allAlacak = computeAlacak(orders);
    const allGider = expenses.reduce((s, e) => s + (+e.tutar || 0), 0);
    const tahRate = allToplam ? Math.round((allTah / allToplam) * 100) : 0;

    const months: Record<string, number> = {};
    orders.forEach((o) => {
      const m = dateMonthKey(o.tarih);
      if (m) months[m] = (months[m] || 0) + (+o.tahsilat || 0);
    });
    const monthlyEntries = Object.entries(months).sort().slice(-8) as [string, number][];
    const mMax = Math.max(...monthlyEntries.map(([, v]) => v), 1);

    return {
      production: [
        ["Toplam üretilen adet", topAdet, "var(--blue)"],
        ["PLX adet", plxAdet, "var(--blue)"],
        ["Poly adet", polyAdet, "var(--purple)"],
        ["Toplam sipariş (TOTAL)", sipAdet, ""],
        ["PLX sipariş", plxOrd.length, "var(--blue)"],
        ["Poly sipariş", polyOrd.length, "var(--purple)"],
      ] as [string, string | number, string][],
      averages: [
        ["Parça başı ortalama (ciro ÷ adet)", avg(topToplam, topAdet), "var(--green)"],
        ["Sipariş başı ortalama (ciro ÷ sipariş)", avg(topToplam, sipAdet), "var(--green)"],
        ["Parça başı tahsilat", avg(topTah, topAdet), ""],
        ["Sipariş başı tahsilat", avg(topTah, sipAdet), ""],
      ] as [string, string, string][],
      revenue: [
        ["Toplam ciro", fmtM(topToplam), "var(--blue)"],
        ["Tahsilat", fmtM(topTah), "var(--green)"],
        [
          "PLX (Pleksi) cirosu",
          fmtM(plxOrd.reduce((s, o) => s + (+o.toplam || 0), 0)),
          "var(--blue)",
        ],
        [
          "Poly (Polyester) cirosu",
          fmtM(polyOrd.reduce((s, o) => s + (+o.toplam || 0), 0)),
          "var(--purple)",
        ],
        ["Maliyetin ciroda yüzdesi", pct(topGider, topToplam), "var(--red)"],
      ] as [string, string, string][],
      ads: [
        ["Toplam reklam gideri", fmtM(reklam), ""],
        ["Reklamların ciroda yüzdesi", pct(reklam, topToplam), "var(--amber)"],
        ["Birim başı reklam maliyeti", avg(reklam, topAdet), ""],
        ["Sipariş başı reklam maliyeti", avg(reklam, sipAdet), ""],
      ] as [string, string, string][],
      cost: [
        ["Toplam gider", fmtM(topGider), "var(--red)"],
        ["Birim başı parça maliyeti", avg(topGider, topAdet), ""],
        ["Sipariş başı maliyet", avg(topGider, sipAdet), ""],
      ] as [string, string, string][],
      salary: [
        ["Toplam maaş gideri", fmtM(maas), ""],
        ["Maaşların ciroda yüzdesi", pct(maas, topToplam), "var(--amber)"],
        ["Maaşların birim maliyeti", avg(maas, topAdet), ""],
        ["Maaşların sipariş maliyeti", avg(maas, sipAdet), ""],
      ] as [string, string, string][],
      cargo: [
        ["Toplam nakliye gideri", fmtM(nakliye), ""],
        ["Nakliyenin ciroda yüzdesi", pct(nakliye, topToplam), "var(--amber)"],
        ["Nakliyenin birim maliyeti", avg(nakliye, topAdet), ""],
        ["Nakliyenin sipariş maliyeti", avg(nakliye, sipAdet), ""],
      ] as [string, string, string][],
      week,
      tahRate,
      allToplam,
      allTah,
      allAlacak,
      allGider,
      monthlyEntries,
      mMax,
    };
  }, [orders, expenses, rPeriod, rYear]);

  const reportRows = (data: [string, string | number, string][]) =>
    data.map(([l, v, c]) => (
      <tr key={l}>
        <td>{l}</td>
        <td style={{ color: c || "var(--text)" }}>{v}</td>
      </tr>
    ));

  const navBtn = (name: Tab, label: string, onClick?: () => void) => (
    <button
      type="button"
      className={`nav-item${tab === name ? " active" : ""}`}
      onClick={() => {
        goTab(name);
        onClick?.();
      }}
    >
      {label}
    </button>
  );

  return (
    <>
      {loading && (
        <div className="loading-overlay">
          <div className="spinner" />
          {loadingMsg}
        </div>
      )}

      <div className="shell">
        <aside className="sidebar">
          <div className="sb-logo">
            <div className="sb-logo-t">⬡ İş Paneli</div>
            <div className="sb-logo-s" id="sync-status">
              {syncOk === null ? (
                "…"
              ) : syncOk ? (
                <>
                  <span className="sync-dot" />
                  Bağlı
                </>
              ) : (
                <>
                  <span className="sync-dot err" />
                  Bağlantı hatası
                </>
              )}
            </div>
          </div>
          <nav className="sb-nav">
            {navBtn("dashboard", "◈ Dashboard")}
            {navBtn("siparisler", "▦ Siparişler")}
            {navBtn("giderler", "◎ Giderler")}
            {navBtn("raporlar", "◉ Raporlar")}
            {navBtn("tanimlamalar", "⚙ Tanımlamalar")}
          </nav>
        </aside>

        <div className="main">
          <header className="topbar">
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <button
                type="button"
                className="hamburger"
                onClick={() => setMobileNavOpen((v) => !v)}
              >
                ☰
              </button>
              <div>
                <div className="topbar-title">{TITLES[tab]}</div>
                <div className="topbar-date">{topbarDate}</div>
              </div>
            </div>
            <div className="topbar-actions">
              <Link href="/admin" className="erp-back-link">
                ← Admin
              </Link>
              <button type="button" className="btn sm primary" onClick={openOrderModal}>
                + Sipariş
              </button>
              <button type="button" className="btn sm" onClick={openExpModal}>
                + Gider
              </button>
              <button type="button" className="btn sm" onClick={exportCSV}>
                ↓ CSV
              </button>
            </div>
          </header>

          <nav className={`mobile-nav${mobileNavOpen ? " open" : ""}`} id="mobile-nav">
            {navBtn("dashboard", "◈ Dashboard", () => setMobileNavOpen(false))}
            {navBtn("siparisler", "▦ Siparişler", () => setMobileNavOpen(false))}
            {navBtn("giderler", "◎ Giderler", () => setMobileNavOpen(false))}
            {navBtn("raporlar", "◉ Raporlar", () => setMobileNavOpen(false))}
            {navBtn("tanimlamalar", "⚙ Tanımlamalar", () => setMobileNavOpen(false))}
            <Link
              href="/admin"
              className="nav-item erp-back-link"
              style={{ color: "var(--text2)" }}
            >
              ← Admin
            </Link>
          </nav>

          <div className="content">
            {/* DASHBOARD */}
            <div className={`page${tab === "dashboard" ? " active" : ""}`} id="page-dashboard">
              <div id="d-alerts">{dashboard.alerts}</div>
              <div className="metric-grid dashboard-metrics" id="d-metrics">
                <div className="metric">
                  <div className="metric-label">Bekleyen</div>
                  <div className="metric-value" style={{ color: "var(--amber)" }}>
                    {dashboard.metrics.bekleyen.length}
                  </div>
                </div>
                <div className="metric">
                  <div className="metric-label">Tamamlanan</div>
                  <div className="metric-value" style={{ color: "var(--green)" }}>
                    {dashboard.metrics.biten.length}
                  </div>
                </div>
                <div className="metric">
                  <div className="metric-label">Geciken</div>
                  <div className="metric-value" style={{ color: "var(--red)" }}>
                    {dashboard.metrics.geciken.length}
                  </div>
                </div>
                <div className="metric">
                  <div className="metric-label">Askıda</div>
                  <div className="metric-value" style={{ color: "var(--purple)" }}>
                    {dashboard.metrics.askida.length}
                  </div>
                </div>
                <div className="metric">
                  <div className="metric-label">Toplam Adet</div>
                  <div className="metric-value" style={{ color: "var(--text)" }}>
                    {dashboard.metrics.toplamAdet}
                  </div>
                </div>
                <div className="metric">
                  <div className="metric-label">Tahsilat</div>
                  <div
                    className="metric-value"
                    style={{ color: "var(--green)" }}
                    title={fmtM(dashboard.metrics.topTah)}
                  >
                    {fmtMK(dashboard.metrics.topTah)}
                  </div>
                </div>
                <div className="metric">
                  <div className="metric-label">Alacak</div>
                  <div
                    className="metric-value"
                    style={{ color: "var(--amber)" }}
                    title={fmtM(dashboard.metrics.topKalan)}
                  >
                    {fmtMK(dashboard.metrics.topKalan)}
                  </div>
                </div>
                <div className="metric">
                  <div className="metric-label">Toplam Gider</div>
                  <div
                    className="metric-value"
                    style={{ color: "var(--red)" }}
                    title={fmtM(dashboard.metrics.topGider)}
                  >
                    {fmtMK(dashboard.metrics.topGider)}
                  </div>
                </div>
                <div className="metric">
                  <div className="metric-label">Toplam Ciro</div>
                  <div
                    className="metric-value"
                    style={{ color: "var(--blue)" }}
                    title={fmtM(dashboard.metrics.topCiro)}
                  >
                    {fmtMK(dashboard.metrics.topCiro)}
                  </div>
                </div>
              </div>
              <div className="grid2" style={{ marginBottom: 14 }}>
                <div className="card" style={{ margin: 0 }}>
                  <div className="card-title">Bu Ay</div>
                  <MonthBox ms={monthStr(0)} orders={orders} expenses={expenses} />
                </div>
                <div className="card" style={{ margin: 0 }}>
                  <div className="card-title">Geçen Ay</div>
                  <MonthBox ms={monthStr(-1)} orders={orders} expenses={expenses} />
                </div>
              </div>
              <div className="grid2">
                <div className="card">
                  <div className="card-title">⏱ Bitime Yakın</div>
                  <div id="d-upcoming" className="d-upcoming-scroll">
                    {dashboard.upcoming.length ? (
                      dashboard.upcoming.map((o) => {
                        const dl = daysLeft(o.bitis);
                        const c = dl < 0 ? "red" : dl <= 3 ? "amber" : "green";
                        const label =
                          dl < 0
                            ? Math.abs(dl) + " gün gecikti"
                            : dl === 0
                              ? "Bugün teslim"
                              : dl + " gün kaldı";
                        return (
                          <div
                            key={o.id}
                            style={{
                              display: "flex",
                              justifyContent: "space-between",
                              alignItems: "center",
                              padding: "9px 0",
                              borderBottom: "1px solid var(--border)",
                            }}
                          >
                            <div style={{ minWidth: 0, flex: 1, paddingRight: 8 }}>
                              <div
                                style={{
                                  fontSize: 13,
                                  fontWeight: 500,
                                  color: "var(--text)",
                                }}
                              >
                                {o.ad} {o.soyad}
                              </div>
                              <div
                                style={{
                                  fontSize: 11,
                                  color: "var(--text3)",
                                  marginTop: 2,
                                  lineHeight: 1.35,
                                }}
                              >
                                {(o.cat || "—") + " · Bitiş " + fmtDate(o.bitis)}
                                <span style={{ color: "var(--text2)" }}> · {label}</span>
                              </div>
                            </div>
                            <span className={`badge ${c}`} style={{ flexShrink: 0 }}>
                              {label}
                            </span>
                          </div>
                        );
                      })
                    ) : (
                      <div className="empty">Bekleyen yok 🎉</div>
                    )}
                  </div>
                </div>
                <div className="card">
                  <div className="card-title">Gider Dağılımı</div>
                  <div className="bar-chart" id="d-exp-chart">
                    {renderBarChart(dashboard.expCatEntries, { maxItems: 6 })}
                  </div>
                </div>
              </div>
              <div className="card">
                <div className="card-title">Ürün Kategorisi Ciroları</div>
                <div className="bar-chart" id="d-cat-revenue">
                  {dashboard.prodCatEntries.length
                    ? renderBarChart(dashboard.prodCatEntries, {
                        labelFn: (k) => k,
                      })
                    : (
                      <div className="empty">Veri yok</div>
                    )}
                </div>
              </div>
              <div className="card">
                <div className="card-title">Son Siparişler</div>
                <div className="tbl-wrap">
                  <table>
                    <thead>
                      <tr>
                        <th>#</th>
                        <th>Müşteri</th>
                        <th>Kategori</th>
                        <th>Bitiş</th>
                        <th>Tahsilat</th>
                        <th>Kalan</th>
                        <th>Durum</th>
                      </tr>
                    </thead>
                    <tbody id="d-orders">
                      {orders.slice(0, 6).map((o) => {
                        const st = getOrderStatus(o);
                        const kalan = orderKalan(o);
                        return (
                          <tr key={o.id}>
                            <td style={{ fontSize: 11, color: "var(--text3)" }}>
                              #{getNum(o.id)}
                            </td>
                            <td className="b">
                              {o.ad} {o.soyad}
                            </td>
                            <td>
                              <span className="badge blue" style={{ fontSize: 10 }}>
                                {o.cat || ""}
                              </span>
                            </td>
                            <td style={{ fontSize: 12 }}>{fmtDate(o.bitis)}</td>
                            <td style={{ color: "var(--green)", fontWeight: 500 }}>
                              {fmtM(o.tahsilat)}
                            </td>
                            <td
                              style={{
                                color: kalan > 0 ? "var(--amber)" : "var(--text3)",
                                fontWeight: kalan > 0 ? 500 : undefined,
                              }}
                            >
                              {kalan > 0 ? fmtM(kalan) : "—"}
                            </td>
                            <td>
                              <span className={`badge ${STATUS_COLORS[st]}`}>
                                {STATUS_LABELS[st]}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            {/* SİPARİŞLER */}
            <div
              className={`page${tab === "siparisler" ? " active" : ""}`}
              id="page-siparisler"
            >
              <div className="filter-row">
                <input
                  id="s-search"
                  placeholder="Ara..."
                  value={sSearch}
                  onChange={(e) => setSSearch(e.target.value)}
                />
                <select
                  id="s-status"
                  value={sStatus}
                  onChange={(e) => setSStatus(e.target.value)}
                >
                  <option value="">Tüm Durumlar</option>
                  <option value="bekleyen">Bekleyen</option>
                  <option value="biten">Tamamlanan</option>
                  <option value="geciken">Geciken</option>
                  <option value="askida">Askıda</option>
                </select>
                <select id="s-cat" value={sCat} onChange={(e) => setSCat(e.target.value)}>
                  <option value="">Kategori</option>
                  {catFilterOptions.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
                <span
                  style={{ fontSize: 12, color: "var(--text3)", flexShrink: 0 }}
                  id="s-count"
                >
                  {sortedOrders.length} kayıt
                </span>
              </div>
              <div className="card" style={{ padding: 0, overflow: "hidden" }}>
                <div className="tbl-wrap">
                  <table>
                    <thead>
                      <tr>
                        <th
                          className={`sortable${orderSort.key === "num" ? " sorted" : ""}`}
                          onClick={() => toggleOrderSort("num")}
                        >
                          #{sortIndicator("num")}
                        </th>
                        <th
                          className={`sortable${orderSort.key === "tarih" ? " sorted" : ""}`}
                          onClick={() => toggleOrderSort("tarih")}
                        >
                          Tarih{sortIndicator("tarih")}
                        </th>
                        <th
                          className={`sortable${orderSort.key === "gun" ? " sorted" : ""}`}
                          onClick={() => toggleOrderSort("gun")}
                        >
                          Kaç Gün{sortIndicator("gun")}
                        </th>
                        <th
                          className={`sortable${orderSort.key === "cat" ? " sorted" : ""}`}
                          onClick={() => toggleOrderSort("cat")}
                        >
                          Kategori{sortIndicator("cat")}
                        </th>
                        <th
                          className={`sortable${orderSort.key === "bilgi" ? " sorted" : ""}`}
                          onClick={() => toggleOrderSort("bilgi")}
                        >
                          Özel Bilgi{sortIndicator("bilgi")}
                        </th>
                        <th
                          className={`sortable${orderSort.key === "kapora" ? " sorted" : ""}`}
                          onClick={() => toggleOrderSort("kapora")}
                        >
                          Kapora{sortIndicator("kapora")}
                        </th>
                        <th
                          className={`sortable${orderSort.key === "tahsilat" ? " sorted" : ""}`}
                          onClick={() => toggleOrderSort("tahsilat")}
                        >
                          Tahsilat{sortIndicator("tahsilat")}
                        </th>
                        <th
                          className={`sortable${orderSort.key === "kalan" ? " sorted" : ""}`}
                          onClick={() => toggleOrderSort("kalan")}
                        >
                          Kalan{sortIndicator("kalan")}
                        </th>
                        <th
                          className={`sortable${orderSort.key === "ad" ? " sorted" : ""}`}
                          onClick={() => toggleOrderSort("ad")}
                        >
                          Ad Soyad{sortIndicator("ad")}
                        </th>
                        <th
                          className={`sortable${orderSort.key === "bitis" ? " sorted" : ""}`}
                          onClick={() => toggleOrderSort("bitis")}
                        >
                          Bitiş Tarihi{sortIndicator("bitis")}
                        </th>
                        <th>İşlem</th>
                      </tr>
                    </thead>
                    <tbody id="s-tbody">
                      {sortedOrders.length ? (
                        sortedOrders.map((o) => {
                          const st = getOrderStatus(o);
                          const kalan = orderKalan(o);
                          const bilgiTxt = o.bilgi
                            ? o.bilgi.slice(0, 40) + (o.bilgi.length > 40 ? "…" : "")
                            : "—";
                          return (
                            <tr key={o.id}>
                              <td style={{ fontSize: 11 }}>
                                <span
                                  className={`dot ${STATUS_COLORS[st]}`}
                                  style={{ marginRight: 4 }}
                                />
                                #{getNum(o.id)}
                              </td>
                              <td style={{ fontSize: 12, color: "var(--text3)" }}>
                                {fmtDate(o.tarih)}
                              </td>
                              <td>{daysLeftBadge(o)}</td>
                              <td>
                                <span className="badge blue" style={{ fontSize: 10 }}>
                                  {o.cat || ""}
                                </span>
                              </td>
                              <td
                                style={{
                                  fontSize: 11,
                                  color: "var(--text2)",
                                  maxWidth: 140,
                                  overflow: "hidden",
                                  textOverflow: "ellipsis",
                                  whiteSpace: "nowrap",
                                }}
                                title={o.bilgi || ""}
                              >
                                {bilgiTxt}
                              </td>
                              <td>{fmtM(o.kapora)}</td>
                              <td style={{ color: "var(--green)", fontWeight: 500 }}>
                                {fmtM(o.tahsilat)}
                              </td>
                              <td
                                style={{
                                  color: kalan > 0 ? "var(--amber)" : "var(--text3)",
                                  fontWeight: kalan > 0 ? 500 : undefined,
                                }}
                              >
                                {kalan > 0 ? fmtM(kalan) : "✓"}
                              </td>
                              <td className="b">
                                <span
                                  dangerouslySetInnerHTML={{
                                    __html: escHtml(o.ad),
                                  }}
                                />
                                <br />
                                <span
                                  style={{
                                    fontWeight: 400,
                                    color: "var(--text3)",
                                    fontSize: 11,
                                  }}
                                  dangerouslySetInnerHTML={{
                                    __html: escHtml(o.soyad),
                                  }}
                                />
                              </td>
                              <td style={{ fontSize: 12, color: "var(--text3)" }}>
                                {fmtDate(o.bitis)}
                              </td>
                              <td style={{ whiteSpace: "nowrap" }}>
                                <button
                                  type="button"
                                  className="btn sm"
                                  onClick={() => editOrder(o.id)}
                                >
                                  ✏
                                </button>
                                <button
                                  type="button"
                                  className="btn sm"
                                  onClick={() => void toggleDone(o.id)}
                                  title={st === "biten" ? "Bekleyene al" : "Tamamlandı"}
                                >
                                  {st === "biten" ? "↺" : "✓"}
                                </button>
                                <button
                                  type="button"
                                  className={`btn sm${st === "askida" ? " primary" : ""}`}
                                  onClick={() => void setAskida(o.id)}
                                  title={
                                    st === "askida"
                                      ? "Askıdan çıkar"
                                      : "Askıya al (teslim/ödeme beklenmiyor)"
                                  }
                                >
                                  ⏸
                                </button>
                                <button
                                  type="button"
                                  className="btn sm danger"
                                  onClick={() => void delOrder(o.id)}
                                >
                                  ✕
                                </button>
                              </td>
                            </tr>
                          );
                        })
                      ) : (
                        <tr>
                          <td colSpan={11} className="empty">
                            Sipariş bulunamadı.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            {/* GİDERLER */}
            <div className={`page${tab === "giderler" ? " active" : ""}`} id="page-giderler">
              <div className="metric-grid" id="g-metrics">
                <div className="metric">
                  <div className="metric-label">Toplam Gider</div>
                  <div className="metric-value" style={{ color: "var(--red)" }}>
                    {fmtM(expenseView.total)}
                  </div>
                </div>
                <div className="metric">
                  <div className="metric-label">Bu Ay</div>
                  <div className="metric-value" style={{ color: "var(--amber)" }}>
                    {fmtM(expenseView.aylik)}
                  </div>
                </div>
                <div className="metric">
                  <div className="metric-label">Faturalı</div>
                  <div className="metric-value" style={{ color: "var(--blue)" }}>
                    {expenseView.faturali}/{expenses.length}
                  </div>
                </div>
                <div className="metric">
                  <div className="metric-label">Ortalama</div>
                  <div className="metric-value">
                    {expenses.length ? fmtM(expenseView.total / expenses.length) : "—"}
                  </div>
                </div>
              </div>
              <div className="grid2" style={{ marginBottom: 14 }}>
                <div className="card" style={{ margin: 0 }}>
                  <div className="card-title">Kategoriye Göre</div>
                  <div className="bar-chart" id="g-cat-chart">
                    {renderBarChart(expenseView.catEntries)}
                  </div>
                </div>
                <div className="card" style={{ margin: 0 }}>
                  <div className="card-title">Aylık Trend</div>
                  <div className="bar-chart" id="g-month-chart">
                    {expenseView.monthEntries.length ? (
                      expenseView.monthEntries.map(([m, v]) => (
                        <div className="bar-row" key={m}>
                          <div className="bar-label">
                            {m.slice(5)}.{m.slice(2, 4)}
                          </div>
                          <div className="bar-track">
                            <div
                              className="bar-fill"
                              style={{
                                width: `${Math.round((v / expenseView.mMax) * 100)}%`,
                                background: "#60a5fa",
                              }}
                            />
                          </div>
                          <div className="bar-val">{fmtM(v)}</div>
                        </div>
                      ))
                    ) : (
                      <div className="empty">Veri yok</div>
                    )}
                  </div>
                </div>
              </div>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: 10,
                  flexWrap: "wrap",
                  gap: 8,
                }}
              >
                <div style={{ fontSize: 14, fontWeight: 500 }}>
                  Fatura / Gider Listesi
                </div>
                <button type="button" className="btn sm success" onClick={prepareEmail}>
                  ✉ Muhasebeye Gönder
                </button>
              </div>
              <div className="card" style={{ padding: 0, overflow: "hidden" }}>
                <div className="tbl-wrap">
                  <table>
                    <thead>
                      <tr>
                        <th
                          className={`sortable${expenseSort.key === "tarih" ? " sorted" : ""}`}
                          onClick={() => toggleExpenseSort("tarih")}
                        >
                          Tarih{expSortIndicator("tarih")}
                        </th>
                        <th
                          className={`sortable${expenseSort.key === "kat" ? " sorted" : ""}`}
                          onClick={() => toggleExpenseSort("kat")}
                        >
                          Kategori{expSortIndicator("kat")}
                        </th>
                        <th
                          className={`sortable${expenseSort.key === "acik" ? " sorted" : ""}`}
                          onClick={() => toggleExpenseSort("acik")}
                        >
                          Açıklama{expSortIndicator("acik")}
                        </th>
                        <th
                          className={`sortable${expenseSort.key === "tutar" ? " sorted" : ""}`}
                          onClick={() => toggleExpenseSort("tutar")}
                        >
                          Tutar{expSortIndicator("tutar")}
                        </th>
                        <th
                          className={`sortable${expenseSort.key === "fatno" ? " sorted" : ""}`}
                          onClick={() => toggleExpenseSort("fatno")}
                        >
                          Fatura No{expSortIndicator("fatno")}
                        </th>
                        <th>Dosya</th>
                        <th>İşlem</th>
                      </tr>
                    </thead>
                    <tbody id="g-tbody">
                      {sortedExpenses.length ? (
                        sortedExpenses.map((e) => (
                          <tr key={e.id}>
                            <td style={{ fontSize: 12, color: "var(--text3)", whiteSpace: "nowrap" }}>
                              {fmtDate(e.tarih)}
                            </td>
                            <td>
                              <span className="badge blue" style={{ fontSize: 10 }}>
                                {escHtml(e.kat)}
                              </span>
                            </td>
                            <td className="b">{escHtml(e.acik)}</td>
                            <td style={{ fontWeight: 500 }}>{fmtM(e.tutar)}</td>
                            <td>
                              {e.fatno ? (
                                <span className="badge green">{escHtml(e.fatno)}</span>
                              ) : (
                                <span style={{ color: "var(--text3)", fontSize: 11 }}>
                                  —
                                </span>
                              )}
                            </td>
                            <td>
                              {e.dosya ? (
                                <span className="badge green">📎 {escHtml(e.dosya)}</span>
                              ) : (
                                <span style={{ color: "var(--text3)", fontSize: 11 }}>
                                  —
                                </span>
                              )}
                            </td>
                            <td>
                              <div style={{ display: "flex", gap: 6, flexWrap: "wrap", justifyContent: "flex-end" }}>
                                <button
                                  type="button"
                                  className="btn sm"
                                  onClick={() => openEditExpense(e)}
                                >
                                  Düzenle
                                </button>
                                <button
                                  type="button"
                                  className="btn sm danger"
                                  onClick={() => void delExpense(e.id)}
                                >
                                  ✕
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={7} className="empty">
                            Gider yok
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            {/* RAPORLAR */}
            <div className={`page${tab === "raporlar" ? " active" : ""}`} id="page-raporlar">
              <div style={{ display: "flex", gap: 8, marginBottom: 14, flexWrap: "wrap" }}>
                <select
                  id="r-year"
                  value={rYear}
                  onChange={(e) => setRYear(e.target.value)}
                  style={{ width: "auto" }}
                >
                  <option value="2025">2025</option>
                  <option value="2026">2026</option>
                </select>
                <select
                  id="r-period"
                  value={rPeriod}
                  onChange={(e) => setRPeriod(e.target.value)}
                  style={{ width: "auto" }}
                >
                  <option value="all">Tüm Zamanlar</option>
                  <option value="thismonth">Bu Ay</option>
                  <option value="lastmonth">Geçen Ay</option>
                  <option value="q1">Q1</option>
                  <option value="q2">Q2</option>
                  <option value="q3">Q3</option>
                  <option value="q4">Q4</option>
                </select>
              </div>
              <div className="card" style={{ padding: 0, overflow: "hidden" }}>
                <div className="report-section">Üretim & Sipariş</div>
                <table className="report-table">
                  <tbody id="r-production">{reportRows(reports.production)}</tbody>
                </table>
                <div className="report-section">Ortalamalar</div>
                <table className="report-table">
                  <tbody id="r-averages">{reportRows(reports.averages)}</tbody>
                </table>
                <div className="report-section">Ciro Analizi</div>
                <table className="report-table">
                  <tbody id="r-revenue">{reportRows(reports.revenue)}</tbody>
                </table>
                <div className="report-section">Reklam Maliyetleri</div>
                <table className="report-table">
                  <tbody id="r-ads">{reportRows(reports.ads)}</tbody>
                </table>
                <div className="report-section">Hammadde / Genel Maliyet</div>
                <table className="report-table">
                  <tbody id="r-cost">{reportRows(reports.cost)}</tbody>
                </table>
                <div className="report-section">Maaşlar</div>
                <table className="report-table">
                  <tbody id="r-salary">{reportRows(reports.salary)}</tbody>
                </table>
                <div className="report-section">Nakliye</div>
                <table className="report-table">
                  <tbody id="r-cargo">{reportRows(reports.cargo)}</tbody>
                </table>
              </div>
              <div className="grid2" style={{ marginTop: 14 }}>
                <div className="card">
                  <div className="card-title">Bu Hafta Teslim</div>
                  <div id="r-week">
                    {reports.week.length ? (
                      reports.week.map((o) => {
                        const dl = daysLeft(o.bitis);
                        return (
                          <div
                            key={o.id}
                            style={{
                              padding: "9px 0",
                              borderBottom: "1px solid var(--border)",
                            }}
                          >
                            <div
                              style={{
                                display: "flex",
                                justifyContent: "space-between",
                              }}
                            >
                              <span style={{ fontWeight: 500, color: "var(--text)" }}>
                                {escHtml(o.ad)} {escHtml(o.soyad)}
                              </span>
                              <span
                                className={`badge ${dl === 0 ? "red" : dl <= 3 ? "amber" : "green"}`}
                              >
                                {dl === 0 ? "Bugün" : dl + " gün"}
                              </span>
                            </div>
                            <div
                              style={{
                                fontSize: 11,
                                color: "var(--text3)",
                                marginTop: 3,
                              }}
                            >
                              {o.cat || ""} · {o.tur}×{o.adet} · Kalan:{" "}
                              {fmtM(orderKalan(o))}
                            </div>
                          </div>
                        );
                      })
                    ) : (
                      <div className="empty">Bu hafta teslim yok 🎉</div>
                    )}
                  </div>
                </div>
                <div className="card">
                  <div className="card-title">Tahsilat Özeti</div>
                  <div id="r-collection">
                    <div style={{ marginBottom: 12 }}>
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          fontSize: 13,
                          marginBottom: 5,
                        }}
                      >
                        <span style={{ color: "var(--text2)" }}>Tahsilat oranı</span>
                        <span style={{ fontWeight: 500 }}>{reports.tahRate}%</span>
                      </div>
                      <div className="progress">
                        <div
                          className="progress-fill"
                          style={{
                            width: `${reports.tahRate}%`,
                            background: "var(--green)",
                          }}
                        />
                      </div>
                    </div>
                    {(
                      [
                        ["Toplam Ciro", reports.allToplam, "var(--blue)"],
                        ["Tahsil Edilen", reports.allTah, "var(--green)"],
                        ["Alacak", reports.allAlacak, "var(--amber)"],
                        ["Toplam Gider", reports.allGider, "var(--red)"],
                        [
                          "Net Kar",
                          reports.allTah - reports.allGider,
                          reports.allTah - reports.allGider >= 0
                            ? "var(--blue)"
                            : "var(--red)",
                        ],
                      ] as const
                    ).map(([l, v, c]) => (
                      <div
                        key={l}
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          padding: "7px 0",
                          borderBottom: "1px solid var(--border)",
                          fontSize: 13,
                        }}
                      >
                        <span style={{ color: "var(--text2)" }}>{l}</span>
                        <span style={{ fontWeight: 500, color: c }}>{fmtM(v)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
              <div className="card">
                <div className="card-title">Aylık Tahsilat</div>
                <div className="bar-chart" id="r-monthly">
                  {reports.monthlyEntries.length ? (
                    reports.monthlyEntries.map(([m, v]) => {
                      const pct = Math.round((v / reports.mMax) * 100);
                      return (
                        <div className="bar-row" key={m}>
                          <div className="bar-label">
                            {m.slice(5)}.{m.slice(2, 4)}
                          </div>
                          <div className="bar-track">
                            <div
                              className="bar-fill"
                              style={{
                                width: `${pct}%`,
                                background: "#60a5fa",
                              }}
                            >
                              {pct > 18 ? fmtM(v) : ""}
                            </div>
                          </div>
                          <div className="bar-val">{fmtM(v)}</div>
                        </div>
                      );
                    })
                  ) : (
                    <div className="empty">Veri yok</div>
                  )}
                </div>
              </div>
            </div>

            {/* TANIMLAMALAR */}
            <div
              className={`page${tab === "tanimlamalar" ? " active" : ""}`}
              id="page-tanimlamalar"
            >
              <div className="grid2">
                <div className="card" style={{ margin: 0 }}>
                  <div className="card-title">Ürün Kategorileri</div>
                  <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
                    <input
                      id="t-newcat"
                      placeholder="Yeni kategori adı..."
                      value={newOrderCat}
                      onChange={(e) => setNewOrderCat(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") addOrderCat();
                      }}
                    />
                    <button
                      type="button"
                      className="btn sm primary"
                      onClick={addOrderCat}
                      style={{ flexShrink: 0 }}
                    >
                      + Ekle
                    </button>
                  </div>
                  <div className="tag-list" id="t-catlist">
                    {settings.orderCats.map((c, i) => (
                      <div className="tag-row" key={c + i}>
                        <span>{escHtml(c)}</span>
                        <button
                          type="button"
                          className="btn sm danger"
                          disabled={settings.orderCats.length <= 1}
                          onClick={() => delOrderCat(i)}
                        >
                          ✕
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="card" style={{ margin: 0 }}>
                  <div className="card-title">Gider Kalemleri</div>
                  <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
                    <input
                      id="t-newexp"
                      placeholder="Yeni gider kalemi..."
                      value={newExpCat}
                      onChange={(e) => setNewExpCat(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") addExpCat();
                      }}
                    />
                    <button
                      type="button"
                      className="btn sm primary"
                      onClick={addExpCat}
                      style={{ flexShrink: 0 }}
                    >
                      + Ekle
                    </button>
                  </div>
                  <div className="tag-list" id="t-explist">
                    {settings.expCats.map((c, i) => (
                      <div className="tag-row" key={c + i}>
                        <span>{escHtml(c)}</span>
                        <button
                          type="button"
                          className="btn sm danger"
                          disabled={settings.expCats.length <= 1}
                          onClick={() => delExpCat(i)}
                        >
                          ✕
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
              <ErpImportPanel
                orderCount={orders.length}
                expenseCount={expenses.length}
                onImported={applyErpData}
                onLoading={showLoading}
                onLoaded={hideLoading}
              />
              <div className="alert info" style={{ marginTop: 14 }}>
                ⚙ Burada tanımladığınız kategoriler, sipariş ve gider formlarında seçenek
                olarak görünür. Değişiklikler sunucuda kaydedilir.
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* SİPARİŞ MODAL */}
      <div className={`overlay${orderModalOpen ? " open" : ""}`} id="m-order">
        <div className="modal">
          <div className="modal-head">
            <div className="modal-title" id="mo-title">
              {editId != null ? "Siparişi Düzenle" : "Yeni Sipariş"}
            </div>
            <button
              type="button"
              className="btn sm"
              onClick={() => setOrderModalOpen(false)}
            >
              ✕
            </button>
          </div>
          <div className="fg c2">
            <div>
              <div className="fl">Ad</div>
              <input
                id="f-ad"
                placeholder="Ad"
                value={orderForm.ad}
                onChange={(e) =>
                  setOrderForm((f) => ({ ...f, ad: e.target.value }))
                }
              />
            </div>
            <div>
              <div className="fl">Soyad</div>
              <input
                id="f-soyad"
                placeholder="Soyad"
                value={orderForm.soyad}
                onChange={(e) =>
                  setOrderForm((f) => ({ ...f, soyad: e.target.value }))
                }
              />
            </div>
          </div>
          <div className="fg c2">
            <div>
              <div className="fl">Telefon</div>
              <input
                id="f-tel"
                placeholder="05xx xxx xx xx"
                value={orderForm.tel}
                onChange={(e) =>
                  setOrderForm((f) => ({ ...f, tel: e.target.value }))
                }
              />
            </div>
            <div>
              <div className="fl">Sipariş Tarihi</div>
              <input
                type="date"
                id="f-tarih"
                value={orderForm.tarih}
                onChange={(e) =>
                  setOrderForm((f) => ({ ...f, tarih: e.target.value }))
                }
              />
            </div>
          </div>
          <div className="fg c3">
            <div>
              <div className="fl">Ürün Kategorisi</div>
              <select
                id="f-cat"
                value={orderForm.cat}
                onChange={(e) =>
                  setOrderForm((f) => ({ ...f, cat: e.target.value }))
                }
              >
                {buildCatOptions(settings.orderCats, orderForm.cat)}
              </select>
            </div>
            <div>
              <div className="fl">Malzeme</div>
              <select
                id="f-tur"
                value={orderForm.tur}
                onChange={(e) =>
                  setOrderForm((f) => ({ ...f, tur: e.target.value }))
                }
              >
                <option>PLX</option>
                <option>Poly</option>
                <option>Diğer</option>
              </select>
            </div>
            <div>
              <div className="fl">Adet</div>
              <input
                type="number"
                id="f-adet"
                min={1}
                value={orderForm.adet}
                onChange={(e) =>
                  setOrderForm((f) => ({
                    ...f,
                    adet: +e.target.value || 1,
                  }))
                }
              />
            </div>
          </div>
          <div className="fg c2">
            <div>
              <div className="fl">Toplam Tutar (₺)</div>
              <input
                type="number"
                id="f-toplam"
                placeholder="0"
                value={orderForm.toplam}
                onChange={(e) =>
                  setOrderForm((f) => ({ ...f, toplam: e.target.value }))
                }
              />
            </div>
            <div>
              <div className="fl">Kapora (₺)</div>
              <input
                type="number"
                id="f-kapora"
                placeholder="0"
                value={orderForm.kapora}
                onChange={(e) =>
                  setOrderForm((f) => ({ ...f, kapora: e.target.value }))
                }
              />
            </div>
          </div>
          <div className="fg c2">
            <div>
              <div className="fl">Mevcut Tahsilat (₺)</div>
              <input
                type="number"
                id="f-tahsilat"
                placeholder="boş = kapora kadar"
                value={orderForm.tahsilat}
                onChange={(e) =>
                  setOrderForm((f) => ({ ...f, tahsilat: e.target.value }))
                }
              />
            </div>
            <div />
          </div>
          <div className="fg">
            <div>
              <div className="fl">Sipariş İçeriği</div>
              <textarea
                id="f-not"
                rows={2}
                placeholder="Renk, boyut, özel detaylar..."
                value={orderForm.not_icerik}
                onChange={(e) =>
                  setOrderForm((f) => ({ ...f, not_icerik: e.target.value }))
                }
              />
            </div>
          </div>
          <div className="fg">
            <div>
              <div className="fl">Özel İstekler / Notlar</div>
              <textarea
                id="f-bilgi"
                rows={2}
                placeholder="Müşterinin özel istekleri, teslimat notu..."
                value={orderForm.bilgi}
                onChange={(e) =>
                  setOrderForm((f) => ({ ...f, bilgi: e.target.value }))
                }
              />
            </div>
          </div>
          <div className="hint" id="f-bitis-hint">
            {bitisHint}
          </div>
          <div
            style={{
              display: "flex",
              justifyContent: "flex-end",
              gap: 8,
              marginTop: 14,
            }}
          >
            <button
              type="button"
              className="btn"
              onClick={() => setOrderModalOpen(false)}
            >
              İptal
            </button>
            <button
              type="button"
              className="btn primary"
              id="mo-save"
              onClick={() => void saveOrder()}
            >
              {editId != null ? "Güncelle" : "Kaydet"}
            </button>
          </div>
        </div>
      </div>

      {/* GİDER MODAL */}
      <div className={`overlay${expModalOpen ? " open" : ""}`} id="m-exp">
        <div className="modal">
          <div className="modal-head">
            <div className="modal-title">
              {expEditId != null ? "Gider / Fatura Düzenle" : "Gider / Fatura Ekle"}
            </div>
            <button
              type="button"
              className="btn sm"
              onClick={() => closeExpModal()}
            >
              ✕
            </button>
          </div>
          {expEditId != null ? (
            <div className="hint" style={{ marginBottom: 10 }}>
              Tarih, kategori, açıklama, tutar ve fatura bilgilerini buradan güncelleyebilirsiniz.
            </div>
          ) : null}
          <div className="fg c2">
            <div>
              <div className="fl">Tarih</div>
              <input
                type="date"
                id="e-tarih"
                value={expForm.tarih}
                onChange={(e) =>
                  setExpForm((f) => ({ ...f, tarih: e.target.value }))
                }
              />
            </div>
            <div>
              <div className="fl">Kategori</div>
              <select
                id="e-kat"
                value={expForm.kat}
                onChange={(e) =>
                  setExpForm((f) => ({ ...f, kat: e.target.value }))
                }
              >
                {buildCatOptions(settings.expCats, expForm.kat)}
              </select>
            </div>
          </div>
          <div className="fg">
            <div>
              <div className="fl">Açıklama</div>
              <input
                id="e-acik"
                placeholder="Ne için?"
                value={expForm.acik}
                onChange={(e) =>
                  setExpForm((f) => ({ ...f, acik: e.target.value }))
                }
              />
            </div>
          </div>
          <div className="fg c2">
            <div>
              <div className="fl">Tutar (₺)</div>
              <input
                type="number"
                id="e-tutar"
                placeholder="0"
                value={expForm.tutar}
                onChange={(e) =>
                  setExpForm((f) => ({ ...f, tutar: e.target.value }))
                }
              />
            </div>
            <div>
              <div className="fl">Fatura No</div>
              <input
                id="e-fatno"
                placeholder="FAT-2025-001"
                value={expForm.fatno}
                onChange={(e) =>
                  setExpForm((f) => ({ ...f, fatno: e.target.value }))
                }
              />
            </div>
          </div>
          <div style={{ marginBottom: 14 }}>
            <div className="fl" style={{ marginBottom: 6 }}>
              Fatura Dosyası (PDF / Görsel)
            </div>
            <div
              className="dropzone"
              id="dropzone"
              onClick={() => fileInputRef.current?.click()}
              onDragOver={(e) => e.preventDefault()}
              onDrop={handleDrop}
            >
              <div style={{ fontSize: 22, marginBottom: 4 }}>📎</div>
              <div id="file-label">{fileLabel}</div>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              id="e-file"
              style={{ display: "none" }}
              accept="image/*,.pdf"
              onChange={handleFilePick}
            />
          </div>
          <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
            <button
              type="button"
              className="btn"
              onClick={() => closeExpModal()}
            >
              İptal
            </button>
            <button
              type="button"
              className="btn primary"
              onClick={() => void saveExpense()}
            >
              {expEditId != null ? "Güncelle" : "Kaydet"}
            </button>
          </div>
        </div>
      </div>

      {/* MUHASEBE E-POSTA */}
      <div className={`overlay${emailModalOpen ? " open" : ""}`} id="m-email">
        <div className="modal">
          <div className="modal-head">
            <div className="modal-title">✉ Muhasebe E-postası</div>
            <button
              type="button"
              className="btn sm"
              onClick={() => setEmailModalOpen(false)}
            >
              ✕
            </button>
          </div>
          <div className="alert info" style={{ marginBottom: 12 }}>
            Verilerinize göre hazırlanan taslak. Kopyalayıp e-posta istemcinize
            yapıştırın.
          </div>
          <div className="email-pre" id="email-body">
            {emailBody}
          </div>
          <div
            style={{
              display: "flex",
              justifyContent: "flex-end",
              gap: 8,
              marginTop: 12,
            }}
          >
            <button type="button" className="btn" onClick={copyEmail}>
              📋 Kopyala
            </button>
            <button
              type="button"
              className="btn primary"
              onClick={() => setEmailModalOpen(false)}
            >
              Tamam
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
