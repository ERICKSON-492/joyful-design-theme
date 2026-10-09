/** Small helpers shared by the popup notifications (sound + desktop alerts). */

let audioCtx: AudioContext | null = null

/** Soft two-note chime. Silently does nothing if the browser blocks audio. */
export function playChime() {
  try {
    const Ctx = window.AudioContext || (window as any).webkitAudioContext
    if (!Ctx) return
    audioCtx = audioCtx || new Ctx()
    const ctx = audioCtx
    if (ctx.state === 'suspended') void ctx.resume()
    const now = ctx.currentTime
    ;[880, 1175].forEach((freq, i) => {
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.type = 'sine'
      osc.frequency.value = freq
      gain.gain.setValueAtTime(0.0001, now + i * 0.16)
      gain.gain.exponentialRampToValueAtTime(0.15, now + i * 0.16 + 0.02)
      gain.gain.exponentialRampToValueAtTime(0.0001, now + i * 0.16 + 0.25)
      osc.connect(gain).connect(ctx.destination)
      osc.start(now + i * 0.16)
      osc.stop(now + i * 0.16 + 0.3)
    })
  } catch {
    /* ignore */
  }
}

export function desktopAlertsSupported() {
  return typeof window !== 'undefined' && 'Notification' in window
}

export function desktopAlertsPermission(): NotificationPermission | 'unsupported' {
  return desktopAlertsSupported() ? Notification.permission : 'unsupported'
}

export async function requestDesktopAlerts() {
  if (!desktopAlertsSupported()) return 'unsupported' as const
  return Notification.requestPermission()
}

/** Shows an operating-system notification when the tab is in the background. */
export function showDesktopAlert(title: string, body: string, onClick?: () => void) {
  try {
    if (!desktopAlertsSupported() || Notification.permission !== 'granted' || !document.hidden) return
    const n = new Notification(title, { body, icon: '/favicon.png' })
    n.onclick = () => {
      window.focus()
      onClick?.()
      n.close()
    }
  } catch {
    /* ignore */
  }
}
