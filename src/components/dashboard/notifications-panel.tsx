import { NotificationItem } from "@/types/dashboard";
import { formatAppDateTime } from "@/lib/utils";

type NotificationsPanelProps = {
  notifications: NotificationItem[];
};

export function NotificationsPanel({ notifications }: NotificationsPanelProps) {
  function getTypeClassName(type: NotificationItem["type"]) {
    if (type === "ALERT") {
      return "bg-red-100 text-red-600";
    }

    if (type === "REMINDER") {
      return "bg-amber-100 text-amber-700";
    }

    return "bg-[#EAF9F8] text-[#1E8C8A]";
  }

  if (notifications.length === 0) {
    return (
      <p className="rounded-xl border border-dashed border-slate-200 bg-slate-50 px-4 py-8 text-center text-sm text-slate-500">
        No notifications yet.
      </p>
    );
  }

  return (
    <ul className="space-y-3">
      {notifications.map((item) => (
        <li key={item.id} className="rounded-xl border border-slate-100 bg-slate-50 px-4 py-3">
          <div className="flex items-center justify-between gap-3">
            <p className="text-sm font-semibold text-[#1F2937]">{item.title}</p>
            <div className="flex items-center gap-2">
              <span className={`rounded-full px-2 py-1 text-[11px] font-semibold ${getTypeClassName(item.type)}`}>
                {item.type}
              </span>
              {!item.isRead ? (
                <span className="rounded-full bg-red-100 px-2 py-1 text-[11px] font-semibold text-red-600">
                  New
                </span>
              ) : null}
            </div>
          </div>
          <p className="mt-1 text-sm text-slate-600">{item.message}</p>
          <p className="mt-2 text-xs text-slate-500">{formatAppDateTime(item.createdAt)}</p>
        </li>
      ))}
    </ul>
  );
}
