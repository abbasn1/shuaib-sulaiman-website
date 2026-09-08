import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.4'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

const escapeHtml = (value: unknown) => String(value ?? '')
  .replaceAll('&', '&amp;')
  .replaceAll('<', '&lt;')
  .replaceAll('>', '&gt;')
  .replaceAll('"', '&quot;')
  .replaceAll("'", '&#039;')

const jsonResponse = (body: unknown, status = 200) => new Response(JSON.stringify(body), {
  status,
  headers: { ...corsHeaders, 'Content-Type': 'application/json' },
})

const sha256 = async (value: string) => {
  const bytes = new TextEncoder().encode(value)
  const digest = await crypto.subtle.digest('SHA-256', bytes)
  return Array.from(new Uint8Array(digest)).map((byte) => byte.toString(16).padStart(2, '0')).join('')
}

const verifyTurnstile = async (secret: string, token: string, remoteIp: string) => {
  const body = new FormData()
  body.set('secret', secret)
  body.set('response', token)
  if (remoteIp && remoteIp !== 'unknown') body.set('remoteip', remoteIp)

  const response = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
    method: 'POST',
    body,
  })

  const result = await response.json()
  return Boolean(response.ok && result?.success)
}

const cleanOptional = (value: unknown, maxLength: number) => {
  const cleaned = String(value ?? '').trim()
  return cleaned ? cleaned.slice(0, maxLength) : null
}

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  if (request.method !== 'POST') return jsonResponse({ error: 'Method not allowed.' }, 405)

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    const resendApiKey = Deno.env.get('RESEND_API_KEY')
    const emailFrom = Deno.env.get('QUOTE_EMAIL_FROM') || 'Shuaib Sulaiman & Co <onboarding@resend.dev>'
    const fallbackRecipient = Deno.env.get('QUOTE_NOTIFICATION_EMAIL') || 'sulaiman_shuaib@yahoo.com'
    const turnstileSecret = Deno.env.get('TURNSTILE_SECRET_KEY')

    if (!supabaseUrl || !serviceRoleKey) {
      return jsonResponse({ error: 'Enquiry service configuration is incomplete.' }, 503)
    }
    if (!turnstileSecret) {
      console.error('TURNSTILE_SECRET_KEY is not configured.')
      return jsonResponse({ error: 'Security verification is temporarily unavailable.' }, 503)
    }

    const body = await request.json()
    const quoteId = String(body?.quote_id || '').trim()
    const turnstileToken = String(body?.turnstile_token || '').trim()
    const fullName = String(body?.full_name || '').trim().slice(0, 160)
    const customerEmail = String(body?.email || '').trim().toLowerCase().slice(0, 254)
    const message = String(body?.message || '').trim().slice(0, 5000)

    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{12}$/i.test(quoteId)) {
      return jsonResponse({ error: 'A valid enquiry reference is required.' }, 400)
    }
    if (!turnstileToken) return jsonResponse({ error: 'Security verification is required.' }, 400)
    if (fullName.length < 2) return jsonResponse({ error: 'Please provide your full name.' }, 400)
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(customerEmail)) {
      return jsonResponse({ error: 'Please provide a valid email address.' }, 400)
    }
    if (message.length < 5) return jsonResponse({ error: 'Please provide a little more information about your enquiry.' }, 400)

    const forwardedFor = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
    const remoteIp = request.headers.get('cf-connecting-ip') || forwardedFor || 'unknown'
    const ipHash = await sha256(remoteIp)

    const adminClient = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    })

    const { data: allowed, error: rateError } = await adminClient.rpc('consume_contact_rate_limit', {
      p_ip_hash: ipHash,
      p_limit: 5,
      p_window_seconds: 600,
    })

    if (rateError) throw new Error(`Rate-limit check failed: ${rateError.message}`)
    if (!allowed) return jsonResponse({ error: 'Too many enquiry attempts. Please try again later.' }, 429)

    const verified = await verifyTurnstile(turnstileSecret, turnstileToken, remoteIp)
    if (!verified) return jsonResponse({ error: 'Security verification failed. Please try again.' }, 400)

    const quote = {
      id: quoteId,
      full_name: fullName,
      company_name: cleanOptional(body?.company_name, 200),
      email: customerEmail,
      phone: cleanOptional(body?.phone, 80),
      product_name: cleanOptional(body?.product_name, 200),
      destination_country: cleanOptional(body?.destination_country, 120),
      message,
      status: 'new',
    }

    const { data: savedQuote, error: insertError } = await adminClient
      .from('quotes')
      .insert(quote)
      .select('id,full_name,company_name,email,phone,product_name,destination_country,message,created_at')
      .single()

    if (insertError || !savedQuote) {
      if (insertError?.code === '23505') {
        return jsonResponse({ error: 'This enquiry was already submitted.' }, 409)
      }
      throw new Error(`Unable to save enquiry: ${insertError?.message || 'unknown database error'}`)
    }

    if (!resendApiKey) {
      console.error('RESEND_API_KEY is not configured; enquiry saved without email notification.')
      return jsonResponse({ success: true, quoteId: savedQuote.id, notificationSent: false })
    }

    let quoteRecipient = fallbackRecipient
    const { data: recipientSetting, error: recipientError } = await adminClient
      .from('app_settings')
      .select('setting_value')
      .eq('setting_key', 'quote_notification_email')
      .maybeSingle()

    if (recipientError) {
      console.error('Unable to load quote notification recipient; using fallback:', recipientError)
    } else if (recipientSetting?.setting_value) {
      quoteRecipient = recipientSetting.setting_value
    }

    const submittedAt = new Date(savedQuote.created_at).toLocaleString('en-NG', { timeZone: 'Africa/Lagos' })
    const productName = savedQuote.product_name || 'General enquiry'
    const destination = savedQuote.destination_country || 'Not specified'
    const companyName = savedQuote.company_name || 'Individual buyer'
    const phone = savedQuote.phone || 'Not provided'

    const ownerEmail = {
      from: emailFrom,
      to: [quoteRecipient],
      reply_to: customerEmail,
      subject: `New quotation request: ${productName}`,
      html: `
        <div style="font-family:Arial,sans-serif;background:#f5f0e7;padding:32px;color:#172235">
          <div style="max-width:680px;margin:auto;background:#ffffff;border-top:5px solid #b88a2c;padding:32px">
            <p style="margin:0 0 8px;color:#b88a2c;font-weight:700;text-transform:uppercase;letter-spacing:1px">Shuaib Sulaiman & Co.</p>
            <h1 style="margin:0 0 24px;color:#061d39;font-size:28px">New quotation request</h1>
            <table style="width:100%;border-collapse:collapse">
              <tr><td style="padding:10px 0;font-weight:700">Customer</td><td style="padding:10px 0">${escapeHtml(fullName)}</td></tr>
              <tr><td style="padding:10px 0;font-weight:700">Company</td><td style="padding:10px 0">${escapeHtml(companyName)}</td></tr>
              <tr><td style="padding:10px 0;font-weight:700">Email</td><td style="padding:10px 0"><a href="mailto:${escapeHtml(customerEmail)}">${escapeHtml(customerEmail)}</a></td></tr>
              <tr><td style="padding:10px 0;font-weight:700">Phone</td><td style="padding:10px 0">${escapeHtml(phone)}</td></tr>
              <tr><td style="padding:10px 0;font-weight:700">Product</td><td style="padding:10px 0">${escapeHtml(productName)}</td></tr>
              <tr><td style="padding:10px 0;font-weight:700">Destination</td><td style="padding:10px 0">${escapeHtml(destination)}</td></tr>
              <tr><td style="padding:10px 0;font-weight:700">Submitted</td><td style="padding:10px 0">${escapeHtml(submittedAt)}</td></tr>
              <tr><td style="padding:10px 0;font-weight:700">Reference</td><td style="padding:10px 0">${escapeHtml(savedQuote.id)}</td></tr>
            </table>
            <div style="margin-top:24px;padding:20px;background:#f5f0e7;border-left:4px solid #b88a2c">
              <strong>Customer message</strong>
              <p style="white-space:pre-wrap;line-height:1.7;margin-bottom:0">${escapeHtml(message)}</p>
            </div>
          </div>
        </div>
      `,
    }

    try {
      const ownerResponse = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${resendApiKey}`,
          'Content-Type': 'application/json',
          'User-Agent': 'shuaib-sulaiman-website/1.0',
        },
        body: JSON.stringify(ownerEmail),
      })

      const ownerResult = await ownerResponse.json()
      if (!ownerResponse.ok) throw new Error(ownerResult?.message || 'Unable to send quote notification email.')

      const { error: updateError } = await adminClient
        .from('quotes')
        .update({ notification_sent_at: new Date().toISOString(), updated_at: new Date().toISOString() })
        .eq('id', savedQuote.id)
        .is('notification_sent_at', null)

      if (updateError) console.error('Unable to record notification timestamp:', updateError)

      return jsonResponse({ success: true, quoteId: savedQuote.id, notificationSent: true, emailId: ownerResult.id })
    } catch (emailError) {
      console.error('Quote notification email failed after enquiry was saved:', emailError)
      return jsonResponse({ success: true, quoteId: savedQuote.id, notificationSent: false })
    }
  } catch (error) {
    console.error('send-quote-email error:', error)
    return jsonResponse({ error: error instanceof Error ? error.message : 'Unexpected enquiry delivery error.' }, 500)
  }
})
