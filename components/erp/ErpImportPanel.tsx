"use client";

import { useRef, useState } from "react";
import { importErpJson } from "@/components/erp/api";
import type { ErpData } from "@/lib/erp/types";

type Props = {
  orderCount: number;
  expenseCount: number;
  onImported: (data: ErpData) => void;
  onLoading: (msg: string) => void;
  onLoaded: () => void;
};

export function ErpImportPanel({
  orderCount,
  expenseCount,
  onImported,
  onLoading,
  onLoaded,
}: Props) {
  const [mode, setMode] = useState<"merge" | "replace">("merge");
  const [json, setJson] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [fileLabel, setFileLabel] = useState(
    "JSON dosyası seçin veya sürükleyin (birden fazla olabilir)"
  );
  const [status, setStatus] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const runImport = async () => {
    if (!json.trim() && files.length === 0) {
      alert("JSON yapıştırın veya dosya seçin.");
      return;
    }
    if (
      mode === "replace" &&
      !confirm(
        "Değiştir modu: içe aktarılan türlerdeki mevcut kayıtlar silinip dosyadaki veriler yazılır. Devam?"
      )
    ) {
      return;
    }

    onLoading("İçe aktarılıyor...");
    setStatus(null);
    try {
      const { result, data } = await importErpJson({ mode, json, files });
      onImported(data);
      const parts: string[] = [];
      if (result.orders.added || result.orders.updated || result.orders.skipped) {
        parts.push(
          `Sipariş: +${result.orders.added} güncellenen ${result.orders.updated}, atlanan ${result.orders.skipped}`
        );
      }
      if (result.expenses.added || result.expenses.updated || result.expenses.skipped) {
        parts.push(
          `Gider: +${result.expenses.added} güncellenen ${result.expenses.updated}, atlanan ${result.expenses.skipped}`
        );
      }
      if (result.settingsUpdated) parts.push("Ayarlar güncellendi");
      setStatus(parts.join(" · ") || "Tamamlandı");
      setJson("");
      setFiles([]);
      setFileLabel("JSON dosyası seçin veya sürükleyin (birden fazla olabilir)");
    } catch (e) {
      alert(e instanceof Error ? e.message : "İçe aktarma başarısız");
    } finally {
      onLoaded();
    }
  };

  return (
    <div className="card" style={{ marginTop: 14 }}>
      <div className="card-title">Veri içe aktar</div>
      <p style={{ fontSize: 12, color: "var(--text3)", marginBottom: 12 }}>
        Supabase veya yedek JSON dosyalarınızı yükleyin. Tek dosyada{" "}
        <code style={{ color: "var(--blue)" }}>{`{ "orders": [], "expenses": [] }`}</code> veya
        ayrı <code style={{ color: "var(--blue)" }}>orders.json</code> /{" "}
        <code style={{ color: "var(--blue)" }}>expenses.json</code> kullanabilirsiniz.
      </p>
      <div className="fg c2" style={{ marginBottom: 12 }}>
        <div>
          <div className="fl">Mod</div>
          <select
            value={mode}
            onChange={(e) => setMode(e.target.value === "replace" ? "replace" : "merge")}
          >
            <option value="merge">Birleştir (aynı id güncellenir)</option>
            <option value="replace">Değiştir (türü tamamen değiştir)</option>
          </select>
        </div>
        <div>
          <div className="fl">Mevcut kayıt</div>
          <div style={{ fontSize: 13, padding: "9px 0", color: "var(--text2)" }}>
            {orderCount} sipariş · {expenseCount} gider
          </div>
        </div>
      </div>
      <div
        className="dropzone"
        style={{ marginBottom: 12 }}
        role="button"
        tabIndex={0}
        onClick={() => fileRef.current?.click()}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") fileRef.current?.click();
        }}
        onDragOver={(e) => {
          e.preventDefault();
          e.currentTarget.style.borderColor = "var(--blue)";
        }}
        onDragLeave={(e) => {
          e.currentTarget.style.borderColor = "";
        }}
        onDrop={(e) => {
          e.preventDefault();
          e.currentTarget.style.borderColor = "";
          const list = Array.from(e.dataTransfer.files).filter((f) => f.name.endsWith(".json"));
          if (list.length) {
            setFiles(list);
            setFileLabel(list.length === 1 ? `📎 ${list[0].name}` : `📎 ${list.length} dosya`);
          }
        }}
      >
        <div style={{ fontSize: 22, marginBottom: 4 }}>📥</div>
        <div>{fileLabel}</div>
      </div>
      <input
        ref={fileRef}
        type="file"
        accept=".json,application/json"
        multiple
        style={{ display: "none" }}
        onChange={(e) => {
          const list = Array.from(e.target.files ?? []);
          setFiles(list);
          setFileLabel(
            list.length === 0
              ? "JSON dosyası seçin veya sürükleyin (birden fazla olabilir)"
              : list.length === 1
                ? `📎 ${list[0].name}`
                : `📎 ${list.length} dosya`
          );
        }}
      />
      <div className="fg" style={{ marginBottom: 12 }}>
        <div className="fl">veya JSON yapıştır</div>
        <textarea
          rows={6}
          placeholder='{"orders":[...],"expenses":[...]}'
          value={json}
          onChange={(e) => setJson(e.target.value)}
          style={{ fontFamily: "monospace", fontSize: 12 }}
        />
      </div>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        <button type="button" className="btn primary" onClick={() => void runImport()}>
          İçe aktar
        </button>
        <button
          type="button"
          className="btn"
          onClick={() => {
            setJson("");
            setFiles([]);
            setFileLabel("JSON dosyası seçin veya sürükleyin (birden fazla olabilir)");
            setStatus(null);
          }}
        >
          Temizle
        </button>
      </div>
      {status ? (
        <div className="alert succ" style={{ marginTop: 12 }}>
          ✓ {status}
        </div>
      ) : null}
    </div>
  );
}
