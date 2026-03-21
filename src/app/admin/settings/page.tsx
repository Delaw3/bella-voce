import { AccountabilitySettingsAdmin } from "@/components/admin/accountability-settings-admin";
import { requirePermissionPageAccess } from "@/lib/access-control";

export default async function AdminSettingsPage() {
  await requirePermissionPageAccess("settings.view");
  return <AccountabilitySettingsAdmin />;
}
