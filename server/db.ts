import { firestoreDb } from './firebase';
import {
  collection,
  doc,
  getDocs,
  getDoc,
  setDoc,
  deleteDoc,
  query,
  limit,
  writeBatch
} from 'firebase/firestore';
import { Product, CartItem, NotificationItem, User, Order, RefundRecord, AdminRole } from '../src/types';
import { generateJwtToken, verifyJwtToken } from './auth';
import { BEST_DEALS, RECOMMENDED_PRODUCTS } from '../src/data/mockData';

// Helper to determine admin roles based on email
export function getRoleForEmail(email: string): { role: string; roleType: AdminRole } {
  const clean = (email || '').trim().toLowerCase();
  if (
    clean === 'azetablessingb@gmail.com' ||
    clean === 'owner@blazestore.com' ||
    clean.startsWith('owner@') ||
    clean.includes('storeowner')
  ) {
    return { role: 'Store Owner', roleType: 'owner' };
  }
  if (
    clean === 'blessing.waydiva@gmail.com' ||
    clean === 'manager@blazestore.com' ||
    clean.startsWith('manager@') ||
    clean.includes('storemanager')
  ) {
    return { role: 'Store Manager', roleType: 'manager' };
  }
  return { role: 'Customer', roleType: 'customer' };
}

// 1. Database Status
export async function getDatabaseStatus(force = false) {
  try {
    const colRef = collection(firestoreDb, 'products');
    const q = query(colRef, limit(1));
    const start = performance.now();
    await getDocs(q);
    const end = performance.now();
    return {
      connected: true,
      isUsingFallback: false,
      database: 'Cloud Firestore (BlazeStore)',
      provider: 'firestore',
      hasUri: true,
      pingMs: Math.max(1, Math.round(end - start)),
      error: null,
    };
  } catch (err: any) {
    return {
      connected: false,
      isUsingFallback: false,
      database: 'Cloud Firestore (BlazeStore)',
      provider: 'firestore',
      hasUri: true,
      pingMs: 0,
      error: err?.message || '503 Service Unavailable: Firestore connection failed',
    };
  }
}

// 2. Products
export async function getProducts(category?: string, search?: string): Promise<Product[]> {
  try {
    const colRef = collection(firestoreDb, 'products');
    const snap = await getDocs(colRef);
    let items: Product[] = [];
    snap.forEach((d) => items.push({ ...(d.data() as Product), id: d.id }));

    if (items.length === 0) {
      items = [...BEST_DEALS, ...RECOMMENDED_PRODUCTS];
    }

    if (category && category.toLowerCase() !== 'all') {
      items = items.filter((p) => p.category?.toLowerCase() === category.toLowerCase());
    }

    if (search) {
      const qStr = search.toLowerCase();
      items = items.filter(
        (p) =>
          p.name.toLowerCase().includes(qStr) ||
          p.description?.toLowerCase().includes(qStr) ||
          p.brand?.toLowerCase().includes(qStr)
      );
    }

    return items;
  } catch (err: any) {
    console.warn('[Firestore] getProducts fallback to catalog:', err?.message);
    return [...BEST_DEALS, ...RECOMMENDED_PRODUCTS];
  }
}

export async function getAllProductsAdmin(category?: string, search?: string): Promise<Product[]> {
  return getProducts(category, search);
}

export async function updateProductStock(id: string, stockQuantity: number, inStock?: boolean): Promise<Product> {
  const docRef = doc(firestoreDb, 'products', id);
  const snap = await getDoc(docRef);
  if (!snap.exists()) {
    throw new Error(`Product ${id} not found in Firestore.`);
  }
  const current = snap.data() as Product;
  const updated: Product = {
    ...current,
    stockQuantity,
    inStock: inStock !== undefined ? inStock : stockQuantity > 0,
    updatedAt: new Date().toISOString(),
  };
  await setDoc(docRef, updated, { merge: true });
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
  await setDoc(doc(firestoreDb, 'products', id), newProduct);
  return newProduct;
}

export async function updateProductAdmin(id: string, data: Partial<Product>): Promise<Product> {
  const docRef = doc(firestoreDb, 'products', id);
  const snap = await getDoc(docRef);
  const existing = snap.exists() ? (snap.data() as Product) : { id, name: 'Product', price: 0 };
  const updated = { ...existing, ...data, id, updatedAt: new Date().toISOString() };
  await setDoc(docRef, updated, { merge: true });
  return updated as Product;
}

export async function deleteProductAdmin(id: string): Promise<{ success: boolean; message: string }> {
  await deleteDoc(doc(firestoreDb, 'products', id));
  return { success: true, message: `Product ${id} removed from Firestore.` };
}

export async function clearAllProductsAdmin(): Promise<{ success: boolean; message: string }> {
  const snap = await getDocs(collection(firestoreDb, 'products'));
  const batch = writeBatch(firestoreDb);
  snap.docs.forEach((d) => batch.delete(d.ref));
  await batch.commit();
  return { success: true, message: 'All products cleared from Firestore.' };
}

export async function bulkCreateProductsAdmin(products: Partial<Product>[]): Promise<{ success: boolean; count: number }> {
  const batch = writeBatch(firestoreDb);
  let count = 0;
  products.forEach((p) => {
    const id = p.id || `prod-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    const docRef = doc(firestoreDb, 'products', id);
    batch.set(docRef, { ...p, id, createdAt: new Date().toISOString() }, { merge: true });
    count++;
  });
  await batch.commit();
  return { success: true, count };
}

// 3. Cart & Wishlist
export async function getCart(userId = 'guest'): Promise<CartItem[]> {
  const docRef = doc(firestoreDb, 'carts', userId);
  const snap = await getDoc(docRef);
  if (snap.exists()) {
    return snap.data().items || [];
  }
  return [];
}

export async function addToCart(item: any, userId = 'guest'): Promise<CartItem[]> {
  const docRef = doc(firestoreDb, 'carts', userId);
  const snap = await getDoc(docRef);
  let items: CartItem[] = snap.exists() ? snap.data().items || [] : [];

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

  await setDoc(docRef, { userId, items, updatedAt: new Date().toISOString() }, { merge: true });
  return items;
}

export async function updateCartQuantity(itemId: string, delta: number, userId = 'guest'): Promise<CartItem[]> {
  const docRef = doc(firestoreDb, 'carts', userId);
  const snap = await getDoc(docRef);
  if (!snap.exists()) return [];

  let items: CartItem[] = snap.data().items || [];
  items = items
    .map((i) => (i.id === itemId ? { ...i, quantity: Math.max(0, i.quantity + delta) } : i))
    .filter((i) => i.quantity > 0);

  await setDoc(docRef, { userId, items, updatedAt: new Date().toISOString() }, { merge: true });
  return items;
}

export async function removeFromCart(itemId: string, userId = 'guest'): Promise<CartItem[]> {
  const docRef = doc(firestoreDb, 'carts', userId);
  const snap = await getDoc(docRef);
  if (!snap.exists()) return [];

  let items: CartItem[] = (snap.data().items || []).filter((i: CartItem) => i.id !== itemId);
  await setDoc(docRef, { userId, items, updatedAt: new Date().toISOString() }, { merge: true });
  return items;
}

export async function clearCart(userId = 'guest'): Promise<CartItem[]> {
  const docRef = doc(firestoreDb, 'carts', userId);
  await setDoc(docRef, { userId, items: [], updatedAt: new Date().toISOString() }, { merge: true });
  return [];
}

export async function getWishlist(userId = 'guest'): Promise<Product[]> {
  const docRef = doc(firestoreDb, 'wishlists', userId);
  const snap = await getDoc(docRef);
  if (snap.exists()) {
    return snap.data().items || [];
  }
  return [];
}

export async function toggleWishlist(product: Product, userId = 'guest'): Promise<Product[]> {
  const docRef = doc(firestoreDb, 'wishlists', userId);
  const snap = await getDoc(docRef);
  let items: Product[] = snap.exists() ? snap.data().items || [] : [];

  const idx = items.findIndex((p) => p.id === product.id);
  if (idx > -1) {
    items.splice(idx, 1);
  } else {
    items.unshift(product);
  }

  await setDoc(docRef, { userId, items, updatedAt: new Date().toISOString() }, { merge: true });
  return items;
}

// 4. Orders
export async function createOrder(orderData: Partial<Order>): Promise<Order> {
  const orderId = orderData.id || `BLZ-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`;
  const newOrder: Order = {
    id: orderId,
    orderId: orderData.orderId || orderId,
    userId: orderData.userId || 'guest',
    customer: orderData.customer || {
      name: 'Customer',
      email: 'customer@example.com',
    },
    items: orderData.items || [],
    subtotal: orderData.subtotal || 0,
    discount: orderData.discount || 0,
    shipping: orderData.shipping || 0,
    total: orderData.total || 0,
    status: orderData.status || 'processing',
    paymentMethod: orderData.paymentMethod || 'paystack',
    paymentRef: orderData.paymentRef,
    createdAt: orderData.createdAt || new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    timeline: orderData.timeline || [
      {
        status: 'Order Placed',
        title: 'Order Confirmed',
        description: 'Your order was verified and saved to Firestore.',
        timestamp: new Date().toISOString(),
        isCompleted: true,
      },
    ],
    refundAmount: 0,
    refundStatus: 'none',
  };

  await setDoc(doc(firestoreDb, 'orders', orderId), newOrder);
  return newOrder;
}

export async function updateOrderPaymentByReference(reference: string, paymentDetails: any): Promise<void> {
  const colRef = collection(firestoreDb, 'orders');
  const snap = await getDocs(colRef);
  snap.forEach((d) => {
    const data = d.data() as Order;
    if (data.paymentRef === reference || data.orderId === reference || d.id === reference) {
      setDoc(doc(firestoreDb, 'orders', d.id), {
        ...data,
        paymentStatus: paymentDetails.paid ? 'paid' : 'failed',
        updatedAt: new Date().toISOString(),
      }, { merge: true });
    }
  });
}

export async function getAllOrders(status?: string, search?: string): Promise<Order[]> {
  const colRef = collection(firestoreDb, 'orders');
  const snap = await getDocs(colRef);
  let orders: Order[] = [];
  snap.forEach((d) => orders.push({ ...(d.data() as Order), id: d.id }));

  if (status && status.toLowerCase() !== 'all') {
    orders = orders.filter((o) => o.status?.toLowerCase() === status.toLowerCase());
  }

  if (search) {
    const qStr = search.toLowerCase();
    orders = orders.filter(
      (o) =>
        o.orderId.toLowerCase().includes(qStr) ||
        o.customer.name.toLowerCase().includes(qStr) ||
        o.customer.email.toLowerCase().includes(qStr)
    );
  }

  orders.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  return orders;
}

export async function updateOrderStatus(orderId: string, status: string, adminInfo?: { name: string; role: string }): Promise<Order> {
  const docRef = doc(firestoreDb, 'orders', orderId);
  const snap = await getDoc(docRef);
  if (!snap.exists()) {
    throw new Error(`Order ${orderId} not found.`);
  }
  const existing = snap.data() as Order;
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

  await setDoc(docRef, updated, { merge: true });
  return updated;
}

export async function deleteOrderAdmin(orderId: string): Promise<{ success: boolean; message: string }> {
  await deleteDoc(doc(firestoreDb, 'orders', orderId));
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

  await setDoc(doc(firestoreDb, 'refunds', refundId), newRefund);
  return { success: true, refund: newRefund };
}

export async function approveRefund(id: string, ownerName: string): Promise<{ success: boolean; refund: RefundRecord }> {
  const docRef = doc(firestoreDb, 'refunds', id);
  const snap = await getDoc(docRef);
  if (!snap.exists()) throw new Error(`Refund ${id} not found.`);
  const updated = { ...(snap.data() as RefundRecord), status: 'approved' as const, approvedBy: ownerName };
  await setDoc(docRef, updated, { merge: true });
  return { success: true, refund: updated };
}

export async function rejectRefund(id: string, ownerName: string): Promise<{ success: boolean; refund: RefundRecord }> {
  const docRef = doc(firestoreDb, 'refunds', id);
  const snap = await getDoc(docRef);
  if (!snap.exists()) throw new Error(`Refund ${id} not found.`);
  const updated = { ...(snap.data() as RefundRecord), status: 'rejected' as const, rejectedBy: ownerName };
  await setDoc(docRef, updated, { merge: true });
  return { success: true, refund: updated };
}

export async function getRefunds(): Promise<RefundRecord[]> {
  const snap = await getDocs(collection(firestoreDb, 'refunds'));
  const list: RefundRecord[] = [];
  snap.forEach((d) => list.push({ ...(d.data() as RefundRecord), id: d.id }));
  list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  return list;
}

// 6. Users & Authentication
export async function registerUser(userData: {
  name: string;
  email: string;
  password?: string;
  phone?: string;
  roleType?: AdminRole;
}): Promise<{ user: User; token?: string; message: string }> {
  const cleanEmail = userData.email.trim().toLowerCase();
  const roleInfo = getRoleForEmail(cleanEmail);
  const roleType = userData.roleType || roleInfo.roleType;
  const role = roleType === 'owner' ? 'Store Owner' : roleType === 'manager' ? 'Store Manager' : roleInfo.role;

  const docId = cleanEmail.replace(/[^a-zA-Z0-9]/g, '_');
  const userDocRef = doc(firestoreDb, 'users', docId);
  const newUser: User = {
    id: docId,
    name: userData.name,
    email: cleanEmail,
    phone: userData.phone || '',
    role,
    roleType,
    createdAt: new Date().toISOString(),
    totalOrders: 0,
    totalSpent: 0,
  };

  await setDoc(userDocRef, newUser, { merge: true });

  const token = generateJwtToken({
    id: newUser.id,
    email: newUser.email,
    name: newUser.name,
    role: newUser.role,
    roleType: newUser.roleType,
  });

  return { user: newUser, token, message: 'User profile stored in Firestore.' };
}

export async function loginUser(credentials: { email: string; password?: string }): Promise<{ user: User; token?: string; message: string }> {
  const cleanEmail = credentials.email.trim().toLowerCase();
  const roleInfo = getRoleForEmail(cleanEmail);

  const docId = cleanEmail.replace(/[^a-zA-Z0-9]/g, '_');
  const userDocRef = doc(firestoreDb, 'users', docId);
  const snap = await getDoc(userDocRef);

  let user: User;
  if (snap.exists()) {
    user = snap.data() as User;
  } else {
    user = {
      id: docId,
      name: cleanEmail.includes('owner') ? 'Azeta Blessing' : cleanEmail.includes('manager') ? 'Blessing Waydiva' : cleanEmail.split('@')[0],
      email: cleanEmail,
      phone: '',
      role: roleInfo.role,
      roleType: roleInfo.roleType,
      createdAt: new Date().toISOString(),
      totalOrders: 0,
      totalSpent: 0,
    };
    await setDoc(userDocRef, user);
  }

  const token = generateJwtToken({
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    roleType: user.roleType,
  });

  return { user, token, message: 'Logged in successfully.' };
}

export async function getCurrentUser(token?: string): Promise<User | null> {
  if (!token) return null;
  const payload = verifyJwtToken(token);
  if (!payload) return null;

  const docId = payload.email.replace(/[^a-zA-Z0-9]/g, '_');
  const snap = await getDoc(doc(firestoreDb, 'users', docId));
  if (snap.exists()) {
    return snap.data() as User;
  }

  return {
    id: payload.id,
    name: payload.name,
    email: payload.email,
    role: payload.role,
    roleType: payload.roleType as AdminRole,
    createdAt: new Date().toISOString(),
  };
}

export async function logoutUser(): Promise<{ success: boolean; message: string }> {
  return { success: true, message: 'Logged out successfully.' };
}

export async function getAllUsers(): Promise<User[]> {
  const snap = await getDocs(collection(firestoreDb, 'users'));
  const users: User[] = [];
  snap.forEach((d) => users.push({ ...(d.data() as User), id: d.id }));
  return users;
}

export async function updateUserRole(id: string, role: string, roleType: AdminRole): Promise<User> {
  const docRef = doc(firestoreDb, 'users', id);
  const snap = await getDoc(docRef);
  const existing = snap.exists() ? (snap.data() as User) : { id, name: 'User', email: '' };
  const updated = { ...existing, role, roleType, updatedAt: new Date().toISOString() };
  await setDoc(docRef, updated, { merge: true });
  return updated as User;
}

export async function updateUserAdmin(id: string, data: Partial<User>): Promise<User> {
  const docRef = doc(firestoreDb, 'users', id);
  const snap = await getDoc(docRef);
  const existing = snap.exists() ? (snap.data() as User) : { id, name: 'User', email: '' };
  const updated = { ...existing, ...data, updatedAt: new Date().toISOString() };
  await setDoc(docRef, updated, { merge: true });
  return updated as User;
}

export async function deleteUserAdmin(id: string): Promise<{ success: boolean; message: string }> {
  await deleteDoc(doc(firestoreDb, 'users', id));
  return { success: true, message: `User ${id} removed from Firestore.` };
}

// 7. Analytics & Database Hub
export async function getSalesAnalytics(): Promise<any> {
  const orders = await getAllOrders();
  const totalRevenue = orders.reduce((sum, o) => sum + (o.total || 0), 0);
  const totalOrders = orders.length;

  return {
    totalRevenue,
    totalOrders,
    averageOrderValue: totalOrders > 0 ? totalRevenue / totalOrders : 0,
    recentOrdersCount: orders.length,
  };
}

export async function getDbCollectionsInfo(): Promise<any[]> {
  const [pSnap, oSnap, rSnap, uSnap] = await Promise.all([
    getDocs(collection(firestoreDb, 'products')).catch(() => ({ size: 0 })),
    getDocs(collection(firestoreDb, 'orders')).catch(() => ({ size: 0 })),
    getDocs(collection(firestoreDb, 'refunds')).catch(() => ({ size: 0 })),
    getDocs(collection(firestoreDb, 'users')).catch(() => ({ size: 0 })),
  ]);

  return [
    { name: 'products', count: pSnap.size, type: 'Firestore Collection' },
    { name: 'orders', count: oSnap.size, type: 'Firestore Collection' },
    { name: 'refunds', count: rSnap.size, type: 'Firestore Collection' },
    { name: 'users', count: uSnap.size, type: 'Firestore Collection' },
  ];
}

export async function queryDbCollection(colName: string, opts: any): Promise<any> {
  const snap = await getDocs(collection(firestoreDb, colName));
  const docs: any[] = [];
  snap.forEach((d) => docs.push({ _id: d.id, id: d.id, ...d.data() }));
  return { documents: docs, count: docs.length };
}

export async function insertDbDocument(colName: string, docData: any): Promise<any> {
  const id = docData.id || docData._id || `doc-${Date.now()}`;
  await setDoc(doc(firestoreDb, colName, id), { ...docData, id });
  return { success: true, documentId: id };
}

export async function updateDbDocument(colName: string, id: string, docData: any): Promise<any> {
  await setDoc(doc(firestoreDb, colName, id), docData, { merge: true });
  return { success: true, documentId: id };
}

export async function deleteDbDocument(colName: string, id: string): Promise<any> {
  await deleteDoc(doc(firestoreDb, colName, id));
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
  const snap = await getDocs(collection(firestoreDb, 'notifications'));
  const list: NotificationItem[] = [];
  snap.forEach((d) => list.push({ ...(d.data() as NotificationItem), id: d.id }));
  return list;
}

export async function markNotificationsRead(): Promise<NotificationItem[]> {
  const list = await getNotifications();
  const batch = writeBatch(firestoreDb);
  list.forEach((n) => {
    batch.set(doc(firestoreDb, 'notifications', n.id), { isRead: true }, { merge: true });
  });
  await batch.commit();
  return list.map((n) => ({ ...n, isRead: true }));
}

export async function clearAllMockData(): Promise<{ success: boolean; message: string }> {
  const batch = writeBatch(firestoreDb);

  const [ordSnap, refSnap] = await Promise.all([
    getDocs(collection(firestoreDb, 'orders')),
    getDocs(collection(firestoreDb, 'refunds')),
  ]);

  ordSnap.forEach((d) => batch.delete(d.ref));
  refSnap.forEach((d) => batch.delete(d.ref));

  await batch.commit();
  return { success: true, message: 'All orders and refunds cleared from Firestore.' };
}
