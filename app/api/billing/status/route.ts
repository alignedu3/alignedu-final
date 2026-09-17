import { createClient as createServerClient } from '@/lib/supabase/server';
import { isOwnerEmail, monthlyPeriodEnd, monthlyPeriodStart, PLAN_LIMITS, type AlignEduPlan } from '@/lib/billing';

export async function GET() {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: 'Not authenticated' }, { status: 401 });
  const unlimited = isOwnerEmail(user.email);
  let plan: AlignEduPlan = unlimited ? 'school' : 'free';
  const { data: subscription } = await supabase.from('subscriptions').select('plan,status,current_period_end').eq('user_id', user.id).maybeSingle();
  if (!unlimited && subscription && ['active', 'trialing'].includes(subscription.status)) plan = subscription.plan as AlignEduPlan;
  const { count } = await supabase.from('analyses').select('id', { count: 'exact', head: true }).eq('user_id', user.id).is('deleted_at', null).gte('created_at', monthlyPeriodStart()).lt('created_at', monthlyPeriodEnd());
  const used = count || 0;
  const limit = unlimited ? null : PLAN_LIMITS[plan];
  return Response.json({ plan, status: unlimited ? 'owner' : (subscription?.status || 'free'), used, limit, remaining: limit === null ? null : Math.max(0, limit - used), unlimited, currentPeriodEnd: subscription?.current_period_end || null });
}
