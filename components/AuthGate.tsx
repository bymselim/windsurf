"use client";

import { useState, useEffect, useMemo } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { motion } from "framer-motion";
import { FiLock, FiPhone, FiUser, FiCheck } from "react-icons/fi";
import { KVKKModal } from "./KVKKModal";

type AccessGateConfig = {
  requireFullName: boolean;
  requirePhoneNumber: boolean;
  showKVKK: boolean;
  kvkkText: string;
};

function buildSchema(config: AccessGateConfig) {
  return z.object({
    fullName: config.requireFullName
      ? z.string().min(2, "Name must be at least 2 characters").max(100)
      : z.string().max(100).optional().or(z.literal("")),
    phoneNumber: config.requirePhoneNumber
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

export function AuthGate({ gallery }: AuthGateProps = {}) {
  const [config, setConfig] = useState<AccessGateConfig | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [kvkkOpen, setKvkkOpen] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/settings/access-gate")
      .then((r) => r.json())
      .then((data) => {
        if (!cancelled && data && typeof data === "object") {
          setConfig({
            requireFullName: Boolean(data.requireFullName),
            requirePhoneNumber: Boolean(data.requirePhoneNumber),
            showKVKK: Boolean(data.showKVKK),
            kvkkText: typeof data.kvkkText === "string" ? data.kvkkText : "",
          });
        } else if (!cancelled) {
          setConfig({
            requireFullName: true,
            requirePhoneNumber: true,
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
    handleSubmit,
    formState: { errors, isValid },
  } = useForm<FormData>({
    resolver: schema ? zodResolver(schema) : undefined,
    mode: "onChange",
    defaultValues,
  });

  const onSubmit = async (data: FormData) => {
    setError(null);
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
        setError(json.error ?? "Access denied.");
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
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="w-full max-w-md rounded-2xl border border-zinc-700/50 bg-zinc-900/80 p-6 shadow-2xl backdrop-blur sm:p-8"
      >
        <h1 className="mb-2 text-center text-xl font-semibold tracking-tight text-zinc-100 sm:text-2xl">
          Welcome to the Gallery
        </h1>
        <p className="mb-6 text-center text-sm text-zinc-400">
          Enter your details to access the collection
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

          {config.requirePhoneNumber && (
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
                  placeholder="+90 5XX XXX XX XX"
                  className="w-full rounded-lg border border-zinc-600 bg-zinc-800/50 py-3 pl-10 pr-4 text-zinc-100 placeholder-zinc-500 transition focus:border-amber-500/50 focus:outline-none focus:ring-1 focus:ring-amber-500/50"
                  {...register("phoneNumber")}
                />
              </div>
              {errors.phoneNumber && (
                <p className="mt-1 text-xs text-amber-400">{errors.phoneNumber.message}</p>
              )}
            </div>
          )}

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

      <KVKKModal
        isOpen={kvkkOpen}
        onClose={() => setKvkkOpen(false)}
        kvkkText={config.kvkkText}
      />
    </div>
  );
}
