import { useCallback, useRef } from 'react'
import { useChatStore } from '@/store/chatStore'
import { useAuthStore } from '@/store/userStore'
import { auth, isFirebaseConfigured } from '@/services/firebase'
import type { ChatMessage } from '@/types/chat'
import { getSafeLocalStorage } from '@/lib/utils'
import { analyticsTracker } from '@/lib/analytics'

/**
 * Manages chat with the AI coach.
 * Handles optimistic updates, abort controller, and error recovery.
 */
export function useChat() {
  const {
    messages,
    isLoading,
    error,
    inputValue,
    conversationId,
    addMessage,
    setLoading,
    setError,
    setInputValue,
    setConversationId,
  } = useChatStore()
  const { userProfile } = useAuthStore()
  const abortRef = useRef<AbortController | null>(null)

  const sendMessage = useCallback(async (content: string) => {
    if (!content.trim() || isLoading) return
    setError(null)

    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: content.trim(),
      timestamp: { toDate: () => new Date() } as unknown as import('firebase/firestore').Timestamp,
    }
    addMessage(userMsg)
    setInputValue('')
    setLoading(true)

    try {
      const token = isFirebaseConfigured ? await auth.currentUser?.getIdToken() : 'demo-token'
      abortRef.current = new AbortController()

      const customKey = getSafeLocalStorage('user_gemini_api_key')
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
          ...(customKey ? { 'x-gemini-key': customKey } : {}),
        },
        body: JSON.stringify({
          message: content.trim(),
          conversationId,
        }),
        signal: abortRef.current.signal,
      })

      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error ?? `Request failed (${res.status})`)
      }

      const data = await res.json()

      // Persist conversation ID returned from API
      if (data.conversationId && !conversationId) {
        setConversationId(data.conversationId)
      }

      const assistantMsg: ChatMessage = {
        id: `assistant-${Date.now()}`,
        role: 'assistant',
        content: data.message ?? data.response ?? '',
        timestamp: { toDate: () => new Date() } as unknown as import('firebase/firestore').Timestamp,
      }
      addMessage(assistantMsg)
      analyticsTracker.track('CHAT_USAGE', { length: content.trim().length })
    } catch (err: unknown) {
      if ((err as Error).name === 'AbortError') return
      const message = err instanceof Error ? err.message : 'Something went wrong'
      setError(message)
    } finally {
      setLoading(false)
    }
  }, [isLoading, conversationId, addMessage, setInputValue, setLoading, setError, setConversationId])

  const abort = useCallback(() => {
    abortRef.current?.abort()
    setLoading(false)
  }, [setLoading])

  return {
    messages,
    isLoading,
    error,
    input: inputValue,
    setInput: setInputValue,
    conversationId,
    sendMessage,
    abort,
  }
}
