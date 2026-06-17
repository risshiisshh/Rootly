import {
  collection,
  doc,
  getDoc,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  limit,
  Timestamp,
  serverTimestamp,
  DocumentData,
  QueryConstraint,
} from 'firebase/firestore'
import { db, isFirebaseConfigured } from './firebase'
import type { Activity, CreateActivityInput, VoiceLog } from '@/types/activity'
import type { User } from '@/types/user'
import type { Goal } from '@/types/report'
import type { WeeklyReport } from '@/types/report'
import type { RouteComparison } from '@/types/route'
import type { ChatMessage, Conversation } from '@/types/chat'
import { getWeekStart, getWeekEnd } from '@/lib/utils'

// ─── Local Memory Mock Databases (Fallback for Demo Mode) ────────────────────

const mockActivities: Activity[] = [
  {
    id: 'mock-act-1',
    userId: 'demo-user-id',
    category: 'transport',
    activity: 'train',
    quantity: 15,
    emission: 1.2,
    description: '15 km eco transit ride',
    timestamp: Timestamp.now(),
  },
  {
    id: 'mock-act-2',
    userId: 'demo-user-id',
    category: 'food',
    activity: 'vegan_meal',
    quantity: 1,
    emission: 0.8,
    description: 'Plant-based meal',
    timestamp: Timestamp.now(),
  },
  {
    id: 'mock-act-3',
    userId: 'demo-user-id',
    category: 'energy',
    activity: 'natural_gas_m3',
    quantity: 2.2,
    emission: 4.5,
    description: 'Standard home heating cycle',
    timestamp: Timestamp.now(),
  }
]

const mockGoals: Goal[] = [
  {
    id: 'mock-goal-1',
    userId: 'demo-user-id',
    title: 'Reduce Transportation Emissions',
    description: 'Switch commute to electric train or cycling.',
    category: 'transportation',
    targetReductionKg: 20,
    currentProgressKg: 5.5,
    deadline: Timestamp.fromDate(new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)),
    status: 'active',
    createdAt: Timestamp.now(),
    updatedAt: Timestamp.now(),
  },
  {
    id: 'mock-goal-2',
    userId: 'demo-user-id',
    title: 'Plant-based Diet Days',
    description: 'Have at least 4 vegetarian/vegan days a week.',
    category: 'diet',
    targetReductionKg: 15,
    currentProgressKg: 12,
    deadline: Timestamp.fromDate(new Date(Date.now() + 15 * 24 * 60 * 60 * 1000)),
    status: 'active',
    createdAt: Timestamp.now(),
    updatedAt: Timestamp.now(),
  }
]

const mockVoiceLogs: VoiceLog[] = []
const mockConversations: Conversation[] = []
const mockChatMessages: Record<string, ChatMessage[]> = {}
const mockWeeklyReports: WeeklyReport[] = [
  {
    id: 'mock-rep-1',
    userId: 'demo-user-id',
    weekStart: Timestamp.fromDate(new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)),
    weekEnd: Timestamp.now(),
    totalEmissionsKg: 34.5,
    carbonScore: 82,
    previousScore: 78,
    scoreDelta: 4,
    topContributors: [
      { category: 'energy', percentage: 55, emissionsKg: 19.0 },
      { category: 'transportation', percentage: 30, emissionsKg: 10.35 },
      { category: 'diet', percentage: 15, emissionsKg: 5.15 },
    ],
    recommendations: [
      {
        id: 'mock-rec-1',
        title: 'Adjust Thermostat by 1°C',
        description: 'Lowering your heating by just 1 degree saves significant gas energy.',
        potentialSavingsKg: 5.2,
        priority: 'high',
        category: 'energy',
      },
      {
        id: 'mock-rec-2',
        title: 'Carpool or Take Transit on Thursdays',
        description: 'Your Thursday driving commute is your highest transit emitter.',
        potentialSavingsKg: 3.5,
        priority: 'medium',
        category: 'transportation',
      }
    ],
    trend: 'improving',
    narrative: 'You have done a fantastic job lowering your transport emissions this week by taking the train. Keep it up!',
    projectedAnnualKg: 1794,
    generatedAt: Timestamp.now(),
  }
]
const mockRouteComparisons: RouteComparison[] = []

// ─── User Operations ────────────────────────────────────────────────────────

export async function getUser(uid: string): Promise<User | null> {
  if (!isFirebaseConfigured) {
    return {
      uid,
      displayName: 'Eco Explorer',
      email: 'demo@rootly.green',
      photoURL: null,
      carbonScore: 82,
      totalEmissionsKg: 142.5,
      weeklyGoalKg: 100,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
    }
  }
  const docRef = doc(db, 'users', uid)
  const docSnap = await getDoc(docRef)
  if (!docSnap.exists()) return null
  return { uid: docSnap.id, ...docSnap.data() } as User
}

export async function createUser(uid: string, data: Omit<User, 'uid' | 'createdAt' | 'updatedAt'>): Promise<void> {
  if (!isFirebaseConfigured) return
  const docRef = doc(db, 'users', uid)
  await updateDoc(docRef, {
    ...data,
    carbonScore: 75,
    totalEmissionsKg: 0,
    weeklyGoalKg: 100,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  }).catch(async () => {
    const { setDoc } = await import('firebase/firestore')
    await setDoc(docRef, {
      ...data,
      carbonScore: 75,
      totalEmissionsKg: 0,
      weeklyGoalKg: 100,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    })
  })
}

export async function updateUser(uid: string, data: Partial<User>): Promise<void> {
  if (!isFirebaseConfigured) return
  const docRef = doc(db, 'users', uid)
  await updateDoc(docRef, { ...data, updatedAt: serverTimestamp() })
}

// ─── Activity Operations ─────────────────────────────────────────────────────

export async function createActivity(
  userId: string,
  data: CreateActivityInput
): Promise<string> {
  if (!isFirebaseConfigured) {
    const id = `mock-act-${Date.now()}`
    mockActivities.unshift({
      id,
      userId,
      ...data,
      timestamp: Timestamp.now(),
      createdAt: Timestamp.now(),
    })
    return id
  }
  const colRef = collection(db, 'activities')
  const docRef = await addDoc(colRef, {
    ...data,
    userId,
    timestamp: serverTimestamp(),
    createdAt: serverTimestamp(),
  })
  return docRef.id
}

export async function getUserActivities(
  userId: string,
  options?: { limit?: number; category?: string }
): Promise<Activity[]> {
  if (!isFirebaseConfigured) {
    let filtered = mockActivities.filter(a => a.userId === userId)
    if (options?.category) {
      filtered = filtered.filter(a => a.category === options.category)
    }
    if (options?.limit) {
      filtered = filtered.slice(0, options.limit)
    }
    return filtered
  }
  const constraints: QueryConstraint[] = [
    where('userId', '==', userId),
    orderBy('timestamp', 'desc'),
  ]
  if (options?.category) {
    constraints.push(where('category', '==', options.category))
  }
  if (options?.limit) {
    constraints.push(limit(options.limit))
  }
  const q = query(collection(db, 'activities'), ...constraints)
  const snap = await getDocs(q)
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as Activity))
}

export async function getWeeklyActivities(userId: string, date = new Date()): Promise<Activity[]> {
  if (!isFirebaseConfigured) {
    const start = getWeekStart(date)
    const end = getWeekEnd(date)
    return mockActivities.filter(a => {
      const t = a.timestamp?.toDate()
      return a.userId === userId && t && t >= start && t <= end
    })
  }
  const weekStart = Timestamp.fromDate(getWeekStart(date))
  const weekEnd = Timestamp.fromDate(getWeekEnd(date))
  const q = query(
    collection(db, 'activities'),
    where('userId', '==', userId),
    where('timestamp', '>=', weekStart),
    where('timestamp', '<=', weekEnd),
    orderBy('timestamp', 'desc')
  )
  const snap = await getDocs(q)
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as Activity))
}

export async function deleteActivity(activityId: string): Promise<void> {
  if (!isFirebaseConfigured) {
    const idx = mockActivities.findIndex(a => a.id === activityId)
    if (idx !== -1) mockActivities.splice(idx, 1)
    return
  }
  await deleteDoc(doc(db, 'activities', activityId))
}

// ─── Voice Log Operations ────────────────────────────────────────────────────

export async function createVoiceLog(
  userId: string,
  data: Omit<VoiceLog, 'id' | 'userId' | 'createdAt'>
): Promise<string> {
  if (!isFirebaseConfigured) {
    const id = `mock-voice-${Date.now()}`
    mockVoiceLogs.unshift({
      id,
      userId,
      ...data,
      createdAt: Timestamp.now(),
    })
    return id
  }
  const colRef = collection(db, 'voiceLogs')
  const docRef = await addDoc(colRef, {
    ...data,
    userId,
    createdAt: serverTimestamp(),
  })
  return docRef.id
}

export async function getUserVoiceLogs(userId: string, limitCount = 20): Promise<VoiceLog[]> {
  if (!isFirebaseConfigured) {
    return mockVoiceLogs.filter(v => v.userId === userId).slice(0, limitCount)
  }
  const q = query(
    collection(db, 'voiceLogs'),
    where('userId', '==', userId),
    orderBy('createdAt', 'desc'),
    limit(limitCount)
  )
  const snap = await getDocs(q)
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as VoiceLog))
}

// ─── Chat Operations ─────────────────────────────────────────────────────────

export async function getOrCreateConversation(userId: string): Promise<string> {
  if (!isFirebaseConfigured) {
    const existing = mockConversations.find(c => c.userId === userId)
    if (existing) return existing.id
    const id = `mock-conv-${Date.now()}`
    mockConversations.push({
      id,
      userId,
      title: 'New Session',
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
      messageCount: 0,
    })
    mockChatMessages[id] = []
    return id
  }
  const q = query(
    collection(db, 'conversations'),
    where('userId', '==', userId),
    orderBy('updatedAt', 'desc'),
    limit(1)
  )
  const snap = await getDocs(q)
  if (!snap.empty) {
    return snap.docs[0].id
  }
  const colRef = collection(db, 'conversations')
  const docRef = await addDoc(colRef, {
    userId,
    title: 'New Session',
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    messageCount: 0,
  })
  return docRef.id
}

export async function getChatMessages(
  conversationId: string,
  limitCount = 20
): Promise<ChatMessage[]> {
  if (!isFirebaseConfigured) {
    return (mockChatMessages[conversationId] || []).slice(-limitCount)
  }
  const q = query(
    collection(db, 'conversations', conversationId, 'messages'),
    orderBy('timestamp', 'asc'),
    limit(limitCount)
  )
  const snap = await getDocs(q)
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as ChatMessage))
}

export async function saveChatMessage(
  conversationId: string,
  message: Omit<ChatMessage, 'id' | 'timestamp'>
): Promise<string> {
  if (!isFirebaseConfigured) {
    const id = `mock-msg-${Date.now()}`
    if (!mockChatMessages[conversationId]) {
      mockChatMessages[conversationId] = []
    }
    mockChatMessages[conversationId].push({
      id,
      conversationId,
      ...message,
      timestamp: Timestamp.now(),
    })
    return id
  }
  const colRef = collection(db, 'conversations', conversationId, 'messages')
  const docRef = await addDoc(colRef, {
    ...message,
    timestamp: serverTimestamp(),
  })
  await updateDoc(doc(db, 'conversations', conversationId), {
    updatedAt: serverTimestamp(),
  })
  return docRef.id
}

// ─── Goal Operations ─────────────────────────────────────────────────────────

export async function createGoal(userId: string, data: Omit<Goal, 'id' | 'userId' | 'createdAt' | 'updatedAt' | 'currentProgressKg' | 'status'>): Promise<string> {
  if (!isFirebaseConfigured) {
    const id = `mock-goal-${Date.now()}`
    mockGoals.unshift({
      id,
      userId,
      ...data,
      currentProgressKg: 0,
      status: 'active',
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
    })
    return id
  }
  const colRef = collection(db, 'goals')
  const docRef = await addDoc(colRef, {
    ...data,
    userId,
    currentProgressKg: 0,
    status: 'active',
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  })
  return docRef.id
}

export async function getUserGoals(userId: string): Promise<Goal[]> {
  if (!isFirebaseConfigured) {
    return mockGoals.filter(g => g.userId === userId)
  }
  const q = query(
    collection(db, 'goals'),
    where('userId', '==', userId),
    orderBy('createdAt', 'desc')
  )
  const snap = await getDocs(q)
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as Goal))
}

export async function updateGoal(goalId: string, data: Partial<Goal>): Promise<void> {
  if (!isFirebaseConfigured) {
    const goal = mockGoals.find(g => g.id === goalId)
    if (goal) {
      Object.assign(goal, data, { updatedAt: Timestamp.now() })
    }
    return
  }
  await updateDoc(doc(db, 'goals', goalId), { ...data, updatedAt: serverTimestamp() })
}

export async function deleteGoal(goalId: string): Promise<void> {
  if (!isFirebaseConfigured) {
    const idx = mockGoals.findIndex(g => g.id === goalId)
    if (idx !== -1) mockGoals.splice(idx, 1)
    return
  }
  await deleteDoc(doc(db, 'goals', goalId))
}

// ─── Report Operations ───────────────────────────────────────────────────────

export async function saveWeeklyReport(userId: string, report: Omit<WeeklyReport, 'id' | 'generatedAt'>): Promise<string> {
  if (!isFirebaseConfigured) {
    const id = `mock-rep-${Date.now()}`
    mockWeeklyReports.unshift({
      id,
      ...report,
      generatedAt: Timestamp.now(),
    })
    return id
  }
  const colRef = collection(db, 'weeklyReports')
  const docRef = await addDoc(colRef, {
    ...report,
    userId,
    generatedAt: serverTimestamp(),
  })
  return docRef.id
}

export async function getLatestWeeklyReport(userId: string): Promise<WeeklyReport | null> {
  if (!isFirebaseConfigured) {
    const userReps = mockWeeklyReports.filter(r => r.userId === userId)
    return userReps.length > 0 ? userReps[0] : null
  }
  const q = query(
    collection(db, 'weeklyReports'),
    where('userId', '==', userId),
    orderBy('generatedAt', 'desc'),
    limit(1)
  )
  const snap = await getDocs(q)
  if (snap.empty) return null
  return { id: snap.docs[0].id, ...snap.docs[0].data() } as WeeklyReport
}

// ─── Route Comparison Operations ─────────────────────────────────────────────

export async function saveRouteComparison(
  userId: string,
  data: Omit<RouteComparison, 'id' | 'userId' | 'createdAt'>
): Promise<string> {
  if (!isFirebaseConfigured) {
    const id = `mock-route-${Date.now()}`
    mockRouteComparisons.unshift({
      id,
      userId,
      ...data,
      createdAt: Timestamp.now(),
    })
    return id
  }
  const colRef = collection(db, 'routeComparisons')
  const docRef = await addDoc(colRef, {
    ...data,
    userId,
    createdAt: serverTimestamp(),
  })
  return docRef.id
}

export async function getUserRouteComparisons(userId: string, limitCount = 10): Promise<RouteComparison[]> {
  if (!isFirebaseConfigured) {
    return mockRouteComparisons.filter(r => r.userId === userId).slice(0, limitCount)
  }
  const q = query(
    collection(db, 'routeComparisons'),
    where('userId', '==', userId),
    orderBy('createdAt', 'desc'),
    limit(limitCount)
  )
  const snap = await getDocs(q)
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as RouteComparison))
}
