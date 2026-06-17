import { create } from 'zustand'
import { devtools } from 'zustand/middleware'
import type { ChatMessage } from '@/types/chat'
import type { ExplainableRecommendation } from '@/types/recommendation'

interface ChatState {
  messages: ChatMessage[]
  conversationId: string | null
  isLoading: boolean
  error: string | null
  inputValue: string
  /** The most recent XAI explanation returned by the AI coach */
  latestExplanation: ExplainableRecommendation | null

  setMessages: (messages: ChatMessage[]) => void
  addMessage: (message: ChatMessage) => void
  setConversationId: (id: string) => void
  setLoading: (loading: boolean) => void
  setError: (error: string | null) => void
  setInputValue: (value: string) => void
  setLatestExplanation: (explanation: ExplainableRecommendation | null) => void
  reset: () => void
}

export const useChatStore = create<ChatState>()(
  devtools(
    (set) => ({
      messages: [],
      conversationId: null,
      isLoading: false,
      error: null,
      inputValue: '',
      latestExplanation: null,

      setMessages: (messages) => set({ messages }),
      addMessage: (message) =>
        set((state) => ({ messages: [...state.messages, message] })),
      setConversationId: (conversationId) => set({ conversationId }),
      setLoading: (isLoading) => set({ isLoading }),
      setError: (error) => set({ error }),
      setInputValue: (inputValue) => set({ inputValue }),
      setLatestExplanation: (latestExplanation) => set({ latestExplanation }),
      reset: () =>
        set({
          messages: [],
          conversationId: null,
          isLoading: false,
          error: null,
          inputValue: '',
          latestExplanation: null,
        }),
    }),
    { name: 'chat-store' }
  )
)
