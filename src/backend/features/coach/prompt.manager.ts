import type { CoachContext } from './response.schema'
import type { Recommendation } from '@/types/recommendation'
import { formatEmissions } from '@/lib/utils'

export class PromptManager {
  buildSystemPrompt(context: CoachContext, recommendations: Recommendation[]): string {
    const topCategories = this.getTopCategories(context.weeklyActivities.length > 0 ? context.weeklyActivities : context.recentActivities)
    
    const weeklyGoalStatus = context.weeklyEmissionsKg < context.user.weeklyGoalKg
      ? `on track (${formatEmissions(context.user.weeklyGoalKg - context.weeklyEmissionsKg)} under goal)`
      : `over goal by ${formatEmissions(context.weeklyEmissionsKg - context.user.weeklyGoalKg)}`

    const recommendationDetails = recommendations.slice(0, 3).map(r => 
      `- **${r.title}** [Category: ${r.category}, Priority Rank: ${r.rankingScore}/10, Confidence: ${r.confidenceScore}] (Potential Savings: -${formatEmissions(r.potentialSavingsKg)}, Calculation logic: ${r.calculationDetails})\n  Explanation: ${r.explanation}\n  Observation: ${r.observation}\n  Reasoning: ${r.reasoning}\n  Recommendation: ${r.recommendation}\n  Estimated Impact: ${r.estimatedImpact}`
    ).join('\n\n')

    return `You are Rootly Intelligence, a precision sustainability coach powered by advanced AI.
Your role: Help users understand and reduce their carbon footprint through specific, data-driven recommendations.

USER PROFILE:
- Name: ${context.user.displayName ?? 'Eco Explorer'}
- Carbon Score: ${context.carbonScore}/100
- Weekly Goal: ${formatEmissions(context.user.weeklyGoalKg)}
- This Week's Emissions: ${formatEmissions(context.weeklyEmissionsKg)} (${weeklyGoalStatus})
- Trend: ${context.trend}

RECENT/WEEKLY ACTIVITIES (last 10 items):
${(context.weeklyActivities.length > 0 ? context.weeklyActivities : context.recentActivities).slice(0, 10).map(a => 
  `- ${a.activity}: ${formatEmissions(a.emission)} [${a.category}]`
).join('\n') || 'No activities logged yet'}

EMISSION BREAKDOWN:
${topCategories.map(c => `- ${c.category}: ${c.percentage}% of weekly total`).join('\n') || 'No data yet'}

ACTIVE GOALS:
${context.activeGoals.map(g => `- ${g.title}: ${Math.round((g.currentProgressKg / g.targetReductionKg) * 100)}% complete`).join('\n') || 'No active goals'}

DETERMINISTIC REDUCTION OPPORTUNITIES (Use these calculations and structures for your recommendation and estimated impact):
${recommendationDetails || 'No specific reduction recommendations calculated yet. Prompt the user to log more travel/food/energy activities.'}

BEHAVIORAL RULES:
1. NEVER give generic advice. Always reference the user's actual data and top-ranked recommendations.
2. You MUST output your response strictly as a JSON object matching this schema:
{
  "observation": "Observation text here. Summarize current week emissions, goals, and trends based on user data.",
  "reasoning": "Reasoning text here. Explain the drivers of their footprint or trend, explaining why specific actions are prioritized.",
  "recommendation": "Recommendation text here. Propose specific steps using the provided deterministic reduction opportunities.",
  "estimatedImpact": "Estimated impact text here. Detail the carbon savings in kg or t CO2e exactly as calculated."
}
3. Outlaw generic sustainability boilerplate. Do not talk about general tips unless it directly uses the numbers and calculations provided.
4. Keep the JSON well-formed and valid. Do not wrap in markdown code blocks (\`\`\`json ... \`\`\`), output raw JSON only.`
  }

  private getTopCategories(activities: any[]): { category: string; percentage: number }[] {
    const totals: Record<string, number> = {}
    let total = 0
    for (const a of activities) {
      const cat = a.category || 'other'
      totals[cat] = (totals[cat] ?? 0) + a.emission
      total += a.emission
    }
    if (total === 0) return []
    return Object.entries(totals)
      .map(([category, kg]) => ({ category, percentage: Math.round((kg / total) * 100) }))
      .sort((a, b) => b.percentage - a.percentage)
      .slice(0, 4)
  }
}

export const promptManager = new PromptManager()
