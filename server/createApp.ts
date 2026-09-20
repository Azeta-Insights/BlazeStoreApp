import express from 'express';
import dotenv from 'dotenv';
import { parseCookies, verifyFirebaseIdToken } from './auth';
import {
  getDatabaseStatus,
  getProducts,
  getAllProductsAdmin,
  updateProductStock,
  createProductAdmin,
  updateProductAdmin,
  deleteProductAdmin,
  clearAllProductsAdmin,
  bulkCreateProductsAdmin,
  getCart,
  addToCart,
  updateCartQuantity,
  removeFromCart,
  clearCart,
  getWishlist,
  toggleWishlist,
  createOrder,
  getUserOrders,
  getOrderById,
  updateOrderPaymentByReference,
  getAllOrders,
  updateOrderStatus,
  deleteOrderAdmin,
  processRefund,
  approveRefund,
  rejectRefund,
  getRefunds,
  getSalesAnalytics,
  getAllUsers,
  updateUserRole,
  updateUserAdmin,
  deleteUserAdmin,
  getDbCollectionsInfo,
  queryDbCollection,
  insertDbDocument,
  updateDbDocument,
  deleteDbDocument,
  exportDatabaseData,
  seedCatalogToDatabase,
  getNotifications,
  markNotificationsRead,
  registerUser,
  loginUser,
  logoutUser,
  getCurrentUser,
  clearAllMockData,
  getPendingOrders,
} from './db';
import {
  uploadImageToCloudinary,
  getCloudinaryStatus,
} from './cloudinary';
import {
  getEmailStatus,
  sendTestEmail,
  setRuntimeEmailConfig,
} from './email';
import {
  isPaystackConfigured,
  isPaystackLive,
  getPaystackPublicKey,
  getPaystackFullConfig,
  setRuntimePaystackKeys,
  initializePaystackTransaction,
  verifyPaystackTransaction,
  verifyPaystackWebhookSignature,
} from './paystack';


dotenv.config();

export function createApp() {
  const app = express();

  // Basic CORS headers for API requests
  app.use((req, res, next) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS, PATCH');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');
    if (req.method === 'OPTIONS') {
      return res.status(200).end();
    }
    next();
  });

  // Safe body parser for standalone Express & Vercel serverless environments
  // (Captures rawBody for Paystack HMAC-SHA512 webhook signature verification)
  app.use((req: any, res, next) => {
    if (req.body && typeof req.body === 'object') {
      return next();
    }
    express.json({
      limit: '50mb',
      verify: (req: any, _res, buf) => {
        req.rawBody = buf.toString('utf8');
      },
    })(req, res, next);
  });
  app.use((req, res, next) => {
    if (req.body && typeof req.body === 'object') {
      return next();
    }
    express.urlencoded({ limit: '50mb', extended: true })(req, res, next);
  });

  const apiRouter = express.Router();

  // Health check route
  apiRouter.get('/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  // Consolidated Bootstrap API for Instantaneous App Loading in a single round-trip
  apiRouter.get('/bootstrap', async (req, res) => {
    try {
      const authHeader = req.headers.authorization || '';
      const cookieHeader = req.headers.cookie || '';
      const cookies = parseCookies(cookieHeader);
      const token = authHeader.startsWith('Bearer ')
        ? authHeader.substring(7).trim()
        : cookies.token || cookies.blazestore_jwt_token;

      const [
        dbStatus,
        products,
        cart,
        wishlist,
        notifications,
        currentUser,
      ] = await Promise.all([
        getDatabaseStatus().catch((err) => ({
          connected: false,
          isUsingFallback: true,
          database: 'blazestore',
          hasUri: false,
          error: err?.message || null,
        })),
        getProducts().catch(() => []),
        getCart().catch(() => []),
        getWishlist().catch(() => []),
        getNotifications().catch(() => []),
        getCurrentUser(token).catch(() => null),
      ]);

      let deals = (products || []).filter((p) => p.isDeal || p.isHot || (p.discountPercentage && p.discountPercentage >= 15));
      let recommended = (products || []).filter((p) => !deals.some((d) => d.id === p.id));

      if (deals.length === 0 && (products || []).length > 0) {
        const mid = Math.ceil((products || []).length / 2);
        deals = (products || []).slice(0, mid);
        recommended = (products || []).slice(mid);
      }

      const paymentConfig = {
        currency: 'NGN',
        currencySymbol: '₦',
        gateway: 'paystack',
        paystackConfigured: isPaystackConfigured(),
        isPaystackLive: isPaystackLive(),
        publicKey: getPaystackPublicKey(),
        paystackFullConfig: getPaystackFullConfig(),
        supportedMethods: [
          { id: 'paystack', name: 'Paystack (Cards, Bank Transfer, USSD, Apple Pay)', enabled: true, live: isPaystackConfigured() },
          { id: 'card', name: 'Debit / Credit Card (Mastercard, VISA, Verve)', enabled: true, live: isPaystackConfigured() },
          { id: 'bank-transfer', name: 'Nigerian Bank Direct Transfer (Instant)', enabled: true, live: true },
          { id: 'ussd', name: 'USSD Bank Code (*737#, *966#, *901#)', enabled: true, live: true },
          { id: 'cod', name: 'Pay on Delivery (Cash / POS at Door)', enabled: true, live: true },
        ],
      };

      const announcement = {
        enabled: true,
        text: '⚡ Nationwide Express Delivery: Free shipping across Nigeria on orders over ₦50,000! Use code BLAZE10 for 10% OFF.',
        linkText: 'Copy BLAZE10',
        linkAction: 'coupon:BLAZE10',
        badge: 'FLASH SALE',
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
        serverTime: new Date().toISOString(),
      });
    } catch (err: any) {
      console.error('[Bootstrap API Error]:', err);
      res.status(500).json({ success: false, error: err?.message || 'Bootstrap load failed' });
    }
  });

  // === Cloudinary Image Upload API ===
  apiRouter.get('/cloudinary/status', (req, res) => {
    try {
      const status = getCloudinaryStatus();
      res.json({ success: true, ...status });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err?.message });
    }
  });

  apiRouter.post('/upload', async (req, res) => {
    try {
      const { image, folder, tags } = req.body || {};
      if (!image) {
        return res.status(400).json({ success: false, error: 'Image data is required (file or base64).' });
      }
      const result = await uploadImageToCloudinary(image, { folder, tags });
      res.json(result);
    } catch (err: any) {
      console.error('[Upload API] Error:', err);
      res.status(500).json({ success: false, error: err?.message || 'Failed to process image upload' });
    }
  });

  // === Outbound Email Service Status & Test ===
  apiRouter.get('/email/status', (req, res) => {
    try {
      const status = getEmailStatus();
      res.json({ success: true, ...status });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err?.message });
    }
  });

  apiRouter.post('/email/test', async (req, res) => {
    try {
      const { email } = req.body || {};
      const target = email || process.env.SMTP_USER || 'admin@blazestore.ng';
      const result = await sendTestEmail(target);
      res.json(result);
    } catch (err: any) {
      res.status(500).json({ success: false, error: err?.message || 'Failed to trigger test email' });
    }
  });

  apiRouter.post('/email/config', async (req, res) => {
    try {
      const { host, port, user, pass, from, secure } = req.body || {};
      await setRuntimeEmailConfig({ host, port, user, pass, from, secure });
      const status = getEmailStatus();
      res.json({ success: true, ...status });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err?.message || 'Failed to update email config' });
    }
  });

  // === Store Database API Routes ===

  // 1. Health & Database Status
  apiRouter.get('/db/status', async (req, res) => {
    try {
      const force = req.query.force === 'true';
      const status = await getDatabaseStatus(force);
      res.json({
        success: true,
        ...status,
        serverTime: new Date().toISOString(),
      });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err?.message || 'DB check failed' });
    }
  });

  // 1b. Consolidated Bootstrap API (Storefront fast-load)
  apiRouter.get('/bootstrap', async (req, res) => {
    try {
      const [dbStatus, allProducts, cart, wishlist, notifications] = await Promise.all([
        getDatabaseStatus().catch(() => ({ connected: true, database: 'Cloud Firestore' })),
        getProducts().catch(() => []),
        getCart().catch(() => []),
        getWishlist().catch(() => []),
        getNotifications().catch(() => []),
      ]);

      const deals = allProducts.filter(
        (p: any) => p.isDeal || p.isHot || (p.discountPercentage && p.discountPercentage >= 15)
      );
      const recommended = allProducts.filter((p: any) => !deals.some((d: any) => d.id === p.id));

      res.json({
        success: true,
        dbStatus,
        products: allProducts,
        deals: deals.length > 0 ? deals : allProducts.slice(0, Math.ceil(allProducts.length / 2)),
        recommended: recommended.length > 0 ? recommended : allProducts.slice(Math.ceil(allProducts.length / 2)),
        cart,
        wishlist,
        notifications,
        announcement: {
          enabled: true,
          badge: 'FLASH SALE',
          title: 'Mega Tech & Sillage Deals!',
          description: 'Save up to 40% on luxury fragrances, flagship devices & fashion.',
          linkText: 'Claim 20% Voucher',
          linkAction: 'coupon:FLASH20',
          backgroundColor: 'from-amber-600 via-orange-600 to-rose-600',
          textColor: 'text-white',
        },
        paymentConfig: getPaystackFullConfig(),
        serverTime: new Date().toISOString(),
      });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err?.message || 'Bootstrap failed' });
    }
  });

  // 2. Products API (Storefront)
  apiRouter.get('/products', async (req, res) => {
    try {
      const category = req.query.category as string | undefined;
      const search = req.query.search as string | undefined;
      const products = await getProducts(category, search);
      res.json({ success: true, products });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err?.message });
    }
  });

  // 3. Cart API
  apiRouter.get('/cart', async (req, res) => {
    try {
      const cart = await getCart();
      res.json({ success: true, cart });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err?.message });
    }
  });

  apiRouter.post('/cart', async (req, res) => {
    try {
      const item = req.body;
      if (!item || !item.productId) {
        return res.status(400).json({ success: false, error: 'Product data is required' });
      }
      const cart = await addToCart(item);
      res.json({ success: true, cart });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err?.message });
    }
  });

  apiRouter.put('/cart/:id', async (req, res) => {
    try {
      const { id } = req.params;
      const { delta } = req.body || {};
      const cart = await updateCartQuantity(id, Number(delta) || 1);
      res.json({ success: true, cart });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err?.message });
    }
  });

  apiRouter.delete('/cart/:id', async (req, res) => {
    try {
      const { id } = req.params;
      const cart = await removeFromCart(id);
      res.json({ success: true, cart });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err?.message });
    }
  });

  apiRouter.delete('/cart', async (req, res) => {
    try {
      const cart = await clearCart();
      res.json({ success: true, cart });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err?.message });
    }
  });

  // 4. Wishlist API
  apiRouter.get('/wishlist', async (req, res) => {
    try {
      const wishlist = await getWishlist();
      res.json({ success: true, wishlist });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err?.message });
    }
  });

  apiRouter.post('/wishlist/toggle', async (req, res) => {
    try {
      const product = req.body;
      if (!product || !product.id) {
        return res.status(400).json({ success: false, error: 'Product is required' });
      }
      const wishlist = await toggleWishlist(product);
      res.json({ success: true, wishlist });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err?.message });
    }
  });

  // 5. Orders API (Storefront customer placement & customer order tracking)
  apiRouter.get('/orders', async (req, res) => {
    try {
      const { userId, email, orderId, search } = req.query as {
        userId?: string;
        email?: string;
        orderId?: string;
        search?: string;
      };

      // Try to extract user info from auth token if present
      let authUserId = userId;
      let authEmail = email;
      const authHeader = req.headers.authorization;
      if (authHeader && authHeader.startsWith('Bearer ')) {
        const decoded = await verifyFirebaseIdToken(authHeader.split(' ')[1]);
        if (decoded?.uid) {
          authUserId = authUserId || decoded.uid;
          authEmail = authEmail || decoded.email;
        }
      }

      const orders = await getUserOrders(authUserId, authEmail, orderId || search);
      res.json({ success: true, orders });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err?.message });
    }
  });

  apiRouter.get('/orders/:orderId', async (req, res) => {
    try {
      const { orderId } = req.params;
      const order = await getOrderById(orderId);
      if (!order) {
        return res.status(404).json({ success: false, error: `Order #${orderId} not found.` });
      }
      res.json({ success: true, order });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err?.message });
    }
  });

  apiRouter.post('/orders', async (req, res) => {
    try {
      const orderData = req.body;
      const order = await createOrder(orderData);
      res.json({ success: true, order });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err?.message });
    }
  });

  // === 5b. Payment Gateway & Paystack (Nigeria NGN) Processing API ===
  apiRouter.get('/payments/config', (req, res) => {
    res.json({
      success: true,
      currency: 'NGN',
      currencySymbol: '₦',
      gateway: 'paystack',
      paystackConfigured: isPaystackConfigured(),
      isPaystackLive: isPaystackLive(),
      publicKey: getPaystackPublicKey(),
      paystackFullConfig: getPaystackFullConfig(),
      supportedMethods: [
        { id: 'paystack', name: 'Pay with Paystack (Cards, Bank Transfer, USSD, Apple Pay)', enabled: true, live: isPaystackConfigured() },
        { id: 'card', name: 'Debit / Credit Card (Mastercard, VISA, Verve)', enabled: true, live: isPaystackConfigured() },
        { id: 'bank-transfer', name: 'Nigerian Bank Direct Transfer (Instant)', enabled: true, live: true },
        { id: 'ussd', name: 'USSD Bank Code (*737#, *966#, *901#)', enabled: true, live: true },
        { id: 'cod', name: 'Pay on Delivery (Cash / POS at Door)', enabled: true, live: true },
      ],
    });
  });

  // Paystack Configuration Management
  apiRouter.get('/paystack/config', (req, res) => {
    res.json({
      success: true,
      ...getPaystackFullConfig(),
    });
  });

  apiRouter.post('/paystack/config', (req, res) => {
    try {
      let body = req.body;
      if (typeof body === 'string') {
        try { body = JSON.parse(body); } catch {}
      }
      const { secretKey, publicKey, mode } = body || {};
      setRuntimePaystackKeys(secretKey, publicKey, mode);
      const config = getPaystackFullConfig();
      res.setHeader('Content-Type', 'application/json');
      res.status(200).json({
        success: true,
        message: 'Paystack configuration updated successfully',
        ...config,
      });
    } catch (err: any) {
      res.setHeader('Content-Type', 'application/json');
      res.status(500).json({ success: false, error: err?.message || 'Failed to update Paystack config' });
    }
  });

  // Paystack Initialize Route
  apiRouter.post('/paystack/initialize', async (req, res) => {
    res.setHeader('Content-Type', 'application/json');
    try {
      const { email, amount, reference, callbackUrl, metadata, channels } = req.body || {};
      if (!email || !amount || Number(amount) <= 0) {
        return res.status(400).json({ success: false, error: 'Valid email and amount are required.' });
      }

      // Convert Naira amount to Kobo (1 Naira = 100 Kobo)
      const amountInKobo = Math.round(Number(amount) * 100);

      const result = await initializePaystackTransaction({
        email,
        amount: amountInKobo,
        reference,
        callbackUrl,
        channels,
        metadata,
      });

      return res.json(result);
    } catch (err: any) {
      console.error('[Paystack Init Endpoint Error]:', err);
      return res.status(200).json({
        success: false,
        reference: req.body?.reference || `blz_ref_${Date.now()}`,
        isSimulation: true,
        error: err?.message || 'Failed to initialize Paystack payment',
      });
    }
  });

  // Paystack Verify Route
  apiRouter.get('/paystack/verify/:reference', async (req, res) => {
    res.setHeader('Content-Type', 'application/json');
    try {
      const { reference } = req.params;
      if (!reference) {
        return res.status(400).json({ success: false, error: 'Payment reference is required.' });
      }

      const result = await verifyPaystackTransaction(reference);

      // Automatically sync and update the database order status if paid
      if (result && result.paid) {
        try {
          await updateOrderPaymentByReference(reference, {
            paid: true,
            status: result.status,
            paystackData: result,
            gatewayResponse: result.gatewayResponse,
          });
        } catch (dbErr) {
          console.warn('[Paystack DB Update on Verify Warning]:', dbErr);
        }
      }

      return res.json(result);
    } catch (err: any) {
      console.error('[Paystack Verify Endpoint Error]:', err);
      return res.status(200).json({
        success: false,
        paid: false,
        status: 'pending',
        error: err?.message || 'Failed to verify Paystack payment',
      });
    }
  });

  // Paystack Webhook Handler
  apiRouter.post('/paystack/webhook', async (req, res) => {
    try {
      const signature = req.headers['x-paystack-signature'] as string;
      const rawBody = (req as any).rawBody || (typeof req.body === 'string' ? req.body : JSON.stringify(req.body));

      if (isPaystackConfigured()) {
        if (!signature) {
          console.warn('[Paystack Webhook] Rejected: Missing x-paystack-signature header');
          return res.status(401).json({ status: 'error', message: 'Missing x-paystack-signature header' });
        }
        const isValid = verifyPaystackWebhookSignature(rawBody, signature);
        if (!isValid) {
          console.warn('[Paystack Webhook] Rejected: Invalid HMAC signature');
          return res.status(401).json({ status: 'error', message: 'Invalid Paystack webhook signature' });
        }
      }

      const event = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
      if (event?.event === 'charge.success') {
        const reference = event.data?.reference;
        const amount = event.data?.amount;
        console.log(`[Paystack Webhook Verified] Successful payment for ref: ${reference}, amount: ₦${(amount / 100).toFixed(2)}`);

        if (reference) {
          try {
            await updateOrderPaymentByReference(reference, {
              paid: true,
              status: 'success',
              paystackData: event.data,
              gatewayResponse: event.data?.gateway_response,
            });
          } catch (updateErr) {
            console.error('[Paystack Webhook DB Update Error]:', updateErr);
          }
        }
      }

      res.status(200).json({ status: 'success' });
    } catch (err: any) {
      console.error('[Paystack Webhook Error]:', err);
      res.status(500).json({ status: 'error', message: err?.message });
    }
  });

  // Paystack Automated / Manual Pending Order Reconciliation
  apiRouter.post('/paystack/reconcile-pending', async (req, res) => {
    try {
      const pendingOrders = await getPendingOrders();
      let reconciledCount = 0;
      const results: any[] = [];

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
              gatewayResponse: verifyResult.gatewayResponse,
            });
            reconciledCount++;
            results.push({ orderId: order.orderId, reference: ref, status: 'reconciled_paid' });
          } else {
            results.push({ orderId: order.orderId, reference: ref, status: 'still_pending' });
          }
        } catch (itemErr: any) {
          results.push({ orderId: order.orderId, reference: ref, status: 'check_failed', error: itemErr?.message });
        }
      }

      res.json({
        success: true,
        totalChecked: pendingOrders.length,
        reconciledCount,
        details: results,
      });
    } catch (err: any) {
      console.error('[Paystack Reconciliation Error]:', err);
      res.status(500).json({ success: false, error: err?.message || 'Reconciliation failed' });
    }
  });

  // Backward compatibility alias endpoints
  apiRouter.post('/payments/create-intent', async (req, res) => {
    try {
      const { amount, orderId, customerEmail, customerName } = req.body || {};
      if (!amount || amount <= 0) {
        return res.status(400).json({ success: false, error: 'Valid amount is required.' });
      }

      const amountInKobo = Math.round(Number(amount) * 100);
      const ref = `blz_${orderId || Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

      const paystackResult = await initializePaystackTransaction({
        email: customerEmail || 'customer@example.com',
        amount: amountInKobo,
        reference: ref,
        metadata: {
          orderId,
          customerName,
          customerEmail,
        },
      });

      res.json({
        success: true,
        currency: 'NGN',
        reference: paystackResult.reference,
        authorizationUrl: paystackResult.authorizationUrl,
        accessCode: paystackResult.accessCode,
        isSimulation: paystackResult.isSimulation,
        paymentIntentId: paystackResult.reference,
        message: paystackResult.message,
      });
    } catch (err: any) {
      console.error('[Payment Create Error]:', err);
      res.status(500).json({
        success: false,
        error: err?.message || 'Failed to initialize payment gateway',
      });
    }
  });

  apiRouter.post('/payments/confirm-payment', async (req, res) => {
    try {
      const { paymentIntentId, reference } = req.body || {};
      const refToVerify = reference || paymentIntentId;

      if (!refToVerify) {
        return res.json({ success: true, status: 'success', paid: true, isSimulation: true });
      }

      const verifyResult = await verifyPaystackTransaction(refToVerify);
      res.json({
        success: verifyResult.success,
        status: verifyResult.status,
        paid: verifyResult.paid,
        isSimulation: verifyResult.isSimulation,
      });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err?.message || 'Payment confirmation error' });
    }
  });


  // 6. Notifications API
  apiRouter.get('/notifications', async (req, res) => {
    try {
      const notifications = await getNotifications();
      res.json({ success: true, notifications });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err?.message });
    }
  });

  apiRouter.post('/notifications/read', async (req, res) => {
    try {
      const notifications = await markNotificationsRead();
      res.json({ success: true, notifications });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err?.message });
    }
  });

  // 7. User Registration & Auth API
  apiRouter.post('/auth/register', async (req, res) => {
    try {
      const { idToken, name, email, phone, roleType } = req.body || {};
      const authHeader = req.headers.authorization || '';
      const tokenToVerify = idToken || (authHeader.startsWith('Bearer ') ? authHeader.substring(7) : undefined);

      if (!email) {
        return res.status(400).json({ success: false, error: 'Email is required.' });
      }
      const result = await registerUser({ idToken: tokenToVerify, name, email, phone, roleType });
      res.json({ success: true, ...result });
    } catch (err: any) {
      const status = err?.status || (err?.message?.includes('503 Service Unavailable') ? 503 : 400);
      res.status(status).json({ success: false, error: err?.message || 'Registration failed' });
    }
  });

  apiRouter.post('/auth/login', async (req, res) => {
    try {
      const { idToken, email } = req.body || {};
      const authHeader = req.headers.authorization || '';
      const tokenToVerify = idToken || (authHeader.startsWith('Bearer ') ? authHeader.substring(7) : undefined);

      if (!email) {
        return res.status(400).json({ success: false, error: 'Email is required.' });
      }
      const result = await loginUser({ idToken: tokenToVerify, email });
      res.json({ success: true, ...result });
    } catch (err: any) {
      const status = err?.status || (err?.message?.includes('503 Service Unavailable') ? 503 : 400);
      res.status(status).json({ success: false, error: err?.message || 'Login failed' });
    }
  });

  apiRouter.get('/auth/me', async (req, res) => {
    try {
      const authHeader = req.headers.authorization || '';
      const cookieHeader = req.headers.cookie || '';
      const cookies = parseCookies(cookieHeader);
      const token = authHeader.startsWith('Bearer ')
        ? authHeader.substring(7).trim()
        : cookies.token || cookies.blazestore_jwt_token;

      const user = await getCurrentUser(token);
      res.json({ success: true, user });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err?.message });
    }
  });

  apiRouter.post('/auth/logout', async (req, res) => {
    try {
      res.setHeader('Set-Cookie', 'token=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0');
      const result = await logoutUser();
      res.json(result);
    } catch (err: any) {
      res.status(500).json({ success: false, error: err?.message });
    }
  });

  // === ADMIN DASHBOARD API ROUTES ===

  // A. Sales Analytics & Reports
  apiRouter.get('/admin/analytics', async (req, res) => {
    try {
      const analytics = await getSalesAnalytics();
      res.json({ success: true, analytics });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err?.message });
    }
  });

  // B. Inventory Management API
  apiRouter.get('/admin/products', async (req, res) => {
    try {
      const category = req.query.category as string | undefined;
      const search = req.query.search as string | undefined;
      const products = await getAllProductsAdmin(category, search);
      res.json({ success: true, products });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err?.message });
    }
  });

  apiRouter.post('/admin/products', async (req, res) => {
    try {
      const productData = req.body || {};
      if (!productData.name || !productData.price) {
        return res.status(400).json({ success: false, error: 'Product name and price are required.' });
      }
      const product = await createProductAdmin(productData);
      res.json({ success: true, product, message: 'Product added to Firestore inventory.' });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err?.message });
    }
  });

  apiRouter.put('/admin/products/:id', async (req, res) => {
    try {
      const { id } = req.params;
      const updateData = req.body || {};
      const updated = await updateProductAdmin(id, updateData);
      res.json({ success: true, product: updated, message: 'Product details updated.' });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err?.message });
    }
  });

  apiRouter.put('/admin/products/:id/stock', async (req, res) => {
    try {
      const { id } = req.params;
      const { stockQuantity, inStock } = req.body || {};
      const updated = await updateProductStock(id, Number(stockQuantity), inStock);
      res.json({ success: true, product: updated, message: 'Stock quantity updated.' });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err?.message });
    }
  });

  apiRouter.delete('/admin/products/:id', async (req, res) => {
    try {
      const { id } = req.params;
      const result = await deleteProductAdmin(id);
      res.json({ success: true, ...result, message: 'Product removed from catalog.' });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err?.message });
    }
  });

  apiRouter.post('/admin/products/clear-all', async (req, res) => {
    try {
      const result = await clearAllProductsAdmin();
      res.json(result);
    } catch (err: any) {
      res.status(500).json({ success: false, error: err?.message || 'Failed to clear products' });
    }
  });

  apiRouter.post('/admin/products/bulk-import', async (req, res) => {
    try {
      const { products } = req.body || {};
      if (!Array.isArray(products) || products.length === 0) {
        return res.status(400).json({ success: false, error: 'A non-empty products array is required.' });
      }
      const result = await bulkCreateProductsAdmin(products);
      res.json(result);
    } catch (err: any) {
      res.status(500).json({ success: false, error: err?.message || 'Bulk import failed' });
    }
  });

  // C. Order Management & Process Refunds API
  apiRouter.get('/admin/orders', async (req, res) => {
    try {
      const status = req.query.status as string | undefined;
      const search = req.query.search as string | undefined;
      const orders = await getAllOrders(status, search);
      res.json({ success: true, orders });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err?.message });
    }
  });

  apiRouter.put('/admin/orders/:orderId/status', async (req, res) => {
    try {
      const { orderId } = req.params;
      const { status, adminName, adminRole } = req.body || {};
      const updated = await updateOrderStatus(orderId, status, { name: adminName, role: adminRole });
      res.json({ success: true, order: updated, message: `Order status updated to ${status}.` });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err?.message });
    }
  });

  apiRouter.post('/admin/refunds', async (req, res) => {
    try {
      const { orderId, amount, reason, restockItems, adminName, adminRole } = req.body || {};
      if (!orderId || !amount) {
        return res.status(400).json({ success: false, error: 'Order ID and refund amount are required.' });
      }
      const result = await processRefund({
        orderId,
        amount: Number(amount),
        reason: reason || 'Customer Refund',
        restockItems: Boolean(restockItems),
        adminName: adminName || 'Admin',
        adminRole: adminRole || 'manager',
      });
      res.json(result);
    } catch (err: any) {
      res.status(400).json({ success: false, error: err?.message || 'Refund failed' });
    }
  });

  apiRouter.get('/admin/refunds', async (req, res) => {
    try {
      const refunds = await getRefunds();
      res.json({ success: true, refunds });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err?.message });
    }
  });

  apiRouter.post('/admin/refunds/:id/approve', async (req, res) => {
    try {
      const { id } = req.params;
      const { ownerName, adminRole } = req.body || {};
      if (adminRole !== 'owner') {
        return res.status(403).json({ success: false, error: 'Only Store Owners can approve queued refunds.' });
      }
      const result = await approveRefund(id, ownerName || 'Store Owner');
      res.json(result);
    } catch (err: any) {
      res.status(400).json({ success: false, error: err?.message || 'Approval failed' });
    }
  });

  apiRouter.post('/admin/refunds/:id/reject', async (req, res) => {
    try {
      const { id } = req.params;
      const { ownerName, adminRole } = req.body || {};
      if (adminRole !== 'owner') {
        return res.status(403).json({ success: false, error: 'Only Store Owners can reject queued refunds.' });
      }
      const result = await rejectRefund(id, ownerName || 'Store Owner');
      res.json(result);
    } catch (err: any) {
      res.status(400).json({ success: false, error: err?.message || 'Rejection failed' });
    }
  });

  // D. Users & Roles Management API
  apiRouter.get('/admin/users', async (req, res) => {
    try {
      const users = await getAllUsers();
      res.json({ success: true, users });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err?.message });
    }
  });

  apiRouter.post('/admin/users', async (req, res) => {
    try {
      const { name, email, password, phone, roleType } = req.body || {};
      if (!name || !email) {
        return res.status(400).json({ success: false, error: 'Name and email are required.' });
      }
      const result = await registerUser({ name, email, phone, roleType });
      res.json({ success: true, user: result.user, message: 'Staff member account created.' });
    } catch (err: any) {
      res.status(400).json({ success: false, error: err?.message || 'Failed to create user' });
    }
  });

  apiRouter.put('/admin/users/:id', async (req, res) => {
    try {
      const { id } = req.params;
      const updateData = req.body || {};
      const updated = await updateUserAdmin(id, updateData);
      res.json({ success: true, user: updated, message: 'User updated.' });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err?.message });
    }
  });

  apiRouter.put('/admin/users/:id/role', async (req, res) => {
    try {
      const { id } = req.params;
      const { role, roleType } = req.body || {};
      const updated = await updateUserRole(id, role, roleType);
      res.json({ success: true, user: updated, message: 'User role updated.' });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err?.message });
    }
  });

  apiRouter.delete('/admin/users/:id', async (req, res) => {
    try {
      const { id } = req.params;
      const result = await deleteUserAdmin(id);
      res.json(result);
    } catch (err: any) {
      res.status(400).json({ success: false, error: err?.message || 'Failed to remove user' });
    }
  });

  apiRouter.delete('/admin/orders/:orderId', async (req, res) => {
    try {
      const { orderId } = req.params;
      const result = await deleteOrderAdmin(orderId);
      res.json(result);
    } catch (err: any) {
      res.status(500).json({ success: false, error: err?.message });
    }
  });

  // E. Direct Cloud Firestore Database Hub & Operations API
  apiRouter.get('/admin/db/collections', async (req, res) => {
    try {
      const collections = await getDbCollectionsInfo();
      res.json({ success: true, collections });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err?.message });
    }
  });

  apiRouter.post('/admin/db/query', async (req, res) => {
    try {
      const { collection, filter, limit, skip, sort } = req.body || {};
      if (!collection) {
        return res.status(400).json({ success: false, error: 'Collection name is required.' });
      }
      const result = await queryDbCollection(collection, { filter, limit, skip, sort });
      res.json({ success: true, ...result });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err?.message });
    }
  });

  apiRouter.post('/admin/db/document', async (req, res) => {
    try {
      const { collection, document } = req.body || {};
      if (!collection || !document) {
        return res.status(400).json({ success: false, error: 'Collection name and document data are required.' });
      }
      const result = await insertDbDocument(collection, document);
      res.json(result);
    } catch (err: any) {
      res.status(500).json({ success: false, error: err?.message });
    }
  });

  apiRouter.put('/admin/db/document/:id', async (req, res) => {
    try {
      const { id } = req.params;
      const { collection, document } = req.body || {};
      if (!collection || !document) {
        return res.status(400).json({ success: false, error: 'Collection name and document data are required.' });
      }
      const result = await updateDbDocument(collection, id, document);
      res.json(result);
    } catch (err: any) {
      res.status(500).json({ success: false, error: err?.message });
    }
  });

  apiRouter.delete('/admin/db/document/:id', async (req, res) => {
    try {
      const { id } = req.params;
      const { collection } = req.body || {};
      if (!collection) {
        return res.status(400).json({ success: false, error: 'Collection name is required.' });
      }
      const result = await deleteDbDocument(collection, id);
      res.json(result);
    } catch (err: any) {
      res.status(500).json({ success: false, error: err?.message });
    }
  });

  apiRouter.get('/admin/db/export', async (req, res) => {
    try {
      const data = await exportDatabaseData();
      res.json({ success: true, data });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err?.message });
    }
  });

  apiRouter.post('/admin/db/seed', async (req, res) => {
    try {
      const result = await seedCatalogToDatabase();
      res.json(result);
    } catch (err: any) {
      res.status(500).json({ success: false, error: err?.message });
    }
  });

  // F. Clear All Mock / Test Data
  apiRouter.post('/admin/clear-mock-data', async (req, res) => {
    try {
      const result = await clearAllMockData();
      res.json(result);
    } catch (err: any) {
      res.status(500).json({ success: false, error: err?.message || 'Failed to clear mock data' });
    }
  });

  // Mount API router under both /api and root to handle Vercel URL path variations
  app.use('/api', apiRouter);
  app.use('/', apiRouter);

  // Global Error Handler for API routes
  app.use((err: any, req: any, res: any, next: any) => {
    console.error('[API Server Error]:', err);
    if (res.headersSent) {
      return next(err);
    }
    res.status(err?.status || 500).json({
      success: false,
      error: err?.message || 'Internal Server Error',
    });
  });

  return app;
}
