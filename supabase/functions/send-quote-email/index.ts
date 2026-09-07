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

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  if (request.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed.' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  try {
    const resendApiKey = Deno.env.get('RESEND_API_KEY')
    const emailFrom = Deno.env.get('QUOTE_EMAIL_FROM') || 'Shuaib Sulaiman & Co <onboarding@resend.dev>'
    const quoteRecipient = Deno.env.get('QUOTE_NOTIFICATION_EMAIL') || 'shuaibsgeneralcontractors@gmail.com'

    if (!resendApiKey) {
      throw new Error('RESEND_API_KEY is not configured in Supabase Edge Function secrets.')
    }

    const quote = await request.json()
    const fullName = String(quote.full_name || '').trim()
    const customerEmail = String(quote.email || '').trim()
    const message = String(quote.message || '').trim()

    if (!fullName || !customerEmail || !message) {
      return new Response(JSON.stringify({ error: 'Full name, email and message are required.' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const submittedAt = quote.submitted_at
      ? new Date(quote.submitted_at).toLocaleString('en-NG', { timeZone: 'Africa/Lagos' })
      : new Date().toLocaleString('en-NG', { timeZone: 'Africa/Lagos' })

    const productName = quote.product_name || 'General enquiry'
    const destination = quote.destination_country || 'Not specified'
    const companyName = quote.company_name || 'Individual buyer'
    const phone = quote.phone || 'Not provided'
    const quoteId = quote.quote_id || 'Not available'

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
              <tr><td style="padding:10px 0;font-weight:700">Reference</td><td style="padding:10px 0">${escapeHtml(quoteId)}</td></tr>
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

    if (!ownerResponse.ok) {
      throw new Error(ownerResult?.message || 'Unable to send quote notification email.')
    }

    return new Response(JSON.stringify({ success: true, emailId: ownerResult.id }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (error) {
    console.error('send-quote-email error:', error)

    return new Response(JSON.stringify({
      error: error instanceof Error ? error.message : 'Unexpected email delivery error.',
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
