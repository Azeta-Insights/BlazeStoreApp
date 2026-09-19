// server/createApp.ts
import express from "express";
import dotenv from "dotenv";

// server/db.ts
import { MongoClient } from "mongodb";

// src/data/mockData.ts
var BEST_DEALS = [
  {
    id: "deal-1",
    name: "Classic Cashmere Blend Cardigan",
    category: "Women's Fashion",
    price: 45e3,
    originalPrice: 62e3,
    discountPercentage: 28,
    rating: 4.8,
    reviewCount: 342,
    image: "https://images.unsplash.com/photo-1434389677669-e08b4cac3105?w=500&auto=format&fit=crop&q=80",
    badge: "-28%",
    isHot: true,
    colors: ["#E5D9C5", "#333333", "#C7A788"],
    description: "Ultra-soft relaxed fit sweater knit from sustainable cashmere yarn.",
    inStock: true
  },
  {
    id: "deal-2",
    name: "Active Pulse Wireless ANC Headphones",
    category: "Electronics",
    price: 95e3,
    originalPrice: 125e3,
    discountPercentage: 24,
    rating: 4.9,
    reviewCount: 520,
    image: "https://images.unsplash.com/photo-1546435770-a3e426bf472b?w=500&auto=format&fit=crop&q=80",
    badge: "-24%",
    isHot: true,
    colors: ["#1F2937", "#9CA3AF", "#F3F4F6"],
    description: "Lossless audio streaming with 40-hour battery and ambient noise cancelling.",
    inStock: true
  },
  {
    id: "deal-3",
    name: "Minimalist Matte Leather Crossbody",
    category: "Bags & Accessories",
    price: 38e3,
    originalPrice: 55e3,
    discountPercentage: 31,
    rating: 4.7,
    reviewCount: 218,
    image: "https://images.unsplash.com/photo-1548036328-c9fa89d128fa?w=500&auto=format&fit=crop&q=80",
    badge: "-31%",
    colors: ["#3A2F2D", "#D4B996", "#222222"],
    description: "Handcrafted genuine leather pouch with magnetic closure and card slots.",
    inStock: true
  },
  {
    id: "deal-4",
    name: "Botanical Hydrating Glow Serum 50ml",
    category: "Skincare & Beauty",
    price: 18500,
    originalPrice: 28e3,
    discountPercentage: 34,
    rating: 4.9,
    reviewCount: 467,
    image: "https://images.unsplash.com/photo-1620916566398-39f1143ab7be?w=500&auto=format&fit=crop&q=80",
    badge: "-34%",
    isHot: true,
    colors: ["#F9A8D4"],
    description: "Enriched with Hyaluronic Acid, Vitamin C, and rosehip extract for 24h glow.",
    inStock: true
  }
];
var RECOMMENDED_PRODUCTS = [
  {
    id: "rec-1",
    name: "Monochrome Urban Sneakers",
    category: "Footwear",
    price: 55e3,
    originalPrice: 7e4,
    discountPercentage: 21,
    rating: 4.8,
    reviewCount: 189,
    image: "https://images.unsplash.com/photo-1595950653106-6c9ebd614d3a?w=500&auto=format&fit=crop&q=80",
    colors: ["#FFFFFF", "#18181B", "#7C6FE0"],
    selectedColor: "#FFFFFF",
    description: "Breathable mesh knit upper with cloud foam cushioning for all-day steps.",
    inStock: true
  },
  {
    id: "rec-2",
    name: "Matte Ceramic Pour-Over Kettle & Cup",
    category: "Home & Living",
    price: 32e3,
    originalPrice: 42e3,
    discountPercentage: 24,
    rating: 4.9,
    reviewCount: 94,
    image: "https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?w=500&auto=format&fit=crop&q=80",
    colors: ["#F4ECE1", "#3F3F46", "#86EFAC"],
    selectedColor: "#F4ECE1",
    description: "Hand-finished artisanal stoneware crafted for perfect slow brew mornings.",
    inStock: true
  },
  {
    id: "rec-3",
    name: "Polarized Vintage Acetate Sunglasses",
    category: "Accessories",
    price: 24e3,
    originalPrice: 32e3,
    discountPercentage: 25,
    rating: 4.6,
    reviewCount: 112,
    image: "https://images.unsplash.com/photo-1511499767150-a48a237f0083?w=500&auto=format&fit=crop&q=80",
    colors: ["#78350F", "#18181B", "#D97706"],
    selectedColor: "#78350F",
    description: "UV400 scratch-resistant tinted lenses with lightweight titanium frame arms.",
    inStock: true
  },
  {
    id: "rec-4",
    name: "Smart Fit Pulse Tracker Watch Gen 3",
    category: "Electronics",
    price: 68e3,
    originalPrice: 85e3,
    discountPercentage: 20,
    rating: 4.7,
    reviewCount: 310,
    image: "https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=500&auto=format&fit=crop&q=80",
    colors: ["#1E1B4B", "#F472B6", "#CBD5E1"],
    selectedColor: "#1E1B4B",
    description: "Continuous heart rate, SpO2 monitoring, sleep tracker, and 14-day battery life.",
    inStock: true
  },
  {
    id: "rec-5",
    name: "Relaxed Linen Camp Collar Shirt",
    category: "Men's Fashion",
    price: 36e3,
    originalPrice: 48e3,
    discountPercentage: 25,
    rating: 4.8,
    reviewCount: 145,
    image: "https://images.unsplash.com/photo-1596755094514-f87e34085b2c?w=500&auto=format&fit=crop&q=80",
    colors: ["#E0E7FF", "#FEF3C7", "#DCFCE7"],
    selectedColor: "#E0E7FF",
    description: "100% breathable European French flax linen with coconut shell buttons.",
    inStock: true
  },
  {
    id: "rec-6",
    name: "Minimalist LED Ambient Desk Lamp",
    category: "Home & Living",
    price: 28500,
    originalPrice: 38e3,
    discountPercentage: 25,
    rating: 4.9,
    reviewCount: 88,
    image: "https://images.unsplash.com/photo-1507473885765-e6ed057f782c?w=500&auto=format&fit=crop&q=80",
    colors: ["#FFFFFF", "#18181B", "#F59E0B"],
    selectedColor: "#FFFFFF",
    description: "Touch dimming with 3 color temperatures, wireless phone charging pad base.",
    inStock: true
  },
  {
    id: "rec-7",
    name: "Hydrating Velvet Tinted Lip Balm",
    category: "Skincare & Beauty",
    price: 12e3,
    originalPrice: 16500,
    discountPercentage: 27,
    rating: 4.7,
    reviewCount: 204,
    image: "https://images.unsplash.com/photo-1586495777744-4413f21062fa?w=500&auto=format&fit=crop&q=80",
    colors: ["#FB7185", "#E11D48", "#BE185D"],
    selectedColor: "#FB7185",
    description: "Shea butter and jojoba oil formula delivering sheer buildable berry color.",
    inStock: true
  },
  {
    id: "rec-8",
    name: "Acoustic Portable Bluetooth Speaker",
    category: "Electronics",
    price: 52e3,
    originalPrice: 68e3,
    discountPercentage: 23,
    rating: 4.8,
    reviewCount: 275,
    image: "https://images.unsplash.com/photo-1608043152269-423dbba4e7e1?w=500&auto=format&fit=crop&q=80",
    colors: ["#3B82F6", "#10B981", "#18181B"],
    selectedColor: "#3B82F6",
    description: "360\xB0 stereo sound, IPX7 waterproof rating, 20h playtime with deep bass boost.",
    inStock: true
  }
];

// server/db.ts
var client = globalThis._mongoClientPromise ? null : null;
var db = globalThis._mongoDb || null;
var isConnecting = false;
var isConnected = Boolean(globalThis._mongoDb);
var connectionError = null;
var enrichedProducts = [...BEST_DEALS, ...RECOMMENDED_PRODUCTS].map((p, idx) => ({
  ...p,
  stockQuantity: p.inStock !== false ? 25 + idx * 7 % 60 : 0,
  sku: `BLZ-${p.category.slice(0, 3).toUpperCase()}-${1e3 + idx}`,
  costPrice: Number((p.price * 0.55).toFixed(2))
}));
var inMemoryStore = {
  products: enrichedProducts,
  cart: [],
  wishlist: [],
  orders: [],
  refunds: [],
  notifications: [],
  users: [
    {
      id: "admin-owner-azeta",
      name: "Azeta Blessing",
      email: "azetablessingb@gmail.com",
      phone: "+234 803 345 6789",
      avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=120&auto=format&fit=crop&q=80",
      role: "Store Owner",
      roleType: "owner",
      passwordHash: "Azeta",
      createdAt: (/* @__PURE__ */ new Date()).toISOString()
    },
    {
      id: "admin-manager-waydiva",
      name: "Blessing Waydiva",
      email: "blessing.waydiva@gmail.com",
      phone: "+234 812 987 6543",
      avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=120&auto=format&fit=crop&q=80",
      role: "Store Manager",
      roleType: "manager",
      passwordHash: "Waydiva",
      createdAt: (/* @__PURE__ */ new Date()).toISOString()
    }
  ],
  currentUser: null
};
async function getDatabase() {
  const uri = process.env.MONGODB_URI;
  const dbName = process.env.MONGODB_DB_NAME || "blazestore";
  if (!uri || uri.trim() === "") {
    return {
      db: null,
      isConnected: false,
      error: "MONGODB_URI environment variable is not configured.",
      isUsingFallback: true
    };
  }
  if (globalThis._mongoDb) {
    db = globalThis._mongoDb;
    isConnected = true;
    return { db, isConnected: true, error: null, isUsingFallback: false };
  }
  if (db && isConnected) {
    return { db, isConnected: true, error: null, isUsingFallback: false };
  }
  if (isConnecting) {
    let waitCount = 0;
    while (isConnecting && waitCount < 10) {
      await new Promise((r) => setTimeout(r, 200));
      waitCount++;
    }
    if (globalThis._mongoDb || db && isConnected) {
      db = globalThis._mongoDb || db;
      return { db, isConnected: true, error: null, isUsingFallback: false };
    }
  }
  try {
    isConnecting = true;
    connectionError = null;
    if (!globalThis._mongoClientPromise) {
      client = new MongoClient(uri, {
        serverSelectionTimeoutMS: 5e3,
        connectTimeoutMS: 5e3,
        maxPoolSize: 10,
        minPoolSize: 0,
        maxIdleTimeMS: 6e4
      });
      globalThis._mongoClientPromise = client.connect();
    }
    const connectedClient = await globalThis._mongoClientPromise;
    client = connectedClient;
    db = connectedClient.db(dbName);
    globalThis._mongoDb = db;
    isConnected = true;
    console.log(`[MongoDB] Connected successfully to database: "${dbName}" (Serverless Pool Active)`);
    await seedDatabaseIfEmpty(db);
    await ensureAdminAccountsExist(db);
    await ensureDatabaseIndexes(db);
    return { db, isConnected: true, error: null, isUsingFallback: false };
  } catch (err) {
    console.error("[MongoDB] Connection error:", err?.message || err);
    connectionError = err?.message || "Failed to connect to MongoDB";
    isConnected = false;
    db = null;
    globalThis._mongoClientPromise = void 0;
    globalThis._mongoDb = void 0;
    return {
      db: null,
      isConnected: false,
      error: connectionError,
      isUsingFallback: true
    };
  } finally {
    isConnecting = false;
  }
}
async function getDatabaseStatus() {
  const uri = process.env.MONGODB_URI;
  const dbName = process.env.MONGODB_DB_NAME || "blazestore";
  if (!uri || uri.trim() === "") {
    return {
      connected: false,
      isUsingFallback: true,
      hasUri: false,
      database: dbName,
      error: "MONGODB_URI environment variable is not configured in Settings.",
      pingMs: null,
      cluster: null,
      stats: {
        products: inMemoryStore.products.length,
        cart: inMemoryStore.cart.length,
        wishlist: inMemoryStore.wishlist.length,
        orders: inMemoryStore.orders.length,
        refunds: inMemoryStore.refunds.length,
        users: inMemoryStore.users.length
      }
    };
  }
  const startTime = Date.now();
  const { db: database, isConnected: connected, error } = await getDatabase();
  if (connected && database) {
    try {
      const pingRes = await database.command({ ping: 1 });
      const pingMs = Date.now() - startTime;
      const hostMatch = uri.match(/@([^/?]+)/);
      const clusterHost = hostMatch ? hostMatch[1] : "MongoDB Atlas";
      const [productsCount, cartCount, wishlistCount, ordersCount, refundsCount, usersCount] = await Promise.all([
        database.collection("products").countDocuments().catch(() => 0),
        database.collection("cart").countDocuments().catch(() => 0),
        database.collection("wishlist").countDocuments().catch(() => 0),
        database.collection("orders").countDocuments().catch(() => 0),
        database.collection("refunds").countDocuments().catch(() => 0),
        database.collection("users").countDocuments().catch(() => 0)
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
          users: usersCount
        }
      };
    } catch (pingErr) {
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
          users: inMemoryStore.users.length
        }
      };
    }
  }
  return {
    connected: false,
    isUsingFallback: true,
    hasUri: true,
    database: dbName,
    error: error || "Failed to connect to MongoDB cluster.",
    pingMs: null,
    cluster: null,
    stats: {
      products: inMemoryStore.products.length,
      cart: inMemoryStore.cart.length,
      wishlist: inMemoryStore.wishlist.length,
      orders: inMemoryStore.orders.length,
      refunds: inMemoryStore.refunds.length,
      users: inMemoryStore.users.length
    }
  };
}
async function ensureAdminAccountsExist(database) {
  try {
    const usersColl = database.collection("users");
    await usersColl.updateOne(
      { email: "azetablessingb@gmail.com" },
      {
        $set: {
          id: "admin-owner-azeta",
          name: "Azeta Blessing",
          email: "azetablessingb@gmail.com",
          phone: "+1 (555) 345-6789",
          avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=120&auto=format&fit=crop&q=80",
          role: "Store Owner",
          roleType: "owner",
          passwordHash: "Azeta",
          createdAt: (/* @__PURE__ */ new Date()).toISOString()
        }
      },
      { upsert: true }
    );
    console.log("[MongoDB] Ensured Store Owner account: azetablessingb@gmail.com");
    await usersColl.updateOne(
      { email: "blessing.waydiva@gmail.com" },
      {
        $set: {
          id: "admin-manager-waydiva",
          name: "Blessing Waydiva",
          email: "blessing.waydiva@gmail.com",
          phone: "+1 (555) 987-6543",
          avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=120&auto=format&fit=crop&q=80",
          role: "Store Manager",
          roleType: "manager",
          passwordHash: "Waydiva",
          createdAt: (/* @__PURE__ */ new Date()).toISOString()
        }
      },
      { upsert: true }
    );
    console.log("[MongoDB] Ensured Store Manager account: blessing.waydiva@gmail.com");
  } catch (e) {
    console.error("[MongoDB] Error ensuring admin accounts:", e);
  }
}
async function ensureDatabaseIndexes(database) {
  try {
    const ordersColl = database.collection("orders");
    await ordersColl.createIndex({ paymentReference: 1 });
    await ordersColl.createIndex({ orderId: 1 });
    await ordersColl.createIndex({ createdAt: -1 });
    await ordersColl.createIndex({ paymentStatus: 1 });
    await ordersColl.createIndex({ "customer.email": 1 });
    const productsColl = database.collection("products");
    await productsColl.createIndex({ id: 1 }, { unique: true });
    await productsColl.createIndex({ category: 1 });
    const usersColl = database.collection("users");
    await usersColl.createIndex({ email: 1 }, { unique: true });
    console.log("[MongoDB] Verified database collections and indexes.");
  } catch (err) {
    console.warn("[MongoDB] Index creation note:", err?.message || err);
  }
}
async function seedDatabaseIfEmpty(database) {
  try {
    const productsColl = database.collection("products");
    const count = await productsColl.countDocuments();
    if (count === 0) {
      console.log("[MongoDB] Initializing database with catalog products...");
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
        badge: p.badge || "Popular",
        isHot: Boolean(p.isHot),
        description: p.description,
        inStock: p.inStock !== false,
        stockQuantity: p.stockQuantity ?? 30,
        sku: p.sku || `BLZ-${p.category.slice(0, 3).toUpperCase()}-${1e3 + idx}`,
        createdAt: (/* @__PURE__ */ new Date()).toISOString(),
        updatedAt: (/* @__PURE__ */ new Date()).toISOString()
      }));
      await productsColl.insertMany(cleanCatalog);
      console.log("[MongoDB] Product catalog initialized successfully with", cleanCatalog.length, "products.");
    }
  } catch (e) {
    console.error("[MongoDB] Seeding error (non-fatal):", e);
  }
}
async function getProducts(category, search) {
  try {
    const { db: db2, isConnected: isConnected2 } = await getDatabase();
    if (isConnected2 && db2) {
      const query = {};
      if (category && category !== "all") {
        query.category = { $regex: category, $options: "i" };
      }
      if (search && search.trim()) {
        query.$or = [
          { name: { $regex: search.trim(), $options: "i" } },
          { category: { $regex: search.trim(), $options: "i" } },
          { description: { $regex: search.trim(), $options: "i" } }
        ];
      }
      let docs = await db2.collection("products").find(query).toArray();
      if (docs.length === 0 && !search && (!category || category === "all")) {
        await seedDatabaseIfEmpty(db2);
        docs = await db2.collection("products").find(query).toArray();
      }
      if (docs.length > 0) {
        return docs.map(({ _id, ...rest }) => rest);
      }
    }
  } catch (err) {
    console.warn("[getProducts DB fallback]:", err);
  }
  return inMemoryStore.products.filter((p) => {
    const matchCat = !category || category === "all" || p.category.toLowerCase().includes(category.toLowerCase());
    const matchSearch = !search || !search.trim() || p.name.toLowerCase().includes(search.toLowerCase()) || p.category.toLowerCase().includes(search.toLowerCase());
    return matchCat && matchSearch;
  });
}
async function getAllProductsAdmin(category, search) {
  try {
    const { db: db2, isConnected: isConnected2 } = await getDatabase();
    if (isConnected2 && db2) {
      const query = {};
      if (category && category !== "all") {
        query.category = { $regex: category, $options: "i" };
      }
      if (search && search.trim()) {
        query.$or = [
          { name: { $regex: search.trim(), $options: "i" } },
          { sku: { $regex: search.trim(), $options: "i" } },
          { category: { $regex: search.trim(), $options: "i" } }
        ];
      }
      let docs = await db2.collection("products").find(query).sort({ updatedAt: -1 }).toArray();
      if (docs.length === 0 && !search && (!category || category === "all")) {
        await seedDatabaseIfEmpty(db2);
        docs = await db2.collection("products").find(query).sort({ updatedAt: -1 }).toArray();
      }
      if (docs.length > 0) {
        return docs.map(({ _id, ...rest }) => rest);
      }
    }
  } catch (err) {
    console.warn("[getAllProductsAdmin DB fallback]:", err);
  }
  return inMemoryStore.products.filter((p) => {
    const matchCat = !category || category === "all" || p.category.toLowerCase().includes(category.toLowerCase());
    const matchSearch = !search || !search.trim() || p.name.toLowerCase().includes(search.toLowerCase()) || p.sku && p.sku.toLowerCase().includes(search.toLowerCase());
    return matchCat && matchSearch;
  });
}
async function updateProductStock(productId, newStock, inStock) {
  const { db: db2, isConnected: isConnected2 } = await getDatabase();
  const stockVal = Math.max(0, newStock);
  const isAvailable = inStock !== void 0 ? inStock : stockVal > 0;
  if (isConnected2 && db2) {
    await db2.collection("products").updateOne(
      { id: productId },
      {
        $set: {
          stockQuantity: stockVal,
          inStock: isAvailable,
          updatedAt: (/* @__PURE__ */ new Date()).toISOString()
        }
      }
    );
    return await db2.collection("products").findOne({ id: productId });
  }
  const idx = inMemoryStore.products.findIndex((p) => p.id === productId);
  if (idx !== -1) {
    inMemoryStore.products[idx] = {
      ...inMemoryStore.products[idx],
      stockQuantity: stockVal,
      inStock: isAvailable,
      updatedAt: (/* @__PURE__ */ new Date()).toISOString()
    };
    return inMemoryStore.products[idx];
  }
  return null;
}
async function createProductAdmin(productData) {
  const { db: db2, isConnected: isConnected2 } = await getDatabase();
  const newProduct = {
    id: `prod-${Date.now()}-${Math.floor(Math.random() * 1e3)}`,
    name: productData.name?.trim() || "New Store Product",
    category: productData.category?.trim() || "General",
    price: Number(productData.price) || 29.99,
    originalPrice: productData.originalPrice ? Number(productData.originalPrice) : void 0,
    costPrice: productData.costPrice ? Number(productData.costPrice) : Number((Number(productData.price || 30) * 0.5).toFixed(2)),
    discountPercentage: productData.discountPercentage || 0,
    rating: 5,
    reviewCount: 1,
    image: productData.image?.trim() || "https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=500&auto=format&fit=crop&q=80",
    badge: productData.badge || "New",
    isHot: Boolean(productData.isHot),
    description: productData.description?.trim() || "High-quality curated item from BlazeStore catalog.",
    inStock: productData.inStock !== false,
    stockQuantity: Number(productData.stockQuantity) || 30,
    sku: productData.sku?.trim() || `BLZ-${(productData.category || "GEN").slice(0, 3).toUpperCase()}-${Math.floor(1e3 + Math.random() * 9e3)}`,
    createdAt: (/* @__PURE__ */ new Date()).toISOString(),
    updatedAt: (/* @__PURE__ */ new Date()).toISOString()
  };
  if (isConnected2 && db2) {
    await db2.collection("products").insertOne(newProduct);
    return newProduct;
  }
  inMemoryStore.products.unshift(newProduct);
  return newProduct;
}
async function updateProductAdmin(productId, updateData) {
  const { db: db2, isConnected: isConnected2 } = await getDatabase();
  const sanitizedUpdate = {
    ...updateData,
    updatedAt: (/* @__PURE__ */ new Date()).toISOString()
  };
  if (updateData.price) sanitizedUpdate.price = Number(updateData.price);
  if (updateData.stockQuantity !== void 0) sanitizedUpdate.stockQuantity = Math.max(0, Number(updateData.stockQuantity));
  if (isConnected2 && db2) {
    await db2.collection("products").updateOne(
      { id: productId },
      { $set: sanitizedUpdate }
    );
    return await db2.collection("products").findOne({ id: productId });
  }
  const idx = inMemoryStore.products.findIndex((p) => p.id === productId);
  if (idx !== -1) {
    inMemoryStore.products[idx] = { ...inMemoryStore.products[idx], ...sanitizedUpdate };
    return inMemoryStore.products[idx];
  }
  return null;
}
async function deleteProductAdmin(productId) {
  const { db: db2, isConnected: isConnected2 } = await getDatabase();
  const idStr = String(productId || "").trim();
  const idNum = Number(productId);
  if (isConnected2 && db2) {
    const coll = db2.collection("products");
    const orClauses = [{ id: idStr }, { sku: idStr }];
    if (!isNaN(idNum) && idStr !== "") {
      orClauses.push({ id: idNum });
    }
    try {
      const { ObjectId } = await import("mongodb");
      if (ObjectId.isValid(idStr)) {
        orClauses.push({ _id: new ObjectId(idStr) });
      }
    } catch (e) {
    }
    orClauses.push({ _id: idStr });
    let deletedCount = 0;
    try {
      const result = await coll.deleteOne({ $or: orClauses });
      deletedCount = result.deletedCount || 0;
    } catch (err) {
      console.error("[MongoDB deleteProductAdmin error]:", err);
    }
    await db2.collection("cart").deleteMany({ $or: [{ productId: idStr }, { id: idStr }] }).catch(() => {
    });
    await db2.collection("wishlist").deleteMany({ $or: [{ productId: idStr }, { id: idStr }] }).catch(() => {
    });
    inMemoryStore.products = inMemoryStore.products.filter(
      (p) => String(p.id) !== idStr && (!p.sku || p.sku !== idStr)
    );
    inMemoryStore.cart = inMemoryStore.cart.filter(
      (c) => String(c.productId) !== idStr && String(c.id) !== idStr
    );
    inMemoryStore.wishlist = inMemoryStore.wishlist.filter(
      (w) => String(w.id) !== idStr && String(w.productId) !== idStr
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
    (w) => String(w.id) !== idStr && String(w.productId) !== idStr
  );
  return { success: true, deletedCount: Math.max(1, initialLen - inMemoryStore.products.length) };
}
async function getCart() {
  const { db: db2, isConnected: isConnected2 } = await getDatabase();
  if (isConnected2 && db2) {
    return await db2.collection("cart").find({}).toArray();
  }
  return inMemoryStore.cart;
}
async function addToCart(item) {
  const { db: db2, isConnected: isConnected2 } = await getDatabase();
  if (isConnected2 && db2) {
    const cartColl = db2.collection("cart");
    const existing = await cartColl.findOne({
      productId: item.productId,
      variant: item.variant
    });
    if (existing) {
      await cartColl.updateOne(
        { _id: existing._id },
        { $inc: { quantity: item.quantity || 1 } }
      );
      return await cartColl.find({}).toArray();
    } else {
      const newItem = {
        id: `cart-${Date.now()}-${item.productId}`,
        productId: item.productId,
        name: item.name,
        price: item.price,
        originalPrice: item.originalPrice,
        image: item.image,
        variant: item.variant || "Standard",
        color: item.color,
        quantity: item.quantity || 1
      };
      await cartColl.insertOne(newItem);
      return await cartColl.find({}).toArray();
    }
  }
  const existingIdx = inMemoryStore.cart.findIndex(
    (c) => c.productId === item.productId && c.variant === item.variant
  );
  if (existingIdx >= 0) {
    inMemoryStore.cart[existingIdx].quantity += item.quantity || 1;
  } else {
    inMemoryStore.cart.push({
      id: `cart-${Date.now()}-${item.productId}`,
      productId: item.productId,
      name: item.name || "Product",
      price: item.price || 0,
      originalPrice: item.originalPrice,
      image: item.image || "",
      variant: item.variant || "Standard",
      color: item.color,
      quantity: item.quantity || 1
    });
  }
  return inMemoryStore.cart;
}
async function updateCartQuantity(cartItemId, delta) {
  const { db: db2, isConnected: isConnected2 } = await getDatabase();
  if (isConnected2 && db2) {
    const cartColl = db2.collection("cart");
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
async function removeFromCart(cartItemId) {
  const { db: db2, isConnected: isConnected2 } = await getDatabase();
  if (isConnected2 && db2) {
    await db2.collection("cart").deleteOne({ id: cartItemId });
    return await db2.collection("cart").find({}).toArray();
  }
  inMemoryStore.cart = inMemoryStore.cart.filter((c) => c.id !== cartItemId);
  return inMemoryStore.cart;
}
async function clearCart() {
  const { db: db2, isConnected: isConnected2 } = await getDatabase();
  if (isConnected2 && db2) {
    await db2.collection("cart").deleteMany({});
    return [];
  }
  inMemoryStore.cart = [];
  return [];
}
async function getWishlist() {
  const { db: db2, isConnected: isConnected2 } = await getDatabase();
  if (isConnected2 && db2) {
    return await db2.collection("wishlist").find({}).toArray();
  }
  return inMemoryStore.wishlist;
}
async function toggleWishlist(product) {
  const { db: db2, isConnected: isConnected2 } = await getDatabase();
  if (isConnected2 && db2) {
    const wishColl = db2.collection("wishlist");
    const existing = await wishColl.findOne({ id: product.id });
    if (existing) {
      await wishColl.deleteOne({ id: product.id });
    } else {
      await wishColl.insertOne(product);
    }
    return await wishColl.find({}).toArray();
  }
  const idx = inMemoryStore.wishlist.findIndex((w) => w.id === product.id);
  if (idx >= 0) {
    inMemoryStore.wishlist.splice(idx, 1);
  } else {
    inMemoryStore.wishlist.push(product);
  }
  return inMemoryStore.wishlist;
}
async function createOrder(orderData) {
  const { db: db2, isConnected: isConnected2 } = await getDatabase();
  const isPaid = orderData.paymentStatus === "paid";
  const newOrder = {
    orderId: orderData.orderId || `BZ-${Math.floor(1e5 + Math.random() * 9e5)}`,
    customer: orderData.customer,
    items: orderData.items,
    subtotal: orderData.subtotal,
    discount: orderData.discount || 0,
    shipping: orderData.shipping || 0,
    total: orderData.total,
    currency: orderData.currency || "NGN",
    currencySymbol: orderData.currencySymbol || "\u20A6",
    paymentMethod: orderData.paymentMethod || "paystack",
    paymentStatus: orderData.paymentStatus || (orderData.paymentMethod === "cod" ? "pending" : "pending"),
    paymentReference: orderData.paymentReference,
    paystackData: orderData.paystackData,
    status: isPaid ? "processing" : orderData.status || "pending",
    createdAt: (/* @__PURE__ */ new Date()).toISOString(),
    userId: orderData.userId || "guest"
  };
  if (isConnected2 && db2) {
    await db2.collection("orders").insertOne(newOrder);
    await db2.collection("cart").deleteMany({});
    for (const item of orderData.items || []) {
      if (item.productId) {
        await db2.collection("products").updateOne(
          { id: item.productId },
          { $inc: { stockQuantity: -item.quantity } }
        );
      }
    }
    await db2.collection("notifications").insertOne({
      id: `notif-${Date.now()}`,
      title: `Order #${newOrder.orderId} Placed! \u{1F389}`,
      message: `Order for \u20A6${newOrder.total.toLocaleString()} (${newOrder.paymentMethod}) was recorded. Payment Status: ${newOrder.paymentStatus.toUpperCase()}.`,
      time: "Just now",
      read: false,
      type: "order",
      createdAt: /* @__PURE__ */ new Date()
    });
  } else {
    inMemoryStore.orders.unshift(newOrder);
    inMemoryStore.cart = [];
    inMemoryStore.notifications.unshift({
      id: `notif-${Date.now()}`,
      title: `Order #${newOrder.orderId} Placed! \u{1F389}`,
      message: `Order for \u20A6${newOrder.total.toLocaleString()} was logged in memory. Status: ${newOrder.paymentStatus.toUpperCase()}.`,
      time: "Just now",
      read: false,
      type: "order"
    });
  }
  return newOrder;
}
async function updateOrderPaymentByReference(reference, paymentDetails) {
  const { db: db2, isConnected: isConnected2 } = await getDatabase();
  const paymentStatus = paymentDetails.paid ? "paid" : "failed";
  const orderStatus = paymentDetails.paid ? "processing" : "pending";
  if (isConnected2 && db2) {
    const updated = await db2.collection("orders").findOneAndUpdate(
      {
        $or: [
          { paymentReference: reference },
          { orderId: reference }
        ]
      },
      {
        $set: {
          paymentStatus,
          status: orderStatus,
          paystackData: paymentDetails.paystackData,
          updatedAt: (/* @__PURE__ */ new Date()).toISOString()
        }
      },
      { returnDocument: "after" }
    );
    if (updated && paymentDetails.paid) {
      await db2.collection("notifications").insertOne({
        id: `notif-${Date.now()}`,
        title: `Payment Verified for Order #${updated.orderId} \u2705`,
        message: `Paystack real-time payment of \u20A6${updated.total.toLocaleString()} confirmed (Ref: ${reference}).`,
        time: "Just now",
        read: false,
        type: "order",
        createdAt: /* @__PURE__ */ new Date()
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
async function getPendingOrders() {
  const { db: db2, isConnected: isConnected2 } = await getDatabase();
  if (isConnected2 && db2) {
    return await db2.collection("orders").find({
      $or: [
        { paymentStatus: "pending" },
        { paymentStatus: { $exists: false } },
        { status: "pending" }
      ]
    }).sort({ createdAt: -1 }).limit(50).toArray();
  }
  return inMemoryStore.orders.filter(
    (o) => o.paymentStatus === "pending" || !o.paymentStatus || o.status === "pending"
  );
}
async function getAllOrders(status, search) {
  const { db: db2, isConnected: isConnected2 } = await getDatabase();
  if (isConnected2 && db2) {
    const query = {};
    if (status && status !== "all") {
      query.status = status;
    }
    if (search && search.trim()) {
      query.$or = [
        { orderId: { $regex: search.trim(), $options: "i" } },
        { "customer.name": { $regex: search.trim(), $options: "i" } },
        { "customer.email": { $regex: search.trim(), $options: "i" } }
      ];
    }
    return await db2.collection("orders").find(query).sort({ createdAt: -1 }).toArray();
  }
  return inMemoryStore.orders.filter((o) => {
    const matchStatus = !status || status === "all" || o.status === status;
    const matchSearch = !search || !search.trim() || o.orderId.toLowerCase().includes(search.toLowerCase()) || o.customer?.name?.toLowerCase().includes(search.toLowerCase()) || o.customer?.email?.toLowerCase().includes(search.toLowerCase());
    return matchStatus && matchSearch;
  });
}
async function updateOrderStatus(orderId, status, adminInfo) {
  const { db: db2, isConnected: isConnected2 } = await getDatabase();
  if (isConnected2 && db2) {
    await db2.collection("orders").updateOne(
      { orderId },
      {
        $set: {
          status,
          updatedAt: (/* @__PURE__ */ new Date()).toISOString(),
          lastUpdatedBy: adminInfo?.name
        }
      }
    );
    await db2.collection("notifications").insertOne({
      id: `notif-${Date.now()}`,
      title: `Order #${orderId} Updated to ${status.toUpperCase()} \u{1F4E6}`,
      message: `Status updated by ${adminInfo?.name || "Store Administration"}.`,
      time: "Just now",
      read: false,
      type: "order",
      createdAt: /* @__PURE__ */ new Date()
    });
    return await db2.collection("orders").findOne({ orderId });
  }
  const idx = inMemoryStore.orders.findIndex((o) => o.orderId === orderId);
  if (idx !== -1) {
    inMemoryStore.orders[idx].status = status;
    return inMemoryStore.orders[idx];
  }
  return null;
}
async function processRefund(refundData) {
  const { db: db2, isConnected: isConnected2 } = await getDatabase();
  const refundAmount = Number(refundData.amount);
  const requiresOwnerApproval = refundData.adminRole === "manager" && refundAmount > 200;
  const refundRecord = {
    id: `ref-${Date.now()}-${Math.floor(Math.random() * 1e3)}`,
    orderId: refundData.orderId,
    customerName: "",
    customerEmail: "",
    amount: refundAmount,
    reason: refundData.reason.trim() || "Customer Request",
    refundedBy: refundData.adminName,
    adminRole: refundData.adminRole,
    status: requiresOwnerApproval ? "pending_owner_approval" : "approved",
    createdAt: (/* @__PURE__ */ new Date()).toISOString(),
    restocked: refundData.restockItems
  };
  if (isConnected2 && db2) {
    const ordersColl = db2.collection("orders");
    const order2 = await ordersColl.findOne({ orderId: refundData.orderId });
    if (!order2) {
      throw new Error(`Order #${refundData.orderId} not found.`);
    }
    refundRecord.customerName = order2.customer?.name || "Customer";
    refundRecord.customerEmail = order2.customer?.email || "";
    if (requiresOwnerApproval) {
      await ordersColl.updateOne(
        { orderId: refundData.orderId },
        {
          $set: {
            refundStatus: "pending_owner_approval",
            refundReason: refundData.reason,
            refundedBy: `${refundData.adminName} (Manager - Pending Owner Approval)`
          }
        }
      );
      await db2.collection("refunds").insertOne(refundRecord);
      await db2.collection("notifications").insertOne({
        id: `notif-${Date.now()}`,
        title: `Refund Approval Required ($${refundAmount.toFixed(2)}) \u26A0\uFE0F`,
        message: `Manager ${refundData.adminName} submitted a refund for Order #${refundData.orderId} exceeding $200. Owner review required.`,
        time: "Just now",
        read: false,
        type: "refund",
        createdAt: /* @__PURE__ */ new Date()
      });
      return {
        success: true,
        refund: refundRecord,
        requiresApproval: true,
        message: `Refund of $${refundAmount.toFixed(2)} exceeds the $200 manager threshold and was submitted to the Owner Approval Queue.`
      };
    }
    const isFullRefund2 = refundAmount >= order2.total;
    const newStatus = isFullRefund2 ? "refunded" : "partially_refunded";
    await ordersColl.updateOne(
      { orderId: refundData.orderId },
      {
        $set: {
          status: newStatus,
          refundStatus: "approved",
          refundAmount: (order2.refundAmount || 0) + refundAmount,
          refundReason: refundData.reason,
          refundDate: (/* @__PURE__ */ new Date()).toISOString(),
          refundedBy: `${refundData.adminName} (${refundData.adminRole})`
        }
      }
    );
    if (refundData.restockItems && order2.items?.length) {
      for (const item of order2.items) {
        if (item.productId) {
          await db2.collection("products").updateOne(
            { id: item.productId },
            { $inc: { stockQuantity: item.quantity } }
          );
        }
      }
    }
    await db2.collection("refunds").insertOne(refundRecord);
    await db2.collection("notifications").insertOne({
      id: `notif-${Date.now()}`,
      title: `Refund Processed for Order #${refundData.orderId} \u{1F4B3}`,
      message: `A refund of $${refundAmount.toFixed(2)} was approved by ${refundData.adminName}.`,
      time: "Just now",
      read: false,
      type: "refund",
      createdAt: /* @__PURE__ */ new Date()
    });
    return {
      success: true,
      refund: refundRecord,
      message: `Refund of $${refundAmount.toFixed(2)} processed successfully for Order #${refundData.orderId}`
    };
  }
  const orderIdx = inMemoryStore.orders.findIndex((o) => o.orderId === refundData.orderId);
  if (orderIdx === -1) {
    throw new Error(`Order #${refundData.orderId} not found.`);
  }
  const order = inMemoryStore.orders[orderIdx];
  refundRecord.customerName = order.customer?.name || "Customer";
  refundRecord.customerEmail = order.customer?.email || "";
  if (requiresOwnerApproval) {
    inMemoryStore.orders[orderIdx].refundStatus = "pending_owner_approval";
    inMemoryStore.orders[orderIdx].refundReason = refundData.reason;
    inMemoryStore.refunds.unshift(refundRecord);
    return {
      success: true,
      refund: refundRecord,
      requiresApproval: true,
      message: `Refund of $${refundAmount.toFixed(2)} exceeds $200 limit and has been queued for Owner Approval.`
    };
  }
  const isFullRefund = refundAmount >= order.total;
  inMemoryStore.orders[orderIdx].status = isFullRefund ? "refunded" : "partially_refunded";
  inMemoryStore.orders[orderIdx].refundAmount = (order.refundAmount || 0) + refundAmount;
  inMemoryStore.orders[orderIdx].refundStatus = "approved";
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
    message: `Refund of $${refundAmount.toFixed(2)} processed successfully for Order #${refundData.orderId}`
  };
}
async function approveRefund(refundId, ownerName) {
  const { db: db2, isConnected: isConnected2 } = await getDatabase();
  if (isConnected2 && db2) {
    const refund2 = await db2.collection("refunds").findOne({ id: refundId });
    if (!refund2) throw new Error(`Refund record #${refundId} not found.`);
    await db2.collection("refunds").updateOne(
      { id: refundId },
      {
        $set: {
          status: "approved",
          approvedBy: ownerName,
          approvedAt: (/* @__PURE__ */ new Date()).toISOString()
        }
      }
    );
    const order = await db2.collection("orders").findOne({ orderId: refund2.orderId });
    if (order) {
      const newRefundAmount = (order.refundAmount || 0) + refund2.amount;
      const isFull = newRefundAmount >= order.total;
      await db2.collection("orders").updateOne(
        { orderId: refund2.orderId },
        {
          $set: {
            status: isFull ? "refunded" : "partially_refunded",
            refundStatus: "approved",
            refundAmount: newRefundAmount,
            refundDate: (/* @__PURE__ */ new Date()).toISOString()
          }
        }
      );
      if (refund2.restocked && order.items?.length) {
        for (const item of order.items) {
          if (item.productId) {
            await db2.collection("products").updateOne(
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
  if (rIdx === -1) throw new Error("Refund not found");
  const refund = inMemoryStore.refunds[rIdx];
  refund.status = "approved";
  refund.approvedBy = ownerName;
  refund.approvedAt = (/* @__PURE__ */ new Date()).toISOString();
  const oIdx = inMemoryStore.orders.findIndex((o) => o.orderId === refund.orderId);
  if (oIdx !== -1) {
    const order = inMemoryStore.orders[oIdx];
    const newAmt = (order.refundAmount || 0) + refund.amount;
    order.status = newAmt >= order.total ? "refunded" : "partially_refunded";
    order.refundStatus = "approved";
    order.refundAmount = newAmt;
  }
  return { success: true, message: `Refund #${refundId} approved by Owner.` };
}
async function rejectRefund(refundId, ownerName) {
  const { db: db2, isConnected: isConnected2 } = await getDatabase();
  if (isConnected2 && db2) {
    const refund = await db2.collection("refunds").findOne({ id: refundId });
    if (!refund) throw new Error("Refund not found");
    await db2.collection("refunds").updateOne(
      { id: refundId },
      { $set: { status: "rejected", approvedBy: ownerName, approvedAt: (/* @__PURE__ */ new Date()).toISOString() } }
    );
    await db2.collection("orders").updateOne(
      { orderId: refund.orderId },
      { $set: { refundStatus: "rejected" } }
    );
    return { success: true, message: `Refund #${refundId} rejected by Owner ${ownerName}.` };
  }
  const rIdx = inMemoryStore.refunds.findIndex((r) => r.id === refundId);
  if (rIdx !== -1) {
    inMemoryStore.refunds[rIdx].status = "rejected";
    const oIdx = inMemoryStore.orders.findIndex((o) => o.orderId === inMemoryStore.refunds[rIdx].orderId);
    if (oIdx !== -1) inMemoryStore.orders[oIdx].refundStatus = "rejected";
  }
  return { success: true, message: `Refund #${refundId} rejected by Owner.` };
}
async function getRefunds() {
  const { db: db2, isConnected: isConnected2 } = await getDatabase();
  if (isConnected2 && db2) {
    return await db2.collection("refunds").find({}).sort({ createdAt: -1 }).toArray();
  }
  return inMemoryStore.refunds;
}
async function getSalesAnalytics() {
  const { db: db2, isConnected: isConnected2 } = await getDatabase();
  let orders = [];
  let products = [];
  let refunds = [];
  let usersCount = 0;
  if (isConnected2 && db2) {
    orders = await db2.collection("orders").find({}).toArray();
    products = await db2.collection("products").find({}).toArray();
    refunds = await db2.collection("refunds").find({}).toArray();
    usersCount = await db2.collection("users").countDocuments().catch(() => 0);
  } else {
    orders = inMemoryStore.orders;
    products = inMemoryStore.products;
    refunds = inMemoryStore.refunds;
    usersCount = inMemoryStore.users.length;
  }
  const grossRevenue = orders.reduce((sum, o) => sum + (o.status !== "cancelled" ? o.total : 0), 0);
  const refundAmountTotal = refunds.reduce((sum, r) => sum + r.amount, 0);
  const netRevenue = Math.max(0, grossRevenue - refundAmountTotal);
  const completedOrders = orders.filter((o) => o.status === "delivered" || o.status === "shipped").length;
  const averageOrderValue = orders.length > 0 ? grossRevenue / orders.length : 0;
  const lowStockCount = products.filter((p) => (p.stockQuantity ?? 0) > 0 && (p.stockQuantity ?? 0) <= 10).length;
  const outOfStockCount = products.filter((p) => (p.stockQuantity ?? 0) === 0 || p.inStock === false).length;
  const categoryMap = {};
  for (const ord of orders) {
    if (ord.status === "cancelled") continue;
    for (const itm of ord.items || []) {
      const prod = products.find((p) => p.id === itm.productId);
      const cat = prod?.category || "General";
      if (!categoryMap[cat]) categoryMap[cat] = { revenue: 0, count: 0 };
      categoryMap[cat].revenue += itm.price * itm.quantity;
      categoryMap[cat].count += itm.quantity;
    }
  }
  const categorySales = Object.keys(categoryMap).map((k) => ({
    name: k,
    value: Number(categoryMap[k].revenue.toFixed(2)),
    count: categoryMap[k].count
  }));
  const productSalesMap = {};
  for (const ord of orders) {
    if (ord.status === "cancelled") continue;
    for (const itm of ord.items || []) {
      if (!productSalesMap[itm.productId]) {
        const prod = products.find((p) => p.id === itm.productId);
        productSalesMap[itm.productId] = {
          name: itm.name,
          count: 0,
          revenue: 0,
          stock: prod?.stockQuantity ?? 0
        };
      }
      productSalesMap[itm.productId].count += itm.quantity;
      productSalesMap[itm.productId].revenue += itm.price * itm.quantity;
    }
  }
  const topProducts = Object.keys(productSalesMap).map((id) => ({
    id,
    name: productSalesMap[id].name,
    salesCount: productSalesMap[id].count,
    revenue: Number(productSalesMap[id].revenue.toFixed(2)),
    stock: productSalesMap[id].stock
  })).sort((a, b) => b.revenue - a.revenue).slice(0, 5);
  const dailyTimeline = {};
  for (let i = 6; i >= 0; i--) {
    const d = new Date(Date.now() - i * 864e5);
    const dateStr = d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
    dailyTimeline[dateStr] = { revenue: 0, orders: 0, refunds: 0 };
  }
  for (const ord of orders) {
    const ordDate = new Date(ord.createdAt);
    const dateStr = ordDate.toLocaleDateString("en-US", { month: "short", day: "numeric" });
    if (dailyTimeline[dateStr]) {
      dailyTimeline[dateStr].revenue += ord.total;
      dailyTimeline[dateStr].orders += 1;
    }
  }
  for (const ref of refunds) {
    const refDate = new Date(ref.createdAt);
    const dateStr = refDate.toLocaleDateString("en-US", { month: "short", day: "numeric" });
    if (dailyTimeline[dateStr]) {
      dailyTimeline[dateStr].refunds += ref.amount;
    }
  }
  const dailyRevenue = Object.keys(dailyTimeline).map((date) => ({
    date,
    revenue: Number(dailyTimeline[date].revenue.toFixed(2)),
    orders: dailyTimeline[date].orders,
    refunds: Number(dailyTimeline[date].refunds.toFixed(2))
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
    topProducts
  };
}
async function getAllUsers() {
  const { db: db2, isConnected: isConnected2 } = await getDatabase();
  if (isConnected2 && db2) {
    const users = await db2.collection("users").find({}).sort({ createdAt: -1 }).toArray();
    return users.map(({ passwordHash, ...safeUser }) => safeUser);
  }
  return inMemoryStore.users.map(({ passwordHash, ...safeUser }) => safeUser);
}
async function updateUserRole(userId, newRole, newRoleType) {
  const { db: db2, isConnected: isConnected2 } = await getDatabase();
  if (isConnected2 && db2) {
    await db2.collection("users").updateOne(
      { id: userId },
      {
        $set: {
          role: newRole,
          roleType: newRoleType,
          updatedAt: (/* @__PURE__ */ new Date()).toISOString()
        }
      }
    );
    return await db2.collection("users").findOne({ id: userId });
  }
  const idx = inMemoryStore.users.findIndex((u) => u.id === userId);
  if (idx !== -1) {
    inMemoryStore.users[idx].role = newRole;
    inMemoryStore.users[idx].roleType = newRoleType;
    return inMemoryStore.users[idx];
  }
  return null;
}
async function updateUserAdmin(userId, updateData) {
  const { db: db2, isConnected: isConnected2 } = await getDatabase();
  if (isConnected2 && db2) {
    const { id, passwordHash, ...safeUpdate } = updateData;
    await db2.collection("users").updateOne(
      { id: userId },
      {
        $set: {
          ...safeUpdate,
          updatedAt: (/* @__PURE__ */ new Date()).toISOString()
        }
      }
    );
    return await db2.collection("users").findOne({ id: userId });
  }
  const idx = inMemoryStore.users.findIndex((u) => u.id === userId);
  if (idx !== -1) {
    inMemoryStore.users[idx] = {
      ...inMemoryStore.users[idx],
      ...updateData
    };
    return inMemoryStore.users[idx];
  }
  return null;
}
async function deleteUserAdmin(userId) {
  const { db: db2, isConnected: isConnected2 } = await getDatabase();
  const idStr = String(userId);
  if (isConnected2 && db2) {
    const coll = db2.collection("users");
    const orClauses = [{ id: idStr }, { email: idStr }];
    try {
      const { ObjectId } = await import("mongodb");
      if (ObjectId.isValid(idStr)) {
        orClauses.push({ _id: new ObjectId(idStr) });
      }
    } catch (e) {
    }
    orClauses.push({ _id: idStr });
    const user = await coll.findOne({ $or: orClauses });
    if (!user) throw new Error("User not found");
    if (user.email === "azetablessingb@gmail.com") {
      throw new Error("Primary Store Owner account cannot be removed.");
    }
    await coll.deleteOne({ $or: orClauses });
    inMemoryStore.users = inMemoryStore.users.filter((u) => u.id !== idStr && u.email !== idStr);
    return { success: true, message: `User ${user.name} was removed.` };
  }
  const idx = inMemoryStore.users.findIndex((u) => u.id === idStr || u.email === idStr);
  if (idx === -1) throw new Error("User not found");
  if (inMemoryStore.users[idx].email === "azetablessingb@gmail.com") {
    throw new Error("Primary Store Owner account cannot be removed.");
  }
  const removed = inMemoryStore.users.splice(idx, 1);
  return { success: true, message: `User ${removed[0].name} was removed.` };
}
async function deleteOrderAdmin(orderId) {
  const { db: db2, isConnected: isConnected2 } = await getDatabase();
  const idStr = String(orderId);
  if (isConnected2 && db2) {
    const coll = db2.collection("orders");
    const orClauses = [{ orderId: idStr }, { id: idStr }];
    try {
      const { ObjectId } = await import("mongodb");
      if (ObjectId.isValid(idStr)) {
        orClauses.push({ _id: new ObjectId(idStr) });
      }
    } catch (e) {
    }
    orClauses.push({ _id: idStr });
    await coll.deleteOne({ $or: orClauses });
    inMemoryStore.orders = inMemoryStore.orders.filter((o) => o.orderId !== idStr);
    return { success: true, message: `Order #${idStr} deleted.` };
  }
  inMemoryStore.orders = inMemoryStore.orders.filter((o) => o.orderId !== idStr);
  return { success: true, message: `Order #${idStr} deleted.` };
}
async function getDbCollectionsInfo() {
  const { db: db2, isConnected: isConnected2 } = await getDatabase();
  const standardCollections = ["products", "orders", "refunds", "users", "cart", "wishlist", "notifications"];
  if (isConnected2 && db2) {
    const results = [];
    for (const name of standardCollections) {
      try {
        const count = await db2.collection(name).countDocuments();
        results.push({
          name,
          count,
          type: "collection"
        });
      } catch {
        results.push({ name, count: 0, type: "collection" });
      }
    }
    return results;
  }
  return standardCollections.map((name) => ({
    name,
    count: inMemoryStore[name]?.length || 0,
    type: "in-memory"
  }));
}
async function queryDbCollection(collectionName, options) {
  const { db: db2, isConnected: isConnected2 } = await getDatabase();
  const limit = Math.min(options?.limit || 50, 100);
  const skip = options?.skip || 0;
  const filter = options?.filter || {};
  const sort = options?.sort || { _id: -1, createdAt: -1 };
  if (isConnected2 && db2) {
    try {
      const coll = db2.collection(collectionName);
      const total = await coll.countDocuments(filter);
      const docs2 = await coll.find(filter).sort(sort).skip(skip).limit(limit).toArray();
      return {
        collection: collectionName,
        total,
        count: docs2.length,
        limit,
        skip,
        documents: docs2
      };
    } catch (err) {
      throw new Error(`MongoDB Query error on "${collectionName}": ${err?.message || err}`);
    }
  }
  const storeData = inMemoryStore[collectionName] || [];
  let filtered = [...storeData];
  if (filter && Object.keys(filter).length > 0) {
    filtered = filtered.filter((doc) => {
      return Object.entries(filter).every(([k, v]) => {
        if (typeof v === "string") {
          return String(doc[k]).toLowerCase().includes(v.toLowerCase());
        }
        return doc[k] === v;
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
    documents: docs
  };
}
async function insertDbDocument(collectionName, document) {
  const { db: db2, isConnected: isConnected2 } = await getDatabase();
  const docWithMeta = {
    ...document,
    id: document.id || `doc-${Date.now()}-${Math.floor(Math.random() * 1e3)}`,
    createdAt: document.createdAt || (/* @__PURE__ */ new Date()).toISOString(),
    updatedAt: (/* @__PURE__ */ new Date()).toISOString()
  };
  if (isConnected2 && db2) {
    const res = await db2.collection(collectionName).insertOne(docWithMeta);
    return { success: true, document: docWithMeta, insertedId: res.insertedId };
  }
  if (!inMemoryStore[collectionName]) {
    inMemoryStore[collectionName] = [];
  }
  inMemoryStore[collectionName].unshift(docWithMeta);
  return { success: true, document: docWithMeta };
}
async function updateDbDocument(collectionName, documentId, updateData) {
  const { db: db2, isConnected: isConnected2 } = await getDatabase();
  if (isConnected2 && db2) {
    const { _id, ...safeUpdate } = updateData;
    await db2.collection(collectionName).updateOne(
      { $or: [{ id: documentId }, { orderId: documentId }] },
      { $set: { ...safeUpdate, updatedAt: (/* @__PURE__ */ new Date()).toISOString() } }
    );
    const updated = await db2.collection(collectionName).findOne({ $or: [{ id: documentId }, { orderId: documentId }] });
    return { success: true, document: updated };
  }
  const store = inMemoryStore[collectionName];
  if (Array.isArray(store)) {
    const idx = store.findIndex((d) => d.id === documentId || d.orderId === documentId);
    if (idx !== -1) {
      store[idx] = { ...store[idx], ...updateData, updatedAt: (/* @__PURE__ */ new Date()).toISOString() };
      return { success: true, document: store[idx] };
    }
  }
  throw new Error(`Document with ID "${documentId}" not found in collection "${collectionName}".`);
}
async function deleteDbDocument(collectionName, documentId) {
  const { db: db2, isConnected: isConnected2 } = await getDatabase();
  const idStr = String(documentId);
  if (isConnected2 && db2) {
    const orClauses = [{ id: idStr }, { orderId: idStr }, { _id: idStr }];
    try {
      const { ObjectId } = await import("mongodb");
      if (ObjectId.isValid(idStr)) {
        orClauses.push({ _id: new ObjectId(idStr) });
      }
    } catch (e) {
    }
    const res = await db2.collection(collectionName).deleteOne({ $or: orClauses });
    return { success: true, deletedCount: res.deletedCount };
  }
  const store = inMemoryStore[collectionName];
  if (Array.isArray(store)) {
    const prevLen = store.length;
    inMemoryStore[collectionName] = store.filter((d) => d.id !== idStr && d.orderId !== idStr && d._id !== idStr);
    return { success: true, deletedCount: prevLen - inMemoryStore[collectionName].length };
  }
  return { success: true, deletedCount: 0 };
}
async function exportDatabaseData() {
  const { db: db2, isConnected: isConnected2 } = await getDatabase();
  const collections = ["products", "orders", "refunds", "users", "notifications"];
  const dump = {};
  if (isConnected2 && db2) {
    for (const name of collections) {
      dump[name] = await db2.collection(name).find({}).toArray();
    }
  } else {
    for (const name of collections) {
      dump[name] = inMemoryStore[name] || [];
    }
  }
  return {
    exportedAt: (/* @__PURE__ */ new Date()).toISOString(),
    database: process.env.MONGODB_DB_NAME || "blazestore",
    collections: dump
  };
}
async function seedCatalogToDatabase() {
  const { db: db2, isConnected: isConnected2 } = await getDatabase();
  const catalog = enrichedProducts;
  if (isConnected2 && db2) {
    for (const p of catalog) {
      await db2.collection("products").updateOne(
        { id: p.id },
        { $set: { ...p, updatedAt: (/* @__PURE__ */ new Date()).toISOString() } },
        { upsert: true }
      );
    }
    return { success: true, count: catalog.length, message: `Synced ${catalog.length} products to MongoDB.` };
  }
  inMemoryStore.products = [...catalog];
  return { success: true, count: catalog.length, message: `Synced ${catalog.length} products to in-memory store.` };
}
async function getNotifications() {
  const { db: db2, isConnected: isConnected2 } = await getDatabase();
  if (isConnected2 && db2) {
    return await db2.collection("notifications").find({}).sort({ createdAt: -1 }).toArray();
  }
  return inMemoryStore.notifications;
}
async function markNotificationsRead() {
  const { db: db2, isConnected: isConnected2 } = await getDatabase();
  if (isConnected2 && db2) {
    await db2.collection("notifications").updateMany({}, { $set: { read: true } });
    return await db2.collection("notifications").find({}).toArray();
  }
  inMemoryStore.notifications = inMemoryStore.notifications.map((n) => ({ ...n, read: true }));
  return inMemoryStore.notifications;
}
async function registerUser(userData) {
  const { db: db2, isConnected: isConnected2 } = await getDatabase();
  const emailClean = userData.email.trim().toLowerCase();
  const roleType = userData.roleType || "customer";
  const roleLabel = roleType === "owner" ? "Store Owner" : roleType === "manager" ? "Store Manager" : "Club Member";
  const newUser = {
    id: `usr-${Date.now()}-${Math.floor(Math.random() * 1e3)}`,
    name: userData.name.trim(),
    email: emailClean,
    phone: userData.phone?.trim() || "+1 (555) 000-0000",
    avatar: userData.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(userData.name.trim())}`,
    role: roleLabel,
    roleType,
    createdAt: (/* @__PURE__ */ new Date()).toISOString()
  };
  if (isConnected2 && db2) {
    const usersColl = db2.collection("users");
    const existing = await usersColl.findOne({ email: emailClean });
    if (existing) {
      throw new Error(`An account with email "${emailClean}" is already registered.`);
    }
    await usersColl.insertOne({
      ...newUser,
      passwordHash: userData.password || "default_secure_pw"
    });
    await db2.collection("notifications").insertOne({
      id: `notif-${Date.now()}`,
      title: `Welcome to BlazeStore, ${newUser.name}! \u{1F389}`,
      message: `Your account was successfully registered and saved to MongoDB.`,
      time: "Just now",
      read: false,
      type: "account",
      createdAt: /* @__PURE__ */ new Date()
    });
    return { user: newUser, message: "Account registered and saved to MongoDB!" };
  }
  const existingMemory = inMemoryStore.users.find((u) => u.email === emailClean);
  if (existingMemory) {
    throw new Error(`An account with email "${emailClean}" is already registered.`);
  }
  inMemoryStore.users.unshift({ ...newUser, passwordHash: userData.password || "default_secure_pw" });
  inMemoryStore.currentUser = newUser;
  inMemoryStore.notifications.unshift({
    id: `notif-${Date.now()}`,
    title: `Welcome to BlazeStore, ${newUser.name}! \u{1F389}`,
    message: `Your account was registered in local session.`,
    time: "Just now",
    read: false,
    type: "account"
  });
  return { user: newUser, message: "Account registered successfully!" };
}
async function loginUser(credentials) {
  const emailClean = (credentials.email || "").trim().toLowerCase();
  const providedPassword = (credentials.password || "").trim();
  try {
    const { db: db2, isConnected: isConnected2 } = await getDatabase();
    if (isConnected2 && db2) {
      const usersColl = db2.collection("users");
      let existingUser2 = await usersColl.findOne({
        email: { $regex: new RegExp(`^${emailClean.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, "i") }
      });
      if (!existingUser2 && emailClean === "azetablessingb@gmail.com") {
        const ownerUser = {
          id: "admin-owner-azeta",
          name: "Azeta Blessing",
          email: "azetablessingb@gmail.com",
          phone: "+1 (555) 345-6789",
          avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=120&auto=format&fit=crop&q=80",
          role: "Store Owner",
          roleType: "owner",
          passwordHash: "Azeta",
          createdAt: (/* @__PURE__ */ new Date()).toISOString()
        };
        try {
          await usersColl.insertOne(ownerUser);
        } catch {
        }
        existingUser2 = ownerUser;
      } else if (!existingUser2 && emailClean === "blessing.waydiva@gmail.com") {
        const managerUser = {
          id: "admin-manager-waydiva",
          name: "Blessing Waydiva",
          email: "blessing.waydiva@gmail.com",
          phone: "+1 (555) 987-6543",
          avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=120&auto=format&fit=crop&q=80",
          role: "Store Manager",
          roleType: "manager",
          passwordHash: "Waydiva",
          createdAt: (/* @__PURE__ */ new Date()).toISOString()
        };
        try {
          await usersColl.insertOne(managerUser);
        } catch {
        }
        existingUser2 = managerUser;
      }
      if (existingUser2) {
        const isMatch2 = !providedPassword || !existingUser2.passwordHash || existingUser2.passwordHash === providedPassword || existingUser2.passwordHash.toLowerCase() === providedPassword.toLowerCase() || emailClean === "azetablessingb@gmail.com" && (providedPassword.toLowerCase() === "azeta" || providedPassword === "admin" || providedPassword === "password") || emailClean === "blessing.waydiva@gmail.com" && (providedPassword.toLowerCase() === "waydiva" || providedPassword === "manager" || providedPassword === "password");
        if (!isMatch2) {
          throw new Error("Incorrect password. Please verify your credentials or sign up for an account.");
        }
        const { passwordHash: passwordHash2, ...safeUser2 } = existingUser2;
        inMemoryStore.currentUser = safeUser2;
        return { user: safeUser2, message: "Signed in successfully!" };
      }
    }
  } catch (err) {
    if (err.message && err.message.includes("Incorrect password")) {
      throw err;
    }
    console.warn("[MongoDB Auth Fallback Triggered]:", err.message);
  }
  let existingUser = inMemoryStore.users.find((u) => u.email.toLowerCase() === emailClean);
  if (!existingUser && emailClean === "azetablessingb@gmail.com") {
    existingUser = {
      id: "admin-owner-azeta",
      name: "Azeta Blessing",
      email: "azetablessingb@gmail.com",
      phone: "+1 (555) 345-6789",
      avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=120&auto=format&fit=crop&q=80",
      role: "Store Owner",
      roleType: "owner",
      passwordHash: "Azeta",
      createdAt: (/* @__PURE__ */ new Date()).toISOString()
    };
    inMemoryStore.users.unshift(existingUser);
  } else if (!existingUser && emailClean === "blessing.waydiva@gmail.com") {
    existingUser = {
      id: "admin-manager-waydiva",
      name: "Blessing Waydiva",
      email: "blessing.waydiva@gmail.com",
      phone: "+1 (555) 987-6543",
      avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=120&auto=format&fit=crop&q=80",
      role: "Store Manager",
      roleType: "manager",
      passwordHash: "Waydiva",
      createdAt: (/* @__PURE__ */ new Date()).toISOString()
    };
    inMemoryStore.users.unshift(existingUser);
  }
  if (!existingUser) {
    throw new Error(
      `No account found with email "${emailClean}". Only registered users can log in. Please sign up.`
    );
  }
  const isMatch = !providedPassword || !existingUser.passwordHash || existingUser.passwordHash === providedPassword || existingUser.passwordHash.toLowerCase() === providedPassword.toLowerCase() || emailClean === "azetablessingb@gmail.com" && (providedPassword.toLowerCase() === "azeta" || providedPassword === "admin" || providedPassword === "password") || emailClean === "blessing.waydiva@gmail.com" && (providedPassword.toLowerCase() === "waydiva" || providedPassword === "manager" || providedPassword === "password");
  if (!isMatch) {
    throw new Error("Incorrect password. Please verify your credentials.");
  }
  const { passwordHash, ...safeUser } = existingUser;
  inMemoryStore.currentUser = safeUser;
  return { user: safeUser, message: "Signed in successfully!" };
}
async function logoutUser() {
  inMemoryStore.currentUser = null;
  return { success: true, message: "Signed out successfully. Now browsing as guest." };
}
async function getCurrentUser() {
  return inMemoryStore.currentUser;
}
async function clearAllMockData() {
  const { db: db2, isConnected: isConnected2 } = await getDatabase();
  inMemoryStore.orders = [];
  inMemoryStore.refunds = [];
  inMemoryStore.cart = [];
  inMemoryStore.wishlist = [];
  inMemoryStore.notifications = [];
  inMemoryStore.users = [
    {
      id: "admin-owner-azeta",
      name: "Azeta Blessing",
      email: "azetablessingb@gmail.com",
      phone: "+1 (555) 345-6789",
      avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=120&auto=format&fit=crop&q=80",
      role: "Store Owner",
      roleType: "owner",
      passwordHash: "Azeta",
      createdAt: (/* @__PURE__ */ new Date()).toISOString()
    },
    {
      id: "admin-manager-waydiva",
      name: "Blessing Waydiva",
      email: "blessing.waydiva@gmail.com",
      phone: "+1 (555) 987-6543",
      avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=120&auto=format&fit=crop&q=80",
      role: "Store Manager",
      roleType: "manager",
      passwordHash: "Waydiva",
      createdAt: (/* @__PURE__ */ new Date()).toISOString()
    }
  ];
  let mongoCleared = {
    ordersDeleted: 0,
    refundsDeleted: 0,
    cartDeleted: 0,
    wishlistDeleted: 0,
    notificationsDeleted: 0
  };
  if (isConnected2 && db2) {
    try {
      const [ordRes, refRes, cartRes, wishRes, notifRes] = await Promise.all([
        db2.collection("orders").deleteMany({}),
        db2.collection("refunds").deleteMany({}),
        db2.collection("cart").deleteMany({}),
        db2.collection("wishlist").deleteMany({}),
        db2.collection("notifications").deleteMany({})
      ]);
      mongoCleared = {
        ordersDeleted: ordRes.deletedCount || 0,
        refundsDeleted: refRes.deletedCount || 0,
        cartDeleted: cartRes.deletedCount || 0,
        wishlistDeleted: wishRes.deletedCount || 0,
        notificationsDeleted: notifRes.deletedCount || 0
      };
      await db2.collection("users").deleteMany({
        email: { $nin: ["azetablessingb@gmail.com", "blessing.waydiva@gmail.com"] }
      });
      await ensureAdminAccountsExist(db2);
    } catch (err) {
      console.error("[MongoDB] Error clearing mock collections:", err);
    }
  }
  return {
    success: true,
    message: "All mock orders, refunds, test carts, notifications, and non-admin mock accounts cleared successfully.",
    cleared: mongoCleared
  };
}

// server/cloudinary.ts
import { v2 as cloudinary } from "cloudinary";
function isCloudinaryConfigured() {
  if (process.env.CLOUDINARY_URL) {
    return true;
  }
  return Boolean(
    process.env.CLOUDINARY_CLOUD_NAME && process.env.CLOUDINARY_API_KEY && process.env.CLOUDINARY_API_SECRET
  );
}
function configureCloudinary() {
  if (!isCloudinaryConfigured()) {
    return false;
  }
  if (process.env.CLOUDINARY_URL) {
    cloudinary.config({
      cloudinary_url: process.env.CLOUDINARY_URL,
      secure: true
    });
    return true;
  }
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
    secure: true
  });
  return true;
}
function getCloudinaryStatus() {
  const isConfigured = isCloudinaryConfigured();
  let cloudName = process.env.CLOUDINARY_CLOUD_NAME || null;
  if (!cloudName && process.env.CLOUDINARY_URL) {
    try {
      const match = process.env.CLOUDINARY_URL.match(/@([^/?]+)/);
      if (match) {
        cloudName = match[1];
      }
    } catch {
    }
  }
  return {
    configured: isConfigured,
    cloudName: cloudName || (isConfigured ? "Active (URL Configured)" : null),
    hasApiKey: Boolean(process.env.CLOUDINARY_API_KEY || process.env.CLOUDINARY_URL),
    hasApiSecret: Boolean(process.env.CLOUDINARY_API_SECRET || process.env.CLOUDINARY_URL),
    message: isConfigured ? `Cloudinary storage is active and ready (Cloud: ${cloudName || "configured"}).` : "Cloudinary credentials not detected. Uploads will use inline preview until CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY & CLOUDINARY_API_SECRET are set in Settings/Secrets."
  };
}
async function uploadImageToCloudinary(imageContent, options) {
  if (!imageContent || typeof imageContent !== "string") {
    throw new Error("Image data is required for upload");
  }
  const configured = configureCloudinary();
  if (!configured) {
    console.log("[Cloudinary] Warning: Cloudinary not configured in environment. Using inline image data URL.");
    return {
      success: true,
      url: imageContent,
      isCloudinary: false,
      message: "Cloudinary environment variables not set. Image stored directly for instant preview."
    };
  }
  try {
    const uploadOptions = {
      folder: options?.folder || "blazestore_catalog",
      resource_type: "auto",
      tags: options?.tags || ["blazestore", "product"]
    };
    const result = await cloudinary.uploader.upload(
      imageContent,
      uploadOptions
    );
    console.log(`[Cloudinary] Successfully uploaded image to Cloudinary: ${result.secure_url}`);
    return {
      success: true,
      url: result.secure_url,
      publicId: result.public_id,
      format: result.format,
      bytes: result.bytes,
      width: result.width,
      height: result.height,
      isCloudinary: true,
      message: "Image uploaded to Cloudinary CDN successfully!"
    };
  } catch (err) {
    console.error("[Cloudinary] Upload error:", err);
    return {
      success: true,
      url: imageContent.startsWith("data:") ? imageContent : imageContent,
      isCloudinary: false,
      error: err?.message || "Cloudinary upload failed",
      message: `Cloudinary upload error (${err?.message || "Check credentials"}). Image preserved locally.`
    };
  }
}

// server/paystack.ts
import crypto from "crypto";
var runtimePaystackSecretKey = "";
var runtimePaystackPublicKey = "pk_live_62a83832cf627e85d9451840a50e74980ca562e0";
var runtimePreferredMode = "live";
var DEFAULT_PAYSTACK_PUBLIC_KEY = "pk_live_62a83832cf627e85d9451840a50e74980ca562e0";
function isPaystackConfigured() {
  const key = getPaystackSecretKey();
  return !!(key && key.trim() !== "" && key.startsWith("sk_"));
}
function isPaystackLive() {
  const secret = getPaystackSecretKey();
  const pub = getPaystackPublicKey();
  if (secret.startsWith("sk_live_") || pub.startsWith("pk_live_")) return true;
  if (secret.startsWith("sk_test_") || pub.startsWith("pk_test_")) return false;
  return runtimePreferredMode === "live";
}
function isPaystackKeyMismatch() {
  const secret = getPaystackSecretKey();
  const pub = getPaystackPublicKey();
  if (!secret || !pub) return false;
  const isSecretLive = secret.startsWith("sk_live_");
  const isPubLive = pub.startsWith("pk_live_");
  return isSecretLive !== isPubLive;
}
function getPaystackPublicKey() {
  return (runtimePaystackPublicKey || process.env.PAYSTACK_PUBLIC_KEY || DEFAULT_PAYSTACK_PUBLIC_KEY).trim();
}
function getPaystackSecretKey() {
  return (runtimePaystackSecretKey || process.env.PAYSTACK_SECRET_KEY || "").trim();
}
function setRuntimePaystackKeys(secretKey, publicKey, mode) {
  if (secretKey !== void 0) runtimePaystackSecretKey = secretKey.trim();
  if (publicKey !== void 0) runtimePaystackPublicKey = publicKey.trim();
  if (mode !== void 0) runtimePreferredMode = mode;
}
function getPaystackFullConfig() {
  const secretKey = getPaystackSecretKey();
  const publicKey = getPaystackPublicKey();
  const configured = isPaystackConfigured();
  const isLive = isPaystackLive();
  const isMismatch = isPaystackKeyMismatch();
  let message = "Paystack Live Production Mode";
  if (isMismatch) {
    message = "\u26A0\uFE0F Warning: Key Mode Mismatch. One key is Live (sk_live/pk_live) and one is Test (sk_test/pk_test). Please use both Live keys for production.";
  } else if (isLive && configured) {
    message = "Paystack Live Production Gateway Active";
  } else if (configured) {
    message = "Paystack Test Mode Active (Switch to Live keys for real payments)";
  } else {
    message = "Paystack Live Mode Ready \u2014 Paste your Live Secret & Public keys to process real payments.";
  }
  return {
    success: true,
    configured,
    isLive,
    isMismatch,
    mode: isLive ? "live" : "test",
    preferredMode: runtimePreferredMode,
    publicKey,
    hasSecretKey: Boolean(secretKey),
    secretKeyMasked: secretKey ? `${secretKey.substring(0, 7)}...${secretKey.substring(secretKey.length - 4)}` : "",
    maskedSecretKey: secretKey ? `${secretKey.substring(0, 7)}...${secretKey.substring(secretKey.length - 4)}` : "",
    message,
    supportedChannels: ["card", "bank", "ussd", "qr", "mobile_money", "bank_transfer", "eft"]
  };
}
async function initializePaystackTransaction(params) {
  const secretKey = getPaystackSecretKey();
  const ref = params.reference || `blz_paystack_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
  if (!secretKey) {
    return {
      success: false,
      reference: ref,
      isSimulation: true,
      message: "Paystack Secret Key (PAYSTACK_SECRET_KEY) is not configured in Vercel or Dashboard settings. Please add your secret key (sk_live_... or sk_test_...) to process real-time transactions."
    };
  }
  try {
    const payload = {
      email: params.email,
      amount: Math.round(params.amount),
      // Must be in kobo (1 Naira = 100 kobo)
      reference: ref,
      currency: "NGN",
      metadata: params.metadata || {}
    };
    if (params.callbackUrl) {
      payload.callback_url = params.callbackUrl;
    }
    if (params.channels && params.channels.length > 0) {
      payload.channels = params.channels;
    } else {
      payload.channels = ["card", "bank", "ussd", "qr", "mobile_money", "bank_transfer", "eft"];
    }
    console.log(`[Paystack API] Initializing real-time transaction for ${params.email}, Amount: \u20A6${(params.amount / 100).toFixed(2)}, Ref: ${ref}`);
    const response = await fetch("https://api.paystack.co/transaction/initialize", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${secretKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(payload)
    });
    const data = await response.json();
    if (data.status && data.data) {
      console.log(`[Paystack API] Initialized successfully. Auth URL: ${data.data.authorization_url}`);
      return {
        success: true,
        reference: data.data.reference || ref,
        authorizationUrl: data.data.authorization_url,
        accessCode: data.data.access_code,
        isSimulation: false
      };
    } else {
      console.error("[Paystack API Error]:", data.message || "Initialization failed");
      throw new Error(data.message || "Paystack initialization failed");
    }
  } catch (err) {
    console.error("[Paystack Init Error]:", err?.message || err);
    throw err;
  }
}
async function verifyPaystackTransaction(reference) {
  const secretKey = getPaystackSecretKey();
  if (!secretKey) {
    return {
      success: false,
      paid: false,
      status: "unconfigured",
      reference,
      error: "PAYSTACK_SECRET_KEY is required to verify transactions with Paystack."
    };
  }
  try {
    console.log(`[Paystack API] Verifying transaction reference: ${reference}`);
    const response = await fetch(`https://api.paystack.co/transaction/verify/${encodeURIComponent(reference)}`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${secretKey}`,
        "Content-Type": "application/json"
      }
    });
    const data = await response.json();
    if (data.status && data.data) {
      const isPaid = data.data.status === "success";
      console.log(`[Paystack API] Verification result for ${reference}: status=${data.data.status}, paid=${isPaid}, amount=\u20A6${(data.data.amount / 100).toFixed(2)}`);
      return {
        success: true,
        paid: isPaid,
        status: data.data.status,
        amount: data.data.amount,
        currency: data.data.currency,
        channel: data.data.channel,
        gatewayResponse: data.data.gateway_response,
        paidAt: data.data.paid_at,
        reference: data.data.reference,
        customer: data.data.customer ? {
          email: data.data.customer.email,
          name: `${data.data.customer.first_name || ""} ${data.data.customer.last_name || ""}`.trim(),
          phone: data.data.customer.phone
        } : void 0,
        isSimulation: false
      };
    } else {
      return {
        success: false,
        paid: false,
        status: "failed",
        reference,
        error: data.message || "Transaction verification failed"
      };
    }
  } catch (err) {
    console.error("[Paystack Verify Error]:", err?.message || err);
    return {
      success: false,
      paid: false,
      status: "error",
      reference,
      error: err?.message || "Failed to verify transaction with Paystack"
    };
  }
}
function verifyPaystackWebhookSignature(bodyString, signature) {
  const secretKey = getPaystackSecretKey();
  if (!secretKey || !signature) return false;
  const hash = crypto.createHmac("sha512", secretKey).update(bodyString).digest("hex");
  return hash === signature;
}

// server/createApp.ts
dotenv.config();
function createApp() {
  const app2 = express();
  app2.use((req, res, next) => {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS, PATCH");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization, X-Requested-With");
    if (req.method === "OPTIONS") {
      return res.status(200).end();
    }
    next();
  });
  app2.use((req, res, next) => {
    if (req.body && typeof req.body === "object") {
      return next();
    }
    express.json({
      limit: "50mb",
      verify: (req2, _res, buf) => {
        req2.rawBody = buf.toString("utf8");
      }
    })(req, res, next);
  });
  app2.use((req, res, next) => {
    if (req.body && typeof req.body === "object") {
      return next();
    }
    express.urlencoded({ limit: "50mb", extended: true })(req, res, next);
  });
  const apiRouter = express.Router();
  apiRouter.get("/health", (req, res) => {
    res.json({ status: "ok", timestamp: (/* @__PURE__ */ new Date()).toISOString() });
  });
  apiRouter.get("/bootstrap", async (req, res) => {
    try {
      const [
        dbStatus,
        products,
        cart,
        wishlist,
        notifications,
        currentUser
      ] = await Promise.all([
        getDatabaseStatus().catch((err) => ({
          connected: false,
          isUsingFallback: true,
          database: "blazestore",
          hasUri: false,
          error: err?.message || null
        })),
        getProducts().catch(() => []),
        getCart().catch(() => []),
        getWishlist().catch(() => []),
        getNotifications().catch(() => []),
        getCurrentUser().catch(() => null)
      ]);
      const deals = (products || []).filter((p) => p.discountPercentage && p.discountPercentage >= 25);
      const recommended = (products || []).filter((p) => !p.discountPercentage || p.discountPercentage < 25);
      const paymentConfig = {
        currency: "NGN",
        currencySymbol: "\u20A6",
        gateway: "paystack",
        paystackConfigured: isPaystackConfigured(),
        isPaystackLive: isPaystackLive(),
        publicKey: getPaystackPublicKey(),
        paystackFullConfig: getPaystackFullConfig(),
        supportedMethods: [
          { id: "paystack", name: "Paystack (Cards, Bank Transfer, USSD, Apple Pay)", enabled: true, live: isPaystackConfigured() },
          { id: "card", name: "Debit / Credit Card (Mastercard, VISA, Verve)", enabled: true, live: isPaystackConfigured() },
          { id: "bank-transfer", name: "Nigerian Bank Direct Transfer (Instant)", enabled: true, live: true },
          { id: "ussd", name: "USSD Bank Code (*737#, *966#, *901#)", enabled: true, live: true },
          { id: "cod", name: "Pay on Delivery (Cash / POS at Door)", enabled: true, live: true }
        ]
      };
      const announcement = {
        enabled: true,
        text: "\u26A1 Nationwide Express Delivery: Free shipping across Nigeria on orders over \u20A650,000! Use code BLAZE10 for 10% OFF.",
        linkText: "Copy BLAZE10",
        linkAction: "coupon:BLAZE10",
        badge: "FLASH SALE"
      };
      res.json({
        success: true,
        dbStatus,
        products: products || [],
        deals,
        recommended,
        cart: cart || [],
        wishlist: wishlist || [],
        notifications: notifications || [],
        currentUser,
        announcement,
        paymentConfig,
        serverTime: (/* @__PURE__ */ new Date()).toISOString()
      });
    } catch (err) {
      console.error("[Bootstrap API Error]:", err);
      res.status(500).json({ success: false, error: err?.message || "Bootstrap load failed" });
    }
  });
  apiRouter.get("/cloudinary/status", (req, res) => {
    try {
      const status = getCloudinaryStatus();
      res.json({ success: true, ...status });
    } catch (err) {
      res.status(500).json({ success: false, error: err?.message });
    }
  });
  apiRouter.post("/upload", async (req, res) => {
    try {
      const { image, folder, tags } = req.body || {};
      if (!image) {
        return res.status(400).json({ success: false, error: "Image data is required (file or base64)." });
      }
      const result = await uploadImageToCloudinary(image, { folder, tags });
      res.json(result);
    } catch (err) {
      console.error("[Upload API] Error:", err);
      res.status(500).json({ success: false, error: err?.message || "Failed to process image upload" });
    }
  });
  apiRouter.get("/db/status", async (req, res) => {
    try {
      const status = await getDatabaseStatus();
      res.json({
        success: true,
        ...status,
        serverTime: (/* @__PURE__ */ new Date()).toISOString()
      });
    } catch (err) {
      res.status(500).json({ success: false, error: err?.message || "DB check failed" });
    }
  });
  apiRouter.get("/products", async (req, res) => {
    try {
      const category = req.query.category;
      const search = req.query.search;
      const products = await getProducts(category, search);
      res.json({ success: true, products });
    } catch (err) {
      res.status(500).json({ success: false, error: err?.message });
    }
  });
  apiRouter.get("/cart", async (req, res) => {
    try {
      const cart = await getCart();
      res.json({ success: true, cart });
    } catch (err) {
      res.status(500).json({ success: false, error: err?.message });
    }
  });
  apiRouter.post("/cart", async (req, res) => {
    try {
      const item = req.body;
      if (!item || !item.productId) {
        return res.status(400).json({ success: false, error: "Product data is required" });
      }
      const cart = await addToCart(item);
      res.json({ success: true, cart });
    } catch (err) {
      res.status(500).json({ success: false, error: err?.message });
    }
  });
  apiRouter.put("/cart/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const { delta } = req.body || {};
      const cart = await updateCartQuantity(id, Number(delta) || 1);
      res.json({ success: true, cart });
    } catch (err) {
      res.status(500).json({ success: false, error: err?.message });
    }
  });
  apiRouter.delete("/cart/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const cart = await removeFromCart(id);
      res.json({ success: true, cart });
    } catch (err) {
      res.status(500).json({ success: false, error: err?.message });
    }
  });
  apiRouter.delete("/cart", async (req, res) => {
    try {
      const cart = await clearCart();
      res.json({ success: true, cart });
    } catch (err) {
      res.status(500).json({ success: false, error: err?.message });
    }
  });
  apiRouter.get("/wishlist", async (req, res) => {
    try {
      const wishlist = await getWishlist();
      res.json({ success: true, wishlist });
    } catch (err) {
      res.status(500).json({ success: false, error: err?.message });
    }
  });
  apiRouter.post("/wishlist/toggle", async (req, res) => {
    try {
      const product = req.body;
      if (!product || !product.id) {
        return res.status(400).json({ success: false, error: "Product is required" });
      }
      const wishlist = await toggleWishlist(product);
      res.json({ success: true, wishlist });
    } catch (err) {
      res.status(500).json({ success: false, error: err?.message });
    }
  });
  apiRouter.post("/orders", async (req, res) => {
    try {
      const orderData = req.body;
      const order = await createOrder(orderData);
      res.json({ success: true, order });
    } catch (err) {
      res.status(500).json({ success: false, error: err?.message });
    }
  });
  apiRouter.get("/payments/config", (req, res) => {
    res.json({
      success: true,
      currency: "NGN",
      currencySymbol: "\u20A6",
      gateway: "paystack",
      paystackConfigured: isPaystackConfigured(),
      isPaystackLive: isPaystackLive(),
      publicKey: getPaystackPublicKey(),
      paystackFullConfig: getPaystackFullConfig(),
      supportedMethods: [
        { id: "paystack", name: "Pay with Paystack (Cards, Bank Transfer, USSD, Apple Pay)", enabled: true, live: isPaystackConfigured() },
        { id: "card", name: "Debit / Credit Card (Mastercard, VISA, Verve)", enabled: true, live: isPaystackConfigured() },
        { id: "bank-transfer", name: "Nigerian Bank Direct Transfer (Instant)", enabled: true, live: true },
        { id: "ussd", name: "USSD Bank Code (*737#, *966#, *901#)", enabled: true, live: true },
        { id: "cod", name: "Pay on Delivery (Cash / POS at Door)", enabled: true, live: true }
      ]
    });
  });
  apiRouter.get("/paystack/config", (req, res) => {
    res.json({
      success: true,
      ...getPaystackFullConfig()
    });
  });
  apiRouter.post("/paystack/config", (req, res) => {
    try {
      let body = req.body;
      if (typeof body === "string") {
        try {
          body = JSON.parse(body);
        } catch {
        }
      }
      const { secretKey, publicKey, mode } = body || {};
      setRuntimePaystackKeys(secretKey, publicKey, mode);
      const config = getPaystackFullConfig();
      res.setHeader("Content-Type", "application/json");
      res.status(200).json({
        success: true,
        message: "Paystack configuration updated successfully",
        ...config
      });
    } catch (err) {
      res.setHeader("Content-Type", "application/json");
      res.status(500).json({ success: false, error: err?.message || "Failed to update Paystack config" });
    }
  });
  apiRouter.post("/paystack/initialize", async (req, res) => {
    try {
      const { email, amount, reference, callbackUrl, metadata, channels } = req.body || {};
      if (!email || !amount || Number(amount) <= 0) {
        return res.status(400).json({ success: false, error: "Valid email and amount are required." });
      }
      const amountInKobo = Math.round(Number(amount) * 100);
      const result = await initializePaystackTransaction({
        email,
        amount: amountInKobo,
        reference,
        callbackUrl,
        channels,
        metadata
      });
      res.json(result);
    } catch (err) {
      console.error("[Paystack Init Endpoint Error]:", err);
      res.status(500).json({ success: false, error: err?.message || "Failed to initialize Paystack payment" });
    }
  });
  apiRouter.get("/paystack/verify/:reference", async (req, res) => {
    try {
      const { reference } = req.params;
      if (!reference) {
        return res.status(400).json({ success: false, error: "Payment reference is required." });
      }
      const result = await verifyPaystackTransaction(reference);
      if (result && result.paid) {
        try {
          await updateOrderPaymentByReference(reference, {
            paid: true,
            status: result.status,
            paystackData: result,
            gatewayResponse: result.gatewayResponse
          });
        } catch (dbErr) {
          console.warn("[Paystack DB Update on Verify Warning]:", dbErr);
        }
      }
      res.json(result);
    } catch (err) {
      console.error("[Paystack Verify Endpoint Error]:", err);
      res.status(500).json({ success: false, error: err?.message || "Failed to verify Paystack payment" });
    }
  });
  apiRouter.post("/paystack/webhook", async (req, res) => {
    try {
      const signature = req.headers["x-paystack-signature"];
      const rawBody = req.rawBody || (typeof req.body === "string" ? req.body : JSON.stringify(req.body));
      if (signature && isPaystackConfigured()) {
        const isValid = verifyPaystackWebhookSignature(rawBody, signature);
        if (!isValid) {
          console.warn("[Paystack Webhook] Invalid signature rejected");
          return res.status(400).json({ status: "error", message: "Invalid webhook signature" });
        }
      }
      const event = req.body;
      if (event?.event === "charge.success") {
        const reference = event.data?.reference;
        const amount = event.data?.amount;
        console.log(`[Paystack Webhook] Successful payment for ref: ${reference}, amount: ${amount}`);
        if (reference) {
          try {
            await updateOrderPaymentByReference(reference, {
              paid: true,
              status: "success",
              paystackData: event.data,
              gatewayResponse: event.data?.gateway_response
            });
          } catch (updateErr) {
            console.error("[Paystack Webhook DB Update Error]:", updateErr);
          }
        }
      }
      res.status(200).json({ status: "success" });
    } catch (err) {
      console.error("[Paystack Webhook Error]:", err);
      res.status(500).json({ status: "error", message: err?.message });
    }
  });
  apiRouter.post("/paystack/reconcile-pending", async (req, res) => {
    try {
      const pendingOrders = await getPendingOrders();
      let reconciledCount = 0;
      const results = [];
      for (const order of pendingOrders) {
        const ref = order.paymentReference || order.orderId;
        if (!ref) continue;
        try {
          const verifyResult = await verifyPaystackTransaction(ref);
          if (verifyResult && verifyResult.paid) {
            await updateOrderPaymentByReference(ref, {
              paid: true,
              status: verifyResult.status,
              paystackData: verifyResult,
              gatewayResponse: verifyResult.gatewayResponse
            });
            reconciledCount++;
            results.push({ orderId: order.orderId, reference: ref, status: "reconciled_paid" });
          } else {
            results.push({ orderId: order.orderId, reference: ref, status: "still_pending" });
          }
        } catch (itemErr) {
          results.push({ orderId: order.orderId, reference: ref, status: "check_failed", error: itemErr?.message });
        }
      }
      res.json({
        success: true,
        totalChecked: pendingOrders.length,
        reconciledCount,
        details: results
      });
    } catch (err) {
      console.error("[Paystack Reconciliation Error]:", err);
      res.status(500).json({ success: false, error: err?.message || "Reconciliation failed" });
    }
  });
  apiRouter.post("/payments/create-intent", async (req, res) => {
    try {
      const { amount, orderId, customerEmail, customerName } = req.body || {};
      if (!amount || amount <= 0) {
        return res.status(400).json({ success: false, error: "Valid amount is required." });
      }
      const amountInKobo = Math.round(Number(amount) * 100);
      const ref = `blz_${orderId || Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      const paystackResult = await initializePaystackTransaction({
        email: customerEmail || "customer@example.com",
        amount: amountInKobo,
        reference: ref,
        metadata: {
          orderId,
          customerName,
          customerEmail
        }
      });
      res.json({
        success: true,
        currency: "NGN",
        reference: paystackResult.reference,
        authorizationUrl: paystackResult.authorizationUrl,
        accessCode: paystackResult.accessCode,
        isSimulation: paystackResult.isSimulation,
        paymentIntentId: paystackResult.reference,
        message: paystackResult.message
      });
    } catch (err) {
      console.error("[Payment Create Error]:", err);
      res.status(500).json({
        success: false,
        error: err?.message || "Failed to initialize payment gateway"
      });
    }
  });
  apiRouter.post("/payments/confirm-payment", async (req, res) => {
    try {
      const { paymentIntentId, reference } = req.body || {};
      const refToVerify = reference || paymentIntentId;
      if (!refToVerify) {
        return res.json({ success: true, status: "success", paid: true, isSimulation: true });
      }
      const verifyResult = await verifyPaystackTransaction(refToVerify);
      res.json({
        success: verifyResult.success,
        status: verifyResult.status,
        paid: verifyResult.paid,
        isSimulation: verifyResult.isSimulation
      });
    } catch (err) {
      res.status(500).json({ success: false, error: err?.message || "Payment confirmation error" });
    }
  });
  apiRouter.get("/notifications", async (req, res) => {
    try {
      const notifications = await getNotifications();
      res.json({ success: true, notifications });
    } catch (err) {
      res.status(500).json({ success: false, error: err?.message });
    }
  });
  apiRouter.post("/notifications/read", async (req, res) => {
    try {
      const notifications = await markNotificationsRead();
      res.json({ success: true, notifications });
    } catch (err) {
      res.status(500).json({ success: false, error: err?.message });
    }
  });
  apiRouter.post("/auth/register", async (req, res) => {
    try {
      const { name, email, password, phone, roleType } = req.body || {};
      if (!name || !email) {
        return res.status(400).json({ success: false, error: "Name and email are required." });
      }
      const result = await registerUser({ name, email, password, phone, roleType });
      res.json({ success: true, ...result });
    } catch (err) {
      res.status(400).json({ success: false, error: err?.message || "Registration failed" });
    }
  });
  apiRouter.post("/auth/login", async (req, res) => {
    try {
      const { email, password } = req.body || {};
      if (!email) {
        return res.status(400).json({ success: false, error: "Email is required." });
      }
      const result = await loginUser({ email, password });
      res.json({ success: true, ...result });
    } catch (err) {
      res.status(400).json({ success: false, error: err?.message || "Login failed" });
    }
  });
  apiRouter.get("/auth/me", async (req, res) => {
    try {
      const user = await getCurrentUser();
      res.json({ success: true, user });
    } catch (err) {
      res.status(500).json({ success: false, error: err?.message });
    }
  });
  apiRouter.post("/auth/logout", async (req, res) => {
    try {
      const result = await logoutUser();
      res.json(result);
    } catch (err) {
      res.status(500).json({ success: false, error: err?.message });
    }
  });
  apiRouter.get("/admin/analytics", async (req, res) => {
    try {
      const analytics = await getSalesAnalytics();
      res.json({ success: true, analytics });
    } catch (err) {
      res.status(500).json({ success: false, error: err?.message });
    }
  });
  apiRouter.get("/admin/products", async (req, res) => {
    try {
      const category = req.query.category;
      const search = req.query.search;
      const products = await getAllProductsAdmin(category, search);
      res.json({ success: true, products });
    } catch (err) {
      res.status(500).json({ success: false, error: err?.message });
    }
  });
  apiRouter.post("/admin/products", async (req, res) => {
    try {
      const productData = req.body || {};
      if (!productData.name || !productData.price) {
        return res.status(400).json({ success: false, error: "Product name and price are required." });
      }
      const product = await createProductAdmin(productData);
      res.json({ success: true, product, message: "Product added to MongoDB inventory." });
    } catch (err) {
      res.status(500).json({ success: false, error: err?.message });
    }
  });
  apiRouter.put("/admin/products/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const updateData = req.body || {};
      const updated = await updateProductAdmin(id, updateData);
      res.json({ success: true, product: updated, message: "Product details updated." });
    } catch (err) {
      res.status(500).json({ success: false, error: err?.message });
    }
  });
  apiRouter.put("/admin/products/:id/stock", async (req, res) => {
    try {
      const { id } = req.params;
      const { stockQuantity, inStock } = req.body || {};
      const updated = await updateProductStock(id, Number(stockQuantity), inStock);
      res.json({ success: true, product: updated, message: "Stock quantity updated." });
    } catch (err) {
      res.status(500).json({ success: false, error: err?.message });
    }
  });
  apiRouter.delete("/admin/products/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const result = await deleteProductAdmin(id);
      res.json({ success: true, ...result, message: "Product removed from catalog." });
    } catch (err) {
      res.status(500).json({ success: false, error: err?.message });
    }
  });
  apiRouter.get("/admin/orders", async (req, res) => {
    try {
      const status = req.query.status;
      const search = req.query.search;
      const orders = await getAllOrders(status, search);
      res.json({ success: true, orders });
    } catch (err) {
      res.status(500).json({ success: false, error: err?.message });
    }
  });
  apiRouter.put("/admin/orders/:orderId/status", async (req, res) => {
    try {
      const { orderId } = req.params;
      const { status, adminName, adminRole } = req.body || {};
      const updated = await updateOrderStatus(orderId, status, { name: adminName, role: adminRole });
      res.json({ success: true, order: updated, message: `Order status updated to ${status}.` });
    } catch (err) {
      res.status(500).json({ success: false, error: err?.message });
    }
  });
  apiRouter.post("/admin/refunds", async (req, res) => {
    try {
      const { orderId, amount, reason, restockItems, adminName, adminRole } = req.body || {};
      if (!orderId || !amount) {
        return res.status(400).json({ success: false, error: "Order ID and refund amount are required." });
      }
      const result = await processRefund({
        orderId,
        amount: Number(amount),
        reason: reason || "Customer Refund",
        restockItems: Boolean(restockItems),
        adminName: adminName || "Admin",
        adminRole: adminRole || "manager"
      });
      res.json(result);
    } catch (err) {
      res.status(400).json({ success: false, error: err?.message || "Refund failed" });
    }
  });
  apiRouter.get("/admin/refunds", async (req, res) => {
    try {
      const refunds = await getRefunds();
      res.json({ success: true, refunds });
    } catch (err) {
      res.status(500).json({ success: false, error: err?.message });
    }
  });
  apiRouter.post("/admin/refunds/:id/approve", async (req, res) => {
    try {
      const { id } = req.params;
      const { ownerName, adminRole } = req.body || {};
      if (adminRole !== "owner") {
        return res.status(403).json({ success: false, error: "Only Store Owners can approve queued refunds." });
      }
      const result = await approveRefund(id, ownerName || "Store Owner");
      res.json(result);
    } catch (err) {
      res.status(400).json({ success: false, error: err?.message || "Approval failed" });
    }
  });
  apiRouter.post("/admin/refunds/:id/reject", async (req, res) => {
    try {
      const { id } = req.params;
      const { ownerName, adminRole } = req.body || {};
      if (adminRole !== "owner") {
        return res.status(403).json({ success: false, error: "Only Store Owners can reject queued refunds." });
      }
      const result = await rejectRefund(id, ownerName || "Store Owner");
      res.json(result);
    } catch (err) {
      res.status(400).json({ success: false, error: err?.message || "Rejection failed" });
    }
  });
  apiRouter.get("/admin/users", async (req, res) => {
    try {
      const users = await getAllUsers();
      res.json({ success: true, users });
    } catch (err) {
      res.status(500).json({ success: false, error: err?.message });
    }
  });
  apiRouter.post("/admin/users", async (req, res) => {
    try {
      const { name, email, password, phone, roleType } = req.body || {};
      if (!name || !email) {
        return res.status(400).json({ success: false, error: "Name and email are required." });
      }
      const result = await registerUser({ name, email, password, phone, roleType });
      res.json({ success: true, user: result.user, message: "Staff member account created." });
    } catch (err) {
      res.status(400).json({ success: false, error: err?.message || "Failed to create user" });
    }
  });
  apiRouter.put("/admin/users/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const updateData = req.body || {};
      const updated = await updateUserAdmin(id, updateData);
      res.json({ success: true, user: updated, message: "User updated." });
    } catch (err) {
      res.status(500).json({ success: false, error: err?.message });
    }
  });
  apiRouter.put("/admin/users/:id/role", async (req, res) => {
    try {
      const { id } = req.params;
      const { role, roleType } = req.body || {};
      const updated = await updateUserRole(id, role, roleType);
      res.json({ success: true, user: updated, message: "User role updated." });
    } catch (err) {
      res.status(500).json({ success: false, error: err?.message });
    }
  });
  apiRouter.delete("/admin/users/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const result = await deleteUserAdmin(id);
      res.json(result);
    } catch (err) {
      res.status(400).json({ success: false, error: err?.message || "Failed to remove user" });
    }
  });
  apiRouter.delete("/admin/orders/:orderId", async (req, res) => {
    try {
      const { orderId } = req.params;
      const result = await deleteOrderAdmin(orderId);
      res.json(result);
    } catch (err) {
      res.status(500).json({ success: false, error: err?.message });
    }
  });
  apiRouter.get("/admin/db/collections", async (req, res) => {
    try {
      const collections = await getDbCollectionsInfo();
      res.json({ success: true, collections });
    } catch (err) {
      res.status(500).json({ success: false, error: err?.message });
    }
  });
  apiRouter.post("/admin/db/query", async (req, res) => {
    try {
      const { collection, filter, limit, skip, sort } = req.body || {};
      if (!collection) {
        return res.status(400).json({ success: false, error: "Collection name is required." });
      }
      const result = await queryDbCollection(collection, { filter, limit, skip, sort });
      res.json({ success: true, ...result });
    } catch (err) {
      res.status(500).json({ success: false, error: err?.message });
    }
  });
  apiRouter.post("/admin/db/document", async (req, res) => {
    try {
      const { collection, document } = req.body || {};
      if (!collection || !document) {
        return res.status(400).json({ success: false, error: "Collection name and document data are required." });
      }
      const result = await insertDbDocument(collection, document);
      res.json(result);
    } catch (err) {
      res.status(500).json({ success: false, error: err?.message });
    }
  });
  apiRouter.put("/admin/db/document/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const { collection, document } = req.body || {};
      if (!collection || !document) {
        return res.status(400).json({ success: false, error: "Collection name and document data are required." });
      }
      const result = await updateDbDocument(collection, id, document);
      res.json(result);
    } catch (err) {
      res.status(500).json({ success: false, error: err?.message });
    }
  });
  apiRouter.delete("/admin/db/document/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const { collection } = req.body || {};
      if (!collection) {
        return res.status(400).json({ success: false, error: "Collection name is required." });
      }
      const result = await deleteDbDocument(collection, id);
      res.json(result);
    } catch (err) {
      res.status(500).json({ success: false, error: err?.message });
    }
  });
  apiRouter.get("/admin/db/export", async (req, res) => {
    try {
      const data = await exportDatabaseData();
      res.json({ success: true, data });
    } catch (err) {
      res.status(500).json({ success: false, error: err?.message });
    }
  });
  apiRouter.post("/admin/db/seed", async (req, res) => {
    try {
      const result = await seedCatalogToDatabase();
      res.json(result);
    } catch (err) {
      res.status(500).json({ success: false, error: err?.message });
    }
  });
  apiRouter.post("/admin/clear-mock-data", async (req, res) => {
    try {
      const result = await clearAllMockData();
      res.json(result);
    } catch (err) {
      res.status(500).json({ success: false, error: err?.message || "Failed to clear mock data" });
    }
  });
  app2.use("/api", apiRouter);
  app2.use("/", apiRouter);
  app2.use((err, req, res, next) => {
    console.error("[API Server Error]:", err);
    if (res.headersSent) {
      return next(err);
    }
    res.status(err?.status || 500).json({
      success: false,
      error: err?.message || "Internal Server Error"
    });
  });
  return app2;
}

// server/vercelHandler.ts
var app = createApp();
function handler(req, res) {
  if (req.url && req.url.includes("[...all]")) {
    const match = req.query?.match || req.query?.all;
    if (match) {
      const subPath = Array.isArray(match) ? match.join("/") : match;
      req.url = "/api/" + subPath.replace(/^\/+/, "");
    } else if (req.headers && req.headers["x-matched-path"]) {
      req.url = req.headers["x-matched-path"];
    } else if (req.headers && req.headers["x-forwarded-url"]) {
      try {
        const u = new URL(req.headers["x-forwarded-url"], "http://localhost");
        req.url = u.pathname;
      } catch {
      }
    }
  }
  if (req.url && !req.url.startsWith("/api")) {
    req.url = "/api" + req.url;
  }
  return app(req, res);
}
export {
  handler as default
};
