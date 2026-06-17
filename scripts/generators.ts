import { Timestamp } from 'firebase-admin/firestore'
import { personas, PersonaConfig } from './personas'
import { EMISSION_FACTORS } from '../src/lib/constants'
import type { Activity, VoiceLog, ActivityCategory } from '../src/types/activity'
import type { Goal, WeeklyReport, Recommendation as ReportRecommendation } from '../src/types/report'
import type { Recommendation, ExplainableRecommendation } from '../src/types/recommendation'
import type { ChatMessage, Conversation } from '../src/types/chat'
import type { RouteComparison, RouteOption } from '../src/types/route'

// Inline Helper to calculate carbon score to avoid importing Client utils which might depend on browser env
export function calculateCarbonScore(weeklyEmissionsKg: number): number {
  const PERFECT = 46
  const MAX = 300
  if (weeklyEmissionsKg <= PERFECT) return 100
  if (weeklyEmissionsKg >= MAX) return 0
  return Math.round(100 - ((weeklyEmissionsKg - PERFECT) / (MAX - PERFECT)) * 100)
}

// Helper to get random number in range
function randomInRange(min: number, max: number): number {
  return Math.random() * (max - min) + min
}

// Helper to get random item from weighted choices
function pickWeighted<T>(choices: { item: T; weight: number }[]): T {
  const totalWeight = choices.reduce((sum, c) => sum + c.weight, 0)
  let random = Math.random() * totalWeight
  for (const choice of choices) {
    random -= choice.weight
    if (random <= 0) {
      return choice.item
    }
  }
  return choices[choices.length - 1].item
}

// Format ID helper
function seedId(type: string, userId: string, index: number | string): string {
  return `seed-${type}-${userId}-${index}`
}

/**
 * GENERATOR: Activities
 * Generates 60 days of daily historical activities based on persona behavioral profiles.
 */
export function generateActivities(persona: PersonaConfig, numDays = 60): Activity[] {
  const activities: Activity[] = []
  const now = new Date()
  
  for (let i = numDays; i >= 0; i--) {
    const currentDate = new Date(now)
    currentDate.setDate(now.getDate() - i)
    
    // 1. Food: 3 meals a day
    const mealWeights = persona.behavior.food.meals.map(m => ({ item: m.type, weight: m.probability }))
    
    // Breakfast
    const bType = pickWeighted(mealWeights)
    const bTime = new Date(currentDate)
    bTime.setHours(7 + Math.floor(randomInRange(0, 2)), Math.floor(randomInRange(0, 60)), 0, 0)
    let bEmission = 0.5
    if (bType === 'red_meat') bEmission = EMISSION_FACTORS.food.meat_heavy_meal
    else if (bType === 'chicken') bEmission = EMISSION_FACTORS.food.mixed_meal
    else if (bType === 'vegetarian') bEmission = EMISSION_FACTORS.food.plant_based_meal
    else if (bType === 'vegan') bEmission = EMISSION_FACTORS.food.vegan_meal
    
    activities.push({
      id: seedId('activity-food-b', persona.uid, `${i}`),
      userId: persona.uid,
      category: 'food',
      activity: bType,
      quantity: 1,
      emission: parseFloat(bEmission.toFixed(2)),
      description: `Breakfast: ${bType.replace('_', ' ')} meal`,
      timestamp: Timestamp.fromDate(bTime) as any,
      createdAt: Timestamp.fromDate(bTime) as any,
      source: 'manual'
    })

    // Lunch
    const lType = pickWeighted(mealWeights)
    const lTime = new Date(currentDate)
    lTime.setHours(12 + Math.floor(randomInRange(0, 2)), Math.floor(randomInRange(0, 60)), 0, 0)
    let lEmission = 0.8
    if (lType === 'red_meat') lEmission = EMISSION_FACTORS.food.meat_heavy_meal
    else if (lType === 'chicken') lEmission = EMISSION_FACTORS.food.mixed_meal
    else if (lType === 'vegetarian') lEmission = EMISSION_FACTORS.food.plant_based_meal
    else if (lType === 'vegan') lEmission = EMISSION_FACTORS.food.vegan_meal

    activities.push({
      id: seedId('activity-food-l', persona.uid, `${i}`),
      userId: persona.uid,
      category: 'food',
      activity: lType,
      quantity: 1,
      emission: parseFloat(lEmission.toFixed(2)),
      description: `Lunch: ${lType.replace('_', ' ')} meal`,
      timestamp: Timestamp.fromDate(lTime) as any,
      createdAt: Timestamp.fromDate(lTime) as any,
      source: 'manual'
    })

    // Dinner
    const dType = pickWeighted(mealWeights)
    const dTime = new Date(currentDate)
    dTime.setHours(18 + Math.floor(randomInRange(0, 3)), Math.floor(randomInRange(0, 60)), 0, 0)
    let dEmission = 1.0
    if (dType === 'red_meat') dEmission = EMISSION_FACTORS.food.meat_heavy_meal
    else if (dType === 'chicken') dEmission = EMISSION_FACTORS.food.mixed_meal
    else if (dType === 'vegetarian') dEmission = EMISSION_FACTORS.food.plant_based_meal
    else if (dType === 'vegan') dEmission = EMISSION_FACTORS.food.vegan_meal

    activities.push({
      id: seedId('activity-food-d', persona.uid, `${i}`),
      userId: persona.uid,
      category: 'food',
      activity: dType,
      quantity: 1,
      emission: parseFloat(dEmission.toFixed(2)),
      description: `Dinner: ${dType.replace('_', ' ')} meal`,
      timestamp: Timestamp.fromDate(dTime) as any,
      createdAt: Timestamp.fromDate(dTime) as any,
      source: 'manual'
    })

    // 2. Commute: Weekdays (Mon-Fri) only
    const dayOfWeek = currentDate.getDay()
    const isWeekday = dayOfWeek >= 1 && dayOfWeek <= 5
    if (isWeekday) {
      const commuteWeights = persona.behavior.transport.modes.map(m => ({ item: m, weight: m.probability }))
      
      // Morning commute
      const cMode = pickWeighted(commuteWeights)
      const cDist = randomInRange(cMode.distanceRange[0], cMode.distanceRange[1])
      let cFactor = 0.1
      if (cMode.mode === 'car') {
        cFactor = persona.uid === 'demo-user-high' ? EMISSION_FACTORS.transport.car_petrol_per_km : EMISSION_FACTORS.transport.car_diesel_per_km
      } else if (cMode.mode === 'ev') {
        cFactor = EMISSION_FACTORS.transport.car_ev_per_km
      } else if (cMode.mode === 'bus') {
        cFactor = EMISSION_FACTORS.transport.bus_per_km
      } else if (cMode.mode === 'train') {
        cFactor = EMISSION_FACTORS.transport.train_per_km
      } else if (cMode.mode === 'bike' || cMode.mode === 'walk') {
        cFactor = 0
      }
      
      const commuteEmission = cDist * cFactor
      const cTimeMorning = new Date(currentDate)
      cTimeMorning.setHours(8, Math.floor(randomInRange(0, 45)), 0, 0)

      activities.push({
        id: seedId('activity-trans-m', persona.uid, `${i}`),
        userId: persona.uid,
        category: 'transport',
        activity: cMode.mode,
        quantity: parseFloat(cDist.toFixed(1)),
        emission: parseFloat(commuteEmission.toFixed(2)),
        description: `Morning commute to work via ${cMode.mode}`,
        timestamp: Timestamp.fromDate(cTimeMorning) as any,
        createdAt: Timestamp.fromDate(cTimeMorning) as any,
        source: 'manual'
      })

      // Evening commute
      const cTimeEvening = new Date(currentDate)
      cTimeEvening.setHours(17, Math.floor(randomInRange(15, 60)), 0, 0)
      activities.push({
        id: seedId('activity-trans-e', persona.uid, `${i}`),
        userId: persona.uid,
        category: 'transport',
        activity: cMode.mode,
        quantity: parseFloat(cDist.toFixed(1)),
        emission: parseFloat(commuteEmission.toFixed(2)),
        description: `Evening commute from work via ${cMode.mode}`,
        timestamp: Timestamp.fromDate(cTimeEvening) as any,
        createdAt: Timestamp.fromDate(cTimeEvening) as any,
        source: 'manual'
      })
    }

    // 3. Energy: Electricity & Gas (logged daily for granularity)
    const elecQty = randomInRange(persona.behavior.energy.electricityPerWeek[0], persona.behavior.energy.electricityPerWeek[1]) / 7
    const gasQty = randomInRange(persona.behavior.energy.naturalGasPerWeek[0], persona.behavior.energy.naturalGasPerWeek[1]) / 7
    const elecEmission = elecQty * (persona.uid === 'demo-user-low' ? EMISSION_FACTORS.energy.renewable_per_kwh : EMISSION_FACTORS.energy.electricity_per_kwh)
    const gasEmission = gasQty * EMISSION_FACTORS.energy.natural_gas_per_kwh

    const energyTime = new Date(currentDate)
    energyTime.setHours(21, 0, 0, 0)

    activities.push({
      id: seedId('activity-energy-elec', persona.uid, `${i}`),
      userId: persona.uid,
      category: 'energy',
      activity: 'electricity',
      quantity: parseFloat(elecQty.toFixed(2)),
      emission: parseFloat(elecEmission.toFixed(2)),
      description: `Daily household electricity usage`,
      timestamp: Timestamp.fromDate(energyTime) as any,
      createdAt: Timestamp.fromDate(energyTime) as any,
      source: 'ai'
    })

    if (gasQty > 0) {
      activities.push({
        id: seedId('activity-energy-gas', persona.uid, `${i}`),
        userId: persona.uid,
        category: 'energy',
        activity: 'natural_gas',
        quantity: parseFloat(gasQty.toFixed(2)),
        emission: parseFloat(gasEmission.toFixed(2)),
        description: `Daily household heating/gas usage`,
        timestamp: Timestamp.fromDate(energyTime) as any,
        createdAt: Timestamp.fromDate(energyTime) as any,
        source: 'ai'
      })
    }

    // 4. Lifestyle: Shower, Streaming, Laundry, AC, Clothes
    // Daily shower
    const showerMins = randomInRange(persona.behavior.lifestyle.showerMinutesPerDay[0], persona.behavior.lifestyle.showerMinutesPerDay[1])
    const showerEmission = showerMins * (EMISSION_FACTORS.lifestyle.shower_10min / 10)
    const showerTime = new Date(currentDate)
    showerTime.setHours(7, 0, 0, 0)

    activities.push({
      id: seedId('activity-life-shower', persona.uid, `${i}`),
      userId: persona.uid,
      category: 'lifestyle',
      activity: 'shower',
      quantity: parseFloat(showerMins.toFixed(0)),
      emission: parseFloat(showerEmission.toFixed(2)),
      description: `${Math.round(showerMins)} minute shower`,
      timestamp: Timestamp.fromDate(showerTime) as any,
      createdAt: Timestamp.fromDate(showerTime) as any,
      source: 'manual'
    })

    // Daily streaming
    const streamHours = randomInRange(persona.behavior.lifestyle.streamingHoursPerDay[0], persona.behavior.lifestyle.streamingHoursPerDay[1])
    const streamEmission = streamHours * EMISSION_FACTORS.lifestyle.streaming_per_hour
    const streamTime = new Date(currentDate)
    streamTime.setHours(20, 30, 0, 0)

    activities.push({
      id: seedId('activity-life-stream', persona.uid, `${i}`),
      userId: persona.uid,
      category: 'lifestyle',
      activity: 'streaming',
      quantity: parseFloat(streamHours.toFixed(1)),
      emission: parseFloat(streamEmission.toFixed(2)),
      description: `Streaming video for ${streamHours.toFixed(1)} hours`,
      timestamp: Timestamp.fromDate(streamTime) as any,
      createdAt: Timestamp.fromDate(streamTime) as any,
      source: 'manual'
    })

    // AC Usage (if persona has AC)
    const acHours = randomInRange(persona.behavior.energy.acHoursPerDay[0], persona.behavior.energy.acHoursPerDay[1])
    if (acHours > 0) {
      const acEmission = acHours * EMISSION_FACTORS.lifestyle.ac_per_hour
      activities.push({
        id: seedId('activity-life-ac', persona.uid, `${i}`),
        userId: persona.uid,
        category: 'lifestyle',
        activity: 'air_conditioning',
        quantity: parseFloat(acHours.toFixed(1)),
        emission: parseFloat(acEmission.toFixed(2)),
        description: `Running air conditioner for ${acHours.toFixed(1)} hours`,
        timestamp: Timestamp.fromDate(streamTime) as any,
        createdAt: Timestamp.fromDate(streamTime) as any,
        source: 'manual'
      })
    }

    // Laundry (weekend logs, e.g. Saturday)
    if (dayOfWeek === 6) {
      const loads = Math.round(randomInRange(persona.behavior.lifestyle.laundryLoadsPerWeek[0], persona.behavior.lifestyle.laundryLoadsPerWeek[1]))
      const laundryEmission = loads * EMISSION_FACTORS.lifestyle.laundry_load
      const laundryTime = new Date(currentDate)
      laundryTime.setHours(10, 0, 0, 0)

      activities.push({
        id: seedId('activity-life-laundry', persona.uid, `${i}`),
        userId: persona.uid,
        category: 'lifestyle',
        activity: 'laundry',
        quantity: loads,
        emission: parseFloat(laundryEmission.toFixed(2)),
        description: `Completed ${loads} laundry loads`,
        timestamp: Timestamp.fromDate(laundryTime) as any,
        createdAt: Timestamp.fromDate(laundryTime) as any,
        source: 'manual'
      })
    }

    // Clothes purchases (e.g. 15th of the month)
    const dayOfMonth = currentDate.getDate()
    if (dayOfMonth === 15) {
      const items = Math.round(randomInRange(persona.behavior.lifestyle.clothingItemsPerMonth[0], persona.behavior.lifestyle.clothingItemsPerMonth[1]))
      if (items > 0) {
        const clothesEmission = items * EMISSION_FACTORS.lifestyle.clothing_item
        const clothesTime = new Date(currentDate)
        clothesTime.setHours(14, 0, 0, 0)

        activities.push({
          id: seedId('activity-life-clothes', persona.uid, `${i}`),
          userId: persona.uid,
          category: 'lifestyle',
          activity: 'clothing',
          quantity: items,
          emission: parseFloat(clothesEmission.toFixed(2)),
          description: `Purchased ${items} new clothing items`,
          timestamp: Timestamp.fromDate(clothesTime) as any,
          createdAt: Timestamp.fromDate(clothesTime) as any,
          source: 'manual'
        })
      }
    }
  }

  return activities
}

/**
 * GENERATOR: Goals
 * Generates realistic sustainability goals tailored to each persona.
 */
export function generateGoals(userId: string): Goal[] {
  const now = new Date()
  const oneMonthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
  const oneMonthHence = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000)

  if (userId === 'demo-user-high') {
    return [
      {
        id: seedId('goal', userId, '1'),
        userId,
        title: 'Switch Commute to Electric Train',
        description: 'Take the local commuter train instead of driving the SUV to work to dramatically slash transport carbon output.',
        category: 'transport',
        targetReductionKg: 120,
        currentProgressKg: 15.5,
        deadline: Timestamp.fromDate(oneMonthHence) as any,
        status: 'active',
        createdAt: Timestamp.fromDate(oneMonthAgo) as any,
        updatedAt: Timestamp.fromDate(now) as any,
      },
      {
        id: seedId('goal', userId, '2'),
        userId,
        title: 'Meat-free Weekdays',
        description: 'Eliminate beef, pork, and chicken meals from Monday to Friday, opting for plant-based dishes.',
        category: 'food',
        targetReductionKg: 75,
        currentProgressKg: 5.4,
        deadline: Timestamp.fromDate(new Date(now.getTime() + 15 * 24 * 60 * 60 * 1000)) as any,
        status: 'active',
        createdAt: Timestamp.fromDate(oneMonthAgo) as any,
        updatedAt: Timestamp.fromDate(now) as any,
      },
      {
        id: seedId('goal', userId, '3'),
        userId,
        title: 'Upgrade Heating System',
        description: 'Transition home heating natural gas usage downwards by installing a high-efficiency smart thermostat.',
        category: 'energy',
        targetReductionKg: 50,
        currentProgressKg: 50,
        deadline: Timestamp.fromDate(new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000)) as any,
        status: 'completed',
        createdAt: Timestamp.fromDate(oneMonthAgo) as any,
        updatedAt: Timestamp.fromDate(new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000)) as any,
      }
    ]
  }

  if (userId === 'demo-user-average') {
    return [
      {
        id: seedId('goal', userId, '1'),
        userId,
        title: 'Limit Driving to 2 Days/Week',
        description: 'Use the bus or train for commutes, saving driving for groceries or rainy days.',
        category: 'transport',
        targetReductionKg: 60,
        currentProgressKg: 42.0,
        deadline: Timestamp.fromDate(oneMonthHence) as any,
        status: 'active',
        createdAt: Timestamp.fromDate(oneMonthAgo) as any,
        updatedAt: Timestamp.fromDate(now) as any,
      },
      {
        id: seedId('goal', userId, '2'),
        userId,
        title: 'Vegan Lunch Challenge',
        description: 'Swap out daily chicken or dairy lunch meals for 100% plant-based food items.',
        category: 'food',
        targetReductionKg: 30,
        currentProgressKg: 30,
        deadline: Timestamp.fromDate(new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000)) as any,
        status: 'completed',
        createdAt: Timestamp.fromDate(oneMonthAgo) as any,
        updatedAt: Timestamp.fromDate(new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000)) as any,
      },
      {
        id: seedId('goal', userId, '3'),
        userId,
        title: 'Reduce Shower Time to 5 Minutes',
        description: 'Cut daily hot shower times in half to save water heating energy.',
        category: 'lifestyle',
        targetReductionKg: 10,
        currentProgressKg: 4.5,
        deadline: Timestamp.fromDate(new Date(now.getTime() + 10 * 24 * 60 * 60 * 1000)) as any,
        status: 'active',
        createdAt: Timestamp.fromDate(oneMonthAgo) as any,
        updatedAt: Timestamp.fromDate(now) as any,
      }
    ]
  }

  // Emma Eco (Low Emissions)
  return [
    {
      id: seedId('goal', userId, '1'),
      userId,
      title: 'Zero Waste Grocery Shopping',
      description: 'Avoid single-use plastic, buy in bulk, and compost 100% of organic waste.',
      category: 'lifestyle',
      targetReductionKg: 12,
      currentProgressKg: 12,
      deadline: Timestamp.fromDate(new Date(now.getTime() - 10 * 24 * 60 * 60 * 1000)) as any,
      status: 'completed',
      createdAt: Timestamp.fromDate(oneMonthAgo) as any,
      updatedAt: Timestamp.fromDate(new Date(now.getTime() - 10 * 24 * 60 * 60 * 1000)) as any,
    },
    {
      id: seedId('goal', userId, '2'),
      userId,
      title: 'Minimize Streaming Consumption',
      description: 'Swap high-definition video streaming hours for reading, hiking, and audio listening.',
      category: 'lifestyle',
      targetReductionKg: 5,
      currentProgressKg: 4.2,
      deadline: Timestamp.fromDate(oneMonthHence) as any,
      status: 'active',
      createdAt: Timestamp.fromDate(oneMonthAgo) as any,
      updatedAt: Timestamp.fromDate(now) as any,
    },
    {
      id: seedId('goal', userId, '3'),
      userId,
      title: 'Offset 100% Home Energy',
      description: 'Switch home electrical grid consumption entirely to community-backed solar/wind shares.',
      category: 'energy',
      targetReductionKg: 15,
      currentProgressKg: 11.5,
      deadline: Timestamp.fromDate(new Date(now.getTime() + 20 * 24 * 60 * 60 * 1000)) as any,
      status: 'active',
      createdAt: Timestamp.fromDate(oneMonthAgo) as any,
      updatedAt: Timestamp.fromDate(now) as any,
    }
  ]
}

// Helper to safely convert different Firestore Timestamp types to standard Date objects
function toDate(t: any): Date {
  if (t && typeof t.toDate === 'function') {
    return t.toDate()
  }
  if (t && typeof t.toMillis === 'function') {
    return new Date(t.toMillis())
  }
  return new Date(t)
}

/**
 * GENERATOR: Weekly Reports
 * Groups generated activities by week and creates mathematically-consistent weekly reports.
 */
export function generateWeeklyReports(userId: string, activities: Activity[], weeklyGoal: number): WeeklyReport[] {
  const reports: WeeklyReport[] = []
  
  // Sort activities chronologically to facilitate calculations
  const sortedActivities = [...activities].sort((a, b) => {
    return toDate(a.timestamp).getTime() - toDate(b.timestamp).getTime()
  })

  if (sortedActivities.length === 0) return []

  const firstDate = toDate(sortedActivities[0].timestamp)
  const lastDate = toDate(sortedActivities[sortedActivities.length - 1].timestamp)

  // Find Mondays for the weeks
  const getMon = (d: Date) => {
    const temp = new Date(d)
    const day = temp.getDay()
    const diff = temp.getDate() - day + (day === 0 ? -6 : 1)
    temp.setDate(diff)
    temp.setHours(0, 0, 0, 0)
    return temp
  }

  const startMonday = getMon(firstDate)
  const endMonday = getMon(lastDate)

  let prevScore = userId === 'demo-user-high' ? 38 : (userId === 'demo-user-average' ? 62 : 90)
  let reportIndex = 1

  for (let m = new Date(startMonday); m <= endMonday; m.setDate(m.getDate() + 7)) {
    const wStart = new Date(m)
    const wEnd = new Date(m)
    wEnd.setDate(wStart.getDate() + 6)
    wEnd.setHours(23, 59, 59, 999)

    // Filter activities in this week
    const weekActs = sortedActivities.filter(a => {
      const t = toDate(a.timestamp)
      return t >= wStart && t <= wEnd
    })

    if (weekActs.length === 0) continue

    const totalEmissionsKg = parseFloat(weekActs.reduce((sum, a) => sum + a.emission, 0).toFixed(2))
    
    // Group categories
    const catTotals: Record<string, number> = {}
    for (const a of weekActs) {
      catTotals[a.category] = (catTotals[a.category] ?? 0) + a.emission
    }

    const topContributors = Object.entries(catTotals)
      .map(([category, emissionsKg]) => ({
        category,
        emissionsKg: parseFloat(emissionsKg.toFixed(2)),
        percentage: totalEmissionsKg > 0 ? Math.round((emissionsKg / totalEmissionsKg) * 100) : 0
      }))
      .sort((a, b) => b.emissionsKg - a.emissionsKg)

    const rawScore = calculateCarbonScore(totalEmissionsKg)
    const scoreDelta = rawScore - prevScore
    const trend = scoreDelta > 2 ? 'improving' : (scoreDelta < -2 ? 'worsening' : 'stable')

    let narrative = ''
    let recs: ReportRecommendation[] = []
    
    if (userId === 'demo-user-high') {
      narrative = `Your emissions are high at ${totalEmissionsKg.toFixed(1)} kg CO2e, primarily driven by daily driving in your petrol SUV and heavy consumption of meat and gas-powered heating. Making transit alterations can save significant carbon.`
      recs = [
        {
          id: seedId('rep-rec', userId, `${reportIndex}-1`),
          title: 'Switch Commute to Electric Train',
          description: 'Taking the train just 3 days a week instead of driving would slash weekly emissions by over 25 kg CO2e.',
          potentialSavingsKg: 28.5,
          priority: 'high',
          category: 'transport',
          estimatedEffort: 'medium',
          timeToImpact: 'Immediate'
        },
        {
          id: seedId('rep-rec', userId, `${reportIndex}-2`),
          title: 'Lower Natural Gas Usage',
          description: 'Lower heating thresholds at night by 2°C to reduce natural gas heating footprint.',
          potentialSavingsKg: 8.4,
          priority: 'medium',
          category: 'energy',
          estimatedEffort: 'easy',
          timeToImpact: '1 week'
        }
      ]
    } else if (userId === 'demo-user-average') {
      narrative = `You had an average week of ${totalEmissionsKg.toFixed(1)} kg CO2e. Food and transport represent your largest components. Good job maintaining a stable score, but there is room for optimization.`
      recs = [
        {
          id: seedId('rep-rec', userId, `${reportIndex}-1`),
          title: 'Replace Red Meat with Chicken',
          description: 'Swapping beef/pork meals for chicken or plant-based proteins saves massive agriculture impact.',
          potentialSavingsKg: 15.2,
          priority: 'high',
          category: 'food',
          estimatedEffort: 'easy',
          timeToImpact: 'Immediate'
        },
        {
          id: seedId('rep-rec', userId, `${reportIndex}-2`),
          title: 'Eco Laundry Settings',
          description: 'Wash clothes at 30°C and air dry instead of using the electric dryer.',
          potentialSavingsKg: 4.8,
          priority: 'low',
          category: 'lifestyle',
          estimatedEffort: 'easy',
          timeToImpact: 'Immediate'
        }
      ]
    } else {
      narrative = `Outstanding week! Your carbon footprint is only ${totalEmissionsKg.toFixed(1)} kg CO2e, well below the target of 35 kg. Your vegan diet and active transportation keep your footprint extremely minimal.`
      recs = [
        {
          id: seedId('rep-rec', userId, `${reportIndex}-1`),
          title: 'Support Clean Energy',
          description: 'Review your electricity supplier and verify if your community solar program covers 100% grid overheads.',
          potentialSavingsKg: 2.1,
          priority: 'medium',
          category: 'energy',
          estimatedEffort: 'medium',
          timeToImpact: '1 month'
        }
      ]
    }

    reports.push({
      id: seedId('report', userId, reportIndex),
      userId,
      weekStart: Timestamp.fromDate(wStart) as any,
      weekEnd: Timestamp.fromDate(wEnd) as any,
      totalEmissionsKg,
      carbonScore: rawScore,
      previousScore: prevScore,
      scoreDelta,
      topContributors,
      recommendations: recs,
      trend,
      narrative,
      projectedAnnualKg: parseFloat((totalEmissionsKg * 52).toFixed(1)),
      generatedAt: Timestamp.fromDate(new Date(wEnd.getTime() + 10 * 60 * 1000)) as any,
    })

    prevScore = rawScore
    reportIndex++
  }

  // Reverse so latest is first
  return reports.reverse()
}

/**
 * GENERATOR: Recommendations (Explainable recommendations)
 * Generates structured, auditable XAI recommendation records matching the canonical contract.
 */
export function generateRecommendations(userId: string): Recommendation[] {
  const now = Timestamp.now() as any

  if (userId === 'demo-user-high') {
    return [
      {
        id: seedId('recommendation', userId, '1'),
        userId,
        title: 'Switch Commute to Electric Rail',
        category: 'transport',
        priority: 'high',
        observation: 'Daily SUV petrol travel represents 63% of your carbon footprint, averaging 48.2 kg CO2 weekly.',
        reasoning: 'SUV travel emits 0.192 kg CO2/km. Commuter rail emits only 0.041 kg CO2/km—an 78.6% reduction in per-km emissions.',
        recommendation: 'Transition 3 days of SUV travel to the commuter train. Use the train for your 50 km round-trip commute.',
        estimatedImpact: 'Reduces weekly emissions by 22.7 kg CO2, yielding a 15% overall footprint reduction.',
        potentialSavingsKg: 22.7,
        easeOfImplementation: 5,
        userRelevance: 9,
        historicalBehaviorScore: 8,
        rankingScore: 8.5,
        confidenceScore: 0.95,
        explanation: 'Prioritized due to transport dominating user emissions and the presence of direct rail options.',
        calculationDetails: 'Savings = (50 km * 3 days * 0.192 kg/km SUV) - (50 km * 3 days * 0.041 kg/km rail) = 28.8 - 6.15 = 22.65 kg',
        createdAt: now
      } as any,
      {
        id: seedId('recommendation', userId, '2'),
        userId,
        title: 'Shift Diet to Vegetarian 3 Days a Week',
        category: 'food',
        priority: 'high',
        observation: 'You logged 8 red meat meals this week, accounting for 25.6 kg CO2 emissions.',
        reasoning: 'Beef/lamb average 3.2 kg CO2 per meal. Vegetarian alternatives average 0.5 kg CO2 per meal, which represents an 84% reduction.',
        recommendation: 'Replace red meat meals with plant-based alternatives on Mondays, Wednesdays, and Fridays.',
        estimatedImpact: 'Reduces dietary emissions by 8.1 kg CO2 weekly.',
        potentialSavingsKg: 8.1,
        easeOfImplementation: 7,
        userRelevance: 8,
        historicalBehaviorScore: 6,
        rankingScore: 7.8,
        confidenceScore: 0.90,
        explanation: 'High priority due to meat being a major controllable contributor and easy food transitions.',
        calculationDetails: 'Savings = 3 meals * (3.2 kg/meal red meat - 0.5 kg/meal vegetarian) = 8.1 kg',
        createdAt: now
      } as any
    ]
  }

  if (userId === 'demo-user-average') {
    return [
      {
        id: seedId('recommendation', userId, '1'),
        userId,
        title: 'Adjust Smart Thermostat Settings',
        category: 'energy',
        priority: 'medium',
        observation: 'Home heating natural gas accounts for 24% of your weekly footprint, logging 55 kWh average energy usage.',
        reasoning: 'Lowering thermostat settings by 1°C reduces heating energy consumption by approximately 8%.',
        recommendation: 'Program your thermostat to 19°C during active hours and 17°C during sleep times.',
        estimatedImpact: 'Saves 4.4 kWh of gas daily, reducing weekly emissions by 6.2 kg CO2.',
        potentialSavingsKg: 6.2,
        easeOfImplementation: 9,
        userRelevance: 8,
        historicalBehaviorScore: 9,
        rankingScore: 8.2,
        confidenceScore: 0.92,
        explanation: 'Optimized as high-ease, high-relevance improvement for home utility management.',
        calculationDetails: 'Savings = 55 kWh * 8% reduction * 7 days * 0.202 kg/kWh gas = 6.22 kg',
        createdAt: now
      } as any,
      {
        id: seedId('recommendation', userId, '2'),
        userId,
        title: 'Eco-Friendly Laundry Wash Cycles',
        category: 'lifestyle',
        priority: 'low',
        observation: 'You logged 4 loads of laundry washed with hot water and dried via electric dryer.',
        reasoning: 'Cold washes save 90% of washing machine electricity. Line drying saves 100% of tumble dryer consumption (0.6 kg CO2/load).',
        recommendation: 'Transition to washing laundry in cold water (30°C or below) and hang clothes to dry on laundry days.',
        estimatedImpact: 'Reduces household carbon footprint by 2.4 kg CO2 weekly.',
        potentialSavingsKg: 2.4,
        easeOfImplementation: 8,
        userRelevance: 7,
        historicalBehaviorScore: 8,
        rankingScore: 7.2,
        confidenceScore: 0.88,
        explanation: 'Low priority but recommended for continuous micro-savings in household routine.',
        calculationDetails: 'Savings = 4 loads * 0.6 kg/load savings = 2.4 kg',
        createdAt: now
      } as any
    ]
  }

  // Emma Eco (Low emissions)
  return [
    {
      id: seedId('recommendation', userId, '1'),
      userId,
      title: 'Review Solar Power Grid Ingestion',
      category: 'energy',
      priority: 'medium',
      observation: 'Your household energy footprints are minimal (under 5 kg CO2 weekly), but peak winter heating increases grid reliance.',
      reasoning: 'Maximizing community solar subscriptions covers peak grid overheads during reduced winter sun cycles.',
      recommendation: 'Check community solar share updates and increase your offset coverage to 110% to account for winter grid spikes.',
      estimatedImpact: 'Completely offsets peak household grid emissions, saving 1.8 kg CO2 weekly in winter months.',
      potentialSavingsKg: 1.8,
      easeOfImplementation: 6,
      userRelevance: 9,
      historicalBehaviorScore: 10,
      rankingScore: 7.6,
      confidenceScore: 0.96,
      explanation: 'Targeted to close the remaining gap in an already low-carbon profile.',
      calculationDetails: 'Savings = 12 kWh peak grid reliance * 0.233 kg/kWh UK grid = 2.79 kg offset potential',
      createdAt: now
    } as any
  ]
}

/**
 * GENERATOR: Chat History
 * Generates structured, schema-compliant chat sessions including conversations and messages.
 */
export function generateChatHistory(userId: string): { conversations: Conversation[]; messages: Record<string, ChatMessage[]> } {
  const now = new Date()
  const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
  const twoWeeksAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000)

  const c1Id = seedId('conversation', userId, '1')
  const c2Id = seedId('conversation', userId, '2')

  const conversations: Conversation[] = [
    {
      id: c1Id,
      userId,
      title: userId === 'demo-user-high' ? 'Commute Footprint Optimization' : (userId === 'demo-user-average' ? 'Home Utility Savings' : 'Zero Waste Inquiries'),
      createdAt: Timestamp.fromDate(twoWeeksAgo) as any,
      updatedAt: Timestamp.fromDate(twoWeeksAgo) as any,
      messageCount: 2
    },
    {
      id: c2Id,
      userId,
      title: userId === 'demo-user-high' ? 'Meat and Dietary Emissions' : (userId === 'demo-user-average' ? 'Eco-Friendly Commuting' : 'Lifestyle Carbon Removal'),
      createdAt: Timestamp.fromDate(oneWeekAgo) as any,
      updatedAt: Timestamp.fromDate(oneWeekAgo) as any,
      messageCount: 2
    }
  ]

  const messages: Record<string, ChatMessage[]> = {}

  if (userId === 'demo-user-high') {
    messages[c1Id] = [
      {
        id: seedId('message', userId, '1-1'),
        conversationId: c1Id,
        role: 'user',
        content: 'I drive an SUV fifty kilometers daily to get to my workplace. How bad is this for the environment, and what can I do?',
        timestamp: Timestamp.fromDate(twoWeeksAgo) as any
      },
      {
        id: seedId('message', userId, '1-2'),
        conversationId: c1Id,
        role: 'assistant',
        content: 'Driving a petrol SUV for 50 km daily emits approximately 9.6 kg of CO2e per day (almost 50 kg per work week). This is the largest source of carbon in your profile. If you switch to the commuter rail, your daily commute emissions will fall to just 2.05 kg CO2e, saving you over 37 kg of CO2e every week. This change alone would increase your Carbon Score significantly.',
        timestamp: Timestamp.fromDate(new Date(twoWeeksAgo.getTime() + 10 * 1000)) as any,
        metadata: {
          recommendations: [seedId('recommendation', userId, '1')],
          emissionsContext: {
            weeklyTotal: 110,
            weeklyGoal: 150,
            topCategories: [
              { category: 'transport', percentage: 63 },
              { category: 'food', percentage: 22 },
              { category: 'energy', percentage: 11 },
              { category: 'lifestyle', percentage: 4 }
            ],
            trend: 'stable'
          },
          suggestedActions: [
            {
              title: 'Take Commuter Train',
              description: 'Switch commute to commuter rail for 50km round trip.',
              potentialSavingsKg: 37.7,
              priority: 'high'
            }
          ],
          xpiExplanation: {
            observation: 'SUV travel represents 63% of your weekly carbon footprint.',
            reasoning: 'SUV travel emits 0.192 kg CO2/km, while commuter rail emits only 0.041 kg CO2/km.',
            recommendation: 'Transition to the commuter rail for your 50 km daily work commutes.',
            impact: 'Saves 37.7 kg CO2 weekly, equivalent to a 34% transport reduction.',
            confidence: 0.95,
            priority: 'high',
            title: 'Commuter Train Commute',
            category: 'transport',
            potentialSavingsKg: 37.7,
            explanation: 'Highly prioritized because transport is your primary emission source and direct commuter rail service is available.',
            calculationDetails: 'Savings = (50 km * 5 days * 0.192 kg/km SUV) - (50 km * 5 days * 0.041 kg/km rail) = 48 - 10.25 = 37.75 kg',
            rankingScore: 8.5,
            generatedAt: twoWeeksAgo.toISOString()
          }
        }
      }
    ]

    messages[c2Id] = [
      {
        id: seedId('message', userId, '2-1'),
        conversationId: c2Id,
        role: 'user',
        content: 'I eat red meat almost every day. Does it make that big of a difference to switch to chicken or vegetarian food?',
        timestamp: Timestamp.fromDate(oneWeekAgo) as any
      },
      {
        id: seedId('message', userId, '2-2'),
        conversationId: c2Id,
        role: 'assistant',
        content: 'Yes, it makes an enormous difference. Red meat (beef, lamb) has a carbon footprint of about 3.2 kg CO2e per meal due to agricultural resources and methane. Chicken drops that to 1.5 kg CO2e (a 53% reduction), and plant-based meals drop it to just 0.5 kg CO2e (an 84% reduction). If you swap red meat for vegetarian options just 3 times a week, you will save 8.1 kg of carbon weekly.',
        timestamp: Timestamp.fromDate(new Date(oneWeekAgo.getTime() + 10 * 1000)) as any,
        metadata: {
          recommendations: [seedId('recommendation', userId, '2')],
          suggestedActions: [
            {
              title: 'Vegetarian Dinner Days',
              description: 'Replace beef/pork dinners with vegetarian recipes on Monday, Wednesday, and Friday.',
              potentialSavingsKg: 8.1,
              priority: 'high'
            }
          ],
          xpiExplanation: {
            observation: 'Logging daily red meat meals adds 22.4 kg CO2 weekly to your footprint.',
            reasoning: 'Red meat has 3.2 kg CO2 per meal, compared to vegetarian meals which emit only 0.5 kg CO2.',
            recommendation: 'Replace red meat meals with plant-based/veg dishes on Mon/Wed/Fri.',
            impact: 'Saves 8.1 kg CO2 weekly, equivalent to a 36% food carbon reduction.',
            confidence: 0.90,
            priority: 'high',
            title: 'Shift Diet to Vegetarian 3 Days a Week',
            category: 'food',
            potentialSavingsKg: 8.1,
            explanation: 'High priority because meat diet is a high-yield, low-cost reduction vector.',
            calculationDetails: 'Savings = 3 meals * (3.2 kg/meal beef - 0.5 kg/meal vegetarian) = 8.1 kg',
            rankingScore: 7.8,
            generatedAt: oneWeekAgo.toISOString()
          }
        }
      }
    ]
  } else if (userId === 'demo-user-average') {
    messages[c1Id] = [
      {
        id: seedId('message', userId, '1-1'),
        conversationId: c1Id,
        role: 'user',
        content: 'How can I save carbon on electricity and heating at home?',
        timestamp: Timestamp.fromDate(twoWeeksAgo) as any
      },
      {
        id: seedId('message', userId, '1-2'),
        conversationId: c1Id,
        role: 'assistant',
        content: 'Home utilities account for a substantial portion of your carbon footprint (roughly 45%). Two highly effective steps are: 1) Adjusting your thermostat down by 1°C, which can save 8% of your heating energy (reducing weekly emissions by 6.2 kg CO2). 2) Washing your laundry loads on a cold setting and line drying them, which cuts tumble-dryer and heating electricity, saving 2.4 kg CO2 weekly.',
        timestamp: Timestamp.fromDate(new Date(twoWeeksAgo.getTime() + 10 * 1000)) as any,
        metadata: {
          recommendations: [seedId('recommendation', userId, '1')],
          suggestedActions: [
            {
              title: 'Lower Thermostat 1°C',
              description: 'Set smart thermostat temperatures to 19°C day and 17°C night.',
              potentialSavingsKg: 6.2,
              priority: 'medium'
            }
          ]
        }
      }
    ]

    messages[c2Id] = [
      {
        id: seedId('message', userId, '2-1'),
        conversationId: c2Id,
        role: 'user',
        content: 'I currently drive to work three days a week. What happens if I commute via train or bus instead?',
        timestamp: Timestamp.fromDate(oneWeekAgo) as any
      },
      {
        id: seedId('message', userId, '2-2'),
        conversationId: c2Id,
        role: 'assistant',
        content: 'Your driving commute emits 0.171 kg CO2/km in your diesel car. Taking the bus (0.089 kg CO2/km) cuts this in half, and taking the commuter train (0.041 kg CO2/km) slashes it by 76%. If you swap just 2 of your driving days for train rides, you will save 7.8 kg CO2 every week.',
        timestamp: Timestamp.fromDate(new Date(oneWeekAgo.getTime() + 10 * 1000)) as any
      }
    ]
  } else {
    // Emma Eco (Low emissions)
    messages[c1Id] = [
      {
        id: seedId('message', userId, '1-1'),
        conversationId: c1Id,
        role: 'user',
        content: 'I already eat vegan and cycle everywhere. Are there other ways to optimize my carbon footprint?',
        timestamp: Timestamp.fromDate(twoWeeksAgo) as any
      },
      {
        id: seedId('message', userId, '1-2'),
        conversationId: c1Id,
        role: 'assistant',
        content: 'Your current footprint is exemplary, scoring 92! Since your food and transport emissions are nearly zero, the remaining areas are utility grid overheads and indirect consumption. You can review your electrical energy provider and invest in community solar shares to cover peak grid reliance in winter, saving an additional 1.8 kg CO2 weekly.',
        timestamp: Timestamp.fromDate(new Date(twoWeeksAgo.getTime() + 10 * 1000)) as any,
        metadata: {
          recommendations: [seedId('recommendation', userId, '1')],
          suggestedActions: [
            {
              title: 'Increase Solar Offset',
              description: 'Subscribe to additional community solar shares to cover grid overhead.',
              potentialSavingsKg: 1.8,
              priority: 'medium'
            }
          ]
        }
      }
    ]

    messages[c2Id] = [
      {
        id: seedId('message', userId, '2-1'),
        conversationId: c2Id,
        role: 'user',
        content: 'What does Rootly project my annual emissions to be?',
        timestamp: Timestamp.fromDate(oneWeekAgo) as any
      },
      {
        id: seedId('message', userId, '2-2'),
        conversationId: c2Id,
        role: 'assistant',
        content: 'Based on your weekly average of ~14 kg CO2, your projected annual footprint is approximately 728 kg CO2. For comparison, the average European emits 7,800 kg annually. Your low-impact lifestyle is highly effective at minimizing carbon outputs.',
        timestamp: Timestamp.fromDate(new Date(oneWeekAgo.getTime() + 10 * 1000)) as any
      }
    ]
  }

  return { conversations, messages }
}

/**
 * GENERATOR: Route Comparisons
 * Generates plausible transit comparison records containing realistic carbon savings.
 */
export function generateRouteComparisons(userId: string): RouteComparison[] {
  const now = Timestamp.now() as any

  if (userId === 'demo-user-high') {
    return [
      {
        id: seedId('route-comp', userId, '1'),
        userId,
        origin: 'Suburbia West',
        destination: 'Downtown Financial Center',
        distanceKm: 25.0,
        options: [
          { mode: 'car', durationMinutes: 45, distanceKm: 25.0, emissionsKg: 4.8, isRecommended: false },
          { mode: 'train', durationMinutes: 30, distanceKm: 25.0, emissionsKg: 1.03, estimatedCost: 6.50, isRecommended: true, savingsVsCar: 3.77, savingsPercentage: 78.5 },
          { mode: 'bus', durationMinutes: 55, distanceKm: 25.0, emissionsKg: 2.23, estimatedCost: 3.00, isRecommended: false, savingsVsCar: 2.57, savingsPercentage: 53.5 }
        ],
        recommendedMode: 'train',
        totalSavingsKg: 3.77,
        aiReasoning: 'Commuter rail is both faster (30m vs 45m driving) and slashes carbon emissions by 78% compared to single-occupant petrol SUV travel.',
        createdAt: now
      }
    ]
  }

  if (userId === 'demo-user-average') {
    return [
      {
        id: seedId('route-comp', userId, '1'),
        userId,
        origin: 'Greenwood Lane',
        destination: 'Metro Shopping Center',
        distanceKm: 12.0,
        options: [
          { mode: 'car', durationMinutes: 20, distanceKm: 12.0, emissionsKg: 2.05, isRecommended: false },
          { mode: 'bus', durationMinutes: 32, distanceKm: 12.0, emissionsKg: 1.07, estimatedCost: 2.25, isRecommended: true, savingsVsCar: 0.98, savingsPercentage: 47.8 },
          { mode: 'bike', durationMinutes: 45, distanceKm: 12.0, emissionsKg: 0, isRecommended: false, savingsVsCar: 2.05, savingsPercentage: 100 }
        ],
        recommendedMode: 'bus',
        totalSavingsKg: 0.98,
        aiReasoning: 'Taking the regional bus lines cuts commuter emissions in half compared to driving a diesel vehicle, while avoiding the 45-minute cycling exertion.',
        createdAt: now
      }
    ]
  }

  // Emma Eco
  return [
    {
      id: seedId('route-comp', userId, '1'),
      userId,
      origin: 'Eco Village Co-op',
      destination: 'Community Farmer Market',
      distanceKm: 4.5,
      options: [
        { mode: 'walk', durationMinutes: 55, distanceKm: 4.5, emissionsKg: 0, isRecommended: false },
        { mode: 'bike', durationMinutes: 15, distanceKm: 4.5, emissionsKg: 0, isRecommended: true },
        { mode: 'bus', durationMinutes: 12, distanceKm: 4.5, emissionsKg: 0.4, estimatedCost: 1.50, isRecommended: false }
      ],
      recommendedMode: 'bike',
      totalSavingsKg: 0.86, // compared to standard car
      aiReasoning: 'Cycling takes only 15 minutes, has 0 emissions, and provides high physical energy activation benefits.',
      createdAt: now
    }
  ]
}

/**
 * GENERATOR: Voice Logs
 * Generates natural language transcription logs with corresponding activities extracted.
 */
export function generateVoiceLogs(userId: string): VoiceLog[] {
  const now = Timestamp.now() as any
  const yesterday = Timestamp.fromDate(new Date(Date.now() - 24 * 60 * 60 * 1000)) as any

  if (userId === 'demo-user-high') {
    return [
      {
        id: seedId('voice-log', userId, '1'),
        userId,
        transcript: 'I drove my SUV for forty-five kilometers today to visit a client and had a beef burger for lunch at the Diner.',
        extractedActivities: [
          {
            category: 'transport',
            activity: 'car',
            quantity: 45,
            emission: parseFloat((45 * EMISSION_FACTORS.transport.car_petrol_per_km).toFixed(2)),
            description: 'Drove 45 km client visit (car)',
            timestamp: now,
            source: 'voice'
          },
          {
            category: 'food',
            activity: 'red_meat',
            quantity: 1,
            emission: EMISSION_FACTORS.food.meat_heavy_meal,
            description: 'Lunch beef burger (red_meat)',
            timestamp: now,
            source: 'voice'
          }
        ],
        audioLengthSeconds: 12,
        processingStatus: 'complete',
        createdAt: yesterday
      },
      {
        id: seedId('voice-log', userId, '2'),
        userId,
        transcript: 'Ran the air conditioning at home for eight hours today because it was super hot.',
        extractedActivities: [
          {
            category: 'lifestyle',
            activity: 'air_conditioning',
            quantity: 8,
            emission: parseFloat((8 * EMISSION_FACTORS.lifestyle.ac_per_hour).toFixed(2)),
            description: 'Ran AC for 8 hours (air_conditioning)',
            timestamp: now,
            source: 'voice'
          }
        ],
        audioLengthSeconds: 8,
        processingStatus: 'complete',
        createdAt: now
      }
    ]
  }

  if (userId === 'demo-user-average') {
    return [
      {
        id: seedId('voice-log', userId, '1'),
        userId,
        transcript: 'I took the commuter train for twenty-five kilometers and had a chicken wrap for dinner.',
        extractedActivities: [
          {
            category: 'transport',
            activity: 'train',
            quantity: 25,
            emission: parseFloat((25 * EMISSION_FACTORS.transport.train_per_km).toFixed(2)),
            description: 'Took train for 25 km (train)',
            timestamp: now,
            source: 'voice'
          },
          {
            category: 'food',
            activity: 'chicken',
            quantity: 1,
            emission: EMISSION_FACTORS.food.mixed_meal,
            description: 'Dinner chicken wrap (chicken)',
            timestamp: now,
            source: 'voice'
          }
        ],
        audioLengthSeconds: 10,
        processingStatus: 'complete',
        createdAt: yesterday
      }
    ]
  }

  // Emma Eco
  return [
    {
      id: seedId('voice-log', userId, '1'),
      userId,
      transcript: 'I rode my bicycle for eight kilometers to the market and purchased a fresh organic vegan salad.',
      extractedActivities: [
        {
          category: 'transport',
          activity: 'bike',
          quantity: 8,
          emission: 0,
          description: 'Rode bike for 8 km (bike)',
          timestamp: now,
          source: 'voice'
        },
        {
          category: 'food',
          activity: 'vegan',
          quantity: 1,
          emission: EMISSION_FACTORS.food.vegan_meal,
          description: 'Lunch vegan salad (vegan)',
          timestamp: now,
          source: 'voice'
        }
      ],
      audioLengthSeconds: 11,
      processingStatus: 'complete',
      createdAt: now
    }
  ]
}
