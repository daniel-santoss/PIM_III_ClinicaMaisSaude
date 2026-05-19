import { useState } from "react";
import { X, ChevronDown } from "lucide-react";
import { ESPECIALIDADES } from "../constants/especialidades";

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
        className={`border border-gray-100 rounded-xl overflow-hidden transition-all duration-300 ${isExpanded ? 'bg-purple-50/30 border-purple-200 ring-1 ring-purple-100' : 'hover:border-purple-200 hover:bg-purple-50/50'}`}
      >
        <button 
          onClick={() => toggleExpand(originalIndex)}
          className="w-full flex items-center justify-between p-4 bg-transparent border-none cursor-pointer text-left focus:outline-none"
        >
          <div className="flex items-center gap-3">
            <div className={`mt-0.5 w-2 h-2 rounded-full shrink-0 transition-colors ${isExpanded ? 'bg-[#7C3AED]' : 'bg-purple-200'}`} />
            <h3 className={`font-bold transition-colors ${isExpanded ? 'text-[#7C3AED]' : 'text-gray-900'}`}>{esp}</h3>
          </div>
          <ChevronDown className={`w-5 h-5 text-gray-400 transition-transform duration-300 ${isExpanded ? 'rotate-180 text-[#7C3AED]' : ''}`} />
        </button>
        
        <div 
          className={`px-4 text-sm text-gray-600 transition-all duration-300 overflow-hidden ${isExpanded ? 'max-h-40 pb-4 opacity-100' : 'max-h-0 opacity-0'}`}
        >
          <div className="pl-5 border-l-2 border-purple-100 ml-1">
            {DESCRICOES[esp] || "Atendimento especializado em " + esp.toLowerCase() + "."}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Overlay */}
      <div 
        className="absolute inset-0 bg-black/50 backdrop-blur-sm transition-opacity" 
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-3xl max-h-[85vh] relative z-10 flex flex-col animate-in fade-in zoom-in duration-200">
        
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-100 shrink-0">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Todas as Especialidades</h2>
            <p className="text-sm text-gray-500 mt-1">Conheça nosso corpo clínico completo</p>
          </div>
          <button 
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors cursor-pointer border-none bg-transparent"
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
        <div className="p-6 border-t border-gray-100 bg-gray-50 rounded-b-3xl flex justify-end gap-3 shrink-0">
          <button 
            onClick={onClose}
            className="px-6 py-2.5 text-gray-700 font-medium hover:bg-gray-200 rounded-full transition-colors cursor-pointer border-none bg-transparent"
          >
            Fechar
          </button>
          <a 
            href="/login"
            className="px-6 py-2.5 bg-[#7C3AED] text-white font-medium hover:bg-purple-700 rounded-full transition-colors shadow-md no-underline"
          >
            Agendar Consulta
          </a>
        </div>
      </div>
    </div>
  );
}

