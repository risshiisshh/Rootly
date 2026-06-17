import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock maps service at module scope to ensure hoisting resolves correctly
vi.mock('@/services/maps', () => ({
  getRouteOptions: vi.fn().mockResolvedValue({
    options: [
      { mode: 'train', distanceKm: 25, durationMinutes: 30, emissionsKg: 1.0, isRecommended: true, savingsVsCar: 3.8, savingsPercentage: 79 }
    ],
    aiReasoning: 'Train is the best option.',
  })
}))

import { routeCalculator } from '../../backend/features/routes/route.calculator'
import { routesService } from '../../backend/features/routes/routes.service'
import { routesRepository } from '../../backend/features/routes/routes.repository'
import { cacheService } from '../../backend/lib/cache'
import { EMISSION_FACTORS } from '@/lib/constants'
import type { RouteOption } from '@/types/route'

describe('Route Comparison Feature', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    cacheService.clear()
  })

  describe('RouteCalculator', () => {
    it('calculates mode-specific emissions correctly', () => {
      const distance = 50
      
      const carEmissions = routeCalculator.calculateEmissions('car', distance)
      expect(carEmissions).toBeCloseTo(distance * EMISSION_FACTORS.transport.car_petrol_per_km, 4)

      const evEmissions = routeCalculator.calculateEmissions('ev', distance)
      expect(evEmissions).toBeCloseTo(distance * EMISSION_FACTORS.transport.car_ev_per_km, 4)

      const trainEmissions = routeCalculator.calculateEmissions('train', distance)
      expect(trainEmissions).toBeCloseTo(distance * EMISSION_FACTORS.transport.train_per_km, 4)

      const bikeEmissions = routeCalculator.calculateEmissions('bike', distance)
      expect(bikeEmissions).toBe(0)

      const walkEmissions = routeCalculator.calculateEmissions('walk', distance)
      expect(walkEmissions).toBe(0)
    })

    it('estimates mode-specific costs correctly', () => {
      const distance = 10
      expect(routeCalculator.estimateCost('car', distance)).toBe(10 * 0.18 + 2) // 3.8
      expect(routeCalculator.estimateCost('bike', distance)).toBe(0)
    })

    it('sorts options and computes savings comparison against car', () => {
      const rawOptions: RouteOption[] = [
        {
          mode: 'car',
          distanceKm: 10,
          durationMinutes: 15,
          emissionsKg: 1.92, // 10 * 0.192
          isRecommended: false,
        },
        {
          mode: 'train',
          distanceKm: 10,
          durationMinutes: 10,
          emissionsKg: 0.41, // 10 * 0.041
          isRecommended: false,
        },
        {
          mode: 'walk',
          distanceKm: 10,
          durationMinutes: 120,
          emissionsKg: 0,
          isRecommended: false,
        }
      ]

      const { recommendedMode, totalSavingsKg, optionsWithSavings } = routeCalculator.calculateSavings(rawOptions)
      
      // Recommended mode must be the one with the lowest emissions (walk has 0 emissions)
      expect(recommendedMode).toBe('walk')
      expect(totalSavingsKg).toBe(1.92) // car (1.92) - walk (0) = 1.92

      // Savings compared to car
      const carOpt = optionsWithSavings.find(o => o.mode === 'car')
      const trainOpt = optionsWithSavings.find(o => o.mode === 'train')
      const walkOpt = optionsWithSavings.find(o => o.mode === 'walk')

      expect(carOpt?.savingsVsCar).toBe(0)
      expect(trainOpt?.savingsVsCar).toBeCloseTo(1.92 - 0.41, 4) // 1.51
      expect(trainOpt?.savingsPercentage).toBe(79) // 1.51 / 1.92 = 79%
      expect(walkOpt?.isRecommended).toBe(true)
    })
  })

  describe('RoutesService', () => {
    it('saves comparison to repository and utilizes cache', async () => {
      const saveSpy = vi.spyOn(routesRepository, 'save').mockResolvedValue('mock-route-id')

      // First run (cache miss)
      const comparison = await routesService.compareRoutes('user-123', 'CityA', 'CityB')
      expect(comparison.recommendedMode).toBe('train')
      expect(comparison.totalSavingsKg).toBe(3.8)
      expect(saveSpy).toHaveBeenCalledTimes(1)

      // Second run (cache hit)
      const cached = await routesService.compareRoutes('user-123', 'CityA', 'CityB')
      expect(cached).toEqual(comparison)
      
      // Save repository should have been called again (asynchronously for history log)
      expect(saveSpy).toHaveBeenCalledTimes(2)
    })
  })
})
