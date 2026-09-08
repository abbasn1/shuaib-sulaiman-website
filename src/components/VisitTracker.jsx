import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import { supabase } from '../lib/supabase'

function VisitTracker() {
  const location = useLocation()

  useEffect(() => {
    if (!supabase) return

    const recordVisit = async () => {
      const { error } = await supabase.from('visits').insert({
        page_path: `${location.pathname}${location.search}`,
        referrer: document.referrer || null,
        user_agent: navigator.userAgent || null,
      })

      if (error) console.warn('Visit tracking unavailable:', error.message)
    }

    recordVisit()
  }, [location.pathname, location.search])

  return null
}

export default VisitTracker
