/**
 * Sadece beyan (declaration) dilimine erişim — tek kaynak verify-page-copy.
 */
import type { VerifyDeclaration } from "./verify-page-copy-constants";
import { readVerifyPageCopy, writeVerifyPageCopy } from "./verify-page-copy-io";

export type { VerifyDeclaration };

export async function readVerifyDeclaration(): Promise<VerifyDeclaration> {
  return (await readVerifyPageCopy()).declaration;
}

export async function writeVerifyDeclaration(next: VerifyDeclaration): Promise<void> {
  const c = await readVerifyPageCopy();
  c.declaration = { en: next.en.trim(), tr: next.tr.trim() };
  await writeVerifyPageCopy(c);
}
