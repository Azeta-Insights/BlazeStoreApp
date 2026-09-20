import { adminAuth } from './firebase';

export interface DecodedAuthUser {
  uid: string;
  email?: string;
  name?: string;
  role?: string;
  roleType?: string;
}

/**
 * Verifies a Firebase ID Token using Firebase Admin Auth SDK
 */
export async function verifyFirebaseIdToken(idToken: string): Promise<DecodedAuthUser | null> {
  if (!idToken || typeof idToken !== 'string') return null;

  let rawToken = idToken.trim();
  if (rawToken.startsWith('Bearer ')) {
    rawToken = rawToken.substring(7).trim();
  }

  if (!rawToken) return null;

  try {
    const decoded = await adminAuth.verifyIdToken(rawToken);
    return {
      uid: decoded.uid,
      email: decoded.email,
      name: decoded.name || decoded.email?.split('@')[0] || 'User',
      role: (decoded.role as string) || undefined,
      roleType: (decoded.roleType as string) || undefined,
    };
  } catch (err: any) {
    if (err?.code === 'auth/id-token-expired' || err?.message?.includes('expired')) {
      console.log('[Server Auth] Notice: Firebase ID token has expired. Request will fall back to public/cached permissions or prompt token refresh.');
    } else {
      console.warn('[Server Auth] Token verification notice:', err?.message || err);
    }
    return null;
  }
}

/**
 * Helper to parse Cookie header into key-value map
 */
export function parseCookies(cookieHeader?: string): Record<string, string> {
  const list: Record<string, string> = {};
  if (!cookieHeader) return list;

  cookieHeader.split(';').forEach((cookie) => {
    const parts = cookie.split('=');
    const name = parts.shift()?.trim();
    if (name) {
      list[name] = decodeURIComponent(parts.join('=').trim());
    }
  });

  return list;
}
