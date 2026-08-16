import { useState } from "react";
import { X, ChevronDown } from "lucide-react";
import { ESPECIALIDADES } from "../constants/especialidades";
import ModalPortal from "./ui/ModalPortal";

interface ModalEspecialidadesProps {
  isOpen: boolean;
  onClose: () => void;
}

const DESCRICOES: Record<string, string> = {
  "Clínica Geral": "Acompanhamento de rotina, diagnósticos iniciais e tratamento de doenças comuns.",
  "Medicina de Família": "Cuidado integral e contínuo para indivíduos e famílias em todas as fases da vida.",
  "Pediatria": "Cuidado especializado para bebês, crianças e adolescentes.",
  "Ginecologia e Obstetrícia": "Saúde da mulher, gestação e prevenção de doenças do sistema reprodutor.",
  "Cardiologia": "Prevenção, diagnóstico e tratamento de doenças do coração e sistema circulatório.",
  "Dermatologia": "Diagnóstico e tratamento de doenças da pele, cabelos e unhas.",
  "Endocrinologia": "Tratamento de distúrbios hormonais e metabólicos, como diabetes e tireoide.",
  "Gastroenterologia": "Tratamento do sistema digestivo, incluindo estômago, fígado e intestinos.",
  "Neurologia": "Diagnóstico e tratamento de doenças do sistema nervoso central e periférico.",
  "Ortopedia e Traumatologia": "Cuidados com ossos, músculos, articulações e traumas físicos.",
  "Psiquiatria": "Prevenção, diagnóstico e tratamento de transtornos mentais e emocionais.",
  "Otorrinolaringologia": "Tratamento de doenças do ouvido, nariz e garganta.",
  "Oftalmologia": "Cuidados com a saúde dos olhos e tratamento de distúrbios da visão.",
  "Urologia": "Tratamento do trato urinário e do sistema reprodutor masculino.",
  "Pneumologia": "Diagnóstico e tratamento de doenças respiratórias e dos pulmões.",
  "Reumatologia": "Tratamento de doenças articulares, autoimunes e reumatismos.",
  "Geriatria": "Cuidado especializado para a saúde, bem-estar e qualidade de vida do idoso.",
  "Medicina Esportiva": "Foco na saúde, desempenho físico e prevenção de lesões em praticantes de exercícios."
};

export default function ModalEspecialidades({ isOpen, onClose }: ModalEspecialidadesProps) {
  const [expandedIndices, setExpandedIndices] = useState<number[]>([]);

  if (!isOpen) return null;

  const toggleExpand = (index: number) => {
    setExpandedIndices(prev => 
      prev.includes(index) 
        ? prev.filter(i => i !== index) 
        : [...prev, index]
    );
  };

  const leftCol = ESPECIALIDADES.filter((_, i) => i % 2 === 0);
  const rightCol = ESPECIALIDADES.filter((_, i) => i % 2 !== 0);

  const renderCard = (esp: string, originalIndex: number) => {
    const isExpanded = expandedIndices.includes(originalIndex);
    return (
      <div 
        key={originalIndex} 
        className={`border border-line rounded-xl overflow-hidden transition-all duration-300 ${isExpanded ? 'bg-brand-50/30 border-line ring-1 ring-purple-100' : 'hover:border-line hover:bg-brand-50/50'}`}
      >
        <button 
          onClick={() => toggleExpand(originalIndex)}
          className="w-full flex items-center justify-between p-4 bg-transparent border-none cursor-pointer text-left focus:outline-none"
        >
          <div className="flex items-center gap-3">
            <div className={`mt-0.5 w-2 h-2 rounded-full shrink-0 transition-colors ${isExpanded ? 'bg-[#2C5282]' : 'bg-purple-200'}`} />
            <h3 className={`font-bold transition-colors ${isExpanded ? 'text-[#2C5282]' : 'text-ink'}`}>{esp}</h3>
          </div>
          <ChevronDown className={`w-5 h-5 text-muted transition-transform duration-300 ${isExpanded ? 'rotate-180 text-[#2C5282]' : ''}`} />
        </button>
        
        <div 
          className={`px-4 text-sm text-body transition-all duration-300 overflow-hidden ${isExpanded ? 'max-h-40 pb-4 opacity-100' : 'max-h-0 opacity-0'}`}
        >
          <div className="pl-5 border-l-2 border-line ml-1">
            {DESCRICOES[esp] || "Atendimento especializado em " + esp.toLowerCase() + "."}
          </div>
        </div>
      </div>
    );
  };

  return (
    <ModalPortal>
    <div className="fixed inset-0 z-[3000] flex items-center justify-center p-4">
      {/* Overlay */}
      <div 
        className="absolute inset-0 bg-ink/45 backdrop-blur-[2px] transition-opacity" 
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className="bg-white rounded-xl shadow-modal w-full max-w-3xl max-h-[85vh] relative z-10 flex flex-col animate-in fade-in zoom-in duration-200">
        
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-line shrink-0">
          <div>
            <h2 className="text-2xl font-bold text-ink">Todas as Especialidades</h2>
            <p className="text-sm text-muted mt-1">Conheça nosso corpo clínico completo</p>
          </div>
          <button 
            onClick={onClose}
            className="p-2 text-muted hover:text-body hover:bg-canvas rounded-full transition-colors cursor-pointer border-none bg-transparent"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-start">
            <div className="flex flex-col gap-4">
              {leftCol.map((esp, idx) => renderCard(esp, idx * 2))}
            </div>
            <div className="flex flex-col gap-4">
              {rightCol.map((esp, idx) => renderCard(esp, idx * 2 + 1))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-line bg-canvas rounded-b-3xl flex justify-end gap-3 shrink-0">
          <button 
            onClick={onClose}
            className="px-6 py-2.5 text-body font-medium hover:bg-gray-200 rounded-full transition-colors cursor-pointer border-none bg-transparent"
          >
            Fechar
          </button>
          <a 
            href="/login"
            className="px-6 py-2.5 bg-[#2C5282] text-white font-medium hover:bg-purple-700 rounded-full transition-colors shadow-md no-underline"
          >
            Agendar Consulta
          </a>
        </div>
      </div>
    </div>
    </ModalPortal>
  );
}

