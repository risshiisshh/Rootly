import type { Metadata } from 'next'
import Link from 'next/link'
import { DotGrid, GlassCard } from '@/components/glass/GlassCard'
import { ROUTES } from '@/lib/constants'

export const metadata: Metadata = {
  title: 'Rootly — Quantitative Carbon Intelligence',
  description:
    'High-precision AI carbon modeling for modern sustainability workflows. Track, analyze, and optimize your environmental footprint with intelligent coaching.',
}

const METRIC_ITEMS = [
  { label: 'Carbon Score', value: '84', unit: '/100', icon: 'eco', trend: '+12%' },
  { label: 'CO₂ Saved', value: '42.8', unit: 'kg', icon: 'trending_down', trend: 'This week' },
  { label: 'Active Goals', value: '3', unit: 'goals', icon: 'track_changes', trend: 'On track' },
]

const FEATURE_ITEMS = [
  {
    icon: 'psychology',
    title: 'AI Sustainability Coach',
    description: 'Context-aware reasoning that references your actual emission data — never generic advice.',
  },
  {
    icon: 'mic',
    title: 'Voice Logging',
    description: 'Speak your activities naturally. AI extracts, quantifies, and categorizes emissions automatically.',
  },
  {
    icon: 'route',
    title: 'Route Intelligence',
    description: 'Compare transport modes by CO₂. Real-time routing with AI-generated green recommendations.',
  },
  {
    icon: 'analytics',
    title: 'Weekly Intelligence Briefing',
    description: 'Deep behavioral pattern analysis with personalized tactical objectives each week.',
  },
  {
    icon: 'track_changes',
    title: 'Goal Tracking',
    description: 'Set reduction targets by category. Track progress with kinetic visual feedback.',
  },
  {
    icon: 'leaderboard',
    title: 'Global Ranking',
    description: 'See how you compare to regional averages and climb toward the Paris Agreement target.',
  },
]

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-background text-on-surface overflow-x-hidden">
      {/* Hero Section */}
      <section className="relative min-h-screen flex items-center pt-24 pb-16 overflow-hidden">
        {/* Video background */}
        <video
          autoPlay
          muted
          loop
          playsInline
          className="absolute inset-0 w-full h-full object-cover brightness-[0.85] contrast-[1.1]"
          aria-hidden="true"
        >
          <source
            src="https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260511_131941_d136af49-e243-493a-be14-6ff3f24e09e6.mp4"
            type="video/mp4"
          />
        </video>

        {/* Technical dot grid overlay */}
        <DotGrid />

        {/* Scanline effect */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden" aria-hidden="true">
          <div
            className="absolute left-0 right-0 h-[2px]"
            style={{
              background: 'linear-gradient(to right, transparent, rgba(145,216,131,0.08), transparent)',
              animation: 'scanline 6s linear infinite',
            }}
          />
        </div>

        {/* Content */}
        <div className="relative z-10 w-full max-w-7xl mx-auto px-6 md:px-16 grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          {/* Left — Hero copy */}
          <div className="lg:col-span-6 space-y-8">
            {/* Status tag */}
            <div className="inline-flex items-center gap-2 bg-primary/10 border border-primary/20 px-4 py-1.5 rounded-none">
              <div className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-primary" />
              </div>
              <span className="font-geist text-[11px] font-bold text-primary uppercase tracking-widest">
                AI_SYSTEM // ACTIVE
              </span>
            </div>

            <h1 className="font-geist font-black leading-none text-on-surface"
              style={{ fontSize: 'clamp(48px, 7vw, 80px)', letterSpacing: '-0.04em' }}>
              Quantitative<br />
              <span className="text-primary carbon-glow">Intelligence.</span>
            </h1>

            <p className="font-hanken text-body-lg text-on-surface-variant max-w-md border-l-2 border-primary/30 pl-6">
              High-precision AI carbon modeling for modern sustainability workflows.
              Track, analyze, and optimize your environmental footprint with contextual coaching.
            </p>

            <div className="flex flex-wrap items-center gap-4 pt-2">
              <Link
                href={ROUTES.SIGN_IN}
                className="bg-primary text-on-primary font-geist px-8 py-3 font-bold border border-primary hover:bg-transparent hover:text-primary transition-all duration-300 rounded-full text-label-md uppercase tracking-wide active:scale-95"
              >
                INITIALIZE_CORE
              </Link>
              <a
                href="#features"
                className="glass-card text-on-surface font-geist px-8 py-3 flex items-center gap-2 hover:border-primary/30 transition-all duration-300 rounded-full text-label-md"
              >
                <span className="material-symbols-outlined text-[16px]" aria-hidden="true">arrow_downward</span>
                EXPLORE
              </a>
            </div>
          </div>

          {/* Right — Instrument widget */}
          <div className="lg:col-span-6 hidden lg:block">
            <div className="glass-card p-8 rounded-lg border border-primary/10 relative overflow-hidden">
              {/* Scanline */}
              <div className="absolute inset-0 overflow-hidden pointer-events-none" aria-hidden="true">
                <div className="absolute left-0 right-0 h-px bg-gradient-to-r from-transparent via-primary/10 to-transparent"
                  style={{ animation: 'scanline 4s linear infinite' }} />
              </div>

              <div className="flex justify-between items-start mb-8">
                <div>
                  <p className="font-geist text-[10px] text-primary uppercase tracking-widest mb-1">
                    Active_Metric // Score_Realtime
                  </p>
                  <h2 className="font-geist font-black text-[52px] leading-none text-on-surface" style={{ letterSpacing: '-0.04em' }}>
                    4.282
                    <span className="text-sm font-normal text-on-surface-variant ml-3">kg CO₂e</span>
                  </h2>
                </div>
                <span className="material-symbols-outlined text-5xl text-primary" aria-hidden="true">monitoring</span>
              </div>

              {/* Bar chart visualization */}
              <div className="h-36 flex items-end justify-between gap-1 mb-6 bg-surface-container-lowest/50 p-3 border border-primary/5">
                {[30, 45, 25, 60, 95, 70, 50, 35, 40, 80, 55, 20].map((h, i) => (
                  <div
                    key={i}
                    className="flex-1 rounded-t-sm transition-all"
                    style={{
                      height: `${h}%`,
                      background: h > 70
                        ? 'linear-gradient(to top, #0d530e, #91d883)'
                        : 'rgba(145, 216, 131, 0.2)',
                    }}
                    aria-hidden="true"
                  />
                ))}
              </div>

              {/* Metrics row */}
              <div className="grid grid-cols-3 gap-4 pt-4 border-t border-outline-variant/20">
                {METRIC_ITEMS.map((m) => (
                  <div key={m.label} className="text-center">
                    <p className="font-geist font-black text-2xl text-on-surface leading-none">{m.value}</p>
                    <p className="font-geist text-[9px] text-primary uppercase tracking-wider mt-1">{m.unit}</p>
                    <p className="font-hanken text-[11px] text-on-surface-variant mt-0.5">{m.label}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Scroll indicator */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 animate-bounce opacity-40" aria-hidden="true">
          <span className="material-symbols-outlined text-primary text-[20px]">keyboard_arrow_down</span>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="relative py-24 px-6 md:px-16 max-w-7xl mx-auto">
        <div className="text-center mb-16 space-y-4">
          <span className="inline-block px-4 py-1 bg-primary-container/20 border border-primary-container/30 text-primary font-geist text-[11px] font-bold uppercase tracking-widest rounded-none">
            Intelligence Modules
          </span>
          <h2 className="font-geist font-bold text-on-surface" style={{ fontSize: 'clamp(32px, 5vw, 52px)', letterSpacing: '-0.03em' }}>
            Built for <span className="text-primary">precision</span>.<br />Designed for action.
          </h2>
          <p className="font-hanken text-body-lg text-on-surface-variant max-w-2xl mx-auto">
            Every feature is built around one principle: give you specific, actionable intelligence — not generic sustainability tips.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {FEATURE_ITEMS.map((feature) => (
            <GlassCard
              key={feature.title}
              className="p-8 group cursor-default"
            >
              <div className="w-12 h-12 rounded-lg bg-primary-container/40 border border-primary/20 flex items-center justify-center mb-6 group-hover:bg-primary/10 transition-colors">
                <span
                  className="material-symbols-outlined text-primary text-2xl"
                  style={{ fontVariationSettings: '"FILL" 1' }}
                  aria-hidden="true"
                >
                  {feature.icon}
                </span>
              </div>
              <h3 className="font-geist font-semibold text-on-surface text-lg mb-3 group-hover:text-primary transition-colors">
                {feature.title}
              </h3>
              <p className="font-hanken text-on-surface-variant text-body-md leading-relaxed">
                {feature.description}
              </p>
            </GlassCard>
          ))}
        </div>
      </section>

      {/* CTA Section */}
      <section className="relative py-24 px-6 md:px-16 text-center overflow-hidden">
        <DotGrid />
        <div className="relative z-10 max-w-2xl mx-auto space-y-8">
          <h2 className="font-geist font-black text-on-surface" style={{ fontSize: 'clamp(36px, 6vw, 64px)', letterSpacing: '-0.04em' }}>
            Begin your <br />
            <span className="text-primary carbon-glow">intelligence cycle.</span>
          </h2>
          <p className="font-hanken text-body-lg text-on-surface-variant">
            Join thousands tracking their path to the Paris Agreement target. Your precision sustainability journey starts now.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href={ROUTES.SIGN_IN}
              className="bg-primary text-on-primary font-geist px-10 py-4 rounded-full font-bold text-body-md hover:opacity-90 transition-all active:scale-95 hover:shadow-[0_0_30px_rgba(145,216,131,0.3)]"
            >
              Start for free
            </Link>
            <Link
              href={ROUTES.SIGN_IN}
              className="glass-card text-on-surface font-geist px-10 py-4 rounded-full font-medium text-body-md hover:border-primary/30 transition-all"
            >
              View demo
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-outline-variant/10 py-12 px-6 md:px-16">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-8">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary-container to-primary flex items-center justify-center">
              <span className="material-symbols-outlined text-[16px] text-on-primary" style={{ fontVariationSettings: '"FILL" 1' }} aria-hidden="true">eco</span>
            </div>
            <span className="font-geist font-bold text-primary text-lg">Rootly</span>
          </div>
          <p className="font-hanken text-on-surface-variant text-sm">
            © 2024 Rootly Intelligence. Precision Sustainability.
          </p>
          <div className="flex gap-6">
            {['Privacy Policy', 'Terms of Service', 'Contact'].map((link) => (
              <a key={link} href="#" className="font-hanken text-on-surface-variant hover:text-primary transition-colors text-sm">
                {link}
              </a>
            ))}
          </div>
        </div>
      </footer>
    </div>
  )
}
