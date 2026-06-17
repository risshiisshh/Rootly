import { getRouteOptions } from '../../../services/maps'
import { routesRepository } from './routes.repository'
import { cacheService } from '../../lib/cache'

const ROUTE_CACHE_TTL = 30 * 60 * 1000 // Cache for 30 minutes

export class RoutesService {
  async compareRoutes(
    userId: string,
    origin: string,
    destination: string,
    customApiKey?: string
  ) {
    const cacheKey = `route:${origin.trim().toLowerCase()}:${destination.trim().toLowerCase()}`
    
    // 1. Try Cache
    const cached = cacheService.get<any>(cacheKey)
    if (cached) {
      // Save history asynchronously
      routesRepository.save(userId, cached).catch(console.error)
      return cached
    }

    // 2. Fetch from Maps Service
    const { options, aiReasoning } = await getRouteOptions(origin, destination, customApiKey)
    const recommendedMode = options[0]?.mode ?? 'train'
    const totalSavingsKg = options[0]?.savingsVsCar ?? 0

    const comparison = {
      origin,
      destination,
      distanceKm: options[0]?.distanceKm ?? 0,
      options,
      recommendedMode,
      totalSavingsKg,
      aiReasoning,
    }

    // 3. Set Cache
    cacheService.set(cacheKey, comparison, ROUTE_CACHE_TTL)

    // 4. Save to Repository
    await routesRepository.save(userId, comparison)

    return comparison
  }
}

export const routesService = new RoutesService()
