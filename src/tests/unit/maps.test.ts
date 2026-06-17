import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { getRouteOptions } from '../../services/maps'

describe('Maps Service Calculations', () => {
  const originalFetch = global.fetch

  beforeEach(() => {
    vi.resetAllMocks()
  })

  afterEach(() => {
    global.fetch = originalFetch
  })

  it('uses estimated fallback data when Google Directions API is not configured or fails', async () => {
    // Force fetch to reject/fail to trigger fallback
    global.fetch = vi.fn().mockRejectedValue(new Error('Network error'))

    const result = await getRouteOptions('Mumbai, MH', 'Pune, MH')
    
    expect(result.options).toHaveLength(5) // car, train, bus, bike, walk
    
    // Emissions calculations checks
    const car = result.options.find(o => o.mode === 'car')
    const train = result.options.find(o => o.mode === 'train')
    const bike = result.options.find(o => o.mode === 'bike')
    const walk = result.options.find(o => o.mode === 'walk')

    expect(car).toBeDefined()
    expect(train).toBeDefined()
    expect(bike?.emissionsKg).toBe(0)
    expect(walk?.emissionsKg).toBe(0)
    
    // Check if recommendations are sorted by emissions ascending
    const emissions = result.options.map(o => o.emissionsKg)
    for (let i = 0; i < emissions.length - 1; i++) {
      expect(emissions[i]).toBeLessThanOrEqual(emissions[i + 1])
    }

    // Recommended mode should be the one with the lowest emissions (walk/bike)
    expect(result.options[0].isRecommended).toBe(true)
    expect(result.options[0].mode).toBe('bike') // bike has 0 emissions and is faster than walking
  })

  it('correctly parses and uses Google Directions API response on success', async () => {
    const mockApiResponse = {
      status: 'OK',
      routes: [
        {
          legs: [
            {
              distance: { value: 25000 }, // 25 km
              duration: { value: 1800 },  // 30 mins
            },
          ],
        },
      ],
    }

    // Mock fetch to succeed
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => mockApiResponse,
    } as Response)

    const result = await getRouteOptions('Mumbai, MH', 'Pune, MH')

    expect(result.options.length).toBeGreaterThan(0)
    
    // Check calculations on real returned Google API data
    const car = result.options.find(o => o.mode === 'car')
    expect(car).toBeDefined()
    expect(car?.distanceKm).toBe(25)
    expect(car?.durationMinutes).toBe(30)
    // petrol car factor is 0.192. 25 * 0.192 = 4.8
    expect(car?.emissionsKg).toBeCloseTo(4.8, 2)
  })

  it('correctly calculates savings compared to car driving', async () => {
    // Mock API
    const mockApiResponse = {
      status: 'OK',
      routes: [
        {
          legs: [
            {
              distance: { value: 10000 }, // 10 km
              duration: { value: 600 },   // 10 mins
            },
          ],
        },
      ],
    }

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => mockApiResponse,
    } as Response)

    const result = await getRouteOptions('Mumbai', 'Pune')
    
    const car = result.options.find(o => o.mode === 'car')
    const train = result.options.find(o => o.mode === 'train')

    // Car emissions for 10km: 10 * 0.192 = 1.92
    // Train emissions for 10km: 10 * 0.041 = 0.41
    // Savings: 1.92 - 0.41 = 1.51
    // Savings percentage: Math.round((1.51 / 1.92) * 100) = 79%
    expect(car?.emissionsKg).toBeCloseTo(1.92, 2)
    expect(train?.emissionsKg).toBeCloseTo(0.41, 2)
    expect(train?.savingsVsCar).toBeCloseTo(1.51, 2)
    expect(train?.savingsPercentage).toBe(79)
  })
})
