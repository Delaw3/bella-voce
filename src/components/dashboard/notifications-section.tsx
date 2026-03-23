import { NotificationItem } from "@/types/dashboard";
import Link from "next/link";

type NotificationsSectionProps = {
  notifications: NotificationItem[];
};

export function NotificationsSection({ notifications }: NotificationsSectionProps) {
  return (
    <section className="rounded-2xl border border-[#9FD6D5]/70 bg-white p-4 shadow-[0_10px_24px_rgba(31,41,55,0.06)] sm:p-5">
      <div className="flex items-center justify-between">
        <h3 className="font-display text-2xl text-[#1F2937]">Notifications</h3>
        <span className="rounded-full bg-[#EAF9F8] px-3 py-1 text-xs font-semibold text-[#1E8C8A]">
          Recent
        </span>
      </div>

      {notifications.length === 0 ? (
        <p className="mt-4 rounded-xl border border-dashed border-slate-200 bg-slate-50 px-4 py-6 text-sm text-slate-500">
          No notifications yet.
        </p>
      ) : (
        <ul className="mt-4 space-y-3">
          {notifications.map((item) => (
            <li key={item.id}>
              {item.route ? (
                <Link href={item.route} className="block rounded-xl border border-slate-100 bg-slate-50 px-3 py-3 transition hover:bg-white">
                  <p className="text-sm font-semibold text-[#1F2937]">{item.title}</p>
                  <p className="mt-1 text-sm text-slate-600">{item.message}</p>
                </Link>
              ) : (
                <div className="rounded-xl border border-slate-100 bg-slate-50 px-3 py-3">
                  <p className="text-sm font-semibold text-[#1F2937]">{item.title}</p>
                  <p className="mt-1 text-sm text-slate-600">{item.message}</p>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
