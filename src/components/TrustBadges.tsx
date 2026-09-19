import React from 'react';
import { ShieldCheck, RotateCcw, Headphones, Users } from 'lucide-react';

interface TrustBadgesProps {
  isDarkMode?: boolean;
}

export const TrustBadges: React.FC<TrustBadgesProps> = ({ isDarkMode }) => {
  const badges = [
    {
      icon: ShieldCheck,
      title: 'Secure Payment',
      desc: '256-Bit SSL Encrypted Checkout',
      color: '#7C6FE0',
      bgColor: '#F3E8FF',
    },
    {
      icon: RotateCcw,
      title: 'Easy Returns',
      desc: '30-Day Hassle-Free Exchange',
      color: '#0284C7',
      bgColor: '#E0F2FE',
    },
    {
      icon: Headphones,
      title: '24/7 Support',
      desc: 'Dedicated Customer Care',
      color: '#16A34A',
      bgColor: '#DCFCE7',
    },
    {
      icon: Users,
      title: 'Trusted Worldwide',
      desc: 'Over 250,000+ Happy Shoppers',
      color: '#D97706',
      bgColor: '#FEF3C7',
    },
  ];

  return (
    <div
      id="trust-badge-strip"
      className={`grid grid-cols-2 md:grid-cols-4 gap-4 rounded-2xl p-5 sm:p-6 border transition-colors ${
        isDarkMode
          ? 'bg-[#1E1E22] border-[#27272A]'
          : 'bg-white border-[#E2E8F0] shadow-xs'
      }`}
    >
      {badges.map((badge, idx) => {
        const Icon = badge.icon;
        return (
          <div key={idx} className="flex items-center gap-3.5">
            <div
              className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl transition-transform hover:scale-105"
              style={{ backgroundColor: badge.bgColor, color: badge.color }}
            >
              <Icon className="h-5 w-5" />
            </div>
            <div>
              <h5 className="text-xs sm:text-sm font-bold text-[#0F172A] dark:text-[#F8FAFC] leading-tight">
                {badge.title}
              </h5>
              <p className="text-[11px] font-semibold text-[#475569] dark:text-[#94A3B8] mt-0.5 leading-snug">
                {badge.desc}
              </p>
            </div>
          </div>
        );
      })}
    </div>
  );
};
