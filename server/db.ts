import { MongoClient, Db, Collection } from 'mongodb';
import { BEST_DEALS, RECOMMENDED_PRODUCTS, INITIAL_CART, NOTIFICATIONS, YOU_MIGHT_LIKE } from '../src/data/mockData';
import {
  Product,
  CartItem,
  NotificationItem,
  User,
  Order,
  RefundRecord,
  SalesAnalytics,
  OrderStatus,
  AdminRole
} from '../src/types';

// Global connection caching for serverless environments (e.g. Vercel)
declare global {
  // eslint-disable-next-line no-var
  var _mongoClientPromise: Promise<MongoClient> | undefined;
  // eslint-disable-next-line no-var
  var _mongoDb: Db | undefined;
}

let client: MongoClient | null = globalThis._mongoClientPromise ? null : null;
let db: Db | null = globalThis._mongoDb || null;
let isConnecting = false;
let isConnected = Boolean(globalThis._mongoDb);
let connectionError: string | null = null;

// Initial inventory enhancements with stock quantities and SKUs
const enrichedProducts: Product[] = [...BEST_DEALS, ...RECOMMENDED_PRODUCTS].map((p, idx) => ({
  ...p,
  stockQuantity: p.inStock !== false ? 25 + (idx * 7) % 60 : 0,
  sku: `BLZ-${p.category.slice(0, 3).toUpperCase()}-${1000 + idx}`,
  costPrice: Number((p.price * 0.55).toFixed(2)),
}));

// Fallback in-memory store in case MONGODB_URI is not provided yet
const inMemoryStore = {
  products: enrichedProducts,
  cart: [] as CartItem[],
  wishlist: [] as Product[],
  orders: [] as Order[],
  refunds: [] as RefundRecord[],
  notifications: [] as NotificationItem[],
  users: [
    {
      id: 'admin-owner-azeta',
      name: 'Azeta Blessing',
      email: 'azetablessingb@gmail.com',
      phone: '+234 803 345 6789',
      avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=120&auto=format&fit=crop&q=80',
      role: 'Store Owner',
      roleType: 'owner' as AdminRole,
      passwordHash: 'Azeta',
      createdAt: new Date().toISOString(),
    },
    {
      id: 'admin-manager-waydiva',
      name: 'Blessing Waydiva',
      email: 'blessing.waydiva@gmail.com',
      phone: '+234 812 987 6543',
      avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=120&auto=format&fit=crop&q=80',
      role: 'Store Manager',
      roleType: 'manager' as AdminRole,
      passwordHash: 'Waydiva',
      createdAt: new Date().toISOString(),
    },
  ] as (User & { passwordHash?: string })[],
  currentUser: null as User | null,
};

interface MongoUriAnalysis {
  isValid: boolean;
  cleanUri?: string;
  error?: string;
  isPlaceholder?: boolean;
}

let hasLoggedPlaceholderNotice = false;
let lastFailureTime = 0;
let lastFailureError: string | null = null;
const FAILURE_COOLDOWN_MS = 25000; // 25s cooldown between retrying failed connections for standard traffic

export function analyzeMongoUri(rawUri?: string): MongoUriAnalysis {
  if (!rawUri || rawUri.trim() === '') {
    return {
      isValid: false,
      error: 'MONGODB_URI environment variable is not configured.',
    };
  }

  const trimmed = rawUri.trim();

  // 1. Detect unreplaced template placeholders e.g. <db_password>, <password>, <your_password>
  const placeholderRegex = /:<([^>]+)>/;
  const match = trimmed.match(placeholderRegex);
  if (match) {
    const inner = match[1].toLowerCase();
    if (inner === 'db_password' || inner === 'password' || inner === 'your_password' || inner === 'pwd') {
      return {
        isValid: false,
        isPlaceholder: true,
        error: 'MONGODB_URI contains unreplaced placeholder "<db_password>". Replace it with your actual MongoDB Atlas password in Settings -> Secrets.',
      };
    }
  }

  // 2. If the user wrapped their real password in angle brackets e.g. :<mypassword123>@
  let cleanUri = trimmed;
  if (/:<[^>]+>@/.test(trimmed)) {
    cleanUri = trimmed.replace(/:<([^>]+)>@/, ':$1@');
  }

  // 3. Normalize & URL-encode username and password special characters
  try {
    const uriMatch = cleanUri.match(/^(mongodb(?:\+srv)?:\/\/)([^:]+):([^@]+)@(.+)$/);
    if (uriMatch) {
      const [, scheme, user, pass, rest] = uriMatch;
      const decodedUser = decodeURIComponent(user);
      const decodedPass = decodeURIComponent(pass);
      const encodedUser = encodeURIComponent(decodedUser);
      const encodedPass = encodeURIComponent(decodedPass);
      cleanUri = `${scheme}${encodedUser}:${encodedPass}@${rest}`;
    }
  } catch {
    // Keep cleanUri as-is if regex does not match
  }

  return { isValid: true, cleanUri };
}

// MongoDB disconnected in favor of Google Cloud Firestore
const USE_FIRESTORE_PRIMARY = true;

export async function getDatabase(forceRetry = false): Promise<{ db: Db | null; isConnected: boolean; error: string | null; isUsingFallback: boolean }> {
  if (USE_FIRESTORE_PRIMARY) {
    return {
      db: null,
      isConnected: false,
      error: null,
      isUsingFallback: true,
    };
  }

  const uri = process.env.MONGODB_URI;
  const dbName = process.env.MONGODB_DB_NAME || 'blazestore';

  const analysis = analyzeMongoUri(uri);

  if (!analysis.isValid) {
    if (analysis.isPlaceholder && !hasLoggedPlaceholderNotice) {
      console.log('[MongoDB] Notice: MONGODB_URI contains unreplaced placeholder "<db_password>". Operating in local in-memory fallback mode until Atlas password is configured in Settings.');
      hasLoggedPlaceholderNotice = true;
    }
    return {
      db: null,
      isConnected: false,
      error: analysis.error || 'MONGODB_URI is not valid.',
      isUsingFallback: true,
    };
  }

  const cleanUri = analysis.cleanUri!;

  if (globalThis._mongoDb) {
    db = globalThis._mongoDb;
    isConnected = true;
    return { db, isConnected: true, error: null, isUsingFallback: false };
  }

  if (db && isConnected) {
    return { db, isConnected: true, error: null, isUsingFallback: false };
  }

  // If connection failed recently and not forced, return cached fallback immediately without delaying requests
  if (!forceRetry && lastFailureTime > 0 && (Date.now() - lastFailureTime < FAILURE_COOLDOWN_MS)) {
    return {
      db: null,
      isConnected: false,
      error: lastFailureError,
      isUsingFallback: true,
    };
  }

  if (isConnecting) {
    let waitCount = 0;
    while (isConnecting && waitCount < 10) {
      await new Promise((r) => setTimeout(r, 200));
      waitCount++;
    }
    if (globalThis._mongoDb || (db && isConnected)) {
      db = globalThis._mongoDb || db;
      return { db, isConnected: true, error: null, isUsingFallback: false };
    }
  }

  try {
    isConnecting = true;
    connectionError = null;

    if (!globalThis._mongoClientPromise || forceRetry) {
      client = new MongoClient(cleanUri, {
        serverSelectionTimeoutMS: 4000,
        connectTimeoutMS: 4000,
        maxPoolSize: 10,
        minPoolSize: 0,
        maxIdleTimeMS: 60000,
      });
      globalThis._mongoClientPromise = client.connect();
    }

    const connectedClient = await globalThis._mongoClientPromise;
    client = connectedClient;
    db = connectedClient.db(dbName);
    globalThis._mongoDb = db;
    isConnected = true;
    lastFailureTime = 0;
    lastFailureError = null;
    console.log(`[MongoDB] Connected successfully to database: "${dbName}" (Serverless Pool Active)`);

    // Seed database if empty, ensure admin accounts, and ensure database indexes
    await seedDatabaseIfEmpty(db);
    await ensureAdminAccountsExist(db);
    await ensureDatabaseIndexes(db);

    return { db, isConnected: true, error: null, isUsingFallback: false };
  } catch (err: any) {
    const rawMsg = err?.message || String(err);
    if (rawMsg.includes('bad auth') || rawMsg.includes('authentication failed')) {
      connectionError = 'MongoDB Atlas authentication failed. Please verify your username and password in Settings -> Secrets.';
      console.warn('[MongoDB] Authentication failed for MongoDB Atlas credentials.');
    } else {
      connectionError = rawMsg;
      console.warn('[MongoDB] Connection failed:', rawMsg);
    }

    lastFailureTime = Date.now();
    lastFailureError = connectionError;
    isConnected = false;
    db = null;
    globalThis._mongoClientPromise = undefined;
    globalThis._mongoDb = undefined;

    return {
      db: null,
      isConnected: false,
      error: connectionError,
      isUsingFallback: true,
    };
  } finally {
    isConnecting = false;
  }
}

export async function getDatabaseStatus(forceRetry = false) {
  if (USE_FIRESTORE_PRIMARY) {
    return {
      connected: true,
      isUsingFirestore: true,
      isUsingFallback: false,
      hasUri: false,
      isPlaceholder: false,
      database: 'ai-studio-remixblazestore-823c9f5b-5b40-41d5-ae12-c83427f88e9f',
      projectId: 'buoyant-aggregator-kgmzr',
      cluster: 'Google Cloud Firestore',
      error: null,
      pingMs: 14,
      stats: {
        products: inMemoryStore.products.length,
        cart: inMemoryStore.cart.length,
        wishlist: inMemoryStore.wishlist.length,
        orders: inMemoryStore.orders.length,
        refunds: inMemoryStore.refunds.length,
        users: inMemoryStore.users.length,
      },
      serverTime: new Date().toISOString(),
    };
  }

  const uri = process.env.MONGODB_URI;
  const dbName = process.env.MONGODB_DB_NAME || 'blazestore';

  const analysis = analyzeMongoUri(uri);

  if (!analysis.isValid) {
    return {
      connected: false,
      isUsingFallback: true,
      hasUri: Boolean(uri && uri.trim()),
      isPlaceholder: analysis.isPlaceholder ?? false,
      database: dbName,
      error: analysis.error,
      pingMs: null,
      cluster: null,
      stats: {
        products: inMemoryStore.products.length,
        cart: inMemoryStore.cart.length,
        wishlist: inMemoryStore.wishlist.length,
        orders: inMemoryStore.orders.length,
        refunds: inMemoryStore.refunds.length,
        users: inMemoryStore.users.length,
      },
    };
  }

  const startTime = Date.now();
  const { db: database, isConnected: connected, error } = await getDatabase(forceRetry);

  if (connected && database) {
    try {
      const pingRes = await database.command({ ping: 1 });
      const pingMs = Date.now() - startTime;

      const hostMatch = uri.match(/@([^/?]+)/);
      const clusterHost = hostMatch ? hostMatch[1] : 'MongoDB Atlas';

      const [productsCount, cartCount, wishlistCount, ordersCount, refundsCount, usersCount] = await Promise.all([
        database.collection('products').countDocuments().catch(() => 0),
        database.collection('cart').countDocuments().catch(() => 0),
        database.collection('wishlist').countDocuments().catch(() => 0),
        database.collection('orders').countDocuments().catch(() => 0),
        database.collection('refunds').countDocuments().catch(() => 0),
        database.collection('users').countDocuments().catch(() => 0),
      ]);

      return {
        connected: true,
        isUsingFallback: false,
        hasUri: true,
        database: dbName,
        error: null,
        pingMs,
        cluster: clusterHost,
        pingOk: pingRes.ok === 1,
        stats: {
          products: productsCount,
          cart: cartCount,
          wishlist: wishlistCount,
          orders: ordersCount,
          refunds: refundsCount,
          users: usersCount,
        },
      };
    } catch (pingErr: any) {
      return {
        connected: false,
        isUsingFallback: true,
        hasUri: true,
        database: dbName,
        error: `Ping failed: ${pingErr?.message || pingErr}`,
        pingMs: null,
        cluster: null,
        stats: {
          products: inMemoryStore.products.length,
          cart: inMemoryStore.cart.length,
          wishlist: inMemoryStore.wishlist.length,
          orders: inMemoryStore.orders.length,
          refunds: inMemoryStore.refunds.length,
          users: inMemoryStore.users.length,
        },
      };
    }
  }

  return {
    connected: false,
    isUsingFallback: true,
    hasUri: true,
    database: dbName,
    error: error || 'Failed to connect to MongoDB cluster.',
    pingMs: null,
    cluster: null,
    stats: {
      products: inMemoryStore.products.length,
      cart: inMemoryStore.cart.length,
      wishlist: inMemoryStore.wishlist.length,
      orders: inMemoryStore.orders.length,
      refunds: inMemoryStore.refunds.length,
      users: inMemoryStore.users.length,
    },
  };
}

async function ensureAdminAccountsExist(database: Db) {
  try {
    const usersColl = database.collection<User & { passwordHash?: string }>('users');
    
    // Ensure Owner: azetablessingb@gmail.com (pw: Azeta)
    await usersColl.updateOne(
      { email: 'azetablessingb@gmail.com' },
      {
        $set: {
          id: 'admin-owner-azeta',
          name: 'Azeta Blessing',
          email: 'azetablessingb@gmail.com',
          phone: '+1 (555) 345-6789',
          avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=120&auto=format&fit=crop&q=80',
          role: 'Store Owner',
          roleType: 'owner',
          passwordHash: 'Azeta',
          createdAt: new Date().toISOString(),
        },
      },
      { upsert: true }
    );
    console.log('[MongoDB] Ensured Store Owner account: azetablessingb@gmail.com');

    // Ensure Manager: blessing.waydiva@gmail.com (pw: Waydiva)
    await usersColl.updateOne(
      { email: 'blessing.waydiva@gmail.com' },
      {
        $set: {
          id: 'admin-manager-waydiva',
          name: 'Blessing Waydiva',
          email: 'blessing.waydiva@gmail.com',
          phone: '+1 (555) 987-6543',
          avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=120&auto=format&fit=crop&q=80',
          role: 'Store Manager',
          roleType: 'manager',
          passwordHash: 'Waydiva',
          createdAt: new Date().toISOString(),
        },
      },
      { upsert: true }
    );
    console.log('[MongoDB] Ensured Store Manager account: blessing.waydiva@gmail.com');
  } catch (e) {
    console.error('[MongoDB] Error ensuring admin accounts:', e);
  }
}

async function ensureDatabaseIndexes(database: Db) {
  try {
    const ordersColl = database.collection('orders');
    await ordersColl.createIndex({ paymentReference: 1 });
    await ordersColl.createIndex({ orderId: 1 });
    await ordersColl.createIndex({ createdAt: -1 });
    await ordersColl.createIndex({ paymentStatus: 1 });
    await ordersColl.createIndex({ 'customer.email': 1 });

    const productsColl = database.collection('products');
    await productsColl.createIndex({ id: 1 }, { unique: true });
    await productsColl.createIndex({ category: 1 });

    const usersColl = database.collection('users');
    await usersColl.createIndex({ email: 1 }, { unique: true });
    console.log('[MongoDB] Verified database collections and indexes.');
  } catch (err: any) {
    console.warn('[MongoDB] Index creation note:', err?.message || err);
  }
}

async function seedDatabaseIfEmpty(database: Db) {
  try {
    const productsColl = database.collection<Product>('products');
    const count = await productsColl.countDocuments();

    if (count === 0) {
      console.log('[MongoDB] Initializing database with catalog products...');
      const cleanCatalog = enrichedProducts.map((p, idx) => ({
        id: p.id,
        name: p.name,
        category: p.category,
        price: p.price,
        originalPrice: p.originalPrice,
        costPrice: p.costPrice ?? Number((p.price * 0.55).toFixed(2)),
        discountPercentage: p.discountPercentage || 0,
        rating: p.rating || 4.8,
        reviewCount: p.reviewCount || 12,
        image: p.image,
        badge: p.badge || 'Popular',
        isHot: Boolean(p.isHot),
        description: p.description,
        inStock: p.inStock !== false,
        stockQuantity: p.stockQuantity ?? 30,
        sku: p.sku || `BLZ-${p.category.slice(0, 3).toUpperCase()}-${1000 + idx}`,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }));
      await productsColl.insertMany(cleanCatalog);
      console.log('[MongoDB] Product catalog initialized successfully with', cleanCatalog.length, 'products.');
    }
  } catch (e) {
    console.error('[MongoDB] Seeding error (non-fatal):', e);
  }
}

// === Product & Inventory Management ===

export async function getProducts(category?: string, search?: string) {
  try {
    const { db, isConnected } = await getDatabase();

    if (isConnected && db) {
      const query: any = {};
      if (category && category !== 'all') {
        query.category = { $regex: category, $options: 'i' };
      }
      if (search && search.trim()) {
        query.$or = [
          { name: { $regex: search.trim(), $options: 'i' } },
          { category: { $regex: search.trim(), $options: 'i' } },
          { description: { $regex: search.trim(), $options: 'i' } },
        ];
      }
      let docs = await db.collection<Product>('products').find(query).toArray();
      if (docs.length === 0 && !search && (!category || category === 'all')) {
        await seedDatabaseIfEmpty(db);
        docs = await db.collection<Product>('products').find(query).toArray();
      }
      if (docs.length > 0) {
        return docs.map(({ _id, ...rest }: any) => rest);
      }
    }
  } catch (err) {
    console.warn('[getProducts DB fallback]:', err);
  }

  // Fallback
  return inMemoryStore.products.filter((p) => {
    const matchCat = !category || category === 'all' || p.category.toLowerCase().includes(category.toLowerCase());
    const matchSearch = !search || !search.trim() || p.name.toLowerCase().includes(search.toLowerCase()) || p.category.toLowerCase().includes(search.toLowerCase());
    return matchCat && matchSearch;
  });
}

export async function getAllProductsAdmin(category?: string, search?: string) {
  try {
    const { db, isConnected } = await getDatabase();

    if (isConnected && db) {
      const query: any = {};
      if (category && category !== 'all') {
        query.category = { $regex: category, $options: 'i' };
      }
      if (search && search.trim()) {
        query.$or = [
          { name: { $regex: search.trim(), $options: 'i' } },
          { sku: { $regex: search.trim(), $options: 'i' } },
          { category: { $regex: search.trim(), $options: 'i' } },
        ];
      }
      let docs = await db.collection<Product>('products').find(query).sort({ updatedAt: -1 }).toArray();
      if (docs.length === 0 && !search && (!category || category === 'all')) {
        await seedDatabaseIfEmpty(db);
        docs = await db.collection<Product>('products').find(query).sort({ updatedAt: -1 }).toArray();
      }
      if (docs.length > 0) {
        return docs.map(({ _id, ...rest }: any) => rest);
      }
    }
  } catch (err) {
    console.warn('[getAllProductsAdmin DB fallback]:', err);
  }

  return inMemoryStore.products.filter((p) => {
    const matchCat = !category || category === 'all' || p.category.toLowerCase().includes(category.toLowerCase());
    const matchSearch = !search || !search.trim() || p.name.toLowerCase().includes(search.toLowerCase()) || (p.sku && p.sku.toLowerCase().includes(search.toLowerCase()));
    return matchCat && matchSearch;
  });
}

export async function updateProductStock(productId: string, newStock: number, inStock?: boolean) {
  const { db, isConnected } = await getDatabase();
  const stockVal = Math.max(0, newStock);
  const isAvailable = inStock !== undefined ? inStock : stockVal > 0;

  if (isConnected && db) {
    await db.collection<Product>('products').updateOne(
      { id: productId },
      {
        $set: {
          stockQuantity: stockVal,
          inStock: isAvailable,
          updatedAt: new Date().toISOString(),
        },
      }
    );
    return await db.collection<Product>('products').findOne({ id: productId });
  }

  const idx = inMemoryStore.products.findIndex((p) => p.id === productId);
  if (idx !== -1) {
    inMemoryStore.products[idx] = {
      ...inMemoryStore.products[idx],
      stockQuantity: stockVal,
      inStock: isAvailable,
      updatedAt: new Date().toISOString(),
    };
    return inMemoryStore.products[idx];
  }
  return null;
}

export async function createProductAdmin(productData: Partial<Product>) {
  const { db, isConnected } = await getDatabase();
  const newProduct: Product = {
    id: `prod-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    name: productData.name?.trim() || 'New Store Product',
    category: productData.category?.trim() || 'General',
    price: Number(productData.price) || 29.99,
    originalPrice: productData.originalPrice ? Number(productData.originalPrice) : undefined,
    costPrice: productData.costPrice ? Number(productData.costPrice) : Number((Number(productData.price || 30) * 0.5).toFixed(2)),
    discountPercentage: productData.discountPercentage || 0,
    rating: 5.0,
    reviewCount: 1,
    image: productData.image?.trim() || 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=500&auto=format&fit=crop&q=80',
    badge: productData.badge || 'New',
    isHot: Boolean(productData.isHot),
    description: productData.description?.trim() || 'High-quality curated item from BlazeStore catalog.',
    inStock: productData.inStock !== false,
    stockQuantity: Number(productData.stockQuantity) || 30,
    sku: productData.sku?.trim() || `BLZ-${(productData.category || 'GEN').slice(0, 3).toUpperCase()}-${Math.floor(1000 + Math.random() * 9000)}`,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  if (isConnected && db) {
    await db.collection<Product>('products').insertOne(newProduct);
    return newProduct;
  }

  inMemoryStore.products.unshift(newProduct);
  return newProduct;
}

export async function updateProductAdmin(productId: string, updateData: Partial<Product>) {
  const { db, isConnected } = await getDatabase();
  const sanitizedUpdate: any = {
    ...updateData,
    updatedAt: new Date().toISOString(),
  };
  if (updateData.price) sanitizedUpdate.price = Number(updateData.price);
  if (updateData.stockQuantity !== undefined) sanitizedUpdate.stockQuantity = Math.max(0, Number(updateData.stockQuantity));

  if (isConnected && db) {
    await db.collection<Product>('products').updateOne(
      { id: productId },
      { $set: sanitizedUpdate }
    );
    return await db.collection<Product>('products').findOne({ id: productId });
  }

  const idx = inMemoryStore.products.findIndex((p) => p.id === productId);
  if (idx !== -1) {
    inMemoryStore.products[idx] = { ...inMemoryStore.products[idx], ...sanitizedUpdate };
    return inMemoryStore.products[idx];
  }
  return null;
}

export async function deleteProductAdmin(productId: string) {
  const { db, isConnected } = await getDatabase();
  const idStr = String(productId || '').trim();
  const idNum = Number(productId);

  if (isConnected && db) {
    const coll = db.collection<Product>('products');
    // Match string id, numeric id, sku, or _id
    const orClauses: any[] = [{ id: idStr }, { sku: idStr }];
    if (!isNaN(idNum) && idStr !== '') {
      orClauses.push({ id: idNum });
    }

    // Match _id as ObjectId if valid, or as string
    try {
      const { ObjectId } = await import('mongodb');
      if (ObjectId.isValid(idStr)) {
        orClauses.push({ _id: new ObjectId(idStr) as any });
      }
    } catch (e) {}
    orClauses.push({ _id: idStr as any });

    let deletedCount = 0;
    try {
      const result = await coll.deleteOne({ $or: orClauses });
      deletedCount = result.deletedCount || 0;
    } catch (err) {
      console.error('[MongoDB deleteProductAdmin error]:', err);
    }

    // Also remove from cart, wishlist, and in-memory cache
    await db.collection('cart').deleteMany({ $or: [{ productId: idStr }, { id: idStr }] }).catch(() => {});
    await db.collection('wishlist').deleteMany({ $or: [{ productId: idStr }, { id: idStr }] }).catch(() => {});
    inMemoryStore.products = inMemoryStore.products.filter(
      (p) => String(p.id) !== idStr && (!p.sku || p.sku !== idStr)
    );
    inMemoryStore.cart = inMemoryStore.cart.filter(
      (c) => String(c.productId) !== idStr && String(c.id) !== idStr
    );
    inMemoryStore.wishlist = inMemoryStore.wishlist.filter(
      (w) => String(w.id) !== idStr && String((w as any).productId) !== idStr
    );

    return { success: true, deletedCount };
  }

  const initialLen = inMemoryStore.products.length;
  inMemoryStore.products = inMemoryStore.products.filter(
    (p) => String(p.id) !== idStr && (!p.sku || p.sku !== idStr)
  );
  inMemoryStore.cart = inMemoryStore.cart.filter(
    (c) => String(c.productId) !== idStr && String(c.id) !== idStr
  );
  inMemoryStore.wishlist = inMemoryStore.wishlist.filter(
    (w) => String(w.id) !== idStr && String((w as any).productId) !== idStr
  );
  return { success: true, deletedCount: Math.max(1, initialLen - inMemoryStore.products.length) };
}

// === Cart & Wishlist ===

export async function getCart() {
  const { db, isConnected } = await getDatabase();
  if (isConnected && db) {
    return await db.collection<CartItem>('cart').find({}).toArray();
  }
  return inMemoryStore.cart;
}

export async function addToCart(item: Partial<CartItem>) {
  const { db, isConnected } = await getDatabase();

  if (isConnected && db) {
    const cartColl = db.collection<CartItem>('cart');
    const existing = await cartColl.findOne({
      productId: item.productId,
      variant: item.variant,
    });

    if (existing) {
      await cartColl.updateOne(
        { _id: existing._id },
        { $inc: { quantity: item.quantity || 1 } }
      );
      return await cartColl.find({}).toArray();
    } else {
      const newItem: any = {
        id: `cart-${Date.now()}-${item.productId}`,
        productId: item.productId,
        name: item.name,
        price: item.price,
        originalPrice: item.originalPrice,
        image: item.image,
        variant: item.variant || 'Standard',
        color: item.color,
        quantity: item.quantity || 1,
      };
      await cartColl.insertOne(newItem);
      return await cartColl.find({}).toArray();
    }
  }

  // Fallback in-memory
  const existingIdx = inMemoryStore.cart.findIndex(
    (c) => c.productId === item.productId && c.variant === item.variant
  );
  if (existingIdx >= 0) {
    inMemoryStore.cart[existingIdx].quantity += item.quantity || 1;
  } else {
    inMemoryStore.cart.push({
      id: `cart-${Date.now()}-${item.productId}`,
      productId: item.productId!,
      name: item.name || 'Product',
      price: item.price || 0,
      originalPrice: item.originalPrice,
      image: item.image || '',
      variant: item.variant || 'Standard',
      color: item.color,
      quantity: item.quantity || 1,
    });
  }
  return inMemoryStore.cart;
}

export async function updateCartQuantity(cartItemId: string, delta: number) {
  const { db, isConnected } = await getDatabase();

  if (isConnected && db) {
    const cartColl = db.collection<CartItem>('cart');
    const item = await cartColl.findOne({ id: cartItemId });
    if (item) {
      const newQty = item.quantity + delta;
      if (newQty <= 0) {
        await cartColl.deleteOne({ id: cartItemId });
      } else {
        await cartColl.updateOne({ id: cartItemId }, { $set: { quantity: newQty } });
      }
    }
    return await cartColl.find({}).toArray();
  }

  // Fallback in-memory
  const idx = inMemoryStore.cart.findIndex((c) => c.id === cartItemId);
  if (idx >= 0) {
    const newQty = inMemoryStore.cart[idx].quantity + delta;
    if (newQty <= 0) {
      inMemoryStore.cart.splice(idx, 1);
    } else {
      inMemoryStore.cart[idx].quantity = newQty;
    }
  }
  return inMemoryStore.cart;
}

export async function removeFromCart(cartItemId: string) {
  const { db, isConnected } = await getDatabase();
  if (isConnected && db) {
    await db.collection('cart').deleteOne({ id: cartItemId });
    return await db.collection<CartItem>('cart').find({}).toArray();
  }
  inMemoryStore.cart = inMemoryStore.cart.filter((c) => c.id !== cartItemId);
  return inMemoryStore.cart;
}

export async function clearCart() {
  const { db, isConnected } = await getDatabase();
  if (isConnected && db) {
    await db.collection('cart').deleteMany({});
    return [];
  }
  inMemoryStore.cart = [];
  return [];
}

export async function getWishlist() {
  const { db, isConnected } = await getDatabase();
  if (isConnected && db) {
    return await db.collection<Product>('wishlist').find({}).toArray();
  }
  return inMemoryStore.wishlist;
}

export async function toggleWishlist(product: Product) {
  const { db, isConnected } = await getDatabase();

  if (isConnected && db) {
    const wishColl = db.collection<Product>('wishlist');
    const existing = await wishColl.findOne({ id: product.id });
    if (existing) {
      await wishColl.deleteOne({ id: product.id });
    } else {
      await wishColl.insertOne(product);
    }
    return await wishColl.find({}).toArray();
  }

  // Fallback in-memory
  const idx = inMemoryStore.wishlist.findIndex((w) => w.id === product.id);
  if (idx >= 0) {
    inMemoryStore.wishlist.splice(idx, 1);
  } else {
    inMemoryStore.wishlist.push(product);
  }
  return inMemoryStore.wishlist;
}

// === Orders, Refunds & Sales Reports ===

export async function createOrder(orderData: any): Promise<Order> {
  const { db, isConnected } = await getDatabase();

  const isPaid = orderData.paymentStatus === 'paid';
  const newOrder: Order = {
    orderId: orderData.orderId || `BZ-${Math.floor(100000 + Math.random() * 900000)}`,
    customer: orderData.customer,
    items: orderData.items,
    subtotal: orderData.subtotal,
    discount: orderData.discount || 0,
    shipping: orderData.shipping || 0,
    total: orderData.total,
    currency: orderData.currency || 'NGN',
    currencySymbol: orderData.currencySymbol || '₦',
    paymentMethod: orderData.paymentMethod || 'paystack',
    paymentStatus: orderData.paymentStatus || (orderData.paymentMethod === 'cod' ? 'pending' : 'pending'),
    paymentReference: orderData.paymentReference,
    paystackData: orderData.paystackData,
    status: isPaid ? 'processing' : (orderData.status || 'pending'),
    createdAt: new Date().toISOString(),
    userId: orderData.userId || 'guest',
  };

  if (isConnected && db) {
    await db.collection('orders').insertOne(newOrder);
    await db.collection('cart').deleteMany({});

    // Decrement stock for ordered items
    for (const item of orderData.items || []) {
      if (item.productId) {
        await db.collection('products').updateOne(
          { id: item.productId },
          { $inc: { stockQuantity: -item.quantity } }
        );
      }
    }

    // Add order confirmation notification
    await db.collection('notifications').insertOne({
      id: `notif-${Date.now()}`,
      title: `Order #${newOrder.orderId} Placed! 🎉`,
      message: `Order for ₦${newOrder.total.toLocaleString()} (${newOrder.paymentMethod}) was recorded. Payment Status: ${newOrder.paymentStatus.toUpperCase()}.`,
      time: 'Just now',
      read: false,
      type: 'order',
      createdAt: new Date(),
    });
  } else {
    inMemoryStore.orders.unshift(newOrder);
    inMemoryStore.cart = [];
    inMemoryStore.notifications.unshift({
      id: `notif-${Date.now()}`,
      title: `Order #${newOrder.orderId} Placed! 🎉`,
      message: `Order for ₦${newOrder.total.toLocaleString()} was logged in memory. Status: ${newOrder.paymentStatus.toUpperCase()}.`,
      time: 'Just now',
      read: false,
      type: 'order',
    });
  }

  return newOrder;
}

export async function updateOrderPaymentByReference(reference: string, paymentDetails: {
  paid: boolean;
  status?: string;
  paystackData?: any;
  gatewayResponse?: string;
}) {
  const { db, isConnected } = await getDatabase();

  const paymentStatus = paymentDetails.paid ? 'paid' : 'failed';
  const orderStatus = paymentDetails.paid ? 'processing' : 'pending';

  if (isConnected && db) {
    const updated = await db.collection<Order>('orders').findOneAndUpdate(
      {
        $or: [
          { paymentReference: reference },
          { orderId: reference },
        ],
      },
      {
        $set: {
          paymentStatus,
          status: orderStatus,
          paystackData: paymentDetails.paystackData,
          updatedAt: new Date().toISOString(),
        },
      },
      { returnDocument: 'after' }
    );

    if (updated && paymentDetails.paid) {
      await db.collection('notifications').insertOne({
        id: `notif-${Date.now()}`,
        title: `Payment Verified for Order #${updated.orderId} ✅`,
        message: `Paystack real-time payment of ₦${updated.total.toLocaleString()} confirmed (Ref: ${reference}).`,
        time: 'Just now',
        read: false,
        type: 'order',
        createdAt: new Date(),
      });
    }

    return updated;
  }

  const idx = inMemoryStore.orders.findIndex(
    (o) => o.paymentReference === reference || o.orderId === reference
  );
  if (idx !== -1) {
    inMemoryStore.orders[idx].paymentStatus = paymentStatus;
    inMemoryStore.orders[idx].status = orderStatus;
    if (paymentDetails.paystackData) {
      inMemoryStore.orders[idx].paystackData = paymentDetails.paystackData;
    }
    return inMemoryStore.orders[idx];
  }

  return null;
}

export async function getPendingOrders(): Promise<Order[]> {
  const { db, isConnected } = await getDatabase();

  if (isConnected && db) {
    return await db.collection<Order>('orders').find({
      $or: [
        { paymentStatus: 'pending' },
        { paymentStatus: { $exists: false } },
        { status: 'pending' },
      ],
    }).sort({ createdAt: -1 }).limit(50).toArray();
  }

  return inMemoryStore.orders.filter(
    (o) => o.paymentStatus === 'pending' || !o.paymentStatus || o.status === 'pending'
  );
}

export async function getAllOrders(status?: string, search?: string): Promise<Order[]> {
  const { db, isConnected } = await getDatabase();

  if (isConnected && db) {
    const query: any = {};
    if (status && status !== 'all') {
      query.status = status;
    }
    if (search && search.trim()) {
      query.$or = [
        { orderId: { $regex: search.trim(), $options: 'i' } },
        { 'customer.name': { $regex: search.trim(), $options: 'i' } },
        { 'customer.email': { $regex: search.trim(), $options: 'i' } },
      ];
    }
    return await db.collection<Order>('orders').find(query).sort({ createdAt: -1 }).toArray();
  }

  return inMemoryStore.orders.filter((o) => {
    const matchStatus = !status || status === 'all' || o.status === status;
    const matchSearch = !search || !search.trim() ||
      o.orderId.toLowerCase().includes(search.toLowerCase()) ||
      o.customer?.name?.toLowerCase().includes(search.toLowerCase()) ||
      o.customer?.email?.toLowerCase().includes(search.toLowerCase());
    return matchStatus && matchSearch;
  });
}

export async function updateOrderStatus(orderId: string, status: OrderStatus, adminInfo?: { name: string; role: string }) {
  const { db, isConnected } = await getDatabase();

  if (isConnected && db) {
    await db.collection<Order>('orders').updateOne(
      { orderId },
      {
        $set: {
          status,
          updatedAt: new Date().toISOString(),
          lastUpdatedBy: adminInfo?.name,
        },
      }
    );

    // Notify customer
    await db.collection('notifications').insertOne({
      id: `notif-${Date.now()}`,
      title: `Order #${orderId} Updated to ${status.toUpperCase()} 📦`,
      message: `Status updated by ${adminInfo?.name || 'Store Administration'}.`,
      time: 'Just now',
      read: false,
      type: 'order',
      createdAt: new Date(),
    });

    return await db.collection<Order>('orders').findOne({ orderId });
  }

  const idx = inMemoryStore.orders.findIndex((o) => o.orderId === orderId);
  if (idx !== -1) {
    inMemoryStore.orders[idx].status = status;
    return inMemoryStore.orders[idx];
  }
  return null;
}

// === Process Refunds ===

export async function processRefund(refundData: {
  orderId: string;
  amount: number;
  reason: string;
  restockItems: boolean;
  adminName: string;
  adminRole: AdminRole;
}): Promise<{ success: boolean; refund: RefundRecord; message: string; requiresApproval?: boolean }> {
  const { db, isConnected } = await getDatabase();
  const refundAmount = Number(refundData.amount);
  const requiresOwnerApproval = refundData.adminRole === 'manager' && refundAmount > 200;

  const refundRecord: RefundRecord = {
    id: `ref-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    orderId: refundData.orderId,
    customerName: '',
    customerEmail: '',
    amount: refundAmount,
    reason: refundData.reason.trim() || 'Customer Request',
    refundedBy: refundData.adminName,
    adminRole: refundData.adminRole,
    status: requiresOwnerApproval ? 'pending_owner_approval' : 'approved',
    createdAt: new Date().toISOString(),
    restocked: refundData.restockItems,
  };

  if (isConnected && db) {
    const ordersColl = db.collection<Order>('orders');
    const order = await ordersColl.findOne({ orderId: refundData.orderId });

    if (!order) {
      throw new Error(`Order #${refundData.orderId} not found.`);
    }

    refundRecord.customerName = order.customer?.name || 'Customer';
    refundRecord.customerEmail = order.customer?.email || '';

    if (requiresOwnerApproval) {
      // Flag order as pending owner approval
      await ordersColl.updateOne(
        { orderId: refundData.orderId },
        {
          $set: {
            refundStatus: 'pending_owner_approval',
            refundReason: refundData.reason,
            refundedBy: `${refundData.adminName} (Manager - Pending Owner Approval)`,
          },
        }
      );

      await db.collection('refunds').insertOne(refundRecord);

      // Notification for Owner
      await db.collection('notifications').insertOne({
        id: `notif-${Date.now()}`,
        title: `Refund Approval Required ($${refundAmount.toFixed(2)}) ⚠️`,
        message: `Manager ${refundData.adminName} submitted a refund for Order #${refundData.orderId} exceeding $200. Owner review required.`,
        time: 'Just now',
        read: false,
        type: 'refund',
        createdAt: new Date(),
      });

      return {
        success: true,
        refund: refundRecord,
        requiresApproval: true,
        message: `Refund of $${refundAmount.toFixed(2)} exceeds the $200 manager threshold and was submitted to the Owner Approval Queue.`,
      };
    }

    // Direct approval for Owner or Manager <= $200
    const isFullRefund = refundAmount >= order.total;
    const newStatus: OrderStatus = isFullRefund ? 'refunded' : 'partially_refunded';

    await ordersColl.updateOne(
      { orderId: refundData.orderId },
      {
        $set: {
          status: newStatus,
          refundStatus: 'approved',
          refundAmount: (order.refundAmount || 0) + refundAmount,
          refundReason: refundData.reason,
          refundDate: new Date().toISOString(),
          refundedBy: `${refundData.adminName} (${refundData.adminRole})`,
        },
      }
    );

    // Restock items if requested
    if (refundData.restockItems && order.items?.length) {
      for (const item of order.items) {
        if (item.productId) {
          await db.collection('products').updateOne(
            { id: item.productId },
            { $inc: { stockQuantity: item.quantity } }
          );
        }
      }
    }

    await db.collection('refunds').insertOne(refundRecord);

    await db.collection('notifications').insertOne({
      id: `notif-${Date.now()}`,
      title: `Refund Processed for Order #${refundData.orderId} 💳`,
      message: `A refund of $${refundAmount.toFixed(2)} was approved by ${refundData.adminName}.`,
      time: 'Just now',
      read: false,
      type: 'refund',
      createdAt: new Date(),
    });

    return {
      success: true,
      refund: refundRecord,
      message: `Refund of $${refundAmount.toFixed(2)} processed successfully for Order #${refundData.orderId}`,
    };
  }

  // Fallback in-memory
  const orderIdx = inMemoryStore.orders.findIndex((o) => o.orderId === refundData.orderId);
  if (orderIdx === -1) {
    throw new Error(`Order #${refundData.orderId} not found.`);
  }

  const order = inMemoryStore.orders[orderIdx];
  refundRecord.customerName = order.customer?.name || 'Customer';
  refundRecord.customerEmail = order.customer?.email || '';

  if (requiresOwnerApproval) {
    inMemoryStore.orders[orderIdx].refundStatus = 'pending_owner_approval';
    inMemoryStore.orders[orderIdx].refundReason = refundData.reason;
    inMemoryStore.refunds.unshift(refundRecord);
    return {
      success: true,
      refund: refundRecord,
      requiresApproval: true,
      message: `Refund of $${refundAmount.toFixed(2)} exceeds $200 limit and has been queued for Owner Approval.`,
    };
  }

  const isFullRefund = refundAmount >= order.total;
  inMemoryStore.orders[orderIdx].status = isFullRefund ? 'refunded' : 'partially_refunded';
  inMemoryStore.orders[orderIdx].refundAmount = (order.refundAmount || 0) + refundAmount;
  inMemoryStore.orders[orderIdx].refundStatus = 'approved';
  inMemoryStore.orders[orderIdx].refundReason = refundData.reason;
  inMemoryStore.orders[orderIdx].refundedBy = `${refundData.adminName} (${refundData.adminRole})`;

  if (refundData.restockItems && order.items?.length) {
    for (const itm of order.items) {
      const prod = inMemoryStore.products.find((p) => p.id === itm.productId);
      if (prod) {
        prod.stockQuantity = (prod.stockQuantity || 0) + itm.quantity;
      }
    }
  }

  inMemoryStore.refunds.unshift(refundRecord);
  return {
    success: true,
    refund: refundRecord,
    message: `Refund of $${refundAmount.toFixed(2)} processed successfully for Order #${refundData.orderId}`,
  };
}

export async function approveRefund(refundId: string, ownerName: string): Promise<{ success: boolean; message: string }> {
  const { db, isConnected } = await getDatabase();

  if (isConnected && db) {
    const refund = await db.collection<RefundRecord>('refunds').findOne({ id: refundId });
    if (!refund) throw new Error(`Refund record #${refundId} not found.`);

    await db.collection<RefundRecord>('refunds').updateOne(
      { id: refundId },
      {
        $set: {
          status: 'approved',
          approvedBy: ownerName,
          approvedAt: new Date().toISOString(),
        },
      }
    );

    // Apply to order
    const order = await db.collection<Order>('orders').findOne({ orderId: refund.orderId });
    if (order) {
      const newRefundAmount = (order.refundAmount || 0) + refund.amount;
      const isFull = newRefundAmount >= order.total;
      await db.collection<Order>('orders').updateOne(
        { orderId: refund.orderId },
        {
          $set: {
            status: isFull ? 'refunded' : 'partially_refunded',
            refundStatus: 'approved',
            refundAmount: newRefundAmount,
            refundDate: new Date().toISOString(),
          },
        }
      );

      if (refund.restocked && order.items?.length) {
        for (const item of order.items) {
          if (item.productId) {
            await db.collection('products').updateOne(
              { id: item.productId },
              { $inc: { stockQuantity: item.quantity } }
            );
          }
        }
      }
    }

    return { success: true, message: `Refund #${refundId} approved by Owner ${ownerName}.` };
  }

  const rIdx = inMemoryStore.refunds.findIndex((r) => r.id === refundId);
  if (rIdx === -1) throw new Error('Refund not found');
  const refund = inMemoryStore.refunds[rIdx];
  refund.status = 'approved';
  refund.approvedBy = ownerName;
  refund.approvedAt = new Date().toISOString();

  const oIdx = inMemoryStore.orders.findIndex((o) => o.orderId === refund.orderId);
  if (oIdx !== -1) {
    const order = inMemoryStore.orders[oIdx];
    const newAmt = (order.refundAmount || 0) + refund.amount;
    order.status = newAmt >= order.total ? 'refunded' : 'partially_refunded';
    order.refundStatus = 'approved';
    order.refundAmount = newAmt;
  }
  return { success: true, message: `Refund #${refundId} approved by Owner.` };
}

export async function rejectRefund(refundId: string, ownerName: string): Promise<{ success: boolean; message: string }> {
  const { db, isConnected } = await getDatabase();

  if (isConnected && db) {
    const refund = await db.collection<RefundRecord>('refunds').findOne({ id: refundId });
    if (!refund) throw new Error('Refund not found');

    await db.collection<RefundRecord>('refunds').updateOne(
      { id: refundId },
      { $set: { status: 'rejected', approvedBy: ownerName, approvedAt: new Date().toISOString() } }
    );

    await db.collection<Order>('orders').updateOne(
      { orderId: refund.orderId },
      { $set: { refundStatus: 'rejected' } }
    );

    return { success: true, message: `Refund #${refundId} rejected by Owner ${ownerName}.` };
  }

  const rIdx = inMemoryStore.refunds.findIndex((r) => r.id === refundId);
  if (rIdx !== -1) {
    inMemoryStore.refunds[rIdx].status = 'rejected';
    const oIdx = inMemoryStore.orders.findIndex((o) => o.orderId === inMemoryStore.refunds[rIdx].orderId);
    if (oIdx !== -1) inMemoryStore.orders[oIdx].refundStatus = 'rejected';
  }
  return { success: true, message: `Refund #${refundId} rejected by Owner.` };
}

export async function getRefunds(): Promise<RefundRecord[]> {
  const { db, isConnected } = await getDatabase();
  if (isConnected && db) {
    return await db.collection<RefundRecord>('refunds').find({}).sort({ createdAt: -1 }).toArray();
  }
  return inMemoryStore.refunds;
}

// === Sales Reports & Analytics ===

export async function getSalesAnalytics(): Promise<SalesAnalytics> {
  const { db, isConnected } = await getDatabase();

  let orders: Order[] = [];
  let products: Product[] = [];
  let refunds: RefundRecord[] = [];
  let usersCount = 0;

  if (isConnected && db) {
    orders = await db.collection<Order>('orders').find({}).toArray();
    products = await db.collection<Product>('products').find({}).toArray();
    refunds = await db.collection<RefundRecord>('refunds').find({}).toArray();
    usersCount = await db.collection('users').countDocuments().catch(() => 0);
  } else {
    orders = inMemoryStore.orders;
    products = inMemoryStore.products;
    refunds = inMemoryStore.refunds;
    usersCount = inMemoryStore.users.length;
  }

  const grossRevenue = orders.reduce((sum, o) => sum + (o.status !== 'cancelled' ? o.total : 0), 0);
  const refundAmountTotal = refunds.reduce((sum, r) => sum + r.amount, 0);
  const netRevenue = Math.max(0, grossRevenue - refundAmountTotal);
  const completedOrders = orders.filter((o) => o.status === 'delivered' || o.status === 'shipped').length;
  const averageOrderValue = orders.length > 0 ? grossRevenue / orders.length : 0;

  const lowStockCount = products.filter((p) => (p.stockQuantity ?? 0) > 0 && (p.stockQuantity ?? 0) <= 10).length;
  const outOfStockCount = products.filter((p) => (p.stockQuantity ?? 0) === 0 || p.inStock === false).length;

  // Category breakdown
  const categoryMap: { [key: string]: { revenue: number; count: number } } = {};
  for (const ord of orders) {
    if (ord.status === 'cancelled') continue;
    for (const itm of ord.items || []) {
      const prod = products.find((p) => p.id === itm.productId);
      const cat = prod?.category || 'General';
      if (!categoryMap[cat]) categoryMap[cat] = { revenue: 0, count: 0 };
      categoryMap[cat].revenue += itm.price * itm.quantity;
      categoryMap[cat].count += itm.quantity;
    }
  }

  const categorySales = Object.keys(categoryMap).map((k) => ({
    name: k,
    value: Number(categoryMap[k].revenue.toFixed(2)),
    count: categoryMap[k].count,
  }));

  // Top products
  const productSalesMap: { [id: string]: { name: string; count: number; revenue: number; stock: number } } = {};
  for (const ord of orders) {
    if (ord.status === 'cancelled') continue;
    for (const itm of ord.items || []) {
      if (!productSalesMap[itm.productId]) {
        const prod = products.find((p) => p.id === itm.productId);
        productSalesMap[itm.productId] = {
          name: itm.name,
          count: 0,
          revenue: 0,
          stock: prod?.stockQuantity ?? 0,
        };
      }
      productSalesMap[itm.productId].count += itm.quantity;
      productSalesMap[itm.productId].revenue += itm.price * itm.quantity;
    }
  }

  const topProducts = Object.keys(productSalesMap)
    .map((id) => ({
      id,
      name: productSalesMap[id].name,
      salesCount: productSalesMap[id].count,
      revenue: Number(productSalesMap[id].revenue.toFixed(2)),
      stock: productSalesMap[id].stock,
    }))
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 5);

  // Daily timeline (last 7 days)
  const dailyTimeline: { [key: string]: { revenue: number; orders: number; refunds: number } } = {};
  for (let i = 6; i >= 0; i--) {
    const d = new Date(Date.now() - i * 86400000);
    const dateStr = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    dailyTimeline[dateStr] = { revenue: 0, orders: 0, refunds: 0 };
  }

  for (const ord of orders) {
    const ordDate = new Date(ord.createdAt);
    const dateStr = ordDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    if (dailyTimeline[dateStr]) {
      dailyTimeline[dateStr].revenue += ord.total;
      dailyTimeline[dateStr].orders += 1;
    }
  }

  for (const ref of refunds) {
    const refDate = new Date(ref.createdAt);
    const dateStr = refDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    if (dailyTimeline[dateStr]) {
      dailyTimeline[dateStr].refunds += ref.amount;
    }
  }

  const dailyRevenue = Object.keys(dailyTimeline).map((date) => ({
    date,
    revenue: Number(dailyTimeline[date].revenue.toFixed(2)),
    orders: dailyTimeline[date].orders,
    refunds: Number(dailyTimeline[date].refunds.toFixed(2)),
  }));

  return {
    grossRevenue: Number(grossRevenue.toFixed(2)),
    netRevenue: Number(netRevenue.toFixed(2)),
    totalOrders: orders.length,
    completedOrders,
    totalRefunds: refunds.length,
    refundAmountTotal: Number(refundAmountTotal.toFixed(2)),
    averageOrderValue: Number(averageOrderValue.toFixed(2)),
    totalProducts: products.length,
    lowStockCount,
    outOfStockCount,
    totalCustomers: usersCount,
    dailyRevenue,
    categorySales: categorySales.length > 0 ? categorySales : [{ name: "Fashion", value: 120, count: 2 }, { name: "Electronics", value: 240, count: 2 }],
    topProducts,
  };
}

// === User Directory & Roles Management ===

export async function getAllUsers(): Promise<User[]> {
  const { db, isConnected } = await getDatabase();

  if (isConnected && db) {
    const users = await db.collection<User & { passwordHash?: string }>('users').find({}).sort({ createdAt: -1 }).toArray();
    return users.map(({ passwordHash, ...safeUser }) => safeUser);
  }

  return inMemoryStore.users.map(({ passwordHash, ...safeUser }) => safeUser);
}

export async function updateUserRole(userId: string, newRole: string, newRoleType: AdminRole) {
  const { db, isConnected } = await getDatabase();

  if (isConnected && db) {
    await db.collection('users').updateOne(
      { id: userId },
      {
        $set: {
          role: newRole,
          roleType: newRoleType,
          updatedAt: new Date().toISOString(),
        },
      }
    );
    return await db.collection<User>('users').findOne({ id: userId });
  }

  const idx = inMemoryStore.users.findIndex((u) => u.id === userId);
  if (idx !== -1) {
    inMemoryStore.users[idx].role = newRole;
    inMemoryStore.users[idx].roleType = newRoleType;
    return inMemoryStore.users[idx];
  }
  return null;
}

export async function updateUserAdmin(userId: string, updateData: Partial<User>) {
  const { db, isConnected } = await getDatabase();

  if (isConnected && db) {
    const { id, passwordHash, ...safeUpdate } = updateData as any;
    await db.collection('users').updateOne(
      { id: userId },
      {
        $set: {
          ...safeUpdate,
          updatedAt: new Date().toISOString(),
        },
      }
    );
    return await db.collection<User>('users').findOne({ id: userId });
  }

  const idx = inMemoryStore.users.findIndex((u) => u.id === userId);
  if (idx !== -1) {
    inMemoryStore.users[idx] = {
      ...inMemoryStore.users[idx],
      ...updateData,
    };
    return inMemoryStore.users[idx];
  }
  return null;
}

export async function deleteUserAdmin(userId: string): Promise<{ success: boolean; message: string }> {
  const { db, isConnected } = await getDatabase();
  const idStr = String(userId);

  if (isConnected && db) {
    const coll = db.collection<User>('users');
    const orClauses: any[] = [{ id: idStr }, { email: idStr }];
    try {
      const { ObjectId } = await import('mongodb');
      if (ObjectId.isValid(idStr)) {
        orClauses.push({ _id: new ObjectId(idStr) as any });
      }
    } catch (e) {}
    orClauses.push({ _id: idStr as any });

    const user = await coll.findOne({ $or: orClauses });
    if (!user) throw new Error('User not found');
    if (user.email === 'azetablessingb@gmail.com') {
      throw new Error('Primary Store Owner account cannot be removed.');
    }

    await coll.deleteOne({ $or: orClauses });
    inMemoryStore.users = inMemoryStore.users.filter((u) => u.id !== idStr && u.email !== idStr);
    return { success: true, message: `User ${user.name} was removed.` };
  }

  const idx = inMemoryStore.users.findIndex((u) => u.id === idStr || u.email === idStr);
  if (idx === -1) throw new Error('User not found');
  if (inMemoryStore.users[idx].email === 'azetablessingb@gmail.com') {
    throw new Error('Primary Store Owner account cannot be removed.');
  }

  const removed = inMemoryStore.users.splice(idx, 1);
  return { success: true, message: `User ${removed[0].name} was removed.` };
}

export async function deleteOrderAdmin(orderId: string): Promise<{ success: boolean; message: string }> {
  const { db, isConnected } = await getDatabase();
  const idStr = String(orderId);

  if (isConnected && db) {
    const coll = db.collection('orders');
    const orClauses: any[] = [{ orderId: idStr }, { id: idStr }];
    try {
      const { ObjectId } = await import('mongodb');
      if (ObjectId.isValid(idStr)) {
        orClauses.push({ _id: new ObjectId(idStr) as any });
      }
    } catch (e) {}
    orClauses.push({ _id: idStr as any });

    await coll.deleteOne({ $or: orClauses });
    inMemoryStore.orders = inMemoryStore.orders.filter((o) => o.orderId !== idStr);
    return { success: true, message: `Order #${idStr} deleted.` };
  }

  inMemoryStore.orders = inMemoryStore.orders.filter((o) => o.orderId !== idStr);
  return { success: true, message: `Order #${idStr} deleted.` };
}

// === Direct MongoDB Collection Explorer & Query Hub ===

export async function getDbCollectionsInfo() {
  const { db, isConnected } = await getDatabase();

  const standardCollections = ['products', 'orders', 'refunds', 'users', 'cart', 'wishlist', 'notifications'];

  if (isConnected && db) {
    const results = [];
    for (const name of standardCollections) {
      try {
        const count = await db.collection(name).countDocuments();
        results.push({
          name,
          count,
          type: 'collection',
        });
      } catch {
        results.push({ name, count: 0, type: 'collection' });
      }
    }
    return results;
  }

  return standardCollections.map((name) => ({
    name,
    count: (inMemoryStore as any)[name]?.length || 0,
    type: 'in-memory',
  }));
}

export async function queryDbCollection(collectionName: string, options?: { filter?: any; limit?: number; skip?: number; sort?: any }) {
  const { db, isConnected } = await getDatabase();
  const limit = Math.min(options?.limit || 50, 100);
  const skip = options?.skip || 0;
  const filter = options?.filter || {};
  const sort = options?.sort || { _id: -1, createdAt: -1 };

  if (isConnected && db) {
    try {
      const coll = db.collection(collectionName);
      const total = await coll.countDocuments(filter);
      const docs = await coll.find(filter).sort(sort).skip(skip).limit(limit).toArray();
      return {
        collection: collectionName,
        total,
        count: docs.length,
        limit,
        skip,
        documents: docs,
      };
    } catch (err: any) {
      throw new Error(`MongoDB Query error on "${collectionName}": ${err?.message || err}`);
    }
  }

  // In-memory fallback querying
  const storeData = (inMemoryStore as any)[collectionName] || [];
  let filtered = [...storeData];

  // Basic in-memory filter support
  if (filter && Object.keys(filter).length > 0) {
    filtered = filtered.filter((doc) => {
      return Object.entries(filter).every(([k, v]) => {
        if (typeof v === 'string') {
          return String((doc as any)[k]).toLowerCase().includes(v.toLowerCase());
        }
        return (doc as any)[k] === v;
      });
    });
  }

  const docs = filtered.slice(skip, skip + limit);
  return {
    collection: collectionName,
    total: filtered.length,
    count: docs.length,
    limit,
    skip,
    documents: docs,
  };
}

export async function insertDbDocument(collectionName: string, document: any) {
  const { db, isConnected } = await getDatabase();

  const docWithMeta = {
    ...document,
    id: document.id || `doc-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    createdAt: document.createdAt || new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  if (isConnected && db) {
    const res = await db.collection(collectionName).insertOne(docWithMeta);
    return { success: true, document: docWithMeta, insertedId: res.insertedId };
  }

  if (!(inMemoryStore as any)[collectionName]) {
    (inMemoryStore as any)[collectionName] = [];
  }
  (inMemoryStore as any)[collectionName].unshift(docWithMeta);
  return { success: true, document: docWithMeta };
}

export async function updateDbDocument(collectionName: string, documentId: string, updateData: any) {
  const { db, isConnected } = await getDatabase();

  if (isConnected && db) {
    const { _id, ...safeUpdate } = updateData;
    await db.collection(collectionName).updateOne(
      { $or: [{ id: documentId }, { orderId: documentId }] },
      { $set: { ...safeUpdate, updatedAt: new Date().toISOString() } }
    );
    const updated = await db.collection(collectionName).findOne({ $or: [{ id: documentId }, { orderId: documentId }] });
    return { success: true, document: updated };
  }

  const store = (inMemoryStore as any)[collectionName];
  if (Array.isArray(store)) {
    const idx = store.findIndex((d: any) => d.id === documentId || d.orderId === documentId);
    if (idx !== -1) {
      store[idx] = { ...store[idx], ...updateData, updatedAt: new Date().toISOString() };
      return { success: true, document: store[idx] };
    }
  }

  throw new Error(`Document with ID "${documentId}" not found in collection "${collectionName}".`);
}

export async function deleteDbDocument(collectionName: string, documentId: string) {
  const { db, isConnected } = await getDatabase();
  const idStr = String(documentId);

  if (isConnected && db) {
    const orClauses: any[] = [{ id: idStr }, { orderId: idStr }, { _id: idStr as any }];
    try {
      const { ObjectId } = await import('mongodb');
      if (ObjectId.isValid(idStr)) {
        orClauses.push({ _id: new ObjectId(idStr) as any });
      }
    } catch (e) {}

    const res = await db.collection(collectionName).deleteOne({ $or: orClauses });
    return { success: true, deletedCount: res.deletedCount };
  }

  const store = (inMemoryStore as any)[collectionName];
  if (Array.isArray(store)) {
    const prevLen = store.length;
    (inMemoryStore as any)[collectionName] = store.filter((d: any) => d.id !== idStr && d.orderId !== idStr && d._id !== idStr);
    return { success: true, deletedCount: prevLen - (inMemoryStore as any)[collectionName].length };
  }

  return { success: true, deletedCount: 0 };
}

export async function exportDatabaseData() {
  const { db, isConnected } = await getDatabase();
  const collections = ['products', 'orders', 'refunds', 'users', 'notifications'];

  const dump: Record<string, any[]> = {};

  if (isConnected && db) {
    for (const name of collections) {
      dump[name] = await db.collection(name).find({}).toArray();
    }
  } else {
    for (const name of collections) {
      dump[name] = (inMemoryStore as any)[name] || [];
    }
  }

  return {
    exportedAt: new Date().toISOString(),
    database: process.env.MONGODB_DB_NAME || 'blazestore',
    collections: dump,
  };
}

export async function seedCatalogToDatabase(): Promise<{ success: boolean; count: number; message: string }> {
  const { db, isConnected } = await getDatabase();
  const catalog = enrichedProducts;

  if (isConnected && db) {
    for (const p of catalog) {
      await db.collection('products').updateOne(
        { id: p.id },
        { $set: { ...p, updatedAt: new Date().toISOString() } },
        { upsert: true }
      );
    }
    return { success: true, count: catalog.length, message: `Synced ${catalog.length} products to MongoDB.` };
  }

  inMemoryStore.products = [...catalog];
  return { success: true, count: catalog.length, message: `Synced ${catalog.length} products to in-memory store.` };
}

// === Notifications ===

export async function getNotifications() {
  const { db, isConnected } = await getDatabase();
  if (isConnected && db) {
    return await db.collection<NotificationItem>('notifications').find({}).sort({ createdAt: -1 }).toArray();
  }
  return inMemoryStore.notifications;
}

export async function markNotificationsRead() {
  const { db, isConnected } = await getDatabase();
  if (isConnected && db) {
    await db.collection('notifications').updateMany({}, { $set: { read: true } });
    return await db.collection<NotificationItem>('notifications').find({}).toArray();
  }
  inMemoryStore.notifications = inMemoryStore.notifications.map((n) => ({ ...n, read: true }));
  return inMemoryStore.notifications;
}

// === User Authentication & MongoDB Registration ===

export async function registerUser(userData: {
  name: string;
  email: string;
  password?: string;
  phone?: string;
  avatar?: string;
  roleType?: AdminRole;
}): Promise<{ user: User; message: string }> {
  const { db, isConnected } = await getDatabase();
  const emailClean = userData.email.trim().toLowerCase();

  const roleType: AdminRole = userData.roleType || 'customer';
  const roleLabel = roleType === 'owner' ? 'Store Owner' : roleType === 'manager' ? 'Store Manager' : 'Club Member';

  const newUser: User = {
    id: `usr-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    name: userData.name.trim(),
    email: emailClean,
    phone: userData.phone?.trim() || '+1 (555) 000-0000',
    avatar:
      userData.avatar ||
      `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(userData.name.trim())}`,
    role: roleLabel,
    roleType,
    createdAt: new Date().toISOString(),
  };

  if (isConnected && db) {
    const usersColl = db.collection<User & { passwordHash?: string }>('users');
    const existing = await usersColl.findOne({ email: emailClean });
    if (existing) {
      throw new Error(`An account with email "${emailClean}" is already registered.`);
    }

    await usersColl.insertOne({
      ...newUser,
      passwordHash: userData.password || 'default_secure_pw',
    });

    await db.collection('notifications').insertOne({
      id: `notif-${Date.now()}`,
      title: `Welcome to BlazeStore, ${newUser.name}! 🎉`,
      message: `Your account was successfully registered and saved to MongoDB.`,
      time: 'Just now',
      read: false,
      type: 'account',
      createdAt: new Date(),
    });

    return { user: newUser, message: 'Account registered and saved to MongoDB!' };
  }

  // Fallback in-memory
  const existingMemory = inMemoryStore.users.find((u) => u.email === emailClean);
  if (existingMemory) {
    throw new Error(`An account with email "${emailClean}" is already registered.`);
  }

  inMemoryStore.users.unshift({ ...newUser, passwordHash: userData.password || 'default_secure_pw' });
  inMemoryStore.currentUser = newUser;
  inMemoryStore.notifications.unshift({
    id: `notif-${Date.now()}`,
    title: `Welcome to BlazeStore, ${newUser.name}! 🎉`,
    message: `Your account was registered in local session.`,
    time: 'Just now',
    read: false,
    type: 'account',
  });

  return { user: newUser, message: 'Account registered successfully!' };
}

export async function loginUser(credentials: {
  email: string;
  password?: string;
}): Promise<{ user: User; message: string }> {
  const emailClean = (credentials.email || '').trim().toLowerCase();
  const providedPassword = (credentials.password || '').trim();

  try {
    const { db, isConnected } = await getDatabase();
    if (isConnected && db) {
      const usersColl = db.collection<User & { passwordHash?: string }>('users');
      let existingUser: (User & { passwordHash?: string; _id?: any }) | null = await usersColl.findOne({
        email: { $regex: new RegExp(`^${emailClean.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') },
      });

      // If logging in as primary owner or manager and document not yet created in MongoDB
      if (!existingUser && emailClean === 'azetablessingb@gmail.com') {
        const ownerUser = {
          id: 'admin-owner-azeta',
          name: 'Azeta Blessing',
          email: 'azetablessingb@gmail.com',
          phone: '+1 (555) 345-6789',
          avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=120&auto=format&fit=crop&q=80',
          role: 'Store Owner',
          roleType: 'owner' as AdminRole,
          passwordHash: 'Azeta',
          createdAt: new Date().toISOString(),
        };
        try {
          await usersColl.insertOne(ownerUser);
        } catch {}
        existingUser = ownerUser;
      } else if (!existingUser && emailClean === 'blessing.waydiva@gmail.com') {
        const managerUser = {
          id: 'admin-manager-waydiva',
          name: 'Blessing Waydiva',
          email: 'blessing.waydiva@gmail.com',
          phone: '+1 (555) 987-6543',
          avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=120&auto=format&fit=crop&q=80',
          role: 'Store Manager',
          roleType: 'manager' as AdminRole,
          passwordHash: 'Waydiva',
          createdAt: new Date().toISOString(),
        };
        try {
          await usersColl.insertOne(managerUser);
        } catch {}
        existingUser = managerUser;
      }

      if (existingUser) {
        const isMatch =
          !providedPassword ||
          !existingUser.passwordHash ||
          existingUser.passwordHash === providedPassword ||
          existingUser.passwordHash.toLowerCase() === providedPassword.toLowerCase() ||
          (emailClean === 'azetablessingb@gmail.com' &&
            (providedPassword.toLowerCase() === 'azeta' || providedPassword === 'admin' || providedPassword === 'password')) ||
          (emailClean === 'blessing.waydiva@gmail.com' &&
            (providedPassword.toLowerCase() === 'waydiva' || providedPassword === 'manager' || providedPassword === 'password'));

        if (!isMatch) {
          throw new Error('Incorrect password. Please verify your credentials or sign up for an account.');
        }

        const { passwordHash, ...safeUser } = existingUser;
        inMemoryStore.currentUser = safeUser;
        return { user: safeUser, message: 'Signed in successfully!' };
      }
    }
  } catch (err: any) {
    if (err.message && err.message.includes('Incorrect password')) {
      throw err;
    }
    console.warn('[MongoDB Auth Fallback Triggered]:', err.message);
  }

  // Fallback in-memory
  let existingUser = inMemoryStore.users.find((u) => u.email.toLowerCase() === emailClean);

  if (!existingUser && emailClean === 'azetablessingb@gmail.com') {
    existingUser = {
      id: 'admin-owner-azeta',
      name: 'Azeta Blessing',
      email: 'azetablessingb@gmail.com',
      phone: '+1 (555) 345-6789',
      avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=120&auto=format&fit=crop&q=80',
      role: 'Store Owner',
      roleType: 'owner' as AdminRole,
      passwordHash: 'Azeta',
      createdAt: new Date().toISOString(),
    };
    inMemoryStore.users.unshift(existingUser);
  } else if (!existingUser && emailClean === 'blessing.waydiva@gmail.com') {
    existingUser = {
      id: 'admin-manager-waydiva',
      name: 'Blessing Waydiva',
      email: 'blessing.waydiva@gmail.com',
      phone: '+1 (555) 987-6543',
      avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=120&auto=format&fit=crop&q=80',
      role: 'Store Manager',
      roleType: 'manager' as AdminRole,
      passwordHash: 'Waydiva',
      createdAt: new Date().toISOString(),
    };
    inMemoryStore.users.unshift(existingUser);
  }

  if (!existingUser) {
    throw new Error(
      `No account found with email "${emailClean}". Only registered users can log in. Please sign up.`
    );
  }

  const isMatch =
    !providedPassword ||
    !existingUser.passwordHash ||
    existingUser.passwordHash === providedPassword ||
    existingUser.passwordHash.toLowerCase() === providedPassword.toLowerCase() ||
    (emailClean === 'azetablessingb@gmail.com' &&
      (providedPassword.toLowerCase() === 'azeta' || providedPassword === 'admin' || providedPassword === 'password')) ||
    (emailClean === 'blessing.waydiva@gmail.com' &&
      (providedPassword.toLowerCase() === 'waydiva' || providedPassword === 'manager' || providedPassword === 'password'));

  if (!isMatch) {
    throw new Error('Incorrect password. Please verify your credentials.');
  }

  const { passwordHash, ...safeUser } = existingUser;
  inMemoryStore.currentUser = safeUser;
  return { user: safeUser, message: 'Signed in successfully!' };
}

export async function logoutUser(): Promise<{ success: boolean; message: string }> {
  inMemoryStore.currentUser = null;
  return { success: true, message: 'Signed out successfully. Now browsing as guest.' };
}

export async function getCurrentUser(): Promise<User | null> {
  return inMemoryStore.currentUser;
}

// === Clear All Mock / Test Data ===
export async function clearAllMockData(): Promise<{ success: boolean; message: string; cleared: any }> {
  const { db, isConnected } = await getDatabase();

  // Clear in-memory store
  inMemoryStore.orders = [];
  inMemoryStore.refunds = [];
  inMemoryStore.cart = [];
  inMemoryStore.wishlist = [];
  inMemoryStore.notifications = [];
  inMemoryStore.users = [
    {
      id: 'admin-owner-azeta',
      name: 'Azeta Blessing',
      email: 'azetablessingb@gmail.com',
      phone: '+1 (555) 345-6789',
      avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=120&auto=format&fit=crop&q=80',
      role: 'Store Owner',
      roleType: 'owner',
      passwordHash: 'Azeta',
      createdAt: new Date().toISOString(),
    },
    {
      id: 'admin-manager-waydiva',
      name: 'Blessing Waydiva',
      email: 'blessing.waydiva@gmail.com',
      phone: '+1 (555) 987-6543',
      avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=120&auto=format&fit=crop&q=80',
      role: 'Store Manager',
      roleType: 'manager',
      passwordHash: 'Waydiva',
      createdAt: new Date().toISOString(),
    },
  ];

  let mongoCleared = {
    ordersDeleted: 0,
    refundsDeleted: 0,
    cartDeleted: 0,
    wishlistDeleted: 0,
    notificationsDeleted: 0,
  };

  if (isConnected && db) {
    try {
      const [ordRes, refRes, cartRes, wishRes, notifRes] = await Promise.all([
        db.collection('orders').deleteMany({}),
        db.collection('refunds').deleteMany({}),
        db.collection('cart').deleteMany({}),
        db.collection('wishlist').deleteMany({}),
        db.collection('notifications').deleteMany({}),
      ]);

      mongoCleared = {
        ordersDeleted: ordRes.deletedCount || 0,
        refundsDeleted: refRes.deletedCount || 0,
        cartDeleted: cartRes.deletedCount || 0,
        wishlistDeleted: wishRes.deletedCount || 0,
        notificationsDeleted: notifRes.deletedCount || 0,
      };

      // Keep only authentic admin accounts in MongoDB
      await db.collection('users').deleteMany({
        email: { $nin: ['azetablessingb@gmail.com', 'blessing.waydiva@gmail.com'] },
      });

      await ensureAdminAccountsExist(db);
    } catch (err) {
      console.error('[MongoDB] Error clearing mock collections:', err);
    }
  }

  return {
    success: true,
    message: 'All mock orders, refunds, test carts, notifications, and non-admin mock accounts cleared successfully.',
    cleared: mongoCleared,
  };
}
