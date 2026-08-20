"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function ReenviarConviteButton({ email }: { email: string }) {
  const router = useRouter();
  const [carregando, setCarregando] = useState(false);
  const [link, setLink] = useState<string | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [copiado, setCopiado] = useState(false);

  async function handleClick() {
    setCarregando(true);
    setErro(null);
    try {
      const res = await fetch("/api/admin/convites", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (!res.ok) {
        setErro(data.error ?? "Não foi possível reenviar.");
        return;
      }
      setLink(data.link);
      router.refresh();
    } catch {
      setErro("Não foi possível reenviar.");
    } finally {
      setCarregando(false);
    }
  }

  async function copiar() {
    if (!link) return;
    await navigator.clipboard.writeText(link);
    setCopiado(true);
  }

  if (link) {
    return (
      <button
        onClick={copiar}
        className="text-xs font-medium text-blue-700 underline"
      >
        {copiado ? "Copiado!" : "Copiar novo link"}
      </button>
    );
  }

  return (
    <button
      onClick={handleClick}
      disabled={carregando}
      className="text-xs font-medium text-gray-700 underline disabled:opacity-50"
    >
      {carregando ? "Reenviando..." : erro ? "Erro, tentar de novo" : "Reenviar"}
    </button>
  );
}
