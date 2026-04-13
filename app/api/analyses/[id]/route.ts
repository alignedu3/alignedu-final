import { NextRequest, NextResponse } from 'next/server';
import { createClient as createServiceClient } from '@supabase/supabase-js';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { getAdminVisibility } from '@/lib/adminVisibility';

export async function DELETE(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;
  try {
    const cookieStore = await cookies();
    const serverSupabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll();
          },
          setAll(cookiesToSet) {
            try {
              cookiesToSet.forEach(({ name, value, options }) => {
                cookieStore.set(name, value, options);
              });
            } catch (error) {
              // ignore
            }
          },
        },
      }
    ) as any;

    const {
      data: { user },
      error: authError,
    } = await serverSupabase.auth.getUser();

    if (authError) {
      return NextResponse.json({ success: false, error: authError.message }, { status: 401 });
    }

    if (!user) {
      return NextResponse.json({ success: false, error: 'Not authenticated' }, { status: 401 });
    }

    const { data: profile, error: profileError } = await serverSupabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (profileError) {
      return NextResponse.json({ success: false, error: profileError.message }, { status: 500 });
    }

    const serviceSupabase = createServiceClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const { data: analysis, error: analysisError } = await serviceSupabase
      .from('analyses')
      .select('user_id')
      .eq('id', id)
      .single();

    if (analysisError || !analysis) {
      return NextResponse.json(
        { success: false, error: analysisError?.message || 'Analysis not found' },
        { status: 404 }
      );
    }

    const isOwner = analysis.user_id === user.id;
    let canDelete = isOwner;

    if (profile?.role === 'admin' && !canDelete) {
      const visibility = await getAdminVisibility(user.id);
      canDelete = visibility.visibleUserIds.includes(analysis.user_id);
    }

    if (!canDelete) {
      return NextResponse.json({ success: false, error: 'Not authorized to delete this lesson' }, { status: 403 });
    }

    const { error: deleteError } = await serviceSupabase
      .from('analyses')
      .delete()
      .eq('id', id);

    if (deleteError) {
      return NextResponse.json({ success: false, error: deleteError.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message || 'Server error' }, { status: 500 });
  }
}
