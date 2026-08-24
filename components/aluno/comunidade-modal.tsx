"use client";

import { useState } from "react";
import {
  COMUNIDADE_FOTO_PATH,
  COMUNIDADE_NOME,
  WHATSAPP_COMUNIDADE_URL,
} from "@/lib/contato";
import { getCapaUrl } from "@/lib/capas";
import { IconComunidade, IconWhatsapp } from "@/components/icons";

export function ComunidadeModal({ className }: { className?: string }) {
  const [aberto, setAberto] = useState(false);
  const [fotoOk, setFotoOk] = useState(true);
  const fotoUrl = getCapaUrl(COMUNIDADE_FOTO_PATH);

  return (
    <>
      <button type="button" onClick={() => setAberto(true)} className={className}>
        <IconComunidade className="h-5 w-5 shrink-0" />
        Comunidade
      </button>

      {aberto && (
        <div className="fixed inset-0 z-20 flex items-end justify-center bg-black/40 sm:items-center">
          <div className="w-full max-w-sm rounded-t-xl bg-[var(--color-paper)] p-6 text-center sm:rounded-xl">
            <div className="flex flex-col items-center">
              {fotoOk && fotoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={fotoUrl}
                  alt=""
                  onError={() => setFotoOk(false)}
                  className="h-20 w-20 rounded-full object-cover"
                />
              ) : (
                <span className="flex h-20 w-20 items-center justify-center rounded-full bg-[var(--color-royal-soft)] text-[var(--color-royal)]">
                  <IconComunidade className="h-8 w-8" />
                </span>
              )}
              <p className="mt-2 text-sm font-medium text-[var(--color-ink)]">
                {COMUNIDADE_NOME}
              </p>
            </div>

            <h2 className="mt-4 text-lg font-semibold text-[var(--color-ink)]">
              Quer entrar na comunidade da plataforma?
            </h2>
            <p className="mt-1 text-sm text-[var(--color-ink-soft)]">
              Lá você troca ideia com outros alunos, tira dúvidas sobre o
              material e fica por dentro dos avisos, tudo direto no
              WhatsApp.
            </p>

            <a
              href={WHATSAPP_COMUNIDADE_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-4 flex items-center justify-center gap-2 rounded-lg bg-[var(--color-royal)] px-4 py-3 text-sm font-medium text-white hover:bg-[var(--color-royal-dark)]"
            >
              <IconWhatsapp className="h-4 w-4" />
              Entrar no grupo
            </a>

            <button
              type="button"
              onClick={() => setAberto(false)}
              className="mt-2 w-full rounded-lg border border-[var(--color-line)] px-4 py-3 text-sm font-medium text-[var(--color-ink)]"
            >
              Agora não
            </button>
          </div>
        </div>
      )}
    </>
  );
}
