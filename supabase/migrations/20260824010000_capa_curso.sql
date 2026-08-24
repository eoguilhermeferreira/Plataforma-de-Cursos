-- Bucket de capa dos cursos. Diferente do bucket "materiais" (PDF privado
-- com watermark), a capa não é sensível — é só a arte exibida na listagem
-- de cursos — então o bucket é público: leitura direto por URL pública,
-- sem signed URL. Só service_role escreve (rota de admin).

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'capas',
  'capas',
  true,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do nothing;
