import { redirect } from "next/navigation";

export default function WaitlistPage() {
  // Waitlist backend/admin flows remain in place, but the public waitlist page is no longer part of the active app entry flow.
  redirect("/login");
}
