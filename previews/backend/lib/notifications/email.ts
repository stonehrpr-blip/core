// Email transport — Resend (resend.com).
// Single function `sendEmail()` used by OTP, password reset, suspicious-login alerts.
// Switch to Postmark/SES later by replacing only this file.

const RESEND_API_URL = 'https://api.resend.com/emails';

export interface EmailOpts {
  to: string;
  subject: string;
  html: string;
  text?: string;
  // Tag for analytics — Resend lets us filter by these
  tag?: 'otp' | 'login_alert' | 'billing' | 'transactional' | 'security';
}

export async function sendEmail(opts: EmailOpts): Promise<{ ok: boolean; id?: string; reason?: string }> {
  const key = process.env.RESEND_API_KEY;
  if (!key) {
    if (process.env.NODE_ENV !== 'production') {
      console.log('[email:dev]', opts.to, '/', opts.subject, '\n', opts.text || opts.html);
      return { ok: true, id: 'dev-' + Date.now() };
    }
    return { ok: false, reason: 'no_api_key' };
  }
  const from = process.env.RESEND_FROM || 'CORE <no-reply@harperlinks.com>';
  try {
    const res = await fetch(RESEND_API_URL, {
      method: 'POST',
      headers: {
        'authorization': `Bearer ${key}`,
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        from,
        to: [opts.to],
        subject: opts.subject,
        html: opts.html,
        text: opts.text,
        tags: opts.tag ? [{ name: 'type', value: opts.tag }] : undefined,
      }),
    });
    if (!res.ok) {
      const detail = await res.text();
      return { ok: false, reason: 'send_failed:' + res.status + ':' + detail.slice(0, 80) };
    }
    const json = await res.json() as { id?: string };
    return { ok: true, id: json.id };
  } catch (err) {
    return { ok: false, reason: 'transport_error:' + (err as Error).message };
  }
}

/** Pre-built OTP email body. */
export function buildOtpEmail(opts: { code: string; purpose: 'OWNER_DASHBOARD' | 'TWO_FA_LOGIN' | 'PASSWORD_RESET' | 'EMAIL_VERIFY'; expiresAt: Date }): { subject: string; html: string; text: string } {
  const labels = {
    OWNER_DASHBOARD: { subject: 'CORE · owner dashboard code', context: 'sign in to your owner dashboard' },
    TWO_FA_LOGIN:    { subject: 'CORE · sign-in code',          context: 'finish signing in' },
    PASSWORD_RESET:  { subject: 'CORE · reset your password',   context: 'reset your password' },
    EMAIL_VERIFY:    { subject: 'CORE · verify your email',     context: 'verify your email address' },
  } as const;
  const lbl = labels[opts.purpose];
  const minutesLeft = Math.max(1, Math.ceil((opts.expiresAt.getTime() - Date.now()) / 60000));
  const html = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'SF Pro Display', sans-serif; max-width: 480px; margin: 32px auto; padding: 28px 24px; background: #02020A; color: #F8FAFE; border-radius: 18px;">
      <div style="font-size: 11px; letter-spacing: 0.22em; color: #6BA9FF; font-weight: 700; text-transform: uppercase;">CORE</div>
      <h1 style="font-size: 22px; letter-spacing: -0.5px; margin: 12px 0 8px;">Your code is below</h1>
      <p style="font-size: 14px; color: #9AA1B7; line-height: 1.5; margin: 0 0 22px;">Use this code to ${lbl.context}. Expires in ${minutesLeft} minutes.</p>
      <div style="font-size: 36px; font-weight: 700; letter-spacing: 12px; text-align: center; padding: 18px; border-radius: 12px; background: rgba(74,143,255,0.10); border: 1px solid rgba(74,143,255,0.32); color: #fff; font-family: ui-monospace, monospace;">${opts.code}</div>
      <p style="font-size: 11px; color: #4F5570; margin-top: 22px; line-height: 1.5;">Didn't request this? You can ignore this email. The code expires automatically.</p>
      <p style="font-size: 11px; color: #4F5570; margin-top: 14px;">© Core</p>
    </div>`;
  const text = `Your CORE code is ${opts.code}.\nUse it to ${lbl.context}. Expires in ${minutesLeft} minutes.\nDidn't request this? Ignore this email.\n— Core`;
  return { subject: lbl.subject, html, text };
}
