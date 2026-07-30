import { useEffect } from 'react'
import { supabase } from '@/integrations/supabase/client'

/**
 * Ensures a `profiles` row exists for whoever is signed in, the moment a
 * session becomes active — regardless of how they signed in or which page
 * they land on afterwards.
 *
 * This has to live somewhere mounted for the entire app's lifetime, not
 * scoped to the /auth page. Google (and other OAuth) sign-ins redirect back
 * to the site's homepage, not back to /auth, so a listener that only exists
 * while the auth page is mounted would never fire for them — that was the
 * actual bug that caused OAuth signups to never get a profile row, even
 * though a very similar-looking fix had already been added to AuthPage.tsx.
 */
export function useProfileSync() {
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event !== 'SIGNED_IN' || !session?.user) return

      const user = session.user
      supabase
        .from('profiles')
        .upsert(
          {
            user_id: user.id,
            email: user.email || null,
            display_name: user.user_metadata?.full_name || user.user_metadata?.name || null,
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'user_id', ignoreDuplicates: false }
        )
        .then(({ error }) => {
          if (error) console.error('Profile sync failed:', error)
        })
    })

    return () => subscription.unsubscribe()
  }, [])
}
