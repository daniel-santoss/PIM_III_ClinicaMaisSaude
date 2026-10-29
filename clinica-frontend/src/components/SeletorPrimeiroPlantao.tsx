import { useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { chaveData, dataDeChave, escalaDoDia, nomeEscala } from "../constants/escala";

const NOMES_MES = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];
const DIAS_SEMANA = ["D", "S", "T", "Q", "Q", "S", "S"];

// Escolha do primeiro plantão do profissional (cadastro e edição). O dia escolhido define a
// escala 12x36; o calendário destaca os plantões seguintes para o admin conferir se a pessoa
// pode trabalhar neles.
export default function SeletorPrimeiroPlantao({ valor, onMudar }: { valor: string | null; onMudar: (dia: string) => void }) {
  const base = valor ? dataDeChave(valor) : new Date();
  const [mes, setMes] = useState(new Date(base.getFullYear(), base.getMonth(), 1));

  const selecionado = valor ? dataDeChave(valor) : null;
  const escala = selecionado ? escalaDoDia(selecionado) : null;
  const totalDias = new Date(mes.getFullYear(), mes.getMonth() + 1, 0).getDate();
  const vazios = mes.getDay();

  const proximos: string[] = [];
  if (selecionado) {
    const d = new Date(selecionado);
    while (proximos.length < 5) {
      proximos.push(`${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}`);
      d.setDate(d.getDate() + 2);
    }
  }

  const mudarMes = (delta: number) => setMes(new Date(mes.getFullYear(), mes.getMonth() + delta, 1));

  return (
    <div>
      <span className="block text-[13px] font-medium text-body mb-1">Primeiro plantão (escala 12x36) *</span>
      <div className="border border-line rounded-md p-3 bg-white">
        <div className="flex items-center justify-between mb-2">
          <button type="button" onClick={() => mudarMes(-1)} className="w-7 h-7 grid place-items-center rounded-md text-body hover:bg-canvas" aria-label="Mês anterior">
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="text-sm font-semibold text-ink">{NOMES_MES[mes.getMonth()]} de {mes.getFullYear()}</span>
          <button type="button" onClick={() => mudarMes(1)} className="w-7 h-7 grid place-items-center rounded-md text-body hover:bg-canvas" aria-label="Próximo mês">
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
        <div className="grid grid-cols-7 gap-1">
          {DIAS_SEMANA.map((d, i) => <div key={i} className="text-center text-[11px] font-semibold text-muted">{d}</div>)}
          {Array.from({ length: vazios }).map((_, i) => <div key={`v${i}`} />)}
          {Array.from({ length: totalDias }).map((_, i) => {
            const dia = new Date(mes.getFullYear(), mes.getMonth(), i + 1);
            const k = chaveData(dia);
            const ehSelecionado = k === valor;
            const ehPlantao = !!selecionado && dia > selecionado && escalaDoDia(dia) === escala;
            const antes = !!selecionado && dia < selecionado;
            return (
              <button
                key={k}
                type="button"
                onClick={() => onMudar(k)}
                aria-pressed={ehSelecionado}
                className={`h-8 rounded-md text-[13px] transition-colors ${
                  ehSelecionado ? "bg-brand-600 text-white font-semibold"
                    : ehPlantao ? "bg-brand-50 text-brand-600 font-medium hover:bg-brand-100"
                    : antes ? "text-muted hover:bg-canvas"
                    : "text-body hover:bg-canvas"
                }`}
              >
                {i + 1}
              </button>
            );
          })}
        </div>
      </div>
      {escala ? (
        <p className="text-xs text-brand-600 bg-brand-50 border border-brand-200 rounded-md px-3 py-2 mt-2">
          <span className="font-semibold">{nomeEscala(escala)}</span> · plantões a partir de {proximos.join(", ")}… das 07:00 às 19:00.
          Antes do primeiro plantão, não recebe consultas.
        </p>
      ) : (
        <p className="text-xs text-muted mt-1.5">Escolha o dia em que o profissional começa; a escala é definida por ele.</p>
      )}
    </div>
  );
}
