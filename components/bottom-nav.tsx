"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { IconPasta, IconProva, IconAnotacao, IconConta } from "@/components/icons";

const ITENS = [
  { href: "/", label: "Materiais", Icon: IconPasta },
  { href: "/provas", label: "Provas", Icon: IconProva },
  { href: "/anotacoes", label: "Notas", Icon: IconAnotacao },
  { href: "/conta", label: "Conta", Icon: IconConta },
];

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed inset-x-0 bottom-0 z-10 border-t border-[var(--color-line)] bg-[var(--color-paper)] pb-[env(safe-area-inset-bottom)] md:hidden">
      <ul className="flex">
        {ITENS.map(({ href, label, Icon }) => {
          const ativo = href === "/" ? pathname === "/" : pathname.startsWith(href);
          return (
            <li key={href} className="flex-1">
              <Link
                href={href}
                className={`flex flex-col items-center gap-1 py-3 text-xs font-medium ${
                  ativo ? "text-[var(--color-royal)]" : "text-[var(--color-ink-soft)]"
                }`}
              >
                <Icon className="h-5 w-5" />
                {label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
