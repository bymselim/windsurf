import { NextResponse } from "next/server";
import { readVerifyPageCopy } from "@/lib/verify-page-copy-io";

export const dynamic = "force-dynamic";

export async function GET() {
  const copy = await readVerifyPageCopy();
  return NextResponse.json(copy);
}
