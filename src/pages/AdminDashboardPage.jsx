import { useEffect, useMemo, useState } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { isSupabaseConfigured, supabase } from '../lib/supabase'
import './Admin.css'
import './AdminPermissions.css'

const statuses = ['new', 'under_review', 'contacted', 'quotation_sent', 'won', 'lost', 'closed']
const roles = ['super_admin', 'admin', 'quote_manager', 'sales_officer', 'analytics_viewer', 'auditor']
const assignableStaffRoles = ['super_admin', 'admin', 'quote_manager', 'sales_officer']

const rolePermissions = {
  super_admin: ['Full system access', 'Create and manage users', 'Assign every role', 'Manage and assign enquiries', 'View analytics', 'View audit history', 'Change contact notification email', 'Reset passwords'],
  admin: ['Create and manage users', 'Assign non-super-admin roles', 'Manage and assign enquiries', 'View analytics', 'View audit history', 'Reset passwords'],
  quote_manager: ['View all enquiries', 'Update enquiry status', 'Assign enquiries', 'View staff directory'],
  sales_officer: ['View enquiries', 'Update enquiry status', 'Contact customers'],
  analytics_viewer: ['View enquiries', 'View dashboard analytics', 'Read-only access'],
  auditor: ['View enquiries', 'View users and roles', 'View analytics', 'Read-only audit access'],
}

const formatLabel = (value) => String(value || '').replaceAll('_', ' ')
const formatDateTime = (value) => value ? new Date(value).toLocaleString() : '—'

function AdminDashboardPage() {
  const navigate = useNavigate()
  const [session, setSession] = useState(undefined)
  const [profile, setProfile] = useState(null)
  const [quotes, setQuotes] = useState([])
  const [users, setUsers] = useState([])
  const [visits, setVisits] = useState([])
  const [auditLogs, setAuditLogs] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [filter, setFilter] = useState('all')
  const [search, setSearch] = useState('')
  const [section, setSection] = useState('overview')
  const [creating, setCreating] = useState(false)
  const [busyAction, setBusyAction] = useState('')
  const [notificationEmail, setNotificationEmail] = useState('')
  const [settingsUpdatedAt, setSettingsUpdatedAt] = useState(null)
  const [savingSettings, setSavingSettings] = useState(false)
  const [newUser, setNewUser] = useState({ fullName: '', email: '', password: '', role: 'sales_officer' })

  const role = profile?.role
  const canManageUsers = ['super_admin', 'admin'].includes(role)
  const canViewDirectory = ['super_admin', 'admin', 'quote_manager', 'auditor'].includes(role)
  const canUpdateQuoteStatus = ['super_admin', 'admin', 'quote_manager', 'sales_officer'].includes(role)
  const canAssignQuotes = ['super_admin', 'admin', 'quote_manager'].includes(role)
  const canViewAnalytics = ['super_admin', 'admin', 'analytics_viewer', 'auditor'].includes(role)
  const canViewAudit = ['super_admin', 'admin', 'auditor'].includes(role)
  const isSuperAdmin = role === 'super_admin'
  const assignableRoles = isSuperAdmin ? roles : roles.filter((item) => item !== 'super_admin')

  const invokeFunction = async (name, payload, unavailableMessage) => {
    const { data, error: functionError } = await supabase.functions.invoke(name, { body: payload })
    if (functionError) throw new Error(unavailableMessage)
    if (data?.error) throw new Error(data.error)
    return data
  }

  const callAdminFunction = (payload) => invokeFunction(
    'admin-users',
    payload,
    'The secured administration service is unavailable. Please try again.',
  )

  const callQuoteFunction = (payload) => invokeFunction(
    'admin-quotes',
    payload,
    'The secured enquiry service is unavailable. Please try again.',
  )

  const loadAuditLogs = async (activeRole) => {
    if (!['super_admin', 'admin', 'auditor'].includes(activeRole)) {
      setAuditLogs([])
      return
    }

    const { data, error: auditError } = await supabase
      .from('audit_logs')
      .select('id,actor_id,action,entity_type,entity_id,details,created_at')
      .order('created_at', { ascending: false })
      .limit(200)

    if (auditError) setError((current) => current || auditError.message)
    else setAuditLogs(data ?? [])
  }

  const loadData = async () => {
    setLoading(true)
    setError('')

    const { data: sessionData } = await supabase.auth.getSession()
    const currentSession = sessionData.session
    setSession(currentSession)

    if (!currentSession) {
      setLoading(false)
      return
    }

    const { data: profileData, error: profileError } = await supabase
      .from('profiles')
      .select('full_name,email,role,is_active,must_change_password')
      .eq('id', currentSession.user.id)
      .single()

    if (profileError) {
      setError(profileError.message)
      setLoading(false)
      return
    }

    if (!profileData?.is_active) {
      setProfile(null)
      setError('This administrator account is inactive.')
      setLoading(false)
      return
    }

    setProfile(profileData)

    if (profileData.must_change_password) {
      setLoading(false)
      navigate('/admin/change-password', { replace: true })
      return
    }

    const { data: quoteData, error: quoteError } = await supabase
      .from('quotes')
      .select('*')
      .order('created_at', { ascending: false })

    if (quoteError) setError(quoteError.message)
    else setQuotes(quoteData ?? [])

    if (['super_admin', 'admin', 'quote_manager', 'auditor'].includes(profileData.role)) {
      const { data: userData, error: usersError } = await supabase
        .from('profiles')
        .select('id,full_name,email,role,is_active,must_change_password,last_login_at,created_at')
        .order('created_at', { ascending: false })
      if (usersError) setError((current) => current || usersError.message)
      else setUsers(userData ?? [])
    } else {
      setUsers([])
    }

    if (['super_admin', 'admin', 'analytics_viewer', 'auditor'].includes(profileData.role)) {
      const { data: visitData, error: visitsError } = await supabase
        .from('visits')
        .select('id,page_path,referrer,user_agent,created_at')
        .order('created_at', { ascending: false })
        .limit(1000)
      if (visitsError) setError((current) => current || visitsError.message)
      else setVisits(visitData ?? [])
    } else {
      setVisits([])
    }

    await loadAuditLogs(profileData.role)

    if (profileData.role === 'super_admin') {
      try {
        const settingsData = await callAdminFunction({ action: 'get-settings' })
        setNotificationEmail(settingsData?.settings?.quoteNotificationEmail || 'sulaiman_shuaib@yahoo.com')
        setSettingsUpdatedAt(settingsData?.settings?.updatedAt || null)
      } catch (settingsError) {
        setError((current) => current || settingsError.message)
      }
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

  const userById = useMemo(() => new Map(users.map((user) => [user.id, user])), [users])
  const quoteAssignees = useMemo(
    () => users.filter((user) => user.is_active && assignableStaffRoles.includes(user.role)),
    [users],
  )

  const visibleQuotes = useMemo(() => {
    const needle = search.trim().toLowerCase()
    return quotes.filter((quote) => {
      if (filter !== 'all' && quote.status !== filter) return false
      if (!needle) return true
      return [
        quote.full_name,
        quote.company_name,
        quote.email,
        quote.phone,
        quote.product_name,
        quote.destination_country,
        quote.message,
      ].some((value) => String(value || '').toLowerCase().includes(needle))
    })
  }, [filter, quotes, search])

  const analytics = useMemo(() => {
    const now = Date.now()
    const sevenDaysAgo = now - (7 * 24 * 60 * 60 * 1000)
    const thirtyDaysAgo = now - (30 * 24 * 60 * 60 * 1000)
    const pageCounts = new Map()
    let last7Days = 0
    let last30Days = 0

    visits.forEach((visit) => {
      const time = new Date(visit.created_at).getTime()
      if (time >= sevenDaysAgo) last7Days += 1
      if (time >= thirtyDaysAgo) last30Days += 1
      pageCounts.set(visit.page_path, (pageCounts.get(visit.page_path) || 0) + 1)
    })

    const topPages = [...pageCounts.entries()]
      .map(([path, count]) => ({ path, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10)

    return { last7Days, last30Days, topPages, uniquePages: pageCounts.size }
  }, [visits])

  const createUser = async (event) => {
    event.preventDefault()
    setError('')
    setNotice('')
    setCreating(true)
    try {
      await callAdminFunction({ action: 'create', ...newUser })
      setNewUser({ fullName: '', email: '', password: '', role: 'sales_officer' })
      setNotice('User created successfully. They must change the temporary password on first sign-in.')
      await loadData()
    } catch (createError) {
      setError(createError.message)
    } finally {
      setCreating(false)
    }
  }

  const updateUser = async (userId, changes) => {
    const actionKey = `user:${userId}`
    setError('')
    setNotice('')
    setBusyAction(actionKey)
    try {
      await callAdminFunction({ action: 'update', userId, ...changes })
      setUsers((items) => items.map((item) => item.id === userId
        ? {
            ...item,
            ...(changes.role !== undefined ? { role: changes.role } : {}),
            ...(changes.isActive !== undefined ? { is_active: changes.isActive } : {}),
            ...(changes.fullName !== undefined ? { full_name: changes.fullName } : {}),
          }
        : item))
      setNotice('User updated successfully.')
      await loadAuditLogs(role)
    } catch (updateError) {
      setError(updateError.message)
    } finally {
      setBusyAction('')
    }
  }

  const resetPassword = async (user) => {
    const password = window.prompt(`Enter a new temporary password for ${user.email}. Minimum 10 characters.`)
    if (!password) return

    const actionKey = `reset:${user.id}`
    setError('')
    setNotice('')
    setBusyAction(actionKey)
    try {
      await callAdminFunction({ action: 'reset-password', userId: user.id, password })
      setUsers((items) => items.map((item) => item.id === user.id ? { ...item, must_change_password: true } : item))
      setNotice(`Password reset successfully for ${user.email}. They must change it on next sign-in.`)
      await loadAuditLogs(role)
    } catch (resetError) {
      setError(resetError.message)
    } finally {
      setBusyAction('')
    }
  }

  const updateQuoteStatus = async (quoteId, status) => {
    const actionKey = `status:${quoteId}`
    setError('')
    setNotice('')
    setBusyAction(actionKey)
    try {
      const data = await callQuoteFunction({ action: 'update-status', quoteId, status })
      setQuotes((items) => items.map((item) => item.id === quoteId ? { ...item, ...data.quote } : item))
      setNotice('Enquiry status updated.')
      await loadAuditLogs(role)
    } catch (statusError) {
      setError(statusError.message)
    } finally {
      setBusyAction('')
    }
  }

  const assignQuote = async (quoteId, assignedTo) => {
    const actionKey = `assign:${quoteId}`
    setError('')
    setNotice('')
    setBusyAction(actionKey)
    try {
      const data = await callQuoteFunction({ action: 'assign', quoteId, assignedTo: assignedTo || null })
      setQuotes((items) => items.map((item) => item.id === quoteId ? { ...item, ...data.quote } : item))
      setNotice(assignedTo ? 'Enquiry assigned successfully.' : 'Enquiry assignment cleared.')
      await loadAuditLogs(role)
    } catch (assignmentError) {
      setError(assignmentError.message)
    } finally {
      setBusyAction('')
    }
  }

  const saveNotificationEmail = async (event) => {
    event.preventDefault()
    setError('')
    setNotice('')
    setSavingSettings(true)
    try {
      const data = await callAdminFunction({ action: 'update-notification-email', email: notificationEmail })
      setNotificationEmail(data.settings.quoteNotificationEmail)
      setSettingsUpdatedAt(data.settings.updatedAt)
      setNotice('Contact-form notification email updated successfully.')
      await loadAuditLogs(role)
    } catch (settingsError) {
      setError(settingsError.message)
    } finally {
      setSavingSettings(false)
    }
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
          <p>{profile ? `${profile.full_name} · ${formatLabel(profile.role)}` : session.user.email}</p>
        </div>
        <div className="admin-header-actions">
          <button type="button" className="admin-secondary-button" onClick={loadData}>Refresh</button>
          <a href="/">View website</a>
          <button type="button" onClick={signOut}>Sign out</button>
        </div>
      </header>

      <nav className="admin-tabs" aria-label="Admin sections">
        <button className={section === 'overview' ? 'active' : ''} onClick={() => setSection('overview')}>Overview</button>
        <button className={section === 'enquiries' ? 'active' : ''} onClick={() => setSection('enquiries')}>Enquiries</button>
        {canViewDirectory && <button className={section === 'users' ? 'active' : ''} onClick={() => setSection('users')}>Users &amp; roles</button>}
        {canViewAnalytics && <button className={section === 'analytics' ? 'active' : ''} onClick={() => setSection('analytics')}>Analytics</button>}
        {canViewAudit && <button className={section === 'audit' ? 'active' : ''} onClick={() => setSection('audit')}>Audit log</button>}
        <button className={section === 'settings' ? 'active' : ''} onClick={() => setSection('settings')}>Settings</button>
      </nav>

      {error && <div className="admin-error admin-wide-error" role="alert">{error}</div>}
      {notice && <div className="admin-alert admin-wide-error" role="status">{notice}</div>}

      {section === 'overview' && <>
        <section className="admin-summary-grid">
          <article><strong>{quotes.length}</strong><span>Total enquiries</span></article>
          <article><strong>{quotes.filter((quote) => quote.status === 'new').length}</strong><span>New enquiries</span></article>
          <article><strong>{quotes.filter((quote) => quote.status === 'won').length}</strong><span>Won</span></article>
          <article><strong>{canViewAnalytics ? analytics.last30Days : '—'}</strong><span>Visits · 30 days</span></article>
        </section>

        <div className="admin-overview-grid">
          <section className="admin-panel">
            <div className="admin-panel-heading"><div><h2>Enquiry pipeline</h2><p>Current volume by status.</p></div></div>
            <div className="admin-status-grid">
              {statuses.map((status) => (
                <button key={status} type="button" onClick={() => { setFilter(status); setSection('enquiries') }}>
                  <strong>{quotes.filter((quote) => quote.status === status).length}</strong>
                  <span>{formatLabel(status)}</span>
                </button>
              ))}
            </div>
          </section>

          <section className="admin-panel">
            <div className="admin-panel-heading"><div><h2>Recent enquiries</h2><p>Latest customer requests.</p></div></div>
            <div className="admin-compact-list">
              {quotes.slice(0, 5).map((quote) => (
                <button key={quote.id} type="button" onClick={() => { setSearch(quote.email); setSection('enquiries') }}>
                  <span><strong>{quote.full_name}</strong><small>{quote.product_name || 'General enquiry'}</small></span>
                  <span className="admin-badge active">{formatLabel(quote.status)}</span>
                </button>
              ))}
              {!quotes.length && <p className="admin-empty">No enquiries yet.</p>}
            </div>
          </section>
        </div>
      </>}

      {section === 'enquiries' && <section className="admin-panel">
        <div className="admin-panel-heading admin-toolbar-heading">
          <div><h2>Customer enquiries</h2><p>Search, assign and update customer requests.</p></div>
          <div className="admin-toolbar">
            <input
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search customer, email, product…"
              aria-label="Search enquiries"
            />
            <select value={filter} onChange={(event) => setFilter(event.target.value)} aria-label="Filter enquiry status">
              <option value="all">All statuses</option>
              {statuses.map((status) => <option key={status} value={status}>{formatLabel(status)}</option>)}
            </select>
            {(filter !== 'all' || search) && <button type="button" className="admin-secondary-button" onClick={() => { setFilter('all'); setSearch('') }}>Clear</button>}
          </div>
        </div>

        <div className="admin-table-wrap"><table><thead><tr><th>Date</th><th>Customer</th><th>Product</th><th>Destination</th><th>Contact</th><th>Assigned to</th><th>Status</th></tr></thead>
          <tbody>{visibleQuotes.map((quote) => {
            const assignee = quote.assigned_to ? userById.get(quote.assigned_to) : null
            return <tr key={quote.id}>
              <td>{new Date(quote.created_at).toLocaleDateString()}</td>
              <td><strong>{quote.full_name}</strong><span>{quote.company_name || 'Individual buyer'}</span><small>{quote.message}</small></td>
              <td>{quote.product_name || 'General enquiry'}</td>
              <td>{quote.destination_country || 'Not specified'}</td>
              <td><a href={`mailto:${quote.email}`}>{quote.email}</a><span>{quote.phone || 'No phone'}</span></td>
              <td>{canAssignQuotes
                ? <select
                    value={quote.assigned_to || ''}
                    disabled={busyAction === `assign:${quote.id}`}
                    onChange={(event) => assignQuote(quote.id, event.target.value)}
                    aria-label={`Assign enquiry from ${quote.full_name}`}
                  >
                    <option value="">Unassigned</option>
                    {quoteAssignees.map((user) => <option key={user.id} value={user.id}>{user.full_name} · {formatLabel(user.role)}</option>)}
                  </select>
                : <span>{assignee?.full_name || 'Unassigned'}</span>}
              </td>
              <td>{canUpdateQuoteStatus
                ? <select
                    value={quote.status}
                    disabled={busyAction === `status:${quote.id}`}
                    onChange={(event) => updateQuoteStatus(quote.id, event.target.value)}
                    aria-label={`Update status for ${quote.full_name}`}
                  >
                    {statuses.map((status) => <option key={status} value={status}>{formatLabel(status)}</option>)}
                  </select>
                : <span>{formatLabel(quote.status)}</span>}
              </td>
            </tr>
          })}{!visibleQuotes.length && <tr><td colSpan="7" className="admin-empty">No enquiries match your filters.</td></tr>}</tbody>
        </table></div>
      </section>}

      {section === 'users' && canViewDirectory && <>
        {canManageUsers && <div className="admin-users-layout">
          <section className="admin-panel">
            <div className="admin-panel-heading"><div><h2>Create user</h2><p>Create a confirmed staff account and assign its role.</p></div></div>
            <form className="admin-user-form" onSubmit={createUser}>
              <label>Full name<input required value={newUser.fullName} onChange={(event) => setNewUser({ ...newUser, fullName: event.target.value })} /></label>
              <label>Email<input required type="email" value={newUser.email} onChange={(event) => setNewUser({ ...newUser, email: event.target.value })} /></label>
              <label>Temporary password<input required minLength="10" type="password" value={newUser.password} onChange={(event) => setNewUser({ ...newUser, password: event.target.value })} /></label>
              <label>Role<select value={newUser.role} onChange={(event) => setNewUser({ ...newUser, role: event.target.value })}>{assignableRoles.map((item) => <option key={item} value={item}>{formatLabel(item)}</option>)}</select></label>
              <button disabled={creating}>{creating ? 'Creating…' : 'Create user'}</button>
            </form>
          </section>

          <section className="admin-panel admin-user-table-panel">
            <div className="admin-panel-heading"><div><h2>Users and roles</h2><p>Change permissions, activate accounts and reset passwords.</p></div></div>
            <div className="admin-table-wrap"><table><thead><tr><th>User</th><th>Role</th><th>Status</th><th>Created</th><th>Actions</th></tr></thead>
              <tbody>{users.map((user) => {
                const canModifyUser = isSuperAdmin || user.role !== 'super_admin'
                const rowBusy = busyAction.includes(user.id)
                return <tr key={user.id}>
                  <td><strong>{user.full_name}</strong><span>{user.email}</span>{user.must_change_password && <small>Password change required</small>}</td>
                  <td><select disabled={!canModifyUser || rowBusy} value={user.role} onChange={(event) => updateUser(user.id, { role: event.target.value })}>{(user.role === 'super_admin' && !assignableRoles.includes('super_admin') ? roles : assignableRoles).map((item) => <option key={item} value={item}>{formatLabel(item)}</option>)}</select></td>
                  <td><span className={user.is_active ? 'admin-badge active' : 'admin-badge'}>{user.is_active ? 'Active' : 'Inactive'}</span></td>
                  <td>{new Date(user.created_at).toLocaleDateString()}</td>
                  <td><div className="admin-row-actions"><button disabled={!canModifyUser || rowBusy} onClick={() => updateUser(user.id, { isActive: !user.is_active })}>{user.is_active ? 'Deactivate' : 'Activate'}</button><button disabled={!canModifyUser || rowBusy} onClick={() => resetPassword(user)}>Reset password</button></div></td>
                </tr>
              })}{!users.length && <tr><td colSpan="5" className="admin-empty">No users found.</td></tr>}</tbody>
            </table></div>
          </section>
        </div>}

        {!canManageUsers && <section className="admin-panel">
          <div className="admin-panel-heading"><div><h2>Staff directory</h2><p>Your role has read-only access to staff information.</p></div></div>
          <div className="admin-table-wrap"><table><thead><tr><th>User</th><th>Role</th><th>Status</th><th>Created</th></tr></thead>
            <tbody>{users.map((user) => <tr key={user.id}><td><strong>{user.full_name}</strong><span>{user.email}</span></td><td>{formatLabel(user.role)}</td><td><span className={user.is_active ? 'admin-badge active' : 'admin-badge'}>{user.is_active ? 'Active' : 'Inactive'}</span></td><td>{new Date(user.created_at).toLocaleDateString()}</td></tr>)}</tbody>
          </table></div>
        </section>}

        <section className="admin-panel admin-permissions-panel">
          <div className="admin-panel-heading"><div><h2>Roles and permissions</h2><p>Access granted to each administrator role.</p></div></div>
          <div className="admin-permission-grid">
            {roles.map((item) => (
              <article key={item}>
                <h3>{formatLabel(item)}</h3>
                <ul>{rolePermissions[item].map((permission) => <li key={permission}>{permission}</li>)}</ul>
              </article>
            ))}
          </div>
        </section>
      </>}

      {section === 'analytics' && canViewAnalytics && <>
        <section className="admin-summary-grid">
          <article><strong>{visits.length}</strong><span>Recent tracked visits</span></article>
          <article><strong>{analytics.last7Days}</strong><span>Visits · 7 days</span></article>
          <article><strong>{analytics.last30Days}</strong><span>Visits · 30 days</span></article>
          <article><strong>{analytics.uniquePages}</strong><span>Pages visited</span></article>
        </section>

        <div className="admin-overview-grid">
          <section className="admin-panel">
            <div className="admin-panel-heading"><div><h2>Top pages</h2><p>Most frequently recorded paths in the loaded visit history.</p></div></div>
            <div className="admin-ranking-list">
              {analytics.topPages.map((page, index) => <div key={page.path}><span>{index + 1}. {page.path}</span><strong>{page.count}</strong></div>)}
              {!analytics.topPages.length && <p className="admin-empty">No visitor data has been recorded yet.</p>}
            </div>
          </section>

          <section className="admin-panel">
            <div className="admin-panel-heading"><div><h2>Recent visits</h2><p>Latest public-page activity.</p></div></div>
            <div className="admin-table-wrap"><table className="admin-compact-table"><thead><tr><th>Time</th><th>Page</th><th>Referrer</th></tr></thead><tbody>
              {visits.slice(0, 20).map((visit) => <tr key={visit.id}><td>{formatDateTime(visit.created_at)}</td><td>{visit.page_path}</td><td>{visit.referrer || 'Direct / unknown'}</td></tr>)}
              {!visits.length && <tr><td colSpan="3" className="admin-empty">No visits recorded.</td></tr>}
            </tbody></table></div>
          </section>
        </div>
      </>}

      {section === 'audit' && canViewAudit && <section className="admin-panel">
        <div className="admin-panel-heading"><div><h2>Audit history</h2><p>Recent administrative actions recorded by the secured backend.</p></div><button type="button" className="admin-secondary-button" onClick={() => loadAuditLogs(role)}>Refresh log</button></div>
        <div className="admin-table-wrap"><table><thead><tr><th>Time</th><th>Actor</th><th>Action</th><th>Entity</th><th>Details</th></tr></thead><tbody>
          {auditLogs.map((log) => <tr key={log.id}><td>{formatDateTime(log.created_at)}</td><td>{userById.get(log.actor_id)?.full_name || (log.actor_id ? 'System user' : 'System')}</td><td>{formatLabel(log.action)}</td><td>{log.entity_type}{log.entity_id ? ` · ${log.entity_id}` : ''}</td><td><small className="admin-json-details">{log.details ? JSON.stringify(log.details) : '—'}</small></td></tr>)}
          {!auditLogs.length && <tr><td colSpan="5" className="admin-empty">No audit events found.</td></tr>}
        </tbody></table></div>
      </section>}

      {section === 'settings' && <>
        <section className="admin-panel admin-settings-panel">
          <div className="admin-panel-heading"><div><h2>Account &amp; system</h2><p>Current production configuration and signed-in account.</p></div></div>
          <dl><div><dt>Signed-in email</dt><dd>{session.user.email}</dd></div><div><dt>Role</dt><dd>{formatLabel(profile?.role || 'Unknown')}</dd></div><div><dt>Enquiry storage</dt><dd>Supabase · public.quotes</dd></div><div><dt>User authentication</dt><dd>Supabase Auth</dd></div></dl>
        </section>

        {isSuperAdmin && <section className="admin-panel">
          <div className="admin-panel-heading"><div><h2>Contact-form notifications</h2><p>Choose the inbox that receives new website enquiry notifications. This changes the recipient only; customer data continues to be stored in Supabase first.</p></div></div>
          <form className="admin-setting-form" onSubmit={saveNotificationEmail}>
            <label>
              Notification email
              <input type="email" required maxLength="254" value={notificationEmail} onChange={(event) => setNotificationEmail(event.target.value)} />
            </label>
            <button type="submit" disabled={savingSettings}>{savingSettings ? 'Saving…' : 'Save notification email'}</button>
          </form>
          <p className="admin-setting-note">Current default: <strong>sulaiman_shuaib@yahoo.com</strong>. Last setting update: {formatDateTime(settingsUpdatedAt)}.</p>
        </section>}

        {!isSuperAdmin && <section className="admin-panel admin-access-panel"><h2>Protected application settings</h2><p>Only a <strong>super admin</strong> can change the email address that receives website contact-form notifications.</p></section>}
      </>}
    </main>
  )
}

export default AdminDashboardPage
