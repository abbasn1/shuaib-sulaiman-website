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

const slugPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/
const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

const cleanText = (value: unknown, max = 5000) => String(value ?? '').trim().slice(0, max)
const cleanOptional = (value: unknown, max = 5000) => {
  const text = cleanText(value, max)
  return text || null
}
const cleanStringArray = (value: unknown, maxItems = 20, maxLength = 500) => Array.isArray(value)
  ? value.map((item) => cleanText(item, maxLength)).filter(Boolean).slice(0, maxItems)
  : []
const cleanObject = (value: unknown) => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {}
  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>)
      .map(([key, item]) => [cleanText(key, 120), cleanText(item, 800)])
      .filter(([key, item]) => key && item)
      .slice(0, 30),
  )
}

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  if (request.method !== 'POST') return jsonResponse({ error: 'Method not allowed.' }, 405)

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY')
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    const authHeader = request.headers.get('Authorization') ?? ''

    if (!supabaseUrl || !anonKey || !serviceRoleKey) {
      return jsonResponse({ error: 'Content administration service configuration is incomplete.' }, 503)
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

    const { data: profile, error: profileError } = await adminClient
      .from('profiles')
      .select('id,role,is_active,must_change_password')
      .eq('id', userData.user.id)
      .single()

    if (profileError || !profile?.is_active) return jsonResponse({ error: 'This account is not authorised.' }, 403)
    if (profile.must_change_password) return jsonResponse({ error: 'Change your password before managing content.' }, 403)
    const callerIsSuperAdmin = profile.role === 'super_admin'
    const callerIsContentEditor = profile.role === 'content_editor'
    if (!callerIsSuperAdmin && !callerIsContentEditor) {
      return jsonResponse({ error: 'Your role cannot manage website content.' }, 403)
    }

    const body = await request.json()
    const action = String(body?.action || '')
    if (callerIsContentEditor && ['set-product-published', 'set-testimonial-published'].includes(action)) {
      return jsonResponse({ error: 'Only a super administrator can publish or unpublish public content.' }, 403)
    }
    if (callerIsContentEditor && ['save-product', 'save-testimonial'].includes(action)) body.isPublished = false

    const writeAudit = async (auditAction: string, entityType: string, entityId: string | null, details: Record<string, unknown> = {}) => {
      const { error } = await adminClient.from('audit_logs').insert({
        actor_id: userData.user.id,
        action: auditAction,
        entity_type: entityType,
        entity_id: entityId,
        details,
      })
      if (error) console.error('Audit log write failed:', error)
    }

    if (action === 'list') {
      const [productResult, testimonialResult, candidateResult] = await Promise.all([
        adminClient.from('products').select('*').order('sort_order', { ascending: true }).order('name', { ascending: true }),
        adminClient.from('testimonials').select('*').order('created_at', { ascending: false }),
        adminClient.from('quotes').select('id,full_name,company_name,product_name,destination_country,message,created_at').order('created_at', { ascending: false }).limit(100),
      ])
      if (productResult.error) throw productResult.error
      if (testimonialResult.error) throw testimonialResult.error
      if (candidateResult.error) throw candidateResult.error
      return jsonResponse({
        products: productResult.data ?? [],
        testimonials: testimonialResult.data ?? [],
        testimonialCandidates: candidateResult.data ?? [],
      })
    }

    if (action === 'save-product') {
      const id = body?.id ? String(body.id) : null
      if (id && !uuidPattern.test(id)) return jsonResponse({ error: 'Invalid product reference.' }, 400)

      const slug = cleanText(body?.slug, 160).toLowerCase()
      const name = cleanText(body?.name, 200)
      const category = cleanText(body?.category, 120)
      if (!slugPattern.test(slug)) return jsonResponse({ error: 'Use a lowercase product slug with letters, numbers and hyphens only.' }, 400)
      if (!name || !category) return jsonResponse({ error: 'Product name and category are required.' }, 400)

      const record = {
        slug,
        name,
        category,
        image_url: cleanOptional(body?.imageUrl, 1000),
        summary: cleanText(body?.summary, 1500),
        overview: cleanText(body?.overview, 5000),
        benefits: cleanStringArray(body?.benefits),
        applications: cleanStringArray(body?.applications),
        specifications: cleanObject(body?.specifications),
        packaging: cleanStringArray(body?.packaging),
        quality_points: cleanStringArray(body?.qualityPoints),
        is_published: Boolean(body?.isPublished),
        sort_order: Number.isFinite(Number(body?.sortOrder)) ? Math.trunc(Number(body.sortOrder)) : 0,
        updated_by: userData.user.id,
        updated_at: new Date().toISOString(),
      }

      if (id) {
        const { data: existing, error: existingError } = await adminClient.from('products').select('id,slug,name,is_published').eq('id', id).single()
        if (existingError || !existing) return jsonResponse({ error: 'Product not found.' }, 404)
        if (callerIsContentEditor && existing.is_published) {
          return jsonResponse({ error: 'Published products can only be changed by a super administrator.' }, 403)
        }
        const { data, error } = await adminClient.from('products').update(record).eq('id', id).select('*').single()
        if (error) throw error
        await writeAudit('product_updated', 'product', id, { previous_slug: existing.slug, slug, published: record.is_published })
        return jsonResponse({ success: true, product: data })
      }

      const { data, error } = await adminClient.from('products').insert({ ...record, created_by: userData.user.id }).select('*').single()
      if (error) throw error
      await writeAudit('product_created', 'product', data.id, { slug, published: record.is_published })
      return jsonResponse({ success: true, product: data })
    }

    if (action === 'set-product-published') {
      const id = String(body?.id || '')
      if (!uuidPattern.test(id)) return jsonResponse({ error: 'Invalid product reference.' }, 400)
      const isPublished = Boolean(body?.isPublished)
      const { data, error } = await adminClient.from('products').update({
        is_published: isPublished,
        updated_by: userData.user.id,
        updated_at: new Date().toISOString(),
      }).eq('id', id).select('*').single()
      if (error) throw error
      await writeAudit(isPublished ? 'product_published' : 'product_unpublished', 'product', id, { slug: data.slug })
      return jsonResponse({ success: true, product: data })
    }

    if (action === 'delete-product') {
      const id = String(body?.id || '')
      if (!uuidPattern.test(id)) return jsonResponse({ error: 'Invalid product reference.' }, 400)
      const { data: existing, error: existingError } = await adminClient.from('products').select('id,slug,name,is_published').eq('id', id).single()
      if (existingError || !existing) return jsonResponse({ error: 'Product not found.' }, 404)
      if (existing.is_published) return jsonResponse({ error: 'Unpublish this product before deleting it.' }, 400)
      const { error } = await adminClient.from('products').delete().eq('id', id)
      if (error) throw error
      await writeAudit('product_deleted', 'product', id, { slug: existing.slug, name: existing.name })
      return jsonResponse({ success: true })
    }

    if (action === 'save-testimonial') {
      const id = body?.id ? String(body.id) : null
      if (id && !uuidPattern.test(id)) return jsonResponse({ error: 'Invalid testimonial reference.' }, 400)
      const buyerName = cleanText(body?.buyerName, 200)
      const quoteText = cleanText(body?.quoteText, 3000)
      if (!buyerName || quoteText.length < 5) return jsonResponse({ error: 'Buyer name and testimonial text are required.' }, 400)
      const sourceQuoteId = body?.sourceQuoteId ? String(body.sourceQuoteId) : null
      if (sourceQuoteId && !uuidPattern.test(sourceQuoteId)) return jsonResponse({ error: 'Invalid enquiry reference.' }, 400)
      const isPublished = Boolean(body?.isPublished)
      const record = {
        source_quote_id: sourceQuoteId,
        buyer_name: buyerName,
        company_name: cleanOptional(body?.companyName, 200),
        role_or_market: cleanOptional(body?.roleOrMarket, 240),
        quote_text: quoteText,
        is_published: isPublished,
        published_at: isPublished ? new Date().toISOString() : null,
        updated_by: userData.user.id,
        updated_at: new Date().toISOString(),
      }
      if (id) {
        if (callerIsContentEditor) {
          const { data: existing, error: existingError } = await adminClient.from('testimonials').select('id,is_published').eq('id', id).single()
          if (existingError || !existing) return jsonResponse({ error: 'Testimonial not found.' }, 404)
          if (existing.is_published) return jsonResponse({ error: 'Published testimonials can only be changed by a super administrator.' }, 403)
        }
        const { data, error } = await adminClient.from('testimonials').update(record).eq('id', id).select('*').single()
        if (error) throw error
        await writeAudit('testimonial_updated', 'testimonial', id, { published: isPublished })
        return jsonResponse({ success: true, testimonial: data })
      }
      const { data, error } = await adminClient.from('testimonials').insert({ ...record, created_by: userData.user.id }).select('*').single()
      if (error) throw error
      await writeAudit('testimonial_created', 'testimonial', data.id, { source_quote_id: sourceQuoteId, published: isPublished })
      return jsonResponse({ success: true, testimonial: data })
    }

    if (action === 'create-testimonial-from-quote') {
      const quoteId = String(body?.quoteId || '')
      if (!uuidPattern.test(quoteId)) return jsonResponse({ error: 'Invalid enquiry reference.' }, 400)
      const { data: quote, error: quoteError } = await adminClient
        .from('quotes')
        .select('id,full_name,company_name,product_name,destination_country,message')
        .eq('id', quoteId)
        .single()
      if (quoteError || !quote) return jsonResponse({ error: 'Enquiry not found.' }, 404)
      const { data: existing } = await adminClient.from('testimonials').select('id').eq('source_quote_id', quoteId).maybeSingle()
      if (existing) return jsonResponse({ error: 'A testimonial draft already exists for this enquiry.' }, 409)
      const context = [quote.company_name, quote.destination_country].filter(Boolean).join(', ')
      const { data, error } = await adminClient.from('testimonials').insert({
        source_quote_id: quote.id,
        buyer_name: quote.full_name,
        company_name: quote.company_name,
        role_or_market: context || quote.product_name || null,
        quote_text: quote.message,
        is_published: false,
        created_by: userData.user.id,
        updated_by: userData.user.id,
      }).select('*').single()
      if (error) throw error
      await writeAudit('testimonial_draft_created', 'testimonial', data.id, { source_quote_id: quote.id })
      return jsonResponse({ success: true, testimonial: data })
    }

    if (action === 'set-testimonial-published') {
      const id = String(body?.id || '')
      if (!uuidPattern.test(id)) return jsonResponse({ error: 'Invalid testimonial reference.' }, 400)
      const isPublished = Boolean(body?.isPublished)
      const { data, error } = await adminClient.from('testimonials').update({
        is_published: isPublished,
        published_at: isPublished ? new Date().toISOString() : null,
        updated_by: userData.user.id,
        updated_at: new Date().toISOString(),
      }).eq('id', id).select('*').single()
      if (error) throw error
      await writeAudit(isPublished ? 'testimonial_published' : 'testimonial_unpublished', 'testimonial', id, { source_quote_id: data.source_quote_id })
      return jsonResponse({ success: true, testimonial: data })
    }

    if (action === 'delete-testimonial') {
      const id = String(body?.id || '')
      if (!uuidPattern.test(id)) return jsonResponse({ error: 'Invalid testimonial reference.' }, 400)
      const { data: existing, error: existingError } = await adminClient.from('testimonials').select('id,is_published,buyer_name').eq('id', id).single()
      if (existingError || !existing) return jsonResponse({ error: 'Testimonial not found.' }, 404)
      if (existing.is_published) return jsonResponse({ error: 'Unpublish this testimonial before deleting it.' }, 400)
      const { error } = await adminClient.from('testimonials').delete().eq('id', id)
      if (error) throw error
      await writeAudit('testimonial_deleted', 'testimonial', id, { buyer_name: existing.buyer_name })
      return jsonResponse({ success: true })
    }

    return jsonResponse({ error: 'Unsupported action.' }, 400)
  } catch (error) {
    console.error('admin-content error:', error)
    const message = error instanceof Error ? error.message : 'Unexpected content administration error.'
    return jsonResponse({ error: message }, 400)
  }
})
