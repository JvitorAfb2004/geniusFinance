import React from 'react';
import { AlertTriangle, Info } from 'lucide-react';
import { motion } from 'motion/react';
import { Button } from '@astryxdesign/core/Button';

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
    danger: { bg: 'bg-danger-light', text: 'text-danger-dark' },
    warning: { bg: 'bg-warning-light', text: 'text-warning-dark' },
    info: { bg: 'bg-primary-light', text: 'text-primary-dark' },
  };
  const colors = colorMap[variant];

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 bg-black/35 backdrop-blur-sm flex flex-col items-center justify-center p-4"
      onClick={onCancel}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 15 }}
        transition={{ type: 'spring', duration: 0.3 }}
        className="bg-surface rounded-2xl shadow-xl w-full max-w-sm overflow-hidden relative border border-slate-100/60"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-6">
          <div className="flex items-start gap-4">
            <div className={`w-11 h-11 rounded-xl ${colors.bg} flex items-center justify-center flex-shrink-0 shadow-[0_1px_2px_rgba(0,0,0,0.02)]`}>
              {variant === 'info' ? <Info className={`w-5 h-5 ${colors.text}`} /> : <AlertTriangle className={`w-5 h-5 ${colors.text}`} />}
            </div>
            <div className="flex-1 min-w-0 pt-0.5">
              <h3 className="text-[1.05rem] font-bold text-slate-800 tracking-tight leading-snug">{title}</h3>
              <p className="text-[0.85rem] text-slate-500 mt-1 leading-relaxed">{message}</p>
            </div>
          </div>
        </div>
        <div className="flex gap-2.5 px-6 pb-6">
          <Button label={cancelLabel} variant="secondary" onClick={onCancel} className="flex-1" />
          <Button label={confirmLabel} variant={variant === 'danger' ? 'destructive' : 'primary'} onClick={onConfirm} className="flex-1" />
        </div>
      </motion.div>
    </motion.div>
  );
}
