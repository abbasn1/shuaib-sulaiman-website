import { useEffect, useMemo, useState } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { isSupabaseConfigured, supabase } from '../lib/supabase'
import './Admin.css'
import './AdminPermissions.css'

const statuses = ['new', 'under_review', 'contacted', 'quotation_sent', 'won', 'lost', 'closed']
const roles = ['super_admin', 'admin', 'quote_manager', 'sales_officer', 'analytics_viewer', 'auditor']

const rolePermissions = {
  super_admin: ['Full system access', 'Create and manage users', 'Assign every role', 'Manage enquiries', 'View analytics', 'Reset passwords'],
  admin: ['Create and manage users', 'Assign staff roles', 'Manage enquiries', 'View analytics', 'Reset passwords'],
  quote_manager: ['View all enquiries', 'Update enquiry status', 'Assign and manage quotations'],
  sales_officer: ['View enquiries', 'Update enquiry status', 'Contact customers'],
  analytics_viewer: ['View enquiries', 'View dashboard totals and analytics', 'Read-only access'],
  auditor: ['View enquiries', 'View users and roles', 'Read-only audit access'],
}

function AdminDashboardPage() {
  const navigate = useNavigate()
  const [session, setSession] = useState(undefined)
  const [profile, setProfile] = useState(null)
  const [quotes, setQuotes] = useState([])
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [filter, setFilter] = useState('all')
  const [section, setSection] = useState('enquiries')
  const [creating, setCreating] = useState(false)
  const [newUser, setNewUser] = useState({ fullName: '', email: '', password: '', role: 'sales_officer' })

  const canManageUsers = ['super_admin', 'admin'].includes(profile?.role)

  const loadData = async () => {
    const { data: sessionData } = await supabase.auth.getSession()
    const currentSession = sessionData.session
    setSession(currentSession)

    if (!currentSession) {
      setLoading(false)
      return
    }

    const [{ data: profileData, error: profileError }, { data: quoteData, error: quoteError }] = await Promise.all([
      supabase.from('profiles').select('full_name,email,role,is_active').eq('id', currentSession.user.id).single(),
      supabase.from('quotes').select('*').order('created_at', { ascending: false }),
    ])

    if (profileError) setError(profileError.message)
    else if (!profileData?.is_active) setError('This administrator account is inactive.')
    else setProfile(profileData)

    if (quoteError) setError((current) => current || quoteError.message)
    else setQuotes(quoteData ?? [])

    if (['super_admin', 'admin'].includes(profileData?.role)) {
      const { data: userData, error: usersError } = await supabase
        .from('profiles')
        .select('id,full_name,email,role,is_active,must_change_password,last_login_at,created_at')
        .order('created_at', { ascending: false })
      if (usersError) setError((current) => current || usersError.message)
      else setUsers(userData ?? [])
    }

    setLoading(false)
  }

  useEffect(() => {
    if (!supabase) {
      setSession(null)
      setLoading(false)
      return
    }
    loadData()
  }, [])

  const visibleQuotes = useMemo(
    () => filter === 'all' ? quotes : quotes.filter((quote) => quote.status === filter),
    [filter, quotes],
  )

  const callAdminFunction = async (payload) => {
    setError('')
    setNotice('')
    const { data, error: functionError } = await supabase.functions.invoke('admin-users', { body: payload })
    if (functionError) throw functionError
    if (data?.error) throw new Error(data.error)
    return data
  }

  const createUser = async (event) => {
    event.preventDefault()
    setCreating(true)
    try {
      await callAdminFunction({ action: 'create', ...newUser })
      setNewUser({ fullName: '', email: '', password: '', role: 'sales_officer' })
      setNotice('User created successfully. The account is active and the email is confirmed.')
      await loadData()
    } catch (createError) {
      setError(createError.message)
    } finally {
      setCreating(false)
    }
  }

  const updateUser = async (userId, changes) => {
    try {
      await callAdminFunction({ action: 'update', userId, ...changes })
      setUsers((items) => items.map((item) => item.id === userId ? { ...item, ...changes, ...(changes.isActive !== undefined ? { is_active: changes.isActive } : {}) } : item))
      setNotice('User updated successfully.')
    } catch (updateError) {
      setError(updateError.message)
    }
  }

  const resetPassword = async (user) => {
    const password = window.prompt(`Enter a new password for ${user.email}. Minimum 8 characters.`)
    if (!password) return
    try {
      await callAdminFunction({ action: 'reset-password', userId: user.id, password })
      setNotice(`Password reset successfully for ${user.email}.`)
    } catch (resetError) {
      setError(resetError.message)
    }
  }

  const updateStatus = async (id, status) => {
    const { error: updateError } = await supabase
      .from('quotes')
      .update({ status, updated_at: new Date().toISOString() })
      .eq('id', id)

    if (updateError) {
      setError(updateError.message)
      return
    }

    setQuotes((items) => items.map((item) => item.id === id ? { ...item, status } : item))
  }

  const signOut = async () => {
    await supabase?.auth.signOut()
    navigate('/admin', { replace: true })
  }

  if (!isSupabaseConfigured) {
    return <main className="admin-state"><h1>Admin unavailable</h1><p>Add the Supabase environment variables in Cloudflare Pages.</p></main>
  }

  if (loading || session === undefined) return <main className="admin-state"><p>Loading dashboard…</p></main>
  if (!session) return <Navigate to="/admin" replace />

  return (
    <main className="admin-dashboard-shell">
      <header className="admin-dashboard-header">
        <div>
          <p className="admin-kicker">Shuaib Sulaiman & Co.</p>
          <h1>Administration</h1>
          <p>{profile ? `${profile.full_name} · ${profile.role}` : session.user.email}</p>
        </div>
        <div className="admin-header-actions">
          <a href="/">View website</a>
          <button type="button" onClick={signOut}>Sign out</button>
        </div>
      </header>

      <nav className="admin-tabs" aria-label="Admin sections">
        <button className={section === 'enquiries' ? 'active' : ''} onClick={() => setSection('enquiries')}>Enquiries</button>
        <button className={section === 'users' ? 'active' : ''} onClick={() => setSection('users')}>Users & roles</button>
        <button className={section === 'settings' ? 'active' : ''} onClick={() => setSection('settings')}>Settings</button>
      </nav>

      {error && <div className="admin-error admin-wide-error">{error}</div>}
      {notice && <div className="admin-alert admin-wide-error">{notice}</div>}

      {section === 'enquiries' && <>
        <section className="admin-summary-grid">
          <article><strong>{quotes.length}</strong><span>Total enquiries</span></article>
          <article><strong>{quotes.filter((quote) => quote.status === 'new').length}</strong><span>New</span></article>
          <article><strong>{quotes.filter((quote) => quote.status === 'won').length}</strong><span>Won</span></article>
          <article><strong>{quotes.filter((quote) => quote.status === 'closed').length}</strong><span>Closed</span></article>
        </section>

        <section className="admin-panel">
          <div className="admin-panel-heading">
            <div><h2>Customer enquiries</h2><p>Review product requests and update their progress.</p></div>
            <select value={filter} onChange={(event) => setFilter(event.target.value)}>
              <option value="all">All statuses</option>
              {statuses.map((status) => <option key={status} value={status}>{status.replaceAll('_', ' ')}</option>)}
            </select>
          </div>
          <div className="admin-table-wrap"><table><thead><tr><th>Date</th><th>Customer</th><th>Product</th><th>Destination</th><th>Contact</th><th>Status</th></tr></thead>
            <tbody>{visibleQuotes.map((quote) => <tr key={quote.id}>
              <td>{new Date(quote.created_at).toLocaleDateString()}</td>
              <td><strong>{quote.full_name}</strong><span>{quote.company_name || 'Individual buyer'}</span><small>{quote.message}</small></td>
              <td>{quote.product_name || 'General enquiry'}</td>
              <td>{quote.destination_country || 'Not specified'}</td>
              <td><a href={`mailto:${quote.email}`}>{quote.email}</a><span>{quote.phone || 'No phone'}</span></td>
              <td><select value={quote.status} onChange={(event) => updateStatus(quote.id, event.target.value)}>{statuses.map((status) => <option key={status} value={status}>{status.replaceAll('_', ' ')}</option>)}</select></td>
            </tr>)}{!visibleQuotes.length && <tr><td colSpan="6" className="admin-empty">No enquiries found.</td></tr>}</tbody>
          </table></div>
        </section>
      </>}

      {section === 'users' && <>
        {!canManageUsers && (
          <section className="admin-panel admin-access-panel">
            <h2>User management access required</h2>
            <p>Your current role is <strong>{profile?.role || 'not configured'}</strong>. Only a <strong>super admin</strong> or <strong>admin</strong> can create users, change roles, activate accounts, or reset passwords.</p>
            <p>Run the included <code>supabase/bootstrap-admin.sql</code> script in the Supabase SQL Editor to promote your account.</p>
          </section>
        )}

        {canManageUsers && <div className="admin-users-layout">
          <section className="admin-panel">
            <div className="admin-panel-heading"><div><h2>Create user</h2><p>Create a confirmed staff account and assign its role.</p></div></div>
            <form className="admin-user-form" onSubmit={createUser}>
              <label>Full name<input required value={newUser.fullName} onChange={(event) => setNewUser({ ...newUser, fullName: event.target.value })} /></label>
              <label>Email<input required type="email" value={newUser.email} onChange={(event) => setNewUser({ ...newUser, email: event.target.value })} /></label>
              <label>Temporary password<input required minLength="8" type="password" value={newUser.password} onChange={(event) => setNewUser({ ...newUser, password: event.target.value })} /></label>
              <label>Role<select value={newUser.role} onChange={(event) => setNewUser({ ...newUser, role: event.target.value })}>{roles.map((role) => <option key={role} value={role}>{role.replaceAll('_', ' ')}</option>)}</select></label>
              <button disabled={creating}>{creating ? 'Creating…' : 'Create user'}</button>
            </form>
          </section>

          <section className="admin-panel">
            <div className="admin-panel-heading"><div><h2>Users and roles</h2><p>Change permissions, activate accounts and reset passwords.</p></div></div>
            <div className="admin-table-wrap"><table><thead><tr><th>User</th><th>Role</th><th>Status</th><th>Created</th><th>Actions</th></tr></thead>
              <tbody>{users.map((user) => <tr key={user.id}>
                <td><strong>{user.full_name}</strong><span>{user.email}</span></td>
                <td><select value={user.role} onChange={(event) => updateUser(user.id, { role: event.target.value })}>{roles.map((role) => <option key={role} value={role}>{role.replaceAll('_', ' ')}</option>)}</select></td>
                <td><span className={user.is_active ? 'admin-badge active' : 'admin-badge'}>{user.is_active ? 'Active' : 'Inactive'}</span></td>
                <td>{new Date(user.created_at).toLocaleDateString()}</td>
                <td><div className="admin-row-actions"><button onClick={() => updateUser(user.id, { isActive: !user.is_active })}>{user.is_active ? 'Deactivate' : 'Activate'}</button><button onClick={() => resetPassword(user)}>Reset password</button></div></td>
              </tr>)}{!users.length && <tr><td colSpan="5" className="admin-empty">No users found.</td></tr>}</tbody>
            </table></div>
          </section>
        </div>}

        <section className="admin-panel admin-permissions-panel">
          <div className="admin-panel-heading"><div><h2>Roles and permissions</h2><p>Access granted to each administrator role.</p></div></div>
          <div className="admin-permission-grid">
            {roles.map((role) => (
              <article key={role}>
                <h3>{role.replaceAll('_', ' ')}</h3>
                <ul>{rolePermissions[role].map((permission) => <li key={permission}>{permission}</li>)}</ul>
              </article>
            ))}
          </div>
        </section>
      </>}

      {section === 'settings' && <section className="admin-panel admin-settings-panel">
        <div className="admin-panel-heading"><div><h2>Settings</h2><p>Current production configuration and account information.</p></div></div>
        <dl><div><dt>Signed-in email</dt><dd>{session.user.email}</dd></div><div><dt>Role</dt><dd>{profile?.role || 'Unknown'}</dd></div><div><dt>Enquiry storage</dt><dd>Supabase · public.quotes</dd></div><div><dt>User authentication</dt><dd>Supabase Auth</dd></div></dl>
      </section>}
    </main>
  )
}

export default AdminDashboardPage
