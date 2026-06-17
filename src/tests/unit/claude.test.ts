import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// Mock environment variable before importing services/claude
const originalEnv = process.env.GEMINI_API_KEY

import {
  sendChatMessage,
  generateWeeklyReport,
  extractActivitiesFromTranscript,
  generateRouteReasoning,
} from '../../services/claude'

describe('Claude/Gemini AI Service (Configured Mode)', () => {
  const originalFetch = global.fetch

  beforeEach(() => {
    vi.resetAllMocks()
    process.env.GEMINI_API_KEY = 'real-gemini-key'
  })

  afterEach(() => {
    global.fetch = originalFetch
    process.env.GEMINI_API_KEY = originalEnv
  })

  it('sendChatMessage calls Gemini API and returns generated content', async () => {
    const mockApiResponse = {
      candidates: [
        {
          content: {
            parts: [{ text: 'Hello, this is your sustainability coach.' }],
          },
        },
      ],
      usageMetadata: {
        promptTokenCount: 15,
        candidatesTokenCount: 30,
      },
    }

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => mockApiResponse,
    } as Response)

    const ctx = {
      user: { uid: 'u1', carbonScore: 80, weeklyGoalKg: 100, displayName: 'User' } as any,
      recentActivities: [],
      activeGoals: [],
      weeklyEmissionsKg: 10,
      trend: 'stable' as const,
      conversationHistory: [],
    }

    const res = await sendChatMessage('how is my score?', ctx)
    expect(res.content).toBe('Hello, this is your sustainability coach.')
    expect(res.usage.inputTokens).toBe(15)
  })

  it('generateWeeklyReport parses Gemini response correctly', async () => {
    const reportData = {
      narrative: 'Your emissions are stable.',
      trend: 'stable',
      recommendations: [
        { title: 'Drive less', description: 'Swap driving for train', potentialSavingsKg: 5.5, priority: 'high' }
      ]
    }

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        candidates: [{ content: { parts: [{ text: JSON.stringify(reportData) }] } }]
      }),
    } as Response)

    const ctx = {
      user: { displayName: 'User', weeklyGoalKg: 100, carbonScore: 75 } as any,
      activities: [],
      previousWeekActivities: [],
      activeGoals: [],
    }

    const res = await generateWeeklyReport(ctx)
    expect(res.narrative).toBe('Your emissions are stable.')
    expect(res.recommendations).toHaveLength(1)
    expect(res.recommendations[0].title).toBe('Drive less')
  })

  it('extractActivitiesFromTranscript parses Gemini list format', async () => {
    const activities = [
      { activity: 'car', category: 'transport', quantity: 20, emission: 3.8, description: 'Drove 20km' }
    ]

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        candidates: [{ content: { parts: [{ text: JSON.stringify(activities) }] } }]
      }),
    } as Response)

    const res = await extractActivitiesFromTranscript('I drove 20km')
    expect(res.activities).toHaveLength(1)
    expect(res.activities[0].activity).toBe('car')
  })

  it('generateRouteReasoning returns reasoning text', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        candidates: [{ content: { parts: [{ text: 'Train is the best option for this route.' }] } }]
      }),
    } as Response)

    const res = await generateRouteReasoning('A', 'B', [{ mode: 'train', emissionsKg: 1.2, durationMinutes: 30 }])
    expect(res).toBe('Train is the best option for this route.')
  })

  it('throws an error if Gemini API returns failure status', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 400,
      text: async () => 'API Key invalid',
    } as Response)

    const ctx = {
      user: { uid: 'u1', carbonScore: 80, weeklyGoalKg: 100, displayName: 'User' } as any,
      recentActivities: [],
      activeGoals: [],
      weeklyEmissionsKg: 10,
      trend: 'stable' as const,
      conversationHistory: [],
    }

    await expect(sendChatMessage('hi', ctx)).rejects.toThrow('Gemini API error (400): API Key invalid')
  })

  it('uses custom API key when provided and bypasses environment variables', async () => {
    const mockApiResponse = {
      candidates: [{ content: { parts: [{ text: 'Response from custom API key.' }] } }],
      usageMetadata: { promptTokenCount: 5, candidatesTokenCount: 10 },
    }

    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => mockApiResponse,
    } as Response)
    global.fetch = mockFetch

    // Temporarily remove env key
    process.env.GEMINI_API_KEY = ''

    const ctx = {
      user: { uid: 'u1', carbonScore: 80, weeklyGoalKg: 100, displayName: 'User' } as any,
      recentActivities: [],
      activeGoals: [],
      weeklyEmissionsKg: 10,
      trend: 'stable' as const,
      conversationHistory: [],
    }

    const res = await sendChatMessage('hello', ctx, 'my-custom-key-123')
    expect(res.content).toBe('Response from custom API key.')
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining('key=my-custom-key-123'),
      expect.any(Object)
    )
  })
})
