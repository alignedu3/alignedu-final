import { sendPasswordResetEmail } from '@/lib/email';
import { createClient } from '@supabase/supabase-js';

type RecoveryLinkCapableClient = {
  auth: {
    admin: {
      generateLink(input: {
        type: 'recovery';
        email: string;
      }): Promise<{
        data: {
          properties?: {
            action_link?: string | null;
          } | null;
        } | null;
        error: {
          message?: string | null;
        } | null;
      }>;
    };
  };
};

async function generateSupabaseRecoveryLink(supabase: RecoveryLinkCapableClient, email: string) {
  const { data, error } = await supabase.auth.admin.generateLink({
    type: 'recovery',
    email,
  });

  if (error || !data?.properties?.action_link) {
    throw new Error(error?.message || 'Unable to generate recovery link.');
  }

  return data.properties.action_link;
}

export async function POST(req: Request) {
  const { email } = await req.json();
  const normalizedEmail = String(email || '').trim().toLowerCase();

  if (!normalizedEmail) {
    return new Response(JSON.stringify({ error: 'Email is required' }), { status: 400 });
  }

  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
    const resetLink = await generateSupabaseRecoveryLink(supabase, normalizedEmail);

    // Send reset email via Resend
    try {
      const resetEmail = await sendPasswordResetEmail(normalizedEmail, resetLink);
      console.log('Password reset email queued via Resend', {
        resetEmailId: resetEmail.id,
        to: normalizedEmail,
      });

      return new Response(
        JSON.stringify({
          success: true,
          message: 'Password reset email sent',
          resetEmailId: resetEmail.id,
        }),
        { status: 200 }
      );
    } catch (emailError) {
      console.error('Failed to send password reset email via Resend:', emailError);
      return new Response(JSON.stringify({ error: 'Failed to send reset email' }), { status: 500 });
    }
  } catch (err) {
    console.error('Password reset error:', err);
    return new Response(JSON.stringify({ error: 'Something went wrong' }), { status: 500 });
  }
}
