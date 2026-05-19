import { useState, useRef, useEffect } from 'react';
import { Filter } from 'lucide-react';

interface CheckboxDropdownProps {
  label: string;
  options: string[];
  selected: string[];
  onChange: (selected: string[]) => void;
  displayMap?: Record<string, string>;
}

export default function CheckboxDropdown({ label, options, selected, onChange, displayMap }: CheckboxDropdownProps) {
  const [aberto, setAberto] = useState(false);
  const [alinharDireita, setAlinharDireita] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const btnRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setAberto(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  useEffect(() => {
    if (aberto && btnRef.current) {
      const rect = btnRef.current.getBoundingClientRect();
      setAlinharDireita(window.innerWidth - rect.left < 280);
    }
  }, [aberto]);

  const toggle = (value: string) => {
    onChange(selected.includes(value) ? selected.filter(v => v !== value) : [...selected, value]);
  };

  const display = (v: string) => (displayMap ? displayMap[v] ?? v : v);

  return (
    <div ref={ref} className="relative">
      <button
        ref={btnRef}
        onClick={() => setAberto(!aberto)}
        className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl border text-sm font-bold transition-all whitespace-nowrap cursor-pointer ${
          aberto
            ? 'border-[#7C3AED] bg-purple-50 text-[#7C3AED] ring-2 ring-purple-100'
            : 'border-gray-200 bg-white text-gray-600 hover:bg-gray-50'
        }`}
      >
        <Filter className="w-3.5 h-3.5 shrink-0" />
        {label}{selected.length > 0 && ` (${selected.length})`}
      </button>

      {aberto && (
        <div className="fixed inset-0 z-40 bg-black/30 sm:bg-transparent" onClick={() => setAberto(false)} />
      )}

      {aberto && (
        <div className={`
          fixed bottom-4 left-4 right-4 max-h-[60vh] z-50
          sm:absolute sm:bottom-auto sm:top-full sm:mt-2 sm:max-h-[360px] sm:min-w-[260px]
          ${alinharDireita ? 'sm:right-0 sm:left-auto' : 'sm:left-0 sm:right-auto'}
          overflow-y-auto bg-white rounded-2xl shadow-2xl border border-gray-100 py-2
          animate-in fade-in zoom-in duration-200 origin-top-left
        `}>
          <div className="flex justify-between items-center px-4 py-2 border-b border-gray-50">
            <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
              Filtrar {label}
            </span>
            <div className="flex gap-2">
              {selected.length < options.length && (
                <button onClick={() => onChange([...options])}
                  className="text-[11px] text-purple-600 hover:underline font-bold">
                  Todos
                </button>
              )}
              {selected.length > 0 && (
                <button onClick={() => onChange([])}
                  className="text-[11px] text-red-500 hover:underline font-bold">
                  Limpar
                </button>
              )}
            </div>
          </div>

          {options.map(opt => {
            const checked = selected.includes(opt);
            return (
              <label key={opt} className={`flex items-center gap-3 px-4 py-2.5 cursor-pointer transition-colors group ${
                checked ? 'bg-purple-50' : 'hover:bg-gray-50'
              }`}>
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={() => toggle(opt)}
                  className="h-4 w-4 rounded border-gray-300 text-[#7C3AED] focus:ring-[#7C3AED] cursor-pointer shrink-0"
                />
                <span className={`text-sm font-bold ${checked ? 'text-[#7C3AED]' : 'text-gray-600 group-hover:text-[#7C3AED]'}`}>
                  {display(opt)}
                </span>
              </label>
            );
          })}
        </div>
      )}
    </div>
  );
}
