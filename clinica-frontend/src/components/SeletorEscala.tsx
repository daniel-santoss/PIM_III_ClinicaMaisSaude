import { Check } from "lucide-react";
import { escalaCod, nomeEscala, quandoTrabalha } from "../constants/escala";

// Escolha da escala 12x36 do profissional (cadastro e edição). Mostra quando cada escala
// trabalha para o admin não precisar calcular a alternância de cabeça.
export default function SeletorEscala({ valor, onMudar }: { valor: number | null; onMudar: (escala: number) => void }) {
  return (
    <div>
      <span className="block text-[13px] font-medium text-body mb-1">Escala de trabalho (12x36) *</span>
      <div className="grid grid-cols-2 gap-2.5" role="radiogroup" aria-label="Escala de trabalho">
        {[escalaCod.escala1, escalaCod.escala2].map((escala) => {
          const ativo = valor === escala;
          return (
            <button
              key={escala}
              type="button"
              role="radio"
              aria-checked={ativo}
              onClick={() => onMudar(escala)}
              className={`h-14 px-3.5 flex items-center justify-between gap-2 rounded-md border text-left transition-colors ${
                ativo ? "border-brand-600 bg-brand-50" : "border-line bg-white hover:bg-canvas"
              }`}
            >
              <span className="flex flex-col">
                <span className={`text-sm font-semibold ${ativo ? "text-brand-600" : "text-ink"}`}>{nomeEscala(escala)}</span>
                <span className="text-xs text-muted">Dia sim, dia não · {quandoTrabalha(escala)}</span>
              </span>
              {ativo && <Check className="w-4 h-4 text-brand-600 shrink-0" />}
            </button>
          );
        })}
      </div>
      <p className="text-xs text-muted mt-1.5">Plantão das 07:00 às 19:00, inclusive nos fins de semana.</p>
    </div>
  );
}
