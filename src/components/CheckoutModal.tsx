import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  CreditCard,
  CheckCircle2,
  Lock,
  ArrowRight,
  ShieldCheck,
  ShoppingBag,
  Banknote,
  Loader2,
  Zap,
  AlertCircle,
  ExternalLink,
  MessageSquare,
  ArrowLeft,
  MapPin,
  Truck,
  Phone,
  Save,
  Store,
  Clock,
} from 'lucide-react';
import { CartItem, User } from '../types';
import { api } from '../services/api';
import { formatNaira } from '../lib/currency';

declare global {
  interface Window {
    PaystackPop?: {
      setup: (options: {
        key: string;
        email: string;
        amount: number;
        currency?: string;
        ref?: string;
        channels?: string[];
        metadata?: any;
        callback?: (response: { reference: string; status?: string }) => void;
        onClose?: () => void;
      }) => {
        openIframe: () => void;
      };
      newTransaction?: (options: any) => void;
    };
  }
}

export const DEFAULT_PAYSTACK_PUBLIC_KEY = 'pk_live_62a83832cf627e85d9451840a50e74980ca562e0';

export const PICKUP_STATIONS = [
  {
    id: 'lekki',
    name: 'Lekki Flagship Store',
    address: '14 Admiralty Way, Lekki Phase 1, Lagos',
    time: 'Ready in 2 hours',
    hours: 'Mon - Sat: 9:00 AM - 7:00 PM',
  },
  {
    id: 'ikeja',
    name: 'Ikeja Tech Hub',
    address: '22 Allen Avenue, Ikeja, Lagos',
    time: 'Ready in 2 hours',
    hours: 'Mon - Sat: 9:00 AM - 7:00 PM',
  },
  {
    id: 'abuja',
    name: 'Abuja Central Branch',
    address: 'Aminu Kano Crescent, Wuse 2, Abuja',
    time: 'Ready next business day',
    hours: 'Mon - Fri: 9:00 AM - 6:00 PM',
  },
];

interface CheckoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  cart: CartItem[];
  currentUser?: User | null;
  onClearCart: () => void;
  onPlaceOrder?: (orderData: any) => Promise<any>;
  isDarkMode: boolean;
  onShowToast?: (msg: string) => void;
  onNavigateTab?: (tab: string) => void;
}

export const CheckoutModal: React.FC<CheckoutModalProps> = ({
  isOpen,
  onClose,
  cart,
  currentUser,
  onClearCart,
  onPlaceOrder,
  isDarkMode,
  onShowToast,
  onNavigateTab,
}) => {
  const modalScrollRef = useRef<HTMLDivElement>(null);
  const [step, setStep] = useState<'form' | 'processing' | 'success'>('form');
  const [activeTab, setActiveTab] = useState<'delivery' | 'payment'>('delivery');
  const [saveDeliveryInfo, setSaveDeliveryInfo] = useState<boolean>(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [orderId, setOrderId] = useState<string>(() => `NG-${Math.floor(100000 + Math.random() * 900000)}`);
  const [paymentStatusText, setPaymentStatusText] = useState<string>('');
  const [paystackPublicKey, setPaystackPublicKey] = useState<string>(() => import.meta.env.VITE_PAYSTACK_PUBLIC_KEY || '');
  const [paystackIsLive, setPaystackIsLive] = useState<boolean>(true);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [checkoutError, setCheckoutError] = useState<string | null>(null);
  const [fallbackPaymentUrl, setFallbackPaymentUrl] = useState<string | null>(null);

  // Form input state tailored for Nigerian customers
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    deliveryType: 'delivery' as 'delivery' | 'pickup',
    pickupStation: 'Lekki Flagship Store (14 Admiralty Way, Lekki Phase 1, Lagos)',
    address: '',
    city: 'Lagos',
    state: 'Lagos State',
    country: 'Nigeria',
    paymentMethod: 'paystack', // 'paystack' | 'card' | 'cod'
    cardNumber: '',
    cardExpiry: '',
    cardCvc: '',
  });

  // Nigerian phone number formatter (e.g. 0803 123 4567)
  const formatNigerianPhone = (raw: string): string => {
    const clean = raw.replace(/[^\d+]/g, '');
    if (clean.startsWith('0') && clean.length <= 11) {
      if (clean.length > 7) {
        return `${clean.slice(0, 4)} ${clean.slice(4, 7)} ${clean.slice(7)}`;
      } else if (clean.length > 4) {
        return `${clean.slice(0, 4)} ${clean.slice(4)}`;
      }
    }
    return clean;
  };

  // Ensure Paystack inline script is loaded into the browser
  const ensurePaystackSDK = (): Promise<boolean> => {
    return new Promise((resolve) => {
      if (typeof window !== 'undefined' && window.PaystackPop) {
        return resolve(true);
      }
      const existing = document.getElementById('paystack-inline-js') as HTMLScriptElement | null;
      if (existing) {
        if (window.PaystackPop) return resolve(true);
        // Polling loop in case script is in-flight
        let attempts = 0;
        const interval = setInterval(() => {
          attempts++;
          if (window.PaystackPop) {
            clearInterval(interval);
            resolve(true);
          } else if (attempts >= 15) {
            clearInterval(interval);
            resolve(false);
          }
        }, 100);
        return;
      }
      const script = document.createElement('script');
      script.id = 'paystack-inline-js';
      script.src = 'https://js.paystack.co/v1/inline.js';
      script.async = true;
      script.onload = () => resolve(Boolean(window.PaystackPop));
      script.onerror = () => resolve(false);
      document.body.appendChild(script);
    });
  };

  // Load Paystack public key & live status from server
  const refreshPaystackConfig = () => {
    api.getPaystackConfig().then((cfg) => {
      if (cfg?.publicKey) {
        setPaystackPublicKey(cfg.publicKey);
      }
      if (cfg?.isLive !== undefined) {
        setPaystackIsLive(Boolean(cfg.isLive));
      }
    });
  };

  useEffect(() => {
    ensurePaystackSDK();
    refreshPaystackConfig();
  }, []);

  useEffect(() => {
    if (isOpen) {
      setFormErrors({});
      setCheckoutError(null);
      setFallbackPaymentUrl(null);
      setActiveTab('delivery');
      refreshPaystackConfig();

      // Automatically restore saved delivery details for Nigerian customers
      try {
        const saved = localStorage.getItem('blazestore_saved_delivery');
        if (saved) {
          const parsed = JSON.parse(saved);
          setFormData((prev) => ({
            ...prev,
            name: parsed.name || (currentUser?.name || prev.name),
            email: parsed.email || (currentUser?.email || prev.email),
            phone: parsed.phone || (currentUser?.phone || prev.phone),
            address: parsed.address || prev.address,
            city: parsed.city || prev.city,
            state: parsed.state || prev.state,
            deliveryType: parsed.deliveryType || prev.deliveryType,
            pickupStation: parsed.pickupStation || prev.pickupStation,
          }));
        } else if (currentUser) {
          setFormData((prev) => ({
            ...prev,
            name: currentUser.name || prev.name,
            email: currentUser.email || prev.email,
            phone: currentUser.phone || prev.phone,
          }));
        }
      } catch {}
    }
  }, [isOpen, currentUser]);

  if (!isOpen) return null;

  // Pricing calculations in Naira (₦)
  const subtotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const discount = subtotal >= 80000 ? subtotal * 0.15 : subtotal >= 40000 ? subtotal * 0.1 : 0;

  // Store Pick Up is strictly ₦0.00 (FREE), otherwise dynamic state-based shipping
  let shipping = 0;
  if (formData.deliveryType === 'pickup') {
    shipping = 0;
  } else {
    const stateLower = (formData.state || '').toLowerCase();
    if (stateLower.includes('lagos')) {
      shipping = subtotal >= 50000 ? 0 : 2000;
    } else if (
      stateLower.includes('abuja') ||
      stateLower.includes('fct') ||
      stateLower.includes('ogun') ||
      stateLower.includes('oyo') ||
      stateLower.includes('edo')
    ) {
      shipping = subtotal >= 65000 ? 0 : 3500;
    } else {
      shipping = subtotal >= 80000 ? 0 : 4500;
    }
  }

  const vatTax = subtotal * 0.075; // Standard 7.5% Nigerian VAT
  const total = Math.max(0, subtotal - discount + shipping + vatTax);

  // Validate delivery fields explicitly based on chosen delivery method
  const validateDeliveryDetails = (): boolean => {
    const errors: Record<string, string> = {};
    if (!formData.name.trim()) {
      errors.name = 'Full name is required';
    }
    if (!formData.email.trim()) {
      errors.email = 'Email address is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email.trim())) {
      errors.email = 'Please enter a valid email address';
    }
    const cleanPhone = formData.phone.replace(/\D/g, '');
    if (!formData.phone.trim()) {
      errors.phone = 'Phone number is required';
    } else if (cleanPhone.length < 10) {
      errors.phone = 'Please enter a valid 11-digit Nigerian phone number';
    }

    if (formData.deliveryType === 'delivery') {
      if (!formData.address.trim()) {
        errors.address = 'Street address is required for doorstep courier delivery';
      }
      if (!formData.city.trim()) {
        errors.city = 'City is required';
      }
    } else {
      if (!formData.pickupStation) {
        errors.pickupStation = 'Please select a store pickup station';
      }
    }

    setFormErrors(errors);

    if (Object.keys(errors).length > 0) {
      setCheckoutError('Please complete all required contact and fulfillment details before continuing.');
      modalScrollRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
      if (onShowToast) onShowToast('⚠️ Please fill in all required fulfillment details.');
      return false;
    }

    setCheckoutError(null);
    return true;
  };

  // Full form validation before final payment trigger
  const validateForm = (): boolean => {
    if (!validateDeliveryDetails()) {
      setActiveTab('delivery');
      return false;
    }

    const errors: Record<string, string> = {};
    if (formData.paymentMethod === 'card') {
      const cleanNum = formData.cardNumber.replace(/\s+/g, '');
      if (cleanNum.length < 15) {
        errors.cardNumber = 'Please enter a valid 16-digit card number';
      }
      if (!formData.cardExpiry || formData.cardExpiry.length < 5) {
        errors.cardExpiry = 'MM/YY required';
      }
      if (!formData.cardCvc || formData.cardCvc.length < 3) {
        errors.cardCvc = 'CVV required';
      }
    }

    setFormErrors(errors);

    if (Object.keys(errors).length > 0) {
      setCheckoutError('Please complete the payment card information.');
      setActiveTab('payment');
      modalScrollRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
      if (onShowToast) onShowToast('⚠️ Please verify your card details.');
      return false;
    }

    setCheckoutError(null);
    return true;
  };

  // Format Card input
  const handleCardNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.replace(/\D/g, '').slice(0, 19);
    const formatted = val.replace(/(\d{4})(?=\d)/g, '$1 ');
    setFormData({ ...formData, cardNumber: formatted });
    if (formErrors.cardNumber) {
      setFormErrors((prev) => ({ ...prev, cardNumber: '' }));
    }
  };

  const handleExpiryChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let val = e.target.value.replace(/\D/g, '').slice(0, 4);
    if (val.length >= 3) {
      val = `${val.slice(0, 2)}/${val.slice(2, 4)}`;
    }
    setFormData({ ...formData, cardExpiry: val });
    if (formErrors.cardExpiry) {
      setFormErrors((prev) => ({ ...prev, cardExpiry: '' }));
    }
  };

  const finalizeOrder = async (
    ref: string,
    paymentMethodName: string,
    paymentStatus: 'paid' | 'pending' = 'paid',
    paystackData?: any
  ) => {
    const generatedId = `NG-${Date.now().toString().slice(-6)}`;
    let currentOrderId = generatedId;

    // Save delivery information for future convenience if user kept checkbox enabled
    if (saveDeliveryInfo) {
      try {
        localStorage.setItem(
          'blazestore_saved_delivery',
          JSON.stringify({
            name: formData.name,
            email: formData.email,
            phone: formData.phone,
            deliveryType: formData.deliveryType,
            pickupStation: formData.pickupStation,
            address: formData.address,
            city: formData.city,
            state: formData.state,
          })
        );
      } catch {}
    }

    if (onPlaceOrder) {
      const orderResult = await onPlaceOrder({
        customer: {
          name: formData.name,
          email: formData.email,
          phone: formData.phone,
          address: formData.deliveryType === 'pickup' ? `[STORE PICKUP] ${formData.pickupStation}` : formData.address,
          city: formData.deliveryType === 'pickup' ? 'Store Pickup' : formData.city,
          state: formData.deliveryType === 'pickup' ? 'Lagos / Abuja' : formData.state,
          country: formData.country,
        },
        deliveryType: formData.deliveryType,
        pickupStation: formData.deliveryType === 'pickup' ? formData.pickupStation : undefined,
        currency: 'NGN',
        currencySymbol: '₦',
        items: cart,
        subtotal,
        discount,
        shipping,
        tax: vatTax,
        total,
        paymentMethod: paymentMethodName,
        paymentStatus,
        paymentReference: ref,
        paystackData,
        userId: currentUser?.id || 'guest',
      });
      if (orderResult?.orderId) {
        currentOrderId = orderResult.orderId;
      }
    }

    setOrderId(currentOrderId);
    setStep('success');
    onClearCart();
    try {
      localStorage.removeItem('blazestore_pending_order');
    } catch {}

    if (onShowToast) {
      if (paymentStatus === 'paid') {
        onShowToast(`🎉 Order #${currentOrderId} confirmed!`);
      } else {
        onShowToast(`📋 Order #${currentOrderId} placed! Pay on delivery: ${formatNaira(total)}`);
      }
    }
  };

  const handleSubmit = async (e?: React.FormEvent | React.MouseEvent) => {
    if (e && typeof e.preventDefault === 'function') {
      e.preventDefault();
    }

    // Step 1: Explicit Form Validation
    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);
    setCheckoutError(null);
    setFallbackPaymentUrl(null);

    const reference = `blz_paystack_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const effectivePublicKey = (paystackPublicKey || DEFAULT_PAYSTACK_PUBLIC_KEY || '').trim();

    // Log complete payload to console as requested
    console.log('=== [Paystack Checkout Initiated] ===', {
      amount: total,
      amountInKobo: Math.round(total * 100),
      currency: 'NGN',
      email: formData.email,
      reference,
      key: effectivePublicKey,
      paymentMethod: formData.paymentMethod,
      customer: {
        name: formData.name,
        phone: formData.phone,
        address: formData.address,
        city: formData.city,
        state: formData.state,
      },
      sdkAvailable: Boolean(window.PaystackPop),
    });

    // Handle Pay on Delivery (Doorstep cash/POS)
    if (formData.paymentMethod === 'cod') {
      setStep('processing');
      setPaymentStatusText('Confirming your delivery details...');
      try {
        await new Promise((r) => setTimeout(r, 600));
        await finalizeOrder(reference, 'Pay on Delivery (COD)', 'pending');
      } catch (err: any) {
        console.error('COD order placement error:', err);
        await finalizeOrder(reference, 'Pay on Delivery (COD)', 'pending');
      } finally {
        setIsSubmitting(false);
      }
      return;
    }

    // Handle Electronic Paystack Payment Methods
    try {
      setStep('processing');
      setPaymentStatusText('Initializing secure payment...');

      let selectedChannels = ['card', 'bank', 'ussd', 'qr', 'mobile_money', 'bank_transfer', 'eft'];
      if (formData.paymentMethod === 'card') {
        selectedChannels = ['card'];
      }

      // Store pending order details in localStorage for redirect resilience
      try {
        localStorage.setItem(
          'blazestore_pending_order',
          JSON.stringify({
            reference,
            customer: formData,
            total,
            items: cart,
            date: new Date().toISOString(),
          })
        );
      } catch {}

      // 1. Initialize transaction with Paystack Backend
      console.log('Calling /api/paystack/initialize...');
      const initRes = await api.initializePaystack({
        email: formData.email || 'customer@blazestore.ng',
        amount: total,
        reference,
        channels: selectedChannels,
        callbackUrl: `${window.location.origin}/?paystack_ref=${reference}`,
        metadata: {
          customerName: formData.name,
          customerPhone: formData.phone,
          deliveryAddress: `${formData.address}, ${formData.city}, ${formData.state}`,
          paymentOption: formData.paymentMethod,
        },
      });

      console.log('=== [Paystack Backend Response] ===', initRes);

      if (initRes.authorizationUrl) {
        setFallbackPaymentUrl(initRes.authorizationUrl);
      }

      // 2. Launch Official Paystack Inline Popup or Hosted Page
      const sdkReady = await ensurePaystackSDK();
      console.log('Paystack SDK ready status:', { sdkReady, hasWindowPop: Boolean(window.PaystackPop) });

      if (window.PaystackPop && sdkReady) {
        setPaymentStatusText('Opening secure payment window...');

        console.log('=== [Calling window.PaystackPop.setup] ===', {
          key: effectivePublicKey,
          email: formData.email,
          amount: Math.round(total * 100),
          ref: initRes.reference || reference,
        });

        try {
          const handler = window.PaystackPop.setup({
            key: effectivePublicKey,
            email: formData.email || 'customer@blazestore.ng',
            amount: Math.round(total * 100), // amount in kobo
            currency: 'NGN',
            ref: initRes.reference || reference,
            channels: selectedChannels,
            metadata: {
              custom_fields: [
                { display_name: 'Customer Name', variable_name: 'customer_name', value: formData.name },
                { display_name: 'Phone', variable_name: 'customer_phone', value: formData.phone },
                { display_name: 'Delivery Address', variable_name: 'delivery_address', value: `${formData.address}, ${formData.city}, ${formData.state}` },
              ],
            },
            callback: async (response: { reference: string; status?: string }) => {
              console.log('Paystack payment callback received:', response);
              setStep('processing');
              setPaymentStatusText('Verifying transaction...');
              try {
                const verifyRes = await api.verifyPaystack(response.reference);
                if (verifyRes && verifyRes.paid) {
                  await finalizeOrder(response.reference, 'Paystack', 'paid', verifyRes);
                } else {
                  setStep('form');
                  const errMsg = verifyRes?.gatewayResponse || verifyRes?.error || 'Transaction was not completed.';
                  setCheckoutError(`Payment unsuccessful: ${errMsg}`);
                  if (onShowToast) onShowToast(`Payment unsuccessful: ${errMsg}`);
                }
              } catch (err: any) {
                console.warn('Verify error:', err);
                setStep('form');
                setCheckoutError('Payment verification failed. Please try again.');
                if (onShowToast) onShowToast('Payment verification failed. Please try again.');
              } finally {
                setIsSubmitting(false);
              }
            },
            onClose: () => {
              console.log('Paystack popup closed by user.');
              setIsSubmitting(false);
              setStep('form');
            },
          });

          handler.openIframe();
          return;
        } catch (popupErr: any) {
          console.warn('Paystack inline iframe launch error, falling back to hosted checkout:', popupErr);
          if (initRes.authorizationUrl) {
            setFallbackPaymentUrl(initRes.authorizationUrl);
            window.open(initRes.authorizationUrl, '_blank', 'noopener,noreferrer');
            setPaymentStatusText('Payment checkout opened in a new tab. After payment, click below to confirm.');
            setIsSubmitting(false);
            return;
          }
        }
      }

      // Fallback: If inline popup is not available or blocked in container, open in new tab (avoiding iframe X-Frame-Options break)
      if (initRes.authorizationUrl) {
        console.log('Opening Paystack checkout URL in new tab:', initRes.authorizationUrl);
        setFallbackPaymentUrl(initRes.authorizationUrl);
        window.open(initRes.authorizationUrl, '_blank', 'noopener,noreferrer');
        setPaymentStatusText('Payment checkout opened in a new tab. After payment, click below to confirm.');
        setIsSubmitting(false);
        return;
      }

      // If running with built-in instant authorization (e.g. initial setup)
      if (initRes.isSimulation) {
        setPaymentStatusText('Processing order...');
        await new Promise((r) => setTimeout(r, 600));
        await finalizeOrder(
          reference,
          formData.paymentMethod === 'card' ? 'Debit Card' : 'Online Payment',
          'paid',
          { isSimulation: true, reference }
        );
        return;
      }

      throw new Error(initRes.error || initRes.message || 'Unable to connect to payment gateway.');
    } catch (err: any) {
      console.error('Payment execution error:', err);
      const msg = err?.message || 'Unable to complete payment. Please try again or choose another payment method.';
      setCheckoutError(msg);
      if (onShowToast) onShowToast(msg);
      setIsSubmitting(false);
      setStep('form');
      return;
    }
  };

  const handleFinish = () => {
    onClose();
    setStep('form');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity"
        onClick={onClose}
      />

      {/* Modal Container */}
      <div
        ref={modalScrollRef}
        className={`relative z-10 w-full max-w-xl max-h-[90vh] overflow-y-auto rounded-3xl p-6 shadow-2xl transition-all border scrollbar-thin ${
          isDarkMode
            ? 'bg-[#18181B] text-[#EDEDF2] border-[#27272A]'
            : 'bg-white text-[#1F1F23] border-[#E2E8F0]'
        }`}
      >
        {step === 'form' ? (
          <>
            {/* Header */}
            <div className="flex items-center justify-between border-b border-[#CBD5E1] dark:border-[#27272A] pb-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#00C3F7]/15 text-[#00A4D6] dark:text-[#00C3F7]">
                  <Lock className="h-5 w-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-bold text-lg text-[#0F172A] dark:text-[#F8FAFC]">Secure Checkout</h3>
                    <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full bg-[#00C3F7]/10 text-[#00A4D6] dark:text-[#00C3F7]">
                      NGN • ₦
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-[11px] text-[#475569] dark:text-[#94A3B8]">
                    <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-medium">
                      <ShieldCheck className="h-3.5 w-3.5" /> 256-bit Encrypted
                    </span>
                    <span>•</span>
                    <span>Fast Delivery Across Nigeria</span>
                  </div>
                </div>
              </div>
              <button
                id="checkout-close-btn"
                onClick={onClose}
                className="p-2 rounded-xl text-[#64748B] dark:text-[#94A3B8] hover:bg-[#F1F5F9] dark:hover:bg-[#27272A] transition"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Error Alert Banner */}
            {checkoutError && (
              <div className="mt-4 flex items-start gap-2.5 rounded-2xl border border-red-200 dark:border-red-900/50 bg-red-50 dark:bg-red-950/30 p-3.5 text-xs text-red-700 dark:text-red-400 animate-in fade-in">
                <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="font-semibold">{checkoutError}</p>
                  {fallbackPaymentUrl && (
                    <a
                      href={fallbackPaymentUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-1.5 inline-flex items-center gap-1 text-xs font-bold text-[#00A4D6] dark:text-[#00C3F7] underline hover:opacity-80"
                    >
                      Click here to open Payment Page <ExternalLink className="h-3 w-3" />
                    </a>
                  )}
                </div>
              </div>
            )}

            {/* Step Navigation Tabs */}
            <div className="grid grid-cols-2 gap-2 mt-4 p-1 rounded-2xl bg-[#F1F5F9] dark:bg-[#202025] border border-[#E2E8F0] dark:border-[#2e2e36]">
              <button
                type="button"
                onClick={() => setActiveTab('delivery')}
                className={`flex items-center justify-center gap-2 py-2 px-3 rounded-xl text-xs font-bold transition cursor-pointer ${
                  activeTab === 'delivery'
                    ? 'bg-white dark:bg-[#2c2c34] text-[#00A4D6] dark:text-[#00C3F7] shadow-xs'
                    : 'text-[#64748B] dark:text-[#94A3B8] hover:text-[#0F172A] dark:hover:text-white'
                }`}
              >
                <MapPin className="h-3.5 w-3.5" />
                <span>1. Delivery Details</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  if (validateDeliveryDetails()) {
                    setActiveTab('payment');
                  }
                }}
                className={`flex items-center justify-center gap-2 py-2 px-3 rounded-xl text-xs font-bold transition cursor-pointer ${
                  activeTab === 'payment'
                    ? 'bg-white dark:bg-[#2c2c34] text-[#00A4D6] dark:text-[#00C3F7] shadow-xs'
                    : 'text-[#64748B] dark:text-[#94A3B8] hover:text-[#0F172A] dark:hover:text-white'
                }`}
              >
                <CreditCard className="h-3.5 w-3.5" />
                <span>2. Payment & Review</span>
              </button>
            </div>

            <form onSubmit={handleSubmit} noValidate className="mt-4 space-y-4">
              {/* STEP 1: Customer Contact & Delivery Info */}
              {activeTab === 'delivery' && (
                <div className="space-y-4 animate-in fade-in duration-200">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <Truck className="h-4 w-4 text-[#00A4D6] dark:text-[#00C3F7]" />
                      <h4 className="text-xs font-bold uppercase tracking-wider text-[#475569] dark:text-[#94A3B8]">
                        Fulfillment & Delivery
                      </h4>
                    </div>
                    {currentUser ? (
                      <span className="text-[11px] font-medium text-[#7C6FE0] bg-[#7C6FE0]/10 px-2.5 py-0.5 rounded-full">
                        {currentUser.name.split(' ')[0]}
                      </span>
                    ) : (
                      <span className="text-[10px] text-slate-500 dark:text-slate-400">
                        Guest Checkout
                      </span>
                    )}
                  </div>

                  {/* Delivery Method Selector: Courier Delivery vs Store Pick Up */}
                  <div className="space-y-2">
                    <label className="text-[11px] font-semibold text-[#1E293B] dark:text-[#E2E8F0] block">
                      Choose How You'd Like to Receive Your Order
                    </label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      {/* Option 1: Doorstep Delivery */}
                      <button
                        type="button"
                        onClick={() => setFormData((prev) => ({ ...prev, deliveryType: 'delivery' }))}
                        className={`relative flex items-start gap-3 p-3.5 rounded-2xl border text-left transition cursor-pointer ${
                          formData.deliveryType === 'delivery'
                            ? 'border-[#00C3F7] bg-[#00C3F7]/10 text-[#00A4D6] dark:text-[#00C3F7] shadow-sm'
                            : 'border-[#CBD5E1] dark:border-[#27272A] hover:bg-[#F8FAFC] dark:hover:bg-[#202025]'
                        }`}
                      >
                        <div className={`p-2 rounded-xl shrink-0 ${
                          formData.deliveryType === 'delivery'
                            ? 'bg-[#00C3F7] text-slate-950'
                            : 'bg-slate-100 dark:bg-[#27272A] text-slate-600 dark:text-slate-300'
                        }`}>
                          <Truck className="h-4 w-4" />
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span className="text-xs font-bold text-[#0F172A] dark:text-white">
                              Doorstep Delivery
                            </span>
                          </div>
                          <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5 leading-snug">
                            Direct courier to your home or office anywhere in Nigeria
                          </p>
                        </div>
                      </button>

                      {/* Option 2: Store Pick Up (FREE ₦0) */}
                      <button
                        type="button"
                        onClick={() => setFormData((prev) => ({ ...prev, deliveryType: 'pickup' }))}
                        className={`relative flex items-start gap-3 p-3.5 rounded-2xl border text-left transition cursor-pointer ${
                          formData.deliveryType === 'pickup'
                            ? 'border-emerald-500 bg-emerald-50/70 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-300 shadow-sm ring-1 ring-emerald-500/50'
                            : 'border-[#CBD5E1] dark:border-[#27272A] hover:bg-[#F8FAFC] dark:hover:bg-[#202025]'
                        }`}
                      >
                        <span className="absolute top-2 right-2 text-[9px] font-black uppercase px-2 py-0.5 rounded-full bg-emerald-500 text-slate-950 tracking-wide">
                          FREE ₦0
                        </span>
                        <div className={`p-2 rounded-xl shrink-0 ${
                          formData.deliveryType === 'pickup'
                            ? 'bg-emerald-500 text-slate-950'
                            : 'bg-slate-100 dark:bg-[#27272A] text-slate-600 dark:text-slate-300'
                        }`}>
                          <Store className="h-4 w-4" />
                        </div>
                        <div className="min-w-0 pr-12">
                          <div className="flex items-center gap-1.5">
                            <span className="text-xs font-bold text-[#0F172A] dark:text-white">
                              Store Pick Up
                            </span>
                          </div>
                          <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5 leading-snug">
                            Collect at Lagos or Abuja stores for zero delivery charge
                          </p>
                        </div>
                      </button>
                    </div>
                  </div>

                  {/* Pick Up Stations Section (Shown when Pick Up is selected) */}
                  {formData.deliveryType === 'pickup' && (
                    <div className="rounded-2xl border border-emerald-200 dark:border-emerald-900/40 bg-emerald-50/40 dark:bg-emerald-950/20 p-3.5 space-y-3 animate-in fade-in">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-emerald-900 dark:text-emerald-300 flex items-center gap-1.5">
                          <Store className="h-3.5 w-3.5 text-emerald-600" />
                          Select Pick Up Station (Free ₦0):
                        </span>
                        <span className="text-[10px] font-bold text-emerald-700 dark:text-emerald-400 bg-emerald-100 dark:bg-emerald-900/50 px-2 py-0.5 rounded-full">
                          ₦0 Delivery Fee
                        </span>
                      </div>

                      <div className="space-y-2">
                        {PICKUP_STATIONS.map((station) => (
                          <label
                            key={station.id}
                            className={`flex items-start gap-3 p-3 rounded-xl border transition cursor-pointer select-none ${
                              formData.pickupStation === `${station.name} (${station.address})`
                                ? 'border-emerald-500 bg-white dark:bg-[#1E1E24] shadow-xs'
                                : 'border-emerald-100 dark:border-emerald-900/30 bg-white/70 dark:bg-[#1E1E24]/50 hover:bg-white dark:hover:bg-[#1E1E24]'
                            }`}
                          >
                            <input
                              type="radio"
                              name="pickupStation"
                              checked={formData.pickupStation === `${station.name} (${station.address})`}
                              onChange={() =>
                                setFormData((prev) => ({
                                  ...prev,
                                  pickupStation: `${station.name} (${station.address})`,
                                }))
                              }
                              className="mt-1 text-emerald-600 focus:ring-emerald-500 h-3.5 w-3.5"
                            />
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center justify-between">
                                <span className="text-xs font-bold text-[#0F172A] dark:text-white">
                                  {station.name}
                                </span>
                                <span className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                                  <Clock className="h-3 w-3" />
                                  {station.time}
                                </span>
                              </div>
                              <p className="text-[11px] text-slate-600 dark:text-slate-300 mt-0.5">
                                {station.address}
                              </p>
                              <p className="text-[10px] text-slate-400 mt-0.5">
                                Operating Hours: {station.hours}
                              </p>
                            </div>
                          </label>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Customer Contact Information */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    <div>
                      <label className="text-[11px] font-semibold text-[#1E293B] dark:text-[#E2E8F0] block mb-1">
                        Full Name *
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. Azeta Blessing"
                        value={formData.name}
                        onChange={(e) => {
                          setFormData({ ...formData, name: e.target.value });
                          if (formErrors.name) setFormErrors((prev) => ({ ...prev, name: '' }));
                        }}
                        className={`w-full rounded-xl border px-3.5 py-2.5 text-xs font-medium text-[#0F172A] dark:text-[#F8FAFC] placeholder:text-[#94A3B8] focus:outline-none focus:ring-2 focus:ring-[#00C3F7] ${
                          formErrors.name
                            ? 'border-red-500 bg-red-50/50 dark:bg-red-950/20'
                            : 'border-[#CBD5E1] dark:border-[#334155] bg-white dark:bg-[#27272A]'
                        }`}
                      />
                      {formErrors.name && (
                        <p className="mt-1 text-[10px] font-medium text-red-500">{formErrors.name}</p>
                      )}
                    </div>
                    <div>
                      <label className="text-[11px] font-semibold text-[#1E293B] dark:text-[#E2E8F0] block mb-1">
                        Email Address *
                      </label>
                      <input
                        type="email"
                        placeholder="e.g. name@example.com"
                        value={formData.email}
                        onChange={(e) => {
                          setFormData({ ...formData, email: e.target.value });
                          if (formErrors.email) setFormErrors((prev) => ({ ...prev, email: '' }));
                        }}
                        className={`w-full rounded-xl border px-3.5 py-2.5 text-xs font-medium text-[#0F172A] dark:text-[#F8FAFC] placeholder:text-[#94A3B8] focus:outline-none focus:ring-2 focus:ring-[#00C3F7] ${
                          formErrors.email
                            ? 'border-red-500 bg-red-50/50 dark:bg-red-950/20'
                            : 'border-[#CBD5E1] dark:border-[#334155] bg-white dark:bg-[#27272A]'
                        }`}
                      />
                      {formErrors.email && (
                        <p className="mt-1 text-[10px] font-medium text-red-500">{formErrors.email}</p>
                      )}
                    </div>
                  </div>

                  {/* Phone number always required */}
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-[11px] font-semibold text-[#1E293B] dark:text-[#E2E8F0]">
                        Phone Number (for SMS & WhatsApp order updates) *
                      </label>
                      <span className="text-[10px] font-bold text-slate-500">🇳🇬 +234</span>
                    </div>
                    <input
                      type="tel"
                      placeholder="0803 123 4567"
                      value={formData.phone}
                      onChange={(e) => {
                        const formatted = formatNigerianPhone(e.target.value);
                        setFormData({ ...formData, phone: formatted });
                        if (formErrors.phone) setFormErrors((prev) => ({ ...prev, phone: '' }));
                      }}
                      className={`w-full rounded-xl border px-3.5 py-2.5 text-xs font-medium text-[#0F172A] dark:text-[#F8FAFC] placeholder:text-[#94A3B8] focus:outline-none focus:ring-2 focus:ring-[#00C3F7] ${
                        formErrors.phone
                          ? 'border-red-500 bg-red-50/50 dark:bg-red-950/20'
                          : 'border-[#CBD5E1] dark:border-[#334155] bg-white dark:bg-[#27272A]'
                      }`}
                    />
                    {formErrors.phone && (
                      <p className="mt-1 text-[10px] font-medium text-red-500">{formErrors.phone}</p>
                    )}
                  </div>

                  {/* Doorstep Delivery Address Fields (Shown ONLY when Doorstep Delivery is chosen) */}
                  {formData.deliveryType === 'delivery' && (
                    <div className="space-y-2.5 animate-in fade-in">
                      <div>
                        <label className="text-[11px] font-semibold text-[#1E293B] dark:text-[#E2E8F0] block mb-1">
                          Street Address *
                        </label>
                        <input
                          type="text"
                          placeholder="e.g. 14 Admiralty Way, Lekki Phase 1"
                          value={formData.address}
                          onChange={(e) => {
                            setFormData({ ...formData, address: e.target.value });
                            if (formErrors.address) setFormErrors((prev) => ({ ...prev, address: '' }));
                          }}
                          className={`w-full rounded-xl border px-3.5 py-2.5 text-xs font-medium text-[#0F172A] dark:text-[#F8FAFC] placeholder:text-[#94A3B8] focus:outline-none focus:ring-2 focus:ring-[#00C3F7] ${
                            formErrors.address
                              ? 'border-red-500 bg-red-50/50 dark:bg-red-950/20'
                              : 'border-[#CBD5E1] dark:border-[#334155] bg-white dark:bg-[#27272A]'
                          }`}
                        />
                        {formErrors.address && (
                          <p className="mt-1 text-[10px] font-medium text-red-500">{formErrors.address}</p>
                        )}
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                        <div>
                          <label className="text-[11px] font-semibold text-[#1E293B] dark:text-[#E2E8F0] block mb-1">
                            City *
                          </label>
                          <input
                            type="text"
                            placeholder="e.g. Ikeja / Lekki / Victoria Island"
                            value={formData.city}
                            onChange={(e) => {
                              setFormData({ ...formData, city: e.target.value });
                              if (formErrors.city) setFormErrors((prev) => ({ ...prev, city: '' }));
                            }}
                            className={`w-full rounded-xl border px-3 py-2.5 text-xs font-medium text-[#0F172A] dark:text-[#F8FAFC] placeholder:text-[#94A3B8] focus:outline-none focus:ring-2 focus:ring-[#00C3F7] ${
                              formErrors.city
                                ? 'border-red-500 bg-red-50/50 dark:bg-red-950/20'
                                : 'border-[#CBD5E1] dark:border-[#334155] bg-white dark:bg-[#27272A]'
                            }`}
                          />
                          {formErrors.city && (
                            <p className="mt-1 text-[10px] font-medium text-red-500">{formErrors.city}</p>
                          )}
                        </div>
                        <div>
                          <label className="text-[11px] font-semibold text-[#1E293B] dark:text-[#E2E8F0] block mb-1">
                            State *
                          </label>
                          <select
                            value={formData.state}
                            onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                            className="w-full rounded-xl border border-[#CBD5E1] dark:border-[#334155] bg-white dark:bg-[#27272A] px-2 py-2.5 text-xs font-medium text-[#0F172A] dark:text-[#F8FAFC] focus:outline-none focus:ring-2 focus:ring-[#00C3F7]"
                          >
                            <option value="Lagos State">Lagos (₦2,000 / Free over ₦50k)</option>
                            <option value="Abuja (FCT)">Abuja (FCT) (₦3,500 / Free over ₦65k)</option>
                            <option value="Ogun State">Ogun (₦3,500 / Free over ₦65k)</option>
                            <option value="Oyo State">Oyo (₦3,500 / Free over ₦65k)</option>
                            <option value="Edo State">Edo (₦3,500 / Free over ₦65k)</option>
                            <option value="Rivers State">Rivers (₦4,500 / Free over ₦80k)</option>
                            <option value="Delta State">Delta (₦4,500 / Free over ₦80k)</option>
                            <option value="Kano State">Kano (₦4,500 / Free over ₦80k)</option>
                            <option value="Enugu State">Enugu (₦4,500 / Free over ₦80k)</option>
                            <option value="Anambra State">Anambra (₦4,500 / Free over ₦80k)</option>
                            <option value="Kaduna State">Kaduna (₦4,500 / Free over ₦80k)</option>
                            <option value="Other Nigerian State">Other Nigerian State (₦4,500)</option>
                          </select>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Save address checkbox */}
                  <label className="flex items-center gap-2 pt-1 cursor-pointer select-none text-xs text-[#475569] dark:text-[#94A3B8]">
                    <input
                      type="checkbox"
                      checked={saveDeliveryInfo}
                      onChange={(e) => setSaveDeliveryInfo(e.target.checked)}
                      className="rounded text-[#00C3F7] focus:ring-[#00C3F7] h-4 w-4"
                    />
                    <span className="flex items-center gap-1">
                      <Save className="h-3 w-3 text-slate-400" />
                      Save details for my next order
                    </span>
                  </label>

                  {/* Quick summary before moving to payment */}
                  <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 dark:bg-[#202025] border border-slate-200 dark:border-[#2e2e36] text-xs">
                    <div>
                      <span className="text-[#64748B] dark:text-[#94A3B8] block text-[11px]">
                        Fulfillment: {formData.deliveryType === 'pickup' ? 'Store Pick Up (₦0 Free)' : 'Doorstep Courier'}
                      </span>
                      <span className="font-bold text-[#0F172A] dark:text-white text-sm">
                        Total: {formatNaira(total)}
                      </span>
                    </div>
                    {formData.deliveryType === 'pickup' ? (
                      <span className="px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 font-bold text-xs">
                        Pick Up Free ₦0
                      </span>
                    ) : (
                      <span className="text-xs font-semibold text-slate-500">
                        {shipping === 0 ? 'Free Shipping' : `Shipping: ${formatNaira(shipping)}`}
                      </span>
                    )}
                  </div>

                  {/* Continue Button */}
                  <button
                    type="button"
                    onClick={() => {
                      if (validateDeliveryDetails()) {
                        setActiveTab('payment');
                      }
                    }}
                    className="w-full flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-[#00C3F7] to-[#008BB4] text-slate-950 hover:opacity-95 py-3.5 text-xs font-bold shadow-md shadow-[#00C3F7]/20 transition cursor-pointer"
                  >
                    <span>Proceed to Payment & Review</span>
                    <ArrowRight className="h-4 w-4" />
                  </button>
                </div>
              )}

              {/* STEP 2: Payment Method & Order Review */}
              {activeTab === 'payment' && (
                <div className="space-y-3.5 animate-in fade-in duration-200">
                  {/* Delivery destination summary pill with Edit button */}
                  <div className="flex items-center justify-between rounded-2xl p-3 bg-[#00C3F7]/5 dark:bg-[#00C3F7]/10 border border-[#00C3F7]/20 text-xs">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="p-2 rounded-xl bg-[#00C3F7]/15 text-[#00A4D6] dark:text-[#00C3F7] shrink-0">
                        {formData.deliveryType === 'pickup' ? (
                          <Store className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                        ) : (
                          <MapPin className="h-4 w-4" />
                        )}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="font-bold text-[#0F172A] dark:text-[#F8FAFC] truncate">
                            {formData.name || 'Recipient'} • {formData.phone}
                          </p>
                          {formData.deliveryType === 'pickup' && (
                            <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-600 dark:text-emerald-400">
                              Store Pick Up (₦0)
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-[#475569] dark:text-[#94A3B8] truncate mt-0.5">
                          {formData.deliveryType === 'pickup'
                            ? `Station: ${formData.pickupStation}`
                            : `${formData.address}, ${formData.city}, ${formData.state}`}
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setActiveTab('delivery')}
                      className="text-xs font-bold text-[#00A4D6] dark:text-[#00C3F7] hover:underline shrink-0 ml-2 cursor-pointer"
                    >
                      Change
                    </button>
                  </div>

                  {/* Payment Method Selector */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <h4 className="text-xs font-bold uppercase tracking-wider text-[#475569] dark:text-[#94A3B8]">
                        Choose Payment Method
                      </h4>
                      {paystackIsLive && (
                        <span className="flex items-center gap-1 text-[10px] font-bold text-emerald-600 dark:text-emerald-400">
                          <ShieldCheck className="h-3 w-3" /> Live Mode Active
                        </span>
                      )}
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                      {[
                        {
                          id: 'paystack',
                          label: 'Pay with Paystack',
                          sub: 'Cards, Transfer, USSD, Apple Pay',
                          icon: Zap,
                          badge: paystackIsLive ? 'Live' : 'Popular',
                        },
                        { id: 'card', label: 'Debit / Credit Card', sub: 'Mastercard, VISA, Verve', icon: CreditCard },
                        {
                          id: 'cod',
                          label: formData.deliveryType === 'pickup' ? 'Pay at Pick Up' : 'Pay on Delivery',
                          sub: formData.deliveryType === 'pickup' ? 'POS / Cash at store' : 'Cash / POS on arrival',
                          icon: Banknote,
                        },
                      ].map((p) => (
                        <button
                          key={p.id}
                          type="button"
                          onClick={() => setFormData({ ...formData, paymentMethod: p.id })}
                          className={`relative flex flex-col items-center justify-center rounded-2xl p-3 border text-xs font-semibold transition text-center cursor-pointer ${
                            formData.paymentMethod === p.id
                              ? 'border-[#00C3F7] bg-[#00C3F7]/10 text-[#00A4D6] dark:text-[#00C3F7] shadow-sm'
                              : 'border-[#CBD5E1] dark:border-[#27272A] text-[#475569] dark:text-[#94A3B8] hover:bg-[#F8FAFC] dark:hover:bg-[#27272A]'
                          }`}
                        >
                          {p.badge && (
                            <span className="absolute top-1.5 right-1.5 text-[8px] font-bold uppercase px-1.5 py-0.5 rounded-full bg-[#00C3F7] text-slate-950">
                              {p.badge}
                            </span>
                          )}
                          <p.icon className="h-4 w-4 mb-1 mt-0.5" />
                          <span className="text-[11px] leading-tight font-bold">{p.label}</span>
                          <span className="text-[9px] text-slate-500 font-normal mt-0.5">{p.sub}</span>
                        </button>
                      ))}
                    </div>

                    {/* Inline Card Details if user selects Card */}
                    {formData.paymentMethod === 'card' && (
                      <div className="rounded-2xl border border-[#CBD5E1] dark:border-[#334155] bg-[#F8FAFC] dark:bg-[#27272A]/70 p-3.5 space-y-3 animate-in fade-in duration-200">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-semibold text-[#1E293B] dark:text-[#E2E8F0]">Card Details</span>
                          <div className="flex items-center gap-1.5">
                            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300">VERVE</span>
                            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300">VISA</span>
                            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-orange-100 text-orange-800 dark:bg-orange-900/40 dark:text-orange-300">MASTERCARD</span>
                          </div>
                        </div>

                        <div>
                          <input
                            type="text"
                            placeholder="Card Number (e.g. 5399 4100 0000 0000)"
                            value={formData.cardNumber}
                            onChange={handleCardNumberChange}
                            className={`w-full rounded-xl border px-3.5 py-2 text-xs font-mono font-medium text-[#0F172A] dark:text-[#F8FAFC] placeholder:text-[#94A3B8] focus:outline-none focus:ring-2 focus:ring-[#00C3F7] ${
                              formErrors.cardNumber
                                ? 'border-red-500 bg-red-50/50 dark:bg-red-950/20'
                                : 'border-[#CBD5E1] dark:border-[#475569] bg-white dark:bg-[#1E1E24]'
                            }`}
                          />
                          {formErrors.cardNumber && (
                            <p className="mt-1 text-[10px] text-red-500">{formErrors.cardNumber}</p>
                          )}
                        </div>

                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <input
                              type="text"
                              placeholder="MM / YY"
                              value={formData.cardExpiry}
                              onChange={handleExpiryChange}
                              className={`w-full rounded-xl border px-3.5 py-2 text-xs font-mono font-medium text-[#0F172A] dark:text-[#F8FAFC] placeholder:text-[#94A3B8] focus:outline-none focus:ring-2 focus:ring-[#00C3F7] ${
                                formErrors.cardExpiry
                                  ? 'border-red-500 bg-red-50/50 dark:bg-red-950/20'
                                  : 'border-[#CBD5E1] dark:border-[#475569] bg-white dark:bg-[#1E1E24]'
                              }`}
                            />
                            {formErrors.cardExpiry && (
                              <p className="mt-1 text-[10px] text-red-500">{formErrors.cardExpiry}</p>
                            )}
                          </div>
                          <div>
                            <input
                              type="password"
                              maxLength={4}
                              placeholder="CVV"
                              value={formData.cardCvc}
                              onChange={(e) => {
                                setFormData({ ...formData, cardCvc: e.target.value.replace(/\D/g, '').slice(0, 4) });
                                if (formErrors.cardCvc) setFormErrors((prev) => ({ ...prev, cardCvc: '' }));
                              }}
                              className={`w-full rounded-xl border px-3.5 py-2 text-xs font-mono font-medium text-[#0F172A] dark:text-[#F8FAFC] placeholder:text-[#94A3B8] focus:outline-none focus:ring-2 focus:ring-[#00C3F7] ${
                                formErrors.cardCvc
                                  ? 'border-red-500 bg-red-50/50 dark:bg-red-950/20'
                                  : 'border-[#CBD5E1] dark:border-[#475569] bg-white dark:bg-[#1E1E24]'
                              }`}
                            />
                            {formErrors.cardCvc && (
                              <p className="mt-1 text-[10px] text-red-500">{formErrors.cardCvc}</p>
                            )}
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Pay on Delivery info */}
                    {formData.paymentMethod === 'cod' && (
                      <div className="rounded-2xl border border-amber-200 dark:border-amber-900/40 bg-amber-50/60 dark:bg-amber-950/20 p-3.5 text-xs space-y-1.5 animate-in fade-in">
                        <div className="flex items-center gap-2 font-semibold text-amber-900 dark:text-amber-300">
                          <Banknote className="h-4 w-4 text-amber-600" />
                          <span>
                            {formData.deliveryType === 'pickup'
                              ? 'Pay upon collecting at Store'
                              : 'Pay when your order arrives'}
                          </span>
                        </div>
                        <p className="text-[11px] text-amber-800 dark:text-amber-400">
                          {formData.deliveryType === 'pickup'
                            ? `You can pay via Cash, POS, or Bank Transfer directly when picking up your package at our station.`
                            : `You can pay via Cash or POS with the delivery rider upon arrival in ${formData.city || 'your location'}.`}
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Order total & Breakdown in Naira */}
                  <div className="rounded-2xl bg-[#F8FAFC] dark:bg-[#27272A] p-4 text-xs space-y-2 border border-[#CBD5E1] dark:border-[#333]">
                    <div className="flex justify-between text-[#475569] dark:text-[#94A3B8] font-medium">
                      <span>Items Subtotal ({cart.length})</span>
                      <span className="font-bold text-[#0F172A] dark:text-white">{formatNaira(subtotal)}</span>
                    </div>
                    {discount > 0 && (
                      <div className="flex justify-between text-[#DC2626] font-medium">
                        <span>Discount</span>
                        <span className="font-bold">-{formatNaira(discount)}</span>
                      </div>
                    )}
                    <div className="flex justify-between text-[#475569] dark:text-[#94A3B8] font-medium">
                      <span>VAT (7.5%)</span>
                      <span className="font-bold text-[#0F172A] dark:text-white">{formatNaira(vatTax)}</span>
                    </div>
                    <div className="flex justify-between text-[#475569] dark:text-[#94A3B8] font-medium">
                      <span>Fulfillment & Delivery</span>
                      {formData.deliveryType === 'pickup' ? (
                        <span className="text-emerald-600 dark:text-emerald-400 font-bold flex items-center gap-1">
                          <Store className="h-3 w-3" />
                          ₦0 (Store Pick Up)
                        </span>
                      ) : (
                        <span className="text-[#16A34A] font-bold">
                          {shipping === 0 ? 'FREE' : formatNaira(shipping)}
                        </span>
                      )}
                    </div>
                    <div className="flex justify-between font-bold text-base text-[#0F172A] dark:text-white pt-2 border-t border-[#CBD5E1] dark:border-[#333]">
                      <span>Total</span>
                      <span className="text-[#00A4D6] dark:text-[#00C3F7] font-black text-xl">{formatNaira(total)}</span>
                    </div>
                  </div>

                  {/* Action Buttons: Back + Submit Payment */}
                  <div className="flex items-center gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => setActiveTab('delivery')}
                      className="flex items-center justify-center gap-1.5 rounded-2xl border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 py-3.5 px-4 text-xs font-bold transition cursor-pointer"
                    >
                      <ArrowLeft className="h-4 w-4" />
                      <span>Back</span>
                    </button>
                    <button
                      type="submit"
                      id="confirm-checkout-btn"
                      onClick={handleSubmit}
                      disabled={isSubmitting}
                      className="flex-1 flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-[#00C3F7] to-[#008BB4] text-slate-950 hover:opacity-95 py-3.5 text-xs font-bold shadow-lg shadow-[#00C3F7]/25 transition active:scale-98 disabled:opacity-50 cursor-pointer"
                    >
                      {isSubmitting ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" />
                          <span>Processing Payment...</span>
                        </>
                      ) : (
                        <>
                          <Lock className="h-4 w-4" />
                          <span>
                            {formData.paymentMethod === 'cod'
                              ? formData.deliveryType === 'pickup'
                                ? `Reserve for Pick Up (${formatNaira(total)})`
                                : `Place Order (${formatNaira(total)})`
                              : `Pay ${formatNaira(total)}`}
                          </span>
                          <ArrowRight className="h-4 w-4 ml-1" />
                        </>
                      )}
                    </button>
                  </div>
                </div>
              )}
            </form>
          </>
        ) : step === 'processing' ? (
          /* Payment Processing Spinner Screen */
          <div className="py-12 text-center space-y-5 animate-in fade-in">
            <div className="relative mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-[#00C3F7]/15 text-[#00A4D6] dark:text-[#00C3F7]">
              <Loader2 className="h-10 w-10 animate-spin" />
            </div>
            <div>
              <h3 className="text-xl font-bold">Processing Order</h3>
              <p className="mt-2 text-xs font-medium text-slate-500 dark:text-slate-400">
                {paymentStatusText}
              </p>
            </div>
            {fallbackPaymentUrl && (
              <div className="pt-2">
                <a
                  href={fallbackPaymentUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#00C3F7] text-slate-950 text-xs font-bold shadow hover:bg-[#00B4E6] transition"
                >
                  <span>Click here to complete payment</span>
                  <ExternalLink className="h-3.5 w-3.5" />
                </a>
              </div>
            )}
            <div className="flex items-center justify-center gap-2 text-xs text-emerald-600 dark:text-emerald-400 font-medium">
              <ShieldCheck className="h-4 w-4" />
              <span>Safe & Secure Checkout</span>
            </div>
          </div>
        ) : (
          /* Order & Payment Confirmation Step */
          <div className="py-6 text-center space-y-4 animate-in fade-in">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-[#E3F2DD] text-[#4CAF50] shadow-sm animate-bounce">
              <CheckCircle2 className="h-10 w-10" />
            </div>

            <div>
              <span className="inline-block rounded-full bg-[#E3F2DD] px-3.5 py-1 text-xs font-bold text-[#2E7D32]">
                Order Confirmed • #{orderId}
              </span>
              <h3 className="mt-2 text-2xl font-bold">Thank you, {formData.name || 'Valued Customer'}!</h3>
              <p className="mt-1 text-xs text-[#8A8A94] max-w-sm mx-auto">
                Your order of <strong className="text-slate-900 dark:text-white">{formatNaira(total)}</strong> has been placed. A confirmation email has been sent to{' '}
                <span className="font-semibold text-[#1F1F23] dark:text-white">
                  {formData.email}
                </span>
                .
              </p>
            </div>

            <div className="rounded-2xl border border-[#EDEDF2] dark:border-[#27272A] p-4 text-left text-xs space-y-2.5 bg-[#FAF9FC] dark:bg-[#27272A]">
              {formData.deliveryType === 'pickup' ? (
                <>
                  <div className="flex items-center justify-between font-semibold">
                    <span className="flex items-center gap-1.5 text-emerald-700 dark:text-emerald-400">
                      <Store className="h-4 w-4" /> Store Pick Up (Free ₦0)
                    </span>
                    <span className="text-emerald-600 dark:text-emerald-400 font-bold">Ready within 2 hrs</span>
                  </div>
                  <div className="text-[#8A8A94]">
                    Station Location:{' '}
                    <span className="text-[#1F1F23] dark:text-white font-medium">
                      {formData.pickupStation}
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-500 bg-slate-100 dark:bg-[#1E1E24] p-2.5 rounded-xl">
                    💡 Please present order number <strong>#{orderId}</strong> and your phone number when collecting your package at the store.
                  </div>
                </>
              ) : (
                <>
                  <div className="flex items-center justify-between font-semibold">
                    <span>Estimated Delivery</span>
                    <span className="text-[#4CAF50] font-bold">1 - 2 Business Days</span>
                  </div>
                  <div className="text-[#8A8A94]">
                    Delivery Address:{' '}
                    <span className="text-[#1F1F23] dark:text-white font-medium">
                      {formData.address || 'Address provided'}, {formData.city || 'Lagos'}, {formData.state}
                    </span>
                  </div>
                </>
              )}
              <div className="flex items-center justify-between pt-1 border-t border-slate-200 dark:border-[#333]">
                <span className="text-slate-500">Payment</span>
                <span className="font-semibold text-slate-800 dark:text-slate-200">
                  {formData.paymentMethod === 'cod'
                    ? formData.deliveryType === 'pickup'
                      ? 'Pay at Store Pickup'
                      : 'Pay on Delivery'
                    : 'Online Payment'}
                </span>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-2.5 pt-2">
              <button
                onClick={() => {
                  onClose();
                  setStep('form');
                  if (onNavigateTab) {
                    onNavigateTab('orders');
                  }
                }}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-2xl bg-[#7C6FE0] hover:bg-[#6D60D6] text-white px-5 py-3 text-xs font-bold shadow-md transition cursor-pointer"
              >
                <Truck className="h-4 w-4" />
                <span>Track in My Orders</span>
              </button>
              <a
                href={`https://wa.me/2348078753111?text=${encodeURIComponent(
                  formData.deliveryType === 'pickup'
                    ? `Hello BlazeStore! I just placed order #${orderId} for ${formatNaira(total)} for Store Pick Up at ${formData.pickupStation}. Customer: ${formData.name || 'Customer'} (${formData.phone}). Please confirm when my package is ready.`
                    : `Hello BlazeStore! I just placed order #${orderId} for ${formatNaira(total)} (Doorstep Delivery to: ${formData.address}, ${formData.city}, ${formData.state}). Recipient: ${formData.name || 'Customer'} (${formData.phone}). Please confirm my order.`
                )}`}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-2xl bg-[#25D366] hover:bg-[#20bd5a] text-white px-5 py-3 text-xs font-bold shadow-md transition cursor-pointer"
              >
                <MessageSquare className="h-4 w-4" />
                <span>WhatsApp</span>
              </a>
              <button
                onClick={handleFinish}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-2xl bg-[#00C3F7] hover:bg-[#00B4E6] text-slate-950 px-5 py-3 text-xs font-bold shadow-md transition cursor-pointer"
              >
                <ShoppingBag className="h-4 w-4" />
                <span>Continue Shopping</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

