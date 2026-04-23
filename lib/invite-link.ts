import { createHmac, timingSafeEqual } from 'node:crypto';

type InviteRole = 'teacher' | 'admin';
type EmailActionType = 'invite' | 'recovery';

export interface InviteTokenPayload {
  type: 'invite';
  userId: string;
  email: string;
  name: string;
  role: InviteRole;
  issuedAt?: number;
  expiresAt?: number;
}

export interface RecoveryTokenPayload {
  type: 'recovery';
  email: string;
  issuedAt?: number;
  expiresAt?: number;
}

type EmailActionPayload = InviteTokenPayload | RecoveryTokenPayload;
const INVITE_TOKEN_TTL_MS = 1000 * 60 * 60 * 24 * 14;
const RECOVERY_TOKEN_TTL_MS = 1000 * 60 * 60 * 2;

function getInviteSigningSecret() {
  return process.env.INVITE_SIGNING_SECRET || '';
}

function toBase64Url(value: string) {
  return Buffer.from(value, 'utf8').toString('base64url');
}

function fromBase64Url(value: string) {
  return Buffer.from(value, 'base64url').toString('utf8');
}

function signPayload(encodedPayload: string) {
  const secret = getInviteSigningSecret();
  if (!secret) {
    throw new Error('Invite signing secret is not configured');
  }

  return createHmac('sha256', secret).update(encodedPayload).digest('base64url');
}

function createSignedToken(payload: EmailActionPayload) {
  const encodedPayload = toBase64Url(JSON.stringify(payload));
  const signature = signPayload(encodedPayload);
  return `${encodedPayload}.${signature}`;
}

function verifySignedToken(token: string) {
  const [encodedPayload, signature] = token.split('.');
  if (!encodedPayload || !signature) {
    return null;
  }

  const expectedSignature = signPayload(encodedPayload);
  const provided = Buffer.from(signature);
  const expected = Buffer.from(expectedSignature);

  if (provided.length !== expected.length || !timingSafeEqual(provided, expected)) {
    return null;
  }

  try {
    return JSON.parse(fromBase64Url(encodedPayload)) as EmailActionPayload;
  } catch {
    return null;
  }
}

export function createInviteToken(payload: Omit<InviteTokenPayload, 'type'>) {
  const issuedAt = Date.now();
  return createSignedToken({
    ...payload,
    type: 'invite',
    issuedAt,
    expiresAt: issuedAt + INVITE_TOKEN_TTL_MS,
  });
}

export function createRecoveryToken(payload: Omit<RecoveryTokenPayload, 'type'>) {
  const issuedAt = Date.now();
  return createSignedToken({
    ...payload,
    type: 'recovery',
    issuedAt,
    expiresAt: issuedAt + RECOVERY_TOKEN_TTL_MS,
  });
}

export function verifyInviteToken(token: string) {
  const payload = verifySignedToken(token);

  if (!payload || payload.type !== 'invite') {
    return null;
  }

  if (!payload.userId || !payload.email || !payload.name || !payload.role) {
    return null;
  }

  if (!['teacher', 'admin'].includes(payload.role)) {
    return null;
  }

  if (payload.expiresAt && payload.expiresAt < Date.now()) {
    return null;
  }

  return payload;
}

export function verifyRecoveryToken(token: string) {
  const payload = verifySignedToken(token);

  if (!payload || payload.type !== 'recovery') {
    return null;
  }

  if (!payload.email) {
    return null;
  }

  if (payload.expiresAt && payload.expiresAt < Date.now()) {
    return null;
  }

  return payload;
}

export function buildReusableInviteLink(siteUrl: string, payload: Omit<InviteTokenPayload, 'type'>) {
  const token = createInviteToken(payload);
  return `${siteUrl}/accept-invite?token=${encodeURIComponent(token)}`;
}

export function buildReusableRecoveryLink(siteUrl: string, payload: Omit<RecoveryTokenPayload, 'type'>) {
  const token = createRecoveryToken(payload);
  return `${siteUrl}/reset-access?token=${encodeURIComponent(token)}`;
}

export function isSupportedEmailActionType(value: string): value is EmailActionType {
  return value === 'invite' || value === 'recovery';
}
