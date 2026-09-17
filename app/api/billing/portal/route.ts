import { createClient as createServerClient } from '@/lib/supabase/server';

export async function POST(req: Request) {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: 'Not authenticated' }, { status: 401 });
  const { data: subscription } = await supabase.from('subscriptions').select('stripe_customer_id').eq('user_id', user.id).maybeSingle();
  if (!subscription?.stripe_customer_id) return Response.json({ error: 'No paid billing account was found.' }, { status: 404 });
  const secret = process.env.STRIPE_SECRET_KEY;
  if (!secret) return Response.json({ error: 'Billing is not configured yet.' }, { status: 503 });
  const body = new URLSearchParams({ customer: subscription.stripe_customer_id, return_url: `${new URL(req.url).origin}/dashboard` });
  const stripe = await fetch('https://api.stripe.com/v1/billing_portal/sessions', { method: 'POST', headers: { Authorization: `Bearer ${secret}`, 'Content-Type': 'application/x-www-form-urlencoded' }, body });
  const data = await stripe.json();
  if (!stripe.ok || !data.url) return Response.json({ error: data?.error?.message || 'Could not open billing.' }, { status: 502 });
  return Response.json({ url: data.url });
}
