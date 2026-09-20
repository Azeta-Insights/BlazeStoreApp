import { app, firestore, auth } from '../lib/firebase';
import {
  collection,
  doc,
  getDocs,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  query,
  where,
  orderBy,
  serverTimestamp,
  writeBatch,
  Unsubscribe,
  QueryConstraint,
  limit
} from 'firebase/firestore';
import {
  signInAnonymously,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  signOut as firebaseSignOut,
  updateProfile,
  User as FirebaseUser
} from 'firebase/auth';
import { Product, CartItem, NotificationItem, User, Order, RefundRecord, AdminRole } from '../types';
import { BEST_DEALS, RECOMMENDED_PRODUCTS } from '../data/mockData';

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errMsg = error instanceof Error ? error.message : String(error);
  const errCode = (error as any)?.code || '';

  // Filter out Firebase Auth errors and benign gRPC idle stream cancellation messages
  if (
    errCode.startsWith('auth/') ||
    errMsg.includes('(auth/') ||
    errMsg.includes('auth/invalid-credential') ||
    errMsg.includes('auth/user-not-found') ||
    errMsg.includes('auth/wrong-password')
  ) {
    throw error;
  }

  if (
    errMsg.includes('CANCELLED: Disconnecting idle stream') ||
    errMsg.includes('Timed out waiting for new targets')
  ) {
    console.warn('[Firestore] Idle stream disconnected by server keep-alive, auto-reconnecting...');
    return;
  }

  const errInfo: FirestoreErrorInfo = {
    error: errMsg,
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData?.map((provider) => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || [],
    },
    operationType,
    path,
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

/**
 * Ensures a valid Firebase Auth user exists.
 * If not authenticated, silently signs in anonymously so that guest carts persist in Firestore.
 */
export async function ensureFirebaseAuth(): Promise<FirebaseUser | null> {
  return new Promise((resolve) => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      unsubscribe();
      if (user) {
        resolve(user);
      } else {
        try {
          const userCredential = await signInAnonymously(auth);
          resolve(userCredential.user);
        } catch (err) {
          console.warn('Anonymous sign-in skipped or failed:', err);
          resolve(null);
        }
      }
    });
  });
}

/**
 * Seed initial catalog to Firestore `products` collection if requested.
 */
export async function seedProductsToFirestore(force = false): Promise<void> {
  if (!force) return; // Auto-seeding disabled to support clean real inventory entry
  const path = 'products';
  try {
    const productsRef = collection(firestore, 'products');
    const snapshot = await getDocs(productsRef);
    if (!snapshot.empty && !force) {
      return; // Already populated
    }

    const allSeed = [...BEST_DEALS, ...RECOMMENDED_PRODUCTS];
    const batch = writeBatch(firestore);

    allSeed.forEach((prod) => {
      const docRef = doc(firestore, 'products', prod.id);
      batch.set(docRef, {
        ...prod,
        isDeal: Boolean((prod.discountPercentage && prod.discountPercentage >= 20) || prod.isHot),
        isNewArrival: Boolean(prod.id.startsWith('rec-') || prod.id.startsWith('deal-1')),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
    });

    await batch.commit();
    console.log('[Firestore] Seeded initial products catalog');
  } catch (err: any) {
    // If permission denied because rules require staff, catch gracefully
    console.warn('[Firestore] Seed products warning:', err?.message || err);
  }
}

/**
 * Clear all products from Firestore collection.
 */
export async function clearAllFirestoreProducts(): Promise<void> {
  const path = 'products';
  try {
    const productsRef = collection(firestore, 'products');
    const snapshot = await getDocs(productsRef);
    if (snapshot.empty) return;

    const batch = writeBatch(firestore);
    snapshot.docs.forEach((d) => batch.delete(d.ref));
    await batch.commit();
    console.log('[Firestore] Cleared all products from Firestore.');
  } catch (err: any) {
    console.warn('[Firestore] Clear products error:', err?.message || err);
  }
}

/**
 * Subscribe to real-time products collection from Firestore.
 */
export function subscribeProductsFromFirestore(
  onUpdate: (products: Product[]) => void,
  onError?: (err: Error) => void
): Unsubscribe {
  const path = 'products';
  const productsRef = collection(firestore, 'products');

  try {
    return onSnapshot(
      productsRef,
      (snapshot) => {
        const items: Product[] = [];
        snapshot.forEach((docSnap) => {
          const data = docSnap.data() as Product;
          items.push({
            ...data,
            id: docSnap.id,
          });
        });

        // Return empty array when no products exist
        onUpdate(items);
      },
      (error) => {
        // If Firestore security rules or client listener encounters an issue, fallback immediately to backend API
        fetch('/api/products')
          .then((res) => (res.ok ? res.json() : null))
          .then((data) => {
            if (data && Array.isArray(data.products) && data.products.length > 0) {
              onUpdate(data.products);
            }
          })
          .catch(() => {});

        console.warn(`[Firestore] Products listener active with REST API fallback (${error.message || 'permission restricted'})`);
        if (onError) {
          onError(error);
        }
      }
    );
  } catch (err: any) {
    fetch('/api/products')
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data && Array.isArray(data.products) && data.products.length > 0) {
          onUpdate(data.products);
        }
      })
      .catch(() => {});
    return () => {};
  }
}

/**
 * Subscribe to user's real-time cart document in Firestore `carts/{userId}`.
 */
export function subscribeUserCart(
  userId: string,
  onUpdate: (items: CartItem[]) => void,
  onError?: (err: Error) => void
): Unsubscribe {
  const path = `carts/${userId}`;
  const cartDocRef = doc(firestore, 'carts', userId);

  return onSnapshot(
    cartDocRef,
    (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        onUpdate(Array.isArray(data.items) ? data.items : []);
      } else {
        onUpdate([]);
      }
    },
    (error) => {
      try {
        handleFirestoreError(error, OperationType.GET, path);
      } catch (e: any) {
        if (onError) onError(e);
      }
    }
  );
}

/**
 * Add or update an item in user's cart in Firestore `carts/{userId}`.
 */
export async function addItemToFirestoreCart(
  userId: string,
  product: Product,
  selectedColor?: string,
  quantity: number = 1
): Promise<CartItem[]> {
  const path = `carts/${userId}`;
  try {
    const cartDocRef = doc(firestore, 'carts', userId);
    const docSnap = await getDoc(cartDocRef);
    let items: CartItem[] = [];

    if (docSnap.exists()) {
      const data = docSnap.data();
      items = Array.isArray(data.items) ? [...data.items] : [];
    }

    const existingIndex = items.findIndex(
      (item) => item.productId === product.id && (!selectedColor || item.color === selectedColor)
    );

    if (existingIndex > -1) {
      items[existingIndex] = {
        ...items[existingIndex],
        quantity: items[existingIndex].quantity + quantity,
      };
    } else {
      const newItem: CartItem = {
        id: `cart-${Date.now()}-${product.id}`,
        productId: product.id,
        name: product.name,
        price: product.price,
        originalPrice: product.originalPrice,
        image: product.image,
        variant: selectedColor ? `${selectedColor} / Standard` : product.variant || 'Standard Edition',
        color: selectedColor,
        quantity: quantity,
      };
      items.unshift(newItem);
    }

    await setDoc(
      cartDocRef,
      {
        userId,
        items,
        updatedAt: serverTimestamp(),
      },
      { merge: true }
    );

    return items;
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
    return [];
  }
}

/**
 * Update quantity of an item in user's cart in Firestore.
 */
export async function updateFirestoreCartItemQty(
  userId: string,
  itemId: string,
  delta: number
): Promise<CartItem[]> {
  const path = `carts/${userId}`;
  try {
    const cartDocRef = doc(firestore, 'carts', userId);
    const docSnap = await getDoc(cartDocRef);
    if (!docSnap.exists()) return [];

    let items: CartItem[] = docSnap.data().items || [];
    items = items
      .map((item) => {
        if (item.id === itemId) {
          const newQty = item.quantity + delta;
          return newQty > 0 ? { ...item, quantity: newQty } : null;
        }
        return item;
      })
      .filter(Boolean) as CartItem[];

    await setDoc(
      cartDocRef,
      {
        userId,
        items,
        updatedAt: serverTimestamp(),
      },
      { merge: true }
    );

    return items;
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
    return [];
  }
}

/**
 * Remove an item from user's cart in Firestore.
 */
export async function removeFirestoreCartItem(userId: string, itemId: string): Promise<CartItem[]> {
  const path = `carts/${userId}`;
  try {
    const cartDocRef = doc(firestore, 'carts', userId);
    const docSnap = await getDoc(cartDocRef);
    if (!docSnap.exists()) return [];

    let items: CartItem[] = docSnap.data().items || [];
    items = items.filter((item) => item.id !== itemId);

    await setDoc(
      cartDocRef,
      {
        userId,
        items,
        updatedAt: serverTimestamp(),
      },
      { merge: true }
    );

    return items;
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
    return [];
  }
}

/**
 * Clear user's cart in Firestore.
 */
export async function clearFirestoreCart(userId: string): Promise<void> {
  const path = `carts/${userId}`;
  try {
    const cartDocRef = doc(firestore, 'carts', userId);
    await setDoc(
      cartDocRef,
      {
        userId,
        items: [],
        updatedAt: serverTimestamp(),
      },
      { merge: true }
    );
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

/**
 * Subscribe to user's wishlist in Firestore `wishlists/{userId}`.
 */
export function subscribeUserWishlist(
  userId: string,
  onUpdate: (items: Product[]) => void,
  onError?: (err: Error) => void
): Unsubscribe {
  const path = `wishlists/${userId}`;
  const wishlistDocRef = doc(firestore, 'wishlists', userId);

  return onSnapshot(
    wishlistDocRef,
    (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        onUpdate(Array.isArray(data.items) ? data.items : []);
      } else {
        onUpdate([]);
      }
    },
    (error) => {
      try {
        handleFirestoreError(error, OperationType.GET, path);
      } catch (e: any) {
        if (onError) onError(e);
      }
    }
  );
}

/**
 * Toggle product in user's wishlist in Firestore.
 */
export async function toggleFirestoreWishlist(userId: string, product: Product): Promise<Product[]> {
  const path = `wishlists/${userId}`;
  try {
    const wishlistDocRef = doc(firestore, 'wishlists', userId);
    const docSnap = await getDoc(wishlistDocRef);
    let items: Product[] = [];

    if (docSnap.exists()) {
      const data = docSnap.data();
      items = Array.isArray(data.items) ? [...data.items] : [];
    }

    const index = items.findIndex((p) => p.id === product.id);
    if (index > -1) {
      items.splice(index, 1);
    } else {
      items.unshift(product);
    }

    await setDoc(
      wishlistDocRef,
      {
        userId,
        items,
        updatedAt: serverTimestamp(),
      },
      { merge: true }
    );

    return items;
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
    return [];
  }
}

/**
 * Determine standardized role for an email address.
 */
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

/**
 * Register a user via Firebase Authentication and create their profile in Firestore.
 */
export async function registerWithEmail(userData: {
  name: string;
  email: string;
  password?: string;
  phone?: string;
  roleType?: AdminRole;
}): Promise<{ user: User; message: string }> {
  const { email, password, name, phone } = userData;
  if (!password || password.length < 6) {
    throw new Error('Password must be at least 6 characters.');
  }

  const cleanEmail = email.trim().toLowerCase();
  let fbUser: FirebaseUser;

  // 1. Firebase Authentication step
  try {
    const credential = await createUserWithEmailAndPassword(auth, cleanEmail, password);
    fbUser = credential.user;
    if (name) {
      await updateProfile(fbUser, { displayName: name }).catch(() => {});
    }
  } catch (authError: any) {
    // If account already exists in Firebase Auth, attempt signing in
    if (authError?.code === 'auth/email-already-in-use') {
      try {
        const signRes = await signInWithEmailAndPassword(auth, cleanEmail, password);
        fbUser = signRes.user;
      } catch {
        throw authError;
      }
    } else {
      throw authError;
    }
  }

  // 2. Determine Role
  const defaultRoleInfo = getRoleForEmail(cleanEmail);
  const roleType: AdminRole = userData.roleType || defaultRoleInfo.roleType;
  const role =
    roleType === 'owner'
      ? 'Store Owner'
      : roleType === 'manager'
      ? 'Store Manager'
      : defaultRoleInfo.role;

  const userProfile: User = {
    id: fbUser.uid,
    name: name || fbUser.displayName || 'BlazeStore User',
    email: fbUser.email || cleanEmail,
    phone: phone || '',
    role: role,
    roleType: roleType,
    createdAt: new Date().toISOString(),
    totalOrders: 0,
    totalSpent: 0,
  };

  // 3. Firestore Database step (attempt client write, fallback to backend sync)
  try {
    const userDocRef = doc(firestore, 'users', fbUser.uid);
    await setDoc(userDocRef, {
      ...userProfile,
      updatedAt: serverTimestamp(),
    });
  } catch (fsErr: any) {
    console.warn('[Firestore] Client setDoc user profile note (backend API will synchronize):', fsErr?.message || fsErr);
  }

  try {
    localStorage.setItem('blazestore_user', JSON.stringify(userProfile));
  } catch {}

  return { user: userProfile, message: 'Account registered and connected to Firestore!' };
}

/**
 * Sign in a user via Firebase Authentication and retrieve their Firestore profile.
 */
export async function signInWithEmail(credentials: {
  email: string;
  password?: string;
}): Promise<{ user: User; message: string }> {
  const { email, password } = credentials;
  if (!password) {
    throw new Error('Please provide your password.');
  }

  const cleanEmail = email.trim().toLowerCase();
  let fbUser: FirebaseUser | null = null;

  // 1. Firebase Authentication step
  try {
    const credential = await signInWithEmailAndPassword(auth, cleanEmail, password);
    fbUser = credential.user;
  } catch (authError: any) {
    const isOwnerCred = ['azetablessingb@gmail.com', 'owner@blazestore.com'].includes(cleanEmail);
    const isManagerCred = ['blessing.waydiva@gmail.com', 'manager@blazestore.com'].includes(cleanEmail);

    // If an administrator/manager account is not yet provisioned in Firebase Auth, auto-provision
    if (
      (isOwnerCred || isManagerCred) &&
      (authError?.code === 'auth/invalid-credential' ||
        authError?.code === 'auth/user-not-found' ||
        authError?.message?.includes('invalid-credential') ||
        authError?.message?.includes('user-not-found'))
    ) {
      try {
        const targetPass = password && password.length >= 6 ? password : `${cleanEmail.split('@')[0]}#2026`;
        const newCred = await createUserWithEmailAndPassword(auth, cleanEmail, targetPass);
        fbUser = newCred.user;
        const targetName = isOwnerCred ? 'Store Owner (Admin)' : 'Store Manager';
        await updateProfile(fbUser, { displayName: targetName }).catch(() => {});
      } catch {
        throw authError;
      }
    } else {
      // Re-throw authentication errors cleanly
      throw authError;
    }
  }

  // 2. Firestore Profile Retrieval
  const userDocPath = `users/${fbUser.uid}`;
  let userProfile: User;
  const { role: defaultRole, roleType: defaultRoleType } = getRoleForEmail(fbUser.email || cleanEmail);

  try {
    const userDocRef = doc(firestore, 'users', fbUser.uid);
    const docSnap = await getDoc(userDocRef);

    if (docSnap.exists()) {
      const data = docSnap.data() as User;
      const roleType = data.roleType || defaultRoleType;
      const role =
        roleType === 'owner'
          ? 'Store Owner'
          : roleType === 'manager'
          ? 'Store Manager'
          : data.role || defaultRole;

      userProfile = {
        ...data,
        id: fbUser.uid,
        email: fbUser.email || cleanEmail,
        role,
        roleType,
      };
    } else {
      userProfile = {
        id: fbUser.uid,
        name: fbUser.displayName || cleanEmail.split('@')[0],
        email: fbUser.email || cleanEmail,
        role: defaultRole,
        roleType: defaultRoleType,
        createdAt: new Date().toISOString(),
        totalOrders: 0,
        totalSpent: 0,
      };
      await setDoc(userDocRef, {
        ...userProfile,
        updatedAt: serverTimestamp(),
      }).catch(() => {});
    }
  } catch {
    userProfile = {
      id: fbUser.uid,
      name: fbUser.displayName || cleanEmail.split('@')[0],
      email: fbUser.email || cleanEmail,
      role: defaultRole,
      roleType: defaultRoleType,
      createdAt: new Date().toISOString(),
      totalOrders: 0,
      totalSpent: 0,
    };
  }

  try {
    localStorage.setItem('blazestore_user', JSON.stringify(userProfile));
  } catch {}

  return { user: userProfile, message: 'Signed in successfully with Firebase Auth!' };
}

/**
 * Sign in a user via Google Authentication provider and retrieve/create their Firestore profile.
 */
export async function signInWithGoogle(): Promise<{ user: User; message: string }> {
  const provider = new GoogleAuthProvider();
  provider.setCustomParameters({ prompt: 'select_account' });
  const credential = await signInWithPopup(auth, provider);
  const fbUser = credential.user;

  const cleanEmail = (fbUser.email || '').trim().toLowerCase();
  const { role: defaultRole, roleType: defaultRoleType } = getRoleForEmail(cleanEmail);

  let userProfile: User;
  const userDocRef = doc(firestore, 'users', fbUser.uid);

  try {
    const docSnap = await getDoc(userDocRef);
    if (docSnap.exists()) {
      const data = docSnap.data() as User;
      const roleType = data.roleType || defaultRoleType;
      const role =
        roleType === 'owner'
          ? 'Store Owner'
          : roleType === 'manager'
          ? 'Store Manager'
          : data.role || defaultRole;

      userProfile = {
        ...data,
        id: fbUser.uid,
        email: fbUser.email || cleanEmail,
        avatar: fbUser.photoURL || data.avatar,
        role,
        roleType,
      };

      await setDoc(userDocRef, {
        avatar: fbUser.photoURL || userProfile.avatar,
        updatedAt: serverTimestamp(),
      }, { merge: true }).catch(() => {});
    } else {
      userProfile = {
        id: fbUser.uid,
        name: fbUser.displayName || cleanEmail.split('@')[0] || 'BlazeStore Member',
        email: fbUser.email || cleanEmail,
        avatar: fbUser.photoURL || '',
        phone: fbUser.phoneNumber || '',
        role: defaultRole,
        roleType: defaultRoleType,
        createdAt: new Date().toISOString(),
        totalOrders: 0,
        totalSpent: 0,
      };
      await setDoc(userDocRef, {
        ...userProfile,
        updatedAt: serverTimestamp(),
      }).catch(() => {});
    }
  } catch {
    userProfile = {
      id: fbUser.uid,
      name: fbUser.displayName || cleanEmail.split('@')[0] || 'BlazeStore Member',
      email: fbUser.email || cleanEmail,
      avatar: fbUser.photoURL || '',
      phone: fbUser.phoneNumber || '',
      role: defaultRole,
      roleType: defaultRoleType,
      createdAt: new Date().toISOString(),
      totalOrders: 0,
      totalSpent: 0,
    };
  }

  try {
    localStorage.setItem('blazestore_user', JSON.stringify(userProfile));
  } catch {}

  return { user: userProfile, message: 'Signed in successfully with Google!' };
}

/**
 * Sign out current Firebase user and clear local session.
 */
export async function signOutFirebase(): Promise<void> {
  try {
    await firebaseSignOut(auth);
    try {
      localStorage.removeItem('blazestore_user');
    } catch {}
  } catch (error) {
    console.warn('Sign out warning:', error);
  }
}

/**
 * Fetch profile for a given UID from Firestore.
 */
export async function getUserProfileFromFirestore(uid: string): Promise<User | null> {
  try {
    const userDocRef = doc(firestore, 'users', uid);
    const docSnap = await getDoc(userDocRef);
    if (docSnap.exists()) {
      return { ...(docSnap.data() as User), id: docSnap.id };
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Save / Create an order document in Firestore `orders/{orderId}`.
 */
export async function createFirestoreOrder(orderData: Partial<Order>): Promise<Order> {
  const orderId = orderData.id || `BLZ-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`;
  const path = `orders/${orderId}`;
  try {
    const newOrder: Order = {
      id: orderId,
      orderId: orderData.orderId || orderId,
      userId: orderData.userId || auth.currentUser?.uid || 'guest',
      customer: orderData.customer || {
        name: auth.currentUser?.displayName || 'Customer',
        email: auth.currentUser?.email || 'customer@example.com',
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
          description: 'Your order was verified and submitted to Firestore.',
          timestamp: new Date().toISOString(),
          isCompleted: true,
        },
      ],
      refundAmount: 0,
      refundStatus: 'none',
    };

    const orderDocRef = doc(firestore, 'orders', orderId);
    await setDoc(orderDocRef, {
      ...newOrder,
      updatedAt: serverTimestamp(),
    });

    return newOrder;
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
    throw error;
  }
}

/**
 * Subscribe to real-time orders collection from Firestore.
 */
export function subscribeOrdersFromFirestore(
  userId: string | undefined,
  isAdmin: boolean,
  onUpdate: (orders: Order[]) => void,
  onError?: (err: Error) => void
): Unsubscribe {
  const path = 'orders';
  const ordersRef = collection(firestore, 'orders');

  const q = !isAdmin && userId
    ? query(ordersRef, where('userId', '==', userId))
    : ordersRef;

  return onSnapshot(
    q,
    (snapshot) => {
      const list: Order[] = [];
      snapshot.forEach((docSnap) => {
        list.push({ ...(docSnap.data() as Order), id: docSnap.id });
      });
      list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      onUpdate(list);
    },
    (error) => {
      try {
        handleFirestoreError(error, OperationType.LIST, path);
      } catch (e: any) {
        if (onError) onError(e);
      }
    }
  );
}

/**
 * Create a refund record in Firestore `refunds/{refundId}`.
 */
export async function createFirestoreRefund(refundData: Partial<RefundRecord>): Promise<RefundRecord> {
  const refundId = refundData.id || `ref-${Date.now()}`;
  const path = `refunds/${refundId}`;
  try {
    const newRefund: RefundRecord = {
      id: refundId,
      orderId: refundData.orderId || '',
      customerName: refundData.customerName || 'Valued Customer',
      customerEmail: refundData.customerEmail || 'customer@example.com',
      amount: refundData.amount || 0,
      reason: refundData.reason || 'Customer Return',
      status: refundData.status || 'approved',
      refundedBy: refundData.refundedBy || auth.currentUser?.email || 'admin',
      adminRole: refundData.adminRole || 'manager',
      restocked: refundData.restocked ?? true,
      createdAt: refundData.createdAt || new Date().toISOString(),
    };

    const docRef = doc(firestore, 'refunds', refundId);
    await setDoc(docRef, {
      ...newRefund,
      updatedAt: serverTimestamp(),
    });

    return newRefund;
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
    throw error;
  }
}

/**
 * Subscribe to real-time refunds in Firestore.
 */
export function subscribeRefundsFromFirestore(
  onUpdate: (refunds: RefundRecord[]) => void,
  onError?: (err: Error) => void
): Unsubscribe {
  const path = 'refunds';
  const refundsRef = collection(firestore, 'refunds');

  return onSnapshot(
    refundsRef,
    (snapshot) => {
      const list: RefundRecord[] = [];
      snapshot.forEach((docSnap) => {
        list.push({ ...(docSnap.data() as RefundRecord), id: docSnap.id });
      });
      list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      onUpdate(list);
    },
    (error) => {
      try {
        handleFirestoreError(error, OperationType.LIST, path);
      } catch (e: any) {
        if (onError) onError(e);
      }
    }
  );
}

/**
 * Test ping and latency directly to Cloud Firestore.
 */
export async function pingFirestore(): Promise<{
  success: boolean;
  pingMs: number;
  databaseId: string;
  projectId: string;
  authUid: string | null;
  authEmail: string | null;
}> {
  const start = performance.now();
  const productsRef = collection(firestore, 'products');
  const q = query(productsRef, limit(1));
  await getDocs(q);
  const end = performance.now();

  return {
    success: true,
    pingMs: Math.max(1, Math.round(end - start)),
    databaseId: '(default)',
    projectId: app.options.projectId || 'blazestoreapp',
    authUid: auth.currentUser?.uid || null,
    authEmail: auth.currentUser?.email || null,
  };
}

/**
 * Get collection documents count & stats from Firestore.
 */
export async function getFirestoreStats(): Promise<{
  products: number;
  cart: number;
  wishlist: number;
  orders: number;
  refunds: number;
  users: number;
}> {
  try {
    const [prodSnap, orderSnap, refundSnap, userSnap] = await Promise.all([
      getDocs(collection(firestore, 'products')).catch(() => ({ size: 0 })),
      getDocs(collection(firestore, 'orders')).catch(() => ({ size: 0 })),
      getDocs(collection(firestore, 'refunds')).catch(() => ({ size: 0 })),
      getDocs(collection(firestore, 'users')).catch(() => ({ size: 0 })),
    ]);

    return {
      products: prodSnap.size,
      orders: orderSnap.size,
      refunds: refundSnap.size,
      users: userSnap.size,
      cart: 0,
      wishlist: 0,
    };
  } catch {
    return {
      products: 0,
      orders: 0,
      refunds: 0,
      users: 0,
      cart: 0,
      wishlist: 0,
    };
  }
}

/**
 * Fetch documents from a Firestore collection for the Admin Database Hub.
 */
export async function getFirestoreCollectionDocs(
  collectionName: string,
  maxDocs: number = 25
): Promise<any[]> {
  const path = collectionName;
  try {
    const colRef = collection(firestore, collectionName);
    const q = query(colRef, limit(maxDocs));
    const snap = await getDocs(q);
    const results: any[] = [];
    snap.forEach((docSnap) => {
      results.push({ _id: docSnap.id, id: docSnap.id, ...docSnap.data() });
    });
    return results;
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
    return [];
  }
}

/**
 * Save or update document in Firestore.
 */
export async function saveFirestoreDoc(
  collectionName: string,
  docId: string,
  data: any
): Promise<void> {
  const path = `${collectionName}/${docId}`;
  try {
    const docRef = doc(firestore, collectionName, docId);
    await setDoc(docRef, { ...data, updatedAt: serverTimestamp() }, { merge: true });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

/**
 * Delete a document from Firestore.
 */
export async function deleteFirestoreDoc(
  collectionName: string,
  docId: string
): Promise<void> {
  const path = `${collectionName}/${docId}`;
  try {
    const docRef = doc(firestore, collectionName, docId);
    await deleteDoc(docRef);
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

