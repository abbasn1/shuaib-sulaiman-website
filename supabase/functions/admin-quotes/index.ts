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

const validStatuses = ['new', 'under_review', 'contacted', 'quotation_sent', 'won', 'lost', 'closed']
const statusRoles = ['super_admin', 'admin', 'quote_manager', 'sales_officer']
const assignmentRoles = ['super_admin', 'admin', 'quote_manager']
const assignableStaffRoles = ['super_admin', 'admin', 'quote_manager', 'sales_officer']

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  if (request.method !== 'POST') return jsonResponse({ error: 'Method not allowed.' }, 405)

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY')
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    const authHeader = request.headers.get('Authorization') ?? ''

    if (!supabaseUrl || !anonKey || !serviceRoleKey) {
      return jsonResponse({ error: 'Quote administration service configuration is incomplete.' }, 503)
    }

    const callerClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
      auth: { persistSession: false, autoRefreshToken: false },
    })
    const adminClient = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    })

    const { data: userData, error: userError } = await callerClient.auth.getUser()
    if (userError || !userData.user) return jsonResponse({ error: 'Unauthenticated request.' }, 401)

    const { data: callerProfile, error: callerError } = await adminClient
      .from('profiles')
      .select('id,role,is_active,must_change_password')
      .eq('id', userData.user.id)
      .single()

    if (callerError || !callerProfile?.is_active) return jsonResponse({ error: 'This account is not authorised.' }, 403)
    if (callerProfile.must_change_password) return jsonResponse({ error: 'Change your password before managing enquiries.' }, 403)

    const body = await request.json()
    const action = String(body?.action || '')
    const quoteId = String(body?.quoteId || '').trim()

    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{12}$/i.test(quoteId)) {
      return jsonResponse({ error: 'A valid enquiry reference is required.' }, 400)
    }

    const { data: quote, error: quoteError } = await adminClient
      .from('quotes')
      .select('id,status,assigned_to,updated_at')
      .eq('id', quoteId)
      .single()

    if (quoteError || !quote) return jsonResponse({ error: 'Enquiry not found.' }, 404)

    const writeAudit = async (auditAction: string, details: Record<string, unknown>) => {
      const { error } = await adminClient.from('audit_logs').insert({
        actor_id: userData.user.id,
        action: auditAction,
        entity_type: 'quote',
        entity_id: quoteId,
        details,
      })
      if (error) console.error('Audit log write failed:', error)
    }

    if (action === 'update-status') {
      if (!statusRoles.includes(callerProfile.role)) return jsonResponse({ error: 'You cannot update enquiry status.' }, 403)

      const status = String(body?.status || '')
      if (!validStatuses.includes(status)) return jsonResponse({ error: 'Invalid enquiry status.' }, 400)

      const { data: updatedQuote, error } = await adminClient
        .from('quotes')
        .update({ status, updated_at: new Date().toISOString() })
        .eq('id', quoteId)
        .select('id,status,assigned_to,updated_at')
        .single()

      if (error) throw error
      await writeAudit('quote_status_updated', { previous_status: quote.status, status })
      return jsonResponse({ success: true, quote: updatedQuote })
    }

    if (action === 'assign') {
      if (!assignmentRoles.includes(callerProfile.role)) return jsonResponse({ error: 'You cannot assign enquiries.' }, 403)

      const assignedTo = body?.assignedTo ? String(body.assignedTo) : null
      if (assignedTo) {
        const { data: assignee, error: assigneeError } = await adminClient
          .from('profiles')
          .select('id,role,is_active')
          .eq('id', assignedTo)
          .single()

        if (assigneeError || !assignee?.is_active || !assignableStaffRoles.includes(assignee.role)) {
          return jsonResponse({ error: 'Select an active staff member who can manage enquiries.' }, 400)
        }
      }

      const { data: updatedQuote, error } = await adminClient
        .from('quotes')
        .update({ assigned_to: assignedTo, updated_at: new Date().toISOString() })
        .eq('id', quoteId)
        .select('id,status,assigned_to,updated_at')
        .single()

      if (error) throw error
      await writeAudit('quote_assignment_updated', { previous_assigned_to: quote.assigned_to, assigned_to: assignedTo })
      return jsonResponse({ success: true, quote: updatedQuote })
    }

    return jsonResponse({ error: 'Unsupported action.' }, 400)
  } catch (error) {
    console.error('admin-quotes error:', error)
    return jsonResponse({ error: error instanceof Error ? error.message : 'Unexpected quote administration error.' }, 400)
  }
})
