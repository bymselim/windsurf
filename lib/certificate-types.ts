/** Önceki sahip kaydı (tarihler serbest metin veya YYYY-MM-DD). */
export interface CertificateOwnership {
  ownerName: string;
  fromDate?: string;
  toDate?: string;
}

/** Sertifika / doğrulama kaydı (webpin ile halka açık sorgu). */
export interface CertificateRecord {
  id: string;
  /** Sertifikadaki webpin; benzersiz, büyük harf ve boşluksuz saklanır. */
  webpin: string;
  serialNumber: string;
  artworkTitle: string;
  artworkDate: string;
  ownerName: string;
  contactNotes: string;
  mediaUrls: string[];
  previousOwners: CertificateOwnership[];
  createdAt: string;
  updatedAt: string;
}

export interface VerifyChangeRequest {
  id: string;
  webpin: string;
  message: string;
  createdAt: string;
  /** Sunucu tarafından doldurulabilir (log). */
  clientIp?: string;
}
