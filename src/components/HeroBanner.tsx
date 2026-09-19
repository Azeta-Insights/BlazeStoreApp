import React, { useState, useEffect, useRef } from 'react';
import { ArrowRight, Sparkles, ChevronLeft, ChevronRight, Flame, ShoppingBag } from 'lucide-react';
import { PromoBanner } from '../types';

export const HERO_SLIDES: PromoBanner[] = [
  {
    id: 'banner-1',
    tag: 'New Season 2026',
    title: 'Find Your Style, Love Your Look',
    subtitle: 'Explore 2,500+ curated luxury & everyday items designed for effortless elegance and comfort.',
    buttonText: 'Shop Now',
    image: 'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?w=700&auto=format&fit=crop&q=80',
    gradient: 'from-[#8B5CF6] via-[#7C6FE0] to-[#6366F1]',
  },
  {
    id: 'banner-2',
    tag: 'Super Flash Deals',
    title: 'Up to 50% Off Summer Essentials',
    subtitle: 'Limited-time deals on trending fashion, designer eyewear, and artisanal leather accessories.',
    buttonText: 'Shop Deals',
    image: 'https://images.unsplash.com/photo-1483985988355-763728e1935b?w=700&auto=format&fit=crop&q=80',
    gradient: 'from-[#EF4444] via-[#F97316] to-[#8B5CF6]',
  },
  {
    id: 'banner-3',
    tag: 'Smart Tech & Audio',
    title: 'Elevate Your Daily Workspace',
    subtitle: 'Wireless active noise cancelling headphones, magnetic chargers, and ergonomic desk gear.',
    buttonText: 'Discover Gear',
    image: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=700&auto=format&fit=crop&q=80',
    gradient: 'from-[#0284C7] via-[#6366F1] to-[#7C6FE0]',
  },
  {
    id: 'banner-4',
    tag: 'Artisanal Home',
    title: 'Crafted Ceramics & Cozy Spaces',
    subtitle: 'Handmade stoneware, botanical skincare elixirs, and ambient smart lighting for your sanctuary.',
    buttonText: 'Explore Living',
    image: 'https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?w=700&auto=format&fit=crop&q=80',
    gradient: 'from-[#D97706] via-[#EA580C] to-[#9333EA]',
  },
];

interface HeroBannerProps {
  onShopNow: () => void;
  onExploreDeals: () => void;
}

export const HeroBanner: React.FC<HeroBannerProps> = ({ onShopNow, onExploreDeals }) => {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isHovered, setIsHovered] = useState(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Auto-advance carousel every 5 seconds when NOT hovered
  useEffect(() => {
    if (isHovered) {
      if (timerRef.current) clearInterval(timerRef.current);
      return;
    }

    timerRef.current = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % HERO_SLIDES.length);
    }, 5000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isHovered]);

  const slide = HERO_SLIDES[currentSlide];

  const handlePrev = () => {
    setCurrentSlide((prev) => (prev === 0 ? HERO_SLIDES.length - 1 : prev - 1));
  };

  const handleNext = () => {
    setCurrentSlide((prev) => (prev + 1) % HERO_SLIDES.length);
  };

  const handleSlideCta = () => {
    if (slide.id === 'banner-2') {
      onExploreDeals();
    } else {
      onShopNow();
    }
  };

  return (
    <div
      id="hero-banner-container"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className={`relative overflow-hidden rounded-3xl bg-gradient-to-r ${slide.gradient} p-6 sm:p-8 lg:p-10 text-white shadow-xl shadow-[#7C6FE0]/15 transition-all duration-700`}
    >
      {/* Decorative ambient background elements */}
      <div className="absolute top-0 right-1/4 h-72 w-72 rounded-full bg-white/15 blur-3xl pointer-events-none" />
      <div className="absolute -bottom-10 -left-10 h-56 w-56 rounded-full bg-black/20 blur-2xl pointer-events-none" />

      {/* Slide Content Grid */}
      <div className="relative z-10 grid grid-cols-1 items-center gap-6 md:grid-cols-12">
        {/* Left Content */}
        <div className="space-y-4 md:col-span-7">
          {/* Pill Badge */}
          <div className="inline-flex items-center gap-1.5 rounded-full bg-white/20 px-3.5 py-1 text-xs font-bold tracking-wide backdrop-blur-md shadow-xs">
            {slide.id === 'banner-2' ? (
              <Flame className="h-3.5 w-3.5 text-amber-300 fill-current" />
            ) : (
              <Sparkles className="h-3.5 w-3.5 text-yellow-300" />
            )}
            <span>{slide.tag}</span>
            {isHovered && (
              <span className="ml-1 text-[10px] bg-black/25 px-2 py-0.2 rounded-full text-white/80 font-normal">
                Paused
              </span>
            )}
          </div>

          {/* Heading */}
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold tracking-tight leading-[1.15] text-white">
            {slide.title}
          </h1>

          {/* Subtitle */}
          <p className="text-xs sm:text-sm text-white/90 leading-relaxed max-w-md font-medium">
            {slide.subtitle}
          </p>

          {/* CTA Buttons */}
          <div className="pt-2 flex flex-wrap items-center gap-3">
            <button
              id="hero-shop-now-btn"
              onClick={handleSlideCta}
              className="inline-flex items-center gap-2 rounded-xl bg-white px-5 py-2.5 text-xs sm:text-sm font-bold text-[#7C6FE0] shadow-md transition-all hover:bg-white/90 hover:shadow-lg active:scale-95 cursor-pointer"
            >
              <span>{slide.buttonText}</span>
              <ArrowRight className="h-4 w-4" />
            </button>

            <button
              id="hero-explore-btn"
              onClick={onExploreDeals}
              className="inline-flex items-center gap-1.5 rounded-xl border border-white/40 bg-white/10 px-4 py-2.5 text-xs sm:text-sm font-semibold text-white backdrop-blur-xs transition hover:bg-white/20 active:scale-95 cursor-pointer"
            >
              <Flame className="h-4 w-4 text-amber-300" />
              <span>Explore Deals</span>
            </button>
          </div>
        </div>

        {/* Right Product Showcase Photo */}
        <div className="relative flex justify-center md:col-span-5">
          <div className="relative">
            {/* Background tilted card */}
            <div className="absolute inset-0 rounded-2xl bg-white/15 backdrop-blur-xs transform rotate-3 scale-95" />
            <img
              key={slide.image}
              src={slide.image}
              alt={slide.title}
              referrerPolicy="no-referrer"
              className="relative h-48 sm:h-56 lg:h-64 w-full max-w-[280px] object-cover rounded-2xl shadow-2xl ring-2 ring-white/30 transform -rotate-1 transition-all duration-500 hover:rotate-0 hover:scale-105"
            />

            {/* Float badge */}
            <div className="absolute -bottom-3 -left-3 rounded-xl bg-white/95 dark:bg-[#18181B]/95 backdrop-blur-md px-3 py-1.5 shadow-lg flex items-center gap-2 text-xs font-bold text-[#1F1F23] dark:text-white">
              <span className="h-2 w-2 rounded-full bg-[#4CAF50] animate-ping" />
              <span>Trending in 2026</span>
            </div>
          </div>
        </div>
      </div>

      {/* Carousel Navigation Dots & Arrows */}
      <div className="relative z-10 mt-6 flex items-center justify-between pt-2 border-t border-white/15">
        {/* Dots */}
        <div className="flex items-center gap-2">
          {HERO_SLIDES.map((_, idx) => (
            <button
              key={idx}
              id={`carousel-dot-${idx}`}
              onClick={() => setCurrentSlide(idx)}
              className={`h-2 transition-all duration-300 rounded-full cursor-pointer ${
                currentSlide === idx ? 'w-7 bg-white' : 'w-2.5 bg-white/40 hover:bg-white/70'
              }`}
              title={`Jump to slide ${idx + 1}`}
              aria-label={`Slide ${idx + 1}`}
            />
          ))}
        </div>

        {/* Arrows */}
        <div className="flex items-center gap-2">
          <button
            id="hero-prev-btn"
            onClick={handlePrev}
            className="flex h-8 w-8 items-center justify-center rounded-xl bg-white/20 text-white hover:bg-white/30 transition active:scale-90 cursor-pointer"
            title="Previous slide"
            aria-label="Previous slide"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button
            id="hero-next-btn"
            onClick={handleNext}
            className="flex h-8 w-8 items-center justify-center rounded-xl bg-white/20 text-white hover:bg-white/30 transition active:scale-90 cursor-pointer"
            title="Next slide"
            aria-label="Next slide"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
