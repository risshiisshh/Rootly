import type { CoachContext } from './response.schema'
import type { Recommendation, RecommendationPriority } from '@/types/recommendation'
import { EMISSION_FACTORS } from '@/lib/constants'
import { Timestamp } from 'firebase-admin/firestore'

export class RecommendationEngine {
  generateRecommendations(context: CoachContext): Recommendation[] {
    const activities = context.weeklyActivities.length > 0 
      ? context.weeklyActivities 
      : context.recentActivities

    const totalEmissions = activities.reduce((sum, a) => sum + a.emission, 0)

    const categoryTotals: Record<string, number> = {
      transport: 0,
      food: 0,
      energy: 0,
      lifestyle: 0,
      other: 0,
    }

    for (const a of activities) {
      const cat = a.category || 'other'
      categoryTotals[cat] = (categoryTotals[cat] ?? 0) + a.emission
    }

    // Determine category percentages for User Relevance
    const getCategoryPercentage = (cat: string): number => {
      if (totalEmissions === 0) return 0
      return (categoryTotals[cat] ?? 0) / totalEmissions
    }

    // Check if category has an active goal
    const hasActiveGoalForCategory = (cat: string): boolean => {
      return context.activeGoals.some(g => g.category === cat && g.status === 'active')
    }

    // Helper to calculate confidence score based on data completeness & alignment
    const calculateConfidence = (hasDirectData: boolean): number => {
      const logCount = activities.length
      const baseCompleteness = logCount >= 7 ? 0.9 : logCount >= 4 ? 0.7 : 0.5
      return hasDirectData ? baseCompleteness : Math.max(0.4, baseCompleteness - 0.2)
    }

    // Check if the recommendation was recently generated to apply penalty
    const isRecentlyRecommended = (title: string): boolean => {
      const previous = context.previousRecommendations ?? []
      return previous.some(r => r.title.toLowerCase() === title.toLowerCase())
    }

    const candidates: Omit<Recommendation, 'id' | 'userId' | 'createdAt'>[] = []

    // ─── Transport Candidates ──────────────────────────────────────────────
    const carActivities = activities.filter(a => a.category === 'transport' && a.activity === 'car')
    const totalCarDistance = carActivities.reduce((sum, a) => sum + a.quantity, 0)
    const transportPct = getCategoryPercentage('transport')
    const hasTransportGoal = hasActiveGoalForCategory('transport')
    const transportRelevance = totalEmissions > 0 
      ? Math.min(10, transportPct * 8 + (hasTransportGoal ? 2 : 0))
      : 5

    if (totalCarDistance > 0) {
      // 1. Train Commute Candidate
      const trainSavings = totalCarDistance * 0.151
      const trainSavingsKg = parseFloat(trainSavings.toFixed(1))
      const trainBehavior = Math.min(10, totalCarDistance / 10)
      
      candidates.push({
        title: 'Switch car commutes to electric train',
        category: 'transport',
        priority: 'high',
        potentialSavingsKg: trainSavingsKg,
        easeOfImplementation: 5,
        userRelevance: parseFloat(transportRelevance.toFixed(1)),
        historicalBehaviorScore: parseFloat(trainBehavior.toFixed(1)),
        rankingScore: 0,
        confidenceScore: calculateConfidence(true),
        explanation: '',
        calculationDetails: `${totalCarDistance.toFixed(1)} km * 0.151 kg/km savings = ${trainSavingsKg} kg CO2`,
        observation: `Transportation accounts for ${Math.round(transportPct * 100)}% of your carbon footprint. You logged ${totalCarDistance.toFixed(1)} km of driving this week.`,
        reasoning: `Petrol cars emit 0.192 kg CO2 per kilometer. Taking the electric train (0.041 kg/km) instead would significantly lower your emissions.`,
        recommendation: `Replace your driving commutes with electric train transit for your daily travel.`,
        estimatedImpact: `Replacing these driving trips with train travel will reduce your weekly footprint by approximately ${trainSavingsKg} kg CO2.`
      })

      // 2. Bus Commute Candidate
      const busSavings = totalCarDistance * 0.103
      const busSavingsKg = parseFloat(busSavings.toFixed(1))
      
      candidates.push({
        title: 'Switch car commutes to public bus',
        category: 'transport',
        priority: 'medium',
        potentialSavingsKg: busSavingsKg,
        easeOfImplementation: 6,
        userRelevance: parseFloat(transportRelevance.toFixed(1)),
        historicalBehaviorScore: parseFloat(trainBehavior.toFixed(1)),
        rankingScore: 0,
        confidenceScore: calculateConfidence(true),
        explanation: '',
        calculationDetails: `${totalCarDistance.toFixed(1)} km * 0.103 kg/km savings = ${busSavingsKg} kg CO2`,
        observation: `Transportation contributed ${Math.round(transportPct * 100)}% of your footprint. You drove a total of ${totalCarDistance.toFixed(1)} km this week.`,
        reasoning: `A standard public bus emits 0.089 kg CO2 per passenger-kilometer, which is nearly half of a petrol car's emissions (0.192 kg/km).`,
        recommendation: `Swap your car commutes with local public bus services.`,
        estimatedImpact: `Using the bus for your travel this week will save approximately ${busSavingsKg} kg CO2.`
      })

      // 3. EV Candidate
      const evSavings = totalCarDistance * 0.139
      const evSavingsKg = parseFloat(evSavings.toFixed(1))

      candidates.push({
        title: 'Transition car travel to an electric vehicle',
        category: 'transport',
        priority: 'medium',
        potentialSavingsKg: evSavingsKg,
        easeOfImplementation: 2,
        userRelevance: parseFloat(transportRelevance.toFixed(1)),
        historicalBehaviorScore: parseFloat(trainBehavior.toFixed(1)),
        rankingScore: 0,
        confidenceScore: calculateConfidence(true),
        explanation: '',
        calculationDetails: `${totalCarDistance.toFixed(1)} km * 0.139 kg/km savings = ${evSavingsKg} kg CO2`,
        observation: `Your petrol car driving logged ${totalCarDistance.toFixed(1)} km this week, which is your main source of travel emissions.`,
        reasoning: `Electric vehicles are highly efficient and run on cleaner energy grids, saving 0.139 kg CO2 per km compared to petrol cars.`,
        recommendation: `Transition your personal vehicle from a petrol car to an electric vehicle.`,
        estimatedImpact: `This will reduce your footprint by ${evSavingsKg} kg CO2 for every equivalent distance driven.`
      })
    }

    // 4. Walking/Cycling (Active Travel) Candidate
    const activeSavings = 2.8
    const activeBehavior = totalCarDistance > 0 ? 8 : 4

    candidates.push({
      title: 'Choose walking or cycling for short trips',
      category: 'transport',
      priority: 'medium',
      potentialSavingsKg: activeSavings,
      easeOfImplementation: 7,
      userRelevance: parseFloat(transportRelevance.toFixed(1)),
      historicalBehaviorScore: activeBehavior,
      rankingScore: 0,
      confidenceScore: calculateConfidence(totalCarDistance > 0),
      explanation: '',
      calculationDetails: 'Estimated 15 km of driving avoided: 15 km * 0.192 kg/km = 2.88 kg CO2',
      observation: `You have travel emissions logged this week. Active transit (walking/cycling) has zero emissions and is highly achievable for short trips under 3km.`,
      reasoning: `Trips under 3km are highly suitable for active transit, which generates zero carbon emissions and promotes physical health.`,
      recommendation: `Choose walking or cycling instead of driving for short trips under 3 km.`,
      estimatedImpact: `Saves approximately 2.8 kg CO2 per week by replacing short driving trips.`
    })

    // ─── Food Candidates ───────────────────────────────────────────────────
    const redMeatMeals = activities.filter(a => a.category === 'food' && a.activity === 'red_meat')
    const redMeatCount = redMeatMeals.reduce((sum, a) => sum + a.quantity, 0)
    const chickenMeals = activities.filter(a => a.category === 'food' && (a.activity === 'chicken' || a.activity === 'chicken_biryani'))
    const chickenCount = chickenMeals.reduce((sum, a) => sum + a.quantity, 0)
    const foodPct = getCategoryPercentage('food')
    const hasFoodGoal = hasActiveGoalForCategory('food')
    const foodRelevance = totalEmissions > 0 
      ? Math.min(10, foodPct * 8 + (hasFoodGoal ? 2 : 0))
      : 5

    if (redMeatCount > 0) {
      // 5. Red meat to plant-based
      const meatPlantSavings = redMeatCount * 2.7
      const meatPlantSavingsKg = parseFloat(meatPlantSavings.toFixed(1))
      const meatPlantBehavior = Math.min(10, redMeatCount * 2)

      candidates.push({
        title: 'Replace red meat meals with plant-based alternatives',
        category: 'food',
        priority: 'high',
        potentialSavingsKg: meatPlantSavingsKg,
        easeOfImplementation: 8,
        userRelevance: parseFloat(foodRelevance.toFixed(1)),
        historicalBehaviorScore: meatPlantBehavior,
        rankingScore: 0,
        confidenceScore: calculateConfidence(true),
        explanation: '',
        calculationDetails: `${redMeatCount} meals * 2.7 kg/meal savings = ${meatPlantSavingsKg} kg CO2`,
        observation: `Food choices account for ${Math.round(foodPct * 100)}% of your emissions. You logged ${redMeatCount} red meat meals this week.`,
        reasoning: `Red meat requires substantial land, feed, and water, emitting 27 kg CO2 per kg, whereas plant-based meals emit only 0.5 kg CO2.`,
        recommendation: `Replace your logged red meat meals with plant-based alternatives.`,
        estimatedImpact: `This swap saves 2.7 kg CO2 per meal, saving ${meatPlantSavingsKg} kg CO2 this week.`
      })

      // 6. Red meat to chicken
      const meatChickenSavings = redMeatCount * 1.7
      const meatChickenSavingsKg = parseFloat(meatChickenSavings.toFixed(1))

      candidates.push({
        title: 'Substitute red meat with poultry',
        category: 'food',
        priority: 'medium',
        potentialSavingsKg: meatChickenSavingsKg,
        easeOfImplementation: 9,
        userRelevance: parseFloat(foodRelevance.toFixed(1)),
        historicalBehaviorScore: meatPlantBehavior,
        rankingScore: 0,
        confidenceScore: calculateConfidence(true),
        explanation: '',
        calculationDetails: `${redMeatCount} meals * 1.7 kg/meal savings = ${meatChickenSavingsKg} kg CO2`,
        observation: `You logged ${redMeatCount} red meat meals. Switching to poultry is an effective transition step.`,
        reasoning: `Chicken produces significantly fewer greenhouse gases than beef or lamb, emitting 6.9 kg CO2 per kg versus 27 kg CO2.`,
        recommendation: `Substitute red meat with chicken or poultry in your meals.`,
        estimatedImpact: `Saves 1.7 kg CO2 per meal, totaling ${meatChickenSavingsKg} kg CO2 this week.`
      })
    }

    if (chickenCount > 0) {
      // 7. Chicken to plant-based
      const chickenPlantSavings = chickenCount * 1.0
      const chickenPlantSavingsKg = parseFloat(chickenPlantSavings.toFixed(1))
      const chickenBehavior = Math.min(10, chickenCount * 2)

      candidates.push({
        title: 'Swap poultry meals for plant-based dishes',
        category: 'food',
        priority: 'medium',
        potentialSavingsKg: chickenPlantSavingsKg,
        easeOfImplementation: 8,
        userRelevance: parseFloat(foodRelevance.toFixed(1)),
        historicalBehaviorScore: chickenBehavior,
        rankingScore: 0,
        confidenceScore: calculateConfidence(true),
        explanation: '',
        calculationDetails: `${chickenCount} meals * 1.0 kg/meal savings = ${chickenPlantSavingsKg} kg CO2`,
        observation: `You logged ${chickenCount} poultry meals. Moving toward plant-based proteins will further optimize your food footprint.`,
        reasoning: `Plant proteins like lentils or beans have a fraction of the environmental impact of animal farming.`,
        recommendation: `Swap poultry meals for vegetarian or vegan dishes.`,
        estimatedImpact: `Saves 1.0 kg CO2 per meal, saving ${chickenPlantSavingsKg} kg CO2 this week.`
      })
    }

    // 8. Meatless Mondays Fallback
    const generalFoodBehavior = (redMeatCount > 0 || chickenCount > 0) ? 7 : 4
    candidates.push({
      title: 'Introduce Meatless Mondays',
      category: 'food',
      priority: 'medium',
      potentialSavingsKg: 5.4,
      easeOfImplementation: 9,
      userRelevance: parseFloat(foodRelevance.toFixed(1)),
      historicalBehaviorScore: generalFoodBehavior,
      rankingScore: 0,
      confidenceScore: calculateConfidence(redMeatCount > 0 || chickenCount > 0),
      explanation: '',
      calculationDetails: '2 meals * 2.7 kg/meal savings = 5.4 kg CO2',
      observation: `Dietary habits represent an easy area for footprint improvement.`,
      reasoning: `Skipping meat just two days a week noticeably lowers emissions and is highly sustainable long-term.`,
      recommendation: `Commit to plant-based meals at least two days a week (e.g. Meatless Mondays).`,
      estimatedImpact: `Saves approximately 5.4 kg CO2 per week.`
    })

    // ─── Energy Candidates ─────────────────────────────────────────────────
    const electricityActivities = activities.filter(a => a.category === 'energy' && a.activity === 'electricity')
    const totalKwh = electricityActivities.reduce((sum, a) => sum + a.quantity, 0)
    const energyPct = getCategoryPercentage('energy')
    const hasEnergyGoal = hasActiveGoalForCategory('energy')
    const energyRelevance = totalEmissions > 0 
      ? Math.min(10, energyPct * 8 + (hasEnergyGoal ? 2 : 0))
      : 5

    if (totalKwh > 0) {
      // 9. Reduce electricity by 15%
      const elecSavings = totalKwh * 0.15 * 0.233
      const elecSavingsKg = parseFloat(elecSavings.toFixed(1))
      const elecBehavior = Math.min(10, totalKwh / 10)

      candidates.push({
        title: 'Reduce electricity consumption by 15%',
        category: 'energy',
        priority: 'high',
        potentialSavingsKg: elecSavingsKg,
        easeOfImplementation: 6,
        userRelevance: parseFloat(energyRelevance.toFixed(1)),
        historicalBehaviorScore: parseFloat(elecBehavior.toFixed(1)),
        rankingScore: 0,
        confidenceScore: calculateConfidence(true),
        explanation: '',
        calculationDetails: `${totalKwh.toFixed(1)} kWh * 0.15 * 0.233 kg/kWh = ${elecSavingsKg} kg CO2`,
        observation: `Energy consumption represents ${Math.round(energyPct * 100)}% of your emissions. You logged ${totalKwh.toFixed(1)} kWh of electricity this week.`,
        reasoning: `Grid electricity emits carbon due to fossil fuel power generation. Simple reductions decrease demand directly.`,
        recommendation: `Optimize appliance usage and adjust your thermostat to reduce electricity by 15%.`,
        estimatedImpact: `Saves ${elecSavingsKg} kg CO2 this week based on your usage.`
      })
    }

    // 10. Unplug Phantom Energy
    const generalEnergyBehavior = totalKwh > 0 ? 8 : 4
    candidates.push({
      title: 'Unplug phantom energy loads',
      category: 'energy',
      priority: 'medium',
      potentialSavingsKg: 2.5,
      easeOfImplementation: 9,
      userRelevance: parseFloat(energyRelevance.toFixed(1)),
      historicalBehaviorScore: generalEnergyBehavior,
      rankingScore: 0,
      confidenceScore: calculateConfidence(totalKwh > 0),
      explanation: '',
      calculationDetails: 'Estimated standby reduction of 10.7 kWh * 0.233 kg/kWh = 2.5 kg CO2',
      observation: `Standby power usage in homes often goes unnoticed but accumulates over time.`,
      reasoning: `Appliances draw power even when turned off but plugged in (phantom loads), wasting electricity.`,
      recommendation: `Unplug chargers and electronics or use smart power strips when not in use.`,
      estimatedImpact: `Saves approximately 2.5 kg CO2 per week.`
    })

    // ─── Calculate Ranking Scores & Explanations ──────────────────────────
    const rankedRecommendations = candidates.map(cand => {
      const potentialImpactScore = Math.min(10, cand.potentialSavingsKg / 2)
      
      // Calculate weighted ranking score
      let rankingScore = 
        (potentialImpactScore * 0.4) + 
        (cand.easeOfImplementation * 0.3) + 
        (cand.userRelevance * 0.2) + 
        (cand.historicalBehaviorScore * 0.1)

      // Apply repetitiveness penalty
      const recent = isRecentlyRecommended(cand.title)
      if (recent) {
        rankingScore = Math.max(0, rankingScore - 3.0)
      }

      // Format observation templates (replacing dynamic placeholders if any)
      const formattedObservation = cand.observation.replace('Y kg CO2', `${cand.potentialSavingsKg} kg CO2`)
      const formattedEstimatedImpact = cand.estimatedImpact.replace('Y kg CO2', `${cand.potentialSavingsKg} kg CO2`)

      // Generate explanation layer
      const goalText = hasActiveGoalForCategory(cand.category) ? ' aligns with an active goal and' : ''
      const penaltyText = recent ? ' (Adjusted down due to recent suggestion)' : ''
      const explanation = `Prioritized because it offers ${cand.potentialSavingsKg} kg CO2 in carbon reductions,${goalText} scores ${cand.easeOfImplementation}/10 on implementation ease.${penaltyText}`

      return {
        ...cand,
        observation: formattedObservation,
        estimatedImpact: formattedEstimatedImpact,
        rankingScore: parseFloat(rankingScore.toFixed(2)),
        explanation,
      }
    })

    // Sort by ranking score descending
    rankedRecommendations.sort((a, b) => b.rankingScore - a.rankingScore)

    // Return all items as full Recommendation interface stubs
    return rankedRecommendations.map((r, index) => ({
      id: `engine-rec-${index}`,
      userId: context.user.uid,
      ...r,
      createdAt: Timestamp.now() as any
    }))
  }
}

export const recommendationEngine = new RecommendationEngine()
