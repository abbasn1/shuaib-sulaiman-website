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

const assignableRoles = ['super_admin', 'admin', 'quote_manager', 'sales_officer', 'analytics_viewer', 'auditor']
const adminAssignableRoles = assignableRoles.filter((role) => role !== 'super_admin')

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  if (req.method !== 'POST') return jsonResponse({ error: 'Method not allowed.' }, 405)

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY')
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    const authHeader = req.headers.get('Authorization') ?? ''

    if (!supabaseUrl || !anonKey || !serviceRoleKey) {
      return jsonResponse({ error: 'Administrative service configuration is incomplete.' }, 503)
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

    if (callerError || !callerProfile?.is_active) {
      return jsonResponse({ error: 'This account is not authorised.' }, 403)
    }

    const body = await req.json()
    const action = String(body?.action || '')

    const writeAudit = async (
      auditAction: string,
      entityType: string,
      entityId: string | null,
      details: Record<string, unknown> = {},
    ) => {
      const { error } = await adminClient.from('audit_logs').insert({
        actor_id: userData.user.id,
        action: auditAction,
        entity_type: entityType,
        entity_id: entityId,
        details,
      })
      if (error) console.error('Audit log write failed:', error)
    }

    if (action === 'change-own-password') {
      const password = String(body.password || '')
      if (password.length < 10) throw new Error('Password must contain at least 10 characters.')

      const { error } = await adminClient.auth.admin.updateUserById(userData.user.id, { password })
      if (error) throw error

      const { error: profileError } = await adminClient
        .from('profiles')
        .update({ must_change_password: false, updated_at: new Date().toISOString() })
        .eq('id', userData.user.id)
      if (profileError) throw profileError

      await writeAudit('password_changed', 'profile', userData.user.id)
      return jsonResponse({ success: true })
    }

    if (callerProfile.must_change_password) {
      return jsonResponse({ error: 'Change your password before using administrative actions.' }, 403)
    }

    if (!['super_admin', 'admin'].includes(callerProfile.role)) {
      return jsonResponse({ error: 'You are not authorised to manage users.' }, 403)
    }

    const callerIsSuperAdmin = callerProfile.role === 'super_admin'

    const validateRole = (role: string) => {
      const allowed = callerIsSuperAdmin ? assignableRoles : adminAssignableRoles
      if (!allowed.includes(role)) throw new Error('You are not authorised to assign that role.')
    }

    const getTargetProfile = async (userId: string) => {
      const { data, error } = await adminClient
        .from('profiles')
        .select('id,role,is_active,email,full_name')
        .eq('id', userId)
        .single()
      if (error || !data) throw new Error('Target user profile was not found.')
      if (!callerIsSuperAdmin && data.role === 'super_admin') {
        throw new Error('Administrators cannot modify super administrator accounts.')
      }
      return data
    }

    const protectLastSuperAdmin = async (
      target: { id: string; role: string; is_active: boolean },
      nextRole: string | undefined,
      nextActive: boolean | undefined,
    ) => {
      const removesActiveSuperAdmin = target.role === 'super_admin'
        && target.is_active
        && ((nextRole !== undefined && nextRole !== 'super_admin') || nextActive === false)

      if (!removesActiveSuperAdmin) return

      const { count, error } = await adminClient
        .from('profiles')
        .select('id', { count: 'exact', head: true })
        .eq('role', 'super_admin')
        .eq('is_active', true)
        .neq('id', target.id)

      if (error) throw error
      if (!count) throw new Error('At least one active super administrator must remain.')
    }

    if (action === 'create') {
      const email = String(body.email || '').trim().toLowerCase()
      const password = String(body.password || '')
      const fullName = String(body.fullName || '').trim()
      const role = String(body.role || 'sales_officer')

      if (!email || !password || !fullName) throw new Error('Full name, email and password are required.')
      if (password.length < 10) throw new Error('Password must contain at least 10 characters.')
      validateRole(role)

      const { data, error } = await adminClient.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: { full_name: fullName },
      })
      if (error) throw error

      const { error: profileError } = await adminClient.from('profiles').upsert({
        id: data.user.id,
        full_name: fullName,
        email,
        role,
        is_active: true,
        must_change_password: true,
      })

      if (profileError) {
        await adminClient.auth.admin.deleteUser(data.user.id)
        throw profileError
      }

      await writeAudit('user_created', 'profile', data.user.id, { role })
      return jsonResponse({ user: data.user })
    }

    if (action === 'update') {
      const userId = String(body.userId || '')
      const role = body.role === undefined ? undefined : String(body.role)
      const isActive = body.isActive === undefined ? undefined : Boolean(body.isActive)
      const fullName = body.fullName === undefined ? undefined : String(body.fullName).trim()

      if (!userId) throw new Error('User ID is required.')
      const target = await getTargetProfile(userId)
      if (role !== undefined) validateRole(role)
      if (fullName !== undefined && !fullName) throw new Error('Full name cannot be empty.')

      await protectLastSuperAdmin(target, role, isActive)

      const updates: Record<string, unknown> = { updated_at: new Date().toISOString() }
      if (role !== undefined) updates.role = role
      if (isActive !== undefined) updates.is_active = isActive
      if (fullName !== undefined) updates.full_name = fullName

      const { error } = await adminClient.from('profiles').update(updates).eq('id', userId)
      if (error) throw error

      await writeAudit('user_updated', 'profile', userId, {
        previous_role: target.role,
        role: role ?? target.role,
        previous_is_active: target.is_active,
        is_active: isActive ?? target.is_active,
      })
      return jsonResponse({ success: true })
    }

    if (action === 'reset-password') {
      const userId = String(body.userId || '')
      const password = String(body.password || '')
      if (!userId || !password) throw new Error('User ID and password are required.')
      if (password.length < 10) throw new Error('Password must contain at least 10 characters.')
      await getTargetProfile(userId)

      const { error } = await adminClient.auth.admin.updateUserById(userId, { password })
      if (error) throw error

      const { error: profileError } = await adminClient.from('profiles').update({
        must_change_password: true,
        updated_at: new Date().toISOString(),
      }).eq('id', userId)
      if (profileError) throw profileError

      await writeAudit('password_reset', 'profile', userId)
      return jsonResponse({ success: true })
    }

    return jsonResponse({ error: 'Unsupported action.' }, 400)
  } catch (error) {
    console.error('admin-users error:', error)
    return jsonResponse({ error: error instanceof Error ? error.message : 'Unexpected error' }, 400)
  }
})
