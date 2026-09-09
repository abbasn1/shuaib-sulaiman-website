import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.4'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}
const jsonResponse = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
const validStatuses = ['new', 'under_review', 'approved', 'contacted', 'quotation_sent', 'won', 'lost', 'closed']
const statusRoles = ['super_admin', 'admin', 'quote_manager', 'sales_officer']
const assignmentRoles = ['super_admin', 'admin', 'quote_manager']
const approvalRoles = ['super_admin', 'admin']
const assignableStaffRoles = ['super_admin', 'admin', 'quote_manager', 'sales_officer']
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const esc = (v: unknown) => String(v ?? '').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;').replaceAll("'",'&#039;')

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  if (request.method !== 'POST') return jsonResponse({ error: 'Method not allowed.' }, 405)
  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY')
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    const authHeader = request.headers.get('Authorization') ?? ''
    if (!supabaseUrl || !anonKey || !serviceRoleKey) return jsonResponse({ error: 'Quote administration service configuration is incomplete.' }, 503)

    const callerClient = createClient(supabaseUrl, anonKey, { global: { headers: { Authorization: authHeader } }, auth: { persistSession: false, autoRefreshToken: false } })
    const adminClient = createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false, autoRefreshToken: false } })
    const { data: userData, error: userError } = await callerClient.auth.getUser()
    if (userError || !userData.user) return jsonResponse({ error: 'Unauthenticated request.' }, 401)

    const { data: callerProfile, error: callerError } = await adminClient.from('profiles').select('id,role,is_active,must_change_password,full_name,email').eq('id', userData.user.id).single()
    if (callerError || !callerProfile?.is_active) return jsonResponse({ error: 'This account is not authorised.' }, 403)
    if (callerProfile.must_change_password) return jsonResponse({ error: 'Change your password before managing enquiries.' }, 403)

    const body = await request.json()
    const action = String(body?.action || '')
    const quoteId = String(body?.quoteId || '').trim()
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{12}$/i.test(quoteId)) return jsonResponse({ error: 'A valid enquiry reference is required.' }, 400)

    const { data: quote, error: quoteError } = await adminClient.from('quotes').select('id,status,assigned_to,updated_at,full_name,company_name,email,phone,product_name,destination_country,message,created_at').eq('id', quoteId).single()
    if (quoteError || !quote) return jsonResponse({ error: 'Enquiry not found.' }, 404)

    if (callerProfile.role === 'sales_officer' && quote.assigned_to !== userData.user.id) return jsonResponse({ error: 'This enquiry is not assigned to you.' }, 403)

    const writeAudit = async (auditAction: string, details: Record<string, unknown>) => {
      const { error } = await adminClient.from('audit_logs').insert({ actor_id: userData.user.id, action: auditAction, entity_type: 'quote', entity_id: quoteId, details })
      if (error) console.error('Audit log write failed:', error)
    }

    const loadResendKey = async () => {
      const envKey = Deno.env.get('RESEND_API_KEY')
      if (envKey) return envKey
      const { data } = await adminClient.from('integration_secrets').select('secret_value').eq('secret_key', 'resend_api_key').maybeSingle()
      return data?.secret_value || ''
    }

    if (action === 'approve') {
      if (!approvalRoles.includes(callerProfile.role)) return jsonResponse({ error: 'Only an administrator can approve an enquiry.' }, 403)
      const { data: updatedQuote, error } = await adminClient.from('quotes').update({ status: 'approved', updated_at: new Date().toISOString() }).eq('id', quoteId).select('id,status,assigned_to,updated_at').single()
      if (error) throw error
      await writeAudit('quote_approved', { previous_status: quote.status, status: 'approved' })
      return jsonResponse({ success: true, quote: updatedQuote })
    }

    if (action === 'update-status') {
      if (!statusRoles.includes(callerProfile.role)) return jsonResponse({ error: 'You cannot update enquiry status.' }, 403)
      const status = String(body?.status || '')
      if (!validStatuses.includes(status)) return jsonResponse({ error: 'Invalid enquiry status.' }, 400)
      if (status === 'approved' && !approvalRoles.includes(callerProfile.role)) return jsonResponse({ error: 'Only an administrator can approve an enquiry.' }, 403)
      const { data: updatedQuote, error } = await adminClient.from('quotes').update({ status, updated_at: new Date().toISOString() }).eq('id', quoteId).select('id,status,assigned_to,updated_at').single()
      if (error) throw error
      await writeAudit('quote_status_updated', { previous_status: quote.status, status })
      return jsonResponse({ success: true, quote: updatedQuote })
    }

    if (action === 'assign') {
      if (!assignmentRoles.includes(callerProfile.role)) return jsonResponse({ error: 'You cannot assign enquiries.' }, 403)
      const assignedTo = body?.assignedTo ? String(body.assignedTo) : null
      let assignee: any = null
      if (assignedTo) {
        const { data, error: assigneeError } = await adminClient.from('profiles').select('id,role,is_active,email,full_name').eq('id', assignedTo).single()
        assignee = data
        if (assigneeError || !assignee?.is_active || !assignableStaffRoles.includes(assignee.role)) return jsonResponse({ error: 'Select an active staff member who can manage enquiries.' }, 400)
        if (!emailPattern.test(String(assignee.email || '')) || String(assignee.email || '').length > 254) return jsonResponse({ error: 'The selected user does not have a valid email address. Update the user before assigning work.' }, 400)
      }

      const { data: updatedQuote, error } = await adminClient.from('quotes').update({ assigned_to: assignedTo, updated_at: new Date().toISOString() }).eq('id', quoteId).select('id,status,assigned_to,updated_at').single()
      if (error) throw error

      let notificationSent = false
      let notificationError: string | null = null
      if (assignee) {
        try {
          const resendKey = await loadResendKey()
          if (!resendKey) throw new Error('Resend is not configured.')
          const emailFrom = Deno.env.get('QUOTE_EMAIL_FROM') || 'Shuaib Sulaiman & Co <onboarding@resend.dev>'
          const response = await fetch('https://api.resend.com/emails', {
            method: 'POST',
            headers: { Authorization: `Bearer ${resendKey}`, 'Content-Type': 'application/json', 'User-Agent': 'shuaib-sulaiman-website/1.0' },
            body: JSON.stringify({
              from: emailFrom,
              to: [assignee.email],
              reply_to: callerProfile.email || undefined,
              subject: `Enquiry assigned to you: ${quote.product_name || 'Customer enquiry'}`,
              html: `<div style="font-family:Arial,sans-serif;color:#172235"><h2>New enquiry assignment</h2><p>Hello ${esc(assignee.full_name)},</p><p>An enquiry has been assigned to you in the Shuaib Sulaiman & Co. admin dashboard.</p><p><strong>Customer:</strong> ${esc(quote.full_name)}</p><p><strong>Company:</strong> ${esc(quote.company_name || '—')}</p><p><strong>Product:</strong> ${esc(quote.product_name || 'General enquiry')}</p><p><strong>Destination:</strong> ${esc(quote.destination_country || '—')}</p><p><strong>Reference:</strong> ${esc(quote.id)}</p><p>Sign in to the admin dashboard to review and respond.</p></div>`
            })
          })
          const result = await response.json()
          if (!response.ok) throw new Error(result?.message || `Resend returned HTTP ${response.status}.`)
          notificationSent = true
        } catch (notificationFailure) {
          notificationError = notificationFailure instanceof Error ? notificationFailure.message.slice(0, 300) : 'Assignment notification failed.'
          console.error('Assignment notification failed:', notificationError)
        }
      }

      await writeAudit('quote_assignment_updated', {
        previous_assigned_to: quote.assigned_to,
        assigned_to: assignedTo,
        assignment_email: assignee?.email || null,
        assignment_notification_sent: notificationSent,
        assignment_notification_error: notificationError,
      })
      return jsonResponse({ success: true, quote: updatedQuote, notificationSent, notificationError })
    }

    return jsonResponse({ error: 'Unsupported action.' }, 400)
  } catch (error) {
    console.error('admin-quotes error:', error)
    return jsonResponse({ error: error instanceof Error ? error.message : 'Unexpected quote administration error.' }, 400)
  }
})
