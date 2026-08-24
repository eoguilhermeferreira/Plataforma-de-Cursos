"use client";

import { useEffect, useRef, useState } from "react";

type Status = "ocioso" | "salvando" | "salvo" | "erro";

export function AnotacoesEditor({ textoInicial }: { textoInicial: string }) {
  const [texto, setTexto] = useState(textoInicial);
  const [status, setStatus] = useState<Status>("ocioso");
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  function handleChange(valor: string) {
    setTexto(valor);
    setStatus("salvando");
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => salvar(valor), 800);
  }

  async function salvar(valor: string) {
    try {
      const res = await fetch("/api/anotacoes", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ texto: valor }),
      });
      setStatus(res.ok ? "salvo" : "erro");
    } catch {
      setStatus("erro");
    }
  }

  const STATUS_LABEL: Record<Status, string> = {
    ocioso: "",
    salvando: "Salvando...",
    salvo: "Salvo",
    erro: "Não foi possível salvar. Tenta de novo?",
  };

  return (
    <div>
      <textarea
        value={texto}
        onChange={(e) => handleChange(e.target.value)}
        placeholder="Escreva suas anotações aqui — sobre as aulas, dúvidas, o que quiser."
        rows={16}
        className="w-full rounded-xl border border-[var(--color-line)] bg-[var(--color-paper)] p-4 text-sm text-[var(--color-ink)] focus:border-[var(--color-royal)] focus:outline-none"
      />
      <p
        className={`mt-2 text-xs ${
          status === "erro" ? "text-red-600" : "text-[var(--color-ink-soft)]"
        }`}
      >
        {STATUS_LABEL[status]}
      </p>
    </div>
  );
}
