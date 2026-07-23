import { createClient } from '@supabase/supabase-js'

const url = process.env.VITE_SUPABASE_URL
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
const email = process.env.DEFAULT_ADMIN_EMAIL || 'admin@shuaibsulaiman.com'
const password = process.env.DEFAULT_ADMIN_PASSWORD

if (!url || !serviceRoleKey || !password) {
  console.error('Set VITE_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY and DEFAULT_ADMIN_PASSWORD first.')
  process.exit(1)
}

const supabase = createClient(url, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
})

const { data: usersData, error: listError } = await supabase.auth.admin.listUsers()
if (listError) throw listError

let user = usersData.users.find((item) => item.email?.toLowerCase() === email.toLowerCase())

if (!user) {
  const { data, error } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name: 'Default Super Administrator' },
  })
  if (error) throw error
  user = data.user
} else {
  const { data, error } = await supabase.auth.admin.updateUserById(user.id, {
    password,
    email_confirm: true,
    user_metadata: { full_name: 'Default Super Administrator' },
  })
  if (error) throw error
  user = data.user
}

const { error: profileError } = await supabase.from('profiles').upsert({
  id: user.id,
  full_name: 'Default Super Administrator',
  email,
  role: 'super_admin',
  is_active: true,
  must_change_password: true,
  updated_at: new Date().toISOString(),
}, { onConflict: 'id' })

if (profileError) throw profileError
console.log(`Administrator configured successfully: ${email}`)
