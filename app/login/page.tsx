"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [carregando, setCarregando] = useState(false);
  const [modoReenvio, setModoReenvio] = useState(false);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setErro(null);
    setCarregando(true);

    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password: senha,
    });

    setCarregando(false);
    if (error) {
      setErro("Email ou senha inválidos.");
      return;
    }

    router.push("/");
    router.refresh();
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-sm rounded-xl bg-white p-6 shadow-sm">
        <h1 className="mb-6 text-center text-xl font-semibold text-gray-900">
          Entrar
        </h1>

        {!modoReenvio ? (
          <>
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label htmlFor="email" className="mb-1 block text-sm font-medium text-gray-700">
                  Email
                </label>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoComplete="email"
                  className="w-full rounded-lg border border-gray-300 px-4 py-3 text-base focus:border-gray-900 focus:outline-none"
                />
              </div>

              <div>
                <label htmlFor="senha" className="mb-1 block text-sm font-medium text-gray-700">
                  Senha
                </label>
                <input
                  id="senha"
                  type="password"
                  value={senha}
                  onChange={(e) => setSenha(e.target.value)}
                  required
                  autoComplete="current-password"
                  className="w-full rounded-lg border border-gray-300 px-4 py-3 text-base focus:border-gray-900 focus:outline-none"
                />
              </div>

              {erro && <p className="text-sm text-red-600">{erro}</p>}

              <button
                type="submit"
                disabled={carregando}
                className="w-full rounded-lg bg-gray-900 px-4 py-3 text-base font-medium text-white disabled:opacity-50"
              >
                {carregando ? "Entrando..." : "Entrar"}
              </button>
            </form>

            <button
              type="button"
              onClick={() => setModoReenvio(true)}
              className="mt-4 w-full text-center text-sm text-gray-600 underline"
            >
              Esqueci a senha ou não recebi meu acesso
            </button>
          </>
        ) : (
          <ReenviarAcesso onVoltar={() => setModoReenvio(false)} />
        )}
      </div>
    </main>
  );
}

function ReenviarAcesso({ onVoltar }: { onVoltar: () => void }) {
  const [email, setEmail] = useState("");
  const [mensagem, setMensagem] = useState<string | null>(null);
  const [carregando, setCarregando] = useState(false);

  async function handleReenviar(e: React.FormEvent) {
    e.preventDefault();
    setCarregando(true);
    setMensagem(null);

    try {
      const supabase = createClient();
      // Também dispara a recuperação de senha padrão do Supabase, para
      // quem já tem conta e só esqueceu a senha.
      await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/login`,
      });

      const res = await fetch("/api/reenviar-acesso", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      setMensagem(data.message);
    } catch {
      setMensagem("Se este email tiver um acesso pendente, enviamos um novo link.");
    } finally {
      setCarregando(false);
    }
  }

  return (
    <form onSubmit={handleReenviar} className="space-y-4">
      <p className="text-sm text-gray-600">
        Informe seu email. Se houver acesso pendente ou conta cadastrada,
        enviaremos as instruções.
      </p>

      <div>
        <label htmlFor="email-reenvio" className="mb-1 block text-sm font-medium text-gray-700">
          Email
        </label>
        <input
          id="email-reenvio"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          className="w-full rounded-lg border border-gray-300 px-4 py-3 text-base focus:border-gray-900 focus:outline-none"
        />
      </div>

      {mensagem && <p className="text-sm text-green-700">{mensagem}</p>}

      <button
        type="submit"
        disabled={carregando}
        className="w-full rounded-lg bg-gray-900 px-4 py-3 text-base font-medium text-white disabled:opacity-50"
      >
        {carregando ? "Enviando..." : "Enviar"}
      </button>

      <button
        type="button"
        onClick={onVoltar}
        className="w-full text-center text-sm text-gray-600 underline"
      >
        Voltar para o login
      </button>
    </form>
  );
}
