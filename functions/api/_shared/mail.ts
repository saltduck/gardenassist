type MailEnv = {
  RESEND_API_KEY?: string
  MAIL_FROM?: string
  APP_BASE_URL?: string
}

/** 发送找回密码邮件；无 RESEND_API_KEY 时返回 false（调用方仍统一成功文案） */
export async function sendPasswordResetEmail(
  env: MailEnv,
  to: string,
  resetUrl: string
): Promise<boolean> {
  const apiKey = env.RESEND_API_KEY?.trim()
  if (!apiKey) return false

  const from = env.MAIL_FROM?.trim() || 'Garden Assist <onboarding@resend.dev>'
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from,
      to: [to],
      subject: '重置花园助手密码',
      html: `<p>请点击以下链接重置密码（1 小时内有效）：</p><p><a href="${resetUrl}">${resetUrl}</a></p><p>如非本人操作请忽略。</p>`,
    }),
  })
  return res.ok
}

export function buildResetUrl(env: MailEnv, token: string): string {
  const base = (env.APP_BASE_URL || '').replace(/\/$/, '')
  const path = `/reset-password?token=${encodeURIComponent(token)}`
  return base ? `${base}${path}` : path
}
