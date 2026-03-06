import { NextRequest, NextResponse } from "next/server";
import { getAllGateLogs } from "@/lib/gate-log";
import { getAdminPassword } from "@/lib/admin-password";

const COOKIE_NAME = "admin_session";

export interface GateLogSummary {
  phone: string;
  password: string;
  count: number;
  dates: Record<string, number>;
  ips: string[];
  hasMultipleIps: boolean;
}

export async function GET(request: NextRequest) {
  const cookieAuth = request.cookies.get(COOKIE_NAME)?.value === "1";
  const headerPassword = request.headers.get("x-admin-password") ?? "";
  const storedPassword = await getAdminPassword();

  if (!cookieAuth && headerPassword !== storedPassword) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const phoneFilter = searchParams.get("phone")?.trim() || "";

  const logs = await getAllGateLogs();

  const byKey = new Map<string, GateLogSummary>();
  for (const log of logs) {
    const key = `${log.phone}|${log.password}`;
    let sum = byKey.get(key);
    if (!sum) {
      sum = {
        phone: log.phone,
        password: log.password,
        count: 0,
        dates: {},
        ips: [],
        hasMultipleIps: false,
      };
      byKey.set(key, sum);
    }
    sum.count += 1;
    sum.dates[log.date] = (sum.dates[log.date] ?? 0) + 1;
    if (log.ip && log.ip !== "—" && !sum.ips.includes(log.ip)) {
      sum.ips.push(log.ip);
    }
  }

  for (const sum of Array.from(byKey.values())) {
    sum.hasMultipleIps = sum.ips.length > 1;
  }

  let entries = Array.from(byKey.values()).sort(
    (a, b) => b.count - a.count
  );

  if (phoneFilter) {
    const q = phoneFilter.replace(/\D/g, "");
    entries = entries.filter((e) => e.phone.includes(q));
  }

  const rawLogs = phoneFilter
    ? logs.filter((l) => l.phone.replace(/\D/g, "").includes(phoneFilter.replace(/\D/g, "")))
    : logs;

  return NextResponse.json({
    summaries: entries,
    rawLogs: rawLogs.slice(0, 500),
  });
}
