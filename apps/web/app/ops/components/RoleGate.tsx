"use client";

import { useEffect, useState } from "react";
import { loadStaffToken } from "@/app/auth/lib/token-store";

const ROLE_PORTALS: Record<string, string> = {
  ADMIN: "/ops/admin",
  SALES: "/ops/sales",
  TRAINER: "/ops/trainer",
  COORDINATOR: "/ops/coordinator",
  SUPPORT: "/ops/support",
  CONTENT_MANAGER: "/ops/content-manager",
};

function decodeJwtRole(t: string): string | undefined {
  try {
    return JSON.parse(atob(t.split(".")[1].replace(/-/g, "+").replace(/_/g, "/"))).role;
  } catch {
    return undefined;
  }
}

/**
 * Client-side portal guard. Reads the current staff token, decodes its role
 * (readable even when the token is expired — expiry/refresh is handled by the
 * existing authApi.me()/opsFetch refresh flows, which we never interfere with),
 * and only renders the portal when the role matches. A mismatched role is
 * bounced to that role's own portal (or the staff login when unknown).
 */
export function RoleGate({
  role,
  children,
}: {
  role: string | string[];
  children: React.ReactNode;
}) {
  const [ok, setOk] = useState(false);
  const allowed = Array.isArray(role) ? role : [role];
  const allowedKey = allowed.join(",");

  useEffect(() => {
    let active = true;
    (async () => {
      const token = await loadStaffToken().catch(() => null);
      if (!token) {
        window.location.href = "/auth/staff-login";
        return;
      }
      const r = decodeJwtRole(token);
      if (!r) {
        window.location.href = "/auth/staff-login";
        return;
      }
      if (!allowed.includes(r)) {
        window.location.href = ROLE_PORTALS[r] ?? "/auth/staff-login";
        return;
      }
      if (active) setOk(true);
    })();
    return () => { active = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allowedKey]);

  if (!ok) return null;
  return <>{children}</>;
}