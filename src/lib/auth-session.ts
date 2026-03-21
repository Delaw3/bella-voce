import { connectToDatabase } from "@/lib/mongodb";
import { UserRole } from "@/lib/user-config";
import Session from "@/models/session.model";
import User from "@/models/user.model";
import { createHash, randomBytes } from "crypto";
import mongoose from "mongoose";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

export const AUTH_COOKIE_NAME = "bella_voce_session";
const SESSION_DURATION_MS = 1000 * 60 * 60 * 24 * 7;

function hashSessionToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export async function createSession(userId: string) {
  await connectToDatabase();

  const rawToken = randomBytes(48).toString("hex");
  const tokenHash = hashSessionToken(rawToken);
  const expiresAt = new Date(Date.now() + SESSION_DURATION_MS);
  const actorId = new mongoose.Types.ObjectId(userId);

  await Session.create({
    userId: actorId as never,
    tokenHash,
    expiresAt,
  });

  return { token: rawToken, expiresAt };
}

export function setSessionCookie(response: NextResponse, token: string, expiresAt: Date) {
  response.cookies.set({
    name: AUTH_COOKIE_NAME,
    value: token,
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    expires: expiresAt,
  });
}

export function clearSessionCookie(response: NextResponse) {
  response.cookies.set({
    name: AUTH_COOKIE_NAME,
    value: "",
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    expires: new Date(0),
  });
}

export async function getUserBySessionToken(token?: string) {
  if (!token) return null;

  await connectToDatabase();
  const session = await Session.findOne({ tokenHash: hashSessionToken(token) }).lean();
  if (!session) return null;

  if (new Date(session.expiresAt).getTime() < Date.now()) {
    await Session.deleteOne({ _id: session._id });
    return null;
  }

  const user = await User.findById(session.userId).lean();

  if (!user || user.status !== "ACTIVE") {
    await Session.deleteOne({ _id: session._id });
    return null;
  }

  return user;
}

export async function getAuthenticatedUser() {
  const cookieStore = await cookies();
  const token = cookieStore.get(AUTH_COOKIE_NAME)?.value;
  return getUserBySessionToken(token);
}

export async function checkUserRole(requiredRoles: UserRole[]) {
  const user = await getAuthenticatedUser();

  if (!user) {
    return { ok: false as const, status: 401, message: "Unauthorized. Please log in." };
  }

  if (!requiredRoles.includes(user.role as UserRole)) {
    return { ok: false as const, status: 403, message: "Forbidden: insufficient permissions." };
  }

  return { ok: true as const, user };
}
