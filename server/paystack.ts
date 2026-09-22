import crypto from 'crypto';

interface PaystackInitParams {
  email: string;
  amount: number; // in kobo (e.g. 5000000 for ₦50,000)
  reference?: string;
  callbackUrl?: string;
  channels?: string[];
  metadata?: Record<string, any>;
}

interface PaystackInitResult {
  success: boolean;
  authorizationUrl?: string;
  accessCode?: string;
  reference: string;
  isSimulation?: boolean;
  message?: string;
}

interface PaystackVerifyResult {
  success: boolean;
  paid: boolean;
  status: string;
  amount?: number;
  currency?: string;
  channel?: string;
  gatewayResponse?: string;
  paidAt?: string;
  reference: string;
  customer?: {
    email: string;
    name?: string;
    phone?: string;
  };
  isSimulation?: boolean;
  error?: string;
}

let runtimePaystackSecretKey: string = '';
let runtimePaystackPublicKey: string = process.env.PAYSTACK_PUBLIC_KEY || process.env.VITE_PAYSTACK_PUBLIC_KEY || '';
let runtimePreferredMode: 'live' | 'test' = 'live';

export const DEFAULT_PAYSTACK_PUBLIC_KEY = process.env.PAYSTACK_PUBLIC_KEY || process.env.VITE_PAYSTACK_PUBLIC_KEY || '';

export function isPaystackConfigured(): boolean {
  const key = getPaystackSecretKey();
  return !!(key && key.trim() !== '' && key.startsWith('sk_'));
}

export function isPaystackLive(): boolean {
  const secret = getPaystackSecretKey();
  const pub = getPaystackPublicKey();
  if (secret.startsWith('sk_live_') || pub.startsWith('pk_live_')) return true;
  if (secret.startsWith('sk_test_') || pub.startsWith('pk_test_')) return false;
  return runtimePreferredMode === 'live';
}

export function isPaystackKeyMismatch(): boolean {
  const secret = getPaystackSecretKey();
  const pub = getPaystackPublicKey();
  if (!secret || !pub) return false;
  const isSecretLive = secret.startsWith('sk_live_');
  const isPubLive = pub.startsWith('pk_live_');
  return isSecretLive !== isPubLive;
}

export function getPaystackPublicKey(): string {
  return (
    runtimePaystackPublicKey ||
    process.env.PAYSTACK_PUBLIC_KEY ||
    DEFAULT_PAYSTACK_PUBLIC_KEY
  ).trim();
}

export function getPaystackSecretKey(): string {
  return (
    runtimePaystackSecretKey ||
    process.env.PAYSTACK_SECRET_KEY ||
    ''
  ).trim();
}

export function setRuntimePaystackKeys(secretKey?: string, publicKey?: string, mode?: 'live' | 'test') {
  if (secretKey !== undefined) runtimePaystackSecretKey = secretKey.trim();
  if (publicKey !== undefined) runtimePaystackPublicKey = publicKey.trim();
  if (mode !== undefined) runtimePreferredMode = mode;
}

export function getPaystackFullConfig() {
  const secretKey = getPaystackSecretKey();
  const publicKey = getPaystackPublicKey();
  const configured = isPaystackConfigured();
  const isLive = isPaystackLive();
  const isMismatch = isPaystackKeyMismatch();

  let message = 'Paystack Live Production Mode';
  if (isMismatch) {
    message = '⚠️ Warning: Key Mode Mismatch. One key is Live (sk_live/pk_live) and one is Test (sk_test/pk_test). Please use both Live keys for production.';
  } else if (isLive && configured) {
    message = 'Paystack Live Production Gateway Active';
  } else if (configured) {
    message = 'Paystack Test Mode Active (Switch to Live keys for real payments)';
  } else {
    message = 'Paystack Live Mode Ready — Paste your Live Secret & Public keys to process real payments.';
  }

  return {
    success: true,
    configured,
    isLive,
    isMismatch,
    mode: isLive ? 'live' : 'test',
    preferredMode: runtimePreferredMode,
    publicKey,
    hasSecretKey: Boolean(secretKey),
    secretKeyMasked: secretKey ? `${secretKey.substring(0, 7)}...${secretKey.substring(secretKey.length - 4)}` : '',
    maskedSecretKey: secretKey ? `${secretKey.substring(0, 7)}...${secretKey.substring(secretKey.length - 4)}` : '',
    message,
    supportedChannels: ['card', 'bank', 'ussd', 'qr', 'mobile_money', 'bank_transfer', 'eft'],
  };
}

/**
 * Initialize a Paystack transaction via the Paystack REST API
 * https://paystack.com/docs/api/transaction/#initialize
 */
export async function initializePaystackTransaction(params: PaystackInitParams): Promise<PaystackInitResult> {
  const secretKey = getPaystackSecretKey();
  const ref = params.reference || `blz_paystack_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;

  // If Paystack is not yet configured with a secret key
  if (!secretKey) {
    return {
      success: true,
      reference: ref,
      isSimulation: true,
      message: 'Paystack Secret Key is not configured. Utilizing client-side direct gateway.',
    };
  }

  try {
    const payload: any = {
      email: params.email,
      amount: Math.round(params.amount), // Must be in kobo (1 Naira = 100 kobo)
      reference: ref,
      currency: 'NGN',
      metadata: params.metadata || {},
    };

    if (params.callbackUrl) {
      payload.callback_url = params.callbackUrl;
    }

    if (params.channels && params.channels.length > 0) {
      payload.channels = params.channels;
    } else {
      payload.channels = ['card', 'bank', 'ussd', 'qr', 'mobile_money', 'bank_transfer', 'eft'];
    }

    console.log(`[Paystack API] Initializing transaction for ${params.email}, Amount: ₦${(params.amount / 100).toFixed(2)}, Ref: ${ref}`);

    const response = await fetch('https://api.paystack.co/transaction/initialize', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${secretKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    const data = (await response.json()) as any;

    if (data.status && data.data) {
      console.log(`[Paystack API] Initialized successfully. Auth URL: ${data.data.authorization_url}`);
      return {
        success: true,
        reference: data.data.reference || ref,
        authorizationUrl: data.data.authorization_url,
        accessCode: data.data.access_code,
        isSimulation: false,
      };
    } else {
      console.warn('[Paystack API Notice]:', data.message || 'Initialization fallback to client popup');
      return {
        success: false,
        reference: ref,
        isSimulation: true,
        message: data.message || 'Paystack server initialize notice',
      };
    }
  } catch (err: any) {
    console.warn('[Paystack Init Notice]:', err?.message || err);
    return {
      success: false,
      reference: ref,
      isSimulation: true,
      message: err?.message || 'Proceeding with client-side checkout',
    };
  }
}

/**
 * Verify a Paystack transaction status via reference
 * https://paystack.com/docs/api/transaction/#verify
 */
export async function verifyPaystackTransaction(reference: string): Promise<PaystackVerifyResult> {
  const secretKey = getPaystackSecretKey();

  if (!secretKey) {
    return {
      success: false,
      paid: false,
      status: 'unconfigured',
      reference,
      error: 'PAYSTACK_SECRET_KEY is required to verify transactions with Paystack.',
    };
  }

  try {
    console.log(`[Paystack API] Verifying transaction reference: ${reference}`);
    const response = await fetch(`https://api.paystack.co/transaction/verify/${encodeURIComponent(reference)}`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${secretKey}`,
        'Content-Type': 'application/json',
      },
    });

    const data = (await response.json()) as any;

    if (data.status && data.data) {
      const isPaid = data.data.status === 'success';
      console.log(`[Paystack API] Verification result for ${reference}: status=${data.data.status}, paid=${isPaid}, amount=₦${(data.data.amount / 100).toFixed(2)}`);
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
        customer: data.data.customer
          ? {
              email: data.data.customer.email,
              name: `${data.data.customer.first_name || ''} ${data.data.customer.last_name || ''}`.trim(),
              phone: data.data.customer.phone,
            }
          : undefined,
        isSimulation: false,
      };
    } else {
      return {
        success: false,
        paid: false,
        status: 'failed',
        reference,
        error: data.message || 'Transaction verification failed',
      };
    }
  } catch (err: any) {
    console.error('[Paystack Verify Error]:', err?.message || err);
    return {
      success: false,
      paid: false,
      status: 'error',
      reference,
      error: err?.message || 'Failed to verify transaction with Paystack',
    };
  }
}

/**
 * Verify Paystack webhook event HMAC SHA512 signature
 */
export function verifyPaystackWebhookSignature(bodyString: string, signature: string): boolean {
  const secretKey = getPaystackSecretKey();
  if (!secretKey || !signature) return false;

  const hash = crypto
    .createHmac('sha512', secretKey)
    .update(bodyString)
    .digest('hex');

  return hash === signature;
}
