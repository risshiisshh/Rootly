import { EMISSION_FACTORS } from '@/lib/constants'

export class EmissionCalculator {
  calculate(category: string, activity: string, quantity: number): number {
    if (quantity <= 0) return 0

    const cat = category.toLowerCase()
    const act = activity.toLowerCase()

    if (cat === 'transport') {
      if (act.includes('car_ev') || act === 'ev') {
        return quantity * EMISSION_FACTORS.transport.car_ev_per_km
      }
      if (act.includes('car_diesel') || act === 'diesel') {
        return quantity * EMISSION_FACTORS.transport.car_diesel_per_km
      }
      if (act.includes('car') || act.includes('drive') || act.includes('drove')) {
        return quantity * EMISSION_FACTORS.transport.car_petrol_per_km
      }
      if (act.includes('bus')) {
        return quantity * EMISSION_FACTORS.transport.bus_per_km
      }
      if (act.includes('subway') || act.includes('metro')) {
        return quantity * EMISSION_FACTORS.transport.subway_per_km
      }
      if (act.includes('train') || act.includes('rail')) {
        return quantity * EMISSION_FACTORS.transport.train_per_km
      }
      if (act.includes('flight') || act.includes('plane') || act.includes('flew')) {
        // Use short flight factor for <= 1500 km, long flight factor otherwise
        const factor = quantity <= 1500 
          ? EMISSION_FACTORS.transport.flight_short_per_km 
          : EMISSION_FACTORS.transport.flight_long_per_km
        return quantity * factor
      }
      if (act.includes('motorcycle') || act.includes('bike_motor')) {
        return quantity * EMISSION_FACTORS.transport.motorcycle_per_km
      }
      if (act.includes('bike') || act.includes('bicycle')) {
        return quantity * EMISSION_FACTORS.transport.bike_per_km
      }
      if (act.includes('walk') || act.includes('run')) {
        return quantity * EMISSION_FACTORS.transport.walk_per_km
      }
      // Fallback transport
      return quantity * 0.1
    }

    if (cat === 'food') {
      if (act.includes('red_meat') || act.includes('beef') || act.includes('pork') || act.includes('lamb') || act === 'steak' || act === 'burger') {
        return quantity * EMISSION_FACTORS.food.meat_heavy_meal
      }
      if (act.includes('chicken') || act.includes('poultry') || act.includes('fish') || act.includes('biryani') || act === 'mixed') {
        return quantity * EMISSION_FACTORS.food.mixed_meal
      }
      if (act.includes('vegan') || act.includes('salad') || act.includes('tofu')) {
        return quantity * EMISSION_FACTORS.food.vegan_meal
      }
      if (act.includes('veg') || act.includes('plant') || act.includes('vegetarian') || act.includes('dal') || act.includes('roti') || act.includes('paneer') || act.includes('rice')) {
        return quantity * EMISSION_FACTORS.food.plant_based_meal
      }
      // Fallback food meal
      return quantity * 1.0
    }

    if (cat === 'energy') {
      if (act.includes('electricity') || act.includes('kwh')) {
        return quantity * EMISSION_FACTORS.energy.electricity_per_kwh
      }
      if (act.includes('natural_gas') || act.includes('gas')) {
        return quantity * EMISSION_FACTORS.energy.natural_gas_per_kwh
      }
      if (act.includes('heating_oil') || act.includes('oil')) {
        return quantity * EMISSION_FACTORS.energy.heating_oil_per_litre
      }
      if (act.includes('coal')) {
        return quantity * EMISSION_FACTORS.energy.coal_per_kg
      }
      if (act.includes('lpg')) {
        return quantity * EMISSION_FACTORS.energy.lpg_per_kg
      }
      if (act.includes('renewable') || act.includes('solar') || act.includes('wind')) {
        return quantity * EMISSION_FACTORS.energy.renewable_per_kwh
      }
      // Fallback energy per unit
      return quantity * 0.2
    }

    if (cat === 'lifestyle') {
      if (act.includes('clothing') || act.includes('shirt') || act.includes('jeans')) {
        return quantity * EMISSION_FACTORS.lifestyle.clothing_item
      }
      if (act.includes('phone') || act.includes('smartphone')) {
        return quantity * EMISSION_FACTORS.lifestyle.electronics_smartphone
      }
      if (act.includes('laptop') || act.includes('computer')) {
        return quantity * EMISSION_FACTORS.lifestyle.electronics_laptop
      }
      if (act.includes('streaming') || act.includes('netflix') || act.includes('youtube')) {
        return quantity * EMISSION_FACTORS.lifestyle.streaming_per_hour
      }
      if (act.includes('call') || act.includes('zoom') || act.includes('meet')) {
        return quantity * EMISSION_FACTORS.lifestyle.video_call_per_hour
      }
      if (act.includes('hotel') || act.includes('night') || act.includes('stay')) {
        return quantity * EMISSION_FACTORS.lifestyle.hotel_night_per_night
      }
      if (act.includes('ac') || act.includes('air_con') || act.includes('cooling')) {
        return quantity * EMISSION_FACTORS.lifestyle.ac_per_hour
      }
      if (act.includes('shower')) {
        return quantity * EMISSION_FACTORS.lifestyle.shower_10min
      }
      if (act.includes('bath')) {
        return quantity * EMISSION_FACTORS.lifestyle.bath
      }
      if (act.includes('laundry') || act.includes('washing')) {
        return quantity * EMISSION_FACTORS.lifestyle.laundry_load
      }
      // Fallback lifestyle
      return quantity * 0.5
    }

    // Default fallback calculation
    return quantity * 0.5
  }
}

export const emissionCalculator = new EmissionCalculator()
