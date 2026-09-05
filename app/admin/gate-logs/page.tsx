import { redirect } from "next/navigation";

export default function GateLogsRedirectPage() {
  redirect("/admin/access-logs?tab=gate");
}
