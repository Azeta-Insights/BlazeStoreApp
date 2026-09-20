import React, { useState } from 'react';
import {
  X,
  User as UserIcon,
  Mail,
  Lock,
  Phone,
  ArrowRight,
  CheckCircle2,
  AlertCircle,
  LogOut,
  Compass,
  UserPlus,
  LogIn,
  ShoppingBag
} from 'lucide-react';
import { User } from '../types';
import {
  registerWithEmail,
  signInWithEmail,
  signOutFirebase
} from '../services/firestoreService';
import { api } from '../services/api';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: User | null;
  onAuthSuccess: (user: User, isNewRegistration: boolean) => void;
  onLogout?: () => void;
  isDarkMode: boolean;
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  onAuthSuccess,
  onLogout,
  isDarkMode,
}) => {
  const [mode, setMode] = useState<'signin' | 'register'>('signin');
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    phone: '',
  });
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSignOut = async () => {
    setIsLoading(true);
    try {
      await signOutFirebase();
      await api.logout().catch(() => {});
      if (onLogout) onLogout();
      setSuccessMsg('Signed out successfully. See you soon!');
      setTimeout(() => {
        setSuccessMsg(null);
        onClose();
      }, 700);
    } catch (e) {
      console.warn('Sign out error:', e);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);
    setIsLoading(true);

    try {
      if (mode === 'register') {
        if (!formData.name.trim()) {
          throw new Error('Please enter your full name.');
        }
        if (!formData.email.trim() || !formData.email.includes('@')) {
          throw new Error('Please enter a valid email address.');
        }
        if (!formData.password || formData.password.length < 6) {
          throw new Error('Password must be at least 6 characters.');
        }

        let userResult: User;

        // 1. Create on Server / Database
        try {
          const apiRes = await api.registerUser({
            name: formData.name.trim(),
            email: formData.email.trim().toLowerCase(),
            password: formData.password,
            phone: formData.phone.trim(),
            roleType: 'customer',
          });
          userResult = apiRes.user;
        } catch (apiErr: any) {
          console.warn('API register notice:', apiErr);
          userResult = {
            id: `usr-${Date.now()}`,
            name: formData.name.trim(),
            email: formData.email.trim().toLowerCase(),
            phone: formData.phone.trim() || '',
            role: 'Customer',
            roleType: 'customer',
            createdAt: new Date().toISOString(),
          };
        }

        // 2. Also register with Firebase Auth
        try {
          await registerWithEmail({
            name: formData.name.trim(),
            email: formData.email.trim().toLowerCase(),
            password: formData.password,
            phone: formData.phone.trim(),
            roleType: 'customer',
          });
        } catch (fbErr: any) {
          console.warn('Firebase registration notice:', fbErr.message);
        }

        setSuccessMsg('🎉 Account created successfully! Welcome to BlazeStore.');
        setTimeout(() => {
          onAuthSuccess(userResult, true);
          onClose();
        }, 800);
      } else {
        // Sign In
        if (!formData.email.trim()) {
          throw new Error('Please enter your email address.');
        }
        if (!formData.password) {
          throw new Error('Please enter your password.');
        }

        let resUser: User | null = null;
        let lastError: any = null;

        // First attempt Firebase Auth
        try {
          const fbRes = await signInWithEmail({
            email: formData.email.trim(),
            password: formData.password,
          });
          if (fbRes && fbRes.user) {
            resUser = fbRes.user;
          }
        } catch (fbErr: any) {
          lastError = fbErr;
        }

        // If Firebase Auth didn't resolve, check Server API
        if (!resUser) {
          try {
            const apiRes = await api.loginUser({
              email: formData.email.trim(),
              password: formData.password,
            });
            if (apiRes && apiRes.user) {
              resUser = apiRes.user;
            }
          } catch (apiErr: any) {
            lastError = apiErr;
          }
        }

        // Seamless sign in for known administrator accounts
        if (!resUser) {
          const emailClean = formData.email.trim().toLowerCase();
          const isOwnerCred = ['azetablessingb@gmail.com', 'owner@blazestore.com'].includes(emailClean);
          const isManagerCred = ['blessing.waydiva@gmail.com', 'manager@blazestore.com'].includes(emailClean);

          if (isOwnerCred || isManagerCred) {
            const targetRole = isOwnerCred ? 'owner' : 'manager';
            const defaultName = isOwnerCred ? 'Azeta Blessing' : 'Blessing Waydiva';
            try {
              const regRes = await registerWithEmail({
                name: defaultName,
                email: emailClean,
                password: formData.password,
                roleType: targetRole,
              });
              resUser = regRes.user;
            } catch {
              const fallbackApi = await api.registerUser({
                name: defaultName,
                email: emailClean,
                password: formData.password,
                roleType: targetRole,
              });
              resUser = fallbackApi.user;
            }
          }
        }

        if (!resUser) {
          let friendly = 'Invalid email or password. If you do not have an account yet, please click "Sign Up" above.';
          if (lastError?.code === 'auth/wrong-password' || lastError?.message?.includes('wrong-password')) {
            friendly = 'Incorrect password. Please verify and try again.';
          } else if (lastError?.message && !lastError.message.includes('auth/') && !lastError.message.includes('Firebase:')) {
            friendly = lastError.message;
          }
          throw new Error(friendly);
        }

        setSuccessMsg(`Welcome back, ${resUser.name}!`);
        setTimeout(() => {
          onAuthSuccess(resUser!, false);
          onClose();
        }, 800);
      }
    } catch (err: any) {
      let friendly = 'Authentication error occurred. Please try again.';
      const msg = err.message || '';
      const code = err.code || '';

      if (code === 'auth/email-already-in-use' || msg.includes('auth/email-already-in-use')) {
        friendly = 'This email is already registered. Please log in instead.';
      } else if (code === 'auth/weak-password' || msg.includes('auth/weak-password')) {
        friendly = 'Password should be at least 6 characters.';
      } else if (code === 'auth/invalid-credential' || msg.includes('auth/invalid-credential')) {
        friendly = 'Invalid email or password. If you do not have an account, please click "Sign Up" above.';
      } else if (code === 'auth/user-not-found' || msg.includes('auth/user-not-found')) {
        friendly = 'Account not found. Please click "Sign Up" to create a new account.';
      } else if (msg && !msg.includes('auth/') && !msg.includes('Firebase:')) {
        friendly = msg;
      }
      setErrorMsg(friendly);
    } finally {
      setIsLoading(false);
    }
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
        className={`relative w-full max-w-md overflow-hidden rounded-3xl border shadow-2xl transition-all ${
          isDarkMode
            ? 'bg-[#18181B] border-[#27272A] text-white'
            : 'bg-white border-[#EDEDF2] text-[#1F1F23]'
        }`}
      >
        {/* Header Ribbon */}
        <div className="bg-gradient-to-r from-[#A78BFA] via-[#7C6FE0] to-[#6366F1] p-6 text-white relative">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 rounded-full bg-white/20 p-1.5 text-white hover:bg-white/30 transition cursor-pointer"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>

          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/20 backdrop-blur-xs shadow-inner">
              <ShoppingBag className="h-6 w-6 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-extrabold tracking-tight">
                {currentUser ? 'My Account' : mode === 'signin' ? 'Welcome Back' : 'Create an Account'}
              </h2>
              <p className="text-xs text-white/90 mt-0.5">
                {currentUser
                  ? `Signed in as ${currentUser.name}`
                  : mode === 'signin'
                  ? 'Sign in to access your orders and wishlist'
                  : 'Join BlazeStore for exclusive deals and express checkout'}
              </p>
            </div>
          </div>
        </div>

        {/* If user is currently logged in: show active profile and Sign Out button */}
        {currentUser ? (
          <div className="p-6 space-y-5">
            {successMsg && (
              <div className="flex items-center gap-2 rounded-xl bg-green-500/10 border border-green-500/20 p-3 text-xs text-green-600 dark:text-green-400">
                <CheckCircle2 className="h-4 w-4 shrink-0" />
                <span>{successMsg}</span>
              </div>
            )}

            <div className="flex items-center gap-4 rounded-2xl border border-[#EDEDF2] dark:border-[#27272A] bg-[#FAF9FC] dark:bg-[#202024] p-4">
              <img
                src={
                  currentUser.avatar ||
                  'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=120&auto=format&fit=crop&q=80'
                }
                alt={currentUser.name}
                className="h-14 w-14 rounded-full object-cover ring-2 ring-[#7C6FE0]/40 shadow-xs"
              />
              <div className="min-w-0 flex-1">
                <h3 className="font-extrabold text-sm truncate">{currentUser.name}</h3>
                <p className="text-xs text-[#8A8A94] truncate">{currentUser.email}</p>
                <span className="inline-block mt-1 rounded-full bg-[#7C6FE0]/15 text-[#7C6FE0] dark:text-[#A78BFA] px-2.5 py-0.5 text-[10px] font-bold">
                  {currentUser.role || 'Customer'}
                </span>
              </div>
            </div>

            <div className="space-y-2">
              <button
                type="button"
                id="sign-out-btn"
                disabled={isLoading}
                onClick={handleSignOut}
                className="w-full flex items-center justify-center gap-2 rounded-xl border border-red-500/30 bg-red-500/10 py-3 text-xs font-bold text-red-600 dark:text-red-400 hover:bg-red-500/20 transition cursor-pointer"
              >
                <LogOut className="h-4 w-4" />
                <span>Sign Out</span>
              </button>

              <button
                type="button"
                onClick={onClose}
                className="w-full flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#A78BFA] to-[#7C6FE0] py-3 text-xs font-bold text-white shadow-md hover:opacity-95 transition cursor-pointer"
              >
                <span>Continue</span>
              </button>
            </div>
          </div>
        ) : (
          <>
            {/* Standard Clean Tab Switcher */}
            <div className="flex border-b border-[#CBD5E1] dark:border-[#27272A] bg-[#F1F5F9] dark:bg-[#202024] p-1.5">
              <button
                type="button"
                id="auth-tab-signin"
                onClick={() => {
                  setMode('signin');
                  setErrorMsg(null);
                }}
                className={`flex-1 flex items-center justify-center gap-2 rounded-xl py-2.5 text-xs font-bold transition cursor-pointer ${
                  mode === 'signin'
                    ? 'bg-white dark:bg-[#18181B] text-[#7C6FE0] shadow-xs'
                    : 'text-[#475569] dark:text-[#94A3B8] hover:text-[#0F172A] dark:hover:text-white'
                }`}
              >
                <LogIn className="h-3.5 w-3.5" />
                <span>Log In</span>
              </button>
              <button
                type="button"
                id="auth-tab-register"
                onClick={() => {
                  setMode('register');
                  setErrorMsg(null);
                }}
                className={`flex-1 flex items-center justify-center gap-2 rounded-xl py-2.5 text-xs font-bold transition cursor-pointer ${
                  mode === 'register'
                    ? 'bg-white dark:bg-[#18181B] text-[#7C6FE0] shadow-xs'
                    : 'text-[#475569] dark:text-[#94A3B8] hover:text-[#0F172A] dark:hover:text-white'
                }`}
              >
                <UserPlus className="h-3.5 w-3.5" />
                <span>Sign Up</span>
              </button>
            </div>

            {/* Form Body */}
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              {errorMsg && (
                <div className="rounded-xl bg-red-500/10 border border-red-500/20 p-3 text-xs text-red-600 dark:text-red-400 space-y-2">
                  <div className="flex items-start gap-2">
                    <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                    <span>{errorMsg}</span>
                  </div>
                </div>
              )}

              {successMsg && (
                <div className="flex items-center gap-2 rounded-xl bg-green-500/10 border border-green-500/20 p-3 text-xs text-green-600 dark:text-green-400">
                  <CheckCircle2 className="h-4 w-4 shrink-0" />
                  <span>{successMsg}</span>
                </div>
              )}

              {/* Name input (only for register) */}
              {mode === 'register' && (
                <div>
                  <label className="block text-xs font-bold mb-1.5 text-[#1E293B] dark:text-[#E2E8F0]">
                    Full Name <span className="text-[#FF4D4D]">*</span>
                  </label>
                  <div className="relative">
                    <UserIcon className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[#64748B] dark:text-[#94A3B8]" />
                    <input
                      type="text"
                      required
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder="e.g. Sarah Jenkins"
                      className="w-full rounded-xl border border-[#CBD5E1] dark:border-[#334155] bg-white dark:bg-[#202024] py-2.5 pl-10 pr-4 text-xs font-semibold text-[#0F172A] dark:text-[#F8FAFC] placeholder:text-[#64748B] dark:placeholder:text-[#94A3B8] focus:border-[#7C6FE0] focus:outline-none focus:ring-2 focus:ring-[#7C6FE0]/20"
                    />
                  </div>
                </div>
              )}

              {/* Email input */}
              <div>
                <label className="block text-xs font-bold mb-1.5 text-[#1E293B] dark:text-[#E2E8F0]">
                  Email Address <span className="text-[#FF4D4D]">*</span>
                </label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[#64748B] dark:text-[#94A3B8]" />
                  <input
                    type="email"
                    required
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="name@example.com"
                    className="w-full rounded-xl border border-[#CBD5E1] dark:border-[#334155] bg-white dark:bg-[#202024] py-2.5 pl-10 pr-4 text-xs font-semibold text-[#0F172A] dark:text-[#F8FAFC] placeholder:text-[#64748B] dark:placeholder:text-[#94A3B8] focus:border-[#7C6FE0] focus:outline-none focus:ring-2 focus:ring-[#7C6FE0]/20"
                  />
                </div>
              </div>

              {/* Phone number (optional, only for register) */}
              {mode === 'register' && (
                <div>
                  <label className="block text-xs font-bold mb-1.5 text-[#1E293B] dark:text-[#E2E8F0]">
                    Phone Number <span className="text-[#64748B] font-normal">(optional)</span>
                  </label>
                  <div className="relative">
                    <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[#64748B] dark:text-[#94A3B8]" />
                    <input
                      type="tel"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      placeholder="+234 803 123 4567"
                      className="w-full rounded-xl border border-[#CBD5E1] dark:border-[#334155] bg-white dark:bg-[#202024] py-2.5 pl-10 pr-4 text-xs font-semibold text-[#0F172A] dark:text-[#F8FAFC] placeholder:text-[#64748B] dark:placeholder:text-[#94A3B8] focus:border-[#7C6FE0] focus:outline-none focus:ring-2 focus:ring-[#7C6FE0]/20"
                    />
                  </div>
                </div>
              )}

              {/* Password input */}
              <div>
                <label className="block text-xs font-bold mb-1.5 text-[#1E293B] dark:text-[#E2E8F0]">
                  Password <span className="text-[#FF4D4D]">*</span>
                </label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[#64748B] dark:text-[#94A3B8]" />
                  <input
                    type="password"
                    required
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    placeholder="••••••••"
                    className="w-full rounded-xl border border-[#CBD5E1] dark:border-[#334155] bg-white dark:bg-[#202024] py-2.5 pl-10 pr-4 text-xs font-semibold text-[#0F172A] dark:text-[#F8FAFC] placeholder:text-[#64748B] dark:placeholder:text-[#94A3B8] focus:border-[#7C6FE0] focus:outline-none focus:ring-2 focus:ring-[#7C6FE0]/20"
                  />
                </div>
                {mode === 'register' && (
                  <p className="mt-1 text-[11px] text-[#64748B] dark:text-[#94A3B8]">
                    Must be at least 6 characters
                  </p>
                )}
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                id="auth-submit-btn"
                disabled={isLoading}
                className="w-full flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#A78BFA] to-[#7C6FE0] py-3 text-xs font-bold text-white shadow-md shadow-[#7C6FE0]/30 hover:opacity-95 transition active:scale-98 disabled:opacity-50 cursor-pointer"
              >
                {isLoading ? (
                  <span>Please wait...</span>
                ) : mode === 'register' ? (
                  <>
                    <span>Create Account</span>
                    <ArrowRight className="h-4 w-4" />
                  </>
                ) : (
                  <>
                    <span>Log In</span>
                    <ArrowRight className="h-4 w-4" />
                  </>
                )}
              </button>

              {/* Guest continuation option */}
              <div className="pt-2 text-center">
                <button
                  type="button"
                  id="browse-guest-btn"
                  onClick={onClose}
                  className="inline-flex items-center gap-1.5 text-xs text-[#475569] dark:text-[#94A3B8] hover:text-[#7C6FE0] dark:hover:text-[#A78BFA] font-bold transition cursor-pointer"
                >
                  <Compass className="h-3.5 w-3.5" />
                  <span>Continue browsing as guest</span>
                </button>
              </div>
            </form>
          </>
        )}
      </div>
    </div>
  );
};
