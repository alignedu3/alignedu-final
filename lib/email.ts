import { Resend } from 'resend';

type AppEmailRecipient = string | string[];

interface SendEmailOptions {
  to: AppEmailRecipient;
  subject: string;
  html: string;
}

interface SentEmailResult {
  id: string;
}

interface BrandedEmailOptions {
  title: string;
  bodyHtml: string;
  ctaLabel?: string;
  ctaUrl?: string;
  warningHtml?: string;
}

interface SendNotificationEmailOptions {
  to: AppEmailRecipient;
  subject: string;
  title: string;
  message: string;
  ctaLabel?: string;
  ctaUrl?: string;
}

const DEFAULT_FROM_EMAIL = process.env.RESEND_FROM_EMAIL || 'noreply@alignedu.net';

function getResendClient() {
  if (!process.env.RESEND_API_KEY) {
    throw new Error('RESEND_API_KEY environment variable is not set');
  }
  return new Resend(process.env.RESEND_API_KEY);
}

function buildBrandedEmailHtml(options: BrandedEmailOptions) {
  const { title, bodyHtml, ctaLabel, ctaUrl, warningHtml } = options;

  const ctaHtml = ctaLabel && ctaUrl
    ? `<a href="${ctaUrl}" class="button">${ctaLabel}</a>`
    : '';

  const ctaFallbackHtml = ctaUrl
    ? `
      <p style="margin-top: 30px; color: #666; font-size: 14px;">
        Or copy and paste this link in your browser:<br>
        <code style="word-break: break-all; background: #f0f0f0; padding: 8px; display: block; margin-top: 10px; border-radius: 4px;">${ctaUrl}</code>
      </p>
    `
    : '';

  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #f97316, #ea580c); color: #fff; padding: 30px 20px; border-radius: 8px; text-align: center; }
          .header h1 { margin: 0; font-size: 24px; }
          .content { background: #f8f9fa; padding: 30px 20px; border-radius: 8px; margin: 20px 0; }
          .button { display: inline-block; background: linear-gradient(135deg, #f97316, #ea580c); color: #fff; padding: 14px 28px; border-radius: 8px; text-decoration: none; font-weight: 600; margin: 20px 0; }
          .footer { color: #888; font-size: 12px; text-align: center; margin-top: 30px; }
          .warning { background: #fff3cd; border: 1px solid #ffecb5; padding: 12px; border-radius: 4px; margin: 20px 0; color: #856404; font-size: 13px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>${title}</h1>
          </div>

          <div class="content">
            ${bodyHtml}
            ${ctaHtml}
            ${ctaFallbackHtml}
            ${warningHtml ? `<div class="warning">${warningHtml}</div>` : ''}
          </div>

          <div class="footer">
            <p>&copy; 2026 AlignEDU. All rights reserved.</p>
          </div>
        </div>
      </body>
    </html>
  `;
}

export async function sendTransactionalEmail(options: SendEmailOptions) {
  const resend = getResendClient();

  try {
    const result = await resend.emails.send({
      from: DEFAULT_FROM_EMAIL,
      to: options.to,
      subject: options.subject,
      html: options.html,
    });

    if (result.error) {
      throw new Error(`Resend API error: ${result.error.message}`);
    }

    if (!result.data?.id) {
      throw new Error('Resend did not return an email id');
    }

    return { id: result.data.id } as SentEmailResult;
  } catch (error) {
    console.error('Resend transactional email error:', error);
    throw error;
  }
}

export async function sendInviteEmail(
  email: string,
  name: string,
  role: 'teacher' | 'admin',
  acceptLink: string
) {
  const subject = `You're invited to join AlignEDU${role === 'admin' ? ' as an Admin' : ''}`;
  const htmlContent = buildBrandedEmailHtml({
    title: 'Welcome to AlignEDU',
    bodyHtml: `
      <p>Hi ${name},</p>
      <p>You've been invited to join AlignEDU as a <strong>${role === 'admin' ? 'Admin' : 'Teacher'}</strong>.</p>
      <p>AlignEDU helps teachers and leaders turn lesson analysis into measurable instructional improvement through AI-powered feedback on curriculum alignment, clarity, and effectiveness.</p>
      <p>Click the button below to accept your invitation and set up your account:</p>
      <p style="margin-top: 30px; font-size: 14px; color: #888;">If you did not expect this invitation, you can safely ignore this email.</p>
    `,
    ctaLabel: 'Accept Invitation',
    ctaUrl: acceptLink,
  });

  try {
    const result = await sendTransactionalEmail({
      to: email,
      subject,
      html: htmlContent,
    });

    return result;
  } catch (error) {
    console.error('Resend invite email error:', error);
    throw error;
  }
}

export async function sendPasswordResetEmail(
  email: string,
  resetLink: string
) {
  const subject = 'Reset Your AlignEDU Password';
  const htmlContent = buildBrandedEmailHtml({
    title: 'Password Reset Request',
    bodyHtml: `
      <p>We received a request to reset the password for your AlignEDU account.</p>
      <p>Click the button below to reset your password. This link will expire in 24 hours:</p>
      <p style="margin-top: 30px; font-size: 13px; color: #888;">For security reasons, do not share this link with anyone. AlignEDU support will never ask for your password.</p>
    `,
    ctaLabel: 'Reset Your Password',
    ctaUrl: resetLink,
    warningHtml:
      '<strong>Security Note:</strong> If you did not request a password reset, please ignore this email or contact support immediately. Your account remains secure.',
  });

  try {
    const result = await sendTransactionalEmail({
      to: email,
      subject,
      html: htmlContent,
    });

    return result;
  } catch (error) {
    console.error('Resend password reset email error:', error);
    throw error;
  }
}

export async function sendNotificationEmail(options: SendNotificationEmailOptions) {
  const html = buildBrandedEmailHtml({
    title: options.title,
    bodyHtml: `<p>${options.message}</p>`,
    ctaLabel: options.ctaLabel,
    ctaUrl: options.ctaUrl,
  });

  try {
    const result = await sendTransactionalEmail({
      to: options.to,
      subject: options.subject,
      html,
    });

    return result;
  } catch (error) {
    console.error('Resend notification email error:', error);
    throw error;
  }
}
