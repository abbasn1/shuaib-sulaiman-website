import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const authHeader = req.headers.get('Authorization') ?? ''

    const callerClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    })
    const adminClient = createClient(supabaseUrl, serviceRoleKey)

    const { data: userData, error: userError } = await callerClient.auth.getUser()
    if (userError || !userData.user) throw new Error('Unauthenticated request.')

    const { data: callerProfile, error: callerError } = await adminClient
      .from('profiles')
      .select('role,is_active')
      .eq('id', userData.user.id)
      .single()

    if (callerError || !callerProfile?.is_active || !['super_admin', 'admin'].includes(callerProfile.role)) {
      return new Response(JSON.stringify({ error: 'You are not authorised to manage users.' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const body = await req.json()
    const action = body.action

    if (action === 'create') {
      const { email, password, fullName, role = 'sales_officer' } = body
      if (!email || !password || !fullName) throw new Error('Full name, email and password are required.')
      if (password.length < 8) throw new Error('Password must contain at least 8 characters.')

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

      return new Response(JSON.stringify({ user: data.user }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    if (action === 'update') {
      const { userId, role, isActive, fullName } = body
      if (!userId) throw new Error('User ID is required.')
      const updates: Record<string, unknown> = { updated_at: new Date().toISOString() }
      if (role !== undefined) updates.role = role
      if (isActive !== undefined) updates.is_active = isActive
      if (fullName !== undefined) updates.full_name = fullName

      const { error } = await adminClient.from('profiles').update(updates).eq('id', userId)
      if (error) throw error
      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    if (action === 'reset-password') {
      const { userId, password } = body
      if (!userId || !password) throw new Error('User ID and password are required.')
      if (password.length < 8) throw new Error('Password must contain at least 8 characters.')

      const { error } = await adminClient.auth.admin.updateUserById(userId, { password })
      if (error) throw error
      await adminClient.from('profiles').update({ must_change_password: false }).eq('id', userId)

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    throw new Error('Unsupported action.')
  } catch (error) {
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : 'Unexpected error' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
