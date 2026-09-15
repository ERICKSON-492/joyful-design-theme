import { useEffect } from 'react'
import { getCurrentUser } from '@/lib/auth'

export function useProfileSync() {
  useEffect(() => {
    getCurrentUser().catch(() => {})
  }, [])
}
