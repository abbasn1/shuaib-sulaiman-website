import { supabase } from './lib/supabase'

const formatRole = (role) => String(role || '').replaceAll('_', ' ')
const cleanName = (user) => {
  const name = String(user?.full_name || '').trim()
  if (name && name.toLowerCase() !== 'new user') return name
  return String(user?.email || 'Staff member').trim()
}
const labelFor = (user) => `${cleanName(user)} — ${formatRole(user?.role)}`

async function refreshAdminUserLabels() {
  if (!window.location.pathname.startsWith('/admin') || !supabase) return
  const { data } = await supabase
    .from('profiles')
    .select('id,full_name,email,role,is_active')
  if (!data) return

  const users = new Map(data.map((user) => [user.id, user]))

  document.querySelectorAll('.ops-enquiry-controls select').forEach((select) => {
    const options = [...select.options]
    options.forEach((option) => {
      const user = users.get(option.value)
      if (user) option.textContent = labelFor(user)
    })
  })

  document.querySelectorAll('.ops-user-row').forEach((row) => {
    const email = row.querySelector('p')?.textContent?.trim()
    const user = data.find((item) => item.email === email)
    const heading = row.querySelector('h3')
    if (user && heading) heading.textContent = cleanName(user)
  })

  document.querySelectorAll('.ops-readonly-note').forEach((node) => {
    if (!node.textContent?.startsWith('Assigned to ')) return
    const quoteCard = node.closest('.ops-enquiry-card')
    const select = quoteCard?.querySelector('.ops-enquiry-controls select')
    const selected = select ? users.get(select.value) : null
    if (selected) node.textContent = `Assigned to ${labelFor(selected)}`
  })
}

let timer
const schedule = () => {
  window.clearTimeout(timer)
  timer = window.setTimeout(refreshAdminUserLabels, 80)
}

if (typeof window !== 'undefined') {
  window.addEventListener('load', schedule)
  const observer = new MutationObserver(schedule)
  observer.observe(document.documentElement, { childList: true, subtree: true })
}
