"use client";

import { useState } from "react";
import { CONTATOS_SUPORTE, linkWhatsapp } from "@/lib/contato";
import { IconSuporte, IconWhatsapp } from "@/components/icons";

export function SuporteModal({ className }: { className?: string }) {
  const [aberto, setAberto] = useState(false);

  return (
    <>
      <button type="button" onClick={() => setAberto(true)} className={className}>
        <IconSuporte className="h-5 w-5 shrink-0" />
        Suporte
      </button>

      {aberto && (
        <div className="fixed inset-0 z-20 flex items-end justify-center bg-black/40 sm:items-center">
          <div className="w-full max-w-sm rounded-t-xl bg-[var(--color-paper)] p-6 sm:rounded-xl">
            <h2 className="text-lg font-semibold text-[var(--color-ink)]">
              Fale com a gente
            </h2>
            <p className="mt-1 text-sm text-[var(--color-ink-soft)]">
              Escolha quem você quer chamar no WhatsApp.
            </p>

            <div className="mt-4 space-y-2">
              {CONTATOS_SUPORTE.map((contato) => (
                <a
                  key={contato.telefone}
                  href={linkWhatsapp(contato.telefone)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-3 rounded-lg border border-[var(--color-line)] p-3 text-sm font-medium text-[var(--color-ink)] hover:bg-[var(--color-royal-soft)]"
                >
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-green-100 text-green-700">
                    <IconWhatsapp className="h-5 w-5" />
                  </span>
                  {contato.nome}
                </a>
              ))}
            </div>

            <button
              type="button"
              onClick={() => setAberto(false)}
              className="mt-4 w-full rounded-lg border border-[var(--color-line)] px-4 py-3 text-sm font-medium text-[var(--color-ink)]"
            >
              Fechar
            </button>
          </div>
        </div>
      )}
    </>
  );
}
