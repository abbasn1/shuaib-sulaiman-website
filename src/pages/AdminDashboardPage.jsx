import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { isSupabaseConfigured, supabase } from '../lib/supabase'
import './Admin.css'
import './AdminPermissions.css'
import './AdminOperations.css'

const statuses = ['new', 'under_review', 'contacted', 'quotation_sent', 'won', 'lost', 'closed']
const roles = ['super_admin', 'admin', 'quote_manager', 'sales_officer', 'analytics_viewer', 'auditor', 'content_editor']
const assignableStaffRoles = ['super_admin', 'admin', 'quote_manager', 'sales_officer']
const replyRoles = ['super_admin', 'admin', 'quote_manager', 'sales_officer']

const formatLabel = (value) => String(value || '').replaceAll('_', ' ')
const formatDateTime = (value) => value ? new Date(value).toLocaleString() : '—'
const linesToArray = (value) => String(value || '').split('\n').map((item) => item.trim()).filter(Boolean)
const objectToLines = (value) => Object.entries(value || {}).map(([key, item]) => `${key}: ${item}`).join('\n')
const linesToObject = (value) => Object.fromEntries(
  String(value || '')
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const separator = line.indexOf(':')
      return separator > 0
        ? [line.slice(0, separator).trim(), line.slice(separator + 1).trim()]
        : [line, '']
    })
    .filter(([key, item]) => key && item),
)

const emptyProductForm = {
  id: '',
  name: '',
  slug: '',
  category: '',
  imageUrl: '',
  summary: '',
  overview: '',
  benefits: '',
  applications: '',
  specifications: '',
  packaging: '',
  qualityPoints: '',
  sortOrder: 100,
  isPublished: false,
}

const emptyTestimonialForm = {
  id: '',
  sourceQuoteId: '',
  buyerName: '',
  companyName: '',
  roleOrMarket: '',
  quoteText: '',
  isPublished: false,
}

const productRowToForm = (product) => ({
  id: product.id,
  name: product.name || '',
  slug: product.slug || '',
  category: product.category || '',
  imageUrl: product.image_url || '',
  summary: product.summary || '',
  overview: product.overview || '',
  benefits: (product.benefits || []).join('\n'),
  applications: (product.applications || []).join('\n'),
  specifications: objectToLines(product.specifications),
  packaging: (product.packaging || []).join('\n'),
  qualityPoints: (product.quality_points || []).join('\n'),
  sortOrder: product.sort_order ?? 0,
  isPublished: Boolean(product.is_published),
})

const testimonialRowToForm = (testimonial) => ({
  id: testimonial.id,
  sourceQuoteId: testimonial.source_quote_id || '',
  buyerName: testimonial.buyer_name || '',
  companyName: testimonial.company_name || '',
  roleOrMarket: testimonial.role_or_market || '',
  quoteText: testimonial.quote_text || '',
  isPublished: Boolean(testimonial.is_published),
})

function AdminDashboardPage() {
  const navigate = useNavigate()
  const knownQuoteIds = useRef(new Set())
  const initialQuoteLoadDone = useRef(false)

  const [session, setSession] = useState(undefined)
  const [profile, setProfile] = useState(null)
  const [quotes, setQuotes] = useState([])
  const [users, setUsers] = useState([])
  const [visits, setVisits] = useState([])
  const [auditLogs, setAuditLogs] = useState([])
  const [products, setProducts] = useState([])
  const [testimonials, setTestimonials] = useState([])
  const [testimonialCandidates, setTestimonialCandidates] = useState([])
  const [responses, setResponses] = useState([])

  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [busyAction, setBusyAction] = useState('')
  const [section, setSection] = useState('overview')
  const [filter, setFilter] = useState('all')
  const [search, setSearch] = useState('')
  const [newEnquiryCount, setNewEnquiryCount] = useState(0)
  const [selectedQuoteId, setSelectedQuoteId] = useState('')
  const [loadingResponses, setLoadingResponses] = useState(false)
  const [replySubject, setReplySubject] = useState('')
  const [replyBody, setReplyBody] = useState('')
  const [sendingReply, setSendingReply] = useState(false)

  const [creatingUser, setCreatingUser] = useState(false)
  const [newUser, setNewUser] = useState({ fullName: '', email: '', password: '', role: 'sales_officer' })
  const [notificationEmail, setNotificationEmail] = useState('')
  const [settingsUpdatedAt, setSettingsUpdatedAt] = useState(null)
  const [savingSettings, setSavingSettings] = useState(false)
  const [productForm, setProductForm] = useState(emptyProductForm)
  const [savingProduct, setSavingProduct] = useState(false)
  const [testimonialForm, setTestimonialForm] = useState(emptyTestimonialForm)
  const [savingTestimonial, setSavingTestimonial] = useState(false)

  const role = profile?.role
  const isSuperAdmin = role === 'super_admin'
  const canManageContent = ['super_admin', 'content_editor'].includes(role)
  const canManageUsers = ['super_admin', 'admin'].includes(role)
  const canViewDirectory = ['super_admin', 'admin', 'quote_manager', 'auditor'].includes(role)
  const canUpdateQuoteStatus = ['super_admin', 'admin', 'quote_manager', 'sales_officer'].includes(role)
  const canAssignQuotes = ['super_admin', 'admin', 'quote_manager'].includes(role)
  const canReply = replyRoles.includes(role)
  const canViewAnalytics = ['super_admin', 'admin', 'analytics_viewer', 'auditor'].includes(role)
  const canViewAudit = ['super_admin', 'admin', 'auditor'].includes(role)
  const assignableRoles = isSuperAdmin ? roles : roles.filter((item) => item !== 'super_admin')

  const invokeSecuredFunction = useCallback(async (name, payload, fallbackMessage) => {
    if (!supabase) throw new Error('Supabase is not configured.')
    const { data: sessionData } = await supabase.auth.getSession()
    const accessToken = sessionData.session?.access_token
    if (!accessToken) throw new Error('Your session has expired. Sign in again.')

    const { data, error: functionError } = await supabase.functions.invoke(name, {
      body: payload,
      headers: { Authorization: `Bearer ${accessToken}` },
    })

    if (data?.error) throw new Error(data.error)
    if (functionError) throw new Error(functionError.message || fallbackMessage)
    return data
  }, [])

  const callAdminFunction = useCallback((payload) => invokeSecuredFunction(
    'admin-users',
    payload,
    'The secured administration service is unavailable. Please try again.',
  ), [invokeSecuredFunction])

  const callQuoteFunction = useCallback((payload) => invokeSecuredFunction(
    'admin-quotes',
    payload,
    'The secured enquiry service is unavailable. Please try again.',
  ), [invokeSecuredFunction])

  const callContentFunction = useCallback((payload) => invokeSecuredFunction(
    'admin-content',
    payload,
    'The secured content service is unavailable. Please try again.',
  ), [invokeSecuredFunction])

  const loadAuditLogs = useCallback(async (activeRole) => {
    if (!supabase || !['super_admin', 'admin', 'auditor'].includes(activeRole)) {
      setAuditLogs([])
      return
    }
    const { data, error: auditError } = await supabase
      .from('audit_logs')
      .select('id,actor_id,action,entity_type,entity_id,details,created_at')
      .order('created_at', { ascending: false })
      .limit(250)
    if (auditError) setError((current) => current || auditError.message)
    else setAuditLogs(data ?? [])
  }, [])

  const refreshQuotes = useCallback(async (detectNew = false) => {
    if (!supabase) return
    const { data, error: quoteError } = await supabase
      .from('quotes')
      .select('*')
      .order('created_at', { ascending: false })

    if (quoteError) {
      if (!detectNew) setError((current) => current || quoteError.message)
      return
    }

    const nextQuotes = data ?? []
    if (detectNew && initialQuoteLoadDone.current) {
      const fresh = nextQuotes.filter((quote) => !knownQuoteIds.current.has(quote.id))
      if (fresh.length) setNewEnquiryCount((count) => count + fresh.length)
    }
    knownQuoteIds.current = new Set(nextQuotes.map((quote) => quote.id))
    initialQuoteLoadDone.current = true
    setQuotes(nextQuotes)
  }, [])

  const loadContent = useCallback(async () => {
    if (!canManageContent) {
      setProducts([])
      setTestimonials([])
      setTestimonialCandidates([])
      return
    }
    const data = await callContentFunction({ action: 'list' })
    setProducts(data?.products ?? [])
    setTestimonials(data?.testimonials ?? [])
    setTestimonialCandidates(data?.testimonialCandidates ?? [])
  }, [callContentFunction, canManageContent])

  const loadResponses = useCallback(async (quoteId) => {
    if (!supabase || !quoteId) {
      setResponses([])
      return
    }
    setLoadingResponses(true)
    const { data, error: responseError } = await supabase
      .from('quote_responses')
      .select('id,quote_id,staff_id,recipient_email,subject,body,resend_email_id,created_at')
      .eq('quote_id', quoteId)
      .order('created_at', { ascending: true })
    setLoadingResponses(false)
    if (responseError) setError((current) => current || responseError.message)
    else setResponses(data ?? [])
  }, [])

  const loadData = useCallback(async () => {
    if (!supabase) {
      setSession(null)
      setLoading(false)
      return
    }

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

    try {
      await callAdminFunction({ action: 'record-login' })
    } catch (loginRecordError) {
      console.warn('Unable to record administrator login:', loginRecordError)
    }

    if (profileData.must_change_password) {
      setLoading(false)
      navigate('/admin/change-password', { replace: true })
      return
    }

    await refreshQuotes(false)

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
        const [settingsData, contentData] = await Promise.all([
          callAdminFunction({ action: 'get-settings' }),
          callContentFunction({ action: 'list' }),
        ])
        setNotificationEmail(settingsData?.settings?.quoteNotificationEmail || 'sulaiman_shuaib@yahoo.com')
        setSettingsUpdatedAt(settingsData?.settings?.updatedAt || null)
        setProducts(contentData?.products ?? [])
        setTestimonials(contentData?.testimonials ?? [])
        setTestimonialCandidates(contentData?.testimonialCandidates ?? [])
      } catch (adminLoadError) {
        setError((current) => current || adminLoadError.message)
      }
    } else if (profileData.role === 'content_editor') {
      try {
        const contentData = await callContentFunction({ action: 'list' })
        setProducts(contentData?.products ?? [])
        setTestimonials(contentData?.testimonials ?? [])
        setTestimonialCandidates(contentData?.testimonialCandidates ?? [])
      } catch (contentLoadError) {
        setError((current) => current || contentLoadError.message)
      }
    } else {
      setProducts([])
      setTestimonials([])
      setTestimonialCandidates([])
    }

    setLoading(false)
  }, [callAdminFunction, callContentFunction, loadAuditLogs, navigate, refreshQuotes])

  useEffect(() => {
    loadData()
  }, [loadData])

  useEffect(() => {
    if (!session || !profile || profile.must_change_password) return undefined
    const timer = window.setInterval(() => refreshQuotes(true), 20000)
    return () => window.clearInterval(timer)
  }, [profile, refreshQuotes, session])

  useEffect(() => {
    if (!selectedQuoteId) {
      setResponses([])
      return
    }
    loadResponses(selectedQuoteId)
  }, [loadResponses, selectedQuoteId])

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
      return [quote.full_name, quote.company_name, quote.email, quote.phone, quote.product_name, quote.destination_country, quote.message]
        .some((value) => String(value || '').toLowerCase().includes(needle))
    })
  }, [filter, quotes, search])

  const selectedQuote = useMemo(
    () => quotes.find((quote) => quote.id === selectedQuoteId) || null,
    [quotes, selectedQuoteId],
  )

  const unpublishedCandidates = useMemo(() => {
    const used = new Set(testimonials.map((item) => item.source_quote_id).filter(Boolean))
    return testimonialCandidates.filter((candidate) => !used.has(candidate.id))
  }, [testimonialCandidates, testimonials])

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

    const statusCounts = statuses.map((status) => ({
      status,
      count: quotes.filter((quote) => quote.status === status).length,
    }))

    return { last7Days, last30Days, topPages, uniquePages: pageCounts.size, statusCounts }
  }, [quotes, visits])

  const openQuote = (quote) => {
    setSelectedQuoteId(quote.id)
    setReplySubject(`Re: ${quote.product_name || 'Your enquiry to Shuaib Sulaiman & Co.'}`)
    setReplyBody('')
  }

  const updateQuoteStatus = async (quoteId, status) => {
    const previous = quotes.find((quote) => quote.id === quoteId)
    if (!previous || previous.status === status) return
    setQuotes((items) => items.map((item) => item.id === quoteId ? { ...item, status } : item))
    setBusyAction(`status:${quoteId}`)
    setError('')
    try {
      const data = await callQuoteFunction({ action: 'update-status', quoteId, status })
      setQuotes((items) => items.map((item) => item.id === quoteId ? { ...item, ...data.quote } : item))
      setNotice('Enquiry status saved.')
      await loadAuditLogs(role)
    } catch (statusError) {
      setQuotes((items) => items.map((item) => item.id === quoteId ? previous : item))
      setError(statusError.message)
    } finally {
      setBusyAction('')
    }
  }

  const assignQuote = async (quoteId, assignedTo) => {
    const previous = quotes.find((quote) => quote.id === quoteId)
    if (!previous || (previous.assigned_to || '') === assignedTo) return
    setQuotes((items) => items.map((item) => item.id === quoteId ? { ...item, assigned_to: assignedTo || null } : item))
    setBusyAction(`assign:${quoteId}`)
    setError('')
    try {
      const data = await callQuoteFunction({ action: 'assign', quoteId, assignedTo: assignedTo || null })
      setQuotes((items) => items.map((item) => item.id === quoteId ? { ...item, ...data.quote } : item))
      setNotice(assignedTo ? 'Enquiry assigned.' : 'Assignment cleared.')
      await loadAuditLogs(role)
    } catch (assignmentError) {
      setQuotes((items) => items.map((item) => item.id === quoteId ? previous : item))
      setError(assignmentError.message)
    } finally {
      setBusyAction('')
    }
  }

  const sendReply = async (event) => {
    event.preventDefault()
    if (!selectedQuote) return
    setSendingReply(true)
    setError('')
    setNotice('')
    try {
      const data = await invokeSecuredFunction('reply-to-quote', {
        quoteId: selectedQuote.id,
        subject: replySubject,
        body: replyBody,
      }, 'The customer reply service is unavailable. Please try again.')
      setResponses((items) => [...items, data.response])
      setQuotes((items) => items.map((item) => item.id === selectedQuote.id ? { ...item, status: data.status } : item))
      setReplyBody('')
      setNotice('Reply sent and added to the conversation history.')
      await loadAuditLogs(role)
    } catch (replyError) {
      setError(replyError.message)
    } finally {
      setSendingReply(false)
    }
  }

  const createUser = async (event) => {
    event.preventDefault()
    setCreatingUser(true)
    setError('')
    setNotice('')
    try {
      await callAdminFunction({ action: 'create', ...newUser })
      setNewUser({ fullName: '', email: '', password: '', role: 'sales_officer' })
      setNotice('User created. They must change the temporary password on first sign-in.')
      await loadData()
    } catch (createError) {
      setError(createError.message)
    } finally {
      setCreatingUser(false)
    }
  }

  const updateUser = async (user, changes) => {
    const label = changes.role ? `change ${user.email} to ${formatLabel(changes.role)}` : `${changes.isActive ? 'activate' : 'deactivate'} ${user.email}`
    if (!window.confirm(`Confirm: ${label}?`)) return
    setBusyAction(`user:${user.id}`)
    setError('')
    try {
      await callAdminFunction({ action: 'update', userId: user.id, ...changes })
      setNotice('User updated.')
      await loadData()
    } catch (updateError) {
      setError(updateError.message)
    } finally {
      setBusyAction('')
    }
  }

  const resetPassword = async (user) => {
    if (!window.confirm(`Reset the password for ${user.email}? Their existing password will stop working.`)) return
    const password = window.prompt(`Enter a temporary password for ${user.email}. Minimum 10 characters.`)
    if (!password) return
    setBusyAction(`reset:${user.id}`)
    setError('')
    try {
      await callAdminFunction({ action: 'reset-password', userId: user.id, password })
      setNotice(`Password reset for ${user.email}. A password change will be required on next sign-in.`)
      await loadData()
    } catch (resetError) {
      setError(resetError.message)
    } finally {
      setBusyAction('')
    }
  }

  const saveNotificationEmail = async (event) => {
    event.preventDefault()
    setSavingSettings(true)
    setError('')
    try {
      const data = await callAdminFunction({ action: 'update-notification-email', email: notificationEmail })
      setNotificationEmail(data.settings.quoteNotificationEmail)
      setSettingsUpdatedAt(data.settings.updatedAt)
      setNotice('Contact-form notification email updated.')
      await loadAuditLogs(role)
    } catch (settingsError) {
      setError(settingsError.message)
    } finally {
      setSavingSettings(false)
    }
  }

  const saveProduct = async (event) => {
    event.preventDefault()
    setSavingProduct(true)
    setError('')
    try {
      await callContentFunction({
        action: 'save-product',
        id: productForm.id || undefined,
        name: productForm.name,
        slug: productForm.slug,
        category: productForm.category,
        imageUrl: productForm.imageUrl,
        summary: productForm.summary,
        overview: productForm.overview,
        benefits: linesToArray(productForm.benefits),
        applications: linesToArray(productForm.applications),
        specifications: linesToObject(productForm.specifications),
        packaging: linesToArray(productForm.packaging),
        qualityPoints: linesToArray(productForm.qualityPoints),
        sortOrder: Number(productForm.sortOrder) || 0,
        isPublished: isSuperAdmin ? productForm.isPublished : false,
      })
      setNotice(productForm.id ? 'Product saved.' : 'Product added to the catalogue.')
      setProductForm(emptyProductForm)
      await Promise.all([loadContent(), loadAuditLogs(role)])
    } catch (productError) {
      setError(productError.message)
    } finally {
      setSavingProduct(false)
    }
  }

  const setProductPublished = async (product, isPublished) => {
    if (!window.confirm(`${isPublished ? 'Publish' : 'Unpublish'} ${product.name}?`)) return
    setBusyAction(`product:${product.id}`)
    setError('')
    try {
      await callContentFunction({ action: 'set-product-published', id: product.id, isPublished })
      setNotice(isPublished ? 'Product published on the website.' : 'Product removed from the public catalogue.')
      await Promise.all([loadContent(), loadAuditLogs(role)])
    } catch (productError) {
      setError(productError.message)
    } finally {
      setBusyAction('')
    }
  }

  const deleteProduct = async (product) => {
    if (!window.confirm(`Permanently delete the unpublished product ${product.name}?`)) return
    setBusyAction(`product:${product.id}`)
    try {
      await callContentFunction({ action: 'delete-product', id: product.id })
      setNotice('Product deleted.')
      setProductForm(emptyProductForm)
      await Promise.all([loadContent(), loadAuditLogs(role)])
    } catch (productError) {
      setError(productError.message)
    } finally {
      setBusyAction('')
    }
  }

  const saveTestimonial = async (event) => {
    event.preventDefault()
    setSavingTestimonial(true)
    setError('')
    try {
      await callContentFunction({
        action: 'save-testimonial',
        id: testimonialForm.id || undefined,
        sourceQuoteId: testimonialForm.sourceQuoteId || undefined,
        buyerName: testimonialForm.buyerName,
        companyName: testimonialForm.companyName,
        roleOrMarket: testimonialForm.roleOrMarket,
        quoteText: testimonialForm.quoteText,
        isPublished: isSuperAdmin ? testimonialForm.isPublished : false,
      })
      setNotice(testimonialForm.id ? 'Testimonial saved.' : 'Testimonial draft created.')
      setTestimonialForm(emptyTestimonialForm)
      await Promise.all([loadContent(), loadAuditLogs(role)])
    } catch (testimonialError) {
      setError(testimonialError.message)
    } finally {
      setSavingTestimonial(false)
    }
  }

  const createTestimonialFromQuote = async (quoteId) => {
    setBusyAction(`testimonial-candidate:${quoteId}`)
    setError('')
    try {
      const data = await callContentFunction({ action: 'create-testimonial-from-quote', quoteId })
      setTestimonialForm(testimonialRowToForm(data.testimonial))
      setNotice('Draft created from the enquiry. Review the wording before publishing.')
      await loadContent()
    } catch (testimonialError) {
      setError(testimonialError.message)
    } finally {
      setBusyAction('')
    }
  }

  const setTestimonialPublished = async (testimonial, isPublished) => {
    if (!window.confirm(`${isPublished ? 'Publish' : 'Unpublish'} this testimonial from ${testimonial.buyer_name}?`)) return
    setBusyAction(`testimonial:${testimonial.id}`)
    setError('')
    try {
      await callContentFunction({ action: 'set-testimonial-published', id: testimonial.id, isPublished })
      setNotice(isPublished ? 'Testimonial published on the website.' : 'Testimonial unpublished.')
      await Promise.all([loadContent(), loadAuditLogs(role)])
    } catch (testimonialError) {
      setError(testimonialError.message)
    } finally {
      setBusyAction('')
    }
  }

  const deleteTestimonial = async (testimonial) => {
    if (!window.confirm(`Delete the unpublished testimonial from ${testimonial.buyer_name}?`)) return
    setBusyAction(`testimonial:${testimonial.id}`)
    try {
      await callContentFunction({ action: 'delete-testimonial', id: testimonial.id })
      setNotice('Testimonial deleted.')
      setTestimonialForm(emptyTestimonialForm)
      await Promise.all([loadContent(), loadAuditLogs(role)])
    } catch (testimonialError) {
      setError(testimonialError.message)
    } finally {
      setBusyAction('')
    }
  }

  const refreshAll = async () => {
    setRefreshing(true)
    await loadData()
    setRefreshing(false)
  }

  const signOut = async () => {
    await supabase?.auth.signOut()
    navigate('/admin', { replace: true })
  }

  if (!isSupabaseConfigured) {
    return <main className="admin-state"><h1>Admin unavailable</h1><p>Add the Supabase environment variables in Cloudflare.</p></main>
  }
  if (loading || session === undefined) return <main className="admin-state"><p>Loading trade operations…</p></main>
  if (!session) return <Navigate to="/admin" replace />

  const openEnquiries = () => {
    setSection('enquiries')
    setNewEnquiryCount(0)
  }

  return (
    <main className="ops-shell">
      <header className="ops-header">
        <div>
          <p className="ops-brand">Shuaib Sulaiman &amp; Co.</p>
          <h1>Trade Operations</h1>
          <p>{profile ? `${profile.full_name} — ${formatLabel(profile.role)}` : session.user.email}</p>
        </div>
        <div className="ops-header-actions">
          {newEnquiryCount > 0 && <button className="ops-new-alert" type="button" onClick={openEnquiries}>{newEnquiryCount} new {newEnquiryCount === 1 ? 'enquiry' : 'enquiries'}</button>}
          <button type="button" className="ops-ghost" onClick={refreshAll} disabled={refreshing}>{refreshing ? 'Refreshing…' : 'Refresh'}</button>
          <a className="ops-ghost" href="/">View website</a>
          <button type="button" className="ops-danger-text" onClick={signOut}>Sign out</button>
        </div>
      </header>

      <nav className="ops-tabs" aria-label="Administration sections">
        <button className={section === 'overview' ? 'active' : ''} onClick={() => setSection('overview')}>Overview</button>
        <button className={section === 'enquiries' ? 'active' : ''} onClick={openEnquiries}>Enquiries{newEnquiryCount > 0 ? ` (${newEnquiryCount})` : ''}</button>
        {canManageContent && <button className={section === 'products' ? 'active' : ''} onClick={() => setSection('products')}>Products</button>}
        {canManageContent && <button className={section === 'testimonials' ? 'active' : ''} onClick={() => setSection('testimonials')}>Testimonials</button>}
        {canViewDirectory && <button className={section === 'users' ? 'active' : ''} onClick={() => setSection('users')}>Users &amp; roles</button>}
        {canViewAnalytics && <button className={section === 'analytics' ? 'active' : ''} onClick={() => setSection('analytics')}>Analytics</button>}
        {canViewAudit && <button className={section === 'audit' ? 'active' : ''} onClick={() => setSection('audit')}>Audit</button>}
        {isSuperAdmin && <button className={section === 'settings' ? 'active' : ''} onClick={() => setSection('settings')}>Settings</button>}
      </nav>

      {error && <div className="ops-message ops-error" role="alert">{error}</div>}
      {notice && <div className="ops-message ops-success" role="status">{notice}</div>}

      {section === 'overview' && (
        <section className="ops-section">
          <div className="ops-section-heading">
            <div><span>Today&apos;s desk</span><h2>What needs attention</h2></div>
            <button type="button" className="ops-primary" onClick={openEnquiries}>Open enquiries</button>
          </div>
          <div className="ops-metric-strip">
            <div><strong>{quotes.filter((quote) => quote.status === 'new').length}</strong><span>New enquiries</span></div>
            <div><strong>{quotes.filter((quote) => quote.status === 'under_review').length}</strong><span>Under review</span></div>
            <div><strong>{quotes.filter((quote) => quote.status === 'quotation_sent').length}</strong><span>Quotations sent</span></div>
            <div><strong>{quotes.filter((quote) => quote.status === 'won').length}</strong><span>Won</span></div>
          </div>
          <div className="ops-overview-grid">
            <article className="ops-panel">
              <div className="ops-panel-heading"><h3>Latest enquiries</h3><span>Auto-refreshes every 20 seconds</span></div>
              <div className="ops-compact-list">
                {quotes.slice(0, 6).map((quote) => (
                  <button key={quote.id} type="button" onClick={() => { openEnquiries(); openQuote(quote) }}>
                    <span className="ops-status" data-status={quote.status}>{formatLabel(quote.status)}</span>
                    <strong>{quote.full_name}</strong>
                    <small>{quote.product_name || 'General enquiry'} — {quote.destination_country || 'Destination not set'}</small>
                  </button>
                ))}
                {quotes.length === 0 && <p className="ops-empty">No enquiries yet.</p>}
              </div>
            </article>
            {canViewAudit && (
              <article className="ops-panel">
                <div className="ops-panel-heading"><h3>Recent activity</h3><span>Latest staff actions</span></div>
                <div className="ops-activity-list">
                  {auditLogs.slice(0, 8).map((item) => (
                    <div key={item.id}><strong>{formatLabel(item.action)}</strong><span>{formatDateTime(item.created_at)}</span></div>
                  ))}
                  {auditLogs.length === 0 && <p className="ops-empty">No recorded activity yet.</p>}
                </div>
              </article>
            )}
          </div>
        </section>
      )}

      {section === 'enquiries' && (
        <section className="ops-section">
          <div className="ops-section-heading">
            <div><span>Buyer desk</span><h2>Enquiries</h2></div>
            <p>{visibleQuotes.length} shown</p>
          </div>
          <div className="ops-filterbar">
            <label><span>Search</span><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Name, company, product, destination…" /></label>
            <label><span>Status</span><select value={filter} onChange={(event) => setFilter(event.target.value)}><option value="all">All statuses</option>{statuses.map((status) => <option key={status} value={status}>{formatLabel(status)}</option>)}</select></label>
          </div>

          <div className={selectedQuote ? 'ops-enquiry-layout detail-open' : 'ops-enquiry-layout'}>
            <div className="ops-enquiry-list">
              {visibleQuotes.map((quote) => (
                <article key={quote.id} className={quote.id === selectedQuoteId ? 'ops-enquiry-card selected' : 'ops-enquiry-card'}>
                  <div className="ops-enquiry-main">
                    <div className="ops-enquiry-title">
                      <span className="ops-status" data-status={quote.status}>{formatLabel(quote.status)}</span>
                      <h3>{quote.full_name}</h3>
                      <p>{quote.company_name || 'Individual buyer'}</p>
                    </div>
                    <div className="ops-enquiry-facts">
                      <div><span>Product</span><strong>{quote.product_name || 'General enquiry'}</strong></div>
                      <div><span>Destination</span><strong>{quote.destination_country || 'Not specified'}</strong></div>
                      <div><span>Received</span><strong>{formatDateTime(quote.created_at)}</strong></div>
                    </div>
                    <p className="ops-message-preview">{quote.message}</p>
                  </div>
                  <div className="ops-enquiry-controls">
                    {canUpdateQuoteStatus ? (
                      <label><span>Status</span><select disabled={busyAction === `status:${quote.id}`} value={quote.status} onChange={(event) => updateQuoteStatus(quote.id, event.target.value)}>{statuses.map((status) => <option key={status} value={status}>{formatLabel(status)}</option>)}</select></label>
                    ) : <span className="ops-readonly-note">Status is read-only for your role.</span>}
                    {canAssignQuotes && (
                      <label><span>Assigned to</span><select disabled={busyAction === `assign:${quote.id}`} value={quote.assigned_to || ''} onChange={(event) => assignQuote(quote.id, event.target.value)}><option value="">Unassigned</option>{quoteAssignees.map((user) => <option key={user.id} value={user.id}>{user.full_name}</option>)}</select></label>
                    )}
                    {!canAssignQuotes && quote.assigned_to && <span className="ops-readonly-note">Assigned to {userById.get(quote.assigned_to)?.full_name || 'staff'}</span>}
                    <button className="ops-primary" type="button" onClick={() => openQuote(quote)}>{canReply ? 'Open & reply' : 'Open enquiry'}</button>
                  </div>
                </article>
              ))}
              {visibleQuotes.length === 0 && <div className="ops-empty-state"><h3>No matching enquiries</h3><p>Change the status filter or search wording.</p></div>}
            </div>

            {selectedQuote && (
              <aside className="ops-enquiry-detail">
                <div className="ops-detail-header">
                  <div><span className="ops-status" data-status={selectedQuote.status}>{formatLabel(selectedQuote.status)}</span><h3>{selectedQuote.full_name}</h3><p>{selectedQuote.email}</p></div>
                  <button type="button" className="ops-icon-button" aria-label="Close enquiry detail" onClick={() => setSelectedQuoteId('')}>×</button>
                </div>
                <div className="ops-context-grid">
                  <div><span>Company</span><strong>{selectedQuote.company_name || 'Individual buyer'}</strong></div>
                  <div><span>Product</span><strong>{selectedQuote.product_name || 'General enquiry'}</strong></div>
                  <div><span>Destination</span><strong>{selectedQuote.destination_country || 'Not specified'}</strong></div>
                  <div><span>Phone</span><strong>{selectedQuote.phone || 'Not provided'}</strong></div>
                </div>
                <div className="ops-original-message"><span>Original message</span><p>{selectedQuote.message}</p></div>
                <div className="ops-conversation">
                  <div className="ops-panel-heading"><h4>Conversation</h4><span>{responses.length} sent {responses.length === 1 ? 'reply' : 'replies'}</span></div>
                  {loadingResponses && <p className="ops-empty">Loading conversation…</p>}
                  {!loadingResponses && responses.map((response) => (
                    <article key={response.id} className="ops-response">
                      <div><strong>{userById.get(response.staff_id)?.full_name || 'Staff member'}</strong><time>{formatDateTime(response.created_at)}</time></div>
                      <span>{response.subject}</span>
                      <p>{response.body}</p>
                    </article>
                  ))}
                  {!loadingResponses && responses.length === 0 && <p className="ops-empty">No replies have been sent from the dashboard yet.</p>}
                </div>
                {canReply && (
                  <form className="ops-reply-form" onSubmit={sendReply}>
                    <h4>Reply to {selectedQuote.full_name}</h4>
                    <label><span>Subject</span><input value={replySubject} onChange={(event) => setReplySubject(event.target.value)} maxLength="200" required /></label>
                    <label><span>Message</span><textarea rows="7" value={replyBody} onChange={(event) => setReplyBody(event.target.value)} maxLength="6000" placeholder="Write a clear response to the buyer…" required /></label>
                    <div className="ops-inline-actions">
                      <button className="ops-primary" type="submit" disabled={sendingReply}>{sendingReply ? 'Sending…' : 'Send reply'}</button>
                      <a className="ops-ghost" href={`mailto:${encodeURIComponent(selectedQuote.email)}?subject=${encodeURIComponent(replySubject)}`}>Open in email client instead</a>
                    </div>
                  </form>
                )}
              </aside>
            )}
          </div>
        </section>
      )}

      {section === 'products' && canManageContent && (
        <section className="ops-section">
          <div className="ops-section-heading"><div><span>Catalogue desk</span><h2>Products</h2></div><button className="ops-primary" type="button" onClick={() => setProductForm(emptyProductForm)}>Add product</button></div>
          <div className="ops-content-layout">
            <div className="ops-content-list">
              {products.map((product) => (
                <article key={product.id} className="ops-content-row">
                  <div><span className={product.is_published ? 'ops-publish-state live' : 'ops-publish-state'}>{product.is_published ? 'Published' : 'Draft'}</span><h3>{product.name}</h3><p>{product.category} — /export-product/{product.slug}</p></div>
                  <div className="ops-row-actions">
                    <button className="ops-ghost" type="button" disabled={!isSuperAdmin && product.is_published} onClick={() => setProductForm(productRowToForm(product))}>Edit</button>
                    {isSuperAdmin && <button className="ops-ghost" type="button" disabled={busyAction === `product:${product.id}`} onClick={() => setProductPublished(product, !product.is_published)}>{product.is_published ? 'Unpublish' : 'Publish'}</button>}
                    {!product.is_published && <button className="ops-danger-text" type="button" onClick={() => deleteProduct(product)}>Delete</button>}
                  </div>
                </article>
              ))}
            </div>
            <form className="ops-editor" onSubmit={saveProduct}>
              <div className="ops-panel-heading"><h3>{productForm.id ? 'Edit product' : 'Add product'}</h3><span>Only published products appear publicly</span></div>
              <div className="ops-form-grid two">
                <label><span>Product name</span><input value={productForm.name} onChange={(event) => setProductForm((form) => ({ ...form, name: event.target.value }))} maxLength="200" required /></label>
                <label><span>Slug</span><input value={productForm.slug} onChange={(event) => setProductForm((form) => ({ ...form, slug: event.target.value.toLowerCase().replace(/\s+/g, '-') }))} placeholder="product-name" maxLength="160" required /></label>
                <label><span>Category</span><input value={productForm.category} onChange={(event) => setProductForm((form) => ({ ...form, category: event.target.value }))} maxLength="120" required /></label>
                <label><span>Display order</span><input type="number" value={productForm.sortOrder} onChange={(event) => setProductForm((form) => ({ ...form, sortOrder: event.target.value }))} /></label>
              </div>
              <label><span>Image URL or site path</span><input value={productForm.imageUrl} onChange={(event) => setProductForm((form) => ({ ...form, imageUrl: event.target.value }))} placeholder="/images/products/example.webp" /></label>
              <label><span>Summary</span><textarea rows="3" value={productForm.summary} onChange={(event) => setProductForm((form) => ({ ...form, summary: event.target.value }))} /></label>
              <label><span>Overview</span><textarea rows="5" value={productForm.overview} onChange={(event) => setProductForm((form) => ({ ...form, overview: event.target.value }))} /></label>
              <div className="ops-form-grid two">
                <label><span>Benefits — one per line</span><textarea rows="6" value={productForm.benefits} onChange={(event) => setProductForm((form) => ({ ...form, benefits: event.target.value }))} /></label>
                <label><span>Applications — one per line</span><textarea rows="6" value={productForm.applications} onChange={(event) => setProductForm((form) => ({ ...form, applications: event.target.value }))} /></label>
                <label><span>Packaging — one per line</span><textarea rows="6" value={productForm.packaging} onChange={(event) => setProductForm((form) => ({ ...form, packaging: event.target.value }))} /></label>
                <label><span>Quality points — one per line</span><textarea rows="6" value={productForm.qualityPoints} onChange={(event) => setProductForm((form) => ({ ...form, qualityPoints: event.target.value }))} /></label>
              </div>
              <label><span>Specifications — one “Label: Value” per line</span><textarea rows="7" value={productForm.specifications} onChange={(event) => setProductForm((form) => ({ ...form, specifications: event.target.value }))} /></label>
              {isSuperAdmin ? <label className="ops-check"><input type="checkbox" checked={productForm.isPublished} onChange={(event) => setProductForm((form) => ({ ...form, isPublished: event.target.checked }))} /><span>Publish immediately after saving</span></label> : <p className="ops-readonly-note">Your product changes are saved as drafts. A super administrator publishes them.</p>}
              <div className="ops-inline-actions"><button className="ops-primary" type="submit" disabled={savingProduct}>{savingProduct ? 'Saving…' : 'Save product'}</button>{productForm.id && <button className="ops-ghost" type="button" onClick={() => setProductForm(emptyProductForm)}>Cancel edit</button>}</div>
            </form>
          </div>
        </section>
      )}

      {section === 'testimonials' && canManageContent && (
        <section className="ops-section">
          <div className="ops-section-heading"><div><span>Buyer proof</span><h2>Testimonials</h2></div><button className="ops-primary" type="button" onClick={() => setTestimonialForm(emptyTestimonialForm)}>New testimonial</button></div>
          <div className="ops-content-layout">
            <div>
              <div className="ops-content-list">
                {testimonials.map((testimonial) => (
                  <article key={testimonial.id} className="ops-content-row testimonial-row">
                    <div><span className={testimonial.is_published ? 'ops-publish-state live' : 'ops-publish-state'}>{testimonial.is_published ? 'Published' : 'Draft'}</span><h3>{testimonial.buyer_name}</h3><p>{testimonial.quote_text}</p></div>
                    <div className="ops-row-actions"><button className="ops-ghost" type="button" disabled={!isSuperAdmin && testimonial.is_published} onClick={() => setTestimonialForm(testimonialRowToForm(testimonial))}>Edit</button>{isSuperAdmin && <button className="ops-ghost" type="button" onClick={() => setTestimonialPublished(testimonial, !testimonial.is_published)}>{testimonial.is_published ? 'Unpublish' : 'Publish'}</button>}{!testimonial.is_published && <button className="ops-danger-text" type="button" onClick={() => deleteTestimonial(testimonial)}>Delete</button>}</div>
                  </article>
                ))}
              </div>
              <div className="ops-candidate-panel">
                <div className="ops-panel-heading"><h3>Enquiry messages available for review</h3><span>Nothing is public until you publish it</span></div>
                {unpublishedCandidates.slice(0, 20).map((candidate) => (
                  <article key={candidate.id}><div><strong>{candidate.full_name}</strong><span>{candidate.company_name || candidate.product_name || 'Buyer enquiry'}</span><p>{candidate.message}</p></div><button className="ops-ghost" type="button" disabled={busyAction === `testimonial-candidate:${candidate.id}`} onClick={() => createTestimonialFromQuote(candidate.id)}>Create draft</button></article>
                ))}
                {unpublishedCandidates.length === 0 && <p className="ops-empty">No unused enquiry messages are waiting for review.</p>}
              </div>
            </div>
            <form className="ops-editor" onSubmit={saveTestimonial}>
              <div className="ops-panel-heading"><h3>{testimonialForm.id ? 'Edit testimonial' : 'Create testimonial'}</h3><span>Review wording before publishing</span></div>
              <label><span>Buyer name</span><input value={testimonialForm.buyerName} onChange={(event) => setTestimonialForm((form) => ({ ...form, buyerName: event.target.value }))} required /></label>
              <label><span>Company</span><input value={testimonialForm.companyName} onChange={(event) => setTestimonialForm((form) => ({ ...form, companyName: event.target.value }))} /></label>
              <label><span>Role or market</span><input value={testimonialForm.roleOrMarket} onChange={(event) => setTestimonialForm((form) => ({ ...form, roleOrMarket: event.target.value }))} placeholder="Food Distributor, India" /></label>
              <label><span>Testimonial</span><textarea rows="8" value={testimonialForm.quoteText} onChange={(event) => setTestimonialForm((form) => ({ ...form, quoteText: event.target.value }))} required /></label>
              {isSuperAdmin ? <label className="ops-check"><input type="checkbox" checked={testimonialForm.isPublished} onChange={(event) => setTestimonialForm((form) => ({ ...form, isPublished: event.target.checked }))} /><span>Publish on the public website</span></label> : <p className="ops-readonly-note">You can prepare testimonial drafts. Only a super administrator can publish or unpublish buyer comments.</p>}
              <div className="ops-inline-actions"><button className="ops-primary" type="submit" disabled={savingTestimonial}>{savingTestimonial ? 'Saving…' : 'Save testimonial'}</button>{testimonialForm.id && <button className="ops-ghost" type="button" onClick={() => setTestimonialForm(emptyTestimonialForm)}>Cancel edit</button>}</div>
            </form>
          </div>
        </section>
      )}

      {section === 'users' && canViewDirectory && (
        <section className="ops-section">
          <div className="ops-section-heading"><div><span>Access control</span><h2>Users &amp; roles</h2></div><p>{users.length} staff accounts</p></div>
          {canManageUsers && (
            <form className="ops-create-user" onSubmit={createUser}>
              <label><span>Full name</span><input value={newUser.fullName} onChange={(event) => setNewUser((user) => ({ ...user, fullName: event.target.value }))} required /></label>
              <label><span>Email</span><input type="email" value={newUser.email} onChange={(event) => setNewUser((user) => ({ ...user, email: event.target.value }))} required /></label>
              <label><span>Temporary password</span><input type="password" minLength="10" value={newUser.password} onChange={(event) => setNewUser((user) => ({ ...user, password: event.target.value }))} required /></label>
              <label><span>Role</span><select value={newUser.role} onChange={(event) => setNewUser((user) => ({ ...user, role: event.target.value }))}>{assignableRoles.map((item) => <option key={item} value={item}>{formatLabel(item)}</option>)}</select></label>
              <button className="ops-primary" type="submit" disabled={creatingUser}>{creatingUser ? 'Creating…' : 'Create user'}</button>
            </form>
          )}
          <div className="ops-user-list">
            {users.map((user) => (
              <article key={user.id} className="ops-user-row">
                <div><span className={user.is_active ? 'ops-user-state active' : 'ops-user-state'}>{user.is_active ? 'Active' : 'Inactive'}</span><h3>{user.full_name}</h3><p>{user.email}</p><small>Last login: {formatDateTime(user.last_login_at)}</small></div>
                <div className="ops-user-controls">
                  {canManageUsers ? <label><span>Role</span><select value={user.role} disabled={busyAction === `user:${user.id}` || (!isSuperAdmin && user.role === 'super_admin')} onChange={(event) => updateUser(user, { role: event.target.value })}>{(isSuperAdmin ? roles : roles.filter((item) => item !== 'super_admin')).map((item) => <option key={item} value={item}>{formatLabel(item)}</option>)}</select></label> : <span className="ops-role-label">{formatLabel(user.role)}</span>}
                  {canManageUsers && <button className="ops-ghost" type="button" onClick={() => updateUser(user, { isActive: !user.is_active })}>{user.is_active ? 'Deactivate' : 'Activate'}</button>}
                  {canManageUsers && <button className="ops-ghost" type="button" onClick={() => resetPassword(user)}>Reset password</button>}
                </div>
              </article>
            ))}
          </div>
        </section>
      )}

      {section === 'analytics' && canViewAnalytics && (
        <section className="ops-section">
          <div className="ops-section-heading"><div><span>Traffic & pipeline</span><h2>Analytics</h2></div><p>Latest 1,000 visits</p></div>
          <div className="ops-metric-strip analytics-strip"><div><strong>{analytics.last7Days}</strong><span>Visits — 7 days</span></div><div><strong>{analytics.last30Days}</strong><span>Visits — 30 days</span></div><div><strong>{analytics.uniquePages}</strong><span>Pages visited</span></div><div><strong>{quotes.length}</strong><span>Total enquiries</span></div></div>
          <div className="ops-chart-grid">
            <article className="ops-panel"><div className="ops-panel-heading"><h3>Top pages</h3><span>Visit count</span></div><div className="ops-bar-chart">{analytics.topPages.map((item) => { const max = analytics.topPages[0]?.count || 1; return <div key={item.path}><div><strong>{item.path}</strong><span>{item.count}</span></div><i><b style={{ width: `${Math.max(4, (item.count / max) * 100)}%` }} /></i></div> })}</div></article>
            <article className="ops-panel"><div className="ops-panel-heading"><h3>Enquiry pipeline</h3><span>Current status</span></div><div className="ops-bar-chart status-chart">{analytics.statusCounts.map((item) => { const max = Math.max(...analytics.statusCounts.map((entry) => entry.count), 1); return <div key={item.status}><div><strong>{formatLabel(item.status)}</strong><span>{item.count}</span></div><i><b data-status={item.status} style={{ width: `${item.count ? Math.max(4, (item.count / max) * 100) : 0}%` }} /></i></div> })}</div></article>
          </div>
        </section>
      )}

      {section === 'audit' && canViewAudit && (
        <section className="ops-section">
          <div className="ops-section-heading"><div><span>Accountability</span><h2>Audit trail</h2></div><p>{auditLogs.length} recent events</p></div>
          <div className="ops-audit-list">
            {auditLogs.map((item) => (
              <article key={item.id}><div><strong>{formatLabel(item.action)}</strong><span>{item.entity_type}{item.entity_id ? ` — ${item.entity_id}` : ''}</span></div><time>{formatDateTime(item.created_at)}</time><pre>{item.details ? JSON.stringify(item.details, null, 2) : 'No additional details'}</pre></article>
            ))}
            {auditLogs.length === 0 && <p className="ops-empty">No audit events yet.</p>}
          </div>
        </section>
      )}

      {section === 'settings' && isSuperAdmin && (
        <section className="ops-section ops-settings-section">
          <div className="ops-section-heading"><div><span>Protected settings</span><h2>Contact-form notifications</h2></div></div>
          <form className="ops-settings-form" onSubmit={saveNotificationEmail}>
            <label><span>Send new enquiry notifications to</span><input type="email" value={notificationEmail} onChange={(event) => setNotificationEmail(event.target.value)} required /></label>
            <p>Updated {formatDateTime(settingsUpdatedAt)}. This address is stored server-side and is not exposed as a browser environment variable.</p>
            <button className="ops-primary" type="submit" disabled={savingSettings}>{savingSettings ? 'Saving…' : 'Save notification email'}</button>
          </form>
        </section>
      )}
    </main>
  )
}

export default AdminDashboardPage
