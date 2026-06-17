'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { auth, isFirebaseConfigured } from '@/services/firebase'
import { getOrCreateConversation, getChatMessages, saveChatMessage } from '@/services/firestore'
import { analyticsTracker } from '@/lib/analytics'
import { useAuthStore } from '@/store/userStore'
import { useChatStore } from '@/store/chatStore'
import { GlassCard, DotGrid } from '@/components/glass/GlassCard'
import { cn, formatRelativeTime, generateId } from '@/lib/utils'
import { Timestamp } from 'firebase/firestore'
import type { ChatMessage } from '@/types/chat'
import { XaiCard } from '@/components/ai/XaiCard'
import type { ExplainableRecommendation } from '@/types/recommendation'
import { parseExplainableRecommendation } from '@/lib/schemas/xai.schema'
import { useOnlineStatus } from '@/hooks/useOnlineStatus'
import { EmptyState } from '@/components/shared/StateFeedback'

const SUGGESTED_PROMPTS = [
  "What's driving my carbon footprint this week?",
  "How can I reduce my transport emissions?",
  "Suggest a meal plan to lower my food footprint",
  "What's the greenest way to commute to work?",
  "Help me set a realistic emission reduction goal",
  "Compare my footprint to global averages",
]

// Fallback demo user used if AuthContext hasn't hydrated yet
const DEMO_USER_ID = 'demo-user-id'

export function CoachClient() {
  const { userProfile } = useAuthStore()
  const { messages, conversationId, isLoading, setMessages, addMessage, setConversationId, setLoading, setError, setLatestExplanation } = useChatStore()
  const latestExplanation = useChatStore((s) => s.latestExplanation)
  const isOnline = useOnlineStatus()
  const [inputValue, setInputValue] = useState('')
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const liveRegionRef = useRef<HTMLDivElement>(null)

  // Settings modal states
  const [isSettingsOpen, setIsSettingsOpen] = useState(false)
  const [customApiKeyInput, setCustomApiKeyInput] = useState('')
  const [apiKeySet, setApiKeySet] = useState(() => process.env.NEXT_PUBLIC_HAS_GEMINI_KEY === 'true')
  const [showApiKey, setShowApiKey] = useState(false)
  const [initError, setInitError] = useState<string | null>(null)

  const settingsDialogRef = useRef<HTMLDialogElement>(null)

  useEffect(() => {
    const dialog = settingsDialogRef.current
    if (!dialog) return
    if (isSettingsOpen) {
      if (!dialog.open) {
        dialog.showModal()
      }
    } else {
      if (dialog.open) {
        dialog.close()
      }
    }
  }, [isSettingsOpen])

  useEffect(() => {
    const dialog = settingsDialogRef.current
    if (!dialog) return
    const handleClose = () => {
      setIsSettingsOpen(false)
    }
    dialog.addEventListener('close', handleClose)
    return () => {
      dialog.removeEventListener('close', handleClose)
    }
  }, [])

  // Load API key from localStorage on mount
  useEffect(() => {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        const storedKey = window.localStorage.getItem('user_gemini_api_key')
        if (storedKey) {
          setApiKeySet(true)
          setCustomApiKeyInput(storedKey)
        }
      }
    } catch {
      // Ignore localStorage errors
    }
  }, [])

  // Initialize conversation — works with real user OR demo-user-id fallback
  useEffect(() => {
    const uid = userProfile?.uid ?? DEMO_USER_ID
    const init = async () => {
      setLoading(true)
      setInitError(null)
      try {
        const convId = await getOrCreateConversation(uid)
        setConversationId(convId)
        const history = await getChatMessages(convId, 20)
        setMessages(history)
      } catch (err) {
        console.error('Failed to init conversation:', err)
        // Don't block the UI — just note the error; user can still chat
        setInitError('Conversation history unavailable in this session.')
        // Give a temp local ID so chat can still work
        const localId = `local-${Date.now()}`
        setConversationId(localId)
        setMessages([])
      } finally {
        setLoading(false)
      }
    }
    init()
    // Re-run only when userProfile.uid actually changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userProfile?.uid])

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const sendMessage = useCallback(async (content: string) => {
    if (!content.trim() || isLoading) return

    setInputValue('')
    setLoading(true)
    setError(null)

    // Resolve conversation ID — use local fallback if needed
    const activeConvId = conversationId ?? `local-${Date.now()}`

    // Optimistic user message
    const userMsg: ChatMessage = {
      id: generateId(),
      conversationId: activeConvId,
      role: 'user',
      content: content.trim(),
      timestamp: Timestamp.now(),
    }
    addMessage(userMsg)

    // Save user message to Firestore (best-effort, non-blocking)
    saveChatMessage(activeConvId, { conversationId: activeConvId, role: 'user', content: content.trim(), metadata: {} })
      .catch(() => { /* Silently ignore in demo mode */ })

    try {
      // Get Firebase ID token (or fallback to demo-token when Firebase is unconfigured)
      let token = 'demo-token'
      if (isFirebaseConfigured && auth.currentUser) {
        try {
          token = await auth.currentUser.getIdToken()
        } catch {
          // Token fetch failed — fall back to demo-token
          token = 'demo-token'
        }
      }

      // Read custom Gemini key from localStorage
      let customKey: string | null = null
      try {
        if (typeof window !== 'undefined' && window.localStorage) {
          customKey = window.localStorage.getItem('user_gemini_api_key')
        }
      } catch { /* Ignore */ }

      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
          ...(customKey ? { 'x-gemini-key': customKey } : {}),
        },
        body: JSON.stringify({ message: content.trim(), conversationId: activeConvId }),
      })

      if (!res.ok) {
        let errMsg = `Server error (${res.status})`
        try {
          const errData = await res.json()
          errMsg = errData.error ?? errMsg
        } catch { /* ignore JSON parse errors */ }
        throw new Error(errMsg)
      }

      const data = await res.json()

      // Parse and validate XAI explanation if present
      const xpiExplanation: ExplainableRecommendation | undefined =
        data.xpiExplanation ? parseExplainableRecommendation(data.xpiExplanation) ?? undefined : undefined

      // Update global store with latest explanation for sidebar
      if (xpiExplanation) {
        setLatestExplanation(xpiExplanation)
      }

      const assistantMsg: ChatMessage = {
        id: generateId(),
        conversationId: activeConvId,
        role: 'assistant',
        content: data.message,
        timestamp: Timestamp.now(),
        metadata: {
          ...(data.suggestedActions ? { suggestedActions: data.suggestedActions } : {}),
          ...(xpiExplanation ? { xpiExplanation } : {}),
        },
      }
      addMessage(assistantMsg)
      analyticsTracker.track('CHAT_USAGE', { length: content.trim().length })

      // Announce to screen readers
      if (liveRegionRef.current) {
        liveRegionRef.current.textContent = `Rootly Intelligence: ${data.message.slice(0, 100)}`
      }
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to connect to AI'
      setError(errorMessage)
      const errMsg: ChatMessage = {
        id: generateId(),
        conversationId: activeConvId,
        role: 'assistant',
        content: `⚠️ ${errorMessage}\n\nTip: Click "Set API Key" above to add your free Google Gemini key from aistudio.google.com`,
        timestamp: Timestamp.now(),
      }
      addMessage(errMsg)
    } finally {
      setLoading(false)
      inputRef.current?.focus()
    }
  }, [conversationId, isLoading, addMessage, setLoading, setError, setLatestExplanation])

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage(inputValue)
    }
  }

  return (
    <div className="relative h-[calc(100vh-160px)] md:h-[calc(100vh-80px)] flex flex-col px-4 md:px-16 py-4 md:py-6 max-w-6xl mx-auto overflow-hidden">
      <DotGrid className="opacity-40" />

      {/* Live region for screen readers */}
      <div
        ref={liveRegionRef}
        aria-live="polite"
        aria-atomic="true"
        className="sr-only"
      />

      {/* Header */}
      <div className="relative z-10 mb-4 flex items-center justify-between shrink-0">
        <div>
          <p className="font-geist text-[11px] text-primary uppercase tracking-widest mb-1">
            AI Intelligence // Command Center
          </p>
          <h1 className="font-geist font-bold text-on-surface text-3xl md:text-4xl" style={{ letterSpacing: '-0.03em' }}>
            Sustainability <span className="text-primary">Coach</span>
          </h1>
          <p className="font-hanken text-on-surface-variant mt-1 text-sm">
            Context-aware AI with full access to your emission data
          </p>
        </div>

        {/* Status and Settings */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsSettingsOpen(true)}
            className="flex items-center gap-1.5 px-3 py-2 bg-surface-container-high/60 hover:bg-surface-container hover:border-primary/40 border border-outline-variant/30 rounded-lg text-on-surface transition-all text-xs"
            aria-label="Configure Gemini API Key"
          >
            <span className="material-symbols-outlined text-[16px]" aria-hidden="true">
              {apiKeySet ? 'vpn_key' : 'key_off'}
            </span>
            <span className="font-geist uppercase tracking-wider hidden sm:inline">
              {apiKeySet ? 'API Key Set' : 'Set API Key'}
            </span>
          </button>

          <div className="flex items-center gap-2 px-4 py-2 bg-secondary-container/20 border border-secondary/20 rounded-full shrink-0">
            <div className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75" aria-hidden="true" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-primary" />
            </div>
            <span className="font-geist text-[11px] text-primary uppercase tracking-wider">Intelligence Active</span>
          </div>
        </div>
      </div>

      {/* Init error banner */}
      {initError && (
        <div className="relative z-10 mb-3 px-4 py-2 bg-surface-container border border-outline-variant/30 rounded-lg shrink-0">
          <p className="font-hanken text-xs text-on-surface-variant">
            <span className="text-tertiary mr-1">ℹ</span>{initError}
          </p>
        </div>
      )}

      <div className="relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-6 flex-1 min-h-0 overflow-y-auto lg:overflow-hidden">
        {/* Chat area */}
        <div className="lg:col-span-8 flex flex-col gap-4 min-h-0">
          {/* Messages */}
          <GlassCard className="flex-1 p-6 min-h-0 flex flex-col" hover={false}>
            <div
              className="flex-1 overflow-y-auto space-y-6 pr-2"
              role="log"
              aria-label="Conversation with Rootly AI Coach"
              aria-live="off"
            >
              {messages.length === 0 && !isLoading && (
                <EmptyState
                  icon="psychology"
                  title="Carbon Intelligence Coach"
                  description={apiKeySet
                    ? "Welcome to your climate operations workspace. Let's build your weekly tactical reduction plan."
                    : "Running in demo mode with curated responses. Add your Gemini API key above to enable real-time coaching."}
                  steps={[
                    { icon: 'edit_note', title: 'Ask Questions', description: 'Query emissions, vehicle telemetry, or diet changes.' },
                    { icon: 'auto_awesome', title: 'Get Recommendations', description: 'Let AI identify major emission contributors and suggest alternatives.' },
                    { icon: 'flag', title: 'Set Goals', description: 'Convert AI advice into active milestones in one click.' }
                  ]}
                  action={!apiKeySet ? {
                    label: "Add Gemini API Key",
                    onClick: () => setIsSettingsOpen(true),
                    icon: "vpn_key"
                  } : undefined}
                />
              )}

              {messages.map((message) => (
                <div key={message.id}>
                  <div
                    className={cn('flex gap-3', message.role === 'user' ? 'flex-row-reverse' : 'flex-row')}
                  >
                    {/* Avatar */}
                    <div className={cn(
                      'w-8 h-8 rounded-full flex items-center justify-center shrink-0',
                      message.role === 'assistant'
                        ? 'bg-primary-container'
                        : 'bg-surface-container-high border border-outline-variant/30'
                    )}>
                      <span
                        className="material-symbols-outlined text-[16px]"
                        style={message.role === 'assistant' ? { fontVariationSettings: '"FILL" 1' } : {}}
                        aria-hidden="true"
                      >
                        {message.role === 'assistant' ? 'psychology' : 'person'}
                      </span>
                    </div>

                    {/* Bubble */}
                    <div className={cn(
                      'max-w-[75%] rounded-2xl px-5 py-3.5',
                      message.role === 'assistant'
                        ? 'bg-surface-container border border-outline-variant/20 text-on-surface rounded-tl-sm'
                        : 'bg-primary text-on-primary rounded-tr-sm'
                    )}>
                      <p className="font-hanken text-sm leading-relaxed whitespace-pre-wrap">{message.content}</p>
                      <p className={cn(
                        'text-[10px] mt-2 font-geist uppercase tracking-wider',
                        message.role === 'assistant' ? 'text-on-surface-variant' : 'text-on-primary/60'
                      )}>
                        {message.role === 'assistant' ? 'Rootly Intelligence' : 'You'} · {
                          message.timestamp?.toDate
                            ? formatRelativeTime(message.timestamp.toDate())
                            : 'just now'
                        }
                      </p>
                    </div>
                  </div>

                  {/* XAI Card — shown below assistant messages that carry explanation data */}
                  {message.role === 'assistant' && message.metadata?.xpiExplanation && (
                    <div className="ml-11">
                      <XaiCard
                        explanation={message.metadata.xpiExplanation}
                        showAuditTrail={true}
                      />
                    </div>
                  )}
                </div>
              ))}


              {/* Loading indicator */}
              {isLoading && (
                <div className="flex gap-3">
                  <div className="w-8 h-8 rounded-full bg-primary-container flex items-center justify-center shrink-0">
                    <span className="material-symbols-outlined text-[16px]" style={{ fontVariationSettings: '"FILL" 1' }} aria-hidden="true">psychology</span>
                  </div>
                  <div className="bg-surface-container border border-outline-variant/20 rounded-2xl rounded-tl-sm px-5 py-4">
                    <div className="flex gap-1.5" aria-label="AI is thinking" role="status">
                      {[0, 1, 2].map((i) => (
                        <div
                          key={i}
                          className="w-2 h-2 rounded-full bg-primary animate-bounce"
                          style={{ animationDelay: `${i * 150}ms` }}
                          aria-hidden="true"
                        />
                      ))}
                    </div>
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>

            {/* Input area */}
            <div className="border-t border-outline-variant/20 pt-4 mt-4 shrink-0">
              {!isOnline && (
                <div className="mb-2.5 text-error text-xs font-geist flex items-center gap-1.5 justify-center uppercase tracking-wider">
                  <span className="material-symbols-outlined text-[14px]">cloud_off</span>
                  AI Coach is offline. Network connection required.
                </div>
              )}
              <div className="flex gap-3 items-end">
                <div className="flex-1 relative">
                  <textarea
                    ref={inputRef}
                    id="chat-input"
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder={isOnline ? "Ask about your carbon footprint..." : "Offline Mode — Reconnect to chat with AI Coach"}
                    rows={1}
                    className="w-full recessed-input rounded-2xl px-4 py-3 font-hanken text-on-surface text-sm placeholder:text-on-surface-variant/40 resize-none focus:ring-0"
                    style={{ maxHeight: '120px', overflowY: 'auto' }}
                    aria-label="Message to AI coach"
                    disabled={isLoading || !isOnline}
                  />
                </div>
                <button
                  onClick={() => sendMessage(inputValue)}
                  disabled={!inputValue.trim() || isLoading || !isOnline}
                  className={cn(
                    'w-11 h-11 rounded-full flex items-center justify-center shrink-0',
                    'bg-primary text-on-primary',
                    'hover:opacity-90 active:scale-95 transition-all',
                    'disabled:opacity-40 disabled:cursor-not-allowed'
                  )}
                  aria-label="Send message"
                >
                  <span className="material-symbols-outlined text-[20px]" aria-hidden="true">send</span>
                </button>
              </div>
              <p className="font-geist text-[10px] text-on-surface-variant/85 mt-2 text-center uppercase tracking-wider">
                Press Enter to send · Shift+Enter for new line
              </p>
            </div>
          </GlassCard>
        </div>

        {/* Sidebar */}
        <div className="lg:col-span-4 space-y-4 shrink-0">
          {/* Suggested prompts */}
          <GlassCard className="p-5">
            <h2 className="font-geist text-[11px] text-primary uppercase tracking-widest mb-4 flex items-center gap-2">
              <span className="material-symbols-outlined text-[14px]" aria-hidden="true">auto_awesome</span>
              Suggested Questions
            </h2>
            <div className="space-y-2">
              {SUGGESTED_PROMPTS.map((prompt) => (
                <button
                  key={prompt}
                  onClick={() => sendMessage(prompt)}
                  disabled={isLoading}
                  className="w-full text-left px-4 py-2.5 rounded-lg bg-surface-container-high/50 hover:bg-surface-container hover:border-primary/20 border border-transparent text-on-surface-variant hover:text-on-surface font-hanken text-sm transition-all disabled:opacity-50"
                >
                  {prompt}
                </button>
              ))}
            </div>
          </GlassCard>

          {/* Context indicator */}
          <GlassCard variant="primary" className="p-5">
            <h2 className="font-geist text-[11px] text-primary uppercase tracking-widest mb-4">
              Intelligence Context
            </h2>
            <div className="space-y-3">
              {[
                { label: 'Emission data', icon: 'check_circle', status: 'Loaded' },
                { label: 'Active goals', icon: 'check_circle', status: 'Loaded' },
                { label: 'Weekly trend', icon: 'check_circle', status: 'Computed' },
                { label: 'Route history', icon: 'check_circle', status: 'Available' },
              ].map((item) => (
                <div key={item.label} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-primary text-[16px]" style={{ fontVariationSettings: '"FILL" 1' }} aria-hidden="true">
                      {item.icon}
                    </span>
                    <span className="font-hanken text-on-surface-variant text-sm">{item.label}</span>
                  </div>
                  <span className="font-geist text-[10px] text-primary uppercase tracking-wider">{item.status}</span>
                </div>
              ))}
            </div>

            {/* Live XAI snapshot from latest recommendation */}
            {latestExplanation && (
              <div className="mt-4 pt-4 border-t border-outline-variant/15 space-y-3">
                <p className="font-geist text-[10px] text-primary uppercase tracking-widest">Latest Recommendation</p>
                <div className="flex items-center justify-between">
                  <span className="font-hanken text-on-surface-variant text-xs">Confidence</span>
                  <span className="font-geist font-bold text-on-surface text-xs">
                    {Math.round(latestExplanation.confidence * 100)}%
                  </span>
                </div>
                <div className="w-full bg-outline-variant/20 rounded-full h-1.5">
                  <div
                    className="bg-primary h-1.5 rounded-full transition-all duration-500"
                    style={{ width: `${Math.round(latestExplanation.confidence * 100)}%` }}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <span className="font-hanken text-on-surface-variant text-xs">Priority</span>
                  <span className={cn(
                    'font-geist font-semibold text-[10px] uppercase tracking-wider',
                    latestExplanation.priority === 'high' ? 'text-primary' :
                      latestExplanation.priority === 'medium' ? 'text-tertiary' : 'text-on-surface-variant'
                  )}>
                    {latestExplanation.priority}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="font-hanken text-on-surface-variant text-xs">Est. Savings</span>
                  <span className="font-geist font-bold text-primary text-xs">
                    {latestExplanation.potentialSavingsKg >= 1
                      ? `${latestExplanation.potentialSavingsKg.toFixed(1)}kg CO₂`
                      : `${(latestExplanation.potentialSavingsKg * 1000).toFixed(0)}g CO₂`}
                  </span>
                </div>
              </div>
            )}

            {/* Demo mode notice */}
            {!apiKeySet && (
              <div className="mt-4 pt-4 border-t border-outline-variant/20">
                <p className="font-hanken text-[11px] text-on-surface-variant leading-relaxed">
                  <span className="text-tertiary font-semibold">Demo Mode Active</span><br />
                  Responses are curated previews. Add your Gemini key for live AI.
                </p>
              </div>
            )}
          </GlassCard>
        </div>
      </div>

      {/* Settings Modal */}
      <dialog
        ref={settingsDialogRef}
        className="bg-transparent border-0 p-0 outline-none max-w-md w-full z-50 backdrop:bg-background/80 backdrop:backdrop-blur-md"
        aria-labelledby="settings-modal-title"
      >
        <GlassCard className="p-6 shadow-2xl border-primary/20 mx-auto" hover={false}>
          <div className="flex items-center justify-between mb-4">
            <h2 id="settings-modal-title" className="font-geist font-bold text-on-surface text-xl flex items-center gap-2">
              <span className="material-symbols-outlined text-primary">settings</span>
              AI API Configuration
            </h2>
            <button
              onClick={() => setIsSettingsOpen(false)}
              className="text-on-surface-variant hover:text-on-surface transition-colors"
              aria-label="Close settings"
            >
              <span className="material-symbols-outlined">close</span>
            </button>
          </div>

          <div className="space-y-4">
            <p className="font-hanken text-on-surface-variant text-sm leading-relaxed">
              By default, Rootly runs in <strong>demo mode</strong> with curated responses. Provide your own <strong>Google Gemini API Key</strong> to activate live AI with full context of your data.
            </p>

            <div className="space-y-2">
              <label htmlFor="settings-api-key" className="font-geist text-xs text-primary uppercase tracking-wider block">
                Gemini API Key
              </label>
              <div className="relative">
                <input
                  id="settings-api-key"
                  type={showApiKey ? 'text' : 'password'}
                  value={customApiKeyInput}
                  onChange={(e) => setCustomApiKeyInput(e.target.value)}
                  placeholder="AIzaSy..."
                  className="w-full recessed-input rounded-xl pl-4 pr-10 py-2.5 font-hanken text-on-surface text-sm placeholder:text-on-surface-variant/40"
                  autoComplete="off"
                />
                <button
                  type="button"
                  onClick={() => setShowApiKey(!showApiKey)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-on-surface-variant hover:text-on-surface transition-colors"
                  aria-label={showApiKey ? 'Hide API key' : 'Show API key'}
                >
                  <span className="material-symbols-outlined text-[18px]">
                    {showApiKey ? 'visibility_off' : 'visibility'}
                  </span>
                </button>
              </div>
              <p className="font-hanken text-[11px] text-on-surface-variant/85">
                Get a free key at{' '}
                <a
                  href="https://aistudio.google.com/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary hover:underline inline-flex items-center gap-0.5"
                >
                  Google AI Studio
                  <span className="material-symbols-outlined text-[10px]">open_in_new</span>
                </a>
                {' '}— it's free with generous limits.
              </p>
            </div>

            <div className="flex gap-3 pt-2">
              <button
                onClick={() => {
                  const trimmed = customApiKeyInput.trim()
                  try {
                    if (typeof window !== 'undefined' && window.localStorage) {
                      if (trimmed) {
                        window.localStorage.setItem('user_gemini_api_key', trimmed)
                        setApiKeySet(true)
                      } else {
                        window.localStorage.removeItem('user_gemini_api_key')
                        setApiKeySet(false)
                      }
                    }
                  } catch { /* ignore */ }
                  setIsSettingsOpen(false)
                }}
                className="flex-1 py-2.5 bg-primary text-on-primary rounded-xl font-geist text-sm font-semibold hover:opacity-90 active:scale-95 transition-all"
              >
                Save Configuration
              </button>
              {apiKeySet && (
                <button
                  onClick={() => {
                    try {
                      if (typeof window !== 'undefined' && window.localStorage) {
                        window.localStorage.removeItem('user_gemini_api_key')
                      }
                    } catch { /* ignore */ }
                    setCustomApiKeyInput('')
                    setApiKeySet(process.env.NEXT_PUBLIC_HAS_GEMINI_KEY === 'true')
                    setIsSettingsOpen(false)
                  }}
                  className="px-4 py-2.5 bg-error-container/20 hover:bg-error-container/40 border border-error/30 text-error rounded-xl font-geist text-sm transition-all"
                >
                  Clear Key
                </button>
              )}
            </div>
          </div>
        </GlassCard>
      </dialog>
    </div>
  )
}
