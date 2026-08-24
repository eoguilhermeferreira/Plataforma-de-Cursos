"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { IconLixeira } from "@/components/icons";

export function ExcluirCursoButton({
  cursoId,
  titulo,
}: {
  cursoId: string;
  titulo: string;
}) {
  const router = useRouter();
  const [excluindo, setExcluindo] = useState(false);

  async function handleClick(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();

    if (
      !window.confirm(
        `Excluir o curso "${titulo}"? Isso apaga as aulas, a prova e os resultados dos alunos. Essa ação não pode ser desfeita.`,
      )
    ) {
      return;
    }

    setExcluindo(true);
    const res = await fetch(`/api/admin/cursos/${cursoId}`, { method: "DELETE" });
    if (!res.ok) {
      const data = await res.json().catch(() => null);
      window.alert(data?.error ?? "Não foi possível excluir o curso.");
      setExcluindo(false);
      return;
    }
    router.refresh();
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={excluindo}
      aria-label={`Excluir curso ${titulo}`}
      title="Excluir curso"
      className="flex h-8 w-8 items-center justify-center rounded-lg text-red-600 hover:bg-red-50 disabled:opacity-50"
    >
      <IconLixeira className="h-4 w-4" />
    </button>
  );
}
