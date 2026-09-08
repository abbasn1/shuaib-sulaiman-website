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

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  if (request.method !== 'POST') return jsonResponse({ error: 'Method not allowed.' }, 405)

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    const resendApiKey = Deno.env.get('RESEND_API_KEY')
    const emailFrom = Deno.env.get('QUOTE_EMAIL_FROM') || 'Shuaib Sulaiman & Co <onboarding@resend.dev>'
    const quoteRecipient = Deno.env.get('QUOTE_NOTIFICATION_EMAIL') || 'sulaiman_shuaib@yahoo.com'
    const turnstileSecret = Deno.env.get('TURNSTILE_SECRET_KEY')

    if (!supabaseUrl || !serviceRoleKey) throw new Error('Supabase server credentials are not configured.')
    if (!resendApiKey) throw new Error('RESEND_API_KEY is not configured in Supabase Edge Function secrets.')

    const body = await request.json()
    const quoteId = String(body?.quote_id || '').trim()
    const turnstileToken = String(body?.turnstile_token || '').trim()

    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(quoteId)) {
      return jsonResponse({ error: 'A valid enquiry reference is required.' }, 400)
    }

    const forwardedFor = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
    const remoteIp = request.headers.get('cf-connecting-ip') || forwardedFor || 'unknown'
    const userAgent = request.headers.get('user-agent') || 'unknown'
    const ipHash = await sha256(`${remoteIp}|${userAgent}`)

    const adminClient = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    })

    const { data: allowed, error: rateError } = await adminClient.rpc('consume_contact_rate_limit', {
      p_ip_hash: ipHash,
      p_limit: 5,
      p_window_seconds: 600,
    })

    if (rateError) throw new Error(`Rate-limit check failed: ${rateError.message}`)
    if (!allowed) return jsonResponse({ error: 'Too many notification attempts. Please try again later.' }, 429)

    // Turnstile becomes mandatory as soon as the server-side secret is provisioned.
    if (turnstileSecret) {
      if (!turnstileToken) return jsonResponse({ error: 'Security verification is required.' }, 400)
      const verified = await verifyTurnstile(turnstileSecret, turnstileToken, remoteIp)
      if (!verified) return jsonResponse({ error: 'Security verification failed. Please try again.' }, 400)
    } else {
      console.warn('TURNSTILE_SECRET_KEY is not configured; Turnstile verification is not active yet.')
    }

    // Never trust customer fields sent by the browser. The saved row is authoritative.
    const { data: quote, error: quoteError } = await adminClient
      .from('quotes')
      .select('id,full_name,company_name,email,phone,product_name,destination_country,message,created_at,notification_sent_at')
      .eq('id', quoteId)
      .single()

    if (quoteError || !quote) return jsonResponse({ error: 'The saved enquiry could not be verified.' }, 404)

    if (quote.notification_sent_at) {
      return jsonResponse({ success: true, alreadyNotified: true })
    }

    const quoteAgeMs = Date.now() - new Date(quote.created_at).getTime()
    if (!Number.isFinite(quoteAgeMs) || quoteAgeMs < -60_000 || quoteAgeMs > 24 * 60 * 60 * 1000) {
      return jsonResponse({ error: 'The enquiry reference is no longer eligible for automatic notification.' }, 400)
    }

    const fullName = String(quote.full_name || '').trim()
    const customerEmail = String(quote.email || '').trim()
    const message = String(quote.message || '').trim()

    if (!fullName || !customerEmail || !message) {
      return jsonResponse({ error: 'The saved enquiry is incomplete.' }, 400)
    }

    const submittedAt = new Date(quote.created_at).toLocaleString('en-NG', { timeZone: 'Africa/Lagos' })
    const productName = quote.product_name || 'General enquiry'
    const destination = quote.destination_country || 'Not specified'
    const companyName = quote.company_name || 'Individual buyer'
    const phone = quote.phone || 'Not provided'

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
              <tr><td style="padding:10px 0;font-weight:700">Reference</td><td style="padding:10px 0">${escapeHtml(quote.id)}</td></tr>
            </table>
            <div style="margin-top:24px;padding:20px;background:#f5f0e7;border-left:4px solid #b88a2c">
              <strong>Customer message</strong>
              <p style="white-space:pre-wrap;line-height:1.7;margin-bottom:0">${escapeHtml(message)}</p>
            </div>
          </div>
        </div>
      `,
    }

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
      .eq('id', quote.id)
      .is('notification_sent_at', null)

    if (updateError) console.error('Unable to record notification timestamp:', updateError)

    return jsonResponse({ success: true, emailId: ownerResult.id })
  } catch (error) {
    console.error('send-quote-email error:', error)
    return jsonResponse({ error: error instanceof Error ? error.message : 'Unexpected email delivery error.' }, 500)
  }
})
