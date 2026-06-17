/**
 * Test helpers for emission calculations.
 * These mirror the logic in services/maps.ts and lib/emission-factors.ts
 * to allow isolated unit testing without Firebase/API dependencies.
 */

export const EMISSION_FACTORS = {
  transport: {
    car: 0.192,       // kg CO2e/km petrol
    ev: 0.053,        // kg CO2e/km electric vehicle
    motorcycle: 0.103,
    bus: 0.089,
    train: 0.041,
    flight: 0.255,    // short-haul per km
    bike: 0,
    walk: 0,
  },
  food: {
    red_meat: 27.0,       // kg CO2e/kg food
    lamb: 39.2,
    pork: 12.1,
    chicken: 6.9,
    fish: 6.1,
    dairy: 3.2,
    eggs: 4.8,
    vegetables: 2.0,
    legumes: 0.9,
    tofu: 2.0,
  },
  energy: {
    electricity_kwh: 0.233,  // UK grid average kg CO2e/kWh
    natural_gas_m3: 2.04,
    lpg_litre: 1.51,
    coal_kg: 2.42,
  },
}

export function calculateEmissions(
  category: string,
  subtype: string,
  quantity: number
): number {
  const factors = EMISSION_FACTORS[category as keyof typeof EMISSION_FACTORS]
  if (!factors) return quantity * 0.5
  const factor = (factors as Record<string, number>)[subtype]
  if (factor === undefined) return quantity * 0.5
  return factor * quantity
}

export interface RouteOption {
  mode: string
  emissionsKg: number
  durationMinutes: number
  distanceKm: number
  isRecommended: boolean
  savingsVsCar?: number
}

export function calculateRouteEmissions(distanceKm: number): RouteOption[] {
  const modes = [
    { mode: 'car', factor: EMISSION_FACTORS.transport.car, duration: distanceKm * 2 },
    { mode: 'ev', factor: EMISSION_FACTORS.transport.ev, duration: distanceKm * 2 },
    { mode: 'bus', factor: EMISSION_FACTORS.transport.bus, duration: distanceKm * 3 },
    { mode: 'train', factor: EMISSION_FACTORS.transport.train, duration: distanceKm * 1.5 },
    { mode: 'bike', factor: EMISSION_FACTORS.transport.bike, duration: distanceKm * 4 },
    { mode: 'walk', factor: EMISSION_FACTORS.transport.walk, duration: distanceKm * 12 },
  ]

  const carEmissions = EMISSION_FACTORS.transport.car * distanceKm

  const options = modes
    .map(({ mode, factor, duration }) => ({
      mode,
      emissionsKg: factor * distanceKm,
      durationMinutes: Math.round(duration),
      distanceKm,
      isRecommended: false,
      savingsVsCar: Math.max(0, carEmissions - factor * distanceKm),
    }))
    .sort((a, b) => a.emissionsKg - b.emissionsKg)

  if (options.length > 0) options[0].isRecommended = true
  return options
}

export function formatEmissionsForTest(kg: number): string {
  if (kg === 0) return '0 g'
  if (kg < 1) return `${Math.round(kg * 1000)} g`
  if (kg >= 1000) return `${(kg / 1000).toFixed(2)} t`
  return `${kg.toFixed(2)} kg`
}
