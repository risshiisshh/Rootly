import { forwardRef, HTMLAttributes } from 'react'
import { cn } from '@/lib/utils'

interface GlassCardProps extends HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'primary' | 'elevated' | 'flat'
  hover?: boolean
}

/**
 * GlassCard — The primary glass surface primitive for the Rootly design system.
 * Implements glassmorphism with Tech-Noir aesthetics from the Stitch design.
 */
export const GlassCard = forwardRef<HTMLDivElement, GlassCardProps>(
  ({ className, variant = 'default', hover = true, children, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          // Base glassmorphism
          'relative overflow-hidden rounded-lg',
          'border backdrop-blur-xl transition-all duration-300',
          // Variant styles
          variant === 'default' && [
            'bg-[rgba(30,32,30,0.4)]',
            'border-[rgba(255,255,255,0.08)]',
            'shadow-[inset_0_1px_1px_rgba(255,255,255,0.05)]',
          ],
          variant === 'primary' && [
            'bg-[rgba(13,83,14,0.3)]',
            'border-[rgba(145,216,131,0.2)]',
            'shadow-[0_0_30px_rgba(145,216,131,0.05)]',
          ],
          variant === 'elevated' && [
            'bg-[rgba(40,42,40,0.6)]',
            'border-[rgba(255,255,255,0.1)]',
            'shadow-[0_8px_32px_rgba(0,0,0,0.4),inset_0_1px_1px_rgba(255,255,255,0.08)]',
          ],
          variant === 'flat' && [
            'bg-surface-container',
            'border-outline-variant/30',
          ],
          // Hover enhancement
          hover && [
            'hover:border-[rgba(145,216,131,0.2)]',
            'hover:bg-[rgba(13,83,14,0.1)]',
            'hover:shadow-[inset_0_1px_1px_rgba(255,255,255,0.08),0_0_20px_rgba(145,216,131,0.05)]',
          ],
          className
        )}
        {...props}
      >
        {children}
      </div>
    )
  }
)
GlassCard.displayName = 'GlassCard'

interface GlassPanelProps extends HTMLAttributes<HTMLDivElement> {
  blur?: 'sm' | 'md' | 'lg' | 'xl'
}

/**
 * GlassPanel — A full-bleed glass surface for modal overlays and sidebars.
 */
export const GlassPanel = forwardRef<HTMLDivElement, GlassPanelProps>(
  ({ className, blur = 'lg', children, ...props }, ref) => {
    const blurMap = {
      sm: 'backdrop-blur-sm',
      md: 'backdrop-blur-md',
      lg: 'backdrop-blur-lg',
      xl: 'backdrop-blur-2xl',
    }
    return (
      <div
        ref={ref}
        className={cn(
          'bg-background/40',
          blurMap[blur],
          'border border-[rgba(255,255,255,0.08)]',
          className
        )}
        {...props}
      >
        {children}
      </div>
    )
  }
)
GlassPanel.displayName = 'GlassPanel'

/**
 * KineticGradient — The signature Rootly gradient element (forest green → electric mint)
 */
export function KineticGradient({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        'bg-gradient-to-br from-primary-container to-primary',
        className
      )}
      {...props}
    />
  )
}

/**
 * DotGrid — Technical radial dot grid background pattern
 */
export function DotGrid({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn('absolute inset-0 pointer-events-none', className)}
      style={{
        backgroundImage: 'radial-gradient(rgba(145, 216, 131, 0.07) 1px, transparent 1px)',
        backgroundSize: '28px 28px',
      }}
      aria-hidden="true"
      {...props}
    />
  )
}

/**
 * ScanlineOverlay — Cinematic scanline animation overlay
 */
export function ScanlineOverlay({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn('absolute inset-0 pointer-events-none overflow-hidden', className)}
      aria-hidden="true"
      {...props}
    >
      <div
        className="absolute left-0 right-0 h-[2px] opacity-[0.015]"
        style={{
          background: 'linear-gradient(to right, transparent, rgba(145,216,131,0.5), transparent)',
          animation: 'scanline 6s linear infinite',
          top: '-2px',
        }}
      />
    </div>
  )
}
