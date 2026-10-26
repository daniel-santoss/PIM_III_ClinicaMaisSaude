interface PaginacaoProps {
  pagina: number;
  totalPaginas: number;
  onMudar: (pagina: number) => void;
}

// Anterior / números / Próximo. Mostra a primeira, a última e as vizinhas da atual; o resto vira "...".
export default function Paginacao({ pagina, totalPaginas, onMudar }: PaginacaoProps) {
  if (totalPaginas <= 1) return null;

  const botao = "h-8 px-3 text-[13px] font-medium border border-line rounded-md text-body bg-white disabled:opacity-50 disabled:cursor-not-allowed hover:bg-canvas transition-colors";

  return (
    <nav className="flex items-center gap-2" aria-label="Paginação">
      <button onClick={() => onMudar(Math.max(1, pagina - 1))} disabled={pagina === 1} className={botao}>
        Anterior
      </button>

      <div className="flex items-center gap-1">
        {Array.from({ length: totalPaginas }).map((_, i) => {
          const n = i + 1;
          if (n === 1 || n === totalPaginas || (n >= pagina - 1 && n <= pagina + 1)) {
            return (
              <button
                key={n}
                onClick={() => onMudar(n)}
                aria-current={pagina === n ? "page" : undefined}
                className={`w-8 h-8 flex items-center justify-center text-xs font-semibold rounded-md transition-colors border ${
                  pagina === n ? "bg-brand-600 text-white border-brand-600" : "bg-white text-body border-line hover:bg-canvas"
                }`}
              >
                {n}
              </button>
            );
          }
          if (n === pagina - 2 || n === pagina + 2) {
            return <span key={n} className="text-muted text-xs px-1">...</span>;
          }
          return null;
        })}
      </div>

      <button onClick={() => onMudar(Math.min(totalPaginas, pagina + 1))} disabled={pagina === totalPaginas} className={botao}>
        Próximo
      </button>
    </nav>
  );
}
