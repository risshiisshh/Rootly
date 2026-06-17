export interface PersonaConfig {
  uid: string
  displayName: string
  email: string
  carbonScore: number
  weeklyGoalKg: number
  description: string
  behavior: {
    transport: {
      modes: { mode: string; probability: number; distanceRange: [number, number] }[]
      frequencyPerWeek: number // commute frequency
    }
    food: {
      meals: { type: string; probability: number }[] // breakfast, lunch, dinner options
    }
    energy: {
      electricityPerWeek: [number, number] // kWh range
      naturalGasPerWeek: [number, number] // kWh range
      acHoursPerDay: [number, number] // hours range
    }
    lifestyle: {
      streamingHoursPerDay: [number, number]
      showerMinutesPerDay: [number, number]
      laundryLoadsPerWeek: [number, number]
      clothingItemsPerMonth: [number, number]
    }
  }
}

export const personas: PersonaConfig[] = [
  {
    uid: 'demo-user-high',
    displayName: 'Alex Commuter',
    email: 'alex.high@rootly.green',
    carbonScore: 35,
    weeklyGoalKg: 150,
    description: 'High emissions profile. Relies heavily on a petrol SUV for long daily commutes, eats red meat daily, keeps the home air conditioning running constantly, and consumes high levels of grid electricity.',
    behavior: {
      transport: {
        modes: [
          { mode: 'car', probability: 0.9, distanceRange: [35, 60] }, // Large SUV/petrol car commute
          { mode: 'train', probability: 0.1, distanceRange: [15, 25] },
        ],
        frequencyPerWeek: 10, // 2 commutes per day, 5 days a week
      },
      food: {
        meals: [
          { type: 'red_meat', probability: 0.5 },
          { type: 'chicken', probability: 0.35 },
          { type: 'mixed', probability: 0.1 },
          { type: 'vegetarian', probability: 0.05 },
        ],
      },
      energy: {
        electricityPerWeek: [120, 180], // High consumption (old appliances, large house)
        naturalGasPerWeek: [100, 150], // High heating consumption
        acHoursPerDay: [6, 12], // Keeps AC blasting
      },
      lifestyle: {
        streamingHoursPerDay: [4, 7],
        showerMinutesPerDay: [15, 25], // Long showers
        laundryLoadsPerWeek: [4, 6],
        clothingItemsPerMonth: [4, 8], // Fast fashion purchases
      },
    },
  },
  {
    uid: 'demo-user-average',
    displayName: 'Sam Moderate',
    email: 'sam.average@rootly.green',
    carbonScore: 65,
    weeklyGoalKg: 80,
    description: 'Average emissions profile. Commutes using a hybrid/average car and public transit, eats meat moderately with some vegetarian days, practices standard energy savings, and has normal lifestyle habits.',
    behavior: {
      transport: {
        modes: [
          { mode: 'car', probability: 0.45, distanceRange: [15, 30] }, // Petrol car (average)
          { mode: 'bus', probability: 0.25, distanceRange: [10, 20] },
          { mode: 'train', probability: 0.2, distanceRange: [15, 25] },
          { mode: 'walk', probability: 0.1, distanceRange: [1, 3] },
        ],
        frequencyPerWeek: 8,
      },
      food: {
        meals: [
          { type: 'red_meat', probability: 0.15 },
          { type: 'chicken', probability: 0.4 },
          { type: 'vegetarian', probability: 0.3 },
          { type: 'vegan', probability: 0.15 },
        ],
      },
      energy: {
        electricityPerWeek: [60, 90], // Average home energy consumption
        naturalGasPerWeek: [40, 75],
        acHoursPerDay: [1, 4], // Uses AC moderately
      },
      lifestyle: {
        streamingHoursPerDay: [2, 4],
        showerMinutesPerDay: [8, 12],
        laundryLoadsPerWeek: [2, 3],
        clothingItemsPerMonth: [1, 3],
      },
    },
  },
  {
    uid: 'demo-user-low',
    displayName: 'Emma Eco',
    email: 'emma.eco@rootly.green',
    carbonScore: 92,
    weeklyGoalKg: 35,
    description: 'Low emissions profile. Walks, cycles, or takes trains. Eats a strictly plant-based/vegan diet, uses solar panels and energy-efficient appliances, and lives a low-waste lifestyle.',
    behavior: {
      transport: {
        modes: [
          { mode: 'bike', probability: 0.4, distanceRange: [5, 10] },
          { mode: 'walk', probability: 0.35, distanceRange: [2, 5] },
          { mode: 'train', probability: 0.2, distanceRange: [10, 25] },
          { mode: 'ev', probability: 0.05, distanceRange: [10, 20] },
        ],
        frequencyPerWeek: 12,
      },
      food: {
        meals: [
          { type: 'vegan', probability: 0.8 },
          { type: 'vegetarian', probability: 0.2 },
        ],
      },
      energy: {
        electricityPerWeek: [15, 30], // Solar offset, super low
        naturalGasPerWeek: [0, 15],  // Minimizes heating gas
        acHoursPerDay: [0, 0],       // Avoids AC usage, uses natural ventilation
      },
      lifestyle: {
        streamingHoursPerDay: [0.5, 2],
        showerMinutesPerDay: [4, 6],   // Quick eco-showers
        laundryLoadsPerWeek: [1, 1],   // High-efficiency, cold loads
        clothingItemsPerMonth: [0, 1], // Thrifting / slow fashion only
      },
    },
  },
]
