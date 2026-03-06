"use client";

import { useState, useEffect, useMemo } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { motion, AnimatePresence } from "framer-motion";
import { FiLock, FiPhone, FiUser, FiCheck } from "react-icons/fi";
import { KVKKModal } from "./KVKKModal";
import { YetkilendirmeButton } from "./YetkilendirmeButton";

const WELCOME_MESSAGES: { lang: string; text: string }[] = [
  { lang: "TR", text: "Melike Sevinç Artworks VIP Girişine Hoş Geldiniz." },
  { lang: "EN", text: "Welcome to Melike Sevinç Artworks VIP Access." },
  { lang: "FR", text: "Bienvenue à l'accès VIP Melike Sevinç Artworks." },
  { lang: "DE", text: "Willkommen beim VIP-Zugang zu Melike Sevinç Artworks." },
  { lang: "ES", text: "Bienvenido al acceso VIP de Melike Sevinç Artworks." },
  { lang: "PT", text: "Bem-vindo ao acesso VIP da Melike Sevinç Artworks." },
  { lang: "AR", text: "مرحباً بكم في الدخول الحصري لأعمال ميلكه سيفينتش الفنية." },
  { lang: "IT", text: "Benvenuti all'accesso VIP di Melike Sevinç Artworks." },
  { lang: "JA", text: "メリケ・セヴィンチ アートワークス VIPへようこそ。" },
  { lang: "ZH", text: "欢迎来到 Melike Sevinç Artworks 贵宾通道。" },
  { lang: "HI", text: "मेलिके सेविन्क आर्टवर्क्स VIP एक्सेस में आपका स्वागत है।" },
  { lang: "DA", text: "Velkommen til Melike Sevinç Artworks VIP-adgang." },
  { lang: "RU", text: "Добро пожаловать в VIP-доступ Melike Sevinç Artworks." },
];

const ROTATE_MS = 3500;

type AccessGateConfig = {
  requireFullName: boolean;
  requirePhoneNumber: boolean;
  usePhoneBasedPassword: boolean;
  showKVKK: boolean;
  kvkkText: string;
};

function buildSchema(config: AccessGateConfig) {
  const phoneRequired = config.requirePhoneNumber || config.usePhoneBasedPassword;
  return z.object({
    fullName: config.requireFullName
      ? z.string().min(2, "Name must be at least 2 characters").max(100)
      : z.string().max(100).optional().or(z.literal("")),
    phoneNumber: phoneRequired
      ? z
          .string()
          .min(10, "Enter a valid phone number")
          .regex(/^[\d\s+\-()]+$/, "Phone number can only contain digits and + - ( )")
      : z.string().optional().or(z.literal("")),
    password: z.string().min(1, "Password is required"),
    kvkkAccepted: config.showKVKK
      ? z.literal(true, {
          errorMap: () => ({ message: "You must agree to the KVKK terms." }),
        })
      : z.boolean().optional(),
  });
}

type FormData = z.infer<ReturnType<typeof buildSchema>>;

const STORAGE_KEY = "gallery_access_token";

export type AuthGateGallery = "turkish" | "international";

type AuthGateProps = {
  /** When set, sends gallery to API and redirects to the matching gallery path. */
  gallery?: AuthGateGallery;
};

const WHATSAPP_NUMBER = "908505327262"; // 0850 532 7262

export function AuthGate({ gallery }: AuthGateProps = {}) {
  const [config, setConfig] = useState<AccessGateConfig | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [creditsExpiredPhone, setCreditsExpiredPhone] = useState<string | null>(null);
  const [kvkkOpen, setKvkkOpen] = useState(false);
  const [welcomeIndex, setWelcomeIndex] = useState(0);

  useEffect(() => {
    const t = setInterval(() => {
      setWelcomeIndex((i) => (i + 1) % WELCOME_MESSAGES.length);
    }, ROTATE_MS);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/settings/access-gate", { cache: "no-store" })
      .then((r) => r.json())
      .then((data) => {
        if (!cancelled && data && typeof data === "object") {
          setConfig({
            requireFullName: Boolean(data.requireFullName),
            requirePhoneNumber: Boolean(data.requirePhoneNumber),
            usePhoneBasedPassword: Boolean(data.usePhoneBasedPassword),
            showKVKK: Boolean(data.showKVKK),
            kvkkText: typeof data.kvkkText === "string" ? data.kvkkText : "",
          });
        } else if (!cancelled) {
          setConfig({
            requireFullName: true,
            requirePhoneNumber: true,
            usePhoneBasedPassword: false,
            showKVKK: true,
            kvkkText: "",
          });
        }
      })
      .catch(() => {
        if (!cancelled) {
          setConfig({
            requireFullName: true,
            requirePhoneNumber: true,
            usePhoneBasedPassword: false,
            showKVKK: true,
            kvkkText: "",
          });
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const schema = useMemo(
    () => (config ? buildSchema(config) : null),
    [config]
  );

  const defaultValues: FormData = useMemo(
    () => ({
      fullName: "",
      phoneNumber: "",
      password: "",
      kvkkAccepted: config?.showKVKK ? false : undefined,
    }),
    [config?.showKVKK]
  );

  const {
    register,
    watch,
    handleSubmit,
    formState: { errors, isValid },
  } = useForm<FormData>({
    resolver: schema ? zodResolver(schema) : undefined,
    mode: "onChange",
    defaultValues,
  });

  const onSubmit = async (data: FormData) => {
    setError(null);
    setCreditsExpiredPhone(null);
    try {
      const body: Record<string, string> = {
        fullName: data.fullName ?? "",
        phoneNumber: data.phoneNumber ?? "",
        password: data.password,
      };
      if (gallery) body.gallery = gallery;

      const res = await fetch("/api/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const json = await res.json();

      if (!res.ok) {
        if (json.error === "CREDITS_EXPIRED") {
          setCreditsExpiredPhone(data.phoneNumber ?? "");
          setError(null);
          return;
        }
        setError(json.message ?? json.error ?? "Access denied.");
        return;
      }

      if (json.token && typeof window !== "undefined") {
        localStorage.setItem(STORAGE_KEY, json.token);
      }
      window.location.href = json.redirect ?? (gallery === "international" ? "/international/gallery" : "/turkish/gallery");
    } catch {
      setError("Something went wrong. Please try again.");
    }
  };

  if (config === null) {
    return (
      <div className="relative flex min-h-screen flex-col items-center justify-center bg-gradient-to-b from-zinc-950 via-zinc-900 to-zinc-950 px-4 py-8">
        <p className="text-zinc-400">Loading...</p>
      </div>
    );
  }

  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center bg-gradient-to-b from-zinc-950 via-zinc-900 to-zinc-950 px-4 py-8">
      <div className="flex flex-1 flex-col items-center justify-center w-full">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="w-full max-w-md rounded-2xl border border-zinc-700/50 bg-zinc-900/80 p-6 shadow-2xl backdrop-blur sm:p-8"
        >
          <div className="mb-4 min-h-[3.5rem] flex items-center justify-center">
            <AnimatePresence mode="wait">
              <motion.h1
                key={welcomeIndex}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.35 }}
                className="text-center text-xl font-semibold tracking-tight text-zinc-100 sm:text-2xl"
              >
                {WELCOME_MESSAGES[welcomeIndex].text}
              </motion.h1>
            </AnimatePresence>
          </div>
          <p className="mb-6 text-center text-sm text-zinc-400 leading-relaxed">
            <span className="block">Lütfen size verilen özel şifreyi ya da formu doldurarak giriş yapınız.</span>
            <span className="block mt-1 text-zinc-500">Please enter the password provided to you or fill in the form to enter.</span>
          </p>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {config.requireFullName && (
            <div>
              <label htmlFor="fullName" className="mb-1.5 block text-sm font-medium text-zinc-300">
                Full Name
              </label>
              <div className="relative">
                <FiUser className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
                <input
                  id="fullName"
                  type="text"
                  autoComplete="name"
                  placeholder="Your full name"
                  className="w-full rounded-lg border border-zinc-600 bg-zinc-800/50 py-3 pl-10 pr-4 text-zinc-100 placeholder-zinc-500 transition focus:border-amber-500/50 focus:outline-none focus:ring-1 focus:ring-amber-500/50"
                  {...register("fullName")}
                />
              </div>
              {errors.fullName && (
                <p className="mt-1 text-xs text-amber-400">{errors.fullName.message}</p>
              )}
            </div>
          )}

          <div>
            <label htmlFor="phoneNumber" className="mb-1.5 block text-sm font-medium text-zinc-300">
              Phone Number
            </label>
              <div className="relative">
                <FiPhone className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
                <input
                  id="phoneNumber"
                  type="tel"
                  autoComplete="tel"
                  placeholder="Telefon numaranızı yazınız"
                  className="w-full rounded-lg border border-zinc-600 bg-zinc-800/50 py-3 pl-10 pr-4 text-zinc-100 placeholder-zinc-500 transition focus:border-amber-500/50 focus:outline-none focus:ring-1 focus:ring-amber-500/50"
                  {...register("phoneNumber")}
                />
              </div>
              {errors.phoneNumber && (
                <p className="mt-1 text-xs text-amber-400">{errors.phoneNumber.message}</p>
              )}
            </div>

          <div>
            <label htmlFor="password" className="mb-1.5 block text-sm font-medium text-zinc-300">
              Access Password
            </label>
            <div className="relative">
              <FiLock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
              <input
                id="password"
                type="password"
                autoComplete="current-password"
                placeholder="••••••••"
                className="w-full rounded-lg border border-zinc-600 bg-zinc-800/50 py-3 pl-10 pr-4 text-zinc-100 placeholder-zinc-500 transition focus:border-amber-500/50 focus:outline-none focus:ring-1 focus:ring-amber-500/50"
                {...register("password")}
              />
            </div>
            {errors.password && (
              <p className="mt-1 text-xs text-amber-400">{errors.password.message}</p>
            )}
          </div>

          {config.showKVKK && (
            <div className="flex items-start gap-3">
              <input
                id="kvkkAccepted"
                type="checkbox"
                className="mt-1 h-4 w-4 rounded border-zinc-600 bg-zinc-800 text-amber-500 focus:ring-amber-500/50"
                {...register("kvkkAccepted")}
              />
              <label htmlFor="kvkkAccepted" className="text-sm text-zinc-400">
                I agree to the{" "}
                <button
                  type="button"
                  onClick={() => setKvkkOpen(true)}
                  className="inline font-medium text-amber-500 underline underline-offset-2 hover:text-amber-400"
                >
                  KVKK terms
                </button>
                .
              </label>
            </div>
          )}
          {config.showKVKK && errors.kvkkAccepted && (
            <p className="text-xs text-amber-400">{errors.kvkkAccepted.message}</p>
          )}

          {creditsExpiredPhone && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="rounded-lg bg-amber-500/10 border border-amber-500/30 px-4 py-3 space-y-3"
            >
              <p className="text-sm text-amber-200">
                Yetkilendirmeniz sona erdi. Lütfen tekrar yetkilendirme isteyiniz.
              </p>
              <a
                href={`https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(
                  `Yetkilendirmeyi uzatmak istiyorum. Telefon numaram: ${(creditsExpiredPhone.replace(/\D/g, "") || "").replace(/^90/, "") || creditsExpiredPhone}`
                )}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 rounded-lg bg-green-600 hover:bg-green-500 px-4 py-2.5 text-sm font-medium text-white transition"
              >
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                </svg>
                WhatsApp ile yetkilendirme iste
              </a>
            </motion.div>
          )}

          {error && (
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="rounded-lg bg-red-500/10 px-3 py-2 text-sm text-red-400"
            >
              {error}
            </motion.p>
          )}

          <button
            type="submit"
            disabled={!isValid}
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-amber-500 py-3.5 font-medium text-zinc-950 transition hover:bg-amber-600 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <FiCheck className="h-4 w-4" />
            Enter Gallery
          </button>
        </form>
        </motion.div>
      </div>

      <footer className="mt-auto w-full max-w-md px-2 py-6 text-center">
        <div className="mb-4 flex justify-center">
          <YetkilendirmeButton phoneNumber={watch("phoneNumber")} compact />
        </div>
        <p className="text-[11px] sm:text-xs text-zinc-500 leading-relaxed">
          Bu sayfa melikesevinc.com&apos;un VIP misafirlerine özeldir.
          <span className="block mt-0.5 text-zinc-600">This page is exclusive to VIP guests of melikesevinc.com.</span>
        </p>
      </footer>

      <KVKKModal
        isOpen={kvkkOpen}
        onClose={() => setKvkkOpen(false)}
        kvkkText={config.kvkkText}
      />
    </div>
  );
}
