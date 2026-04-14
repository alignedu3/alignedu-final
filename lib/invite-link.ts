import { createHmac, timingSafeEqual } from 'node:crypto';

type InviteRole = 'teacher' | 'admin';
type EmailActionType = 'invite' | 'recovery';

export interface InviteTokenPayload {
  type: 'invite';
  userId: string;
  email: string;
  name: string;
  role: InviteRole;
}

export interface RecoveryTokenPayload {
  type: 'recovery';
  email: string;
}

type EmailActionPayload = InviteTokenPayload | RecoveryTokenPayload;

function getInviteSigningSecret() {
  return process.env.INVITE_SIGNING_SECRET || process.env.SUPABASE_SERVICE_ROLE_KEY || '';
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
  return createSignedToken({ ...payload, type: 'invite' });
}

export function createRecoveryToken(payload: Omit<RecoveryTokenPayload, 'type'>) {
  return createSignedToken({ ...payload, type: 'recovery' });
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