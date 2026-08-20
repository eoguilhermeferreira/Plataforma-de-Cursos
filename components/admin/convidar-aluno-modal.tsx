"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function ConvidarAlunoModal() {
  const router = useRouter();
  const [aberto, setAberto] = useState(false);
  const [email, setEmail] = useState("");
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [link, setLink] = useState<string | null>(null);
  const [copiado, setCopiado] = useState(false);

  function fechar() {
    setAberto(false);
    setEmail("");
    setErro(null);
    setLink(null);
    setCopiado(false);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
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
        setErro(data.error ?? "Não foi possível criar o convite.");
        return;
      }
      setLink(data.link);
      router.refresh();
    } catch {
      setErro("Não foi possível criar o convite.");
    } finally {
      setCarregando(false);
    }
  }

  async function copiarLink() {
    if (!link) return;
    await navigator.clipboard.writeText(link);
    setCopiado(true);
  }

  return (
    <>
      <button
        onClick={() => setAberto(true)}
        className="rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white"
      >
        Convidar aluno
      </button>

      {aberto && (
        <div className="fixed inset-0 z-20 flex items-end justify-center bg-black/40 sm:items-center">
          <div className="w-full max-w-sm rounded-t-xl bg-white p-6 sm:rounded-xl">
            <h2 className="text-lg font-semibold text-gray-900">
              Convidar aluno
            </h2>

            {!link ? (
              <form onSubmit={handleSubmit} className="mt-4 space-y-4">
                <div>
                  <label
                    htmlFor="email-convite"
                    className="mb-1 block text-sm font-medium text-gray-700"
                  >
                    Email
                  </label>
                  <input
                    id="email-convite"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="w-full rounded-lg border border-gray-300 px-4 py-3 text-base focus:border-gray-900 focus:outline-none"
                  />
                </div>

                {erro && <p className="text-sm text-red-600">{erro}</p>}

                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={fechar}
                    className="flex-1 rounded-lg border border-gray-300 px-4 py-3 text-sm font-medium text-gray-700"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={carregando}
                    className="flex-1 rounded-lg bg-gray-900 px-4 py-3 text-sm font-medium text-white disabled:opacity-50"
                  >
                    {carregando ? "Enviando..." : "Convidar"}
                  </button>
                </div>
              </form>
            ) : (
              <div className="mt-4 space-y-4">
                <p className="text-sm text-gray-600">
                  Convite criado. O envio por email ainda não está integrado
                  nesta fase — copie o link e envie manualmente.
                </p>
                <div className="break-all rounded-lg bg-gray-100 p-3 text-xs text-gray-800">
                  {link}
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={copiarLink}
                    className="flex-1 rounded-lg bg-gray-900 px-4 py-3 text-sm font-medium text-white"
                  >
                    {copiado ? "Copiado!" : "Copiar link"}
                  </button>
                  <button
                    type="button"
                    onClick={fechar}
                    className="flex-1 rounded-lg border border-gray-300 px-4 py-3 text-sm font-medium text-gray-700"
                  >
                    Fechar
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
