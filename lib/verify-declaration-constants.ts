/** Geriye dönük: sadece beyan tipi/varsayılanı (istemci güvenli). */

import { DEFAULT_VERIFY_PAGE_COPY, type VerifyDeclaration } from "./verify-page-copy-constants";

export type { VerifyDeclaration };

export const DEFAULT_VERIFY_DECLARATION: VerifyDeclaration = {
  en: DEFAULT_VERIFY_PAGE_COPY.declaration.en,
  tr: DEFAULT_VERIFY_PAGE_COPY.declaration.tr,
};
