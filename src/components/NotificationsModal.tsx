import React from 'react';
import { X, Bell, CheckCircle2, Ticket, Package, Trash2 } from 'lucide-react';
import { NotificationItem } from '../types';

interface NotificationsModalProps {
  isOpen: boolean;
  onClose: () => void;
  notifications: NotificationItem[];
  onMarkAllRead: () => void;
  isDarkMode: boolean;
}

export const NotificationsModal: React.FC<NotificationsModalProps> = ({
  isOpen,
  onClose,
  notifications,
  onMarkAllRead,
  isDarkMode,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        id="notif-backdrop"
        onClick={onClose}
        className="fixed inset-0 bg-black/50 backdrop-blur-xs transition-opacity"
      />

      <div
        id="notif-modal-content"
        className={`relative z-10 w-full max-w-md overflow-hidden rounded-2xl p-5 shadow-2xl transition-all ${
          isDarkMode ? 'bg-[#18181B] text-white border border-[#27272A]' : 'bg-white text-[#1F1F23]'
        }`}
      >
        <div className="flex items-center justify-between border-b border-[#EDEDF2] dark:border-[#27272A] pb-3">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#7C6FE0]/15 text-[#7C6FE0]">
              <Bell className="h-4 w-4" />
            </div>
            <h3 className="font-bold text-base">Notifications</h3>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={onMarkAllRead}
              className="text-xs font-semibold text-[#7C6FE0] hover:underline"
            >
              Mark all read
            </button>
            <button
              onClick={onClose}
              className="p-1 rounded-lg text-[#8A8A94] hover:bg-[#F7F7FA] dark:hover:bg-[#27272A]"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        <div className="mt-3 divide-y divide-[#EDEDF2] dark:divide-[#27272A] max-h-80 overflow-y-auto">
          {notifications.map((n) => (
            <div
              key={n.id}
              className={`py-3 flex items-start gap-3 transition ${
                !n.read ? 'bg-[#7C6FE0]/5 px-2 rounded-xl' : 'px-1'
              }`}
            >
              <div className="mt-0.5 flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-[#F3E8FF] text-[#7C6FE0]">
                {n.type === 'order' ? (
                  <Package className="h-3.5 w-3.5" />
                ) : (
                  <Ticket className="h-3.5 w-3.5" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold">{n.title}</h4>
                  <span className="text-[10px] text-[#8A8A94]">{n.time}</span>
                </div>
                <p className="text-xs text-[#52525B] dark:text-[#A1A1AA] mt-0.5">{n.message}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
