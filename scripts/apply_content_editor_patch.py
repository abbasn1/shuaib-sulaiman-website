from pathlib import Path


def replace(path, old, new, count=1):
    file = Path(path)
    text = file.read_text()
    hits = text.count(old)
    if hits < count:
        raise SystemExit(f"{path}: expected at least {count} occurrence(s), found {hits}: {old[:120]!r}")
    file.write_text(text.replace(old, new, count))


# Dashboard role model and content surfaces.
path = "src/pages/AdminDashboardPage.jsx"
replace(path,
    "const roles = ['super_admin', 'admin', 'quote_manager', 'sales_officer', 'analytics_viewer', 'auditor']",
    "const roles = ['super_admin', 'admin', 'quote_manager', 'sales_officer', 'analytics_viewer', 'auditor', 'content_editor']")
replace(path,
    "  const isSuperAdmin = role === 'super_admin'\n  const canManageUsers",
    "  const isSuperAdmin = role === 'super_admin'\n  const canManageContent = ['super_admin', 'content_editor'].includes(role)\n  const canManageUsers")
replace(path,
    "  const loadContent = useCallback(async () => {\n    if (!isSuperAdmin) {\n      setProducts([])\n      setTestimonials([])\n      setTestimonialCandidates([])\n      return\n    }\n    const data = await callContentFunction({ action: 'list' })\n    setProducts(data?.products ?? [])\n    setTestimonials(data?.testimonials ?? [])\n    setTestimonialCandidates(data?.testimonialCandidates ?? [])\n  }, [callContentFunction, isSuperAdmin])",
    "  const loadContent = useCallback(async () => {\n    if (!canManageContent) {\n      setProducts([])\n      setTestimonials([])\n      setTestimonialCandidates([])\n      return\n    }\n    const data = await callContentFunction({ action: 'list' })\n    setProducts(data?.products ?? [])\n    setTestimonials(data?.testimonials ?? [])\n    setTestimonialCandidates(data?.testimonialCandidates ?? [])\n  }, [callContentFunction, canManageContent])")
replace(path,
    "    if (profileData.role === 'super_admin') {\n      try {\n        const [settingsData, contentData] = await Promise.all([\n          callAdminFunction({ action: 'get-settings' }),\n          callContentFunction({ action: 'list' }),\n        ])\n        setNotificationEmail(settingsData?.settings?.quoteNotificationEmail || 'sulaiman_shuaib@yahoo.com')\n        setSettingsUpdatedAt(settingsData?.settings?.updatedAt || null)\n        setProducts(contentData?.products ?? [])\n        setTestimonials(contentData?.testimonials ?? [])\n        setTestimonialCandidates(contentData?.testimonialCandidates ?? [])\n      } catch (adminLoadError) {\n        setError((current) => current || adminLoadError.message)\n      }\n    } else {\n      setProducts([])\n      setTestimonials([])\n      setTestimonialCandidates([])\n    }",
    "    if (profileData.role === 'super_admin') {\n      try {\n        const [settingsData, contentData] = await Promise.all([\n          callAdminFunction({ action: 'get-settings' }),\n          callContentFunction({ action: 'list' }),\n        ])\n        setNotificationEmail(settingsData?.settings?.quoteNotificationEmail || 'sulaiman_shuaib@yahoo.com')\n        setSettingsUpdatedAt(settingsData?.settings?.updatedAt || null)\n        setProducts(contentData?.products ?? [])\n        setTestimonials(contentData?.testimonials ?? [])\n        setTestimonialCandidates(contentData?.testimonialCandidates ?? [])\n      } catch (adminLoadError) {\n        setError((current) => current || adminLoadError.message)\n      }\n    } else if (profileData.role === 'content_editor') {\n      try {\n        const contentData = await callContentFunction({ action: 'list' })\n        setProducts(contentData?.products ?? [])\n        setTestimonials(contentData?.testimonials ?? [])\n        setTestimonialCandidates(contentData?.testimonialCandidates ?? [])\n      } catch (contentLoadError) {\n        setError((current) => current || contentLoadError.message)\n      }\n    } else {\n      setProducts([])\n      setTestimonials([])\n      setTestimonialCandidates([])\n    }")
replace(path, "        isPublished: productForm.isPublished,", "        isPublished: isSuperAdmin ? productForm.isPublished : false,")
replace(path, "        isPublished: testimonialForm.isPublished,", "        isPublished: isSuperAdmin ? testimonialForm.isPublished : false,")
replace(path,
    "        {isSuperAdmin && <button className={section === 'products' ? 'active' : ''} onClick={() => setSection('products')}>Products</button>}",
    "        {canManageContent && <button className={section === 'products' ? 'active' : ''} onClick={() => setSection('products')}>Products</button>}")
replace(path,
    "        {isSuperAdmin && <button className={section === 'testimonials' ? 'active' : ''} onClick={() => setSection('testimonials')}>Testimonials</button>}",
    "        {canManageContent && <button className={section === 'testimonials' ? 'active' : ''} onClick={() => setSection('testimonials')}>Testimonials</button>}")
replace(path, "      {section === 'products' && isSuperAdmin && (", "      {section === 'products' && canManageContent && (")
replace(path, "      {section === 'testimonials' && isSuperAdmin && (", "      {section === 'testimonials' && canManageContent && (")
replace(path,
    '<button className="ops-ghost" type="button" onClick={() => setProductForm(productRowToForm(product))}>Edit</button>',
    '<button className="ops-ghost" type="button" disabled={!isSuperAdmin && product.is_published} onClick={() => setProductForm(productRowToForm(product))}>Edit</button>')
replace(path,
    '<button className="ops-ghost" type="button" disabled={busyAction === `product:${product.id}`} onClick={() => setProductPublished(product, !product.is_published)}>{product.is_published ? \'Unpublish\' : \'Publish\'}</button>',
    '{isSuperAdmin && <button className="ops-ghost" type="button" disabled={busyAction === `product:${product.id}`} onClick={() => setProductPublished(product, !product.is_published)}>{product.is_published ? \'Unpublish\' : \'Publish\'}</button>}')
replace(path,
    '<label className="ops-check"><input type="checkbox" checked={productForm.isPublished} onChange={(event) => setProductForm((form) => ({ ...form, isPublished: event.target.checked }))} /><span>Publish immediately after saving</span></label>',
    '{isSuperAdmin ? <label className="ops-check"><input type="checkbox" checked={productForm.isPublished} onChange={(event) => setProductForm((form) => ({ ...form, isPublished: event.target.checked }))} /><span>Publish immediately after saving</span></label> : <p className="ops-readonly-note">Your product changes are saved as drafts. A super administrator publishes them.</p>}')
replace(path,
    '<button className="ops-ghost" type="button" onClick={() => setTestimonialForm(testimonialRowToForm(testimonial))}>Edit</button><button className="ops-ghost" type="button" onClick={() => setTestimonialPublished(testimonial, !testimonial.is_published)}>{testimonial.is_published ? \'Unpublish\' : \'Publish\'}</button>',
    '<button className="ops-ghost" type="button" disabled={!isSuperAdmin && testimonial.is_published} onClick={() => setTestimonialForm(testimonialRowToForm(testimonial))}>Edit</button>{isSuperAdmin && <button className="ops-ghost" type="button" onClick={() => setTestimonialPublished(testimonial, !testimonial.is_published)}>{testimonial.is_published ? \'Unpublish\' : \'Publish\'}</button>}')
replace(path,
    '<label className="ops-check"><input type="checkbox" checked={testimonialForm.isPublished} onChange={(event) => setTestimonialForm((form) => ({ ...form, isPublished: event.target.checked }))} /><span>Publish on the public website</span></label>',
    '{isSuperAdmin ? <label className="ops-check"><input type="checkbox" checked={testimonialForm.isPublished} onChange={(event) => setTestimonialForm((form) => ({ ...form, isPublished: event.target.checked }))} /><span>Publish on the public website</span></label> : <p className="ops-readonly-note">You can prepare testimonial drafts. Only a super administrator can publish or unpublish buyer comments.</p>}')

# User-management role assignment.
replace("supabase/functions/admin-users/index.ts",
    "const assignableRoles = ['super_admin', 'admin', 'quote_manager', 'sales_officer', 'analytics_viewer', 'auditor']",
    "const assignableRoles = ['super_admin', 'admin', 'quote_manager', 'sales_officer', 'analytics_viewer', 'auditor', 'content_editor']")

# Content service: content editors may manage drafts, while public publishing stays super-admin-only.
path = "supabase/functions/admin-content/index.ts"
replace(path,
    "    if (profile.role !== 'super_admin') return jsonResponse({ error: 'Only a super administrator can manage public content.' }, 403)\n\n    const body = await request.json()\n    const action = String(body?.action || '')",
    "    const callerIsSuperAdmin = profile.role === 'super_admin'\n    const callerIsContentEditor = profile.role === 'content_editor'\n    if (!callerIsSuperAdmin && !callerIsContentEditor) {\n      return jsonResponse({ error: 'Your role cannot manage website content.' }, 403)\n    }\n\n    const body = await request.json()\n    const action = String(body?.action || '')\n    if (callerIsContentEditor && ['set-product-published', 'set-testimonial-published'].includes(action)) {\n      return jsonResponse({ error: 'Only a super administrator can publish or unpublish public content.' }, 403)\n    }\n    if (callerIsContentEditor && ['save-product', 'save-testimonial'].includes(action)) body.isPublished = false")
replace(path,
    "        if (existingError || !existing) return jsonResponse({ error: 'Product not found.' }, 404)\n        const { data, error } = await adminClient.from('products').update(record).eq('id', id).select('*').single()",
    "        if (existingError || !existing) return jsonResponse({ error: 'Product not found.' }, 404)\n        if (callerIsContentEditor && existing.is_published) {\n          return jsonResponse({ error: 'Published products can only be changed by a super administrator.' }, 403)\n        }\n        const { data, error } = await adminClient.from('products').update(record).eq('id', id).select('*').single()")
replace(path,
    "      if (id) {\n        const { data, error } = await adminClient.from('testimonials').update(record).eq('id', id).select('*').single()\n        if (error) throw error",
    "      if (id) {\n        if (callerIsContentEditor) {\n          const { data: existing, error: existingError } = await adminClient.from('testimonials').select('id,is_published').eq('id', id).single()\n          if (existingError || !existing) return jsonResponse({ error: 'Testimonial not found.' }, 404)\n          if (existing.is_published) return jsonResponse({ error: 'Published testimonials can only be changed by a super administrator.' }, 403)\n        }\n        const { data, error } = await adminClient.from('testimonials').update(record).eq('id', id).select('*').single()\n        if (error) throw error")

# Base schema reflects the live role and read-only enquiry context.
path = "supabase/schema.sql"
replace(path,
    "create type public.app_role as enum ('super_admin','admin','quote_manager','sales_officer','analytics_viewer','auditor');",
    "create type public.app_role as enum ('super_admin','admin','quote_manager','sales_officer','analytics_viewer','auditor','content_editor');")
replace(path,
    "private.current_role() in ('super_admin','admin','quote_manager','sales_officer','analytics_viewer','auditor')",
    "private.current_role() in ('super_admin','admin','quote_manager','sales_officer','analytics_viewer','auditor','content_editor')",
    count=1)
# Apply the same read-only role set to quote response history.
text = Path(path).read_text()
needle = "private.current_role() in ('super_admin','admin','quote_manager','sales_officer','analytics_viewer','auditor')"
if needle not in text:
    raise SystemExit('supabase/schema.sql: quote response role policy pattern missing')
Path(path).write_text(text.replace(needle, "private.current_role() in ('super_admin','admin','quote_manager','sales_officer','analytics_viewer','auditor','content_editor')", 1))

# UI role smoke coverage.
path = "scripts/smoke-admin-roles.mjs"
replace(path,
    "  auditor: {\n    tabs: ['Overview', 'Enquiries', 'Users & roles', 'Analytics', 'Audit'],\n    hidden: ['Products', 'Testimonials', 'Settings'],\n    status: false,\n    assign: false,\n    reply: false,\n    createUser: false,\n  },\n}",
    "  auditor: {\n    tabs: ['Overview', 'Enquiries', 'Users & roles', 'Analytics', 'Audit'],\n    hidden: ['Products', 'Testimonials', 'Settings'],\n    status: false,\n    assign: false,\n    reply: false,\n    createUser: false,\n  },\n  content_editor: {\n    tabs: ['Overview', 'Enquiries', 'Products', 'Testimonials'],\n    hidden: ['Users & roles', 'Analytics', 'Audit', 'Settings'],\n    status: false,\n    assign: false,\n    reply: false,\n    createUser: false,\n  },\n}")
replace(path,
    "      if (state.role !== 'super_admin') return json(route, { error: 'Only a super administrator can manage public content.' }, 403)",
    "      if (!['super_admin', 'content_editor'].includes(state.role)) return json(route, { error: 'Your role cannot manage website content.' }, 403)")
# Content editor must never be presented with publish controls.
replace(path,
    "    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)",
    "    if (role === 'content_editor') {\n      await page.getByRole('button', { name: 'Products', exact: true }).click()\n      assert(await page.getByRole('button', { name: 'Publish', exact: true }).count() === 0, 'content_editor: publish product action should be hidden')\n      await page.getByRole('button', { name: 'Testimonials', exact: true }).click()\n      assert(await page.getByRole('button', { name: 'Publish', exact: true }).count() === 0, 'content_editor: publish testimonial action should be hidden')\n    }\n\n    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)")

print('Content editor patch applied.')
