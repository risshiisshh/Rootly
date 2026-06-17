import type { TransportMode, RouteOption } from '@/types/route'
import { generateRouteReasoning } from './claude'
import { routeCalculator } from '@/backend/features/routes/route.calculator'

interface GoogleDirectionsLeg {
  distance: { value: number }
  duration: { value: number }
}

interface GoogleDirectionsRoute {
  legs: GoogleDirectionsLeg[]
}

interface GoogleDirectionsResult {
  routes: GoogleDirectionsRoute[]
  status: string
}

const MAPS_API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY!

/**
 * Get route options using Google Maps Directions API
 * Falls back to estimated data if API is unavailable
 */
export async function getRouteOptions(
  origin: string,
  destination: string,
  customApiKey?: string
): Promise<{ options: RouteOption[]; aiReasoning: string }> {
  const modes: { googleMode: string; appMode: TransportMode }[] = [
    { googleMode: 'driving', appMode: 'car' },
    { googleMode: 'transit', appMode: 'train' },
    { googleMode: 'bicycling', appMode: 'bike' },
    { googleMode: 'walking', appMode: 'walk' },
  ]

  let distanceKm = 0
  let options: RouteOption[] = []

  // Try to get real data from Google Maps
  for (const { googleMode, appMode } of modes) {
    try {
      const url = new URL('https://maps.googleapis.com/maps/api/directions/json')
      url.searchParams.set('origin', origin)
      url.searchParams.set('destination', destination)
      url.searchParams.set('mode', googleMode)
      url.searchParams.set('key', MAPS_API_KEY)

      const res = await fetch(url.toString())
      const data: GoogleDirectionsResult = await res.json()

      if (data.status === 'OK' && data.routes.length > 0) {
        const leg = data.routes[0].legs[0]
        const legDistKm = leg.distance.value / 1000
        const durationMin = Math.round(leg.duration.value / 60)
        distanceKm = Math.max(distanceKm, legDistKm)

        const emissionsKg = routeCalculator.calculateEmissions(appMode, legDistKm)
        options.push({
          mode: appMode,
          durationMinutes: durationMin,
          distanceKm: legDistKm,
          emissionsKg,
          estimatedCost: routeCalculator.estimateCost(appMode, legDistKm),
          isRecommended: false,
          savingsVsCar: 0,
          savingsPercentage: 0,
        })
      }
    } catch {
      // Skip failed mode
    }
  }

  // If no Google Maps data, generate estimated data based on approximate distance
  if (options.length === 0) {
    const estimatedDistKm = 25 // Default 25km estimate
    distanceKm = estimatedDistKm
    const fallbackModes: TransportMode[] = ['car', 'train', 'bus', 'bike', 'walk']
    const speeds: Record<string, number> = {
      car: 45, train: 80, bus: 35, bike: 15, walk: 5
    }
    for (const mode of fallbackModes) {
      const dist = mode === 'walk' && estimatedDistKm > 5 ? estimatedDistKm : estimatedDistKm
      const speed = speeds[mode] ?? 30
      options.push({
        mode,
        durationMinutes: Math.round((dist / speed) * 60),
        distanceKm: dist,
        emissionsKg: routeCalculator.calculateEmissions(mode, dist),
        estimatedCost: routeCalculator.estimateCost(mode, dist),
        isRecommended: false,
        savingsVsCar: 0,
        savingsPercentage: 0,
      })
    }
  }

  // Use calculation service to sort, compute savings and recommend the lowest emitter
  const result = routeCalculator.calculateSavings(options)
  options = result.optionsWithSavings

  // Generate AI reasoning
  const aiReasoning = await generateRouteReasoning(
    origin,
    destination,
    options.map((o) => ({
      mode: o.mode,
      emissionsKg: o.emissionsKg,
      durationMinutes: o.durationMinutes,
    })),
    customApiKey
  ).catch(() => `${options[0]?.mode ?? 'public transit'} is the greenest option for this route.`)

  return { options, aiReasoning }
}
