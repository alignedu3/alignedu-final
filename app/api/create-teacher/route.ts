import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { createClient as createServerClient } from '@/lib/supabase/server';
import { getErrorMessage } from '@/lib/errorHandling';

export async function POST(req: Request) {
  try {
    const { email, name } = await req.json();
    const normalizedEmail = typeof email === 'string' ? email.trim().toLowerCase() : '';
    const normalizedName = typeof name === 'string' ? name.trim() : '';

    if (!normalizedEmail || !normalizedName) {
      return NextResponse.json(
        { success: false, error: 'Missing email or name' },
        { status: 400 }
      );
    }

    const serverClient = await createServerClient();

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

    if (!['admin', 'super_admin'].includes(adminProfile?.role)) {
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

    const { data: existingProfile, error: existingProfileError } = await supabase
      .from('profiles')
      .select('id, role')
      .eq('email', normalizedEmail)
      .maybeSingle();

    if (existingProfileError) {
      console.error('PROFILE LOOKUP ERROR:', existingProfileError);
      return NextResponse.json(
        { success: false, error: 'Failed to validate the teacher email.' },
        { status: 500 }
      );
    }

    if (existingProfile && existingProfile.role !== 'teacher') {
      return NextResponse.json(
        { success: false, error: 'This email already belongs to a non-teacher account.' },
        { status: 409 }
      );
    }

    // ================================
    // 1. CHECK IF AUTH USER EXISTS
    // ================================
    const { data: existingUsers } = await supabase.auth.admin.listUsers();

    let userId: string;
    let createdAuthUser = false;

    const existingUser = existingUsers?.users?.find(
      (u) => (u.email || '').toLowerCase() === normalizedEmail
    );

    if (existingUser) {
      userId = existingUser.id;
    } else {
      const { data: authUser, error: authError } =
        await supabase.auth.admin.createUser({
          email: normalizedEmail,
          email_confirm: true,
        });

      if (authError) {
        console.error('AUTH ERROR:', authError);

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
      createdAuthUser = true;
    }

    // ================================
    // 2. UPSERT PROFILE (SAFE)
    // ================================
    const { data, error } = await supabase
      .from('profiles')
      .upsert({
        id: userId,
        email: normalizedEmail,
        name: normalizedName,
        role: 'teacher',
      })
      .select()
      .single();

    if (error) {
      console.error('PROFILE ERROR:', error);

      if (createdAuthUser) {
        await supabase.auth.admin.deleteUser(userId);
      }

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
    const { error: relationError } = await supabase
      .from('managed_teachers')
      .upsert({
        admin_id: adminUser.id,
        teacher_id: userId,
      }, { onConflict: 'admin_id,teacher_id', ignoreDuplicates: true });

    if (relationError) {
      console.error('Managed teacher relation error:', relationError);

      if (createdAuthUser) {
        await supabase.from('profiles').delete().eq('id', userId);
        await supabase.auth.admin.deleteUser(userId);
      }

      return NextResponse.json(
        { success: false, error: 'Failed to assign the teacher to this admin.' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      user: data,
    });

  } catch (err) {
    console.error('UNEXPECTED ERROR:', err);

    return NextResponse.json(
      {
        success: false,
        error: getErrorMessage(err),
      },
      { status: 500 }
    );
  }
}
