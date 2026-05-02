import { NextResponse } from "next/server";
import { readVerifyDeclaration } from "@/lib/verify-declaration-io";

export const dynamic = "force-dynamic";

export async function GET() {
  const d = await readVerifyDeclaration();
  return NextResponse.json(d);
}
