import { redirect } from "next/navigation";

import type { AuthRole } from "@/lib/auth/roles";
import { getDashboardPathByRole } from "@/lib/auth/roles";
import { getCurrentAuthState } from "@/lib/auth/current-user";

export async function requireAuth() {
  const authState = await getCurrentAuthState();

  if (!authState.isAuthenticated) {
    redirect("/login");
  }

  if (!authState.profile) {
    redirect("/auth-check");
  }

  return authState;
}

export async function requireRole(allowedRoles: AuthRole[]) {
  const authState = await requireAuth();
  const currentRole = authState.profile?.role;

  if (!currentRole) {
    redirect("/auth-check");
  }

  if (!allowedRoles.includes(currentRole)) {
    redirect(getDashboardPathByRole(currentRole));
  }

  return authState;
}