"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export function EditarPerfilForm({ nomeInicial }: { nomeInicial: string }) {
  const router = useRouter();
  const [nome, setNome] = useState(nomeInicial);
  const [salvandoNome, setSalvandoNome] = useState(false);
  const [erroNome, setErroNome] = useState<string | null>(null);
  const [nomeSalvo, setNomeSalvo] = useState(false);

  const [senha, setSenha] = useState("");
  const [confirmacao, setConfirmacao] = useState("");
  const [salvandoSenha, setSalvandoSenha] = useState(false);
  const [erroSenha, setErroSenha] = useState<string | null>(null);
  const [senhaSalva, setSenhaSalva] = useState(false);

  async function salvarNome(e: React.FormEvent) {
    e.preventDefault();
    setErroNome(null);
    setNomeSalvo(false);
    if (!nome.trim()) {
      setErroNome("Informe seu nome.");
      return;
    }
    setSalvandoNome(true);
    try {
      const res = await fetch("/api/conta/perfil", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nome: nome.trim() }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        setErroNome(data?.error ?? "Não foi possível salvar o nome.");
        return;
      }
      setNomeSalvo(true);
      router.refresh();
    } catch {
      setErroNome("Não foi possível salvar o nome.");
    } finally {
      setSalvandoNome(false);
    }
  }

  async function salvarSenha(e: React.FormEvent) {
    e.preventDefault();
    setErroSenha(null);
    setSenhaSalva(false);
    if (senha.length < 8) {
      setErroSenha("A senha deve ter no mínimo 8 caracteres.");
      return;
    }
    if (senha !== confirmacao) {
      setErroSenha("As senhas não conferem.");
      return;
    }
    setSalvandoSenha(true);
    try {
      const supabase = createClient();
      const { error } = await supabase.auth.updateUser({ password: senha });
      if (error) {
        setErroSenha("Não foi possível trocar a senha.");
        return;
      }
      setSenha("");
      setConfirmacao("");
      setSenhaSalva(true);
    } catch {
      setErroSenha("Não foi possível trocar a senha.");
    } finally {
      setSalvandoSenha(false);
    }
  }

  return (
    <>
      <form
        onSubmit={salvarNome}
        className="space-y-2 rounded-xl border border-[var(--color-line)] bg-[var(--color-paper)] p-4"
      >
        <label htmlFor="nome-conta" className="block text-sm text-[var(--color-ink-soft)]">
          Nome
        </label>
        <input
          id="nome-conta"
          type="text"
          value={nome}
          onChange={(e) => {
            setNome(e.target.value);
            setNomeSalvo(false);
          }}
          className="w-full rounded-lg border border-[var(--color-line)] bg-[var(--color-paper)] px-4 py-3 text-base text-[var(--color-ink)] focus:border-[var(--color-royal)] focus:outline-none"
        />
        {erroNome && <p className="text-sm text-red-600">{erroNome}</p>}
        {nomeSalvo && <p className="text-sm text-green-700">Nome salvo.</p>}
        <button
          type="submit"
          disabled={salvandoNome}
          className="rounded-lg bg-[var(--color-royal)] px-4 py-2 text-sm font-medium text-white hover:bg-[var(--color-royal-dark)] disabled:opacity-50"
        >
          {salvandoNome ? "Salvando..." : "Salvar nome"}
        </button>
      </form>

      <form
        onSubmit={salvarSenha}
        className="space-y-2 rounded-xl border border-[var(--color-line)] bg-[var(--color-paper)] p-4"
      >
        <p className="text-sm text-[var(--color-ink-soft)]">Trocar senha</p>

        <label htmlFor="senha-nova" className="sr-only">
          Nova senha
        </label>
        <input
          id="senha-nova"
          type="password"
          placeholder="Nova senha"
          value={senha}
          onChange={(e) => setSenha(e.target.value)}
          minLength={8}
          className="w-full rounded-lg border border-[var(--color-line)] bg-[var(--color-paper)] px-4 py-3 text-base text-[var(--color-ink)] focus:border-[var(--color-royal)] focus:outline-none"
        />

        <label htmlFor="senha-confirmacao" className="sr-only">
          Confirme a nova senha
        </label>
        <input
          id="senha-confirmacao"
          type="password"
          placeholder="Confirme a nova senha"
          value={confirmacao}
          onChange={(e) => setConfirmacao(e.target.value)}
          minLength={8}
          className="w-full rounded-lg border border-[var(--color-line)] bg-[var(--color-paper)] px-4 py-3 text-base text-[var(--color-ink)] focus:border-[var(--color-royal)] focus:outline-none"
        />

        {erroSenha && <p className="text-sm text-red-600">{erroSenha}</p>}
        {senhaSalva && <p className="text-sm text-green-700">Senha atualizada.</p>}

        <button
          type="submit"
          disabled={salvandoSenha}
          className="rounded-lg bg-[var(--color-royal)] px-4 py-2 text-sm font-medium text-white hover:bg-[var(--color-royal-dark)] disabled:opacity-50"
        >
          {salvandoSenha ? "Salvando..." : "Salvar senha"}
        </button>
      </form>
    </>
  );
}
