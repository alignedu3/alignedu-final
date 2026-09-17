import { createClient as createServerClient } from '@/lib/supabase/server';
import { ALIGN_EDU_PRICES, isOwnerEmail } from '@/lib/billing';

export async function POST(req: Request) {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: 'Sign in to choose a plan.' }, { status: 401 });
  if (isOwnerEmail(user.email)) return Response.json({ error: 'Owner accounts already have unlimited AlignEDU access.' }, { status: 400 });

  const { plan, interval } = await req.json();
  if (!['teacher', 'teacher_pro'].includes(plan) || !['monthly', 'annual'].includes(interval)) return Response.json({ error: 'Invalid plan.' }, { status: 400 });
  const price = ALIGN_EDU_PRICES[plan as 'teacher' | 'teacher_pro'][interval as 'monthly' | 'annual'];
  const secret = process.env.STRIPE_SECRET_KEY;
  if (!secret) return Response.json({ error: 'Billing is not configured yet.' }, { status: 503 });
  const origin = new URL(req.url).origin;
  const body = new URLSearchParams();
  body.set('mode', 'subscription');
  body.set('line_items[0][price]', price);
  body.set('line_items[0][quantity]', '1');
  body.set('success_url', `${origin}/dashboard?billing=success`);
  body.set('cancel_url', `${origin}/pricing?billing=cancelled`);
  body.set('client_reference_id', user.id);
  body.set('customer_email', user.email || '');
  body.set('metadata[user_id]', user.id);
  body.set('metadata[app]', 'AlignEDU');
  body.set('subscription_data[metadata][user_id]', user.id);
  body.set('subscription_data[metadata][app]', 'AlignEDU');
  body.set('allow_promotion_codes', 'true');

  const stripe = await fetch('https://api.stripe.com/v1/checkout/sessions', { method: 'POST', headers: { Authorization: `Bearer ${secret}`, 'Content-Type': 'application/x-www-form-urlencoded' }, body });
  const data = await stripe.json();
  if (!stripe.ok || !data.url) return Response.json({ error: data?.error?.message || 'Could not start checkout.' }, { status: 502 });
  return Response.json({ url: data.url });
}
