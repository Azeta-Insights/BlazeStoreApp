import crypto from 'crypto';
import { User } from '../src/types';

const JWT_SECRET = process.env.JWT_SECRET || process.env.ADMIN_OWNER_PASSWORD || 'blazestore_jwt_secret_key_2026';

export interface JwtPayload {
  id: string;
  email: string;
  name: string;
  role: string;
  roleType?: string;
  exp?: number;
}

/**
 * Generates a signed, stateless JSON Web Token (JWT) using HMAC-SHA256
 */
export function generateJwtToken(payload: Partial<JwtPayload>, expiresInSeconds = 7 * 86400): string {
  const header = { alg: 'HS256', typ: 'JWT' };
  const exp = Math.floor(Date.now() / 1000) + expiresInSeconds;
  const fullPayload: JwtPayload = {
    id: payload.id || '',
    email: payload.email || '',
    name: payload.name || '',
    role: payload.role || 'Club Member',
    roleType: payload.roleType,
    exp,
  };

  const base64Header = Buffer.from(JSON.stringify(header)).toString('base64url');
  const base64Payload = Buffer.from(JSON.stringify(fullPayload)).toString('base64url');

  const signatureInput = `${base64Header}.${base64Payload}`;
  const signature = crypto
    .createHmac('sha256', JWT_SECRET)
    .update(signatureInput)
    .digest('base64url');

  return `${signatureInput}.${signature}`;
}

/**
 * Verifies a JWT token signature and checks expiration
 */
export function verifyJwtToken(token: string): JwtPayload | null {
  if (!token || typeof token !== 'string') return null;

  let rawToken = token.trim();
  if (rawToken.startsWith('Bearer ')) {
    rawToken = rawToken.substring(7).trim();
  }

  const parts = rawToken.split('.');
  if (parts.length !== 3) return null;

  const [base64Header, base64Payload, signature] = parts;
  const signatureInput = `${base64Header}.${base64Payload}`;
  const expectedSignature = crypto
    .createHmac('sha256', JWT_SECRET)
    .update(signatureInput)
    .digest('base64url');

  if (signature !== expectedSignature) {
    return null;
  }

  try {
    const payload = JSON.parse(Buffer.from(base64Payload, 'base64url').toString('utf8')) as JwtPayload;
    if (payload.exp && Math.floor(Date.now() / 1000) > payload.exp) {
      return null; // Expired
    }
    return payload;
  } catch {
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
