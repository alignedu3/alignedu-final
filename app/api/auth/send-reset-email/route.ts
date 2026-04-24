import { sendPasswordResetEmail } from '@/lib/email';
import { buildReusableRecoveryLink } from '@/lib/invite-link';

function getSiteUrl(req: Request) {
  const originHeader = req.headers.get('origin');
  if (originHeader && /^https?:\/\//i.test(originHeader)) {
    return originHeader.replace(/\/$/, '');
  }

  const refererHeader = req.headers.get('referer');
  if (refererHeader) {
    try {
      return new URL(refererHeader).origin.replace(/\/$/, '');
    } catch {
      // Ignore malformed referer and continue to configured fallbacks.
    }
  }

  const configured =
    process.env.NEXT_PUBLIC_SITE_URL ||
    process.env.NEXT_PUBLIC_APP_URL ||
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : undefined) ||
    'https://www.alignedu.net' ||
    'http://localhost:3000';

  return configured.replace(/\/$/, '');
}

export async function POST(req: Request) {
  const { email } = await req.json();
  const normalizedEmail = String(email || '').trim().toLowerCase();

  if (!normalizedEmail) {
    return new Response(JSON.stringify({ error: 'Email is required' }), { status: 400 });
  }

  try {
    const resetLink = buildReusableRecoveryLink(getSiteUrl(req), { email: normalizedEmail });

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
