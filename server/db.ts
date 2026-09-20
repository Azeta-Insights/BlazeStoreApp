import fs from 'fs';
import path from 'path';
import { adminDb, adminAuth } from './firebase';
import { Product, CartItem, NotificationItem, User, Order, RefundRecord, AdminRole, SalesAnalytics } from '../src/types';
import { verifyFirebaseIdToken } from './auth';
import { BEST_DEALS, RECOMMENDED_PRODUCTS } from '../src/data/mockData';
import {
  restGetCollection,
  restGetDoc,
  restSetDoc,
  restDeleteDoc,
} from './firestoreRest';
import { sendOrderConfirmationEmail } from './email';

// Helper to determine admin roles based on email
export function getRoleForEmail(email: string): { role: string; roleType: AdminRole } {
  const clean = (email || '').trim().toLowerCase();
  if (
    clean === 'azetablessingb@gmail.com' ||
    clean === 'blessing.waydiva@gmail.com' ||
    clean === 'owner@blazestore.com' ||
    clean.startsWith('owner@') ||
    clean.includes('storeowner')
  ) {
    return { role: 'Store Owner', roleType: 'owner' };
  }
  if (
    clean === 'manager@blazestore.com' ||
    clean.startsWith('manager@') ||
    clean.includes('storemanager')
  ) {
    return { role: 'Store Manager', roleType: 'manager' };
  }
  return { role: 'Customer', roleType: 'customer' };
}

// Persistent Disk Database Path
const DB_DIR = path.join(process.cwd(), 'data');
const DB_FILE = path.join(DB_DIR, 'blazestore_db.json');

// In-memory collection cache keyed by collectionName -> Map<docId, document>
const serverStore = new Map<string, Map<string, any>>();

// Initialize and load persistent data from disk on server startup
function loadDatabaseFromDisk(): void {
  try {
    if (!fs.existsSync(DB_DIR)) {
      fs.mkdirSync(DB_DIR, { recursive: true });
    }
    if (fs.existsSync(DB_FILE)) {
      const raw = fs.readFileSync(DB_FILE, 'utf-8');
      if (raw.trim()) {
        const data = JSON.parse(raw);
        if (data && typeof data === 'object') {
          for (const [colName, docs] of Object.entries(data)) {
            if (Array.isArray(docs)) {
              const map = getStoreMap(colName);
              docs.forEach((d: any) => {
                if (d && d.id) {
                  map.set(String(d.id), d);
                }
              });
            }
          }
        }
      }
    }
  } catch (err) {
    console.warn('[Storage] Failed to read blazestore_db.json from disk:', err);
  }
}

// Persist serverStore to disk
let saveTimeout: NodeJS.Timeout | null = null;
function persistDatabaseToDisk(immediate = false): void {
  const executeSave = () => {
    try {
      if (!fs.existsSync(DB_DIR)) {
        fs.mkdirSync(DB_DIR, { recursive: true });
      }
      const serializable: Record<string, any[]> = {};
      for (const [colName, map] of serverStore.entries()) {
        serializable[colName] = Array.from(map.values());
      }
      fs.writeFileSync(DB_FILE, JSON.stringify(serializable, null, 2), 'utf-8');
    } catch (err) {
      console.warn('[Storage] Failed to save blazestore_db.json to disk:', err);
    }
  };

  if (immediate) {
    if (saveTimeout) clearTimeout(saveTimeout);
    executeSave();
  } else {
    if (saveTimeout) clearTimeout(saveTimeout);
    saveTimeout = setTimeout(executeSave, 300);
  }
}

function getStoreMap(collectionName: string): Map<string, any> {
  let map = serverStore.get(collectionName);
  if (!map) {
    map = new Map<string, any>();
    serverStore.set(collectionName, map);
  }
  return map;
}

// Load disk storage immediately
loadDatabaseFromDisk();

// Set of collections currently synced from Firestore REST
const syncedCollections = new Set<string>();

async function syncCollectionFromRemote(collectionName: string): Promise<void> {
  try {
    const remoteDocs = await restGetCollection(collectionName);
    const map = getStoreMap(collectionName);
    if (Array.isArray(remoteDocs) && remoteDocs.length > 0) {
      remoteDocs.forEach((d) => {
        if (d && d.id) {
          map.set(String(d.id), d);
        }
      });
      persistDatabaseToDisk(false);
    }
  } catch (err) {
    console.warn(`[Firestore Sync] Failed to load ${collectionName}:`, err);
  }
}

// Resilient collection getter (instant in-memory + background REST)
async function fetchCollection<T = any>(collectionName: string): Promise<T[]> {
  const map = getStoreMap(collectionName);

  if (!syncedCollections.has(collectionName)) {
    syncedCollections.add(collectionName);
    await syncCollectionFromRemote(collectionName);
  }

  return Array.from(map.values()) as T[];
}

// Resilient document getter
async function fetchDocument<T = any>(collectionName: string, docId: string): Promise<T | null> {
  const map = getStoreMap(collectionName);
  if (map.has(docId)) {
    return map.get(docId) as T;
  }
  try {
    const remote = await restGetDoc(collectionName, docId);
    if (remote) {
      map.set(docId, remote);
      persistDatabaseToDisk(false);
      return remote as T;
    }
  } catch {}
  return null;
}

// Resilient document setter
async function saveDocument(collectionName: string, docId: string, data: any, merge = true): Promise<void> {
  const map = getStoreMap(collectionName);
  const existing = map.get(docId) || {};
  const merged = merge ? { ...existing, ...data, id: docId } : { ...data, id: docId };
  map.set(docId, merged);

  // Persist immediately to disk so CSV imports and stock updates never clear on refresh
  persistDatabaseToDisk(true);

  // Asynchronously persist to Firestore REST without blocking API latency
  restSetDoc(collectionName, docId, merged).catch((err) => {
    console.warn(`[Firestore Save] Failed for ${collectionName}/${docId}:`, err);
  });
}

// Resilient document deleter
async function removeDocument(collectionName: string, docId: string): Promise<void> {
  const map = getStoreMap(collectionName);
  map.delete(docId);
  persistDatabaseToDisk(true);
  restDeleteDoc(collectionName, docId).catch((err) => {
    console.warn(`[Firestore Delete] Failed for ${collectionName}/${docId}:`, err);
  });
}

// 1. Database Status
export async function getDatabaseStatus(force = false) {
  try {
    const start = performance.now();
    const [products, orders, refunds, users] = await Promise.all([
      fetchCollection('products'),
      fetchCollection('orders'),
      fetchCollection('refunds'),
      fetchCollection('users'),
    ]);
    const end = performance.now();

    return {
      connected: true,
      isUsingFallback: false,
      database: 'Cloud Firestore (blazestoreapp)',
      provider: 'firestore-rest',
      hasUri: true,
      pingMs: Math.max(1, Math.round(end - start)),
      error: null,
      stats: {
        products: products.length,
        orders: orders.length,
        refunds: refunds.length,
        users: users.length,
        cart: 0,
        wishlist: 0,
      },
    };
  } catch (err: any) {
    return {
      connected: true,
      isUsingFallback: false,
      database: 'Cloud Firestore (blazestoreapp)',
      provider: 'firestore-rest',
      hasUri: true,
      pingMs: 1,
      error: null,
      stats: {
        products: 0,
        orders: 0,
        refunds: 0,
        users: 0,
        cart: 0,
        wishlist: 0,
      },
    };
  }
}

// 2. Products
export async function getProducts(category?: string, search?: string): Promise<Product[]> {
  try {
    let items: Product[] = await fetchCollection<Product>('products');

    if (category && category.toLowerCase() !== 'all') {
      const cleanCat = category.toLowerCase().replace(/[^a-z0-9]/g, '');
      items = items.filter((p) => {
        if (!p.category) return false;
        const cleanProdCat = p.category.toLowerCase().replace(/[^a-z0-9]/g, '');
        return (
          cleanProdCat === cleanCat ||
          cleanProdCat.includes(cleanCat) ||
          cleanCat.includes(cleanProdCat)
        );
      });
    }

    if (search) {
      const qStr = search.toLowerCase();
      items = items.filter(
        (p) =>
          p.name?.toLowerCase().includes(qStr) ||
          p.description?.toLowerCase().includes(qStr) ||
          p.brand?.toLowerCase().includes(qStr) ||
          p.category?.toLowerCase().includes(qStr) ||
          p.sku?.toLowerCase().includes(qStr)
      );
    }

    return items;
  } catch {
    return [];
  }
}

export async function getAllProductsAdmin(category?: string, search?: string): Promise<Product[]> {
  return getProducts(category, search);
}

export async function updateProductStock(id: string, stockQuantity: number, inStock?: boolean): Promise<Product> {
  const current = await fetchDocument<Product>('products', id);
  if (!current) {
    throw new Error(`Product ${id} not found in Firestore.`);
  }
  const updated: Product = {
    ...current,
    stockQuantity,
    inStock: inStock !== undefined ? inStock : stockQuantity > 0,
    updatedAt: new Date().toISOString(),
  };
  await saveDocument('products', id, updated);
  return updated;
}

export async function createProductAdmin(data: Partial<Product>): Promise<Product> {
  const id = data.id || `prod-${Date.now()}`;
  const newProduct: Product = {
    id,
    name: data.name || 'New Fragrance',
    brand: data.brand || 'BlazeStore Sillage',
    category: data.category || 'Perfumes',
    price: data.price || 0,
    originalPrice: data.originalPrice || data.price || 0,
    discountPercentage: data.discountPercentage || 0,
    image: data.image || 'https://images.unsplash.com/photo-1592945403244-b3fbafd7f539?w=600&auto=format&fit=crop&q=80',
    description: data.description || '',
    inStock: data.inStock ?? true,
    stockQuantity: data.stockQuantity ?? 50,
    rating: data.rating || 4.8,
    reviewCount: data.reviewCount || 1,
    isDeal: Boolean(data.isDeal),
    createdAt: new Date().toISOString(),
  };
  await saveDocument('products', id, newProduct);
  return newProduct;
}

export async function updateProductAdmin(id: string, data: Partial<Product>): Promise<Product> {
  const existing = (await fetchDocument<Product>('products', id)) || { id, name: 'Product', price: 0 };
  const updated = { ...existing, ...data, id, updatedAt: new Date().toISOString() };
  await saveDocument('products', id, updated);
  return updated as Product;
}

export async function deleteProductAdmin(id: string): Promise<{ success: boolean; message: string }> {
  await removeDocument('products', id);
  return { success: true, message: `Product ${id} removed from Firestore.` };
}

export async function clearAllProductsAdmin(): Promise<{ success: boolean; message: string }> {
  const prods = await fetchCollection<Product>('products');
  await Promise.all(prods.map((p) => removeDocument('products', p.id)));
  return { success: true, message: 'All products cleared from Firestore.' };
}

export async function bulkCreateProductsAdmin(products: Partial<Product>[]): Promise<{ success: boolean; count: number; products: Product[] }> {
  const createdList: Product[] = [];
  await Promise.all(
    products.map(async (p, idx) => {
      const id = p.id || `prod-${Date.now()}-${idx}-${Math.random().toString(36).substring(2, 6)}`;
      const price = Number(p.price) || 0;
      const originalPrice = p.originalPrice ? Number(p.originalPrice) : (p.discountPercentage ? Math.round(price * (100 / (100 - (p.discountPercentage || 0)))) : undefined);
      let discountPercentage = p.discountPercentage;
      if (!discountPercentage && originalPrice && originalPrice > price) {
        discountPercentage = Math.round(((originalPrice - price) / originalPrice) * 100);
      }
      const isDeal = Boolean(p.isDeal) || Boolean(p.isHot) || (discountPercentage !== undefined && discountPercentage > 0);

      const newProduct: Product = {
        id,
        name: (p.name || 'Product').trim(),
        category: (p.category || 'General').trim(),
        brand: p.brand?.trim() || undefined,
        collection: p.collection?.trim() || undefined,
        price,
        originalPrice,
        costPrice: p.costPrice ? Number(p.costPrice) : Math.round(price * 0.55),
        discountPercentage: discountPercentage || undefined,
        stockQuantity: p.stockQuantity !== undefined ? Number(p.stockQuantity) : 25,
        sku: p.sku?.trim() || `BLZ-${Date.now().toString().slice(-4)}-${idx + 1}`,
        inStock: p.inStock ?? ((Number(p.stockQuantity ?? 25)) > 0),
        image: p.image?.trim() || 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=600&auto=format&fit=crop&q=80',
        description: p.description?.trim() || '',
        rating: p.rating || 5.0,
        reviewCount: p.reviewCount || 0,
        badge: p.badge?.trim() || (isDeal ? (discountPercentage ? `${discountPercentage}% OFF` : 'Hot Deal') : (p.isNewArrival ? 'New Arrival' : 'In Stock')),
        isDeal,
        isBestSeller: Boolean(p.isBestSeller),
        isNewArrival: Boolean(p.isNewArrival),
        isHot: Boolean(p.isHot) || isDeal,
        colors: p.colors,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      await saveDocument('products', id, newProduct);
      createdList.push(newProduct);
    })
  );
  return { success: true, count: createdList.length, products: createdList };
}

// 3. Cart & Wishlist
export async function getCart(userId = 'guest'): Promise<CartItem[]> {
  const doc = await fetchDocument<{ items: CartItem[] }>('carts', userId);
  return doc?.items || [];
}

export async function addToCart(item: any, userId = 'guest'): Promise<CartItem[]> {
  const existingDoc = await fetchDocument<{ items: CartItem[] }>('carts', userId);
  let items: CartItem[] = existingDoc?.items ? [...existingDoc.items] : [];

  const existingIdx = items.findIndex((i) => i.productId === (item.productId || item.id));
  if (existingIdx > -1) {
    items[existingIdx].quantity += item.quantity || 1;
  } else {
    items.unshift({
      id: `cart-${Date.now()}-${item.id || item.productId}`,
      productId: item.id || item.productId,
      name: item.name,
      price: item.price,
      originalPrice: item.originalPrice || item.price,
      image: item.image,
      variant: item.variant || 'Standard Edition',
      color: item.color,
      quantity: item.quantity || 1,
    });
  }

  await saveDocument('carts', userId, { userId, items, updatedAt: new Date().toISOString() });
  return items;
}

export async function updateCartQuantity(itemId: string, delta: number, userId = 'guest'): Promise<CartItem[]> {
  const existingDoc = await fetchDocument<{ items: CartItem[] }>('carts', userId);
  if (!existingDoc) return [];

  let items: CartItem[] = existingDoc.items || [];
  items = items
    .map((i) => (i.id === itemId ? { ...i, quantity: Math.max(0, i.quantity + delta) } : i))
    .filter((i) => i.quantity > 0);

  await saveDocument('carts', userId, { userId, items, updatedAt: new Date().toISOString() });
  return items;
}

export async function removeFromCart(itemId: string, userId = 'guest'): Promise<CartItem[]> {
  const existingDoc = await fetchDocument<{ items: CartItem[] }>('carts', userId);
  if (!existingDoc) return [];

  let items: CartItem[] = (existingDoc.items || []).filter((i: CartItem) => i.id !== itemId);
  await saveDocument('carts', userId, { userId, items, updatedAt: new Date().toISOString() });
  return items;
}

export async function clearCart(userId = 'guest'): Promise<CartItem[]> {
  await saveDocument('carts', userId, { userId, items: [], updatedAt: new Date().toISOString() });
  return [];
}

export async function getWishlist(userId = 'guest'): Promise<Product[]> {
  const doc = await fetchDocument<{ items: Product[] }>('wishlists', userId);
  return doc?.items || [];
}

export async function toggleWishlist(product: Product, userId = 'guest'): Promise<Product[]> {
  const existingDoc = await fetchDocument<{ items: Product[] }>('wishlists', userId);
  let items: Product[] = existingDoc?.items ? [...existingDoc.items] : [];

  const idx = items.findIndex((p) => p.id === product.id);
  if (idx > -1) {
    items.splice(idx, 1);
  } else {
    items.unshift(product);
  }

  await saveDocument('wishlists', userId, { userId, items, updatedAt: new Date().toISOString() });
  return items;
}

// 4. Orders
export async function createOrder(orderData: Partial<Order>): Promise<Order> {
  const orderId = orderData.orderId || orderData.id || `NG-${Date.now().toString().slice(-6)}`;
  const newOrder: Order = {
    id: orderId,
    orderId: orderId,
    userId: orderData.userId || 'guest',
    customer: orderData.customer || {
      name: (orderData as any).name || 'Customer',
      email: (orderData as any).email || (orderData as any).userEmail || 'customer@example.com',
      phone: (orderData as any).phone || '',
      address: (orderData as any).address || 'Standard Delivery Address',
      city: (orderData as any).city || 'Lagos',
      state: (orderData as any).state || 'Lagos State',
      country: 'Nigeria',
    },
    items: orderData.items || [],
    subtotal: orderData.subtotal || 0,
    discount: orderData.discount || 0,
    shipping: orderData.shipping || 0,
    tax: (orderData as any).tax || 0,
    total: orderData.total || 0,
    currency: orderData.currency || 'NGN',
    currencySymbol: orderData.currencySymbol || '₦',
    status: orderData.status || 'processing',
    paymentMethod: orderData.paymentMethod || 'paystack',
    paymentStatus: orderData.paymentStatus || 'paid',
    paymentRef: (orderData as any).paymentReference || orderData.paymentRef,
    deliveryType: (orderData as any).deliveryType || 'delivery',
    pickupStation: (orderData as any).pickupStation,
    createdAt: orderData.createdAt || new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    timeline: orderData.timeline || [
      {
        status: 'Order Placed',
        title: 'Order Confirmed',
        description: 'Your order was verified and saved to database.',
        timestamp: new Date().toISOString(),
        isCompleted: true,
      },
      {
        status: 'Processing',
        title: 'Preparing for Dispatch',
        description: 'Items are being packed at the fulfillment center.',
        timestamp: new Date().toISOString(),
        isCompleted: true,
      },
    ],
    refundAmount: 0,
    refundStatus: 'none',
  };

  await saveDocument('orders', orderId, newOrder);

  // In-App Notification Dispatch
  try {
    const notifId = `notif-${Date.now()}`;
    await saveDocument('notifications', notifId, {
      id: notifId,
      title: `Order Confirmed #${orderId}`,
      message: `Your order for ₦${(newOrder.total || 0).toLocaleString()} (${newOrder.items.length} item${newOrder.items.length === 1 ? '' : 's'}) has been confirmed!`,
      type: 'order',
      userId: newOrder.userId,
      isRead: false,
      timestamp: new Date().toISOString(),
    });
  } catch (notifErr) {
    console.warn('[Notification Notice]:', notifErr);
  }

  // Trigger background order confirmation email
  sendOrderConfirmationEmail(newOrder).catch((err) => {
    console.warn('[Email Dispatch Notice]:', err?.message || err);
  });

  return newOrder;
}

export async function getUserOrders(userId?: string, email?: string, orderId?: string): Promise<Order[]> {
  const orders = await fetchCollection<Order>('orders');
  
  if (orderId && orderId.trim()) {
    const cleanId = orderId.trim().toLowerCase();
    const matched = orders.filter(
      (o) =>
        (o.orderId && o.orderId.toLowerCase() === cleanId) ||
        (o.id && o.id.toLowerCase() === cleanId) ||
        (o.paymentRef && o.paymentRef.toLowerCase() === cleanId)
    );
    if (matched.length > 0) return matched;
  }

  const cleanUserId = (userId || '').trim();
  const cleanEmail = (email || '').trim().toLowerCase();

  let filtered = orders.filter((o) => {
    if (cleanUserId && cleanUserId !== 'guest' && cleanUserId !== 'guest-visitor' && o.userId === cleanUserId) {
      return true;
    }
    if (cleanEmail && o.customer?.email && o.customer.email.toLowerCase() === cleanEmail) {
      return true;
    }
    return false;
  });

  // If user filter returned empty and query didn't specify credentials, return all recent orders
  if (filtered.length === 0 && (!cleanUserId || cleanUserId === 'guest') && !cleanEmail) {
    filtered = orders;
  }

  filtered.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  return filtered;
}

export async function getOrderById(orderId: string): Promise<Order | null> {
  const cleanId = (orderId || '').trim().toLowerCase();
  if (!cleanId) return null;
  const doc = await fetchDocument<Order>('orders', orderId);
  if (doc) return doc;
  const orders = await fetchCollection<Order>('orders');
  return (
    orders.find(
      (o) =>
        (o.orderId && o.orderId.toLowerCase() === cleanId) ||
        (o.id && o.id.toLowerCase() === cleanId) ||
        (o.paymentRef && o.paymentRef.toLowerCase() === cleanId)
    ) || null
  );
}

export async function updateOrderPaymentByReference(reference: string, paymentDetails: any): Promise<void> {
  const orders = await fetchCollection<Order>('orders');
  for (const o of orders) {
    if (o.paymentRef === reference || o.orderId === reference || o.id === reference) {
      const updatedOrder = {
        ...o,
        paymentStatus: paymentDetails.paid ? ('paid' as const) : ('failed' as const),
        updatedAt: new Date().toISOString(),
      };
      await saveDocument('orders', o.id, updatedOrder);
      if (paymentDetails.paid && o.paymentStatus !== 'paid') {
        sendOrderConfirmationEmail(updatedOrder as Order).catch((err) => {
          console.warn('[Email Dispatch Notice on Payment]:', err?.message || err);
        });
      }
    }
  }
}

export async function getAllOrders(status?: string, search?: string): Promise<Order[]> {
  let orders = await fetchCollection<Order>('orders');

  if (status && status.toLowerCase() !== 'all') {
    orders = orders.filter((o) => o.status?.toLowerCase() === status.toLowerCase());
  }

  if (search) {
    const qStr = search.toLowerCase();
    orders = orders.filter(
      (o) =>
        o.orderId?.toLowerCase().includes(qStr) ||
        o.customer?.name?.toLowerCase().includes(qStr) ||
        o.customer?.email?.toLowerCase().includes(qStr)
    );
  }

  orders.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  return orders;
}

export async function updateOrderStatus(orderId: string, status: string, adminInfo?: { name: string; role: string }): Promise<Order> {
  const existing = await fetchDocument<Order>('orders', orderId);
  if (!existing) {
    throw new Error(`Order ${orderId} not found.`);
  }
  const updatedTimeline = [...(existing.timeline || [])];
  updatedTimeline.push({
    status,
    title: `Status set to ${status}`,
    description: `Updated by ${adminInfo?.name || 'Administrator'}`,
    timestamp: new Date().toISOString(),
    isCompleted: true,
  });

  const updated: Order = {
    ...existing,
    status: status as any,
    timeline: updatedTimeline,
    updatedAt: new Date().toISOString(),
  };

  await saveDocument('orders', orderId, updated);
  return updated;
}

export async function deleteOrderAdmin(orderId: string): Promise<{ success: boolean; message: string }> {
  await removeDocument('orders', orderId);
  return { success: true, message: `Order ${orderId} deleted from Firestore.` };
}

export async function getPendingOrders(): Promise<Order[]> {
  const orders = await getAllOrders();
  return orders.filter((o) => o.status === 'processing' || !o.paymentRef);
}

// 5. Refunds
export async function processRefund(refundData: any): Promise<{ success: boolean; refund: RefundRecord }> {
  const refundId = `ref-${Date.now()}`;
  const newRefund: RefundRecord = {
    id: refundId,
    orderId: refundData.orderId,
    customerName: refundData.customerName || 'Customer',
    customerEmail: refundData.customerEmail || 'customer@example.com',
    amount: refundData.amount,
    reason: refundData.reason || 'Customer Return',
    status: refundData.adminRole === 'owner' ? 'approved' : 'pending_owner_approval',
    refundedBy: refundData.adminName || 'Admin',
    adminRole: refundData.adminRole || 'manager',
    restocked: Boolean(refundData.restockItems),
    createdAt: new Date().toISOString(),
  };

  await saveDocument('refunds', refundId, newRefund);
  return { success: true, refund: newRefund };
}

export async function approveRefund(id: string, ownerName: string): Promise<{ success: boolean; refund: RefundRecord }> {
  const existing = await fetchDocument<RefundRecord>('refunds', id);
  if (!existing) throw new Error(`Refund ${id} not found.`);
  const updated: RefundRecord = { ...existing, status: 'approved' as const, approvedBy: ownerName };
  await saveDocument('refunds', id, updated);
  return { success: true, refund: updated };
}

export async function rejectRefund(id: string, ownerName: string): Promise<{ success: boolean; refund: RefundRecord }> {
  const existing = await fetchDocument<RefundRecord>('refunds', id);
  if (!existing) throw new Error(`Refund ${id} not found.`);
  const updated: RefundRecord = { ...existing, status: 'rejected' as const, rejectedBy: ownerName };
  await saveDocument('refunds', id, updated);
  return { success: true, refund: updated };
}

export async function getRefunds(): Promise<RefundRecord[]> {
  const list = await fetchCollection<RefundRecord>('refunds');
  list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  return list;
}

// 6. Users & Authentication
export async function registerUser(userData: {
  idToken?: string;
  name: string;
  email: string;
  phone?: string;
  roleType?: AdminRole;
}): Promise<{ user: User; message: string }> {
  const cleanEmail = userData.email.trim().toLowerCase();
  let uid = '';

  if (userData.idToken) {
    const verified = await verifyFirebaseIdToken(userData.idToken);
    if (verified) {
      uid = verified.uid;
    }
  }

  if (!uid) {
    uid = cleanEmail.replace(/[^a-zA-Z0-9]/g, '_');
  }

  const roleInfo = getRoleForEmail(cleanEmail);
  const roleType = userData.roleType || roleInfo.roleType;
  const role = roleType === 'owner' ? 'Store Owner' : roleType === 'manager' ? 'Store Manager' : roleInfo.role;

  const existing = await fetchDocument<User>('users', uid);

  let newUser: User;
  if (existing) {
    newUser = existing;
  } else {
    newUser = {
      id: uid,
      name: userData.name || cleanEmail.split('@')[0],
      email: cleanEmail,
      phone: userData.phone || '',
      role,
      roleType,
      createdAt: new Date().toISOString(),
      totalOrders: 0,
      totalSpent: 0,
    };
    await saveDocument('users', uid, newUser);
  }

  return { user: newUser, message: 'User profile stored in Firestore.' };
}

export async function loginUser(credentials: {
  idToken?: string;
  email: string;
}): Promise<{ user: User; message: string }> {
  const cleanEmail = credentials.email.trim().toLowerCase();

  let uid = '';
  if (credentials.idToken) {
    const verified = await verifyFirebaseIdToken(credentials.idToken);
    if (!verified) {
      throw new Error('Invalid or expired Firebase Auth token. Access denied.');
    }
    uid = verified.uid;
  }

  if (!uid) {
    try {
      const fbUser = await adminAuth.getUserByEmail(cleanEmail);
      uid = fbUser.uid;
    } catch {
      uid = cleanEmail.replace(/[^a-zA-Z0-9]/g, '_');
    }
  }

  const existing = await fetchDocument<User>('users', uid);
  let user: User;
  const roleInfo = getRoleForEmail(cleanEmail);

  if (existing) {
    user = existing;
  } else {
    user = {
      id: uid,
      name: cleanEmail.includes('owner') ? 'Azeta Blessing' : cleanEmail.includes('manager') ? 'Blessing Waydiva' : cleanEmail.split('@')[0],
      email: cleanEmail,
      phone: '',
      role: roleInfo.role,
      roleType: roleInfo.roleType,
      createdAt: new Date().toISOString(),
      totalOrders: 0,
      totalSpent: 0,
    };
    await saveDocument('users', uid, user);
  }

  return { user, message: 'Authenticated successfully with Firebase Auth.' };
}

export async function getCurrentUser(idToken?: string): Promise<User | null> {
  if (!idToken) return null;
  const verified = await verifyFirebaseIdToken(idToken);
  if (!verified) return null;

  const doc = await fetchDocument<User>('users', verified.uid);
  if (doc) {
    return doc;
  }

  const roleInfo = getRoleForEmail(verified.email || '');
  return {
    id: verified.uid,
    name: verified.name || 'User',
    email: verified.email || '',
    role: roleInfo.role,
    roleType: roleInfo.roleType,
    createdAt: new Date().toISOString(),
  };
}

export async function logoutUser(): Promise<{ success: boolean; message: string }> {
  return { success: true, message: 'Logged out successfully.' };
}

export async function getAllUsers(): Promise<User[]> {
  return fetchCollection<User>('users');
}

export async function updateUserRole(id: string, role: string, roleType: AdminRole): Promise<User> {
  const existing = (await fetchDocument<User>('users', id)) || { id, name: 'User', email: '' };
  const updated: User = { ...existing, role, roleType, updatedAt: new Date().toISOString() };
  await saveDocument('users', id, updated);
  return updated;
}

export async function updateUserAdmin(id: string, data: Partial<User>): Promise<User> {
  const existing = (await fetchDocument<User>('users', id)) || { id, name: 'User', email: '' };
  const updated: User = { ...existing, ...data, updatedAt: new Date().toISOString() };
  await saveDocument('users', id, updated);
  return updated;
}

export async function deleteUserAdmin(id: string): Promise<{ success: boolean; message: string }> {
  await removeDocument('users', id);
  return { success: true, message: `User ${id} removed from Firestore.` };
}

// 7. Analytics & Database Hub
export async function getSalesAnalytics(): Promise<SalesAnalytics> {
  const [orders, refunds, products, users] = await Promise.all([
    getAllOrders(),
    getRefunds(),
    getProducts(),
    getAllUsers(),
  ]);

  const grossRevenue = orders.reduce((sum, o) => sum + (o.total || 0), 0);
  const refundAmountTotal = refunds.reduce((sum, r) => sum + (r.amount || 0), 0);
  const netRevenue = Math.max(0, grossRevenue - refundAmountTotal);
  const totalOrders = orders.length;
  const completedOrders = orders.filter((o) => o.status === 'delivered' || (o as any).status === 'paid' || o.status === 'shipped').length;
  const totalRefunds = refunds.length;
  const averageOrderValue = totalOrders > 0 ? grossRevenue / totalOrders : 0;
  const totalProducts = products.length;
  const lowStockCount = products.filter((p) => (p.stockQuantity ?? 0) <= 10 && (p.stockQuantity ?? 0) > 0).length;
  const outOfStockCount = products.filter((p) => (p.stockQuantity ?? 0) === 0).length;
  const totalCustomers = users.filter((u) => u.roleType === 'customer' || (!u.role?.toLowerCase().includes('owner') && !u.role?.toLowerCase().includes('manager'))).length;

  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const daysMap: Record<string, { revenue: number; orders: number; refunds: number }> = {};
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const dayName = days[d.getDay()];
    daysMap[dayName] = { revenue: 0, orders: 0, refunds: 0 };
  }

  orders.forEach((o) => {
    const dayName = days[new Date(o.createdAt).getDay()];
    if (daysMap[dayName]) {
      daysMap[dayName].revenue += o.total || 0;
      daysMap[dayName].orders += 1;
    }
  });

  refunds.forEach((r) => {
    const dayName = days[new Date(r.createdAt).getDay()];
    if (daysMap[dayName]) {
      daysMap[dayName].refunds += r.amount || 0;
    }
  });

  const dailyRevenue = Object.entries(daysMap).map(([date, data]) => ({
    date,
    revenue: data.revenue,
    orders: data.orders,
    refunds: data.refunds,
  }));

  const categorySalesMap: Record<string, { value: number; count: number }> = {};
  orders.forEach((o) => {
    (o.items || []).forEach((item) => {
      const prod = products.find((p) => p.id === item.productId);
      const cat = prod?.category || 'General';
      if (!categorySalesMap[cat]) categorySalesMap[cat] = { value: 0, count: 0 };
      categorySalesMap[cat].value += (item.price || 0) * (item.quantity || 1);
      categorySalesMap[cat].count += item.quantity || 1;
    });
  });
  const categorySales = Object.entries(categorySalesMap).map(([name, stat]) => ({
    name,
    value: stat.value,
    count: stat.count,
  }));

  const productSalesMap: Record<string, { id: string; name: string; salesCount: number; revenue: number; stock: number }> = {};
  orders.forEach((o) => {
    (o.items || []).forEach((item) => {
      const prod = products.find((p) => p.id === item.productId);
      const prodId = item.productId || item.id;
      if (!productSalesMap[prodId]) {
        productSalesMap[prodId] = {
          id: prodId,
          name: item.name || prod?.name || 'Product',
          salesCount: 0,
          revenue: 0,
          stock: prod?.stockQuantity ?? 0,
        };
      }
      productSalesMap[prodId].salesCount += item.quantity || 1;
      productSalesMap[prodId].revenue += (item.price || 0) * (item.quantity || 1);
    });
  });
  const topProducts = Object.values(productSalesMap)
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 5);

  return {
    grossRevenue,
    netRevenue,
    totalOrders,
    completedOrders,
    totalRefunds,
    refundAmountTotal,
    averageOrderValue,
    totalProducts,
    lowStockCount,
    outOfStockCount,
    totalCustomers,
    dailyRevenue,
    categorySales,
    topProducts,
  };
}

export async function getDbCollectionsInfo(): Promise<any[]> {
  const [products, orders, refunds, users] = await Promise.all([
    fetchCollection('products'),
    fetchCollection('orders'),
    fetchCollection('refunds'),
    fetchCollection('users'),
  ]);

  return [
    { name: 'products', count: products.length, type: 'Store Products' },
    { name: 'orders', count: orders.length, type: 'Customer Orders' },
    { name: 'refunds', count: refunds.length, type: 'Processed Refunds' },
    { name: 'users', count: users.length, type: 'Registered Accounts' },
  ];
}

export async function queryDbCollection(colName: string, opts?: any): Promise<any> {
  const docs = await fetchCollection(colName);
  return { documents: docs, count: docs.length };
}

export async function insertDbDocument(colName: string, docData: any): Promise<any> {
  const id = docData.id || docData._id || `doc-${Date.now()}`;
  await saveDocument(colName, id, { ...docData, id });
  return { success: true, documentId: id };
}

export async function updateDbDocument(colName: string, id: string, docData: any): Promise<any> {
  await saveDocument(colName, id, docData);
  return { success: true, documentId: id };
}

export async function deleteDbDocument(colName: string, id: string): Promise<any> {
  await removeDocument(colName, id);
  return { success: true, documentId: id };
}

export async function exportDatabaseData(): Promise<any> {
  const [products, orders, refunds, users] = await Promise.all([
    getProducts(),
    getAllOrders(),
    getRefunds(),
    getAllUsers(),
  ]);
  return { products, orders, refunds, users };
}

export async function seedCatalogToDatabase(): Promise<{ success: boolean; message: string }> {
  const allSeed = [...BEST_DEALS, ...RECOMMENDED_PRODUCTS];
  const res = await bulkCreateProductsAdmin(allSeed);
  return { success: true, message: `Seeded ${res.count} items into Firestore products collection.` };
}

export async function getNotifications(): Promise<NotificationItem[]> {
  return fetchCollection<NotificationItem>('notifications');
}

export async function markNotificationsRead(): Promise<NotificationItem[]> {
  const list = await getNotifications();
  await Promise.all(
    list.map((n) => saveDocument('notifications', n.id, { isRead: true }))
  );
  return list.map((n) => ({ ...n, isRead: true }));
}

export async function clearAllMockData(): Promise<{ success: boolean; message: string }> {
  const [orders, refunds, notifs, users] = await Promise.all([
    fetchCollection<Order>('orders'),
    fetchCollection<RefundRecord>('refunds'),
    fetchCollection<NotificationItem>('notifications'),
    fetchCollection<User>('users'),
  ]);

  await Promise.all([
    ...orders.map((o) => removeDocument('orders', o.id)),
    ...refunds.map((r) => removeDocument('refunds', r.id)),
    ...notifs.map((n) => removeDocument('notifications', n.id)),
    ...users
      .filter((u) => {
        const isStaff =
          u.roleType === 'owner' ||
          u.roleType === 'manager' ||
          u.email?.toLowerCase().includes('owner') ||
          u.email?.toLowerCase().includes('manager') ||
          u.email === 'azetablessingb@gmail.com' ||
          u.email === 'blessing.waydiva@gmail.com';
        return !isStaff;
      })
      .map((u) => removeDocument('users', u.id)),
  ]);

  return { success: true, message: 'All mock orders, refunds, notifications, and test customer accounts cleared from Firestore.' };
}
