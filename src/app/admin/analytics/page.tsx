import { AnalyticsAdmin } from "@/components/admin/analytics-admin";
import { requirePermissionPageAccess } from "@/lib/access-control";

export default async function AdminAnalyticsPage() {
  await requirePermissionPageAccess("analytics.view");
  return <AnalyticsAdmin />;
}
