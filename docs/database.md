# Rootly - Database Architecture

This document describes the Firestore schema layout, collection configurations, security rules, indexing requirements, and performance optimizations.

---

## 1. Firestore Schema & Collections

Rootly utilizes a Firestore Native Mode database. The schema is organized into primary collections and subcollections.

### `users`
Stores user profile information, carbon score calculations, and goals.
- **Path**: `/users/{uid}`
- **Structure**:
  ```typescript
  interface UserProfile {
    uid: string
    email: string
    displayName: string | null
    photoURL: string | null
    carbonScore: number         // 0 to 100 representing footprint rank
    totalEmissionsKg: number    // Cumulative CO2 emitted
    weeklyGoalKg: number        // Weekly limit target
    createdAt: Timestamp
    updatedAt: Timestamp
  }
  ```

### `activities`
Stores individual carbon-emitting activity entries logged by users.
- **Path**: `/activities/{activityId}`
- **Structure**:
  ```typescript
  interface Activity {
    id: string
    userId: string
    category: 'transport' | 'food' | 'energy' | 'lifestyle' | 'other'
    activity: string            // Label (e.g. "vegan_meal", "train")
    quantity: number            // Number of units
    emission: number            // Calculated kg CO2e
    description?: string
    source: 'manual' | 'voice' | 'ai'
    timestamp: Timestamp
  }
  ```

### `voiceLogs`
Stores voice processing data for audit trails.
- **Path**: `/voiceLogs/{logId}`
- **Structure**:
  ```typescript
  interface VoiceLog {
    id: string
    userId: string
    transcript: string
    audioLengthSeconds: number
    processingStatus: 'pending' | 'complete' | 'failed'
    createdAt: Timestamp
  }
  ```

### `conversations`
Stores conversation sessions. Individual messages are stored in a nested subcollection.
- **Path**: `/conversations/{conversationId}`
- **Subcollection**: `/conversations/{conversationId}/messages/{messageId}`
- **Message Structure**:
  ```typescript
  interface Message {
    id: string
    role: 'user' | 'assistant'
    content: string
    createdAt: Timestamp
  }
  ```

### `weeklyReports`
Stores generated weekly AI intelligence reports and briefings.
- **Path**: `/weeklyReports/{reportId}`
- **Structure**:
  ```typescript
  interface WeeklyReport {
    id: string
    userId: string
    weekStart: Timestamp
    weekEnd: Timestamp
    totalEmissionsKg: number
    carbonScore: number
    previousScore: number
    scoreDelta: number
    topContributors: Array<{ category: string; percentage: number; emissionsKg: number }>
    recommendations: Array<{ title: string; description: string; potentialSavingsKg: number; priority: 'high' | 'medium' | 'low' }>
    trend: 'improving' | 'stable' | 'worsening'
    narrative: string
    projectedAnnualKg: number
    generatedAt: Timestamp
  }
  ```

### `goals`
Tracks user reduction objectives and milestones.
- **Path**: `/goals/{goalId}`
- **Structure**:
  ```typescript
  interface Goal {
    id: string
    userId: string
    title: string
    description: string
    category: string
    targetReductionKg: number
    currentProgressKg: number
    deadline: Timestamp
    status: 'active' | 'completed' | 'paused'
    createdAt: Timestamp
    updatedAt: Timestamp
  }
  ```

### `routeComparisons`
Stores saved transport routes queried by the user.
- **Path**: `/routeComparisons/{comparisonId}`
- **Structure**:
  ```typescript
  interface RouteComparison {
    id: string
    userId: string
    origin: string
    destination: string
    distanceKm: number
    recommendedMode: string
    totalSavingsKg: number
    createdAt: Timestamp
  }
  ```

### `exports_history`
Stores metadata and status logs of user data export requests.
- **Path**: `/exports_history/{exportId}`
- **Structure**:
  ```typescript
  interface ExportRecord {
    id: string
    userId: string
    format: 'csv' | 'pdf' | 'sheets'
    contentType: 'activity-history' | 'weekly-reports' | 'goals-progress'
    dateRange: '7d' | '30d' | '90d' | 'all'
    status: 'pending' | 'completed' | 'failed'
    downloadUrl?: string
    errorMessage?: string
    createdAt: Timestamp
  }
  ```

### `analytics_daily` & `analytics_user_daily`
Caches system-wide and user-specific action counts to prevent excessive Firestore read operations.
- **Daily Path**: `/analytics_daily/{YYYY-MM-DD}`
- **User Daily Path**: `/analytics_user_daily/{hashedUid_YYYY-MM-DD}`
- **Structure**:
  ```typescript
  interface DailyAnalytics {
    date: string               // YYYY-MM-DD
    counts: Record<string, number> // e.g. { USER_LOGIN: 5, ACTIVITY_LOGGED: 12 }
    uniqueUsers?: string[]     // Hashed user IDs (Daily collection only)
  }
  ```

---

## 2. Firestore Indexes

To query collections containing filters and sorted outputs, the following composite indexes must be defined in `firestore.indexes.json`:

1. **`activities`**:
   - `userId` (Ascending) + `timestamp` (Descending) -> Used for loading activity dashboard.
   - `userId` (Ascending) + `category` (Ascending) + `timestamp` (Descending) -> Filtered activity feeds.
2. **`weeklyReports`**:
   - `userId` (Ascending) + `generatedAt` (Descending) -> Used for fetching the latest briefing.
3. **`goals`**:
   - `userId` (Ascending) + `createdAt` (Descending) -> Active missions list.
4. **`exports_history`**:
   - `userId` (Ascending) + `createdAt` (Descending) -> User export history page.

---

## 3. Security Rules Summary

Firestore security rules enforce authorization checks at the database layer (see `firestore.rules`):

- **Owner-Only Read/Write**: Every collection (except notifications write) enforces `request.auth.uid == resource.data.userId` for reads, and `request.auth.uid == request.resource.data.userId` for writes.
- **Immutability Enforcement**: 
  - `activities`, `weeklyReports`, and conversation `messages` do not permit updates (`allow update: if false`). Modifications require deleting and re-creating records to prevent historical tampering.
- **Input Constraints**:
  - Scores must be bounded between `0` and `100`.
  - User goals must limit target emission rates to positive values.
  - Text fields enforce specific string length limits (e.g. email must be ≤ 256 characters, transcripts ≤ 10,000 characters).
- **Notification Safety**: Clients cannot write directly to `/notifications/` (handled via Cloud Functions or Server Admin). Clients can only update the `read` flag using `request.resource.data.diff(resource.data).affectedKeys().hasOnly(['read'])`.
