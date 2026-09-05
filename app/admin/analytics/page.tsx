import { redirect } from "next/navigation";

export default function AnalyticsRedirectPage() {
  redirect("/admin/access-logs?tab=analytics");
}
