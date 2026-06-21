import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest'

// Unmock firestore service so we test the actual implementation code
vi.unmock('@/services/firestore')

let mockFirebaseConfigured = false

// Mock firebase configuration module to control isFirebaseConfigured
vi.mock('@/services/firebase', () => ({
  get isFirebaseConfigured() {
    return mockFirebaseConfigured
  },
  db: { mockDb: true },
  auth: { currentUser: { uid: 'test-user-id' } },
}))

// Mock firestore methods
import * as fs from 'firebase/firestore'
vi.mock('firebase/firestore', async (importOriginal) => {
  const original = await importOriginal<any>()
  return {
    ...original,
    collection: vi.fn(),
    doc: vi.fn(() => ({ id: 'mock-doc-id' })),
    getDoc: vi.fn(),
    getDocs: vi.fn(),
    addDoc: vi.fn(() => ({ id: 'new-doc-id' })),
    updateDoc: vi.fn(),
    deleteDoc: vi.fn(),
    query: vi.fn(),
    where: vi.fn(),
    orderBy: vi.fn(),
    limit: vi.fn(),
    serverTimestamp: vi.fn(() => 'mock-server-timestamp'),
  }
})

import {
  getUser,
  createUser,
  updateUser,
  createActivity,
  getUserActivities,
  getWeeklyActivities,
  deleteActivity,
  createVoiceLog,
  getUserVoiceLogs,
  getOrCreateConversation,
  getChatMessages,
  saveChatMessage,
  createGoal,
  getUserGoals,
  updateGoal,
  deleteGoal,
  saveWeeklyReport,
  getLatestWeeklyReport,
  saveRouteComparison,
  getUserRouteComparisons,
} from '../../services/firestore'

// Use a global mock time variable that keeps growing across ALL tests to avoid collisions
let mockTime = 1781500000000

describe('Firestore Service (Fallback/Demo Mode)', () => {
  let dateSpy: any

  beforeEach(() => {
    vi.clearAllMocks()
    mockFirebaseConfigured = false
    
    dateSpy = vi.spyOn(Date, 'now').mockImplementation(() => {
      mockTime += 1000 // increment by 1 second each call
      return mockTime
    })
  })

  afterEach(() => {
    dateSpy.mockRestore()
  })

  it('getUser returns demo user profile', async () => {
    const user = await getUser('demo-user-id')
    expect(user).not.toBeNull()
    expect(user?.displayName).toBe('Eco Explorer')
  })

  it('createUser and updateUser resolve successfully without modifying remote DB', async () => {
    await expect(createUser('demo-user-id', { displayName: 'New Name', email: 'test@test.com', photoURL: null, carbonScore: 50, totalEmissionsKg: 0, weeklyGoalKg: 100 })).resolves.not.toThrow()
    await expect(updateUser('demo-user-id', { displayName: 'Updated' })).resolves.not.toThrow()
  })

  it('createActivity inserts activity into mock activities array', async () => {
    const id = await createActivity('demo-user-id', {
      category: 'transport',
      activity: 'bus',
      quantity: 10,
      emission: 1.5,
      description: 'commute',
    })
    expect(id).toMatch(/^mock-act-/)

    const activities = await getUserActivities('demo-user-id')
    const added = activities.find(a => a.id === id)
    expect(added).toBeDefined()
    expect(added?.activity).toBe('bus')
  })

  it('getUserActivities filters by category and limit', async () => {
    await createActivity('demo-user', { category: 'food', activity: 'vegan_meal', quantity: 1, emission: 0.5 })
    await createActivity('demo-user', { category: 'transport', activity: 'car', quantity: 25, emission: 5 })

    const transportOnly = await getUserActivities('demo-user', { category: 'transport' })
    expect(transportOnly.every(a => a.category === 'transport')).toBe(true)

    const limited = await getUserActivities('demo-user', { limit: 1 })
    expect(limited).toHaveLength(1)
  })

  it('deleteActivity removes activity from mock array', async () => {
    const id = await createActivity('demo-user', { category: 'lifestyle', activity: 'general', quantity: 1, emission: 1 })
    await deleteActivity(id)
    const list = await getUserActivities('demo-user')
    expect(list.find(a => a.id === id)).toBeUndefined()
  })

  it('saves voice logs and retrieves them', async () => {
    const id = await createVoiceLog('demo-user', { transcript: 'I walked', audioLengthSeconds: 10, processingStatus: 'complete', extractedActivities: [] })
    expect(id).toMatch(/^mock-voice-/)
    const logs = await getUserVoiceLogs('demo-user')
    expect(logs.find(l => l.id === id)).toBeDefined()
  })

  it('manages mock conversations and messages', async () => {
    const convId = await getOrCreateConversation('demo-user')
    expect(convId).toMatch(/^mock-conv-/)

    const msgId = await saveChatMessage(convId, { conversationId: convId, role: 'user', content: 'hello' })
    expect(msgId).toMatch(/^mock-msg-/)

    const msgs = await getChatMessages(convId)
    expect(msgs).toHaveLength(1)
    expect(msgs[0].content).toBe('hello')
  })

  it('manages goals, updates and deletes them', async () => {
    const id = await createGoal('demo-user', {
      title: 'Green Goal',
      description: 'save carbon',
      category: 'energy',
      targetReductionKg: 10,
      deadline: new Date(Date.now() + 10000) as any,
    })
    expect(id).toMatch(/^mock-goal-/)

    await updateGoal(id, { status: 'completed' })
    const goals = await getUserGoals('demo-user')
    const updated = goals.find(g => g.id === id)
    expect(updated?.status).toBe('completed')

    await deleteGoal(id)
    const afterDelete = await getUserGoals('demo-user')
    expect(afterDelete.find(g => g.id === id)).toBeUndefined()
  })

  it('saves and retrieves weekly reports', async () => {
    const reportId = await saveWeeklyReport('demo-user', {
      userId: 'demo-user',
      weekStart: fs.Timestamp.now(),
      weekEnd: fs.Timestamp.now(),
      totalEmissionsKg: 10,
      carbonScore: 90,
      previousScore: 80,
      scoreDelta: 10,
      topContributors: [],
      recommendations: [],
      trend: 'improving',
      projectedAnnualKg: 520,
      narrative: 'Good job',
    })
    expect(reportId).toMatch(/^mock-rep-/)

    const latest = await getLatestWeeklyReport('demo-user')
    expect(latest).not.toBeNull()
    expect(latest?.id).toBe(reportId)
  })
})

describe('Firestore Service (Real Firebase Configured)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockFirebaseConfigured = true
  })

  it('calls real firestore getDoc on getUser', async () => {
    const mockSnap = {
      exists: () => true,
      id: 'real-user-id',
      data: () => ({ displayName: 'Firebase User' }),
    }
    vi.mocked(fs.getDoc).mockResolvedValue(mockSnap as any)

    const user = await getUser('real-user-id')
    expect(fs.getDoc).toHaveBeenCalled()
    expect(user?.displayName).toBe('Firebase User')
  })

  it('calls real firestore getDocs on getUserActivities', async () => {
    const mockSnap = {
      docs: [
        { id: 'act-1', data: () => ({ activity: 'real_act_1' }) },
      ]
    }
    vi.mocked(fs.getDocs).mockResolvedValue(mockSnap as any)

    const list = await getUserActivities('real-user-id')
    expect(fs.getDocs).toHaveBeenCalled()
    expect(list).toHaveLength(1)
    expect(list[0].activity).toBe('real_act_1')
  })

  it('calls real firestore getDocs on getWeeklyActivities', async () => {
    const mockSnap = { docs: [] }
    vi.mocked(fs.getDocs).mockResolvedValue(mockSnap as any)
    const list = await getWeeklyActivities('real-user-id')
    expect(list).toHaveLength(0)
  })

  it('calls real firestore updateDoc/setDoc on createUser', async () => {
    vi.mocked(fs.updateDoc).mockResolvedValue(undefined)
    await createUser('real-user-id', { displayName: 'Real', email: 'real@email.com', photoURL: null, carbonScore: 75, totalEmissionsKg: 0, weeklyGoalKg: 100 })
    expect(fs.updateDoc).toHaveBeenCalled()
  })

  it('calls real firestore updateDoc on updateUser', async () => {
    vi.mocked(fs.updateDoc).mockResolvedValue(undefined)
    await updateUser('real-user-id', { carbonScore: 80 })
    expect(fs.updateDoc).toHaveBeenCalled()
  })

  it('calls real firestore addDoc on createActivity', async () => {
    const id = await createActivity('real-user-id', { category: 'transport', activity: 'bus', quantity: 10, emission: 1 })
    expect(fs.addDoc).toHaveBeenCalled()
    expect(id).toBe('new-doc-id')
  })

  it('calls real firestore deleteDoc on deleteActivity', async () => {
    await deleteActivity('real-act-id')
    expect(fs.deleteDoc).toHaveBeenCalled()
  })

  it('calls real firestore addDoc on createVoiceLog and getDocs on getUserVoiceLogs', async () => {
    const id = await createVoiceLog('real-user-id', { transcript: 'test', audioLengthSeconds: 15, processingStatus: 'complete', extractedActivities: [] })
    expect(fs.addDoc).toHaveBeenCalled()
    expect(id).toBe('new-doc-id')

    vi.mocked(fs.getDocs).mockResolvedValue({ docs: [] } as any)
    await getUserVoiceLogs('real-user-id')
    expect(fs.getDocs).toHaveBeenCalled()
  })

  it('calls real firestore APIs on conversation and message methods', async () => {
    vi.mocked(fs.getDocs).mockResolvedValue({ empty: true, docs: [] } as any)
    const convId = await getOrCreateConversation('real-user-id')
    expect(convId).toBe('new-doc-id')

    await getChatMessages('real-conv-id')
    expect(fs.getDocs).toHaveBeenCalled()

    await saveChatMessage('real-conv-id', { role: 'user', content: 'test', conversationId: 'real-conv-id' })
    expect(fs.addDoc).toHaveBeenCalled()
  })

  it('calls real firestore APIs on goal methods', async () => {
    const goalId = await createGoal('real-user-id', { title: 'Goal', description: '', category: 'energy', targetReductionKg: 10, deadline: fs.Timestamp.now() })
    expect(goalId).toBe('new-doc-id')

    vi.mocked(fs.getDocs).mockResolvedValue({ docs: [] } as any)
    await getUserGoals('real-user-id')
    expect(fs.getDocs).toHaveBeenCalled()

    await updateGoal('real-goal-id', { status: 'completed' })
    expect(fs.updateDoc).toHaveBeenCalled()

    await deleteGoal('real-goal-id')
    expect(fs.deleteDoc).toHaveBeenCalled()
  })

  it('calls real firestore APIs on weekly report methods', async () => {
    const reportId = await saveWeeklyReport('real-user-id', {
      userId: 'real-user-id',
      weekStart: fs.Timestamp.now(),
      weekEnd: fs.Timestamp.now(),
      totalEmissionsKg: 10,
      carbonScore: 80,
      previousScore: 70,
      scoreDelta: 10,
      projectedAnnualKg: 520,
      topContributors: [],
      recommendations: [],
      trend: 'stable',
      narrative: '',
    })
    expect(reportId).toBe('new-doc-id')

    vi.mocked(fs.getDocs).mockResolvedValue({ empty: true } as any)
    await getLatestWeeklyReport('real-user-id')
    expect(fs.getDocs).toHaveBeenCalled()
  })

  it('calls real firestore APIs on route comparisons', async () => {
    const id = await saveRouteComparison('real-user-id', { origin: 'A', destination: 'B', distanceKm: 10, options: [], recommendedMode: 'train', totalSavingsKg: 5, aiReasoning: '' })
    expect(id).toBe('new-doc-id')

    vi.mocked(fs.getDocs).mockResolvedValue({ docs: [] } as any)
    await getUserRouteComparisons('real-user-id')
    expect(fs.getDocs).toHaveBeenCalled()
  })
})
