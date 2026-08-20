"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { AlunoRow } from "@/lib/admin-users";

type AlunoComConta = AlunoRow & { userId: string };

type Matricula = {
  id: string;
  user_id: string;
  status: string;
  origem: string;
  criado_em: string;
};

const STATUS_LABEL: Record<string, string> = {
  ativa: "Ativa",
  revogada: "Revogada",
};

const STATUS_CLASS: Record<string, string> = {
  ativa: "bg-green-100 text-green-800",
  revogada: "bg-red-100 text-red-800",
};

export function MatricularAluno({
  cursoId,
  alunos,
  matriculas,
}: {
  cursoId: string;
  alunos: AlunoComConta[];
  matriculas: Matricula[];
}) {
  const router = useRouter();
  const [alunoSelecionado, setAlunoSelecionado] = useState("");
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  const alunoPorId = new Map(alunos.map((a) => [a.userId, a]));
  const matriculadosAtivos = new Set(
    matriculas.filter((m) => m.status === "ativa").map((m) => m.user_id),
  );
  const disponiveis = alunos.filter((a) => !matriculadosAtivos.has(a.userId));

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!alunoSelecionado) return;
    setCarregando(true);
    setErro(null);
    try {
      const res = await fetch("/api/admin/matriculas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_id: alunoSelecionado, course_id: cursoId }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        setErro(data?.error ?? "Não foi possível matricular o aluno.");
        return;
      }
      setAlunoSelecionado("");
      router.refresh();
    } catch {
      setErro("Não foi possível matricular o aluno.");
    } finally {
      setCarregando(false);
    }
  }

  return (
    <section className="rounded-lg border border-gray-200 bg-white p-4">
      <h2 className="text-base font-semibold text-gray-900">Alunos matriculados</h2>

      <ul className="mt-3 divide-y divide-gray-200">
        {matriculas.map((matricula) => {
          const aluno = alunoPorId.get(matricula.user_id);
          return (
            <li
              key={matricula.id}
              className="flex items-center justify-between gap-2 py-2"
            >
              <span className="text-sm text-gray-900">
                {aluno?.nome || aluno?.email || matricula.user_id}
              </span>
              <span
                className={`rounded-full px-2 py-1 text-xs font-medium ${STATUS_CLASS[matricula.status]}`}
              >
                {STATUS_LABEL[matricula.status] ?? matricula.status}
              </span>
            </li>
          );
        })}

        {matriculas.length === 0 && (
          <li className="py-2 text-sm text-gray-500">Nenhum aluno matriculado.</li>
        )}
      </ul>

      <form onSubmit={handleSubmit} className="mt-4 flex flex-col gap-2 sm:flex-row">
        <select
          value={alunoSelecionado}
          onChange={(e) => setAlunoSelecionado(e.target.value)}
          className="flex-1 rounded-lg border border-gray-300 px-3 py-3 text-sm focus:border-gray-900 focus:outline-none"
        >
          <option value="">Selecione um aluno</option>
          {disponiveis.map((aluno) => (
            <option key={aluno.userId} value={aluno.userId}>
              {aluno.nome || aluno.email}
            </option>
          ))}
        </select>
        <button
          type="submit"
          disabled={!alunoSelecionado || carregando}
          className="rounded-lg bg-gray-900 px-4 py-3 text-sm font-medium text-white disabled:opacity-50"
        >
          {carregando ? "Matriculando..." : "Matricular"}
        </button>
      </form>

      {erro && <p className="mt-2 text-sm text-red-600">{erro}</p>}
    </section>
  );
}
