import { createClient as createServiceClient } from '@supabase/supabase-js';
import { createClient as createServerClient } from '@/lib/supabase/server';
import { planFromPriceId } from '@/lib/billing';

export async function POST(req: Request) {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user?.id || !user.email) return Response.json({ error: 'Sign in to finish activating your plan.' }, { status: 401 });

  const { sessionId } = await req.json();
  if (!sessionId || typeof sessionId !== 'string') return Response.json({ error: 'Missing checkout session.' }, { status: 400 });

  const secret = process.env.STRIPE_SECRET_KEY;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!secret || !serviceRoleKey || !supabaseUrl) return Response.json({ error: 'Billing activation is not configured.' }, { status: 503 });

  const url = new URL(`https://api.stripe.com/v1/checkout/sessions/${encodeURIComponent(sessionId)}`);
  url.searchParams.append('expand[]', 'subscription');
  url.searchParams.append('expand[]', 'line_items');

  const stripeResponse = await fetch(url, { headers: { Authorization: `Bearer ${secret}` } });
  const session = await stripeResponse.json();
  if (!stripeResponse.ok) return Response.json({ error: session?.error?.message || 'Could not verify checkout.' }, { status: 502 });
  if (session.status !== 'complete') return Response.json({ error: 'Checkout has not completed yet.' }, { status: 409 });

  const checkoutEmail = String(session.customer_details?.email || session.customer_email || '').trim().toLowerCase();
  if (!checkoutEmail || checkoutEmail !== user.email.trim().toLowerCase()) {
    return Response.json({ error: 'Please sign in with the same email address used during Stripe checkout.' }, { status: 403 });
  }

  const priceId = session.line_items?.data?.[0]?.price?.id || null;
  const plan = planFromPriceId(priceId);
  if (plan === 'free') return Response.json({ error: 'The completed checkout does not match an AlignEDU paid plan.' }, { status: 400 });

  const subscription = typeof session.subscription === 'object' ? session.subscription : null;
  const interval = session.metadata?.interval || subscription?.metadata?.interval || session.line_items?.data?.[0]?.price?.recurring?.interval || null;
  const service = createServiceClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false, autoRefreshToken: false } });

  const payload = {
    user_id: user.id,
    stripe_customer_id: typeof session.customer === 'string' ? session.customer : session.customer?.id || null,
    stripe_subscription_id: subscription?.id || (typeof session.subscription === 'string' ? session.subscription : null),
    stripe_price_id: priceId,
    plan,
    status: subscription?.status || 'active',
    billing_interval: interval,
    current_period_start: subscription?.current_period_start ? new Date(subscription.current_period_start * 1000).toISOString() : null,
    current_period_end: subscription?.current_period_end ? new Date(subscription.current_period_end * 1000).toISOString() : null,
    cancel_at_period_end: Boolean(subscription?.cancel_at_period_end),
    updated_at: new Date().toISOString(),
  };

  const { error } = await service.from('subscriptions').upsert(payload, { onConflict: 'user_id' });
  if (error) return Response.json({ error: 'Your payment succeeded, but AlignEDU could not activate the plan yet.' }, { status: 500 });

  return Response.json({ ok: true, plan });
}
