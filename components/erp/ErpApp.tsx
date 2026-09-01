"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
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
  createErpRecurring,
  deleteErpExpense,
  deleteErpExpensesBulk,
  deleteErpOrder,
  deleteErpRecurring,
  fetchErpData,
  fetchErpEmailSettings,
  fetchErpLabelSettings,
  saveErpEmailSettings,
  saveErpLabelSettings,
  saveErpSettings,
  sendErpEmailTest,
  toggleErpOrderDone,
  toggleErpRecurringActive,
  updateErpExpense,
  updateErpOrder,
  updateErpRecurring,
} from "@/components/erp/api";
import { ErpImportPanel } from "@/components/erp/ErpImportPanel";
import { TodosPanel } from "@/components/erp/TodosPanel";
import { AdminAuthError, alertUnlessAdminAuthError, logoutAdminSession } from "@/lib/admin-auth-client";
import { APP_VERSION } from "@/lib/app-version";
import type { ErpEmailSectionKey, ErpEmailSettings } from "@/lib/erp/email-types";
import { ERP_EMAIL_SECTION_LABELS } from "@/lib/erp/email-types";
import {
  ERP_LABEL_FIELD_LABELS,
  defaultErpLabelSettings,
  type ErpLabelFieldKey,
  type ErpLabelSettings,
} from "@/lib/erp/label-types";
import type {
  ErpExpense,
  ErpOrder,
  ErpRecurringExpense,
  ErpSettings,
  ErpTodo,
  ErpTodoRecurring,
} from "@/lib/erp/types";
import {
  openWhatsAppShare,
  orderEserBilgisi,
  printLabelPreview,
  printShippingLabel,
} from "@/lib/erp/shipping-label";
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
  orderKalanBakiye,
  orderListShowsKalan,
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
  yapilacaklar: "Yapılacaklar",
  raporlar: "Raporlar",
  tanimlamalar: "Tanımlamalar",
};

type Tab =
  | "dashboard"
  | "siparisler"
  | "giderler"
  | "yapilacaklar"
  | "raporlar"
  | "tanimlamalar";

type OrderForm = {
  ad: string;
  soyad: string;
  tel: string;
  tarih: string;
  bitis: string;
  cat: string;
  tur: string;
  adet: number;
  toplam: string;
  kapora: string;
  not_icerik: string;
  bilgi: string;
  adres: string;
  mapsUrl: string;
};

function defaultOrderBitis(tarih: string): string {
  if (!tarih) return "";
  return addWorkdays(tarih, 25).toISOString().slice(0, 10);
}

type ExpenseForm = {
  tarih: string;
  kat: string;
  subkat: string;
  acik: string;
  tutar: string;
  fatno: string;
};

type RecurringForm = {
  kat: string;
  subkat: string;
  acik: string;
  tutar: string;
  freq: "monthly" | "weekly";
  startDate: string;
  endDate: string;
};

const emptyOrderForm = (): OrderForm => {
  const tarih = todayStr();
  return {
    ad: "",
    soyad: "",
    tel: "",
    tarih,
    bitis: defaultOrderBitis(tarih),
    cat: "",
    tur: "PLX",
    adet: 1,
    toplam: "",
    kapora: "",
    not_icerik: "",
    bilgi: "",
    adres: "",
    mapsUrl: "",
  };
};

const emptyRecurringForm = (kat = "", acik = ""): RecurringForm => ({
  kat,
  subkat: "",
  acik,
  tutar: "",
  freq: "monthly",
  startDate: todayStr(),
  endDate: "",
});

function expSubCatsFor(settings: ErpSettings, kat: string): string[] {
  return settings.expSubCats?.[kat] ?? [];
}

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

type ExpenseKatGroup = {
  kat: string;
  total: number;
  subcats: { label: string; total: number }[];
};

function buildExpenseKatGroups(expenses: ErpExpense[]): ExpenseKatGroup[] {
  const subMap: Record<string, Record<string, number>> = {};
  const totals: Record<string, number> = {};
  for (const e of expenses) {
    const kat = e.kat?.trim() || "Diğer";
    const sub = e.subkat?.trim() || "";
    const amt = +e.tutar || 0;
    totals[kat] = (totals[kat] || 0) + amt;
    if (!subMap[kat]) subMap[kat] = {};
    if (sub) subMap[kat][sub] = (subMap[kat][sub] || 0) + amt;
  }
  return Object.entries(totals)
    .map(([kat, total]) => ({
      kat,
      total,
      subcats: Object.entries(subMap[kat] || {})
        .map(([label, t]) => ({ label, total: t }))
        .sort((a, b) => b.total - a.total),
    }))
    .sort((a, b) => b.total - a.total);
}

function renderGroupedExpenseChart(groups: ExpenseKatGroup[], maxItems?: number): ReactNode {
  if (!groups.length) return <div className="empty">Gider yok</div>;
  const slice = maxItems ? groups.slice(0, maxItems) : groups;
  const globalMax = Math.max(...slice.map((g) => g.total), 1);
  let colorIdx = 0;
  return slice.map((g) => {
    const parentColor = COLS[colorIdx++ % COLS.length];
    const pct = Math.round((g.total / globalMax) * 100);
    return (
      <div key={g.kat} className="exp-cat-group">
        <div className="bar-row">
          <div className="bar-label">{g.kat}</div>
          <div className="bar-track">
            <div
              className="bar-fill"
              style={{ width: `${pct}%`, background: parentColor }}
            >
              {pct > 18 ? fmtM(g.total) : ""}
            </div>
          </div>
          <div className="bar-val">{fmtM(g.total)}</div>
        </div>
        {g.subcats.map((sub) => {
          const subPct = Math.round((sub.total / globalMax) * 100);
          return (
            <div className="bar-row exp-sub-row" key={`${g.kat}-${sub.label}`}>
              <div className="bar-label">{`↳ ${sub.label}`}</div>
              <div className="bar-track">
                <div
                  className="bar-fill"
                  style={{
                    width: `${Math.max(subPct, 2)}%`,
                    background: parentColor,
                    opacity: 0.65,
                  }}
                />
              </div>
              <div className="bar-val">{fmtM(sub.total)}</div>
            </div>
          );
        })}
      </div>
    );
  });
}

function ErpToggle({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (next: boolean) => void;
}) {
  return (
    <div className="erp-switch-row">
      <span className="erp-switch-label">{label}</span>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={label}
        className={`erp-switch${checked ? " on" : ""}`}
        onClick={() => onChange(!checked)}
      />
    </div>
  );
}

function LabelCellSwitch({
  checked,
  disabled,
  onChange,
  title,
}: {
  checked: boolean;
  disabled?: boolean;
  onChange: (v: boolean) => void;
  title: string;
}) {
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={checked}
      aria-label={title}
      disabled={disabled}
      className={`label-cell-switch${checked ? " on" : ""}`}
      onClick={() => onChange(!checked)}
    />
  );
}

function renderProductCatRevenueChart(
  rows: { cat: string; ciro: number; adet: number }[]
): ReactNode {
  if (!rows.length) return <div className="empty">Veri yok</div>;
  const sorted = [...rows].sort((a, b) => b.ciro - a.ciro);
  const max = Math.max(...sorted.map((r) => r.ciro), 1);
  return sorted.map((r, i) => {
    const pct = Math.round((r.ciro / max) * 100);
    return (
      <div className="bar-row" key={r.cat + i} style={{ alignItems: "flex-start" }}>
        <div className="bar-label" style={{ paddingTop: 3 }}>
          {r.cat}
        </div>
        <div className="bar-track" style={{ marginTop: 4 }}>
          <div
            className="bar-fill"
            style={{
              width: `${pct}%`,
              background: COLS[i % COLS.length],
            }}
          >
            {pct > 18 ? fmtM(r.ciro) : ""}
          </div>
        </div>
        <div
          className="bar-val"
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "flex-end",
            gap: 2,
            lineHeight: 1.2,
            minWidth: 72,
          }}
        >
          <span>{fmtM(r.ciro)}</span>
          <span style={{ fontSize: 10, color: "var(--text3)", fontWeight: 500 }}>
            {r.adet} adet
          </span>
        </div>
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
  const ciro = computeToplamCiro(ord);
  const tah = computeTahsilat(ord);
  const gid = exp.reduce((s, e) => s + (+e.tutar || 0), 0);
  const net = ciro - gid;
  return (
    <div style={{ display: "grid", gap: 6 }}>
      {[
        ["Sipariş", `${ord.length} adet`, undefined],
        ["Toplam Ciro", fmtM(ciro), "var(--blue)"],
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
  const router = useRouter();
  const [orders, setOrders] = useState<ErpOrder[]>([]);
  const [expenses, setExpenses] = useState<ErpExpense[]>([]);
  const [settings, setSettings] = useState<ErpSettings>({
    orderCats: [],
    expCats: [],
    expSubCats: {},
  });
  const [recurringExpenses, setRecurringExpenses] = useState<ErpRecurringExpense[]>([]);
  const [todos, setTodos] = useState<ErpTodo[]>([]);
  const [recurringTodos, setRecurringTodos] = useState<ErpTodoRecurring[]>([]);
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
  const [bitisManual, setBitisManual] = useState(false);
  const [expForm, setExpForm] = useState<ExpenseForm>({
    tarih: todayStr(),
    kat: "",
    subkat: "",
    acik: "",
    tutar: "",
    fatno: "",
  });
  const [expNewSubkat, setExpNewSubkat] = useState("");
  const [recForm, setRecForm] = useState<RecurringForm>(() => emptyRecurringForm());
  const [recEditId, setRecEditId] = useState<number | null>(null);
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
  const [newExpSubCatByParent, setNewExpSubCatByParent] = useState<Record<string, string>>({});
  const [emailSettings, setEmailSettings] = useState<ErpEmailSettings | null>(null);
  const [labelSettings, setLabelSettings] = useState<ErpLabelSettings>(
    defaultErpLabelSettings()
  );
  const [emailSmtpOk, setEmailSmtpOk] = useState<boolean | null>(null);
  const [emailSmtpHint, setEmailSmtpHint] = useState("");
  const [emailBody, setEmailBody] = useState("");
  const [selectedExpenseIds, setSelectedExpenseIds] = useState<number[]>([]);

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

  const applyErpData = useCallback(
    (data: {
      orders: ErpOrder[];
      expenses: ErpExpense[];
      settings: ErpSettings;
      recurringExpenses?: ErpRecurringExpense[];
      todos?: ErpTodo[];
      recurringTodos?: ErpTodoRecurring[];
    }) => {
      setOrders(data.orders);
      setExpenses(data.expenses);
      setSettings(data.settings);
      setRecurringExpenses(data.recurringExpenses ?? []);
      setTodos(data.todos ?? []);
      setRecurringTodos(data.recurringTodos ?? []);
      setSyncOk(true);
    },
    []
  );

  const loadData = useCallback(async () => {
    showLoading("Veriler yükleniyor...");
    try {
      const data = await fetchErpData();
      applyErpData(data);
    } catch (e) {
      if (e instanceof AdminAuthError) return;
      console.error(e);
      setSyncOk(false);
      alert(
        "Veri yüklenemedi: " +
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

  const handleLogout = useCallback(async () => {
    await logoutAdminSession();
    router.replace("/admin/access-logs");
  }, [router]);

  const catFilterOptions = useMemo(() => {
    return Array.from(new Set(orders.map((o) => o.cat).filter(Boolean))).sort();
  }, [orders]);

  useEffect(() => {
    fetchErpLabelSettings()
      .then((r) => setLabelSettings(r.settings))
      .catch(() => setLabelSettings(defaultErpLabelSettings()));
  }, []);

  useEffect(() => {
    if (tab !== "tanimlamalar") return;
    fetchErpEmailSettings()
      .then((r) => {
        setEmailSettings(r.settings);
        setEmailSmtpOk(r.smtpConfigured);
        setEmailSmtpHint(r.smtpHint);
      })
      .catch(() => {
        setEmailSettings(null);
        setEmailSmtpOk(false);
      });
  }, [tab]);

  const saveEmailSettings = useCallback(async () => {
    if (!emailSettings) return;
    showLoading("Kaydediliyor...");
    try {
      const saved = await saveErpEmailSettings(emailSettings);
      setEmailSettings(saved);
      alert("E-posta ayarları kaydedildi.");
    } catch (e) {
      alertUnlessAdminAuthError(e);
    } finally {
      hideLoading();
    }
  }, [emailSettings, showLoading, hideLoading]);

  const testEmail = useCallback(
    async (kind: "daily" | "monthly" | "weekly") => {
      if (!emailSettings?.toEmail) {
        alert("Önce alıcı e-posta adresini girin.");
        return;
      }
      showLoading("Test maili gönderiliyor...");
      try {
        await sendErpEmailTest(kind, emailSettings.toEmail);
        const label =
          kind === "daily" ? "günlük" : kind === "monthly" ? "ay sonu" : "haftalık yedek";
        alert(`Test maili gönderildi (${label}).`);
      } catch (e) {
        alertUnlessAdminAuthError(e, "Gönderilemedi");
      } finally {
        hideLoading();
      }
    },
    [emailSettings, showLoading, hideLoading]
  );

  const toggleEmailSection = useCallback((key: ErpEmailSectionKey) => {
    setEmailSettings((prev) => {
      if (!prev) return prev;
      if (key === "monthlyReport") {
        return { ...prev, monthlyReportEnabled: !prev.monthlyReportEnabled };
      }
      const has = prev.dailySections.includes(key);
      const dailySections = has
        ? prev.dailySections.filter((k) => k !== key)
        : [...prev.dailySections, key];
      return { ...prev, dailySections };
    });
  }, []);

  const updateLabelField = useCallback(
    (key: ErpLabelFieldKey, patch: Partial<ErpLabelSettings["fields"][ErpLabelFieldKey]>) => {
      setLabelSettings((prev) => ({
        ...prev,
        fields: {
          ...prev.fields,
          [key]: { ...prev.fields[key], ...patch },
        },
      }));
    },
    []
  );

  const moveLabelField = useCallback((key: ErpLabelFieldKey, dir: "up" | "down") => {
    setLabelSettings((prev) => {
      const order = [...prev.fieldOrder];
      const i = order.indexOf(key);
      if (i < 0) return prev;
      const j = dir === "up" ? i - 1 : i + 1;
      if (j < 0 || j >= order.length) return prev;
      [order[i], order[j]] = [order[j], order[i]];
      return { ...prev, fieldOrder: order };
    });
  }, []);

  const saveLabelSettings = useCallback(async () => {
    showLoading("Kaydediliyor...");
    try {
      const saved = await saveErpLabelSettings(labelSettings);
      setLabelSettings(saved);
      alert("Etiket ayarları kaydedildi.");
    } catch (e) {
      alertUnlessAdminAuthError(e);
    } finally {
      hideLoading();
    }
  }, [labelSettings, showLoading, hideLoading]);

  const printOrderLabel = useCallback(
    (o: ErpOrder) => {
      printShippingLabel(o, labelSettings, { orderNum: getNum(o.id) });
    },
    [labelSettings, getNum]
  );

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

  const openOrderModal = useCallback(() => {
    setEditId(null);
    setBitisManual(false);
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
      const tarih = o.tarih || "";
      const defBitis = defaultOrderBitis(tarih);
      const bitis = o.bitis || defBitis;
      setEditId(id);
      setBitisManual(!!bitis && bitis !== defBitis);
      setOrderForm({
        ad: o.ad,
        soyad: o.soyad,
        tel: o.tel || "",
        tarih,
        bitis,
        cat: o.cat || settings.orderCats[0] || "",
        tur: o.tur || "PLX",
        adet: o.adet || 1,
        toplam: o.toplam ? String(o.toplam) : "",
        kapora: o.kapora ? String(o.kapora) : "",
        not_icerik: o.not_icerik || "",
        bilgi: o.bilgi || "",
        adres: o.adres || "",
        mapsUrl: o.mapsUrl || "",
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
    const bitis = orderForm.bitis.trim() || defaultOrderBitis(orderForm.tarih);
    if (!bitis) {
      alert("Bitiş tarihi zorunlu!");
      return;
    }
    const kapora = +orderForm.kapora || 0;
    const existing = editId != null ? orders.find((o) => o.id === editId) : null;
    const tahsilat =
      existing?.durum === "biten" ? +existing.toplam || 0 : kapora;
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
      adres: orderForm.adres.trim(),
      mapsUrl: orderForm.mapsUrl.trim(),
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
      alertUnlessAdminAuthError(e);
    } finally {
      hideLoading();
    }
  }, [orderForm, editId, orders, showLoading, hideLoading]);

  const toggleDone = useCallback(
    async (id: number) => {
      const o = orders.find((x) => x.id === id);
      if (!o) return;
      if (o.durum !== "biten") {
        const ok = confirm(
          "Tam tahsilat yapıldı, siparişi kapatıyorum. Onaylıyor musunuz?"
        );
        if (!ok) return;
      }
      showLoading("Güncelleniyor...");
      try {
        const updated = await toggleErpOrderDone(id);
        setOrders((prev) => prev.map((o) => (o.id === id ? updated : o)));
      } catch (e) {
        alertUnlessAdminAuthError(e);
      } finally {
        hideLoading();
      }
    },
    [orders, showLoading, hideLoading]
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
        alertUnlessAdminAuthError(e);
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
        alertUnlessAdminAuthError(e);
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
      subkat: "",
      acik: "",
      tutar: "",
      fatno: "",
    });
    setExpNewSubkat("");
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
        subkat: e.subkat || "",
        acik: e.acik || "",
        tutar: e.tutar ? String(e.tutar) : "",
        fatno: e.fatno || "",
      });
      setExpNewSubkat("");
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

  const ensureExpSubkat = useCallback(
    async (kat: string, subkat: string): Promise<ErpSettings> => {
      const v = subkat.trim();
      if (!v || !kat) return settings;
      const list = expSubCatsFor(settings, kat);
      if (list.includes(v)) return settings;
      const expSubCats = {
        ...(settings.expSubCats ?? {}),
        [kat]: [...list, v],
      };
      const next = { ...settings, expSubCats };
      const saved = await saveErpSettings(next);
      setSettings(saved);
      return saved;
    },
    [settings]
  );

  const saveExpense = useCallback(async () => {
    const { tarih, kat, subkat, acik, tutar, fatno } = expForm;
    if (!tarih || !+tutar || !acik.trim()) {
      alert("Tarih, açıklama ve tutar zorunlu!");
      return;
    }
    let finalSubkat = subkat.trim();
    if (finalSubkat === "__new__") {
      finalSubkat = expNewSubkat.trim();
    }
    if (finalSubkat) {
      await ensureExpSubkat(kat, finalSubkat);
    }
    const form = new FormData();
    form.append("tarih", tarih);
    form.append("kat", kat);
    form.append("subkat", finalSubkat);
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
      alertUnlessAdminAuthError(e);
    } finally {
      hideLoading();
    }
  }, [
    expForm,
    expNewSubkat,
    expFile,
    expEditId,
    ensureExpSubkat,
    showLoading,
    hideLoading,
    closeExpModal,
  ]);

  const delExpense = useCallback(
    async (id: number) => {
      if (!confirm("Bu gideri silmek istediğinizden emin misiniz?")) return;
      showLoading("Siliniyor...");
      try {
        await deleteErpExpense(id);
        setExpenses((prev) => prev.filter((e) => e.id !== id));
        setSelectedExpenseIds((prev) => prev.filter((x) => x !== id));
      } catch (e) {
        alertUnlessAdminAuthError(e);
      } finally {
        hideLoading();
      }
    },
    [showLoading, hideLoading]
  );

  const toggleExpenseSelected = useCallback((id: number) => {
    setSelectedExpenseIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  }, []);

  const selectAllVisibleExpenses = useCallback(() => {
    setSelectedExpenseIds(sortedExpenses.map((e) => e.id));
  }, [sortedExpenses]);

  const clearExpenseSelection = useCallback(() => {
    setSelectedExpenseIds([]);
  }, []);

  const deleteSelectedExpenses = useCallback(async () => {
    if (!selectedExpenseIds.length) {
      alert("Silmek için en az bir gider seçin.");
      return;
    }
    if (
      !confirm(`${selectedExpenseIds.length} gider kaydı silinsin mi? Bu işlem geri alınamaz.`)
    )
      return;
    showLoading("Seçilen giderler siliniyor...");
    try {
      const removed = await deleteErpExpensesBulk(selectedExpenseIds);
      const idSet = new Set(selectedExpenseIds);
      setExpenses((prev) => prev.filter((e) => !idSet.has(e.id)));
      setSelectedExpenseIds([]);
      if (removed === 0) alert("Silinecek kayıt bulunamadı.");
    } catch (e) {
      alertUnlessAdminAuthError(e);
    } finally {
      hideLoading();
    }
  }, [selectedExpenseIds, showLoading, hideLoading]);

  const deleteAllExpenses = useCallback(async () => {
    if (!expenses.length) return;
    if (
      !confirm(
        `Tüm gider listesi silinecek (${expenses.length} kayıt). Emin misiniz?`
      )
    )
      return;
    if (!confirm("Son onay: Bu işlem geri alınamaz. Devam edilsin mi?")) return;
    showLoading("Tüm giderler siliniyor...");
    try {
      const ids = expenses.map((e) => e.id);
      await deleteErpExpensesBulk(ids);
      setExpenses([]);
      setSelectedExpenseIds([]);
    } catch (e) {
      alertUnlessAdminAuthError(e);
    } finally {
      hideLoading();
    }
  }, [expenses, showLoading, hideLoading]);

  const persistSettings = useCallback(
    async (next: ErpSettings) => {
      try {
        const saved = await saveErpSettings(next);
        setSettings(saved);
      } catch (e) {
        alertUnlessAdminAuthError(e);
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
    const expSubCats = { ...(settings.expSubCats ?? {}), [v]: [] };
    const next = { ...settings, expCats: [...settings.expCats, v], expSubCats };
    setNewExpCat("");
    setSettings(next);
    void persistSettings(next);
  }, [newExpCat, settings, persistSettings]);

  const addExpSubCat = useCallback(
    (parentKat: string) => {
      const v = (newExpSubCatByParent[parentKat] ?? "").trim();
      if (!v) return;
      const list = expSubCatsFor(settings, parentKat);
      if (list.includes(v)) {
        setNewExpSubCatByParent((prev) => ({ ...prev, [parentKat]: "" }));
        return;
      }
      const expSubCats = {
        ...(settings.expSubCats ?? {}),
        [parentKat]: [...list, v],
      };
      const next = { ...settings, expSubCats };
      setNewExpSubCatByParent((prev) => ({ ...prev, [parentKat]: "" }));
      setSettings(next);
      void persistSettings(next);
    },
    [newExpSubCatByParent, settings, persistSettings]
  );

  const delExpSubCat = useCallback(
    (parentKat: string, idx: number) => {
      const list = [...expSubCatsFor(settings, parentKat)];
      list.splice(idx, 1);
      const expSubCats = { ...(settings.expSubCats ?? {}), [parentKat]: list };
      const next = { ...settings, expSubCats };
      setSettings(next);
      void persistSettings(next);
    },
    [settings, persistSettings]
  );

  const saveRecurring = useCallback(async () => {
    const { kat, subkat, acik, tutar, freq, startDate, endDate } = recForm;
    if (!kat || !acik.trim() || !+tutar || !startDate || !endDate) {
      alert("Kategori, açıklama, tutar ve tarih aralığı zorunlu!");
      return;
    }
    if (startDate > endDate) {
      alert("Bitiş tarihi başlangıçtan önce olamaz.");
      return;
    }
    const finalSubkat = subkat.trim();
    if (finalSubkat) await ensureExpSubkat(kat, finalSubkat);
    const payload = {
      kat,
      subkat: finalSubkat,
      acik: acik.trim(),
      tutar: +tutar,
      freq,
      startDate,
      endDate,
    };
    showLoading(recEditId != null ? "Güncelleniyor..." : "Tekrarlayan gider kaydediliyor...");
    try {
      if (recEditId != null) {
        const { rule, expenses: nextExpenses } = await updateErpRecurring(recEditId, payload);
        setRecurringExpenses((prev) => prev.map((r) => (r.id === recEditId ? rule : r)));
        setExpenses(nextExpenses);
        setRecEditId(null);
        setRecForm(emptyRecurringForm());
      } else {
        const { rule, expenses: nextExpenses } = await createErpRecurring(payload);
        setRecurringExpenses((prev) => [rule, ...prev]);
        setExpenses(nextExpenses);
        setRecForm(emptyRecurringForm(kat, acik.trim()));
      }
    } catch (e) {
      alertUnlessAdminAuthError(e);
    } finally {
      hideLoading();
    }
  }, [recForm, recEditId, ensureExpSubkat, showLoading, hideLoading]);

  const editRecurring = useCallback((r: ErpRecurringExpense) => {
    setRecEditId(r.id);
    setRecForm({
      kat: r.kat,
      subkat: r.subkat || "",
      acik: r.acik,
      tutar: r.tutar ? String(r.tutar) : "",
      freq: r.freq,
      startDate: toInputDateValue(r.startDate) || r.startDate.slice(0, 10),
      endDate: toInputDateValue(r.endDate) || r.endDate.slice(0, 10),
    });
  }, []);

  const cancelRecurringEdit = useCallback(() => {
    setRecEditId(null);
    setRecForm(emptyRecurringForm());
  }, []);

  const removeRecurring = useCallback(
    async (id: number) => {
      if (!confirm("Bu tekrarlayan gider kuralını silmek istiyor musunuz?")) return;
      showLoading("Siliniyor...");
      try {
        await deleteErpRecurring(id);
        setRecurringExpenses((prev) => prev.filter((r) => r.id !== id));
      } catch (e) {
        alertUnlessAdminAuthError(e);
      } finally {
        hideLoading();
      }
    },
    [showLoading, hideLoading]
  );

  const toggleRecurringActive = useCallback(
    async (id: number, active: boolean) => {
      showLoading("Güncelleniyor...");
      try {
        const { rule, expenses: nextExpenses } = await toggleErpRecurringActive(id, active);
        setRecurringExpenses((prev) => prev.map((r) => (r.id === id ? rule : r)));
        setExpenses(nextExpenses);
      } catch (e) {
        alertUnlessAdminAuthError(e);
      } finally {
        hideLoading();
      }
    },
    [showLoading, hideLoading]
  );

  const delExpCat = useCallback(
    (idx: number) => {
      if (settings.expCats.length <= 1) return;
      const removed = settings.expCats[idx];
      const expCats = settings.expCats.filter((_, i) => i !== idx);
      const expSubCats = { ...(settings.expSubCats ?? {}) };
      delete expSubCats[removed];
      void persistSettings({ ...settings, expCats, expSubCats });
    },
    [settings, persistSettings]
  );

  const exportCSV = useCallback(() => {
    const escCell = (v: string | number | null | undefined) =>
      '"' + String(v ?? "").replace(/"/g, '""') + '"';
    const toCsv = (rows: (string | number | null | undefined)[][]) =>
      rows.map((r) => r.map(escCell).join(",")).join("\n");

    if (tab === "giderler") {
      const list = [...expenses];
      list.sort((a, b) => {
        const cmp = compareExpenses(a, b, expenseSort.key);
        return expenseSort.asc ? cmp : -cmp;
      });
      const rows: (string | number | null | undefined)[][] = [
        [
          "id",
          "Tarih",
          "Kategori",
          "Açıklama",
          "Tutar",
          "Fatura No",
          "Dosya",
          "Dosya URL",
        ],
      ];
      list.forEach((e) =>
        rows.push([
          e.id,
          e.tarih,
          e.kat,
          e.acik,
          e.tutar,
          e.fatno,
          e.dosya,
          e.dosya_url,
        ])
      );
      const csv = toCsv(rows);
      const a = document.createElement("a");
      a.href = "data:text/csv;charset=utf-8,\uFEFF" + encodeURIComponent(csv);
      a.download = "giderler_" + todayStr() + ".csv";
      a.click();
      return;
    }

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
        "Adres",
        "Maps",
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
        orderKalanBakiye(o),
        getOrderStatus(o),
        o.not_icerik,
        o.bilgi,
        o.adres ?? "",
        o.mapsUrl ?? "",
      ])
    );
    const csv = toCsv(rows);
    const a = document.createElement("a");
    a.href = "data:text/csv;charset=utf-8,\uFEFF" + encodeURIComponent(csv);
    a.download = "siparisler_" + todayStr() + ".csv";
    a.click();
  }, [tab, orders, expenses, getNum, expenseSort]);

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

  const renderOrderActions = (o: ErpOrder, st: ReturnType<typeof getOrderStatus>) => (
    <>
      <button
        type="button"
        className="btn sm"
        title="Etiket yazdır"
        onClick={() => printOrderLabel(o)}
      >
        🖨
      </button>
      <button
        type="button"
        className="btn sm success"
        title="WhatsApp ile paylaş"
        onClick={() => openWhatsAppShare(o)}
      >
        WA
      </button>
      <button type="button" className="btn sm" onClick={() => editOrder(o.id)}>
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
          st === "askida" ? "Askıdan çıkar" : "Askıya al (teslim/ödeme beklenmiyor)"
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
    </>
  );

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

    const expKatGroups = buildExpenseKatGroups(expenses).filter(
      (g) => g.kat.trim().localeCompare("Diğer", "tr", { sensitivity: "base" }) !== 0
    );

    const prodCats: Record<string, number> = {};
    const prodAdet: Record<string, number> = {};
    orders.forEach((o) => {
      if (o.cat) {
        prodCats[o.cat] = (prodCats[o.cat] || 0) + (+o.toplam || 0);
        prodAdet[o.cat] = (prodAdet[o.cat] || 0) + (+o.adet || 0);
      }
    });
    const prodCatRows = Object.keys(prodCats).map((cat) => ({
      cat,
      ciro: prodCats[cat],
      adet: prodAdet[cat] || 0,
    }));

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
      expKatGroups,
      prodCatRows,
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
    const katGroups = buildExpenseKatGroups(expenses);
    const months: Record<string, number> = {};
    expenses.forEach((e) => {
      const m = dateMonthKey(e.tarih);
      if (m) months[m] = (months[m] || 0) + (+e.tutar || 0);
    });
    const monthEntries = Object.entries(months).sort().slice(-6) as [string, number][];
    const mMax = Math.max(...monthEntries.map(([, v]) => v), 1);
    return { total, aylik, faturali, katGroups, monthEntries, mMax };
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
                  Bağlı · v{APP_VERSION}
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
            {navBtn("yapilacaklar", "☑ Yapılacaklar")}
            {navBtn("raporlar", "◉ Raporlar")}
            {navBtn("tanimlamalar", "⚙ Tanımlamalar")}
            <button
              type="button"
              className="nav-item erp-logout-btn"
              onClick={handleLogout}
            >
              ⎋ Çıkış
            </button>
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
              <button type="button" className="btn sm danger" onClick={handleLogout}>
                Çıkış
              </button>
              <button type="button" className="btn sm primary" onClick={openOrderModal}>
                + Sipariş
              </button>
              <button type="button" className="btn sm" onClick={openExpModal}>
                + Gider
              </button>
              <button
                type="button"
                className="btn sm"
                title={tab === "giderler" ? "Gider listesi CSV" : "Sipariş listesi CSV"}
                onClick={exportCSV}
              >
                ↓ CSV
              </button>
            </div>
          </header>

          <nav className={`mobile-nav${mobileNavOpen ? " open" : ""}`} id="mobile-nav">
            {navBtn("dashboard", "◈ Dashboard", () => setMobileNavOpen(false))}
            {navBtn("siparisler", "▦ Siparişler", () => setMobileNavOpen(false))}
            {navBtn("giderler", "◎ Giderler", () => setMobileNavOpen(false))}
            {navBtn("yapilacaklar", "☑ Yapılacaklar", () => setMobileNavOpen(false))}
            {navBtn("raporlar", "◉ Raporlar", () => setMobileNavOpen(false))}
            {navBtn("tanimlamalar", "⚙ Tanımlamalar", () => setMobileNavOpen(false))}
            <Link
              href="/admin"
              className="nav-item erp-back-link"
              style={{ color: "var(--text2)" }}
            >
              ← Admin
            </Link>
            <button type="button" className="nav-item erp-logout-btn" onClick={handleLogout}>
              ⎋ Çıkış
            </button>
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
                    {renderGroupedExpenseChart(dashboard.expKatGroups, 6)}
                  </div>
                </div>
              </div>
              <div className="card">
                <div className="card-title">Ürün Kategorisi Ciroları</div>
                <div className="bar-chart" id="d-cat-revenue">
                  {renderProductCatRevenueChart(dashboard.prodCatRows)}
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
                        <th>Kapora</th>
                        <th>Toplam</th>
                        <th>Kalan</th>
                        <th>Durum</th>
                      </tr>
                    </thead>
                    <tbody id="d-orders">
                      {orders.slice(0, 6).map((o) => {
                        const st = getOrderStatus(o);
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
                              {fmtM(o.kapora)}
                            </td>
                            <td style={{ color: "var(--amber)", fontWeight: 500 }}>
                              {fmtM(o.toplam)}
                            </td>
                            <td style={{ color: "var(--red)", fontWeight: 500 }}>
                              {orderListShowsKalan(o) ? fmtM(orderKalanBakiye(o)) : "—"}
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
                <div className="tbl-wrap order-desktop-table">
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
                          className={`sortable${orderSort.key === "not_icerik" ? " sorted" : ""}`}
                          onClick={() => toggleOrderSort("not_icerik")}
                        >
                          Sipariş İçeriği{sortIndicator("not_icerik")}
                        </th>
                        <th
                          className={`sortable${orderSort.key === "kapora" ? " sorted" : ""}`}
                          onClick={() => toggleOrderSort("kapora")}
                        >
                          Kapora{sortIndicator("kapora")}
                        </th>
                        <th
                          className={`sortable${orderSort.key === "toplam" ? " sorted" : ""}`}
                          onClick={() => toggleOrderSort("toplam")}
                        >
                          Toplam Bedel{sortIndicator("toplam")}
                        </th>
                        <th>Kalan</th>
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
                          const icerikTxt = o.not_icerik
                            ? o.not_icerik.slice(0, 40) +
                              (o.not_icerik.length > 40 ? "…" : "")
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
                                title={o.not_icerik || ""}
                              >
                                {icerikTxt}
                              </td>
                              <td>{fmtM(o.kapora)}</td>
                              <td style={{ color: "var(--amber)", fontWeight: 500 }}>
                                {fmtM(o.toplam)}
                              </td>
                              <td style={{ color: "var(--red)", fontWeight: 500 }}>
                                {orderListShowsKalan(o)
                                  ? fmtM(orderKalanBakiye(o))
                                  : "—"}
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
                              <td style={{ whiteSpace: "nowrap" }} className="order-actions">
                                {renderOrderActions(o, st)}
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
                <div className="order-mobile-list">
                  {sortedOrders.length ? (
                    sortedOrders.map((o) => {
                      const st = getOrderStatus(o);
                      const eser = orderEserBilgisi(o);
                      return (
                        <div key={o.id} className="order-card">
                          <div className="order-card-head">
                            <span className="order-card-date">{fmtDate(o.tarih)}</span>
                            <span className="order-card-meta">
                              <span className={`dot ${STATUS_COLORS[st]}`} />
                              #{getNum(o.id)}
                              <span className={`badge ${STATUS_COLORS[st]}`}>
                                {STATUS_LABELS[st]}
                              </span>
                            </span>
                          </div>
                          <div className="order-card-name">
                            <span dangerouslySetInnerHTML={{ __html: escHtml(o.ad) }} />{" "}
                            <span dangerouslySetInnerHTML={{ __html: escHtml(o.soyad) }} />
                          </div>
                          <div className="order-card-eser">
                            {o.cat ? (
                              <span className="badge blue" style={{ fontSize: 10 }}>
                                {o.cat}
                              </span>
                            ) : null}{" "}
                            {eser !== "—" ? eser : o.tur || "—"}
                          </div>
                          <div
                            className={`order-card-balance${orderListShowsKalan(o) ? "" : " settled"}`}
                          >
                            <div>
                              <span className="k">Kapora</span>
                              <span className="v">{fmtM(o.kapora)}</span>
                            </div>
                            <div>
                              <span className="k">Toplam</span>
                              <span className="v amber">{fmtM(o.toplam)}</span>
                            </div>
                            {orderListShowsKalan(o) ? (
                              <div>
                                <span className="k">Kalan</span>
                                <span className="v red">{fmtM(orderKalanBakiye(o))}</span>
                              </div>
                            ) : null}
                          </div>
                          <div className="order-card-foot">
                            <div className="order-card-actions order-actions">
                              {renderOrderActions(o, st)}
                            </div>
                            <div className="order-card-days">{daysLeftBadge(o)}</div>
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <div className="empty">Sipariş bulunamadı.</div>
                  )}
                </div>
              </div>
            </div>

            {/* GİDERLER */}
            <div className={`page${tab === "giderler" ? " active" : ""}`} id="page-giderler">
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: 14,
                  flexWrap: "wrap",
                  gap: 10,
                }}
              >
                <button type="button" className="btn primary" onClick={openExpModal}>
                  + Gider Ekle
                </button>
                <span style={{ fontSize: 12, color: "var(--text3)" }}>
                  {sortedExpenses.length} kayıt
                  {selectedExpenseIds.length ? (
                    <span style={{ color: "var(--amber)", marginLeft: 6 }}>
                      · {selectedExpenseIds.length} seçili
                    </span>
                  ) : null}
                </span>
              </div>
              <div
                style={{
                  display: "flex",
                  justifyContent: "flex-end",
                  marginBottom: 10,
                  flexWrap: "wrap",
                  gap: 6,
                }}
              >
                <button type="button" className="btn sm" onClick={selectAllVisibleExpenses}>
                  Tümünü seç
                </button>
                <button
                  type="button"
                  className="btn sm"
                  onClick={clearExpenseSelection}
                  disabled={!selectedExpenseIds.length}
                >
                  Seçimi temizle
                </button>
                <button
                  type="button"
                  className="btn sm danger"
                  onClick={() => void deleteSelectedExpenses()}
                  disabled={!selectedExpenseIds.length}
                >
                  Seçilenleri sil
                </button>
                <button
                  type="button"
                  className="btn sm danger"
                  onClick={() => void deleteAllExpenses()}
                  disabled={!expenses.length}
                >
                  Tüm giderleri sil
                </button>
                <button type="button" className="btn sm success" onClick={prepareEmail}>
                  ✉ Muhasebeye Gönder
                </button>
              </div>
              <div className="card" style={{ padding: 0, overflow: "hidden" }}>
                <div className="tbl-wrap expense-desktop-table">
                  <table>
                    <thead>
                      <tr>
                        <th style={{ width: 36 }}>
                          <input
                            type="checkbox"
                            aria-label="Tümünü seç"
                            checked={
                              sortedExpenses.length > 0 &&
                              sortedExpenses.every((e) => selectedExpenseIds.includes(e.id))
                            }
                            onChange={(ev) => {
                              if (ev.target.checked) selectAllVisibleExpenses();
                              else clearExpenseSelection();
                            }}
                          />
                        </th>
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
                            <td>
                              <input
                                type="checkbox"
                                checked={selectedExpenseIds.includes(e.id)}
                                onChange={() => toggleExpenseSelected(e.id)}
                                aria-label={`Gider ${e.id} seç`}
                              />
                            </td>
                            <td style={{ fontSize: 12, color: "var(--text3)", whiteSpace: "nowrap" }}>
                              {fmtDate(e.tarih)}
                            </td>
                            <td>
                              <span className="badge blue" style={{ fontSize: 10 }}>
                                {escHtml(e.kat)}
                                {e.subkat ? (
                                  <span style={{ opacity: 0.85 }}> / {escHtml(e.subkat)}</span>
                                ) : null}
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
                                  Sil
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={8} className="empty">
                            Gider yok
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
                <div className="expense-mobile-list">
                  {sortedExpenses.length ? (
                    sortedExpenses.map((e) => (
                      <div
                        key={e.id}
                        className={`expense-card${selectedExpenseIds.includes(e.id) ? " selected" : ""}`}
                      >
                        <div className="expense-card-head">
                          <label className="expense-card-check">
                            <input
                              type="checkbox"
                              checked={selectedExpenseIds.includes(e.id)}
                              onChange={() => toggleExpenseSelected(e.id)}
                              aria-label={`Gider ${e.id} seç`}
                            />
                            <span className="expense-card-date">{fmtDate(e.tarih)}</span>
                          </label>
                          <span className="expense-card-amount">{fmtM(e.tutar)}</span>
                        </div>
                        <div className="expense-card-cat">
                          <span className="badge blue" style={{ fontSize: 10 }}>
                            {escHtml(e.kat)}
                            {e.subkat ? (
                              <span style={{ opacity: 0.85 }}> / {escHtml(e.subkat)}</span>
                            ) : null}
                          </span>
                        </div>
                        <div className="expense-card-desc">{escHtml(e.acik)}</div>
                        <div className="expense-card-meta">
                          {e.fatno ? (
                            <span className="badge green">{escHtml(e.fatno)}</span>
                          ) : (
                            <span style={{ color: "var(--text3)", fontSize: 11 }}>Fatura yok</span>
                          )}
                          {e.dosya ? (
                            <span className="badge green">📎 {escHtml(e.dosya)}</span>
                          ) : null}
                        </div>
                        <div className="expense-card-actions">
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
                            Sil
                          </button>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="empty">Gider yok</div>
                  )}
                </div>
              </div>
            </div>

            {/* YAPILACAKLAR */}
            <div
              className={`page${tab === "yapilacaklar" ? " active" : ""}`}
              id="page-yapilacaklar"
            >
              <TodosPanel
                todos={todos}
                recurringTodos={recurringTodos}
                onTodosChange={setTodos}
                onRecurringChange={setRecurringTodos}
                onBusy={(busy, msg) => {
                  if (busy) showLoading(msg || "İşleniyor...");
                  else hideLoading();
                }}
              />
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
              <div className="card" style={{ marginBottom: 14 }}>
                <div className="card-title">Gider İstatistikleri</div>
                <div className="metric-grid" id="r-exp-metrics">
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
                <div className="grid2" style={{ marginTop: 14 }}>
                  <div>
                    <div className="card-title">Kategoriye Göre Dağılım</div>
                    <div className="bar-chart" id="r-exp-cat-chart">
                      {renderGroupedExpenseChart(expenseView.katGroups)}
                    </div>
                  </div>
                  <div>
                    <div className="card-title">Aylık Gider Trendi</div>
                    <div className="bar-chart" id="r-exp-month-chart">
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
                              {fmtM(orderKalanBakiye(o))}
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
                      <div key={c + i} style={{ marginBottom: 10 }}>
                        <div className="tag-row">
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
                        <div style={{ paddingLeft: 12, marginTop: 6 }}>
                          {expSubCatsFor(settings, c).length ? (
                            expSubCatsFor(settings, c).map((sub, si) => (
                              <div
                                key={sub + si}
                                className="tag-row"
                                style={{ marginBottom: 4, fontSize: 12 }}
                              >
                                <span style={{ color: "var(--text2)" }}>
                                  {"↳ "}
                                  {escHtml(sub)}
                                </span>
                                <button
                                  type="button"
                                  className="btn sm danger"
                                  onClick={() => delExpSubCat(c, si)}
                                >
                                  ✕
                                </button>
                              </div>
                            ))
                          ) : (
                            <div style={{ fontSize: 11, color: "var(--text3)", marginBottom: 4 }}>
                              Alt kategori yok
                            </div>
                          )}
                          <div style={{ display: "flex", gap: 6, marginTop: 4 }}>
                            <input
                              placeholder="Alt kategori ekle..."
                              value={newExpSubCatByParent[c] ?? ""}
                              onChange={(e) =>
                                setNewExpSubCatByParent((prev) => ({
                                  ...prev,
                                  [c]: e.target.value,
                                }))
                              }
                              onKeyDown={(e) => {
                                if (e.key === "Enter") addExpSubCat(c);
                              }}
                              style={{ flex: 1, fontSize: 12 }}
                            />
                            <button
                              type="button"
                              className="btn sm"
                              onClick={() => addExpSubCat(c)}
                            >
                              +
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
              <div className="card" style={{ marginTop: 14 }}>
                <div className="card-title">Tekrarlayan Giderler</div>
                <p className="hint" style={{ marginBottom: 12 }}>
                  Kira, maaş vb. düzenli giderler. Kayıt yalnızca ilgili gün geldiğinde gider
                  listesine eklenir. Başlangıç tarihini bugün veya sonrası yapın.
                </p>
                <div className="fg c3">
                  <div>
                    <div className="fl">Kategori</div>
                    <select
                      value={recForm.kat}
                      onChange={(e) =>
                        setRecForm((f) => ({ ...f, kat: e.target.value, subkat: "" }))
                      }
                    >
                      {buildCatOptions(settings.expCats, recForm.kat)}
                    </select>
                  </div>
                  <div>
                    <div className="fl">Alt Kategori</div>
                    <select
                      value={recForm.subkat}
                      onChange={(e) =>
                        setRecForm((f) => ({ ...f, subkat: e.target.value }))
                      }
                    >
                      <option value="">—</option>
                      {expSubCatsFor(settings, recForm.kat).map((s) => (
                        <option key={s} value={s}>
                          {s}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <div className="fl">Periyot</div>
                    <select
                      value={recForm.freq}
                      onChange={(e) =>
                        setRecForm((f) => ({
                          ...f,
                          freq: e.target.value as "monthly" | "weekly",
                        }))
                      }
                    >
                      <option value="monthly">Aylık</option>
                      <option value="weekly">Haftalık</option>
                    </select>
                  </div>
                </div>
                <div className="fg c2">
                  <div>
                    <div className="fl">Açıklama</div>
                    <input
                      placeholder="Örn. Ofis kirası"
                      value={recForm.acik}
                      onChange={(e) =>
                        setRecForm((f) => ({ ...f, acik: e.target.value }))
                      }
                    />
                  </div>
                  <div>
                    <div className="fl">Tutar (₺)</div>
                    <input
                      type="number"
                      placeholder="50000"
                      value={recForm.tutar}
                      onChange={(e) =>
                        setRecForm((f) => ({ ...f, tutar: e.target.value }))
                      }
                    />
                  </div>
                </div>
                <div className="fg c2">
                  <div>
                    <div className="fl">Başlangıç</div>
                    <input
                      type="date"
                      value={recForm.startDate}
                      onChange={(e) =>
                        setRecForm((f) => ({ ...f, startDate: e.target.value }))
                      }
                    />
                  </div>
                  <div>
                    <div className="fl">Bitiş</div>
                    <input
                      type="date"
                      value={recForm.endDate}
                      onChange={(e) =>
                        setRecForm((f) => ({ ...f, endDate: e.target.value }))
                      }
                    />
                  </div>
                </div>
                <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginBottom: 12 }}>
                  {recEditId != null ? (
                    <button type="button" className="btn sm" onClick={cancelRecurringEdit}>
                      İptal
                    </button>
                  ) : null}
                  <button type="button" className="btn sm primary" onClick={() => void saveRecurring()}>
                    {recEditId != null ? "Güncelle" : "+ Tekrarlayan Gider Ekle"}
                  </button>
                </div>
                {recurringExpenses.length ? (
                  <div className="tbl-wrap recurring-desktop-table">
                    <table>
                      <thead>
                        <tr>
                          <th>Kategori</th>
                          <th>Açıklama</th>
                          <th>Tutar</th>
                          <th>Periyot</th>
                          <th>Aralık</th>
                          <th>Durum</th>
                          <th>İşlem</th>
                        </tr>
                      </thead>
                      <tbody>
                        {recurringExpenses.map((r) => (
                          <tr key={r.id}>
                            <td>
                              {escHtml(r.kat)}
                              {r.subkat ? (
                                <span style={{ color: "var(--text3)", fontSize: 11 }}>
                                  {" "}
                                  / {escHtml(r.subkat)}
                                </span>
                              ) : null}
                            </td>
                            <td>{escHtml(r.acik)}</td>
                            <td>{fmtM(r.tutar)}</td>
                            <td>{r.freq === "weekly" ? "Haftalık" : "Aylık"}</td>
                            <td style={{ fontSize: 12, color: "var(--text3)" }}>
                              {fmtDate(r.startDate)} – {fmtDate(r.endDate)}
                            </td>
                            <td>
                              <span className={`badge ${r.active ? "green" : "amber"}`}>
                                {r.active ? "Aktif" : "Pasif"}
                              </span>
                            </td>
                            <td>
                              <div style={{ display: "flex", gap: 6, justifyContent: "flex-end", flexWrap: "wrap" }}>
                                <button
                                  type="button"
                                  className="btn sm"
                                  onClick={() => editRecurring(r)}
                                >
                                  Düzenle
                                </button>
                                <button
                                  type="button"
                                  className="btn sm"
                                  onClick={() => void toggleRecurringActive(r.id, !r.active)}
                                >
                                  {r.active ? "Durdur" : "Aktifleştir"}
                                </button>
                                <button
                                  type="button"
                                  className="btn sm danger"
                                  onClick={() => void removeRecurring(r.id)}
                                >
                                  ✕
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="empty">Henüz tekrarlayan gider tanımı yok</div>
                )}
                {recurringExpenses.length ? (
                  <div className="recurring-mobile-list">
                    {recurringExpenses.map((r) => (
                      <div key={r.id} className="expense-card">
                        <div className="expense-card-head">
                          <span className="badge blue" style={{ fontSize: 10 }}>
                            {escHtml(r.kat)}
                            {r.subkat ? ` / ${escHtml(r.subkat)}` : ""}
                          </span>
                          <span className={`badge ${r.active ? "green" : "amber"}`}>
                            {r.active ? "Aktif" : "Pasif"}
                          </span>
                        </div>
                        <div className="expense-card-desc">{escHtml(r.acik)}</div>
                        <div className="expense-card-meta">
                          <span>{fmtM(r.tutar)}</span>
                          <span>{r.freq === "weekly" ? "Haftalık" : "Aylık"}</span>
                          <span style={{ fontSize: 11, color: "var(--text3)" }}>
                            {fmtDate(r.startDate)} – {fmtDate(r.endDate)}
                          </span>
                        </div>
                        <div className="expense-card-actions">
                          <button type="button" className="btn sm" onClick={() => editRecurring(r)}>
                            Düzenle
                          </button>
                          <button
                            type="button"
                            className="btn sm"
                            onClick={() => void toggleRecurringActive(r.id, !r.active)}
                          >
                            {r.active ? "Durdur" : "Aktifleştir"}
                          </button>
                          <button
                            type="button"
                            className="btn sm danger"
                            onClick={() => void removeRecurring(r.id)}
                          >
                            ✕
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : null}
              </div>
              <div className="card" style={{ marginTop: 14 }}>
                <div className="card-title">🖨 Kargo Etiketi / PDF</div>
                <p className="hint" style={{ marginBottom: 12 }}>
                  Sipariş listesindeki yazdır butonu bu ayarları kullanır. Tarayıcıdan
                  &quot;PDF olarak kaydet&quot; ile A4 çıktı alabilirsiniz.
                </p>
                <div className="fg c2" style={{ marginBottom: 14 }}>
                  <div>
                    <div className="fl">Sayfa yönü</div>
                    <select
                      value={labelSettings.orientation}
                      onChange={(e) =>
                        setLabelSettings((s) => ({
                          ...s,
                          orientation: e.target.value as "portrait" | "landscape",
                        }))
                      }
                    >
                      <option value="landscape">Yatay (A4 landscape)</option>
                      <option value="portrait">Dikey (A4 portrait)</option>
                    </select>
                  </div>
                  <div>
                    <div className="fl">Sayfa kenar boşluğu (mm)</div>
                    <input
                      type="number"
                      min={4}
                      max={30}
                      value={labelSettings.pageMarginMm}
                      onChange={(e) =>
                        setLabelSettings((s) => ({
                          ...s,
                          pageMarginMm: +e.target.value || 12,
                        }))
                      }
                    />
                  </div>
                  <div>
                    <div className="fl">Etiket iç boşluğu (mm)</div>
                    <input
                      type="number"
                      min={4}
                      max={24}
                      value={labelSettings.labelPaddingMm}
                      onChange={(e) =>
                        setLabelSettings((s) => ({
                          ...s,
                          labelPaddingMm: +e.target.value || 8,
                        }))
                      }
                    />
                  </div>
                  <div style={{ display: "flex", alignItems: "flex-end" }}>
                    <ErpToggle
                      label="Çerçeve göster"
                      checked={labelSettings.showBorder}
                      onChange={(showBorder) =>
                        setLabelSettings((s) => ({ ...s, showBorder }))
                      }
                    />
                  </div>
                </div>
                <div className="label-field-table">
                  <div className="label-field-head">
                    <span>Sıra</span>
                    <span>Alan</span>
                    <span>Göster</span>
                    <span>Başlık</span>
                    <span>Punto (pt)</span>
                  </div>
                  {labelSettings.fieldOrder.map((key, idx) => {
                    const f = labelSettings.fields[key];
                    return (
                      <div className="label-field-row" key={key}>
                        <div className="label-field-order">
                          <button
                            type="button"
                            className="btn sm"
                            disabled={idx === 0}
                            title="Yukarı"
                            onClick={() => moveLabelField(key, "up")}
                          >
                            ↑
                          </button>
                          <button
                            type="button"
                            className="btn sm"
                            disabled={idx === labelSettings.fieldOrder.length - 1}
                            title="Aşağı"
                            onClick={() => moveLabelField(key, "down")}
                          >
                            ↓
                          </button>
                        </div>
                        <span className="label-field-name">{ERP_LABEL_FIELD_LABELS[key]}</span>
                        <LabelCellSwitch
                          checked={f.enabled}
                          title={`${ERP_LABEL_FIELD_LABELS[key]} göster`}
                          onChange={(enabled) => updateLabelField(key, { enabled })}
                        />
                        <LabelCellSwitch
                          checked={f.showLabel}
                          disabled={!f.enabled}
                          title={`${ERP_LABEL_FIELD_LABELS[key]} başlık`}
                          onChange={(showLabel) => updateLabelField(key, { showLabel })}
                        />
                        <input
                          type="number"
                          className="label-field-pt"
                          min={6}
                          max={72}
                          value={f.fontSizePt}
                          disabled={!f.enabled}
                          onChange={(e) =>
                            updateLabelField(key, {
                              fontSizePt: +e.target.value || f.fontSizePt,
                            })
                          }
                        />
                      </div>
                    );
                  })}
                </div>
                <p className="hint" style={{ marginTop: 10, fontSize: 11 }}>
                  Eser bilgisinde kategori ve tür gösterilir; dahili sipariş notu (not_icerik)
                  etikete basılmaz.
                </p>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 14 }}>
                  <button
                    type="button"
                    className="btn sm primary"
                    onClick={() => void saveLabelSettings()}
                  >
                    Kaydet
                  </button>
                  <button
                    type="button"
                    className="btn sm"
                    onClick={() => printLabelPreview(labelSettings)}
                  >
                    Önizleme yazdır
                  </button>
                </div>
              </div>
              <div className="card" style={{ marginTop: 14 }}>
                <div className="card-title">✉ E-posta Bildirimleri</div>
                <p className="hint" style={{ marginBottom: 12 }}>
                  Her sabah 07:00 (TR) günlük özet; ayın 1&apos;inde bir önceki ayın raporu;
                  her Pazartesi sipariş + gider tam yedeği (JSON/CSV ek) gönderilir. Gmail için
                  Vercel ortam değişkenlerine SMTP bilgilerini ekleyin.
                </p>
                {emailSettings ? (
                  <>
                    <div className="fg" style={{ marginBottom: 12 }}>
                      <div className="fl">Alıcı e-posta</div>
                      <input
                        type="email"
                        placeholder="ornek@gmail.com"
                        value={emailSettings.toEmail}
                        onChange={(e) =>
                          setEmailSettings((s) =>
                            s ? { ...s, toEmail: e.target.value } : s
                          )
                        }
                      />
                    </div>
                    <div className="erp-switch-list" style={{ marginBottom: 12 }}>
                      <ErpToggle
                        label="Otomatik mail açık"
                        checked={emailSettings.enabled}
                        onChange={(enabled) =>
                          setEmailSettings((s) => (s ? { ...s, enabled } : s))
                        }
                      />
                      {(
                        ["dueOrders", "yesterdayOrders", "yesterdayExpenses"] as ErpEmailSectionKey[]
                      ).map((key) => (
                        <ErpToggle
                          key={key}
                          label={ERP_EMAIL_SECTION_LABELS[key]}
                          checked={emailSettings.dailySections.includes(key)}
                          onChange={() => toggleEmailSection(key)}
                        />
                      ))}
                      <ErpToggle
                        label={ERP_EMAIL_SECTION_LABELS.monthlyReport}
                        checked={emailSettings.monthlyReportEnabled}
                        onChange={() => toggleEmailSection("monthlyReport")}
                      />
                      <ErpToggle
                        label="Haftalık veri yedeği (Pazartesi, JSON + CSV ek)"
                        checked={emailSettings.weeklyBackupEnabled}
                        onChange={(weeklyBackupEnabled) =>
                          setEmailSettings((s) => (s ? { ...s, weeklyBackupEnabled } : s))
                        }
                      />
                    </div>
                    <p className="hint" style={{ marginBottom: 12, fontSize: 11 }}>
                      Bitime yakın siparişler bölümünde müşteri telefonu ve özet göstergeler
                      (Bekleyen, Tahsilat, Ciro vb.) yer alır.
                    </p>
                    <div
                      className={`alert ${emailSmtpOk ? "info" : "warn"}`}
                      style={{ marginBottom: 12, fontSize: 12 }}
                    >
                      {emailSmtpOk
                        ? "✓ SMTP sunucu ayarları tanımlı."
                        : `⚠ ${emailSmtpHint || "SMTP henüz yapılandırılmamış."}`}
                      {!emailSmtpOk ? (
                        <div style={{ marginTop: 8, lineHeight: 1.5 }}>
                          Gmail: Google Hesap → Güvenlik → 2 adımlı doğrulama → Uygulama
                          şifreleri. Vercel&apos;de:{" "}
                          <code style={{ fontSize: 11 }}>
                            SMTP_HOST=smtp.gmail.com SMTP_PORT=587 SMTP_USER=… SMTP_PASS=…
                            CRON_SECRET=…
                          </code>
                        </div>
                      ) : null}
                    </div>
                    {emailSettings.lastDailySent ||
                    emailSettings.lastMonthlySent ||
                    emailSettings.lastWeeklyBackupSent ? (
                      <p style={{ fontSize: 11, color: "var(--text3)", marginBottom: 10 }}>
                        Son günlük: {emailSettings.lastDailySent || "—"} · Son ay raporu:{" "}
                        {emailSettings.lastMonthlySent || "—"} · Son haftalık yedek:{" "}
                        {emailSettings.lastWeeklyBackupSent || "—"}
                      </p>
                    ) : null}
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                      <button type="button" className="btn sm primary" onClick={() => void saveEmailSettings()}>
                        Kaydet
                      </button>
                      <button type="button" className="btn sm" onClick={() => void testEmail("daily")}>
                        Test — Günlük
                      </button>
                      <button type="button" className="btn sm" onClick={() => void testEmail("monthly")}>
                        Test — Ay sonu
                      </button>
                      <button type="button" className="btn sm" onClick={() => void testEmail("weekly")}>
                        Test — Haftalık yedek
                      </button>
                    </div>
                  </>
                ) : (
                  <div className="empty">E-posta ayarları yükleniyor…</div>
                )}
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
                onChange={(e) => {
                  const tarih = e.target.value;
                  setOrderForm((f) => ({
                    ...f,
                    tarih,
                    bitis: bitisManual ? f.bitis : defaultOrderBitis(tarih),
                  }));
                }}
              />
            </div>
          </div>
          <div className="fg c2">
            <div>
              <div className="fl">Bitiş Tarihi</div>
              <input
                type="date"
                id="f-bitis"
                value={orderForm.bitis}
                onChange={(e) => {
                  setBitisManual(true);
                  setOrderForm((f) => ({ ...f, bitis: e.target.value }));
                }}
              />
              {bitisManual ? (
                <button
                  type="button"
                  className="hint"
                  style={{
                    marginTop: 4,
                    padding: 0,
                    border: "none",
                    background: "none",
                    cursor: "pointer",
                    textAlign: "left",
                    color: "var(--accent)",
                  }}
                  onClick={() => {
                    setBitisManual(false);
                    setOrderForm((f) => ({
                      ...f,
                      bitis: defaultOrderBitis(f.tarih),
                    }));
                  }}
                >
                  ↺ 25 iş gününe sıfırla
                </button>
              ) : (
                <div className="hint" style={{ marginTop: 4 }}>
                  Otomatik: sipariş tarihinden 25 iş günü
                </div>
              )}
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
          <div className="fg">
            <div>
              <div className="fl">Teslimat Adresi</div>
              <textarea
                id="f-adres"
                rows={3}
                placeholder="Mahalle, sokak, bina no, ilçe, il..."
                value={orderForm.adres}
                onChange={(e) =>
                  setOrderForm((f) => ({ ...f, adres: e.target.value }))
                }
              />
            </div>
          </div>
          <div className="fg">
            <div>
              <div className="fl">Google Maps Konum Linki</div>
              <input
                id="f-maps"
                placeholder="https://maps.app.goo.gl/... veya WhatsApp konum linki"
                value={orderForm.mapsUrl}
                onChange={(e) =>
                  setOrderForm((f) => ({ ...f, mapsUrl: e.target.value }))
                }
              />
              <div className="hint" style={{ marginTop: 6 }}>
                Google Maps veya WhatsApp&apos;tan &quot;Konumu paylaş&quot; ile gelen linki
                yapıştırın. Etikette QR kod olarak görünür.
              </div>
            </div>
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
                  setExpForm((f) => ({ ...f, kat: e.target.value, subkat: "" }))
                }
              >
                {buildCatOptions(settings.expCats, expForm.kat)}
              </select>
            </div>
          </div>
          <div className="fg c2">
            <div>
              <div className="fl">Alt Kategori</div>
              <select
                value={expForm.subkat}
                onChange={(e) =>
                  setExpForm((f) => ({ ...f, subkat: e.target.value }))
                }
              >
                <option value="">— Seçin —</option>
                {expSubCatsFor(settings, expForm.kat).map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
                <option value="__new__">+ Yeni alt kategori…</option>
              </select>
            </div>
            {expForm.subkat === "__new__" ? (
              <div>
                <div className="fl">Yeni Alt Kategori Adı</div>
                <input
                  placeholder="Örn. Polyester"
                  value={expNewSubkat}
                  onChange={(e) => setExpNewSubkat(e.target.value)}
                />
              </div>
            ) : (
              <div />
            )}
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
