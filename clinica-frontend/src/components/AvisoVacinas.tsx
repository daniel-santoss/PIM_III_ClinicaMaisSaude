import { Info } from "lucide-react";
import { VACINAS_DISPONIVEIS } from "../constants/clinic";

// Aviso das vacinas em oferta, exibido quando o agendamento é de vacina (manual ou sugerido pela IA).
export default function AvisoVacinas() {
  return (
    <div className="flex items-start gap-2.5 p-3 bg-brand-50 border border-brand-200 rounded-md text-[13px] text-body">
      <Info className="w-4 h-4 text-brand-600 shrink-0 mt-0.5" />
      <p>No momento, temos disponíveis apenas as vacinas <span className="font-semibold text-ink">{VACINAS_DISPONIVEIS}</span>.</p>
    </div>
  );
}
