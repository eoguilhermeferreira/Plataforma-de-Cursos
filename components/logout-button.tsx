"use client";

import type { ReactNode } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export function LogoutButton({
  className,
  icon,
}: {
  className?: string;
  icon?: ReactNode;
}) {
  const router = useRouter();

  async function handleLogout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <button
      onClick={handleLogout}
      className={
        className ??
        "w-full rounded-lg border border-gray-300 px-4 py-3 text-base font-medium text-gray-900"
      }
    >
      {icon}
      Sair
    </button>
  );
}
