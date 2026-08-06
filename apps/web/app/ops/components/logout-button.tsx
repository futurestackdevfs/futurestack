'use client';

import { useRouter } from 'next/navigation';
import { clearStaffToken } from "@/app/auth/lib/token-store";

export function OpsLogoutButton() {
  const router = useRouter();

  async function handleLogout() {
    await clearStaffToken();
    await fetch("/api/auth/set-token-staff", { method: "DELETE" });
    router.push("/auth/staff-login");
  }

  return (
    <button
      onClick={handleLogout}
      className="px-4 py-2 rounded-lg bg-red-600 hover:bg-red-700 text-white text-sm font-semibold transition-colors cursor-pointer border-none"
    >
      Logout
    </button>
  );
}
