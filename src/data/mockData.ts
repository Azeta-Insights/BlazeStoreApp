import { Category, Product, CartItem, PromoBanner, NotificationItem } from '../types';

export const CATEGORIES: Category[] = [
  {
    id: 'phones-tablets',
    name: 'Phones & Tablets',
    iconName: 'Smartphone',
    itemCount: 850,
    colorBg: '#2563EB',
    colorIcon: '#1D4ED8',
    image: 'https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=400&auto=format&fit=crop&q=80',
  },
  {
    id: 'appliances',
    name: 'Appliances',
    iconName: 'Home',
    itemCount: 620,
    colorBg: '#D97706',
    colorIcon: '#B45309',
    image: 'https://images.unsplash.com/photo-1583847268964-b28dc8f51f92?w=400&auto=format&fit=crop&q=80',
  },
  {
    id: 'kids-baby',
    name: 'Kids & Baby',
    iconName: 'Grid',
    itemCount: 740,
    colorBg: '#EC4899',
    colorIcon: '#DB2777',
    image: 'https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?w=400&auto=format&fit=crop&q=80',
  },
  {
    id: 'fashion',
    name: 'Fashion',
    iconName: 'Shirt',
    itemCount: 1420,
    colorBg: '#9333EA',
    colorIcon: '#7E22CE',
    image: 'https://images.unsplash.com/photo-1490481651871-ab68de25d43d?w=400&auto=format&fit=crop&q=80',
  },
  {
    id: 'beauty',
    name: 'Beauty',
    iconName: 'Sparkles',
    itemCount: 890,
    colorBg: '#DB2777',
    colorIcon: '#BE123C',
    image: 'https://images.unsplash.com/photo-1556228720-195a672e8a03?w=400&auto=format&fit=crop&q=80',
  },
  {
    id: 'sneakers',
    name: 'Sneakers',
    iconName: 'Activity',
    itemCount: 530,
    colorBg: '#16A34A',
    colorIcon: '#15803D',
    image: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=400&auto=format&fit=crop&q=80',
  },
  {
    id: 'television',
    name: 'Television',
    iconName: 'Tv',
    itemCount: 310,
    colorBg: '#0284C7',
    colorIcon: '#0369A1',
    image: 'https://images.unsplash.com/photo-1593784991095-a205069470b6?w=400&auto=format&fit=crop&q=80',
  },
  {
    id: 'home-office',
    name: 'Home & Office',
    iconName: 'Briefcase',
    itemCount: 940,
    colorBg: '#854D0E',
    colorIcon: '#713F12',
    image: 'https://images.unsplash.com/photo-1524758631624-e2822e304c36?w=400&auto=format&fit=crop&q=80',
  },
  {
    id: 'supermarket',
    name: 'Supermarket',
    iconName: 'ShoppingBag',
    itemCount: 1680,
    colorBg: '#10B981',
    colorIcon: '#047857',
    image: 'https://images.unsplash.com/photo-1578916171728-46686eac8d58?w=400&auto=format&fit=crop&q=80',
  },
  {
    id: 'mobile-accessories',
    name: 'Mobile Accessories',
    iconName: 'Headphones',
    itemCount: 1150,
    colorBg: '#6366F1',
    colorIcon: '#4338CA',
    image: 'https://images.unsplash.com/photo-1584438784894-089d6a62b8fa?w=400&auto=format&fit=crop&q=80',
  },
  {
    id: 'computing',
    name: 'Computing',
    iconName: 'Laptop',
    itemCount: 480,
    colorBg: '#0D9488',
    colorIcon: '#0F766E',
    image: 'https://images.unsplash.com/photo-1496181133206-80ce9b88a853?w=400&auto=format&fit=crop&q=80',
  },
  {
    id: 'sillage-and-olfactory',
    name: 'Sillage & Olfactory',
    iconName: 'Droplets',
    itemCount: 610,
    colorBg: '#C026D3',
    colorIcon: '#A21CAF',
    image: 'https://images.unsplash.com/photo-1592945403244-b3fbafd7f539?w=400&auto=format&fit=crop&q=80',
  },
];

export const HERO_BANNERS: PromoBanner[] = [
  {
    id: 'banner-1',
    tag: 'New Collection',
    title: 'Find Your Style, Love Your Look',
    subtitle: 'Explore 2,500+ curated items designed for effortless elegance and everyday comfort.',
    buttonText: 'Shop Now',
    image: 'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?w=700&auto=format&fit=crop&q=80',
    gradient: 'from-[#A78BFA] to-[#7C6FE0]',
  },
  {
    id: 'banner-2',
    tag: 'Exclusive Release',
    title: 'Minimalist Autumn Essentials',
    subtitle: 'Warm layers, earth tones, and timeless tailoring crafted from sustainable cotton.',
    buttonText: 'Explore Trends',
    image: 'https://images.unsplash.com/photo-1483985988355-763728e1935b?w=700&auto=format&fit=crop&q=80',
    gradient: 'from-[#8B5CF6] to-[#6D28D9]',
  },
  {
    id: 'banner-3',
    tag: 'Tech & Lifestyle',
    title: 'Elevate Your Daily Workspace',
    subtitle: 'Smart wireless audio, ergonomic accessories, and sleek charging companions.',
    buttonText: 'Discover Gear',
    image: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=700&auto=format&fit=crop&q=80',
    gradient: 'from-[#6366F1] to-[#4F46E5]',
  },
];

export const BEST_DEALS: Product[] = [];

export const RECOMMENDED_PRODUCTS: Product[] = [];

export const INITIAL_CART: CartItem[] = [];

export const YOU_MIGHT_LIKE: Product[] = [];

export const RECENTLY_VIEWED: any[] = [];

export const NOTIFICATIONS: NotificationItem[] = [];

