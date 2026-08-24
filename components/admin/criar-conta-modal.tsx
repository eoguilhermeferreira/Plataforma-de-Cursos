"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function CriarContaModal() {
  const router = useRouter();
  const [aberto, setAberto] = useState(false);
  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [sucesso, setSucesso] = useState(false);

  function fechar() {
    setAberto(false);
    setNome("");
    setEmail("");
    setSenha("");
    setErro(null);
    setSucesso(false);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setCarregando(true);
    setErro(null);
    try {
      const res = await fetch("/api/admin/criar-conta", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nome, email, senha }),
      });
      const data = await res.json();
      if (!res.ok) {
        setErro(data.error ?? "Não foi possível criar a conta.");
        return;
      }
      setSucesso(true);
      router.refresh();
    } catch {
      setErro("Não foi possível criar a conta.");
    } finally {
      setCarregando(false);
    }
  }

  return (
    <>
      <button
        onClick={() => setAberto(true)}
        className="rounded-lg border border-[var(--color-royal)] px-4 py-2 text-sm font-medium text-[var(--color-royal)] hover:bg-[var(--color-royal-soft)]"
      >
        Criar conta direta
      </button>

      {aberto && (
        <div className="fixed inset-0 z-20 flex items-end justify-center bg-black/40 sm:items-center">
          <div className="w-full max-w-sm rounded-t-xl bg-white p-6 sm:rounded-xl">
            <h2 className="text-lg font-semibold text-[var(--color-ink)]">
              Criar conta direta
            </h2>

            {!sucesso ? (
              <form onSubmit={handleSubmit} className="mt-4 space-y-4">
                <p className="text-xs text-[var(--color-ink-soft)]">
                  Cria a conta na hora, sem link — combine o email e a senha
                  direto com o cliente.
                </p>

                <div>
                  <label
                    htmlFor="nome-conta"
                    className="mb-1 block text-sm font-medium text-[var(--color-ink)]"
                  >
                    Nome
                  </label>
                  <input
                    id="nome-conta"
                    type="text"
                    value={nome}
                    onChange={(e) => setNome(e.target.value)}
                    className="w-full rounded-lg border border-[var(--color-line)] px-4 py-3 text-base focus:border-[var(--color-royal)] focus:outline-none"
                  />
                </div>

                <div>
                  <label
                    htmlFor="email-conta"
                    className="mb-1 block text-sm font-medium text-[var(--color-ink)]"
                  >
                    Email
                  </label>
                  <input
                    id="email-conta"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="w-full rounded-lg border border-[var(--color-line)] px-4 py-3 text-base focus:border-[var(--color-royal)] focus:outline-none"
                  />
                </div>

                <div>
                  <label
                    htmlFor="senha-conta"
                    className="mb-1 block text-sm font-medium text-[var(--color-ink)]"
                  >
                    Senha
                  </label>
                  <input
                    id="senha-conta"
                    type="text"
                    value={senha}
                    onChange={(e) => setSenha(e.target.value)}
                    required
                    minLength={8}
                    className="w-full rounded-lg border border-[var(--color-line)] px-4 py-3 text-base focus:border-[var(--color-royal)] focus:outline-none"
                  />
                  <p className="mt-1 text-xs text-[var(--color-ink-soft)]">
                    Mínimo de 8 caracteres.
                  </p>
                </div>

                {erro && <p className="text-sm text-red-600">{erro}</p>}

                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={fechar}
                    className="flex-1 rounded-lg border border-[var(--color-line)] px-4 py-3 text-sm font-medium text-[var(--color-ink)]"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={carregando}
                    className="flex-1 rounded-lg bg-[var(--color-royal)] px-4 py-3 text-sm font-medium text-white hover:bg-[var(--color-royal-dark)] disabled:opacity-50"
                  >
                    {carregando ? "Criando..." : "Criar conta"}
                  </button>
                </div>
              </form>
            ) : (
              <div className="mt-4 space-y-4">
                <p className="text-sm text-[var(--color-ink-soft)]">
                  Conta criada. Passe o email e a senha pro cliente.
                </p>
                <div className="rounded-lg bg-gray-100 p-3 text-sm text-gray-800">
                  <p>
                    <span className="text-[var(--color-ink-soft)]">Email:</span> {email}
                  </p>
                  <p>
                    <span className="text-[var(--color-ink-soft)]">Senha:</span> {senha}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={fechar}
                  className="w-full rounded-lg bg-[var(--color-royal)] px-4 py-3 text-sm font-medium text-white"
                >
                  Fechar
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
