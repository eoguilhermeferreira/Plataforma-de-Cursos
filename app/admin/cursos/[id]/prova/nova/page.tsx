import Link from "next/link";
import { ImportarProvaForm } from "@/components/admin/importar-prova-form";

export default async function NovaProvaPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: courseId } = await params;

  return (
    <div>
      <Link
        href={`/admin/cursos/${courseId}`}
        className="text-xs text-gray-500 underline"
      >
        ← Voltar para o curso
      </Link>

      <h1 className="mt-2 text-xl font-semibold text-gray-900">Nova prova</h1>
      <p className="mt-1 text-sm text-gray-500">
        Cole abaixo o texto da prova (questões numeradas, alternativas e o bloco
        GABARITO no final). O sistema interpreta e monta o formulário — nada é
        publicado agora, a próxima tela é de revisão.
      </p>

      <ImportarProvaForm cursoId={courseId} />
    </div>
  );
}
