import { EMISSION_FACTORS } from '@/lib/constants'
import type { TransportMode, RouteOption } from '@/types/route'

export class RouteCalculator {
  calculateEmissions(mode: TransportMode, distanceKm: number): number {
    const factors = EMISSION_FACTORS.transport
    const modeFactors: Record<TransportMode, number> = {
      car: factors.car_petrol_per_km,
      ev: factors.car_ev_per_km,
      bus: factors.bus_per_km,
      train: factors.train_per_km,
      flight: factors.flight_short_per_km,
      motorcycle: factors.motorcycle_per_km,
      bike: factors.bike_per_km,
      walk: factors.walk_per_km,
    }
    
    const factor = modeFactors[mode] ?? 0.1
    return factor * distanceKm
  }

  estimateCost(mode: TransportMode, distanceKm: number): number | undefined {
    const costs: Partial<Record<TransportMode, (d: number) => number>> = {
      car: (d) => d * 0.18 + 2, // fuel + parking estimate
      bus: (d) => Math.min(2.5 + d * 0.05, 8),
      train: (d) => 3 + d * 0.12,
      ev: (d) => d * 0.04, // electricity cost
      bike: () => 0,
      walk: () => 0,
    }
    const fn = costs[mode]
    return fn ? Math.round(fn(distanceKm) * 100) / 100 : undefined
  }

  calculateSavings(options: RouteOption[]): {
    recommendedMode: TransportMode
    totalSavingsKg: number
    optionsWithSavings: RouteOption[]
  } {
    // Sort by emissions ascending
    const sortedOptions = [...options].sort((a, b) => a.emissionsKg - b.emissionsKg)
    
    // Find car option for savings comparison
    const carOption = sortedOptions.find((o) => o.mode === 'car')
    const carEmissions = carOption?.emissionsKg ?? sortedOptions[sortedOptions.length - 1]?.emissionsKg ?? 0

    const optionsWithSavings = sortedOptions.map((opt, index) => {
      const savingsVsCar = Math.max(0, carEmissions - opt.emissionsKg)
      const savingsPercentage = carEmissions > 0 
        ? Math.round((savingsVsCar / carEmissions) * 100) 
        : 0
      
      return {
        ...opt,
        savingsVsCar,
        savingsPercentage,
        isRecommended: index === 0, // lowest emission is recommended
      }
    })

    const recommendedMode = optionsWithSavings[0]?.mode ?? 'train'
    const totalSavingsKg = optionsWithSavings[0]?.savingsVsCar ?? 0

    return {
      recommendedMode,
      totalSavingsKg,
      optionsWithSavings,
    }
  }
}

export const routeCalculator = new RouteCalculator()
