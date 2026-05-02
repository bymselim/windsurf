/** İstemci + sunucu güvenli: `fs` yok — sadece tip ve varsayılan metinler. */

export type VerifyDeclaration = { en: string; tr: string };

export const DEFAULT_VERIFY_DECLARATION: VerifyDeclaration = {
  en: "This certificate verifies that the artwork described herein is an original work, produced by the artist exclusively for its owner, and bears the authentic characteristics of the artist.",
  tr: "Bu sertifika, bu belgede tanımlanan eserin, sanatçı tarafından sahibi için özel olarak üretilmiş özgün bir çalışma olduğunu ve sanatçının özgün niteliklerini taşıdığını onaylar.",
};
