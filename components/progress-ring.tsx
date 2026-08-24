export function ProgressRing({ percentual }: { percentual: number }) {
  const raio = 42;
  const circunferencia = 2 * Math.PI * raio;
  const preenchido = (Math.min(100, Math.max(0, percentual)) / 100) * circunferencia;

  return (
    <div className="relative h-32 w-32">
      <svg viewBox="0 0 96 96" className="h-32 w-32 -rotate-90">
        <circle
          cx="48"
          cy="48"
          r={raio}
          fill="none"
          stroke="var(--color-royal-soft)"
          strokeWidth="9"
        />
        <circle
          cx="48"
          cy="48"
          r={raio}
          fill="none"
          stroke="var(--color-royal)"
          strokeWidth="9"
          strokeLinecap="round"
          strokeDasharray={`${preenchido} ${circunferencia}`}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="font-display text-2xl font-semibold text-[var(--color-ink)]">
          {Math.round(percentual)}%
        </span>
        <span className="text-[11px] text-[var(--color-ink-soft)]">Concluído</span>
      </div>
    </div>
  );
}
