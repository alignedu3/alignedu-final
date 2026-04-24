import { createClient } from '@/lib/supabase/server';

export async function GET() {
  const supabase = await createClient();

  const start = Date.now();

  const { data, error } = await supabase.auth.getUser();

  const duration = Date.now() - start;

  return Response.json({
    success: !error,
    error,
    duration,
    hasUser: !!data?.user,
  });
}
