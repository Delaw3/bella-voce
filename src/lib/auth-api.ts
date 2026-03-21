import { AUTH_COOKIE_NAME, getUserBySessionToken } from "@/lib/auth-session";
import { UserRole } from "@/lib/user-config";
import { cookies } from "next/headers";

export async function requireAuthenticatedUser() {
  const cookieStore = await cookies();
  const token = cookieStore.get(AUTH_COOKIE_NAME)?.value;
  const user = await getUserBySessionToken(token);
  return user;
}

export async function requireUserWithRoles(requiredRoles: UserRole[]) {
  const user = await requireAuthenticatedUser();

  if (!user) {
    return { ok: false as const, status: 401, message: "Unauthorized. Please log in." };
  }

  if (!requiredRoles.includes(user.role as UserRole)) {
    return { ok: false as const, status: 403, message: "Forbidden: insufficient permissions." };
  }

  return { ok: true as const, user };
}
