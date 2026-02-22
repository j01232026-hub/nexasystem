// @ts-nocheck
// Edge Function for sending invite emails via Resend
// Runs in Deno environment, not Node.js

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')

interface InviteRequest {
  email: string;
  name: string;
  inviteLink: string;
  storeName: string;
}

serve(async (req: Request) => {
  try {
    const { email, name, inviteLink, storeName }: InviteRequest = await req.json()

    if (!email || !inviteLink) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      )
    }

    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: 'NEXA Salon <noreply@nexa-salon.com>',
        to: email,
        subject: `【${storeName || 'NEXA Salon'}】邀請您加入團隊`,
        html: `
          <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 40px 20px;">
            <div style="text-align: center; margin-bottom: 30px;">
              <h1 style="color: #f43f5e; font-size: 24px; margin: 0;">NEXA Salon</h1>
              <p style="color: #64748b; margin: 10px 0 0 0;">美業管理系統</p>
            </div>
            
            <div style="background: #fff1f2; border-radius: 16px; padding: 30px; margin-bottom: 30px;">
              <h2 style="color: #1e293b; font-size: 20px; margin: 0 0 20px 0;">您好，${name || '親愛的夥伴'}</h2>
              <p style="color: #475569; line-height: 1.6; margin: 0 0 20px 0;">
                ${storeName || '店家'} 邀請您加入團隊，一起使用 NEXA Salon 管理系統。
              </p>
              <p style="color: #475569; line-height: 1.6; margin: 0;">
                請點擊下方按鈕完成註冊，連結 7 天內有效。
              </p>
            </div>
            
            <div style="text-align: center; margin-bottom: 30px;">
              <a href="${inviteLink}" 
                 style="display: inline-block; background: #f43f5e; color: white; text-decoration: none; padding: 16px 32px; border-radius: 12px; font-weight: 600; font-size: 16px;">
                接受邀請並設定密碼
              </a>
            </div>
            
            <div style="background: #f8fafc; border-radius: 12px; padding: 20px; margin-bottom: 20px;">
              <p style="color: #64748b; font-size: 13px; margin: 0 0 10px 0;">如果按鈕無法點擊，請複製以下連結：</p>
              <p style="color: #475569; font-size: 13px; word-break: break-all; margin: 0;">${inviteLink}</p>
            </div>
            
            <div style="text-align: center; padding-top: 20px; border-top: 1px solid #e2e8f0;">
              <p style="color: #94a3b8; font-size: 12px; margin: 0;">
                此郵件由 NEXA Salon 系統自動發送，請勿回覆
              </p>
            </div>
          </div>
        `,
      }),
    })

    if (!res.ok) {
      const errorText = await res.text()
      throw new Error(errorText)
    }

    const data = await res.json()

    return new Response(
      JSON.stringify({ success: true, data }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    )
  } catch (error: any) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  }
})