import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.4'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

const jsonResponse = (body: unknown, status = 200) => new Response(JSON.stringify(body), {
  status,
  headers: { ...corsHeaders, 'Content-Type': 'application/json' },
})

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
const replyRoles = ['super_admin', 'admin', 'quote_manager', 'sales_officer']
const escapeHtml = (value: unknown) => String(value ?? '')
  .replaceAll('&', '&amp;')
  .replaceAll('<', '&lt;')
  .replaceAll('>', '&gt;')
  .replaceAll('"', '&quot;')
  .replaceAll("'", '&#039;')

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  if (request.method !== 'POST') return jsonResponse({ error: 'Method not allowed.' }, 405)

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY')
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    let resendApiKey = Deno.env.get('RESEND_API_KEY') || ''
    const emailFrom = Deno.env.get('QUOTE_EMAIL_FROM') || 'Shuaib Sulaiman & Co <onboarding@resend.dev>'
    const authHeader = request.headers.get('Authorization') ?? ''

    if (!supabaseUrl || !anonKey || !serviceRoleKey) {
      return jsonResponse({ error: 'Reply service configuration is incomplete.' }, 503)
    }

    const callerClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
      auth: { persistSession: false, autoRefreshToken: false },
    })
    const adminClient = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    })

    if (!resendApiKey) {
      const { data: secretRow, error: secretError } = await adminClient
        .from('integration_secrets')
        .select('secret_value')
        .eq('secret_key', 'resend_api_key')
        .maybeSingle()
      if (secretError) console.error('Unable to load Resend credential:', secretError.message)
      resendApiKey = secretRow?.secret_value || ''
    }

    if (!resendApiKey) return jsonResponse({ error: 'Reply email provider is not configured.' }, 503)

    const { data: userData, error: userError } = await callerClient.auth.getUser()
    if (userError || !userData.user) return jsonResponse({ error: 'Unauthenticated request.' }, 401)

    const { data: profile, error: profileError } = await adminClient
      .from('profiles')
      .select('id,full_name,email,role,is_active,must_change_password')
      .eq('id', userData.user.id)
      .single()

    if (profileError || !profile?.is_active) return jsonResponse({ error: 'This account is not authorised.' }, 403)
    if (profile.must_change_password) return jsonResponse({ error: 'Change your password before replying to enquiries.' }, 403)
    if (!replyRoles.includes(profile.role)) return jsonResponse({ error: 'Your role cannot send customer replies.' }, 403)

    const body = await request.json()
    const quoteId = String(body?.quoteId || '').trim()
    const replyBody = String(body?.body || '').trim().slice(0, 6000)
    const requestedSubject = String(body?.subject || '').trim().slice(0, 200)

    if (!uuidPattern.test(quoteId)) return jsonResponse({ error: 'A valid enquiry reference is required.' }, 400)
    if (replyBody.length < 2) return jsonResponse({ error: 'Write a reply before sending.' }, 400)

    const { data: quote, error: quoteError } = await adminClient
      .from('quotes')
      .select('id,full_name,company_name,email,product_name,destination_country,message,status,assigned_to,created_at')
      .eq('id', quoteId)
      .single()

    if (quoteError || !quote) return jsonResponse({ error: 'Enquiry not found.' }, 404)

    const subject = requestedSubject || `Re: ${quote.product_name || 'Your enquiry to Shuaib Sulaiman & Co.'}`

    let replyTo = profile.email
    const { data: setting } = await adminClient
      .from('app_settings')
      .select('setting_value')
      .eq('setting_key', 'quote_notification_email')
      .maybeSingle()
    if (setting?.setting_value) replyTo = setting.setting_value

    const html = `
      <div style="font-family:Arial,sans-serif;background:#f4f6f7;padding:32px;color:#0b2239">
        <div style="max-width:680px;margin:auto;background:#ffffff;border-top:5px solid #1f5a46;padding:32px">
          <p style="margin:0 0 8px;color:#b58b3a;font-weight:700">Shuaib Sulaiman & Co.</p>
          <h1 style="margin:0 0 24px;font-size:24px;color:#0b2239">Response to your enquiry</h1>
          <p>Hello ${escapeHtml(quote.full_name)},</p>
          <div style="white-space:pre-wrap;line-height:1.75">${escapeHtml(replyBody)}</div>
          <p style="margin-top:28px">Regards,<br><strong>${escapeHtml(profile.full_name)}</strong><br>Shuaib Sulaiman & Co.</p>
          <hr style="border:0;border-top:1px solid #e5e7eb;margin:28px 0">
          <p style="font-size:13px;color:#64748b">Enquiry reference: ${escapeHtml(quote.id)}</p>
        </div>
      </div>
    `

    const emailResponse = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${resendApiKey}`,
        'Content-Type': 'application/json',
        'User-Agent': 'shuaib-sulaiman-website/1.0',
      },
      body: JSON.stringify({
        from: emailFrom,
        to: [quote.email],
        reply_to: replyTo,
        subject,
        html,
      }),
    })

    const emailResult = await emailResponse.json()
    if (!emailResponse.ok) {
      console.error('Resend reply error:', emailResult)
      return jsonResponse({ error: emailResult?.message || 'Unable to send the customer reply.' }, 502)
    }

    const { data: responseRecord, error: responseError } = await adminClient
      .from('quote_responses')
      .insert({
        quote_id: quote.id,
        staff_id: userData.user.id,
        recipient_email: quote.email,
        subject,
        body: replyBody,
        resend_email_id: emailResult.id || null,
      })
      .select('id,quote_id,staff_id,recipient_email,subject,body,resend_email_id,created_at')
      .single()

    if (responseError) {
      console.error('Reply sent but conversation history could not be stored:', responseError)
      return jsonResponse({ error: 'The email was sent, but its conversation record could not be saved. Contact an administrator.' }, 500)
    }

    let nextStatus = quote.status
    if (quote.status === 'new') {
      nextStatus = 'contacted'
      const { error: statusError } = await adminClient.from('quotes').update({
        status: nextStatus,
        updated_at: new Date().toISOString(),
      }).eq('id', quote.id)
      if (statusError) console.error('Reply sent but quote status update failed:', statusError)
    }

    const { error: auditError } = await adminClient.from('audit_logs').insert({
      actor_id: userData.user.id,
      action: 'quote_reply_sent',
      entity_type: 'quote',
      entity_id: quote.id,
      details: {
        recipient_email: quote.email,
        response_id: responseRecord.id,
        previous_status: quote.status,
        status: nextStatus,
      },
    })
    if (auditError) console.error('Audit log write failed:', auditError)

    return jsonResponse({ success: true, response: responseRecord, status: nextStatus, emailId: emailResult.id || null })
  } catch (error) {
    console.error('reply-to-quote error:', error)
    return jsonResponse({ error: error instanceof Error ? error.message : 'Unexpected reply error.' }, 500)
  }
})
