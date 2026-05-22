import { redirect } from "next/navigation";

/** Eski adres; gizli rota /ERP kullanılır. */
export default function AdminErpRedirect() {
  redirect("/erp");
}
