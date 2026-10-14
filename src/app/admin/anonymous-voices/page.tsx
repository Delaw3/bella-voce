import { AnonymousVoicesAdmin } from "@/components/admin/anonymous-voices-admin";
import { requirePermissionPageAccess } from "@/lib/access-control";

export const metadata = {
  title: "Anonymous Voices | Bella Voce Admin",
  description: "Schedule submission windows, manage activation, and review anonymous member feedback.",
};

export default async function AdminAnonymousVoicesPage() {
  await requirePermissionPageAccess("anonymous_voices.view");

  return <AnonymousVoicesAdmin />;
}
