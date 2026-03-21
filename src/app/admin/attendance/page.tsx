import { AttendanceAdmin } from "@/components/admin/attendance-admin";
import { requireAllPermissionsPageAccess } from "@/lib/access-control";

export default async function AdminAttendancePage() {
  await requireAllPermissionsPageAccess(["attendance.view", "attendance.mark", "excuses.view"]);
  return <AttendanceAdmin />;
}
