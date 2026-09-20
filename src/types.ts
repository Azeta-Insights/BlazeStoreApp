export type AdminRole = 'owner' | 'manager' | 'customer';

export interface Product {
  id: string;
  name: string;
  category: string;
  brand?: string;
  collection?: string;
  price: number;
  originalPrice?: number;
  costPrice?: number;
  discountPercentage?: number;
  rating: number;
  reviewCount: number;
  image: string;
  badge?: string;
  isHot?: boolean;
  isDeal?: boolean;
  isBestSeller?: boolean;
  isNewArrival?: boolean;
  colors?: string[];
  selectedColor?: string;
  variant?: string;
  description?: string;
  inStock?: boolean;
  stockQuantity?: number;
  sku?: string;
  createdAt?: string | Date;
  updatedAt?: string | Date;
}

export interface CartItem {
  id: string;
  productId: string;
  name: string;
  price: number;
  originalPrice?: number;
  image: string;
  variant: string;
  color?: string;
  quantity: number;
}

export interface Category {
  id: string;
  name: string;
  iconName: string;
  itemCount: number;
  colorBg: string;
  colorIcon: string;
  image?: string;
}

export interface PromoBanner {
  id: string;
  tag: string;
  title: string;
  subtitle: string;
  buttonText: string;
  image: string;
  gradient: string;
}

export interface PromoTile {
  id: string;
  type: 'flash_sale' | 'free_shipping' | 'new_arrivals';
  title: string;
  subtitle: string;
  badgeText: string;
  bgHex: string;
  iconName: string;
  accentColor: string;
}

export interface NotificationItem {
  id: string;
  title: string;
  message: string;
  time: string;
  read: boolean;
  type: 'order' | 'discount' | 'account' | 'refund' | 'inventory';
  createdAt?: string | Date;
}

export interface User {
  id: string;
  name: string;
  email: string;
  phone?: string;
  avatar?: string;
  role?: string; // 'Store Owner' | 'Store Manager' | 'Club Member' | 'Customer'
  roleType?: AdminRole;
  createdAt?: string | Date;
  updatedAt?: string | Date;
  totalOrders?: number;
  totalSpent?: number;
}

export type OrderStatus = 'pending' | 'processing' | 'shipped' | 'delivered' | 'cancelled' | 'refunded' | 'partially_refunded';

export interface OrderCustomer {
  name: string;
  email: string;
  phone?: string;
  address?: string;
  city?: string;
  state?: string;
  zip?: string;
  paymentMethod?: string;
}

export interface OrderItem {
  id: string;
  productId: string;
  name: string;
  price: number;
  quantity: number;
  image: string;
  variant?: string;
}

export interface Order {
  _id?: any;
  id?: string;
  orderId: string;
  customer: OrderCustomer;
  items: OrderItem[];
  subtotal: number;
  discount: number;
  shipping: number;
  total: number;
  currency?: string;
  currencySymbol?: string;
  paymentMethod?: string;
  paymentStatus?: 'pending' | 'paid' | 'failed' | 'refunded';
  paymentReference?: string;
  paymentRef?: string;
  paystackData?: any;
  status: OrderStatus;
  createdAt: string | Date;
  updatedAt?: string | Date;
  userId?: string;
  timeline?: any[];
  refundAmount?: number;
  refundReason?: string;
  refundDate?: string;
  refundedBy?: string;
  refundStatus?: 'none' | 'approved' | 'pending_owner_approval' | 'rejected';
}

export interface RefundRecord {
  id: string;
  orderId: string;
  customerName: string;
  customerEmail: string;
  amount: number;
  reason: string;
  refundedBy: string; // 'Owner' | 'Manager'
  adminRole: AdminRole;
  status: 'approved' | 'pending_owner_approval' | 'rejected';
  createdAt: string | Date;
  restocked: boolean;
  approvedBy?: string;
  approvedAt?: string;
  rejectedBy?: string;
  rejectedAt?: string;
}

export interface SalesAnalytics {
  grossRevenue: number;
  netRevenue: number;
  totalOrders: number;
  completedOrders: number;
  totalRefunds: number;
  refundAmountTotal: number;
  averageOrderValue: number;
  totalProducts: number;
  lowStockCount: number;
  outOfStockCount: number;
  totalCustomers: number;
  dailyRevenue: { date: string; revenue: number; orders: number; refunds: number }[];
  categorySales: { name: string; value: number; count: number }[];
  topProducts: { id: string; name: string; salesCount: number; revenue: number; stock: number }[];
}

export interface Review {
  id: string;
  productId: string;
  userId?: string;
  userName: string;
  userEmail: string;
  rating: number; // 1 to 5
  title?: string;
  comment: string;
  createdAt: string | Date;
  images?: string[];
  verifiedPurchase?: boolean;
  helpfulCount?: number;
}

export interface Coupon {
  id: string;
  code: string;
  discountType: 'percentage' | 'fixed';
  discountValue: number; // percentage (e.g. 15 for 15%) or fixed amount (e.g. 20 for $20)
  minOrderAmount?: number;
  maxDiscountAmount?: number;
  expiryDate?: string;
  usageLimit?: number;
  usedCount: number;
  isActive: boolean;
  description: string;
  createdAt: string | Date;
}

export interface Address {
  id: string;
  label: 'Home' | 'Work' | 'Other';
  isDefault?: boolean;
  fullName: string;
  phone: string;
  street: string;
  city: string;
  state: string;
  zip: string;
  country: string;
}

export interface AnnouncementConfig {
  enabled: boolean;
  text: string;
  badge?: string;
  linkText?: string;
  linkAction?: string;
  backgroundColor?: string;
  textColor?: string;
}
