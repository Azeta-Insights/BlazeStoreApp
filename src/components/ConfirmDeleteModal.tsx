import React from 'react';
import { AlertTriangle, Trash2, X } from 'lucide-react';

interface ConfirmDeleteModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  itemName?: string;
  confirmText?: string;
  isDanger?: boolean;
  isLoading?: boolean;
  isDarkMode?: boolean;
}

export const ConfirmDeleteModal: React.FC<ConfirmDeleteModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  itemName,
  confirmText = 'Delete Permanently',
  isDanger = true,
  isLoading = false,
  isDarkMode = false,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        onClick={isLoading ? undefined : onClose}
        className="fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity animate-fade-in"
      />

      {/* Dialog Box */}
      <div
        className={`relative z-10 w-full max-w-md overflow-hidden rounded-2xl p-6 shadow-2xl transition-all scale-100 ${
          isDarkMode ? 'bg-[#18181B] text-white border border-[#27272A]' : 'bg-white text-[#1F1F23] border border-[#EDEDF2]'
        }`}
      >
        <div className="flex items-start gap-4">
          <div
            className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl ${
              isDanger ? 'bg-red-500/15 text-red-500' : 'bg-amber-500/15 text-amber-500'
            }`}
          >
            {isDanger ? <Trash2 className="h-6 w-6" /> : <AlertTriangle className="h-6 w-6" />}
          </div>

          <div className="flex-1">
            <h3 className="text-base font-black tracking-tight">{title}</h3>
            <p className="text-xs text-[#8A8A94] mt-1.5 leading-relaxed">{message}</p>

            {itemName && (
              <div className="mt-3 rounded-xl bg-black/5 dark:bg-white/5 px-3 py-2 border border-black/5 dark:border-white/5 font-mono text-xs font-bold text-[#7C6FE0] truncate">
                {itemName}
              </div>
            )}
          </div>

          <button
            onClick={onClose}
            disabled={isLoading}
            className="p-1 rounded-lg text-[#8A8A94] hover:bg-black/5 dark:hover:bg-white/5 disabled:opacity-50 transition"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Action Buttons */}
        <div className="mt-6 flex items-center justify-end gap-2.5">
          <button
            type="button"
            onClick={onClose}
            disabled={isLoading}
            className={`rounded-xl px-4 py-2 text-xs font-bold transition ${
              isDarkMode
                ? 'bg-[#27272A] text-[#A1A1AA] hover:bg-[#333338] hover:text-white'
                : 'bg-[#F4F4F7] text-[#52525B] hover:bg-[#EAEAEA] hover:text-[#1F1F23]'
            }`}
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={onConfirm}
            disabled={isLoading}
            className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold text-white shadow-md transition disabled:opacity-50 ${
              isDanger
                ? 'bg-red-600 hover:bg-red-700 shadow-red-600/25'
                : 'bg-[#7C6FE0] hover:bg-[#6D60D6] shadow-[#7C6FE0]/25'
            }`}
          >
            {isLoading ? (
              <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
            ) : (
              <Trash2 className="h-4 w-4" />
            )}
            <span>{confirmText}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
