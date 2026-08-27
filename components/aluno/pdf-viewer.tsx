"use client";

import { useEffect, useRef, useState } from "react";
import { Document, Page, pdfjs } from "react-pdf";

pdfjs.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";

export function PdfViewer({ aulaId }: { aulaId: string }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [largura, setLargura] = useState(0);
  const [numPaginas, setNumPaginas] = useState(0);

  useEffect(() => {
    function medir() {
      if (containerRef.current) {
        setLargura(containerRef.current.clientWidth);
      }
    }
    medir();
    window.addEventListener("resize", medir);
    return () => window.removeEventListener("resize", medir);
  }, []);

  return (
    <div
      ref={containerRef}
      className="mt-4 overflow-hidden rounded-xl border border-[var(--color-line)] bg-[var(--color-royal-soft)]"
    >
      <Document
        file={`/api/aulas/${aulaId}/arquivo`}
        onLoadSuccess={({ numPages }) => setNumPaginas(numPages)}
        loading={
          <p className="p-10 text-center text-sm text-[var(--color-ink-soft)]">
            Carregando material...
          </p>
        }
        error={
          <p className="p-10 text-center text-sm text-red-600">
            Não foi possível carregar o material. Tente recarregar a página.
          </p>
        }
        className="flex flex-col items-center gap-3 p-3"
      >
        {largura > 0 &&
          Array.from({ length: numPaginas }, (_, i) => (
            <Page
              key={i}
              pageNumber={i + 1}
              width={largura - 24}
              renderAnnotationLayer={false}
              renderTextLayer={false}
              className="overflow-hidden rounded-lg shadow-sm"
            />
          ))}
      </Document>
    </div>
  );
}
