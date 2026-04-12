import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';

export async function POST(req: Request) {
  try {
    const { email, name } = await req.json();

    if (!email || !name) {
      return NextResponse.json(
        { success: false, error: 'Missing email or name' },
        { status: 400 }
      );
    }

    const cookieStore = await cookies();
    const serverClient = createServerClient(
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
              // Handle error silently
            }
          },
        },
      }
    ) as any;

    const { data: { user: adminUser } } = await serverClient.auth.getUser();
    if (!adminUser) {
      return NextResponse.json(
        { success: false, error: 'Not authenticated' },
        { status: 401 }
      );
    }

    const { data: adminProfile } = await serverClient
      .from('profiles')
      .select('role')
      .eq('id', adminUser.id)
      .single();

    if (adminProfile?.role !== 'admin') {
      return NextResponse.json(
        { success: false, error: 'Forbidden' },
        { status: 403 }
      );
    }

    // ADMIN CLIENT (bypasses RLS)
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // ================================
    // 1. CHECK IF AUTH USER EXISTS
    // ================================
    const { data: existingUsers } = await supabase.auth.admin.listUsers();

    let userId: string;

    const existingUser = existingUsers?.users?.find(
      (u) => u.email === email
    );

    if (existingUser) {
      userId = existingUser.id;
    } else {
      const { data: authUser, error: authError } =
        await supabase.auth.admin.createUser({
          email,
          email_confirm: true,
        });

      if (authError) {
        console.log('AUTH ERROR:', authError);

        return NextResponse.json(
          {
            success: false,
            error: authError.message,
            fullError: authError,
          },
          { status: 500 }
        );
      }

      if (!authUser?.user?.id) {
        return NextResponse.json(
          {
            success: false,
            error: 'Auth user created but ID is missing',
            fullError: authUser,
          },
          { status: 500 }
        );
      }

      userId = authUser.user.id;
    }

    // ================================
    // 2. UPSERT PROFILE (SAFE)
    // ================================
    const { data, error } = await supabase
      .from('profiles')
      .upsert({
        id: userId,
        email,
        name,
        role: 'teacher',
      })
      .select()
      .single();

    if (error) {
      console.log('PROFILE ERROR:', error);

      return NextResponse.json(
        {
          success: false,
          error: error.message,
          fullError: error,
        },
        { status: 500 }
      );
    }

    // ================================
    // 3. CREATE MANAGED_TEACHERS RELATIONSHIP
    // ================================
    const { error: relationError } = await serverClient
      .from('managed_teachers')
      .insert({
        admin_id: adminUser.id,
        teacher_id: userId,
      });

    if (relationError) {
      console.warn('Managed teacher relation error:', relationError);
      // Don't fail - teacher is still created
    }

    return NextResponse.json({
      success: true,
      user: data,
    });

  } catch (err: any) {
    console.log('UNEXPECTED ERROR:', err);

    return NextResponse.json(
      {
        success: false,
        error: err.message,
      },
      { status: 500 }
    );
  }
}