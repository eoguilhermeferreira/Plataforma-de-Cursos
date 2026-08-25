"use client";

import Link from "next/link";
import { IconLivro, IconMenu } from "@/components/icons";

export function SidebarRail({ onAbrir }: { onAbrir: () => void }) {
  return (
    <aside className="fixed inset-y-0 left-0 z-20 hidden w-16 flex-col items-center gap-4 bg-[var(--color-royal-deep)] py-6 md:flex">
      <Link
        href="/"
        aria-label="Ir para o início"
        className="flex h-9 w-9 items-center justify-center rounded-lg bg-[var(--color-royal)] text-white"
      >
        <IconLivro className="h-5 w-5" />
      </Link>
      <button
        type="button"
        onClick={onAbrir}
        aria-label="Abrir menu"
        title="Menu"
        className="flex h-9 w-9 items-center justify-center rounded-lg text-[#B9C2F0] hover:bg-white/10 hover:text-white"
      >
        <IconMenu className="h-5 w-5" />
      </button>
    </aside>
  );
}
