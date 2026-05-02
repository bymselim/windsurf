/**
 * /verify-your-art metinleri — istemci güvenli (fs yok).
 * Varsayılanlar kodda; vadmin ile KV/dosyada üzerine yazılır.
 */

export type VerifyDeclaration = { en: string; tr: string };

export type BilingualField = { tr: string; en: string };

export type LangBlock = {
  intro: string;
  webpinPlaceholder: string;
  verify: string;
  verifying: string;
  errEmptyPin: string;
  err404: string;
  errGeneric: string;
  errNetwork: string;
  errChangeShort: string;
  errChangeSend: string;
  errChangeFail: string;
  errChangeStorage: string;
  send: string;
  sending: string;
  cancel: string;
  changeRequest: string;
  yourRequest: string;
  changePlaceholder: string;
  noContact: string;
  dash: string;
  footer: string;
  authenticity: string;
  titleMain: string;
  coaLineEn: string;
  coaLineTr: string;
  successTr: string;
  successEn: string;
};

export type FieldsBlock = {
  record: BilingualField;
  serial: BilingualField;
  media: BilingualField;
  title: BilingualField;
  date: BilingualField;
  ownerName: BilingualField;
  ownerRole: BilingualField;
  contact: BilingualField;
  prev: BilingualField;
  prevNameCol: BilingualField;
  prevDatesCol: BilingualField;
  webpin: BilingualField;
};

export type VerifyPageCopy = {
  declaration: VerifyDeclaration;
  langToggleTr: string;
  langToggleEn: string;
  artistName: string;
  artistUrl: string;
  artistRole: string;
  tr: LangBlock;
  en: LangBlock;
  fields: FieldsBlock;
};

const DEFAULT_TR: LangBlock = {
  intro: "Sertifikanızda yer alan webpin numarasını girerek eser bilgilerinizi güvenle doğrulayın.",
  webpinPlaceholder: "Örn. ABC12XY",
  verify: "Doğrula",
  verifying: "Sorgulanıyor…",
  errEmptyPin: "Lütfen webpin numaranızı girin.",
  err404: "Bu webpin ile eşleşen kayıt bulunamadı. Numarayı kontrol edin veya iletişime geçin.",
  errGeneric: "Doğrulama şu an yapılamadı. Lütfen daha sonra tekrar deneyin.",
  errNetwork: "Bağlantı hatası. Ağınızı kontrol edip tekrar deneyin.",
  errChangeShort: "Lütfen talebinizi birkaç cümle ile açıklayın.",
  errChangeSend: "Gönderilemedi.",
  errChangeFail: "Gönderim başarısız.",
  errChangeStorage:
    "Talep sunucuya yazılamadı (bulut ortamı). Lütfen bir süre sonra tekrar deneyin veya melikesevinc.com üzerinden iletişime geçin.",
  send: "Gönder",
  sending: "Gönderiliyor…",
  cancel: "Vazgeç",
  changeRequest: "Değişiklik talep et",
  yourRequest: "Talebiniz",
  changePlaceholder: "Hangi bilginin güncellenmesini istediğinizi yazın…",
  noContact: "Bu kayıt için iletişim bilgisi eklenmemiş.",
  dash: "—",
  footer: "Melike Sevinc · Eser doğrulama",
  authenticity: "Authenticity · Otantiklik",
  titleMain: "VERIFY YOUR ART",
  coaLineEn: "Certificate of Authenticity",
  coaLineTr: "Sahiplik sertifikası",
  successTr:
    "Talebiniz alındı. Size melikesevinc.com üzerinden ulaşılacak ve bilgilerinizin teyidi alınacaktır; onaylanması halinde düzenlemeler gerçekleşecektir.",
  successEn:
    "Your request has been received. You will be contacted via melikesevinc.com to confirm your details; if approved, the updates will be applied.",
};

const DEFAULT_EN: LangBlock = {
  intro: "Enter the webpin from your certificate to verify your artwork details securely.",
  webpinPlaceholder: "e.g. ABC12XY",
  verify: "Verify",
  verifying: "Checking…",
  errEmptyPin: "Please enter your webpin.",
  err404: "No record matches this webpin. Check the number or contact us.",
  errGeneric: "Verification is unavailable right now. Please try again later.",
  errNetwork: "Connection error. Check your network and try again.",
  errChangeShort: "Please describe your request in a few sentences.",
  errChangeSend: "Could not send.",
  errChangeFail: "Send failed.",
  errChangeStorage:
    "Your request could not be saved. Please try again later or contact us via melikesevinc.com.",
  send: "Send",
  sending: "Sending…",
  cancel: "Cancel",
  changeRequest: "Request a change",
  yourRequest: "Your request",
  changePlaceholder: "Describe which information you would like updated…",
  noContact: "No contact details have been added for this record.",
  dash: "—",
  footer: "Melike Sevinc · Artwork verification",
  authenticity: "Authenticity · Otantiklik",
  titleMain: "VERIFY YOUR ART",
  coaLineEn: "Certificate of Authenticity",
  coaLineTr: "Sahiplik sertifikası",
  successTr:
    "Talebiniz alındı. Size melikesevinc.com üzerinden ulaşılacak ve bilgilerinizin teyidi alınacaktır; onaylanması halinde düzenlemeler gerçekleşecektir.",
  successEn:
    "Your request has been received. You will be contacted via melikesevinc.com to confirm your details; if approved, the updates will be applied.",
};

const DEFAULT_FIELDS: FieldsBlock = {
  record: { tr: "Kayıt", en: "Record" },
  serial: { tr: "Seri numarası", en: "Serial number" },
  media: { tr: "Görsel / video", en: "Photo & video" },
  title: { tr: "Eser adı", en: "Artwork title" },
  date: { tr: "Tarih", en: "Date" },
  ownerName: { tr: "Adı soyadı", en: "Name surname" },
  ownerRole: { tr: "Sahip", en: "Owner" },
  contact: { tr: "İletişim", en: "Contact" },
  prev: { tr: "Önceki sahiplikler", en: "Previous ownership" },
  prevNameCol: { tr: "Adı soyadı", en: "Name surname" },
  prevDatesCol: { tr: "Tarihler", en: "Dates" },
  webpin: { tr: "Webpin", en: "Webpin" },
};

export const DEFAULT_VERIFY_PAGE_COPY: VerifyPageCopy = {
  declaration: {
    en: "This certificate verifies that the artwork described herein is an original work, produced by the artist exclusively for its owner, and bears the authentic characteristics of the artist.",
    tr: "Bu sertifika, bu belgede tanımlanan eserin, sanatçı tarafından sahibi için özel olarak üretilmiş özgün bir çalışma olduğunu ve sanatçının özgün niteliklerini taşıdığını onaylar.",
  },
  langToggleTr: "TR",
  langToggleEn: "EN",
  artistName: "Melike Sevinc",
  artistUrl: "www.melikesevinc.com",
  artistRole: "Artist · Sanatçı",
  tr: DEFAULT_TR,
  en: DEFAULT_EN,
  fields: DEFAULT_FIELDS,
};

function mergeLangBlock(def: LangBlock, raw: unknown): LangBlock {
  if (!raw || typeof raw !== "object") return { ...def };
  const o = raw as Record<string, unknown>;
  const out = { ...def };
  for (const k of Object.keys(def) as (keyof LangBlock)[]) {
    const v = o[k];
    if (typeof v === "string" && v.trim() !== "") (out as Record<string, string>)[k] = v;
  }
  return out;
}

function mergeBilingual(def: BilingualField, raw: unknown): BilingualField {
  if (!raw || typeof raw !== "object") return { ...def };
  const o = raw as Record<string, unknown>;
  return {
    tr: typeof o.tr === "string" && o.tr.trim() ? o.tr.trim() : def.tr,
    en: typeof o.en === "string" && o.en.trim() ? o.en.trim() : def.en,
  };
}

function mergeFields(def: FieldsBlock, raw: unknown): FieldsBlock {
  if (!raw || typeof raw !== "object") return { ...def };
  const o = raw as Record<string, unknown>;
  const keys = Object.keys(def) as (keyof FieldsBlock)[];
  const out = { ...def };
  for (const k of keys) {
    (out as Record<string, BilingualField>)[k] = mergeBilingual(def[k], o[k]);
  }
  return out;
}

/** vadmin formunda sırayla gösterim için */
export const LANG_BLOCK_KEYS = [
  "intro",
  "webpinPlaceholder",
  "verify",
  "verifying",
  "errEmptyPin",
  "err404",
  "errGeneric",
  "errNetwork",
  "errChangeShort",
  "errChangeSend",
  "errChangeFail",
  "errChangeStorage",
  "send",
  "sending",
  "cancel",
  "changeRequest",
  "yourRequest",
  "changePlaceholder",
  "noContact",
  "dash",
  "footer",
  "authenticity",
  "titleMain",
  "coaLineEn",
  "coaLineTr",
  "successTr",
  "successEn",
] as const satisfies readonly (keyof LangBlock)[];

export const FIELDS_BLOCK_KEYS = [
  "record",
  "serial",
  "media",
  "title",
  "date",
  "ownerName",
  "ownerRole",
  "contact",
  "prev",
  "prevNameCol",
  "prevDatesCol",
  "webpin",
] as const satisfies readonly (keyof FieldsBlock)[];

export function mergeVerifyPageCopy(raw: unknown): VerifyPageCopy {
  const d = DEFAULT_VERIFY_PAGE_COPY;
  if (!raw || typeof raw !== "object") {
    return {
      declaration: { ...d.declaration },
      langToggleTr: d.langToggleTr,
      langToggleEn: d.langToggleEn,
      artistName: d.artistName,
      artistUrl: d.artistUrl,
      artistRole: d.artistRole,
      tr: { ...d.tr },
      en: { ...d.en },
      fields: JSON.parse(JSON.stringify(d.fields)) as FieldsBlock,
    };
  }
  const o = raw as Record<string, unknown>;
  const decl = o.declaration && typeof o.declaration === "object" ? (o.declaration as Record<string, unknown>) : {};
  const declaration: VerifyDeclaration = {
    en: typeof decl.en === "string" && decl.en.trim() ? decl.en.trim() : d.declaration.en,
    tr: typeof decl.tr === "string" && decl.tr.trim() ? decl.tr.trim() : d.declaration.tr,
  };
  return {
    declaration,
    langToggleTr:
      typeof o.langToggleTr === "string" && o.langToggleTr.trim() ? o.langToggleTr.trim() : d.langToggleTr,
    langToggleEn:
      typeof o.langToggleEn === "string" && o.langToggleEn.trim() ? o.langToggleEn.trim() : d.langToggleEn,
    artistName: typeof o.artistName === "string" && o.artistName.trim() ? o.artistName.trim() : d.artistName,
    artistUrl: typeof o.artistUrl === "string" && o.artistUrl.trim() ? o.artistUrl.trim() : d.artistUrl,
    artistRole: typeof o.artistRole === "string" && o.artistRole.trim() ? o.artistRole.trim() : d.artistRole,
    tr: mergeLangBlock(d.tr, o.tr),
    en: mergeLangBlock(d.en, o.en),
    fields: mergeFields(d.fields, o.fields),
  };
}
