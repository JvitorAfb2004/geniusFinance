import React from 'react';
import { AlertTriangle, Info } from 'lucide-react';
import { motion } from 'motion/react';

interface ConfirmModalProps {
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: 'danger' | 'warning' | 'info';
  onConfirm: () => void;
  onCancel: () => void;
}

export default function ConfirmModal({
  title,
  message,
  confirmLabel = 'Confirmar',
  cancelLabel = 'Cancelar',
  variant = 'danger',
  onConfirm,
  onCancel,
}: ConfirmModalProps) {
  const colorMap = {
    danger: { bg: 'bg-danger-light', text: 'text-danger-dark', btn: 'bg-danger hover:bg-danger-dark' },
    warning: { bg: 'bg-warning-light', text: 'text-warning-dark', btn: 'bg-warning hover:bg-warning-dark' },
    info: { bg: 'bg-primary-light', text: 'text-primary-dark', btn: 'bg-primary hover:bg-primary-hover' },
  };
  const colors = colorMap[variant];

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 bg-black/30 backdrop-blur-sm flex flex-col items-center justify-center p-4"
      onClick={onCancel}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        transition={{ type: 'spring', duration: 0.3 }}
        className="bg-surface rounded-xl shadow-xl w-full max-w-sm overflow-hidden relative"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-5">
          <div className="flex items-start gap-4">
            <div className={`w-12 h-12 rounded-2xl ${colors.bg} flex items-center justify-center flex-shrink-0`}>
              {variant === 'info' ? <Info className={`w-6 h-6 ${colors.text}`} /> : <AlertTriangle className={`w-6 h-6 ${colors.text}`} />}
            </div>
            <div className="flex-1 min-w-0 pt-1">
              <h3 className="text-base font-bold text-text-primary">{title}</h3>
              <p className="text-sm text-text-secondary mt-1">{message}</p>
            </div>
          </div>
        </div>
        <div className="flex gap-2 px-5 pb-5">
          <button
            onClick={onCancel}
            className="flex-1 py-2.5 text-sm font-semibold text-text-secondary bg-bg hover:bg-border hover:text-text-primary rounded-xl transition-all cursor-pointer border-none"
          >
            {cancelLabel}
          </button>
          <button
            onClick={onConfirm}
            className={`flex-1 py-2.5 text-sm font-semibold text-surface rounded-xl transition-all cursor-pointer border-none shadow-sm hover:shadow-md active:scale-[0.97] ${colors.btn}`}
          >
            {confirmLabel}
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}
