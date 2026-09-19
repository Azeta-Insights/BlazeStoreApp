import React, { useState, useEffect } from 'react';
import { Timer, Truck, Glasses, ArrowRight, Zap, Gift } from 'lucide-react';

interface PromoTilesProps {
  onTileClick: (filter: string) => void;
}

export const PromoTiles: React.FC<PromoTilesProps> = ({ onTileClick }) => {
  // Live countdown timer state for Flash Sale
  const [timeLeft, setTimeLeft] = useState({
    hours: 5,
    minutes: 42,
    seconds: 19,
  });

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev.seconds > 0) {
          return { ...prev, seconds: prev.seconds - 1 };
        } else if (prev.minutes > 0) {
          return { ...prev, minutes: prev.minutes - 1, seconds: 59 };
        } else if (prev.hours > 0) {
          return { ...prev, hours: prev.hours - 1, minutes: 59, seconds: 59 };
        } else {
          return { hours: 12, minutes: 0, seconds: 0 };
        }
      });
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  const format2Digits = (num: number) => String(num).padStart(2, '0');

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {/* 1. Pink Flash Sale Tile */}
      <div
        id="promo-tile-flash-sale"
        onClick={() => onTileClick('deals')}
        className="group relative overflow-hidden rounded-2xl p-5 cursor-pointer transition-all duration-300 hover:-translate-y-1 hover:shadow-md"
        style={{ backgroundColor: '#F5E1E8' }}
      >
        <div className="relative z-10 flex flex-col justify-between h-full space-y-4">
          <div className="flex items-center justify-between">
            <span className="inline-flex items-center gap-1 rounded-full bg-[#FF4D4D] px-2.5 py-0.5 text-[10px] font-extrabold text-white uppercase tracking-wider shadow-xs">
              <Zap className="h-3 w-3" /> Flash Sale
            </span>
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-white/70 text-[#E11D48] shadow-xs">
              <Timer className="h-4 w-4" />
            </div>
          </div>

          <div>
            <h4 className="text-base font-extrabold text-[#1F1F23] leading-tight">
              Midnight Deals
            </h4>
            <p className="text-xs text-[#52525B] mt-0.5">Up to 65% off selected tech & apparel</p>
          </div>

          {/* Countdown Clock */}
          <div className="flex items-center gap-1.5 pt-1">
            <div className="flex items-center gap-1">
              <span className="rounded-lg bg-white px-2 py-1 text-xs font-mono font-extrabold text-[#1F1F23] shadow-xs">
                {format2Digits(timeLeft.hours)}h
              </span>
              <span className="font-bold text-[#1F1F23]">:</span>
              <span className="rounded-lg bg-white px-2 py-1 text-xs font-mono font-extrabold text-[#1F1F23] shadow-xs">
                {format2Digits(timeLeft.minutes)}m
              </span>
              <span className="font-bold text-[#1F1F23]">:</span>
              <span className="rounded-lg bg-white px-2 py-1 text-xs font-mono font-extrabold text-[#FF4D4D] shadow-xs">
                {format2Digits(timeLeft.seconds)}s
              </span>
            </div>
          </div>

          <div className="flex items-center gap-1 text-xs font-bold text-[#E11D48] group-hover:underline">
            <span>Shop Deals Now</span>
            <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-1" />
          </div>
        </div>

        {/* Decorative corner shape */}
        <div className="absolute -right-4 -bottom-4 h-24 w-24 rounded-full bg-white/30 blur-xs pointer-events-none" />
      </div>

      {/* 2. Soft Green Free Shipping Tile */}
      <div
        id="promo-tile-free-shipping"
        onClick={() => onTileClick('shipping')}
        className="group relative overflow-hidden rounded-2xl p-5 cursor-pointer transition-all duration-300 hover:-translate-y-1 hover:shadow-md"
        style={{ backgroundColor: '#E3F2DD' }}
      >
        <div className="relative z-10 flex flex-col justify-between h-full space-y-4">
          <div className="flex items-center justify-between">
            <span className="inline-flex items-center gap-1 rounded-full bg-[#4CAF50] px-2.5 py-0.5 text-[10px] font-extrabold text-white uppercase tracking-wider shadow-xs">
              <Truck className="h-3 w-3" /> Special Offer
            </span>
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-white/70 text-[#2E7D32] shadow-xs">
              <Gift className="h-4 w-4" />
            </div>
          </div>

          <div>
            <h4 className="text-base font-extrabold text-[#1F1F23] leading-tight">
              Free Express Shipping
            </h4>
            <p className="text-xs text-[#52525B] mt-0.5">On all orders across Nigeria over ₦50,000</p>
          </div>

          <div className="rounded-lg bg-white/80 p-2 text-[11px] text-[#2E7D32] font-semibold border border-[#2E7D32]/10">
            ✓ Delivered in 1–2 business days
          </div>

          <div className="flex items-center gap-1 text-xs font-bold text-[#2E7D32] group-hover:underline">
            <span>Learn Shipping Details</span>
            <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-1" />
          </div>
        </div>

        <div className="absolute -right-4 -bottom-4 h-24 w-24 rounded-full bg-white/30 blur-xs pointer-events-none" />
      </div>

      {/* 3. Soft Peach New Arrivals Tile */}
      <div
        id="promo-tile-new-arrivals"
        onClick={() => onTileClick('new-arrivals')}
        className="group relative overflow-hidden rounded-2xl p-5 cursor-pointer transition-all duration-300 hover:-translate-y-1 hover:shadow-md"
        style={{ backgroundColor: '#FBE8D6' }}
      >
        <div className="relative z-10 flex flex-col justify-between h-full space-y-4">
          <div className="flex items-center justify-between">
            <span className="inline-flex items-center gap-1 rounded-full bg-[#D97706] px-2.5 py-0.5 text-[10px] font-extrabold text-white uppercase tracking-wider shadow-xs">
              Fresh Drop
            </span>
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-white/70 text-[#D97706] shadow-xs">
              <Glasses className="h-4 w-4" />
            </div>
          </div>

          <div>
            <h4 className="text-base font-extrabold text-[#1F1F23] leading-tight">
              Summer New Arrivals
            </h4>
            <p className="text-xs text-[#52525B] mt-0.5">Explore 350+ fresh designer picks</p>
          </div>

          <div className="rounded-lg bg-white/80 p-2 text-[11px] text-[#B45309] font-semibold border border-[#B45309]/10">
            ★ Handcrafted & Sustainable Materials
          </div>

          <div className="flex items-center gap-1 text-xs font-bold text-[#D97706] group-hover:underline">
            <span>Discover Collection</span>
            <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-1" />
          </div>
        </div>

        <div className="absolute -right-4 -bottom-4 h-24 w-24 rounded-full bg-white/30 blur-xs pointer-events-none" />
      </div>
    </div>
  );
};
