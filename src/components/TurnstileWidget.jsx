import { useEffect, useRef } from 'react'

const scriptId = 'cloudflare-turnstile-script'
const scriptUrl = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit'

function TurnstileWidget({ siteKey, onTokenChange }) {
  const containerRef = useRef(null)

  useEffect(() => {
    if (!siteKey || !containerRef.current) return undefined

    let disposed = false
    let widgetId

    const renderWidget = () => {
      if (disposed || !containerRef.current || !window.turnstile || widgetId !== undefined) return

      widgetId = window.turnstile.render(containerRef.current, {
        sitekey: siteKey,
        callback: (token) => onTokenChange(token),
        'expired-callback': () => onTokenChange(''),
        'error-callback': () => onTokenChange(''),
        theme: 'auto',
      })
    }

    if (window.turnstile) {
      renderWidget()
    } else {
      let script = document.getElementById(scriptId)
      if (!script) {
        script = document.createElement('script')
        script.id = scriptId
        script.src = scriptUrl
        script.async = true
        script.defer = true
        document.head.appendChild(script)
      }
      script.addEventListener('load', renderWidget)

      return () => {
        disposed = true
        script.removeEventListener('load', renderWidget)
        if (widgetId !== undefined && window.turnstile) window.turnstile.remove(widgetId)
      }
    }

    return () => {
      disposed = true
      if (widgetId !== undefined && window.turnstile) window.turnstile.remove(widgetId)
    }
  }, [siteKey, onTokenChange])

  if (!siteKey) return null

  return <div className="turnstile-widget" ref={containerRef} aria-label="Security verification" />
}

export default TurnstileWidget
