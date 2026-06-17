'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/store/userStore'
import { ROUTES } from '@/lib/constants'
import { useOnlineStatus } from '@/hooks/useOnlineStatus'
import { OfflineBanner } from '@/components/shared/StateFeedback'

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const { isAuthenticated, isLoading } = useAuthStore()
  const isOnline = useOnlineStatus()

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.replace(ROUTES.SIGN_IN)
    }
  }, [isAuthenticated, isLoading, router])

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center" aria-label="Loading application">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary-container to-primary flex items-center justify-center">
            <span className="material-symbols-outlined text-on-primary animate-pulse" style={{ fontVariationSettings: '"FILL" 1' }} aria-hidden="true">eco</span>
          </div>
          <div className="flex gap-1.5" aria-hidden="true">
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                className="w-1.5 h-1.5 rounded-full bg-primary animate-bounce"
                style={{ animationDelay: `${i * 150}ms` }}
              />
            ))}
          </div>
          <p className="font-geist text-[11px] text-primary uppercase tracking-widest">Initializing Intelligence</p>
        </div>
      </div>
    )
  }

  if (!isAuthenticated) {
    return null
  }

  return (
    <div className="min-h-screen bg-background pt-20 pb-24 md:pb-0">
      <OfflineBanner isOnline={isOnline} />
      {children}
    </div>
  )
}

