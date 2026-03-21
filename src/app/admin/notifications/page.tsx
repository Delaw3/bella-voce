import { NotificationsAdmin } from "@/components/admin/notifications-admin";
import { requirePermissionPageAccess } from "@/lib/access-control";

export default async function AdminNotificationsPage() {
  await requirePermissionPageAccess("notifications.view");
  return <NotificationsAdmin />;
}
