"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { IconInicio, IconProva, IconConta, IconLivro, IconSair } from "@/components/icons";
import { LogoutButton } from "@/components/logout-button";
import { ThemeToggle } from "@/components/theme-toggle";

const ITENS = [
  { href: "/", label: "Meus cursos", Icon: IconInicio },
  { href: "/provas", label: "Provas", Icon: IconProva },
  { href: "/conta", label: "Conta", Icon: IconConta },
];

export function Sidebar({
  nome,
  email,
}: {
  nome: string | null;
  email: string | null;
}) {
  const pathname = usePathname();

  return (
    <aside className="fixed inset-y-0 left-0 z-20 hidden w-64 flex-col bg-[var(--color-royal-deep)] px-4 py-6 md:flex">
      <div className="flex items-center gap-2 px-2">
        <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-[var(--color-royal)] text-white">
          <IconLivro className="h-5 w-5" />
        </span>
        <span className="font-display text-base font-semibold text-white">
          Plataforma
        </span>
      </div>

      <nav className="mt-8 flex-1">
        <ul className="space-y-1">
          {ITENS.map(({ href, label, Icon }) => {
            const ativo = href === "/" ? pathname === "/" : pathname.startsWith(href);
            return (
              <li key={href}>
                <Link
                  href={href}
                  className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                    ativo
                      ? "bg-[var(--color-royal)] text-white"
                      : "text-[#B9C2F0] hover:bg-white/5 hover:text-white"
                  }`}
                >
                  <Icon className="h-5 w-5 shrink-0" />
                  {label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      <div className="space-y-3 border-t border-white/10 pt-4">
        <div className="flex items-center gap-3 rounded-lg px-2 py-1.5">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[var(--color-royal)] text-sm font-semibold text-white">
            {(nome ?? email ?? "?").charAt(0).toUpperCase()}
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-white">
              {nome || email}
            </p>
            <p className="truncate text-xs text-[#8891C7]">Aluno</p>
          </div>
          <ThemeToggle className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-[#B9C2F0] hover:bg-white/10 hover:text-white" />
        </div>
        <div className="px-2">
          <LogoutButton
            icon={<IconSair className="h-4 w-4" />}
            className="flex w-full items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm font-medium text-white hover:bg-white/10"
          />
        </div>
      </div>
    </aside>
  );
}
