import { describe, it, expect } from 'vitest'
import {
  EMISSION_FACTORS,
  calculateEmissions,
  calculateRouteEmissions,
  formatEmissionsForTest,
} from '../helpers/emission-helpers'

describe('Emission Calculation Engine', () => {
  describe('EMISSION_FACTORS', () => {
    it('has factors for all transport modes', () => {
      expect(EMISSION_FACTORS.transport.car).toBeGreaterThan(0)
      expect(EMISSION_FACTORS.transport.train).toBeGreaterThan(0)
      expect(EMISSION_FACTORS.transport.bus).toBeGreaterThan(0)
      expect(EMISSION_FACTORS.transport.ev).toBeGreaterThan(0)
      expect(EMISSION_FACTORS.transport.bike).toBe(0)
      expect(EMISSION_FACTORS.transport.walk).toBe(0)
    })

    it('car has higher emissions than train', () => {
      expect(EMISSION_FACTORS.transport.car).toBeGreaterThan(EMISSION_FACTORS.transport.train)
    })

    it('food factors exist for common categories', () => {
      expect(EMISSION_FACTORS.food.red_meat).toBeGreaterThan(0)
      expect(EMISSION_FACTORS.food.chicken).toBeGreaterThan(0)
      expect(EMISSION_FACTORS.food.vegetables).toBeGreaterThan(0)
      expect(EMISSION_FACTORS.food.red_meat).toBeGreaterThan(EMISSION_FACTORS.food.chicken)
    })

    it('energy factors exist', () => {
      expect(EMISSION_FACTORS.energy.electricity_kwh).toBeGreaterThan(0)
      expect(EMISSION_FACTORS.energy.natural_gas_m3).toBeGreaterThan(0)
    })
  })

  describe('calculateEmissions', () => {
    it('returns 0 for bike transport', () => {
      expect(calculateEmissions('transport', 'bike', 100)).toBe(0)
    })

    it('returns 0 for walking', () => {
      expect(calculateEmissions('transport', 'walk', 100)).toBe(0)
    })

    it('calculates car emissions correctly (0.192 kg/km)', () => {
      const result = calculateEmissions('transport', 'car', 10)
      expect(result).toBeCloseTo(1.92, 2)
    })

    it('calculates train emissions correctly (0.041 kg/km)', () => {
      const result = calculateEmissions('transport', 'train', 10)
      expect(result).toBeCloseTo(0.41, 2)
    })

    it('returns positive value for unknown mode', () => {
      const result = calculateEmissions('transport', 'unknown_mode', 10)
      expect(result).toBeGreaterThanOrEqual(0)
    })

    it('handles 0 distance', () => {
      expect(calculateEmissions('transport', 'car', 0)).toBe(0)
    })

    it('handles large distances', () => {
      const result = calculateEmissions('transport', 'flight', 1500)
      expect(result).toBeGreaterThan(0)
      expect(result).toBeLessThan(100000)
    })
  })

  describe('calculateRouteEmissions', () => {
    it('returns array of options sorted by emissions ascending', () => {
      const options = calculateRouteEmissions(20)
      const emissions = options.map((o) => o.emissionsKg)
      for (let i = 0; i < emissions.length - 1; i++) {
        expect(emissions[i]).toBeLessThanOrEqual(emissions[i + 1])
      }
    })

    it('marks first option as recommended', () => {
      const options = calculateRouteEmissions(20)
      const recommended = options.find((o) => o.isRecommended)
      expect(recommended).toBeDefined()
      expect(recommended?.emissionsKg).toBe(options[0].emissionsKg)
    })

    it('bike has 0 emissions for any distance', () => {
      const options = calculateRouteEmissions(100)
      const bike = options.find((o) => o.mode === 'bike')
      expect(bike?.emissionsKg).toBe(0)
    })

    it('car has positive savings vs itself', () => {
      const options = calculateRouteEmissions(20)
      const car = options.find((o) => o.mode === 'car')
      const train = options.find((o) => o.mode === 'train')
      if (car && train) {
        expect(car.emissionsKg).toBeGreaterThan(train.emissionsKg)
      }
    })
  })

  describe('formatEmissionsForTest', () => {
    it('formats grams when < 1kg', () => {
      expect(formatEmissionsForTest(0.5)).toBe('500 g')
    })

    it('formats kilograms correctly', () => {
      expect(formatEmissionsForTest(1.5)).toBe('1.50 kg')
    })

    it('formats tonnes when > 1000 kg', () => {
      expect(formatEmissionsForTest(1500)).toBe('1.50 t')
    })

    it('handles 0', () => {
      expect(formatEmissionsForTest(0)).toBe('0 g')
    })
  })
})
