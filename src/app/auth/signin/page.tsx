'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useAuth } from '@/features/auth/AuthContext'
import { GlassCard, DotGrid } from '@/components/glass/GlassCard'
import { cn } from '@/lib/utils'
import { ROUTES } from '@/lib/constants'

export default function SignInPage() {
  const router = useRouter()
  const { signIn, signUp, signInWithGoogle } = useAuth()
  const [mode, setMode] = useState<'signin' | 'signup'>('signin')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setIsLoading(true)
    try {
      if (mode === 'signin') {
        await signIn(email, password)
      } else {
        await signUp(email, password, displayName)
      }
      router.push(ROUTES.DASHBOARD)
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Authentication failed'
      setError(errorMessage.replace('Firebase: ', '').replace(/\(auth\/.*\)/, '').trim())
    } finally {
      setIsLoading(false)
    }
  }

  const handleGoogleSignIn = async () => {
    setError(null)
    setIsLoading(true)
    try {
      await signInWithGoogle()
      router.push(ROUTES.DASHBOARD)
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Google sign-in failed'
      setError(errorMessage)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4 py-24 relative overflow-hidden">
      <DotGrid />

      {/* Background glow */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none" aria-hidden="true">
        <div className="w-[600px] h-[600px] rounded-full bg-primary/5 blur-[120px]" />
      </div>

      <div className="relative z-10 w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-10">
          <Link href={ROUTES.HOME} className="inline-flex items-center gap-2 mb-6" aria-label="Back to Rootly home">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary-container to-primary flex items-center justify-center">
              <span className="material-symbols-outlined text-[20px] text-on-primary" style={{ fontVariationSettings: '"FILL" 1' }} aria-hidden="true">eco</span>
            </div>
            <span className="font-geist text-2xl font-bold text-primary tracking-tight">Rootly</span>
          </Link>
          <h1 className="font-geist font-bold text-on-surface text-2xl" style={{ letterSpacing: '-0.02em' }}>
            {mode === 'signin' ? 'Intelligence Access' : 'Initialize Profile'}
          </h1>
          <p className="font-hanken text-on-surface-variant mt-2 text-sm">
            {mode === 'signin'
              ? 'Sign in to your sustainability intelligence platform'
              : 'Create your precision carbon tracking profile'}
          </p>
        </div>

        <GlassCard className="p-8" hover={false}>
          {/* Mode toggle */}
          <div className="flex bg-surface-container-high/50 rounded-full p-1 mb-8" aria-label="Sign in or sign up">
            {(['signin', 'signup'] as const).map((m) => (
              <button
                key={m}
                aria-pressed={mode === m}
                onClick={() => { setMode(m); setError(null) }}
                className={cn(
                  'flex-1 py-2 rounded-full font-geist text-sm font-medium transition-all duration-200',
                  mode === m
                    ? 'bg-primary text-on-primary shadow-sm'
                    : 'text-on-surface-variant hover:text-on-surface'
                )}
              >
                {m === 'signin' ? 'Sign In' : 'Sign Up'}
              </button>
            ))}
          </div>

          {/* Error */}
          {error && (
            <div className="mb-6 p-3 rounded-lg bg-error-container/20 border border-error/30 flex items-start gap-2" role="alert">
              <span className="material-symbols-outlined text-error text-[18px] mt-0.5 shrink-0" aria-hidden="true">error</span>
              <p className="font-hanken text-error text-sm">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4" noValidate>
            {/* Display Name (sign up only) */}
            {mode === 'signup' && (
              <div>
                <label htmlFor="displayName" className="block font-geist text-[11px] text-primary uppercase tracking-widest mb-2">
                  Display Name
                </label>
                <input
                  id="displayName"
                  type="text"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="Your name"
                  autoComplete="name"
                  required={mode === 'signup'}
                  className="w-full recessed-input rounded-lg px-4 py-3 font-hanken text-on-surface placeholder:text-on-surface-variant/40 text-sm"
                />
              </div>
            )}

            {/* Email */}
            <div>
              <label htmlFor="email" className="block font-geist text-[11px] text-primary uppercase tracking-widest mb-2">
                Email
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                autoComplete="email"
                required
                className="w-full recessed-input rounded-lg px-4 py-3 font-hanken text-on-surface placeholder:text-on-surface-variant/40 text-sm"
              />
            </div>

            {/* Password */}
            <div>
              <label htmlFor="password" className="block font-geist text-[11px] text-primary uppercase tracking-widest mb-2">
                Password
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={mode === 'signup' ? 'Min. 8 characters' : '••••••••'}
                autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
                required
                minLength={mode === 'signup' ? 8 : 6}
                className="w-full recessed-input rounded-lg px-4 py-3 font-hanken text-on-surface placeholder:text-on-surface-variant/40 text-sm"
              />
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={isLoading}
              className={cn(
                'w-full py-3 rounded-full font-geist font-bold text-sm uppercase tracking-wide',
                'bg-primary text-on-primary',
                'hover:opacity-90 active:scale-[0.98] transition-all duration-200',
                'disabled:opacity-50 disabled:cursor-not-allowed',
                'mt-2'
              )}
              aria-busy={isLoading}
            >
              {isLoading ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="w-4 h-4 border-2 border-on-primary/30 border-t-on-primary rounded-full animate-spin" aria-hidden="true" />
                  Processing...
                </span>
              ) : (
                mode === 'signin' ? 'ACCESS_SYSTEM' : 'INITIALIZE_PROFILE'
              )}
            </button>
          </form>

          {/* Divider */}
          <div className="flex items-center gap-4 my-6">
            <div className="flex-1 h-px bg-outline-variant/30" />
            <span className="font-geist text-[10px] text-on-surface-variant uppercase tracking-widest">or</span>
            <div className="flex-1 h-px bg-outline-variant/30" />
          </div>

          {/* Google Sign In */}
          <button
            onClick={handleGoogleSignIn}
            disabled={isLoading}
            className={cn(
              'w-full py-3 rounded-full font-geist font-medium text-sm',
              'flex items-center justify-center gap-3',
              'bg-surface-container-high border border-outline-variant/30',
              'text-on-surface hover:border-primary/30 hover:bg-surface-container',
              'active:scale-[0.98] transition-all duration-200',
              'disabled:opacity-50 disabled:cursor-not-allowed'
            )}
          >
            {/* Google G SVG */}
            <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
              <path fill="#4285F4" d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615z"/>
              <path fill="#34A853" d="M9 18c2.43 0 4.467-.806 5.956-2.184l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z"/>
              <path fill="#FBBC05" d="M3.964 10.712A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.712V4.956H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.044l3.007-2.332z"/>
              <path fill="#EA4335" d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.956L3.964 7.288C4.672 5.163 6.656 3.58 9 3.58z"/>
            </svg>
            Continue with Google
          </button>
        </GlassCard>

        <p className="text-center font-hanken text-on-surface-variant/50 text-xs mt-6">
          By continuing, you agree to our{' '}
          <a href="#" className="text-primary hover:underline">Terms of Service</a>
          {' '}and{' '}
          <a href="#" className="text-primary hover:underline">Privacy Policy</a>
        </p>
      </div>
    </div>
  )
}
