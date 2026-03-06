"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { FiUser, FiPhone } from "react-icons/fi";
import { KVKKModal } from "@/components/KVKKModal";
import { FAQAnswerClient } from "./FAQAnswerClient";
import type { FAQItem } from "@/lib/faq-data";

const schema = z.object({
  fullName: z.string().min(2, "Ad soyad en az 2 karakter olmalı"),
  phone: z
    .string()
    .min(10, "Geçerli telefon numarası girin")
    .regex(/^[\d\s+\-()]+$/, "Sadece rakam ve + - ( ) kullanın"),
  kvkkAccepted: z.boolean().refine((v) => v === true, {
    message: "KVKK sözleşmesini kabul etmelisiniz",
  }),
});

type FormData = z.infer<typeof schema>;

type Props = {
  slug: string;
  item: FAQItem;
};

export function FAQGate({ slug, item }: Props) {
  const [status, setStatus] = useState<"loading" | "allowed" | "blocked" | "form">("loading");
  const [kvkkOpen, setKvkkOpen] = useState(false);
  const [kvkkText, setKvkkText] = useState("");

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    setError,
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { fullName: "", phone: "", kvkkAccepted: false },
  });

  useEffect(() => {
    fetch(`/api/faq-access?slug=${encodeURIComponent(slug)}`, { credentials: "include" })
      .then((r) => r.json())
      .then((data) => {
        if (data.status === "allowed") setStatus("allowed");
        else if (data.status === "blocked") setStatus("blocked");
        else setStatus("form");
      })
      .catch(() => setStatus("form"));
  }, [slug]);

  useEffect(() => {
    fetch("/api/settings/access-gate", { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => setKvkkText(typeof d?.kvkkText === "string" ? d.kvkkText : ""))
      .catch(() => {});
  }, []);

  const onSubmit = async (data: FormData) => {
    const res = await fetch("/api/faq-access", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({
        slug,
        fullName: data.fullName,
        phone: data.phone,
        kvkkAccepted: true,
      }),
    });
    const json = await res.json();

    if (!res.ok) {
      setError("root", { message: json.error || "Bir hata oluştu" });
      return;
    }

    if (json.status === "allowed") {
      setStatus("allowed");
    }
  };

  if (status === "loading") {
    return (
      <div className="py-12 text-center text-zinc-400">
        Yükleniyor...
      </div>
    );
  }

  if (status === "blocked") {
    return (
      <div className="py-12 text-center">
        <p className="text-amber-400 text-lg font-medium">
          Bu link daha önce kullanılmış.
        </p>
        <p className="text-zinc-500 mt-2 text-sm">
          Her link yalnızca bir kez kullanılabilir.
        </p>
      </div>
    );
  }

  if (status === "form") {
    return (
      <>
        <div className="max-w-md mx-auto py-12">
          <p className="text-zinc-400 mb-6 text-center">
            Bu içeriğe erişmek için bilgilerinizi girin. Link yalnızca bir kez kullanılabilir.
          </p>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div>
              <label className="block text-sm text-zinc-300 mb-1.5">Ad Soyad</label>
              <div className="relative">
                <FiUser className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
                <input
                  {...register("fullName")}
                  className="w-full pl-10 pr-4 py-3 bg-zinc-900 border border-zinc-700 rounded-lg text-zinc-100 placeholder-zinc-500 focus:border-amber-500/50 focus:outline-none"
                  placeholder="Adınız soyadınız"
                />
              </div>
              {errors.fullName && (
                <p className="mt-1 text-xs text-amber-400">{errors.fullName.message}</p>
              )}
            </div>
            <div>
              <label className="block text-sm text-zinc-300 mb-1.5">Telefon</label>
              <div className="relative">
                <FiPhone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
                <input
                  {...register("phone")}
                  type="tel"
                  className="w-full pl-10 pr-4 py-3 bg-zinc-900 border border-zinc-700 rounded-lg text-zinc-100 placeholder-zinc-500 focus:border-amber-500/50 focus:outline-none"
                  placeholder="05XX XXX XX XX"
                />
              </div>
              {errors.phone && (
                <p className="mt-1 text-xs text-amber-400">{errors.phone.message}</p>
              )}
            </div>
            <div className="flex items-start gap-3">
              <input
                {...register("kvkkAccepted")}
                type="checkbox"
                className="mt-1 h-4 w-4 rounded border-zinc-600 bg-zinc-800 text-amber-500"
              />
              <label className="text-sm text-zinc-400">
                <button
                  type="button"
                  onClick={() => setKvkkOpen(true)}
                  className="text-amber-500 underline hover:text-amber-400"
                >
                  KVKK sözleşmesini
                </button>
                {" "}kabul ediyorum.
              </label>
            </div>
            {errors.kvkkAccepted && (
              <p className="text-xs text-amber-400">{errors.kvkkAccepted.message}</p>
            )}
            {errors.root && (
              <p className="text-sm text-amber-400">{errors.root.message}</p>
            )}
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-3 bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-zinc-950 font-medium rounded-lg transition"
            >
              {isSubmitting ? "Gönderiliyor..." : "İçeriğe Eriş"}
            </button>
          </form>
        </div>
        <KVKKModal isOpen={kvkkOpen} onClose={() => setKvkkOpen(false)} kvkkText={kvkkText} />
      </>
    );
  }

  return (
    <FAQAnswerClient
      text={item.answer}
      matrixEnding={item.matrixEnding}
      slug={slug}
    />
  );
}
