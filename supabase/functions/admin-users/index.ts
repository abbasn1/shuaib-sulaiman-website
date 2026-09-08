import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.4'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const jsonResponse = (body: unknown, status = 200) => new Response(JSON.stringify(body), {
  status,
  headers: { ...corsHeaders, 'Content-Type': 'application/json' },
})

const assignableRoles = ['super_admin', 'admin', 'quote_manager', 'sales_officer', 'analytics_viewer', 'auditor']
const adminAssignableRoles = assignableRoles.filter((role) => role !== 'super_admin')

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const authHeader = req.headers.get('Authorization') ?? ''

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
      .select('id,role,is_active')
      .eq('id', userData.user.id)
      .single()

    if (callerError || !callerProfile?.is_active || !['super_admin', 'admin'].includes(callerProfile.role)) {
      return jsonResponse({ error: 'You are not authorised to manage users.' }, 403)
    }

    const body = await req.json()
    const action = body.action
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

    if (action === 'create') {
      const { email, password, fullName, role = 'sales_officer' } = body
      if (!email || !password || !fullName) throw new Error('Full name, email and password are required.')
      if (password.length < 8) throw new Error('Password must contain at least 8 characters.')
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
      if (profileError) throw profileError

      return jsonResponse({ user: data.user })
    }

    if (action === 'update') {
      const { userId, role, isActive, fullName } = body
      if (!userId) throw new Error('User ID is required.')
      await getTargetProfile(userId)
      if (role !== undefined) validateRole(role)

      const updates: Record<string, unknown> = { updated_at: new Date().toISOString() }
      if (role !== undefined) updates.role = role
      if (isActive !== undefined) updates.is_active = Boolean(isActive)
      if (fullName !== undefined) updates.full_name = String(fullName).trim()

      const { error } = await adminClient.from('profiles').update(updates).eq('id', userId)
      if (error) throw error
      return jsonResponse({ success: true })
    }

    if (action === 'reset-password') {
      const { userId, password } = body
      if (!userId || !password) throw new Error('User ID and password are required.')
      if (password.length < 8) throw new Error('Password must contain at least 8 characters.')
      await getTargetProfile(userId)

      const { error } = await adminClient.auth.admin.updateUserById(userId, { password })
      if (error) throw error
      await adminClient.from('profiles').update({
        must_change_password: true,
        updated_at: new Date().toISOString(),
      }).eq('id', userId)

      return jsonResponse({ success: true })
    }

    throw new Error('Unsupported action.')
  } catch (error) {
    return jsonResponse({ error: error instanceof Error ? error.message : 'Unexpected error' }, 400)
  }
})
