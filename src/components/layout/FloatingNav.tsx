'use client'

import Link from 'next/link'
import Image from 'next/image'
import { usePathname, useRouter } from 'next/navigation'
import { useState } from 'react'
import { cn } from '@/lib/utils'
import { NAV_ITEMS, ROUTES } from '@/lib/constants'
import { useAuthStore } from '@/store/userStore'
import { useAuth } from '@/features/auth/AuthContext'

import * as DropdownMenu from '@radix-ui/react-dropdown-menu'
import { motion, AnimatePresence, Variants } from 'framer-motion'

const menuVariants: Variants = {
  hidden: { 
    opacity: 0, 
    y: -15, 
    scale: 0.96,
    transition: {
      duration: 0.18,
      ease: [0.32, 0, 0.67, 0] as const, // easeInQuad
    }
  },
  visible: { 
    opacity: 1, 
    y: 0, 
    scale: 1,
    transition: {
      type: 'spring',
      stiffness: 350,
      damping: 26,
      mass: 0.8,
      staggerChildren: 0.04,
      delayChildren: 0.05,
    }
  }
}

const itemVariants: Variants = {
  hidden: { opacity: 0, y: -8, scale: 0.97 },
  visible: { 
    opacity: 1, 
    y: 0, 
    scale: 1,
    transition: {
      type: 'spring',
      stiffness: 400,
      damping: 24
    }
  }
}

/**
 * FloatingNav — The floating pill-shaped navigation bar from the Stitch design.
 * Fixed, backdrop-blur, with active route highlighting and mobile hamburger.
 */
export function FloatingNav() {
  const pathname = usePathname()
  const router = useRouter()
  const { userProfile, isAuthenticated } = useAuthStore()
  const { signOutUser } = useAuth()
  const [mobileOpen, setMobileOpen] = useState(false)

  const handleSignOut = async () => {
    await signOutUser()
    router.push(ROUTES.HOME)
  }

  return (
    <>
      {/* Desktop & Mobile floating top header */}
      <header
        className="fixed top-4 left-1/2 -translate-x-1/2 z-50 w-full max-w-5xl px-4"
        style={{ transform: 'translateX(-50%)' }}
      >
        <nav
          className={cn(
            'flex items-center justify-between',
            'px-6 py-2 rounded-full',
            'bg-white/[0.03] backdrop-blur-3xl saturate-[190%]',
            'border border-white/[0.1] border-t-white/[0.18] border-b-black/[0.4]',
            'shadow-[0_12px_40px_rgba(0,0,0,0.65),inset_0_1px_1.5px_rgba(255,255,255,0.1)]',
            'transition-all duration-300 hover:border-white/[0.14] hover:border-t-white/[0.24] hover:shadow-[0_16px_48px_rgba(145,216,131,0.06),0_12px_40px_rgba(0,0,0,0.7),inset_0_1px_2px_rgba(255,255,255,0.15)]'
          )}
          aria-label="Main navigation"
        >
          {/* Logo */}
          <Link
            href={isAuthenticated ? ROUTES.DASHBOARD : ROUTES.HOME}
            className="flex items-center gap-2 shrink-0 group"
            aria-label="Rootly home"
          >
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary-container to-primary flex items-center justify-center transition-transform duration-300 group-hover:scale-105 group-hover:rotate-6">
              <span
                className="material-symbols-outlined text-[18px] text-on-primary"
                style={{ fontVariationSettings: '"FILL" 1' }}
                aria-hidden="true"
              >
                eco
              </span>
            </div>
            <span className="font-geist text-lg font-bold text-primary leading-none tracking-tight transition-opacity duration-200 group-hover:opacity-90">
              Rootly
            </span>
          </Link>

          {/* Center nav links (desktop) */}
          {isAuthenticated ? (
            <ul className="hidden md:flex items-center gap-1.5">
              {NAV_ITEMS.map((item) => {
                const isActive =
                  pathname === item.href ||
                  (item.href !== ROUTES.DASHBOARD && pathname.startsWith(item.href))
                return (
                  <li key={item.href} className="relative">
                    <Link
                      href={item.href}
                      className={cn(
                        'relative flex items-center gap-1.5 px-3.5 py-1.5 rounded-full',
                        'font-geist text-label-md transition-all duration-200',
                        isActive
                          ? 'text-primary font-semibold'
                          : 'text-on-surface-variant hover:text-on-surface hover:bg-white/5 border border-transparent'
                      )}
                      aria-current={isActive ? 'page' : undefined}
                    >
                      {isActive && (
                        <>
                          {/* Ambient soft glow */}
                          <div className="absolute inset-0 rounded-full bg-[radial-gradient(circle_at_center,rgba(145,216,131,0.12)_0%,transparent_75%)] blur-[2px] pointer-events-none z-0" />
                          {/* Active capsule */}
                          <motion.div
                            layoutId="desktopActiveTab"
                            className="absolute inset-0 bg-primary/[0.06] border border-primary/[0.18] rounded-full shadow-[inset_0_1px_1px_rgba(255,255,255,0.06),0_2px_8px_rgba(145,216,131,0.04)] z-0"
                            transition={{ type: 'spring', stiffness: 350, damping: 28 }}
                          />
                        </>
                      )}
                      <span
                        className="relative z-10 material-symbols-outlined text-[16px]"
                        aria-hidden="true"
                      >
                        {item.icon}
                      </span>
                      <span className="relative z-10">{item.label}</span>
                    </Link>
                  </li>
                )
              })}
            </ul>
          ) : null}

          {/* Right side actions */}
          <div className="flex items-center gap-2">
            {isAuthenticated ? (
              <>
                {/* User avatar dropdown menu */}
                <DropdownMenu.Root>
                  <DropdownMenu.Trigger asChild>
                    <button
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-full hover:bg-white/5 transition-colors focus:outline-none focus:ring-1 focus:ring-primary/30 min-h-[48px]"
                      aria-label="User menu"
                    >
                      {userProfile?.photoURL ? (
                        <Image
                          src={userProfile.photoURL}
                          alt={userProfile.displayName ?? 'User'}
                          width={28}
                          height={28}
                          className="w-7 h-7 rounded-full border border-primary/20 object-cover"
                          unoptimized
                        />
                      ) : (
                        <div className="w-7 h-7 rounded-full bg-primary-container flex items-center justify-center">
                          <span className="material-symbols-outlined text-primary text-[14px]" aria-hidden="true">person</span>
                        </div>
                      )}
                      <span className="hidden md:block text-on-surface-variant font-geist text-label-md">
                        {userProfile?.displayName?.split(' ')[0] ?? 'User'}
                      </span>
                      <span className="material-symbols-outlined text-on-surface-variant text-[14px]" aria-hidden="true">
                        arrow_drop_down
                      </span>
                    </button>
                  </DropdownMenu.Trigger>

                  <DropdownMenu.Portal>
                    <DropdownMenu.Content
                      align="end"
                      sideOffset={8}
                      className={cn(
                        'z-[100] min-w-[170px] rounded-2xl p-1.5',
                        'bg-white/[0.04] backdrop-blur-3xl saturate-[190%]',
                        'border border-white/[0.1] border-t-white/[0.2] border-b-black/[0.4]',
                        'shadow-[0_16px_40px_rgba(0,0,0,0.65),inset_0_1px_1.5px_rgba(255,255,255,0.15)]',
                        'animate-in fade-in slide-in-from-top-2 duration-200'
                      )}
                    >
                      <DropdownMenu.Item asChild>
                        <Link
                          href={ROUTES.PROFILE}
                          className={cn(
                            'flex items-center gap-2 w-full px-3 py-2 rounded-xl text-left',
                            'font-geist text-sm text-on-surface hover:bg-white/[0.06] hover:text-primary focus:bg-white/[0.06] focus:text-primary outline-none cursor-pointer transition-colors duration-200'
                          )}
                        >
                          <span className="material-symbols-outlined text-[18px]" aria-hidden="true">
                            account_circle
                          </span>
                          View Profile
                        </Link>
                      </DropdownMenu.Item>
                      <DropdownMenu.Item asChild>
                        <Link
                          href="/analytics"
                          className={cn(
                            'flex items-center gap-2 w-full px-3 py-2 rounded-xl text-left mt-0.5',
                            'font-geist text-sm text-on-surface hover:bg-white/[0.06] hover:text-primary focus:bg-white/[0.06] focus:text-primary outline-none cursor-pointer transition-colors duration-200'
                          )}
                        >
                          <span className="material-symbols-outlined text-[18px]" aria-hidden="true">
                            bar_chart
                          </span>
                          System Analytics
                        </Link>
                      </DropdownMenu.Item>
                      <DropdownMenu.Item
                        onClick={handleSignOut}
                        className={cn(
                          'flex items-center gap-2 w-full px-3 py-2 rounded-xl text-left mt-0.5',
                          'font-geist text-sm text-error hover:bg-error/10 focus:bg-error/10 outline-none cursor-pointer transition-colors duration-200'
                        )}
                      >
                        <span className="material-symbols-outlined text-[18px]" aria-hidden="true">
                          logout
                        </span>
                        Sign Out
                      </DropdownMenu.Item>
                    </DropdownMenu.Content>
                  </DropdownMenu.Portal>
                </DropdownMenu.Root>
              </>
            ) : (
              <div className="flex items-center gap-1.5 sm:gap-2">
                <Link
                  href={ROUTES.SIGN_IN}
                  className={cn(
                    'px-2.5 sm:px-4 py-1.5 rounded-full',
                    'text-on-surface-variant hover:text-on-surface hover:bg-white/5',
                    'font-geist text-label-md font-semibold',
                    'transition-all duration-200 text-xs sm:text-sm'
                  )}
                >
                  Login
                </Link>
                <Link
                  href={ROUTES.SIGN_IN}
                  className="px-2.5 sm:px-4 py-1.5 rounded-full bg-primary text-on-primary font-geist text-label-md font-bold hover:opacity-90 transition-all duration-200 active:scale-95 text-xs sm:text-sm"
                >
                  Get Started
                </Link>
              </div>
            )}

            {/* Mobile menu button */}
            {isAuthenticated && (
              <button
                className="md:hidden w-12 h-12 flex items-center justify-center rounded-full hover:bg-white/5 transition-colors focus:outline-none"
                onClick={() => setMobileOpen(!mobileOpen)}
                aria-label={mobileOpen ? 'Close menu' : 'Open menu'}
                aria-expanded={mobileOpen}
              >
                <motion.span
                  key={mobileOpen ? 'close' : 'menu'}
                  initial={{ rotate: -90, opacity: 0 }}
                  animate={{ rotate: 0, opacity: 1 }}
                  transition={{ duration: 0.15 }}
                  className="material-symbols-outlined text-on-surface"
                  aria-hidden="true"
                >
                  {mobileOpen ? 'close' : 'menu'}
                </motion.span>
              </button>
            )}
          </div>
        </nav>
      </header>

      {/* Mobile slide-down menu */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            variants={menuVariants}
            initial="hidden"
            animate="visible"
            exit="hidden"
            className="md:hidden fixed top-20 left-4 right-4 z-40 rounded-2xl overflow-hidden bg-white/[0.04] backdrop-blur-3xl saturate-[190%] border border-white/[0.08] border-t-white/[0.15] border-b-black/[0.4] shadow-[0_24px_48px_rgba(0,0,0,0.75),inset_0_1px_2px_rgba(255,255,255,0.08)]"
            role="dialog"
            aria-label="Mobile navigation"
          >
            <nav className="p-4 space-y-1">
              {(isAuthenticated ? NAV_ITEMS : [
                { label: 'Features', href: '#features', icon: 'star' },
                { label: 'Sign In', href: ROUTES.SIGN_IN, icon: 'login' },
              ]).map((item) => {
                const isActive = pathname === item.href
                return (
                  <motion.div key={item.href} variants={itemVariants}>
                    <Link
                      href={item.href}
                      className={cn(
                        'flex items-center gap-3 px-4 py-3 rounded-xl',
                        'font-geist text-body-md transition-all w-full',
                        isActive
                          ? 'bg-primary/[0.08] border border-primary/[0.18] text-primary font-semibold'
                          : 'text-on-surface-variant hover:bg-white/5 hover:text-on-surface border border-transparent'
                      )}
                      onClick={() => setMobileOpen(false)}
                      aria-current={isActive ? 'page' : undefined}
                    >
                      <span className="material-symbols-outlined" aria-hidden="true">{item.icon}</span>
                      {item.label}
                    </Link>
                  </motion.div>
                )
              })}
            </nav>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Mobile floating bottom nav */}
      {isAuthenticated && (
        <nav
          className={cn(
            'md:hidden fixed bottom-4 left-4 right-4 z-50',
            'rounded-full',
            'bg-white/[0.03] backdrop-blur-3xl saturate-[190%]',
            'border border-white/[0.06] border-t-white/[0.12] border-b-black/[0.4]',
            'shadow-[0_16px_40px_rgba(0,0,0,0.7),inset_0_1px_1.5px_rgba(255,255,255,0.08)]',
            'transition-all duration-300',
            'safe-area-inset-bottom'
          )}
          aria-label="Mobile bottom navigation"
        >
          <div className="flex justify-around items-center px-2 py-1.5 relative">
            {NAV_ITEMS.slice(0, 5).map((item) => {
              const isActive = pathname === item.href || pathname.startsWith(item.href)
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    'relative flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-full min-w-[48px] min-h-[48px] justify-center transition-all duration-200',
                    isActive ? 'text-primary' : 'text-on-surface-variant hover:text-on-surface'
                  )}
                  aria-label={item.label}
                  aria-current={isActive ? 'page' : undefined}
                >
                  {isActive && (
                    <>
                      {/* Organic background glow */}
                      <div className="absolute inset-0 rounded-full bg-[radial-gradient(circle_at_center,rgba(145,216,131,0.15)_0%,transparent_70%)] blur-[4px] pointer-events-none z-0" />
                      {/* Fluid morphing active indicator pill */}
                      <motion.div
                        layoutId="mobileActiveTab"
                        className="absolute inset-0 bg-white/[0.08] border border-white/[0.12] border-t-white/[0.2] border-b-black/[0.4] rounded-full shadow-[inset_0_1px_1.5px_rgba(255,255,255,0.15),0_4px_12px_rgba(0,0,0,0.2)] z-0"
                        transition={{ type: 'spring', stiffness: 350, damping: 28 }}
                      />
                    </>
                  )}
                  <span
                    className="relative z-10 material-symbols-outlined text-[20px]"
                    style={isActive ? { fontVariationSettings: '"FILL" 1' } : {}}
                    aria-hidden="true"
                  >
                    {item.icon}
                  </span>
                  <span className="relative z-10 text-[10px] font-geist font-medium leading-tight">{item.label}</span>
                </Link>
              )
            })}
          </div>
        </nav>
      )}
    </>
  )
}
