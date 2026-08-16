import { AlertTriangle, Info, X } from 'lucide-react';
import { useScrollBlock } from '../hooks/useScrollBlock';
import ModalPortal from './ui/ModalPortal';

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
  
  const iconColor = isDestructive ? 'text-danger' : 'text-brand-600';
  const iconBg = isDestructive ? 'bg-danger-tint' : 'bg-brand-50';

  const confirmBtnClass = isDestructive
    ? 'bg-danger hover:bg-danger/90 text-white border-danger'
    : 'bg-brand-600 hover:bg-brand-800 text-white border-brand-600';

  return (
    <ModalPortal>
    <div className="fixed inset-0 z-[3000] flex items-center justify-center bg-ink/45 backdrop-blur-[2px] p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-xl shadow-modal w-full max-w-sm p-6 text-center animate-in zoom-in-95 duration-200 relative max-h-[92dvh] overflow-y-auto custom-scrollbar">
        {/* Botão Fechar X */}
        <button
          onClick={onCancel}
          className="absolute right-4 top-4 w-8 h-8 grid place-items-center text-body bg-canvas border border-line rounded-md hover:bg-line-soft transition-colors"
          aria-label="Fechar"
        >
          <X className="w-4 h-4" />
        </button>

        <div className={`w-12 h-12 ${iconBg} ${iconColor} rounded-lg grid place-items-center mx-auto mb-4`}>
          <Icon className="w-6 h-6" />
        </div>

        <h3 className="text-lg font-semibold text-ink mb-1.5">{title}</h3>

        <p className="text-[13px] text-body mb-6 leading-relaxed">
          {description}
        </p>

        <div className="flex gap-2.5">
          <button
            disabled={loading}
            className="flex-1 h-10 text-sm font-semibold text-body bg-white border border-line rounded-md hover:bg-canvas transition-colors disabled:opacity-50"
            onClick={onCancel}
          >
            {cancelText}
          </button>

          <button
            disabled={loading}
            className={`flex-1 h-10 text-sm font-semibold rounded-md border transition-colors disabled:opacity-50 flex items-center justify-center gap-2 ${confirmBtnClass}`}
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
    </ModalPortal>
  );
}
