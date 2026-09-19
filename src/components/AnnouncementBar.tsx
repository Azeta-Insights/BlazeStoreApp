import React, { useState } from 'react';
import { Sparkles, ArrowRight, X, Copy, Check } from 'lucide-react';
import { AnnouncementConfig } from '../types';

interface AnnouncementBarProps {
  config: AnnouncementConfig;
  onApplyCoupon?: (code: string) => void;
  onNavigateToDeals?: () => void;
}

export function AnnouncementBar({ config, onApplyCoupon, onNavigateToDeals }: AnnouncementBarProps) {
  const [isVisible, setIsVisible] = useState(true);
  const [copied, setCopied] = useState(false);

  if (!config.enabled || !isVisible) return null;

  const handleAction = () => {
    if (config.linkAction?.startsWith('coupon:')) {
      const code = config.linkAction.split(':')[1];
      if (code) {
        navigator.clipboard?.writeText(code);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
        onApplyCoupon?.(code);
      }
    } else {
      onNavigateToDeals?.();
    }
  };

  return (
    <div
      id="store-announcement-bar"
      className="relative bg-gradient-to-r from-amber-600 via-orange-600 to-rose-600 text-white text-xs sm:text-sm font-medium py-2 px-4 shadow-sm z-40 transition-all"
    >
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-3">
        <div className="flex-1 flex items-center justify-center gap-2 text-center flex-wrap">
          {config.badge && (
            <span className="inline-flex items-center gap-1 bg-white/20 backdrop-blur-xs px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider text-amber-100">
              <Sparkles className="w-3 h-3 text-amber-200 animate-pulse" />
              {config.badge}
            </span>
          )}
          <span className="leading-snug">{config.text}</span>
          {config.linkText && (
            <button
              onClick={handleAction}
              className="inline-flex items-center gap-1 font-bold underline hover:text-amber-200 transition-colors cursor-pointer ml-1"
            >
              {copied ? (
                <>
                  <Check className="w-3.5 h-3.5 text-green-300" />
                  <span>Copied!</span>
                </>
              ) : (
                <>
                  <span>{config.linkText}</span>
                  {config.linkAction?.startsWith('coupon:') ? (
                    <Copy className="w-3 h-3 opacity-80" />
                  ) : (
                    <ArrowRight className="w-3.5 h-3.5" />
                  )}
                </>
              )}
            </button>
          )}
        </div>

        <button
          onClick={() => setIsVisible(false)}
          className="text-white/80 hover:text-white p-1 rounded-md hover:bg-white/10 transition-colors"
          title="Dismiss banner"
          aria-label="Dismiss banner"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}
