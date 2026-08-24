"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

const INTERVALO_ENVIO_SEGUNDOS = 30;

function formatarMMSS(totalSegundos: number) {
  const segundos = Math.max(0, Math.ceil(totalSegundos));
  const min = Math.floor(segundos / 60);
  const sec = segundos % 60;
  return `${min}:${sec.toString().padStart(2, "0")}`;
}

export function LeitorAula({
  aulaId,
  tempoMinimoSegundos,
  segundosLidosIniciais,
  concluidaInicialmente,
}: {
  aulaId: string;
  tempoMinimoSegundos: number;
  segundosLidosIniciais: number;
  concluidaInicialmente: boolean;
}) {
  const router = useRouter();
  const [segundosServidor, setSegundosServidor] = useState(segundosLidosIniciais);
  const [segundosPendentes, setSegundosPendentes] = useState(0);
  const [concluida, setConcluida] = useState(concluidaInicialmente);
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  const pendentesRef = useRef(0);
  const concluidaRef = useRef(concluidaInicialmente);
  useEffect(() => {
    concluidaRef.current = concluida;
  }, [concluida]);

  const flush = useCallback(async () => {
    const segundos = pendentesRef.current;
    if (segundos <= 0 || concluidaRef.current) return;

    pendentesRef.current = 0;
    setSegundosPendentes(0);

    try {
      const res = await fetch(`/api/aulas/${aulaId}/progresso`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ segundos }),
      });
      if (res.ok) {
        const data = await res.json();
        setSegundosServidor(data.segundos_lidos);
      }
    } catch {
      // Falha de rede: o tempo fica no próximo heartbeat quando a conexão
      // voltar. Não bloqueia a leitura.
    }
  }, [aulaId]);

  useEffect(() => {
    if (concluida) return;

    let tickCount = 0;
    const interval = setInterval(() => {
      if (document.visibilityState !== "visible") return;

      tickCount += 1;
      pendentesRef.current += 1;
      setSegundosPendentes((s) => s + 1);

      if (tickCount % INTERVALO_ENVIO_SEGUNDOS === 0) {
        flush();
      }
    }, 1000);

    function handleVisibilityChange() {
      if (document.visibilityState === "hidden") {
        flush();
      }
    }
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      clearInterval(interval);
      document.removeEventListener("visibilitychange", handleVisibilityChange);

      const segundos = pendentesRef.current;
      if (segundos > 0 && navigator.sendBeacon) {
        const blob = new Blob([JSON.stringify({ segundos })], {
          type: "application/json",
        });
        navigator.sendBeacon(`/api/aulas/${aulaId}/progresso`, blob);
      }
    };
  }, [aulaId, concluida, flush]);

  const segundosEstimados = segundosServidor + segundosPendentes;
  const restante = tempoMinimoSegundos - segundosEstimados;
  const podeConcluir = restante <= 0;

  async function handleConcluir() {
    await flush();
    setEnviando(true);
    setErro(null);
    try {
      const res = await fetch(`/api/aulas/${aulaId}/concluir`, { method: "POST" });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        setErro(data?.error ?? "Não foi possível concluir a aula.");
        if (typeof data?.segundos_lidos === "number") {
          setSegundosServidor(data.segundos_lidos);
        }
        return;
      }
      setConcluida(true);
      router.refresh();
    } catch {
      setErro("Não foi possível concluir a aula.");
    } finally {
      setEnviando(false);
    }
  }

  return (
    <div className="mt-4">
      <iframe
        src={`/api/aulas/${aulaId}/arquivo`}
        title="Material da aula"
        className="h-[65vh] w-full rounded-xl border border-[var(--color-line)] bg-[var(--color-royal-soft)]"
      />

      <div className="mt-4 flex flex-col gap-3 sm:flex-row">
        <a
          href={`/api/aulas/${aulaId}/arquivo?download=1`}
          className="flex-1 rounded-lg border border-[var(--color-line)] px-4 py-3 text-center text-sm font-medium text-[var(--color-ink)] hover:bg-[var(--color-royal-soft)]"
        >
          Baixar PDF
        </a>

        <button
          type="button"
          onClick={handleConcluir}
          disabled={concluida || !podeConcluir || enviando}
          className="flex-1 rounded-lg bg-[var(--color-royal)] px-4 py-3 text-sm font-medium text-white hover:bg-[var(--color-royal-dark)] disabled:opacity-50 disabled:hover:bg-[var(--color-royal)]"
        >
          {concluida
            ? "Aula concluída"
            : podeConcluir
              ? enviando
                ? "Enviando..."
                : "Marcar como concluída"
              : `Libera em ${formatarMMSS(restante)}`}
        </button>
      </div>

      {erro && <p className="mt-2 text-sm text-red-600">{erro}</p>}
    </div>
  );
}
