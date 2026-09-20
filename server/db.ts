import { adminDb, adminAuth } from './firebase';
import { Product, CartItem, NotificationItem, User, Order, RefundRecord, AdminRole } from '../src/types';
import { verifyFirebaseIdToken } from './auth';
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
    const start = performance.now();
    await adminDb.collection('products').limit(1).get();
    const end = performance.now();
    return {
      connected: true,
      isUsingFallback: false,
      database: 'Cloud Firestore Admin (BlazeStore)',
      provider: 'firestore-admin',
      hasUri: true,
      pingMs: Math.max(1, Math.round(end - start)),
      error: null,
    };
  } catch (err: any) {
    return {
      connected: false,
      isUsingFallback: false,
      database: 'Cloud Firestore Admin (BlazeStore)',
      provider: 'firestore-admin',
      hasUri: true,
      pingMs: 0,
      error: err?.message || '503 Service Unavailable: Firestore connection failed',
    };
  }
}

// 2. Products
export async function getProducts(category?: string, search?: string): Promise<Product[]> {
  try {
    const snap = await adminDb.collection('products').get();
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
    console.warn('[Firestore Admin] getProducts fallback to catalog:', err?.message);
    return [...BEST_DEALS, ...RECOMMENDED_PRODUCTS];
  }
}

export async function getAllProductsAdmin(category?: string, search?: string): Promise<Product[]> {
  return getProducts(category, search);
}

export async function updateProductStock(id: string, stockQuantity: number, inStock?: boolean): Promise<Product> {
  const docRef = adminDb.collection('products').doc(id);
  const snap = await docRef.get();
  if (!snap.exists) {
    throw new Error(`Product ${id} not found in Firestore.`);
  }
  const current = snap.data() as Product;
  const updated: Product = {
    ...current,
    stockQuantity,
    inStock: inStock !== undefined ? inStock : stockQuantity > 0,
    updatedAt: new Date().toISOString(),
  };
  await docRef.set(updated, { merge: true });
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
  await adminDb.collection('products').doc(id).set(newProduct);
  return newProduct;
}

export async function updateProductAdmin(id: string, data: Partial<Product>): Promise<Product> {
  const docRef = adminDb.collection('products').doc(id);
  const snap = await docRef.get();
  const existing = snap.exists ? (snap.data() as Product) : { id, name: 'Product', price: 0 };
  const updated = { ...existing, ...data, id, updatedAt: new Date().toISOString() };
  await docRef.set(updated, { merge: true });
  return updated as Product;
}

export async function deleteProductAdmin(id: string): Promise<{ success: boolean; message: string }> {
  await adminDb.collection('products').doc(id).delete();
  return { success: true, message: `Product ${id} removed from Firestore.` };
}

export async function clearAllProductsAdmin(): Promise<{ success: boolean; message: string }> {
  const snap = await adminDb.collection('products').get();
  const batch = adminDb.batch();
  snap.docs.forEach((d) => batch.delete(d.ref));
  await batch.commit();
  return { success: true, message: 'All products cleared from Firestore.' };
}

export async function bulkCreateProductsAdmin(products: Partial<Product>[]): Promise<{ success: boolean; count: number }> {
  const batch = adminDb.batch();
  let count = 0;
  products.forEach((p) => {
    const id = p.id || `prod-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    const docRef = adminDb.collection('products').doc(id);
    batch.set(docRef, { ...p, id, createdAt: new Date().toISOString() }, { merge: true });
    count++;
  });
  await batch.commit();
  return { success: true, count };
}

// 3. Cart & Wishlist
export async function getCart(userId = 'guest'): Promise<CartItem[]> {
  const docRef = adminDb.collection('carts').doc(userId);
  const snap = await docRef.get();
  if (snap.exists) {
    return snap.data()?.items || [];
  }
  return [];
}

export async function addToCart(item: any, userId = 'guest'): Promise<CartItem[]> {
  const docRef = adminDb.collection('carts').doc(userId);
  const snap = await docRef.get();
  let items: CartItem[] = snap.exists ? snap.data()?.items || [] : [];

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

  await docRef.set({ userId, items, updatedAt: new Date().toISOString() }, { merge: true });
  return items;
}

export async function updateCartQuantity(itemId: string, delta: number, userId = 'guest'): Promise<CartItem[]> {
  const docRef = adminDb.collection('carts').doc(userId);
  const snap = await docRef.get();
  if (!snap.exists) return [];

  let items: CartItem[] = snap.data()?.items || [];
  items = items
    .map((i) => (i.id === itemId ? { ...i, quantity: Math.max(0, i.quantity + delta) } : i))
    .filter((i) => i.quantity > 0);

  await docRef.set({ userId, items, updatedAt: new Date().toISOString() }, { merge: true });
  return items;
}

export async function removeFromCart(itemId: string, userId = 'guest'): Promise<CartItem[]> {
  const docRef = adminDb.collection('carts').doc(userId);
  const snap = await docRef.get();
  if (!snap.exists) return [];

  let items: CartItem[] = (snap.data()?.items || []).filter((i: CartItem) => i.id !== itemId);
  await docRef.set({ userId, items, updatedAt: new Date().toISOString() }, { merge: true });
  return items;
}

export async function clearCart(userId = 'guest'): Promise<CartItem[]> {
  const docRef = adminDb.collection('carts').doc(userId);
  await docRef.set({ userId, items: [], updatedAt: new Date().toISOString() }, { merge: true });
  return [];
}

export async function getWishlist(userId = 'guest'): Promise<Product[]> {
  const docRef = adminDb.collection('wishlists').doc(userId);
  const snap = await docRef.get();
  if (snap.exists) {
    return snap.data()?.items || [];
  }
  return [];
}

export async function toggleWishlist(product: Product, userId = 'guest'): Promise<Product[]> {
  const docRef = adminDb.collection('wishlists').doc(userId);
  const snap = await docRef.get();
  let items: Product[] = snap.exists ? snap.data()?.items || [] : [];

  const idx = items.findIndex((p) => p.id === product.id);
  if (idx > -1) {
    items.splice(idx, 1);
  } else {
    items.unshift(product);
  }

  await docRef.set({ userId, items, updatedAt: new Date().toISOString() }, { merge: true });
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

  await adminDb.collection('orders').doc(orderId).set(newOrder);
  return newOrder;
}

export async function updateOrderPaymentByReference(reference: string, paymentDetails: any): Promise<void> {
  const snap = await adminDb.collection('orders').get();
  snap.forEach((d) => {
    const data = d.data() as Order;
    if (data.paymentRef === reference || data.orderId === reference || d.id === reference) {
      adminDb.collection('orders').doc(d.id).set({
        ...data,
        paymentStatus: paymentDetails.paid ? 'paid' : 'failed',
        updatedAt: new Date().toISOString(),
      }, { merge: true });
    }
  });
}

export async function getAllOrders(status?: string, search?: string): Promise<Order[]> {
  const snap = await adminDb.collection('orders').get();
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
  const docRef = adminDb.collection('orders').doc(orderId);
  const snap = await docRef.get();
  if (!snap.exists) {
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

  await docRef.set(updated, { merge: true });
  return updated;
}

export async function deleteOrderAdmin(orderId: string): Promise<{ success: boolean; message: string }> {
  await adminDb.collection('orders').doc(orderId).delete();
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

  await adminDb.collection('refunds').doc(refundId).set(newRefund);
  return { success: true, refund: newRefund };
}

export async function approveRefund(id: string, ownerName: string): Promise<{ success: boolean; refund: RefundRecord }> {
  const docRef = adminDb.collection('refunds').doc(id);
  const snap = await docRef.get();
  if (!snap.exists) throw new Error(`Refund ${id} not found.`);
  const updated = { ...(snap.data() as RefundRecord), status: 'approved' as const, approvedBy: ownerName };
  await docRef.set(updated, { merge: true });
  return { success: true, refund: updated };
}

export async function rejectRefund(id: string, ownerName: string): Promise<{ success: boolean; refund: RefundRecord }> {
  const docRef = adminDb.collection('refunds').doc(id);
  const snap = await docRef.get();
  if (!snap.exists) throw new Error(`Refund ${id} not found.`);
  const updated = { ...(snap.data() as RefundRecord), status: 'rejected' as const, rejectedBy: ownerName };
  await docRef.set(updated, { merge: true });
  return { success: true, refund: updated };
}

export async function getRefunds(): Promise<RefundRecord[]> {
  const snap = await adminDb.collection('refunds').get();
  const list: RefundRecord[] = [];
  snap.forEach((d) => list.push({ ...(d.data() as RefundRecord), id: d.id }));
  list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  return list;
}

// 6. Users & Authentication
// Synchronizes or registers user profile in Firestore after Firebase Auth verification
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

  const userDocRef = adminDb.collection('users').doc(uid);
  const snap = await userDocRef.get();

  let newUser: User;
  if (snap.exists) {
    newUser = snap.data() as User;
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
    await userDocRef.set(newUser, { merge: true });
  }

  return { user: newUser, message: 'User profile stored in Firestore.' };
}

// Verifies Firebase Auth ID Token or profile from Firestore
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
    // If idToken is missing, look up by Firebase Auth user or reject
    try {
      const fbUser = await adminAuth.getUserByEmail(cleanEmail);
      uid = fbUser.uid;
    } catch {
      throw new Error('Authentication required. Please sign in via Firebase Auth.');
    }
  }

  const userDocRef = adminDb.collection('users').doc(uid);
  const snap = await userDocRef.get();

  let user: User;
  const roleInfo = getRoleForEmail(cleanEmail);

  if (snap.exists) {
    user = snap.data() as User;
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
    await userDocRef.set(user);
  }

  return { user, message: 'Authenticated successfully with Firebase Auth.' };
}

export async function getCurrentUser(idToken?: string): Promise<User | null> {
  if (!idToken) return null;
  const verified = await verifyFirebaseIdToken(idToken);
  if (!verified) return null;

  const snap = await adminDb.collection('users').doc(verified.uid).get();
  if (snap.exists) {
    return snap.data() as User;
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
  const snap = await adminDb.collection('users').get();
  const users: User[] = [];
  snap.forEach((d) => users.push({ ...(d.data() as User), id: d.id }));
  return users;
}

export async function updateUserRole(id: string, role: string, roleType: AdminRole): Promise<User> {
  const docRef = adminDb.collection('users').doc(id);
  const snap = await docRef.get();
  const existing = snap.exists ? (snap.data() as User) : { id, name: 'User', email: '' };
  const updated = { ...existing, role, roleType, updatedAt: new Date().toISOString() };
  await docRef.set(updated, { merge: true });
  return updated as User;
}

export async function updateUserAdmin(id: string, data: Partial<User>): Promise<User> {
  const docRef = adminDb.collection('users').doc(id);
  const snap = await docRef.get();
  const existing = snap.exists ? (snap.data() as User) : { id, name: 'User', email: '' };
  const updated = { ...existing, ...data, updatedAt: new Date().toISOString() };
  await docRef.set(updated, { merge: true });
  return updated as User;
}

export async function deleteUserAdmin(id: string): Promise<{ success: boolean; message: string }> {
  await adminDb.collection('users').doc(id).delete();
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
    adminDb.collection('products').get().catch(() => ({ size: 0 })),
    adminDb.collection('orders').get().catch(() => ({ size: 0 })),
    adminDb.collection('refunds').get().catch(() => ({ size: 0 })),
    adminDb.collection('users').get().catch(() => ({ size: 0 })),
  ]);

  return [
    { name: 'products', count: pSnap.size, type: 'Firestore Collection (Admin SDK)' },
    { name: 'orders', count: oSnap.size, type: 'Firestore Collection (Admin SDK)' },
    { name: 'refunds', count: rSnap.size, type: 'Firestore Collection (Admin SDK)' },
    { name: 'users', count: uSnap.size, type: 'Firestore Collection (Admin SDK)' },
  ];
}

export async function queryDbCollection(colName: string, opts: any): Promise<any> {
  const snap = await adminDb.collection(colName).get();
  const docs: any[] = [];
  snap.forEach((d) => docs.push({ _id: d.id, id: d.id, ...d.data() }));
  return { documents: docs, count: docs.length };
}

export async function insertDbDocument(colName: string, docData: any): Promise<any> {
  const id = docData.id || docData._id || `doc-${Date.now()}`;
  await adminDb.collection(colName).doc(id).set({ ...docData, id });
  return { success: true, documentId: id };
}

export async function updateDbDocument(colName: string, id: string, docData: any): Promise<any> {
  await adminDb.collection(colName).doc(id).set(docData, { merge: true });
  return { success: true, documentId: id };
}

export async function deleteDbDocument(colName: string, id: string): Promise<any> {
  await adminDb.collection(colName).doc(id).delete();
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
  const snap = await adminDb.collection('notifications').get();
  const list: NotificationItem[] = [];
  snap.forEach((d) => list.push({ ...(d.data() as NotificationItem), id: d.id }));
  return list;
}

export async function markNotificationsRead(): Promise<NotificationItem[]> {
  const list = await getNotifications();
  const batch = adminDb.batch();
  list.forEach((n) => {
    batch.set(adminDb.collection('notifications').doc(n.id), { isRead: true }, { merge: true });
  });
  await batch.commit();
  return list.map((n) => ({ ...n, isRead: true }));
}

export async function clearAllMockData(): Promise<{ success: boolean; message: string }> {
  const batch = adminDb.batch();

  const [ordSnap, refSnap] = await Promise.all([
    adminDb.collection('orders').get(),
    adminDb.collection('refunds').get(),
  ]);

  ordSnap.forEach((d) => batch.delete(d.ref));
  refSnap.forEach((d) => batch.delete(d.ref));

  await batch.commit();
  return { success: true, message: 'All orders and refunds cleared from Firestore.' };
}
