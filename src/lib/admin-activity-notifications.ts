import { connectToDatabase } from "@/lib/mongodb";
import { notifyManyUsers } from "@/lib/push-notifications";
import { formatNameString } from "@/lib/utils";
import { resolvePermissions, type PermissionKey } from "@/lib/user-config";
import User from "@/models/user.model";

type AdminActivityNotificationParams = {
  actorUserId: string;
  actorName: string;
  event: "payment_submitted" | "complaint_submitted" | "excuse_submitted";
  itemId: string;
};

const EVENT_CONFIG: Record<
  AdminActivityNotificationParams["event"],
  {
    permission: PermissionKey;
    title: string;
    buildMessage: (actorName: string) => string;
    route: string;
    metadataType: "payment" | "complaint" | "excuse";
  }
> = {
  payment_submitted: {
    permission: "payments.approve",
    title: "Payment Submission",
    buildMessage: (actorName) => `New payment submitted by ${actorName}`,
    route: "/admin/payments",
    metadataType: "payment",
  },
  complaint_submitted: {
    permission: "complaints.edit",
    title: "Complaint Submission",
    buildMessage: (actorName) => `New complaint submitted by ${actorName}`,
    route: "/admin/complaints",
    metadataType: "complaint",
  },
  excuse_submitted: {
    permission: "excuses.edit",
    title: "Excuse Submission",
    buildMessage: (actorName) => `New excuse submitted by ${actorName}`,
    route: "/admin/excuses",
    metadataType: "excuse",
  },
};

export async function notifyAdminsOfUserActivity(params: AdminActivityNotificationParams) {
  const config = EVENT_CONFIG[params.event];
  const actorName = formatNameString(params.actorName);

  await connectToDatabase();
  const adminUsers = await User.find({
    role: { $in: ["ADMIN", "SUPER_ADMIN"] },
    status: "ACTIVE",
  })
    .select("_id role permissions")
    .lean();

  const recipientIds = new Set<string>();

  for (const adminUser of adminUsers) {
    if (adminUser.role === "SUPER_ADMIN") {
      recipientIds.add(adminUser._id.toString());
      continue;
    }

    const resolvedPermissions = resolvePermissions(adminUser.role, adminUser.permissions);
    if (resolvedPermissions.includes(config.permission)) {
      recipientIds.add(adminUser._id.toString());
    }
  }

  if (recipientIds.size === 0) {
    return [];
  }

  return notifyManyUsers(
    [...recipientIds].map((recipientId) => ({
      userId: recipientId,
      title: config.title,
      message: config.buildMessage(actorName),
      type: "INFO" as const,
      route: config.route,
      metadata: {
        actorUserId: params.actorUserId,
        itemId: params.itemId,
        itemType: config.metadataType,
      },
      dedupeKey: `admin-activity:${params.event}:${params.itemId}:${recipientId}`,
    })),
  );
}
