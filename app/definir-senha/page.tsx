"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

export default function DefinirSenhaPage() {
  return (
    <Suspense fallback={null}>
      <DefinirSenhaForm />
    </Suspense>
  );
}

function DefinirSenhaForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token") ?? "";

  const [senha, setSenha] = useState("");
  const [confirmacao, setConfirmacao] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [carregando, setCarregando] = useState(false);

  if (!token) {
    return (
      <CentroTela>
        <p className="text-center text-red-600">
          Link inválido. Peça um novo acesso na tela de login.
        </p>
      </CentroTela>
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErro(null);

    if (senha.length < 8) {
      setErro("A senha deve ter no mínimo 8 caracteres.");
      return;
    }
    if (senha !== confirmacao) {
      setErro("As senhas não conferem.");
      return;
    }

    setCarregando(true);
    try {
      const res = await fetch("/api/definir-senha", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, senha }),
      });
      const data = await res.json();

      if (!res.ok) {
        setErro(data.error ?? "Não foi possível concluir. Tente novamente.");
        return;
      }

      router.push("/");
      router.refresh();
    } catch {
      setErro("Não foi possível concluir. Tente novamente.");
    } finally {
      setCarregando(false);
    }
  }

  return (
    <CentroTela>
      <h1 className="mb-6 text-center font-display text-xl font-semibold text-[var(--color-ink)]">
        Defina sua senha
      </h1>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="senha" className="mb-1 block text-sm font-medium text-[var(--color-ink)]">
            Senha
          </label>
          <input
            id="senha"
            type="password"
            value={senha}
            onChange={(e) => setSenha(e.target.value)}
            minLength={8}
            required
            className="w-full rounded-lg border border-[var(--color-line)] px-4 py-3 text-base focus:border-[var(--color-royal)] focus:outline-none"
          />
        </div>

        <div>
          <label htmlFor="confirmacao" className="mb-1 block text-sm font-medium text-[var(--color-ink)]">
            Confirme a senha
          </label>
          <input
            id="confirmacao"
            type="password"
            value={confirmacao}
            onChange={(e) => setConfirmacao(e.target.value)}
            minLength={8}
            required
            className="w-full rounded-lg border border-[var(--color-line)] px-4 py-3 text-base focus:border-[var(--color-royal)] focus:outline-none"
          />
        </div>

        {erro && <p className="text-sm text-red-600">{erro}</p>}

        <button
          type="submit"
          disabled={carregando}
          className="w-full rounded-lg bg-[var(--color-royal)] px-4 py-3 text-base font-medium text-white hover:bg-[var(--color-royal-dark)] disabled:opacity-50"
        >
          {carregando ? "Salvando..." : "Salvar e entrar"}
        </button>
      </form>
    </CentroTela>
  );
}

function CentroTela({ children }: { children: React.ReactNode }) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-sm rounded-xl bg-white p-6 shadow-sm">
        {children}
      </div>
    </main>
  );
}
