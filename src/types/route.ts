import { Timestamp } from 'firebase/firestore'

export type TransportMode = 'car' | 'train' | 'bus' | 'ev' | 'bike' | 'walk' | 'flight' | 'motorcycle'

export interface RouteOption {
  mode: TransportMode
  durationMinutes: number
  distanceKm: number
  emissionsKg: number
  estimatedCost?: number
  isRecommended: boolean
  savingsVsCar?: number
  savingsPercentage?: number
}

export interface RouteComparison {
  id: string
  userId: string
  origin: string
  destination: string
  distanceKm: number
  options: RouteOption[]
  recommendedMode: TransportMode
  totalSavingsKg: number
  aiReasoning: string
  createdAt: Timestamp
}

export interface RouteApiRequest {
  origin: string
  destination: string
}

export interface RouteApiResponse {
  comparison: Omit<RouteComparison, 'id' | 'userId' | 'createdAt'>
  mapsUrl?: string
}
