"use client";

import { hasPermissionValue, PermissionKey, UserRole } from "@/lib/user-config";
import { createContext, ReactNode, useContext } from "react";

type AdminSessionValue = {
  role: UserRole;
  permissions: string[];
  firstName?: string;
};

const AdminSessionContext = createContext<AdminSessionValue | null>(null);

export function AdminSessionProvider({
  value,
  children,
}: {
  value: AdminSessionValue;
  children: ReactNode;
}) {
  return <AdminSessionContext.Provider value={value}>{children}</AdminSessionContext.Provider>;
}

export function useAdminSession() {
  const value = useContext(AdminSessionContext);
  if (!value) {
    throw new Error("useAdminSession must be used within AdminSessionProvider.");
  }
  return value;
}

export function useCan(permission: PermissionKey) {
  const session = useAdminSession();
  return hasPermissionValue(session.role, session.permissions, permission);
}
