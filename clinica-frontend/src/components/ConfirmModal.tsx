import { AlertTriangle, Info } from 'lucide-react';
import { useScrollBlock } from '../hooks/useScrollBlock';

interface ConfirmModalProps {
  isOpen: boolean;
  title: string;
  description: string;
  confirmText?: string;
  cancelText?: string;
  type?: 'destructive' | 'neutral';
  loading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export default function ConfirmModal({
  isOpen,
  title,
  description,
  confirmText = 'Confirmar',
  cancelText = 'Cancelar',
  type = 'destructive',
  loading = false,
  onConfirm,
  onCancel
}: ConfirmModalProps) {
  useScrollBlock(isOpen);

  if (!isOpen) return null;

  const isDestructive = type === 'destructive';
  const Icon = isDestructive ? AlertTriangle : Info;
  
  const iconColor = isDestructive ? 'text-red-600' : 'text-[#7C3AED]';
  const iconBg = isDestructive ? 'bg-red-100' : 'bg-purple-100';
  const borderClass = isDestructive ? 'border-red-500' : 'border-[#7C3AED]';
  
  const confirmBtnClass = isDestructive 
    ? 'bg-red-600 hover:bg-red-700 text-white shadow-red-200'
    : 'bg-[#7C3AED] hover:bg-[#6D28D9] text-white shadow-purple-200';

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className={`bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 text-center animate-in zoom-in-95 duration-200`}>
        
        <div className={`w-14 h-14 ${iconBg} ${iconColor} rounded-full flex items-center justify-center mx-auto mb-4 shadow-sm`}>
          <Icon className="w-7 h-7" />
        </div>
        
        <h3 className="text-xl font-black text-gray-900 mb-2 tracking-tight">{title}</h3>
        
        <p className="text-sm text-gray-600 mb-8 font-medium leading-relaxed">
          {description}
        </p>
        
        <div className="flex gap-3">
          <button 
            disabled={loading} 
            className="flex-1 py-3 text-sm font-bold text-gray-600 border-2 border-gray-200 rounded-xl hover:bg-gray-50 hover:border-gray-300 transition-all active:scale-95 disabled:opacity-50" 
            onClick={onCancel}
          >
            {cancelText}
          </button>
          
          <button 
            disabled={loading} 
            className={`flex-1 py-3 text-sm font-bold rounded-xl shadow-lg transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2 ${confirmBtnClass}`} 
            onClick={onConfirm}
          >
            {loading ? (
              <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div> Aguarde...</>
            ) : (
              confirmText
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
