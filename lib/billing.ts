export type AlignEduPlan = 'free' | 'teacher' | 'teacher_pro' | 'school';

export const OWNER_EMAILS = new Set([
  'ryan@alignedu.net',
  'robertrcollins3@gmail.com',
]);

export const PLAN_LIMITS: Record<AlignEduPlan, number | null> = {
  free: 2,
  teacher: 10,
  teacher_pro: 30,
  school: null,
};

export const ALIGN_EDU_PRICES = {
  teacher: {
    monthly: 'price_1UGhNIJf9gmcaTXRTAt1Xwng',
    annual: 'price_1UGhNNJf9gmcaTXRXpG33dUS',
  },
  teacher_pro: {
    monthly: 'price_1UGhNRJf9gmcaTXRAVaUllhU',
    annual: 'price_1UGhNWJf9gmcaTXRJ1INtwon',
  },
} as const;

export function normalizeEmail(email?: string | null) {
  return String(email || '').trim().toLowerCase();
}

export function isOwnerEmail(email?: string | null) {
  return OWNER_EMAILS.has(normalizeEmail(email));
}

export function planFromPriceId(priceId?: string | null): AlignEduPlan {
  if (priceId === ALIGN_EDU_PRICES.teacher.monthly || priceId === ALIGN_EDU_PRICES.teacher.annual) return 'teacher';
  if (priceId === ALIGN_EDU_PRICES.teacher_pro.monthly || priceId === ALIGN_EDU_PRICES.teacher_pro.annual) return 'teacher_pro';
  return 'free';
}

export function monthlyPeriodStart(date = new Date()) {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1)).toISOString();
}

export function monthlyPeriodEnd(date = new Date()) {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 1)).toISOString();
}
