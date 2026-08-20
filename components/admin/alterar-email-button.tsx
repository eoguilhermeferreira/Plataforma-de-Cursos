"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function AlterarEmailButton({
  userId,
  emailAtual,
}: {
  userId: string;
  emailAtual: string;
}) {
  const router = useRouter();
  const [editando, setEditando] = useState(false);
  const [novoEmail, setNovoEmail] = useState(emailAtual);
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  async function handleSalvar() {
    setCarregando(true);
    setErro(null);
    try {
      const res = await fetch(`/api/admin/usuarios/${userId}/email`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: novoEmail }),
      });
      const data = await res.json();
      if (!res.ok) {
        setErro(data.error ?? "Não foi possível alterar.");
        return;
      }
      setEditando(false);
      router.refresh();
    } catch {
      setErro("Não foi possível alterar.");
    } finally {
      setCarregando(false);
    }
  }

  if (!editando) {
    return (
      <button
        onClick={() => setEditando(true)}
        className="text-xs font-medium text-gray-700 underline"
      >
        Alterar email
      </button>
    );
  }

  return (
    <div className="flex flex-col gap-1">
      <input
        type="email"
        value={novoEmail}
        onChange={(e) => setNovoEmail(e.target.value)}
        className="rounded border border-gray-300 px-2 py-1 text-xs"
      />
      {erro && <p className="text-xs text-red-600">{erro}</p>}
      <div className="flex gap-2">
        <button
          onClick={handleSalvar}
          disabled={carregando}
          className="text-xs font-medium text-blue-700 underline disabled:opacity-50"
        >
          {carregando ? "Salvando..." : "Salvar"}
        </button>
        <button
          onClick={() => {
            setEditando(false);
            setNovoEmail(emailAtual);
            setErro(null);
          }}
          className="text-xs text-gray-500 underline"
        >
          Cancelar
        </button>
      </div>
    </div>
  );
}
