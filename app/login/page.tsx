"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { IconLivro } from "@/components/icons";

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
    <main className="flex min-h-screen bg-white">
      <div className="hidden w-[42%] flex-col justify-between bg-[var(--color-royal-deep)] p-10 lg:flex">
        <div className="flex items-center gap-2">
          <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-[var(--color-royal)] text-white">
            <IconLivro className="h-5 w-5" />
          </span>
          <span className="font-display text-base font-semibold text-white">
            Plataforma
          </span>
        </div>
        <div>
          <p className="font-display text-3xl font-semibold leading-tight text-white">
            Estude no seu ritmo,
            <br />
            prove o que aprendeu.
          </p>
          <p className="mt-3 max-w-sm text-sm text-[#B9C2F0]">
            Materiais em PDF liberados aula a aula, com prova avaliada ao final
            de cada curso.
          </p>
        </div>
        <p className="text-xs text-[#8891C7]">
          Acesso liberado por convite do administrador.
        </p>
      </div>

      <div className="flex flex-1 items-center justify-center px-4 py-12">
        <div className="w-full max-w-sm">
          <div className="mb-8 flex items-center gap-2 lg:hidden">
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-[var(--color-royal)] text-white">
              <IconLivro className="h-5 w-5" />
            </span>
            <span className="font-display text-base font-semibold text-[var(--color-ink)]">
              Plataforma
            </span>
          </div>

          <h1 className="font-display text-2xl font-semibold text-[var(--color-ink)]">
            Entrar
          </h1>
          <p className="mt-1 text-sm text-[var(--color-ink-soft)]">
            Use o email e a senha que você recebeu.
          </p>

          {!modoReenvio ? (
            <>
              <form onSubmit={handleLogin} className="mt-6 space-y-4">
                <div>
                  <label
                    htmlFor="email"
                    className="mb-1 block text-sm font-medium text-[var(--color-ink)]"
                  >
                    Email
                  </label>
                  <input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    autoComplete="email"
                    className="w-full rounded-lg border border-[var(--color-line)] px-4 py-3 text-base focus:border-[var(--color-royal)] focus:outline-none"
                  />
                </div>

                <div>
                  <label
                    htmlFor="senha"
                    className="mb-1 block text-sm font-medium text-[var(--color-ink)]"
                  >
                    Senha
                  </label>
                  <input
                    id="senha"
                    type="password"
                    value={senha}
                    onChange={(e) => setSenha(e.target.value)}
                    required
                    autoComplete="current-password"
                    className="w-full rounded-lg border border-[var(--color-line)] px-4 py-3 text-base focus:border-[var(--color-royal)] focus:outline-none"
                  />
                </div>

                {erro && <p className="text-sm text-red-600">{erro}</p>}

                <button
                  type="submit"
                  disabled={carregando}
                  className="w-full rounded-lg bg-[var(--color-royal)] px-4 py-3 text-base font-medium text-white transition-colors hover:bg-[var(--color-royal-dark)] disabled:opacity-50"
                >
                  {carregando ? "Entrando..." : "Entrar"}
                </button>
              </form>

              <button
                type="button"
                onClick={() => setModoReenvio(true)}
                className="mt-4 w-full text-center text-sm text-[var(--color-ink-soft)] underline"
              >
                Esqueci a senha ou não recebi meu acesso
              </button>
            </>
          ) : (
            <ReenviarAcesso onVoltar={() => setModoReenvio(false)} />
          )}
        </div>
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
    <form onSubmit={handleReenviar} className="mt-6 space-y-4">
      <p className="text-sm text-[var(--color-ink-soft)]">
        Informe seu email. Se houver acesso pendente ou conta cadastrada,
        enviaremos as instruções.
      </p>

      <div>
        <label
          htmlFor="email-reenvio"
          className="mb-1 block text-sm font-medium text-[var(--color-ink)]"
        >
          Email
        </label>
        <input
          id="email-reenvio"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          className="w-full rounded-lg border border-[var(--color-line)] px-4 py-3 text-base focus:border-[var(--color-royal)] focus:outline-none"
        />
      </div>

      {mensagem && <p className="text-sm text-green-700">{mensagem}</p>}

      <button
        type="submit"
        disabled={carregando}
        className="w-full rounded-lg bg-[var(--color-royal)] px-4 py-3 text-base font-medium text-white transition-colors hover:bg-[var(--color-royal-dark)] disabled:opacity-50"
      >
        {carregando ? "Enviando..." : "Enviar"}
      </button>

      <button
        type="button"
        onClick={onVoltar}
        className="w-full text-center text-sm text-[var(--color-ink-soft)] underline"
      >
        Voltar para o login
      </button>
    </form>
  );
}
